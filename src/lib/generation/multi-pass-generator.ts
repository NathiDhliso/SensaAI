import { getSystemPrompt } from '@/lib/system-prompt';
import { usePersonalizationStore } from '@/store/personalization-store';
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
import { enhanceWithVisuals } from './visual-enhancer';
import type { Pass1Result, ProgressCallback, GenerationResult, ValidationResult, DynamicLifecycle } from '@/lib/types/generation';

export async function generateChartIteratively(
  subject: string,
  config: BedrockConfig,
  onProgress: ProgressCallback,
  abortSignal?: AbortSignal
): Promise<GenerationResult> {
  const bedrockClient = getBedrockClient(config);

  // Get aphantasia mode preference for prompt adaptation
  const aphantasiaMode = usePersonalizationStore.getState().aphantasiaMode;
  const systemPrompt = getSystemPrompt(aphantasiaMode);

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

PRE-DETERMINED LIFECYCLE (USE EXACTLY):
Domain: ${dynamicLifecycle.domain}
Role: ${dynamicLifecycle.roleScope}
Phase 1: ${dynamicLifecycle.phase1} - ${dynamicLifecycle.phase1Description}
Phase 2: ${dynamicLifecycle.phase2} - ${dynamicLifecycle.phase2Description}
Phase 3: ${dynamicLifecycle.phase3} - ${dynamicLifecycle.phase3Description}

INSTRUCTIONS:
1. Browse the web for the most recent official syllabus/standard
2. Extract 3 specific recent updates (last 12 months)
3. Identify numerical limits/thresholds
4. Extract ALL core concepts from the official syllabus

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

    const batchPrompt = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BATCH ${batch + 1}/${batches}: Generate concepts ${startIdx + 1}-${endIdx} for "${subject}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${basePromptInfo}

CONCEPTS TO GENERATE IN THIS BATCH:
${batchConcepts.map((c, i) => `${startIdx + i + 1}. ${c}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SHAPE STRUCTURE (Each concept MUST follow this 2-minute learning format)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For EACH concept, generate content using the SHAPE framework:

**S - SIMPLE CORE** (15 seconds to read)
One sentence. No jargon. A complete beginner could repeat it.
Example: "Lambda runs your code without you managing servers - you just upload and trigger."

**H - HIGH-STAKES EXAMPLE** (30 seconds to read)  
A real company + year + dollar amount or human impact.
Example: "In 2017, the S3 outage cost companies $150M in 4 hours - Lambda functions depending on S3 also failed, teaching engineers about regional dependencies."

**A - ANALOGICAL MODEL** (45 seconds to read)
Map to a familiar system (construction, cooking, sports, etc.) that matches the user's background.
3-4 specific technical concepts mapped to physical elements.
Example: "Think of Lambda like a restaurant kitchen: You're the chef (code), AWS is the kitchen equipment (infrastructure). You focus on recipes (logic), they handle the stove, fridge, and cleanup (scaling, patching, monitoring)."

**P - PATTERN RECOGNITION** (20 seconds to read)
A self-test question. "You know you've mastered this when you can answer:"
Then provide the answer immediately below.
Example: "Question: When would you choose Lambda over EC2? Answer: When your workload is event-driven, unpredictable, or you want zero server management."

**E - ELIMINATION LOGIC** (10 seconds to read)
"⚠️ Don't confuse [THIS] with [THAT]" - one critical distinction.
Example: "⚠️ Don't confuse Lambda cold starts (initialization delay) with Lambda timeouts (execution limit). Cold starts are about speed; timeouts are about duration."

OUTPUT FORMAT FOR EACH CONCEPT:
\`\`\`
## ${startIdx + 1}. ${batchConcepts[0]}

### S - Simple Core
[One clear sentence - anyone can understand it]

### H - High-Stakes Example  
[Real company, real year, real numbers or impact]

### A - Analogical Model
[Familiar metaphor with 3-4 concept mappings]

### P - Pattern Recognition
**Question:** [Self-test question the learner should be able to answer]
**Answer:** [Clear, concise answer]

### E - Elimination Logic
⚠️ Don't confuse [X] with [Y]: [Key difference]

### M - Mnemonic Anchor (REQUIRED)
\`\`\`json
{
  "mnemonic": {
    "tier": "Foundation" | "Keystone" | "Utility",
    "anchor": "Concrete Object + Emoji",
    "story": "Bizarre interaction...",
    "parentConcept": "Name of parent concept",
    "depends_on": ["Concept A", "Concept B"] 
  }
}
\`\`\`

---
LIFECYCLE DETAILS:

- ${pass1Data.lifecycle.phase1}:
  • Prerequisite: [ACTUAL tool/license/data source]
  • Selection: [ACTUAL options with real names]
  • Execution: [ACTUAL menu path or command]

• ${pass1Data.lifecycle.phase2}:
  • [ACTUAL setting/configuration]
  • [ACTUAL code snippet or formula]
  • **[Design Boundary]:** [ACTUAL limitation and workaround]

○ ${pass1Data.lifecycle.phase3}:
  • Tool: [ACTUAL verification tool]
  • Metric: [ACTUAL metric to check]
  • Success: [ACTUAL success criteria]

[Continue for remaining concepts...]
\`\`\`

QUALITY REQUIREMENTS:
1. SHAPE sections are MANDATORY for every concept
2. High-Stakes Examples MUST have real company names and real numbers
3. Analogical Models MUST map 3+ technical terms to physical elements
4. Pattern Recognition MUST be answerable in under 10 seconds
5. No generic phrases like "configure settings" - use ACTUAL names
6. MNEMONICS ARE MANDATORY: Use "depends_on" to track prerequisites.
   - Foundation = No parents (usually)
   - Keystone = Depends on Foundation
   - Utility = Depends on Keystone/Foundation

CRITICAL: Generate ALL ${batchConcepts.length} concepts with COMPLETE SHAPE structure.
`;


    let batchText = '';
    if (abortSignal?.aborted) throw new Error('Generation cancelled by user');

    const batchStream = invokeClaudeModelStream(
      bedrockClient,
      [{ role: 'user', content: batchPrompt }],
      lifecycleScopePrompt + '\nYou are an automated content generator. Output content only. No questions.',
      32000,
      abortSignal
    );

    for await (const chunk of batchStream) {
      batchText += chunk;

      // Calculate potential progress for this specific batch
      const currentBatchProgress = Math.round(((batch + 0.5) / batches) * 100);

      // Only update UI if this batch represents a "forward step" in progress
      // This prevents Batch 1 (10%) from overwriting Batch 2 (30%)
      if (currentBatchProgress >= globalMaxProgress) {
        globalMaxProgress = currentBatchProgress;

        onProgress(3, 'in-progress', {
          message: `Batch ${batch + 1}/${batches}: ${batchText.length} chars`,
          progress: globalMaxProgress,
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

  // Phase 1.5: Visual Bridge (Titan Image Gen)
  onProgress(4, 'in-progress', { message: 'Painting memory anchors (Titan)...' });
  try {
    finalContent = await enhanceWithVisuals(finalContent, config, (msg: string) => {
      onProgress(4, 'in-progress', { message: msg });
    });
  } catch (err) {
    console.error('Visual enhancement failed:', err);
    // Proceed without images if enhancement fails
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
