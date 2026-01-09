import { getSystemPrompt } from '@/lib/system-prompt';

import {
  getBedrockClient,
  invokeClaudeModel,
  invokeClaudeModelStream,
  parseJsonFromResponse,
  type BedrockConfig,
} from './claude-client';
import {
  applyFixes,
  assembleFinalDocument,
  performLocalValidation,
} from './validation';
import {
  createLifecycleAnalysisPrompt,
  parseLifecycleResponse,
  createLifecycleScopePrompt,
  getDefaultLifecycle,
} from './dynamic-lifecycle';

import { extractPartialConcepts } from '@/lib/types/concept-schema';
import type { Pass1Result, ProgressCallback, GenerationResult, ValidationResult, DynamicLifecycle } from '@/lib/types/generation';

/**
 * Extract JSON from Claude's response, handling various wrapper formats.
 */
function extractJsonFromResponse<T>(text: string): T | null {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Extract from code block
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // Fall through
      }
    }
    // Try to find JSON object boundaries
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // Fall through
      }
    }
    console.warn('[multi-pass] Failed to extract JSON from response');
    return null;
  }
}

export async function generateChartIteratively(
  subject: string,
  config: BedrockConfig,
  onProgress: ProgressCallback,
  abortSignal?: AbortSignal,
  context?: string
): Promise<GenerationResult> {
  const bedrockClient = await getBedrockClient(config);

  // Get profile settings (Stop Guessing)
  // We no longer guess familiar systems. Default to null for neutral, or could add to profile later.
  const familiarSystem = null;

  const systemPrompt = getSystemPrompt(familiarSystem);

  if (abortSignal?.aborted) {
    throw new Error('Generation cancelled by user');
  }

  onProgress(1, 'in-progress', { message: 'Analyzing subject and generating optimal lifecycle...' });

  const lifecyclePrompt = createLifecycleAnalysisPrompt(subject);
  const lifecycleText = await invokeClaudeModel(
    bedrockClient,
    [{ role: 'user', content: lifecyclePrompt }],
    'You are an expert curriculum designer. Analyze subjects and determine the optimal operational lifecycle.',
    2000,
    undefined,
    abortSignal
  );

  let dynamicLifecycle: DynamicLifecycle | null = parseLifecycleResponse(lifecycleText);
  if (!dynamicLifecycle) {
    dynamicLifecycle = getDefaultLifecycle(subject);
  }

  onProgress(1, 'in-progress', {
    message: `Lifecycle detected: ${dynamicLifecycle.phase1} → ${dynamicLifecycle.phase2} → ${dynamicLifecycle.phase3}`,
    lifecycle: {
      phase1: dynamicLifecycle.phase1,
      phase2: dynamicLifecycle.phase2,
      phase3: dynamicLifecycle.phase3,
    },
    roleScope: dynamicLifecycle.roleScope,
  });

  const pass1Content = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASS 1 TASK: Execute ONLY STEP 1 (Live Verification) and Concept Extraction
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: "${subject}"
${context ? `Target Exam/Context: "${context}" (CRITICAL ANCHOR)` : ''}

PRE-DETERMINED LIFECYCLE (USE EXACTLY):
Domain: ${dynamicLifecycle.domain}
Role: ${dynamicLifecycle.roleScope}
Phase 1: ${dynamicLifecycle.phase1} - ${dynamicLifecycle.phase1Description}
Phase 2: ${dynamicLifecycle.phase2} - ${dynamicLifecycle.phase2Description}
Phase 3: ${dynamicLifecycle.phase3} - ${dynamicLifecycle.phase3Description}

INSTRUCTIONS:
1. Browse the web for the most recent official syllabus/standard${context ? ` for "${context}"` : ''}
2. Extract 3 specific recent updates (last 12 months)
3. Identify numerical limits/thresholds
4. Extract ALL core concepts${context ? ` specifically from the "${context}" syllabus` : ' from the official syllabus'}

OUTPUT FORMAT (JSON ONLY):
{
  "sourceVerification": "Name of official source found",
  "recentUpdates": ["Update 1", "Update 2", "Update 3"],
  "numericalLimits": ["Limit 1 with value", "Limit 2 with value"] OR ["None found - marked for verification"],
  "domain": "${dynamicLifecycle.domain}",
  "lifecycle": {
    "phase1": "${dynamicLifecycle.phase1}",
    "phase2": "${dynamicLifecycle.phase2}",
    "phase3": "${dynamicLifecycle.phase3}"
  },
  "roleScope": "${dynamicLifecycle.roleScope}",
  "excludedActions": ${JSON.stringify(dynamicLifecycle.excludedActions)},
  "concepts": ["Concept 1", "Concept 2", ...] (Identify ALL core concepts - typically 15-35),
  "lifecycleJustification": "${dynamicLifecycle.justification}"
}

CRITICAL: Use the EXACT lifecycle phases provided above. Do NOT modify them.
  `;

  if (abortSignal?.aborted) throw new Error('Generation cancelled by user');

  const pass1Text = await invokeClaudeModel(
    bedrockClient,
    [{ role: 'user', content: pass1Content }],
    systemPrompt,
    8000,
    undefined,
    abortSignal
  );

  const pass1Data = parseJsonFromResponse<Pass1Result>(pass1Text);

  pass1Data.lifecycle = {
    phase1: dynamicLifecycle.phase1,
    phase2: dynamicLifecycle.phase2,
    phase3: dynamicLifecycle.phase3,
  };
  pass1Data.roleScope = dynamicLifecycle.roleScope;
  pass1Data.domain = dynamicLifecycle.domain;
  pass1Data.excludedActions = dynamicLifecycle.excludedActions;
  pass1Data.lifecycleJustification = dynamicLifecycle.justification;

  onProgress(1, 'complete', pass1Data);

  onProgress(2, 'in-progress', { message: 'Building concept dependencies...' });

  const pass2Content = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASS 2 TASK: Execute ONLY Step 3.5 (Decision Framework Trees) from the System Prompt
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO NOT re-run Step 1 (Live Verification). Use the verified data below.

VERIFIED DATA FROM PASS 1:
${JSON.stringify(pass1Data, null, 2)}

EXACT CONCEPTS TO USE (DO NOT MODIFY):
${pass1Data.concepts.map((c, i) => `${i + 1}. ${c}`).join('\n')}

TASK FOR THIS PASS:
STEP 3.5: Create 2-3 Decision Framework Trees for the most common "When do I use X vs Y?" questions in this domain.

LIFECYCLE TO USE:
${pass1Data.lifecycle.phase1} → ${pass1Data.lifecycle.phase2} → ${pass1Data.lifecycle.phase3}

ROLE SCOPE: ${pass1Data.roleScope}
EXCLUDED ACTIONS: ${pass1Data.excludedActions.join(', ')}

POSITIVE FRAMING REQUIRED:
- Use: "Choose X when you need [benefit]"
- Use: "Option Y unlocks [capability]"
- Use: "Select Z for [specific scenario]"
- Use: "Best suited for", "Optimized for", "Designed for"
- Avoid: "Don't use X if...", "X fails when...", "Won't work for..."
- Avoid: "Common mistake is...", "Students wrongly...", "Avoid X because..."

OUTPUT: Generate only the Decision Framework Trees. No chart content yet.
  `;

  const lifecycleScopePrompt = createLifecycleScopePrompt(dynamicLifecycle, subject);

  if (abortSignal?.aborted) throw new Error('Generation cancelled by user');

  const pass2Text = await invokeClaudeModel(
    bedrockClient,
    [{ role: 'user', content: pass2Content }],
    systemPrompt + '\n\n' + lifecycleScopePrompt,
    6000,
    undefined,
    abortSignal
  );

  onProgress(2, 'complete', { content: pass2Text });

  onProgress(3, 'in-progress', { message: 'Creating detailed content (batch generation)...' });

  const totalConcepts = pass1Data.concepts.length;
  const batchSize = 10;
  const batches = Math.ceil(totalConcepts / batchSize);

  // Track the highest progress to prevent regression during parallel execution
  let globalMaxProgress = 0;

  const basePromptInfo = `
FOUNDATION DATA (DO NOT MODIFY):
Domain: ${pass1Data.domain}
Role Scope: ${pass1Data.roleScope}
Lifecycle: ${pass1Data.lifecycle.phase1} → ${pass1Data.lifecycle.phase2} → ${pass1Data.lifecycle.phase3}
Source: ${pass1Data.sourceVerification}
Subject: ${subject}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL: DOMAIN-SPECIFIC CONTENT REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST include ACTUAL technical terminology from "${subject}". 

FORBIDDEN GENERIC PHRASES (will be rejected):
- "Set up prerequisites" → Instead: Name the ACTUAL prerequisite (e.g., "Install Power Query add-in")
- "Configure settings" → Instead: Name the ACTUAL setting (e.g., "Set Relationship cardinality to Many-to-One")
- "Apply policies" → Instead: Name the ACTUAL policy (e.g., "Enable Row-Level Security filter")
- "Execute deployment" → Instead: Name the ACTUAL action (e.g., "Publish to Power BI Service workspace")
- "Review metrics" → Instead: Name the ACTUAL metric (e.g., "Check DAX query performance in Performance Analyzer")

EVERY LINE MUST CONTAIN AT LEAST ONE OF:
- A specific tool name (e.g., Power Query Editor, DAX Studio, Excel Data Model)
- A specific function/command (e.g., RELATED(), CALCULATE(), Get Data > From Table)
- A specific UI element (e.g., Relationships view, Field list pane, Pivot Table Fields)
- A specific file type/format (e.g., .pbix, .xlsx, Power Query M formula)
- A specific technical term from the domain (e.g., Star schema, Calculated column, Measure)

DETAIL REQUIREMENTS FOR EACH CONCEPT:

${pass1Data.lifecycle.phase1} (Foundation Phase):
  - Prerequisite: Name the SPECIFIC tool, license, or data source required
  - Selection: List 2-3 ACTUAL options with their real names and capabilities
  - Execution: Provide the EXACT menu path, function, or command to start

${pass1Data.lifecycle.phase2} (Configuration Phase):
  • Provide 5-8 configuration items using REAL setting names
  • Include ACTUAL DAX formulas, M code snippets, or Excel functions
  • Add **[Critical Distinction]:** comparing REAL features by name
  • Add **[Design Boundary]:** with ACTUAL technical limitations
  • Add **[Exam Focus]:** referencing REAL exam objectives

${pass1Data.lifecycle.phase3} (Verification Phase):
  ○ Name the EXACT tool (e.g., "Performance Analyzer", "Excel's Evaluate Formula")
  ○ Specify the ACTUAL metrics or outputs to check
  ○ Include REAL thresholds or benchmarks from the domain

QUALITY STANDARD: Each concept = 15-25 lines with ZERO generic phrases.
If you don't know a specific technical detail, state "[Verify: specific feature name]" rather than using generic text.
`;

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const generateBatch = async (batch: number): Promise<{ order: number; content: string }> => {
    const startIdx = batch * batchSize;
    const endIdx = Math.min(startIdx + batchSize, totalConcepts);
    const batchConcepts = pass1Data.concepts.slice(startIdx, endIdx);

    // JSON-structured output prompt for reliable parsing
    const batchPrompt = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BATCH ${batch + 1}/${batches}: Generate concepts ${startIdx + 1}-${endIdx} for "${subject}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${basePromptInfo}

CONCEPTS TO GENERATE IN THIS BATCH:
${batchConcepts.map((c, i) => `${startIdx + i + 1}. ${c}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT: JSON (REQUIRED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST output a single JSON object. No markdown, no explanations, ONLY valid JSON.

SHAPE Framework (each concept must include):
- S (Simple Core): One sentence a beginner can understand
- H (High-Stakes Example): Real company + year + dollar/human impact
- A (Analogical Model): Familiar metaphor with 3+ concept mappings
- P (Pattern Recognition): Self-test question with answer
- E (Elimination Logic): Distinction between similar concepts (positive framing)

LIFECYCLE PHASES TO USE:
- Phase 1 (${pass1Data.lifecycle.phase1}): Setup/prerequisites
- Phase 2 (${pass1Data.lifecycle.phase2}): Configuration/execution
- Phase 3 (${pass1Data.lifecycle.phase3}): Verification/monitoring

\`\`\`json
{
  "concepts": [
    {
      "order": ${startIdx + 1},
      "name": "${batchConcepts[0]}",
      "shape": {
        "simpleCore": "One clear sentence anyone can understand",
        "highStakesExample": "In [YEAR], [COMPANY] [IMPACT with $AMOUNT or human cost]...",
        "analogicalModel": "Think of [CONCEPT] like [FAMILIAR SYSTEM]: [MAPPING 1], [MAPPING 2], [MAPPING 3]",
        "patternRecognition": {
          "question": "When would you use X vs Y?",
          "answer": "Use X when [CONDITION], use Y when [CONDITION]"
        },
        "eliminationLogic": "[CONCEPT A] handles [FUNCTION], while [CONCEPT B] handles [DIFFERENT FUNCTION]"
      },
      "lifecycle": {
        "phase1": {
          "hookSentence": "Compelling 10-15 word intro",
          "prerequisite": "ACTUAL tool/license/data source required",
          "selection": ["ACTUAL option 1 with real name", "ACTUAL option 2"],
          "execution": "ACTUAL menu path: File > Import > From Source"
        },
        "phase2": [
          "ACTUAL setting: Set [SETTING NAME] to [VALUE]",
          "ACTUAL code: =FUNCTION(args)",
          "[Design Boundary]: ACTUAL limitation and workaround"
        ],
        "phase3": {
          "tool": "ACTUAL verification tool name",
          "metrics": ["ACTUAL metric 1", "ACTUAL metric 2"],
          "thresholds": "Success when [ACTUAL criteria]"
        }
      },
      "mnemonic": {
        "tier": "Foundation",
        "anchor": "🏔️ Mountain",
        "story": "A giant Mountain rises from the data center, its peaks pointing to different cloud regions...",
        "parentConcept": null,
        "depends_on": []
      },
      "annotations": {
        "criticalDistinctions": ["Key difference from similar concept"],
        "designBoundaries": ["Selection made at creation time"],
        "examFocus": ["Commonly tested aspect"]
      }
    }
  ]
}
\`\`\`

MNEMONIC TIER RULES:
- "Foundation": Core concepts with no dependencies (anchor = large object like building, mountain, volcano)
- "Keystone": Depends on Foundation (anchor = medium object, must specify parentConcept)
- "Utility": Tools/add-ons (anchor = small handheld object, must specify depends_on)

QUALITY REQUIREMENTS:
1. SHAPE sections are MANDATORY for every concept
2. highStakesExample MUST include real company name, year, and numbers
3. analogicalModel MUST map 3+ technical terms to physical elements
4. patternRecognition MUST be answerable in under 10 seconds
5. NO generic phrases like "configure settings" - use ACTUAL tool/feature names
6. Mnemonic anchor MUST start with same letter as concept name + include emoji

CRITICAL: Output ONLY valid JSON. Generate ALL ${batchConcepts.length} concepts.
`;


    let batchText = '';
    let lastExtractedCount = 0;
    if (abortSignal?.aborted) throw new Error('Generation cancelled by user');

    const batchStream = invokeClaudeModelStream(
      bedrockClient,
      [{ role: 'user', content: batchPrompt }],
      lifecycleScopePrompt + '\nYou are an automated content generator. Output ONLY valid JSON. No explanations.',
      32000,
      abortSignal
    );

    for await (const chunk of batchStream) {
      batchText += chunk;

      // Calculate potential progress for this specific batch
      const currentBatchProgress = Math.round(((batch + 0.5) / batches) * 100);

      // Try to extract partial concepts for optimistic UI
      const partialData = extractJsonFromResponse<{ concepts?: unknown[] }>(batchText);
      const extractedConcepts = partialData ? extractPartialConcepts(partialData) : [];

      // Only update UI if this batch represents a "forward step" in progress
      // This prevents Batch 1 (10%) from overwriting Batch 2 (30%)
      if (currentBatchProgress >= globalMaxProgress) {
        globalMaxProgress = currentBatchProgress;

        // Emit new concepts for optimistic rendering
        const newConceptCount = extractedConcepts.length;
        const conceptsToEmit = newConceptCount > lastExtractedCount
          ? extractedConcepts.slice(lastExtractedCount)
          : [];
        lastExtractedCount = newConceptCount;

        onProgress(3, 'in-progress', {
          message: `Building room ${startIdx + newConceptCount} of ${totalConcepts}...`,
          progress: globalMaxProgress,
          // Pass streamed concepts for optimistic UI (will need to convert types)
          streamedConcepts: conceptsToEmit.map((c, i) => ({
            order: startIdx + lastExtractedCount - conceptsToEmit.length + i + 1,
            name: c.name,
            anchor: c.mnemonic?.anchor,
          })),
        });
      }
    }

    return { order: batch, content: batchText };
  };

  onProgress(3, 'in-progress', { message: 'Generating batches with rate limiting...' });

  const batchResults: { order: number; content: string }[] = [];
  const concurrentLimit = 2;

  for (let i = 0; i < batches; i += concurrentLimit) {
    const batchGroup = [];
    for (let j = 0; j < concurrentLimit && i + j < batches; j++) {
      batchGroup.push(generateBatch(i + j));
    }

    const groupResults = await Promise.all(batchGroup);
    batchResults.push(...groupResults);

    if (i + concurrentLimit < batches) {
      await delay(2000);
    }
  }
  const allConceptsContent = batchResults
    .sort((a, b) => a.order - b.order)
    .map(r => r.content)
    .join('\n\n') + '\n\n';

  onProgress(3, 'in-progress', { message: 'Generating mental anchors and learning path...' });

  const supplementaryPrompt = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generate Steps 4, 5, and 7 for: ${subject}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Domain: ${pass1Data.domain}
Role Scope: ${pass1Data.roleScope}
Lifecycle: ${pass1Data.lifecycle.phase1} → ${pass1Data.lifecycle.phase2} → ${pass1Data.lifecycle.phase3}

Concepts covered: ${pass1Data.concepts.join(', ')}

GENERATE:

## STEP 4: VISUAL MENTAL ANCHORS
Create 3 vivid mental anchors with:
- Concrete physical metaphors (buildings, vehicles, nature)
- Map 3-4 technical concepts to physical elements
- "Why It Helps" section with positive framing

## STEP 5: WORKED EXAMPLE
- Student Question: Realistic troubleshooting scenario
- Chart Navigation: Which concepts to consult
- The Diagnosis: What the chart reveals
- The Solution: Concrete action items
- Learning Point: How the lifecycle structure helped

## STEP 7: LEARNING PATH SEQUENCE
Create 4-5 progressive stages:
- Stage name and concepts included
- "Capabilities Gained" after each stage
- Use positive language: "enables", "unlocks", "extends"

OUTPUT ALL THREE SECTIONS NOW:
`;

  let supplementaryText = '';
  if (abortSignal?.aborted) throw new Error('Generation cancelled by user');

  const suppStream = invokeClaudeModelStream(
    bedrockClient,
    [{ role: 'user', content: supplementaryPrompt }],
    'You are an automated content generator. Output content only. No questions.',
    32000,
    abortSignal
  );

  for await (const chunk of suppStream) {
    supplementaryText += chunk;
  }

  let pass3Text = `## STEP 3: MASTER HIERARCHICAL CHART

${allConceptsContent}

${supplementaryText}`;

  pass3Text = pass3Text
    .replace(/\[Continue with.*?\]/gi, '')
    .replace(/\[.*?truncated.*?\]/gi, '')
    .replace(/\[Additional concepts follow.*?\]/gi, '')
    .replace(/\[.*?same.*?pattern.*?\]/gi, '')
    .replace(/Note: I can provide.*?$/s, '')
    .replace(/Would you like me to.*?$/s, '')
    .replace(/I apologize.*?$/s, '')
    .replace(/I'll execute.*?framing.*?\./gi, '')
    .replace(/I'll create.*?\./gi, '')
    .replace(/Let me.*?\./gi, '')
    .trim();

  onProgress(3, 'complete', { content: pass3Text });

  onProgress(4, 'in-progress', { message: 'Running quality checks...' });

  // Perform local validation first to get accurate structural metrics
  const localValidation = performLocalValidation(pass3Text, pass1Data);

  // Sample content for Claude: take beginning, middle, and end portions
  const contentLength = pass3Text.length;
  const sampleSize = 8000;
  let contentSample = '';

  if (contentLength <= sampleSize * 2) {
    // If content is small enough, include it all
    contentSample = pass3Text;
  } else {
    // Take beginning, middle samples, and end to give Claude a representative view
    const beginning = pass3Text.substring(0, sampleSize);
    const middleStart = Math.floor(contentLength / 2) - sampleSize / 2;
    const middle = pass3Text.substring(middleStart, middleStart + sampleSize);
    const end = pass3Text.substring(contentLength - sampleSize);
    contentSample = `[BEGINNING OF CONTENT]\n${beginning}\n\n[MIDDLE SECTION]\n${middle}\n\n[END OF CONTENT]\n${end}`;
  }

  const pass4Content = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASS 4 TASK: Assess Content Quality (Structure Already Validated)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: ${subject}
Domain: ${pass1Data.domain}
Lifecycle: ${pass1Data.lifecycle.phase1} → ${pass1Data.lifecycle.phase2} → ${pass1Data.lifecycle.phase3}
Role Scope: ${pass1Data.roleScope}

PRE-VALIDATED STRUCTURE (from local analysis):
- Expected concepts: ${pass1Data.concepts.length}
- Found concepts: ${localValidation.conceptsFound}
- Completeness: ${localValidation.completeness}%
- Format consistency: ${localValidation.formatConsistency}%
- Lifecycle markers present: ${localValidation.lifecycleConsistency}%

YOUR TASK: Assess QUALITY aspects only (terminology, positive framing, domain specificity).
Review the sampled content below and score these dimensions:

FORBIDDEN GENERIC PHRASES (each occurrence = -5 points from terminologyDensity):
- "Set up prerequisites", "Configure settings", "Apply policies"
- "Execute deployment", "Review metrics", "Select appropriate"
- "Follow best practices", "[detailed content]", "[content here]"

SAMPLED CONTENT (${Math.round(contentSample.length / 1000)}KB of ${Math.round(contentLength / 1000)}KB total):
${contentSample}

OUTPUT JSON ONLY - Focus on quality assessment:
{
  "positiveFraming": number (0-100, based on absence of negative language),
  "terminologyDensity": number (0-100, penalize generic phrases found),
  "domainSpecificity": number (0-100, based on real tool/feature names),
  "genericPhraseCount": number,
  "issues": ["quality issues found"],
  "violations": {
    "outOfScope": [],
    "negativeFraming": [],
    "genericContent": []
  },
  "fixes": {}
}
  `;

  if (abortSignal?.aborted) throw new Error('Generation cancelled by user');

  const validationText = await invokeClaudeModel(
    bedrockClient,
    [{ role: 'user', content: pass4Content }],
    `You are a quality assurance validator for educational content. Be generous with scores - if content is domain-specific and well-structured, score it highly.`,
    4000,
    undefined,
    abortSignal
  );

  // Merge local validation with Claude's quality assessment
  const claudeAssessment = parseJsonFromResponse<Partial<ValidationResult>>(validationText);

  const validation: ValidationResult = {
    valid: localValidation.completeness >= 80,
    conceptCount: { expected: pass1Data.concepts.length, found: localValidation.conceptsFound },
    lifecycleConsistency: localValidation.lifecycleConsistency,
    positiveFraming: claudeAssessment.positiveFraming ?? 85,
    formatConsistency: localValidation.formatConsistency,
    completeness: localValidation.completeness,
    issues: claudeAssessment.issues ?? [],
    violations: claudeAssessment.violations ?? { outOfScope: [], negativeFraming: [] },
    fixes: claudeAssessment.fixes ?? {},
  };

  onProgress(4, 'complete', validation);

  let finalContent = pass3Text;
  if (validation.fixes && Object.keys(validation.fixes).length > 0) {
    onProgress(4, 'fixing', {
      message: `Auto-correcting ${Object.keys(validation.fixes).length} issues...`,
    });
    finalContent = applyFixes(pass3Text, validation.fixes);
  }



  const fullDocument = assembleFinalDocument(pass1Data, pass2Text, finalContent);

  return {
    pass1: pass1Data,
    pass2: pass2Text,
    pass3: finalContent,
    validation,
    fullDocument,
    metadata: {
      subject,
      generatedAt: new Date().toISOString(),
      qualityMetrics: {
        lifecycleConsistency: validation.lifecycleConsistency,
        positiveFraming: validation.positiveFraming,
        formatConsistency: validation.formatConsistency,
        completeness: validation.completeness,
      },
    },
  };
}
