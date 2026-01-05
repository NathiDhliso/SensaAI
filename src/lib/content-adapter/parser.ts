import type {
  ParsedGeneratedContent,
  ParsedDomainAnalysis,
  ParsedConcept,
  ParsedLearningPath,
  ParsedMentalAnchor,
  ParsedStage,
  ParsedAcronym,
  ParsedConfusionPair,
  ParsedMnemonic,
} from './types';
import { validateBatchResponse, type GeneratedConcept } from '@/lib/types/concept-schema';
import { parseContent } from './json-content-parser';

export type ParseResult =
  | { success: true; data: ParsedGeneratedContent }
  | { success: false; error: string };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function extractSection(content: string, startMarker: string, endMarker?: string): string {
  // Use regex for case-insensitive matching
  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startRegex = new RegExp(escapeRegExp(startMarker), 'i');

  const startMatch = content.match(startRegex);
  if (!startMatch || startMatch.index === undefined) return '';

  const startPos = startMatch.index + startMatch[0].length;

  if (endMarker) {
    // Search for end marker in the remaining content
    const remainingContent = content.slice(startPos);
    const endRegex = new RegExp(escapeRegExp(endMarker), 'i');
    const endMatch = remainingContent.match(endRegex);

    if (!endMatch || endMatch.index === undefined) {
      return remainingContent.trim();
    }
    // Return content up to the end marker
    return remainingContent.slice(0, endMatch.index).trim();
  }

  return content.slice(startPos).trim();
}

function parseDomainAnalysis(content: string): ParsedDomainAnalysis {
  const domainSection = extractSection(content, 'DOMAIN ANALYSIS', 'DECISION FRAMEWORK');

  const domainMatch = domainSection.match(/Domain:\s*(.+)/i);
  const roleMatch = domainSection.match(/Professional Role:\s*(.+)/i);
  const lifecycleMatch = domainSection.match(/Lifecycle:\s*(\w+)\s*→\s*(\w+)\s*→\s*(\w+)/i);
  const sourceMatch = domainSection.match(/Source Verification:\s*(.+)/i);
  const conceptCountMatch = domainSection.match(/Core Concepts Identified:\s*(\d+)/i);

  const recentUpdates: string[] = [];
  const updatesMatch = domainSection.match(/Recent Updates:([\s\S]*?)(?=Numerical Limits:|Core Concepts|$)/i);
  if (updatesMatch) {
    const updates = updatesMatch[1].match(/•\s*(.+)/g);
    if (updates) {
      updates.forEach(u => recentUpdates.push(u.replace(/•\s*/, '').trim()));
    }
  }

  const numericalLimits: string[] = [];
  const limitsMatch = domainSection.match(/Numerical Limits:([\s\S]*?)(?=Core Concepts|$)/i);
  if (limitsMatch) {
    const limits = limitsMatch[1].match(/•\s*(.+)/g);
    if (limits) {
      limits.forEach(l => numericalLimits.push(l.replace(/•\s*/, '').trim()));
    }
  }

  const conceptNames: string[] = [];
  const conceptsListMatch = domainSection.match(/Core Concepts Identified:\s*\d+[\s\S]*?((?:\d+\.\s+.+\n?)+)/i);
  if (conceptsListMatch) {
    const conceptLines = conceptsListMatch[1].match(/\d+\.\s+(.+)/g);
    if (conceptLines) {
      conceptLines.forEach(c => {
        const name = c.replace(/^\d+\.\s+/, '').trim();
        conceptNames.push(name);
      });
    }
  }

  return {
    domain: domainMatch?.[1]?.trim() || 'Unknown',
    professionalRole: roleMatch?.[1]?.trim() || 'Unknown',
    lifecycle: {
      phase1: lifecycleMatch?.[1] || 'FOUNDATION',
      phase2: lifecycleMatch?.[2] || 'ACTION',
      phase3: lifecycleMatch?.[3] || 'VERIFICATION',
    },
    sourceVerification: sourceMatch?.[1]?.trim() || '',
    recentUpdates,
    numericalLimits,
    coreConceptsCount: parseInt(conceptCountMatch?.[1] || '0', 10),
    conceptNames,
  };
}


interface LifecyclePhases {
  phase1: string;
  phase2: string;
  phase3: string;
}

function parseConceptBlock(block: string, order: number, stageId: string, lifecycle: LifecyclePhases): ParsedConcept | null {
  // Relaxed match for name: allow leading whitespace/newlines
  let nameMatch = block.match(/(?:^|[\r\n]+)##\s*\d+\.\s*(.+)/);

  if (!nameMatch) {
    // Try fallback without header if block is just the content (edge case)
    // Try matching if it's at the very start of the string without newline
    const startMatch = block.match(/^##\s*\d+\.\s*(.+)/);
    if (!startMatch) return null;
    nameMatch = startMatch;
  }

  const name = nameMatch[1].trim();
  const id = slugify(name);

  // Use dynamic lifecycle phases from the parsed domain analysis
  // Support multiple marker formats to handle AI format drift:
  // - Original: "- PHASE:", "• PHASE:", "○ PHASE:"
  // - Tag-based: "[PHASE]", "**[PHASE]:**"
  // - Bold drift: "**PHASE:**", "**─ PHASE:**", "**• PHASE:**"
  // - Plain: "PHASE:", "PHASE"
  const escPhase1 = lifecycle.phase1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escPhase2 = lifecycle.phase2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escPhase3 = lifecycle.phase3.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Comprehensive patterns for each phase (ordered by specificity)
  const phase1Pattern = new RegExp(
    `(?:\\[${escPhase1}\\]|\\*\\*\\[?[─•-]?\\s*${escPhase1}\\]?:?\\*\\*|[─•-]\\s*${escPhase1}:?|${escPhase1}:)`,
    'i'
  );
  const phase2Pattern = new RegExp(
    `(?:\\[${escPhase2}\\]|\\*\\*\\[?[─•]?\\s*${escPhase2}\\]?:?\\*\\*|[•]\\s*${escPhase2}:?|${escPhase2}:)`,
    'i'
  );
  const phase3Pattern = new RegExp(
    `(?:\\[${escPhase3}\\]|\\*\\*\\[?[─○]?\\s*${escPhase3}\\]?:?\\*\\*|[○]\\s*${escPhase3}:?|${escPhase3}:)`,
    'i'
  );

  // Find the start positions of each phase
  const phase1Match = block.match(phase1Pattern);
  const phase2Match = block.match(phase2Pattern);
  const phase3Match = block.match(phase3Pattern);

  // Extract sections dynamically based on detected phase markers
  let phase1Section = '';
  let phase2Section = '';
  let phase3Section = '';

  if (phase1Match && phase2Match) {
    phase1Section = extractSection(block, phase1Match[0], phase2Match[0]);
  } else if (phase1Match) {
    phase1Section = extractSection(block, phase1Match[0], '•') ||
      extractSection(block, phase1Match[0], '○');
  }

  if (phase2Match && phase3Match) {
    phase2Section = extractSection(block, phase2Match[0], phase3Match[0]);
  } else if (phase2Match) {
    phase2Section = extractSection(block, phase2Match[0], '○') ||
      extractSection(block, phase2Match[0], '##');
  }

  if (phase3Match) {
    phase3Section = extractSection(block, phase3Match[0], '##') ||
      extractSection(block, phase3Match[0], '```');
  }

  if (!phase1Section && !phase2Section && !phase3Section) {
    phase1Section = extractSection(block, `- ${lifecycle.phase1}:`, `• ${lifecycle.phase2}:`);
    phase2Section = extractSection(block, `• ${lifecycle.phase2}:`, `○ ${lifecycle.phase3}:`);
    phase3Section = extractSection(block, `○ ${lifecycle.phase3}:`, '##');
  }

  // Extract new fields: Hook Sentence and Micro-Metaphor
  const hookSentenceMatch = phase1Section.match(/\*\*Hook Sentence\*\*:\s*(.+?)(?=\n|\*\*Micro|$)/i) ||
    block.match(/\*\*Hook Sentence\*\*:\s*(.+?)(?=\n|$)/i);
  const microMetaphorMatch = phase1Section.match(/\*\*Micro-Metaphor\*\*:\s*(.+?)(?=\n|Prerequisite|$)/i) ||
    block.match(/\*\*Micro-Metaphor\*\*:\s*(.+?)(?=\n|$)/i);

  const prereqMatch = phase1Section.match(/Prerequisite:\s*(.+?)(?=Selection:|Execution:|$)/is);
  const selectionMatch = phase1Section.match(/Selection:([\s\S]*?)(?=Execution:|$)/i);
  const executionMatch = phase1Section.match(/Execution:\s*(.+?)$/is);

  const selectionItems: string[] = [];
  if (selectionMatch) {
    const items = selectionMatch[1].match(/[•*]\s*(.+)/g);
    if (items) {
      items.forEach(item => selectionItems.push(item.replace(/^[•*]\s*/, '').trim()));
    }
  }

  const phase2Items: string[] = [];
  const configLines = phase2Section.match(/[•*]\s*\*\*(.+?)\*\*:?\s*(.+?)(?=\n|$)/g);
  if (configLines) {
    configLines.forEach(line => {
      const cleaned = line.replace(/^[•*]\s*/, '').replace(/\*\*/g, '').trim();
      phase2Items.push(cleaned);
    });
  }

  const criticalDistinctions: string[] = [];
  const criticalMatches = block.matchAll(/\*\*\[Critical Distinction\]:\*\*\s*(.+?)(?=\n|$)/gi);
  for (const match of criticalMatches) {
    criticalDistinctions.push(match[1].trim());
  }

  const designBoundaries: string[] = [];
  const boundaryMatches = block.matchAll(/\*\*\[Design Boundary\]:\*\*\s*(.+?)(?=\n|$)/gi);
  for (const match of boundaryMatches) {
    designBoundaries.push(match[1].trim());
  }

  const examFocus: string[] = [];
  const examMatches = block.matchAll(/\*\*\[Exam Focus\]:\*\*\s*(.+?)(?=\n|$)/gi);
  for (const match of examMatches) {
    examFocus.push(match[1].trim());
  }

  const logicalConnectionMatch = block.match(/\*\*\[Logical Connection\]:\*\*\s*(.+?)(?=\n|$)/i);

  const toolMatch = phase3Section.match(/Tool:\s*(.+?)(?=\n|Metrics:|$)/i);
  const metricsMatch = phase3Section.match(/Metrics:\s*(.+?)(?=\n|Threshold|$)/i);
  const thresholdMatch = phase3Section.match(/Threshold[s]?:\s*(.+?)$/is);

  const metrics: string[] = [];
  if (metricsMatch) {
    metricsMatch[1].split(',').forEach(m => metrics.push(m.trim()));
  }

  // Extract SHAPE sections
  const shapeSections = parseShapeSections(block);

  // Extract mnemonic context for Memory Palace
  const mnemonic = parseMnemonic(block);

  return {
    id,
    name,
    order,
    stageId,
    logicalConnection: logicalConnectionMatch?.[1]?.trim(),
    phase1: {
      hookSentence: hookSentenceMatch?.[1]?.trim() || '',
      microMetaphor: microMetaphorMatch?.[1]?.trim() || '',
      prerequisite: prereqMatch?.[1]?.trim() || '',
      selection: selectionItems,
      execution: executionMatch?.[1]?.trim() || '',
    },
    phase2: phase2Items,
    phase3: {
      tool: toolMatch?.[1]?.trim() || '',
      metrics,
      thresholds: thresholdMatch?.[1]?.trim() || '',
    },
    shape: shapeSections,
    mnemonic,
    criticalDistinctions,
    designBoundaries,
    examFocus,
  };
}

/**
 * Parse mnemonic context from concept block for Memory Palace integration.
 * Supports both JSON format and text-based format.
 */
function parseMnemonic(block: string): ParsedMnemonic | undefined {
  // Try JSON format first (preferred) - use more robust extraction
  // Look for mnemonic object with balanced braces
  const mnemonicStart = block.search(/"mnemonic"\s*:\s*\{/i);

  if (mnemonicStart !== -1) {
    try {
      // Find the matching closing brace for the mnemonic object
      let braceCount = 0;
      let startIdx = block.indexOf('{', mnemonicStart);
      let endIdx = startIdx;

      for (let i = startIdx; i < block.length; i++) {
        if (block[i] === '{') braceCount++;
        if (block[i] === '}') braceCount--;
        if (braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }

      if (endIdx > startIdx) {
        const jsonStr = block.slice(startIdx, endIdx);
        const parsed = JSON.parse(jsonStr);

        const tier = parsed.tier as 'Foundation' | 'Keystone' | 'Utility';
        if (!['Foundation', 'Keystone', 'Utility'].includes(tier)) {
          // Fall through to text-based parsing
        } else {
          // Extract depends_on array if present
          let dependsOn: string[] | undefined;
          if (Array.isArray(parsed.depends_on)) {
            dependsOn = parsed.depends_on.filter((d: unknown) => typeof d === 'string');
          }

          return {
            tier,
            anchor: parsed.anchor || '',
            story: parsed.story || '',
            imageUrl: parsed.imageUrl,
            parentName: parsed.parentConcept || parsed.parentName || undefined,
            dependsOn,
          };
        }
      }
    } catch {
      // Fall through to text-based parsing
    }
  }

  // Text-based fallback parsing
  const tierMatch = block.match(/(?:\*\*)?Tier(?:\*\*)?:\s*(Foundation|Keystone|Utility)/i);
  const anchorMatch = block.match(/(?:\*\*)?Anchor(?:\*\*)?:\s*(.+?)(?=\n|$)/i);
  const storyMatch = block.match(/(?:\*\*)?Story(?:\*\*)?:\s*(.+?)(?=\n(?:\*\*)?(?:Parent|Tier)|$)/is);
  const parentMatch = block.match(/(?:\*\*)?Parent(?:Concept)?(?:\*\*)?:\s*(.+?)(?=\n|$)/i);

  if (tierMatch && anchorMatch) {
    const tier = tierMatch[1] as 'Foundation' | 'Keystone' | 'Utility';
    return {
      tier,
      anchor: anchorMatch[1].trim(),
      story: storyMatch?.[1]?.trim() || '',
      parentName: parentMatch?.[1]?.trim() === 'None' || parentMatch?.[1]?.trim() === 'null'
        ? undefined
        : parentMatch?.[1]?.trim(),
    };
  }

  return undefined;
}

/**
 * Parse SHAPE micro-learning sections from a concept block
 */
function parseShapeSections(block: string): ParsedConcept['shape'] | undefined {
  // S - Simple Core
  const simpleCoreMatch = block.match(/###?\s*S\s*[-–—]\s*Simple Core\s*\n([\s\S]*?)(?=###?\s*H\s*[-–—]|$)/i) ||
    block.match(/\*\*S\s*[-–—]\s*Simple Core\*\*[:\s]*([\s\S]*?)(?=\*\*H|###|$)/i);

  // H - High-Stakes Example
  const highStakesMatch = block.match(/###?\s*H\s*[-–—]\s*High-Stakes Example\s*\n([\s\S]*?)(?=###?\s*A\s*[-–—]|$)/i) ||
    block.match(/\*\*H\s*[-–—]\s*High-Stakes Example\*\*[:\s]*([\s\S]*?)(?=\*\*A|###|$)/i);

  // A - Analogical Model
  const analogicalMatch = block.match(/###?\s*A\s*[-–—]\s*Analogical Model\s*\n([\s\S]*?)(?=###?\s*P\s*[-–—]|$)/i) ||
    block.match(/\*\*A\s*[-–—]\s*Analogical Model\*\*[:\s]*([\s\S]*?)(?=\*\*P|###|$)/i);

  // P - Pattern Recognition
  const patternMatch = block.match(/###?\s*P\s*[-–—]\s*Pattern Recognition\s*\n([\s\S]*?)(?=###?\s*E\s*[-–—]|$)/i) ||
    block.match(/\*\*P\s*[-–—]\s*Pattern Recognition\*\*[:\s]*([\s\S]*?)(?=\*\*E|###|$)/i);

  // E - Elimination Logic
  const eliminationMatch = block.match(/###?\s*E\s*[-–—]\s*Elimination Logic\s*\n([\s\S]*?)(?=###|---|$)/i) ||
    block.match(/\*\*E\s*[-–—]\s*Elimination Logic\*\*[:\s]*([\s\S]*?)(?=###|---|$)/i);

  // Only return shape if we found at least the Simple Core section
  if (!simpleCoreMatch) {
    return undefined;
  }

  // Parse P section for question/answer
  let patternQuestion = '';
  let patternAnswer = '';
  if (patternMatch) {
    const patternContent = patternMatch[1];
    const questionMatch = patternContent.match(/\*\*Question:\*\*\s*(.+?)(?=\*\*Answer|$)/is) ||
      patternContent.match(/Question:\s*(.+?)(?=Answer:|$)/is);
    const answerMatch = patternContent.match(/\*\*Answer:\*\*\s*(.+?)$/is) ||
      patternContent.match(/Answer:\s*(.+?)$/is);
    patternQuestion = questionMatch?.[1]?.trim() || patternContent.trim();
    patternAnswer = answerMatch?.[1]?.trim() || '';
  }

  return {
    simpleCore: simpleCoreMatch[1]?.trim() || '',
    highStakesExample: highStakesMatch?.[1]?.trim() || '',
    analogicalModel: analogicalMatch?.[1]?.trim() || '',
    patternRecognition: {
      question: patternQuestion,
      answer: patternAnswer,
    },
    eliminationLogic: eliminationMatch?.[1]?.trim() || '',
  };
}

/**
 * Detects if content contains JSON-structured concepts (new format).
 */
function isJsonConceptFormat(content: string): boolean {
  return content.includes('"concepts":') ||
    content.includes('"shape":') ||
    (content.includes('"order":') && content.includes('"name":'));
}

/**
 * Extracts JSON data from content using multiple strategies to handle
 * varied AI output formats (markdown blocks, raw JSON, batch concatenations).
 */
function extractJsonData(content: string): unknown | null {
  const allConcepts: unknown[] = [];
  let foundAny = false;

  // Strategy 1: Scan ALL code blocks (json or generic)
  // This handles the standard output format from multi-pass generator
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  let codeMatch;
  while ((codeMatch = codeBlockRegex.exec(content)) !== null) {
    try {
      const jsonStr = codeMatch[1];
      // Quick check if it looks like it contains concepts
      if (jsonStr.includes('"concepts"')) {
        const parsed = JSON.parse(jsonStr);
        if (parsed?.concepts && Array.isArray(parsed.concepts)) {
          allConcepts.push(...parsed.concepts);
          foundAny = true;
        } else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.name) {
          // Sometimes it outputs just the array
          allConcepts.push(...parsed);
          foundAny = true;
        }
      }
    } catch {
      // Ignore invalid JSON indices
    }
  }

  // Strategy 2: If code blocks didn't yield enough, try loose JSON object extraction
  // Find any "concepts": [ pattern and trace back to the nearest opening brace
  if (!foundAny || allConcepts.length < 5) {
    // Look for "concepts" : [  (with any whitespace)
    const conceptsKeyRegex = /\"concepts\"\s*:\s*\[/g;
    let keyMatch;

    while ((keyMatch = conceptsKeyRegex.exec(content)) !== null) {
      // Search backwards for the opening brace of this object
      let openBraceIdx = -1;
      let balance = 0;
      // Limit backward search to ~500 chars to avoid performance hits
      for (let i = keyMatch.index; i >= Math.max(0, keyMatch.index - 500); i--) {
        if (content[i] === '}') balance++;
        if (content[i] === '{') {
          if (balance === 0) {
            openBraceIdx = i;
            break;
          }
          balance--;
        }
      }

      if (openBraceIdx !== -1) {
        // Now find the closing brace using the forward scanner
        let depth = 0;
        let endIdx = openBraceIdx;
        let inString = false;
        let escape = false;
        let foundEnd = false;

        for (let i = openBraceIdx; i < content.length; i++) {
          const char = content[i];
          if (escape) escape = false;
          else if (char === '\\') escape = true;
          else if (char === '\"' && !escape) inString = !inString;
          else if (!inString) {
            if (char === '{') depth++;
            else if (char === '}') {
              depth--;
              if (depth === 0) {
                endIdx = i + 1;
                foundEnd = true;
                break;
              }
            }
          }
        }

        if (foundEnd) {
          try {
            const jsonStr = content.slice(openBraceIdx, endIdx);
            // Avoid re-parsing the same block if it was already caught by code blocks
            // But parsing twice is safer than missing it. Set makes implicit deduping hard without IDs.
            // For now, relies on JSON.parse being robust.
            const parsed = JSON.parse(jsonStr);
            if (parsed?.concepts && Array.isArray(parsed.concepts)) {
              // Validate concepts are objects with names (reject strings from Pass 1)
              const validConcepts = parsed.concepts.filter((c: any) => c && typeof c === 'object' && c.name);

              // Check if we already have these concepts (rough check by name)
              const isNew = validConcepts.length > 0 &&
                (!allConcepts.length ||
                  //@ts-ignore
                  validConcepts[0].name !== allConcepts[0].name);

              if (isNew) {
                allConcepts.push(...validConcepts);
                foundAny = true;
              }
            }
          } catch { }
        }
      }
    }
  }

  if (foundAny || allConcepts.length > 0) {
    console.log(`[parser] Extracted ${allConcepts.length} concepts using multi-strategy parser`);
    // Dedup concepts by name/order just in case
    const uniqueConcepts = Array.from(new Map(allConcepts.map((c: any) => [c.name, c])).values());
    return { concepts: uniqueConcepts };
  }

  return null;
}

/**
 * Converts a GeneratedConcept (from JSON schema) to ParsedConcept format.
 */
function convertJsonToParsedConcept(jsonConcept: GeneratedConcept, stageId: string): ParsedConcept {
  const id = slugify(jsonConcept.name);

  return {
    id,
    name: jsonConcept.name,
    order: jsonConcept.order,
    stageId,
    logicalConnection: jsonConcept.annotations?.logicalConnection,
    phase1: {
      hookSentence: jsonConcept.lifecycle?.phase1?.hookSentence || '',
      microMetaphor: jsonConcept.lifecycle?.phase1?.microMetaphor || '',
      prerequisite: jsonConcept.lifecycle?.phase1?.prerequisite || '',
      selection: jsonConcept.lifecycle?.phase1?.selection || [],
      execution: jsonConcept.lifecycle?.phase1?.execution || '',
    },
    phase2: jsonConcept.lifecycle?.phase2 || [],
    phase3: {
      tool: jsonConcept.lifecycle?.phase3?.tool || '',
      metrics: jsonConcept.lifecycle?.phase3?.metrics || [],
      thresholds: jsonConcept.lifecycle?.phase3?.thresholds || '',
    },
    shape: jsonConcept.shape ? {
      simpleCore: jsonConcept.shape.simpleCore,
      highStakesExample: jsonConcept.shape.highStakesExample,
      analogicalModel: jsonConcept.shape.analogicalModel,
      patternRecognition: {
        question: jsonConcept.shape.patternRecognition?.question || '',
        answer: jsonConcept.shape.patternRecognition?.answer || '',
      },
      eliminationLogic: jsonConcept.shape.eliminationLogic,
    } : undefined,
    mnemonic: jsonConcept.mnemonic ? {
      tier: jsonConcept.mnemonic.tier,
      anchor: jsonConcept.mnemonic.anchor,
      story: jsonConcept.mnemonic.story,
      imageUrl: jsonConcept.mnemonic.imageUrl,
      parentName: jsonConcept.mnemonic.parentConcept || undefined,
      dependsOn: jsonConcept.mnemonic.depends_on,
    } : undefined,
    criticalDistinctions: jsonConcept.annotations?.criticalDistinctions || [],
    designBoundaries: jsonConcept.annotations?.designBoundaries || [],
    examFocus: jsonConcept.annotations?.examFocus || [],
  };
}

/**
 * Parses concepts from JSON-structured content (new format).
 */
function parseConceptsFromJson(content: string, stageId: string): ParsedConcept[] {
  const jsonData = extractJsonData(content);
  if (!jsonData) {
    console.warn('[parser] No valid JSON found in content');
    return [];
  }

  const validated = validateBatchResponse(jsonData);
  if (!validated) {
    console.warn('[parser] JSON validation failed, falling back to regex');
    return [];
  }

  const concepts = validated.concepts.map(c => convertJsonToParsedConcept(c, stageId));

  // Resolve mnemonic parentName -> parentId
  const nameToIdMap = new Map(concepts.map(c => [c.name.toLowerCase(), c.id]));
  for (const concept of concepts) {
    if (concept.mnemonic?.parentName) {
      const parentId = nameToIdMap.get(concept.mnemonic.parentName.toLowerCase());
      if (parentId) {
        concept.mnemonic.parentId = parentId;
      }
    }
  }

  console.log(`[parser] Successfully parsed ${concepts.length} concepts from JSON`);
  return concepts;
}

function parseConcepts(content: string, lifecycle: LifecyclePhases): ParsedConcept[] {
  // Try JSON parsing first (new format) - more reliable
  if (isJsonConceptFormat(content)) {
    const jsonConcepts = parseConceptsFromJson(content, 'stage-1');
    if (jsonConcepts.length > 0) {
      return jsonConcepts;
    }
    console.log('[parser] JSON parsing returned no concepts, trying regex fallback');
  }

  // Fallback to regex parsing (legacy markdown format)
  // Try "MASTER HIERARCHICAL CHART" first, fallback to "VISUAL MASTER CHART"
  let chartSection = extractSection(content, 'MASTER HIERARCHICAL CHART', 'VISUAL MENTAL ANCHORS');
  if (!chartSection) {
    console.log('[parser] "MASTER HIERARCHICAL CHART" section not found, trying "VISUAL MASTER CHART"');
    chartSection = extractSection(content, 'VISUAL MASTER CHART', 'VISUAL MENTAL ANCHORS');
  }

  console.log(`[parser] chartSection length: ${chartSection.length}`);

  // Strip code block markers (```) that wrap concept definitions
  const cleanedSection = chartSection.replace(/```/g, '');

  // Relaxed split regex: handles newlines more robustly and optional spacing
  // Matches: Newline(s) + ## + Number + .
  const conceptBlocks = cleanedSection.split(/(?=(?:^|[\r\n]+)##\s*\d+\.)/m).filter(b => b.trim());
  console.log(`[parser] Found ${conceptBlocks.length} concept blocks (regex split)`);

  const concepts: ParsedConcept[] = [];
  let order = 1;

  // Pass 1: Parse all concepts
  for (const block of conceptBlocks) {
    const concept = parseConceptBlock(block, order, 'stage-1', lifecycle);
    if (concept) {
      concepts.push(concept);
      order++;
    } else {
      console.warn(`[parser] Failed to parse concept block ${order}:`, block.slice(0, 100));
    }
  }

  // Pass 2: Resolve mnemonic parentName -> parentId
  const nameToIdMap = new Map(concepts.map(c => [c.name.toLowerCase(), c.id]));

  for (const concept of concepts) {
    if (concept.mnemonic?.parentName) {
      const parentId = nameToIdMap.get(concept.mnemonic.parentName.toLowerCase());
      if (parentId) {
        concept.mnemonic.parentId = parentId;
      }
    }
  }

  return concepts;
}

function parseLearningPath(content: string): ParsedLearningPath {
  const pathSection = extractSection(content, 'LEARNING PATH SEQUENCE', '');

  const stages: ParsedLearningPath['stages'] = [];

  const stageMatches = pathSection.matchAll(/###\s*Stage\s*(\d+):\s*(.+?)(?=\n)/gi);

  for (const match of stageMatches) {
    const stageOrder = parseInt(match[1], 10);
    const stageName = match[2].trim();

    const stageStart = pathSection.indexOf(match[0]);
    const nextStageMatch = pathSection.slice(stageStart + match[0].length).match(/###\s*Stage\s*\d+/);
    const stageEnd = nextStageMatch
      ? stageStart + match[0].length + pathSection.slice(stageStart + match[0].length).indexOf(nextStageMatch[0])
      : pathSection.length;

    const stageContent = pathSection.slice(stageStart, stageEnd);

    const conceptsMatch = stageContent.match(/\*\*Concepts(?:\s*Included)?:\*\*\s*(.+?)(?=\n\n|\*\*Difficulty|\*\*Capabilities|\*\*Narrative)/is);
    const difficultyProfileMatch = stageContent.match(/\*\*Difficulty Profile:\*\*\s*(.+?)(?=\n|\*\*Capabilities|$)/i);
    const capabilitiesMatch = stageContent.match(/\*\*Capabilities Gained:\*\*\s*([\s\S]+?)(?=\*\*Narrative|###|$)/i);
    const narrativeBridgeMatch = stageContent.match(/\*\*Narrative Handshake:\*\*\s*([\s\S]+?)(?=###|$)/i);

    const conceptNames: string[] = [];
    const conceptsWithDifficulty: { name: string; difficulty: 'foundational' | 'intermediate' | 'advanced' }[] = [];

    if (conceptsMatch) {
      // Parse concepts with difficulty markers (🟢🟡🔴)
      const conceptLines = conceptsMatch[1].split(/\n|,/).map(c => c.trim()).filter(Boolean);
      for (const line of conceptLines) {
        // Check for emoji difficulty markers
        let difficulty: 'foundational' | 'intermediate' | 'advanced' = 'intermediate';
        let name = line;

        if (line.includes('🟢') || line.toLowerCase().includes('foundational')) {
          difficulty = 'foundational';
          name = line.replace(/🟢/g, '').replace(/[-–]\s*foundational.*/i, '').trim();
        } else if (line.includes('🔴') || line.toLowerCase().includes('advanced')) {
          difficulty = 'advanced';
          name = line.replace(/🔴/g, '').replace(/[-–]\s*advanced.*/i, '').trim();
        } else if (line.includes('🟡') || line.toLowerCase().includes('intermediate')) {
          difficulty = 'intermediate';
          name = line.replace(/🟡/g, '').replace(/[-–]\s*intermediate.*/i, '').trim();
        }

        // Clean brackets and extra markers
        name = name.replace(/^\[|\]$/g, '').replace(/[()]/g, '').trim();

        if (name) {
          conceptNames.push(name);
          conceptsWithDifficulty.push({ name, difficulty });
        }
      }
    }

    stages.push({
      order: stageOrder,
      name: stageName,
      concepts: conceptNames,
      conceptsWithDifficulty,
      difficultyProfile: difficultyProfileMatch?.[1]?.trim(),
      capabilitiesGained: capabilitiesMatch?.[1]?.trim() || '',
      narrativeBridge: narrativeBridgeMatch?.[1]?.trim(),
    });
  }

  if (stages.length === 0) {
    stages.push(
      { order: 1, name: 'Foundation', concepts: [], conceptsWithDifficulty: [], capabilitiesGained: 'Core understanding established' }
    );
  }

  return { stages };
}

function parseMentalAnchors(content: string): ParsedMentalAnchor[] {
  const anchorsSection = extractSection(content, 'VISUAL MENTAL ANCHORS', 'WORKED EXAMPLE');

  const anchors: ParsedMentalAnchor[] = [];

  const anchorMatches = anchorsSection.matchAll(/###\s*Anchor\s*\d+:\s*(.+?)(?=\n)/gi);

  for (const match of anchorMatches) {
    const anchorName = match[1].trim();

    const anchorStart = anchorsSection.indexOf(match[0]);
    const nextAnchorMatch = anchorsSection.slice(anchorStart + match[0].length).match(/###\s*Anchor\s*\d+/);
    const anchorEnd = nextAnchorMatch
      ? anchorStart + match[0].length + anchorsSection.slice(anchorStart + match[0].length).indexOf(nextAnchorMatch[0])
      : anchorsSection.length;

    const anchorContent = anchorsSection.slice(anchorStart, anchorEnd);

    const metaphorMatch = anchorContent.match(/(?:Imagine|Picture|Visualize)\s+(.+?)(?=\.\s+[A-Z]|\*\*Why|\*\*Memory)/is);
    const whyMatch = anchorContent.match(/\*\*Why It Helps[^*]*:\*\*\s*([\s\S]+?)(?=###|\*\*Memory|$)/i);

    let acronym: ParsedAcronym | undefined;
    const acronymMatch = anchorContent.match(/\*\*\[?([A-Z]{2,10})\]?:\*\*\s*([^-\n]+)\s*-\s*["']?([^"'\n]+)["']?/i);
    if (acronymMatch) {
      acronym = {
        acronym: acronymMatch[1].trim(),
        expansion: acronymMatch[2].trim(),
        mnemonic: acronymMatch[3].trim(),
      };
    }

    const mappings: { concept: string; metaphorElement: string }[] = [];
    const mappingMatches = anchorContent.matchAll(/([A-Za-z][A-Za-z\s&-]{2,40})\s+(?:is|are|acts? as|functions? as|serves? as|represents?|like)\s+(?:the\s+)?(?:\*\*)?([^*\n.]{3,60})(?:\*\*)?/gi);

    for (const mapping of mappingMatches) {
      const concept = mapping[1].trim();
      const element = mapping[2].trim();
      if (concept.length > 2 && element.length > 2 && !concept.toLowerCase().startsWith('this')) {
        mappings.push({ concept, metaphorElement: element });
      }
    }

    // Extract Binary Decision Rule
    const binaryRuleMatch = anchorContent.match(/\*\*Binary Decision Rule[^*]*:\*\*\s*([\s\S]+?)(?=\*\*Why|\*\*Memory|###|$)/i) ||
      anchorContent.match(/If\s+\[?([^\]]+)\]?,\s*YES\s*[→→-]+\s*(.+?)(?=\.\s*Otherwise|$)/i);
    const binaryDecisionRule = binaryRuleMatch?.[0]?.includes('If')
      ? binaryRuleMatch[0].trim()
      : binaryRuleMatch?.[1]?.trim();

    anchors.push({
      name: anchorName,
      metaphor: metaphorMatch?.[1]?.trim() || '',
      mappings,
      whyItHelps: whyMatch?.[1]?.trim() || '',
      acronym,
      binaryDecisionRule,
    });
  }

  return anchors;
}

/**
 * Parse confusion pairs JSON block from generated content
 */
function parseConfusionPairs(content: string): ParsedConfusionPair[] {
  const pairs: ParsedConfusionPair[] = [];

  // Look for the confusion pairs JSON block
  const jsonMatch = content.match(/```json\s*\n?\s*\{\s*"confusionPairs"\s*:\s*(\[[\s\S]*?\])\s*\}\s*\n?```/i) ||
    content.match(/"confusionPairs"\s*:\s*(\[[\s\S]*?\])/i);

  if (jsonMatch) {
    try {
      const pairsArray = JSON.parse(jsonMatch[1]);
      if (Array.isArray(pairsArray)) {
        for (const pair of pairsArray) {
          pairs.push({
            id: pair.id || `conf-${pairs.length + 1}`,
            conceptA: pair.conceptA || '',
            conceptB: pair.conceptB || '',
            distinctionKey: pair.distinctionKey || '',
            whenToUseA: pair.whenToUseA || '',
            whenToUseB: pair.whenToUseB || '',
          });
        }
      }
    } catch {
      // JSON parsing failed, try regex fallback
      const pairMatches = content.matchAll(/"id"\s*:\s*"([^"]+)"[\s\S]*?"conceptA"\s*:\s*"([^"]+)"[\s\S]*?"conceptB"\s*:\s*"([^"]+)"[\s\S]*?"distinctionKey"\s*:\s*"([^"]+)"[\s\S]*?"whenToUseA"\s*:\s*"([^"]+)"[\s\S]*?"whenToUseB"\s*:\s*"([^"]+)"/gi);
      for (const match of pairMatches) {
        pairs.push({
          id: match[1],
          conceptA: match[2],
          conceptB: match[3],
          distinctionKey: match[4],
          whenToUseA: match[5],
          whenToUseB: match[6],
        });
      }
    }
  }

  return pairs;
}

/**
 * Detects if content is from a PL-300 JSON file format
 */
function isPL300JsonFormat(content: string): boolean {
  return content.includes('VISUAL MASTER CHART: Microsoft Learn - PL-300') ||
    content.includes('PL-300: Microsoft Power BI Data Analyst') ||
    (content.includes('Core Concepts Identified: 68') && content.includes('Power BI Desktop'));
}

/**
 * Parse PL-300 JSON content using the specialized parser
 */
function parseGenericJsonContent(rawContent: string): ParseResult {
  const result = parseContent(rawContent);

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Failed to parse PL-300 content'
    };
  }

  return {
    success: true,
    data: result.data!
  };
}

export function parseGeneratedContent(rawContent: string): ParseResult {
  try {
    if (!rawContent || rawContent.trim().length === 0) {
      return {
        success: false,
        error: 'Empty content received - please regenerate',
      };
    }

    // Check if this is a PL-300 JSON file format
    if (isPL300JsonFormat(rawContent)) {
      return parseGenericJsonContent(rawContent);
    }

    const domainAnalysis = parseDomainAnalysis(rawContent);

    if (!domainAnalysis.domain || domainAnalysis.domain.trim().length === 0) {
      return {
        success: false,
        error: 'Domain analysis incomplete - regeneration recommended',
      };
    }

    if (!domainAnalysis.lifecycle.phase1) {
      return {
        success: false,
        error: 'Lifecycle information missing - regeneration recommended',
      };
    }

    const concepts = parseConcepts(rawContent, domainAnalysis.lifecycle);

    if (concepts.length === 0) {
      return {
        success: false,
        error: 'No concepts detected - check content format or regenerate',
      };
    }

    const learningPath = parseLearningPath(rawContent);
    const mentalAnchors = parseMentalAnchors(rawContent);
    const confusionPairs = parseConfusionPairs(rawContent);

    return {
      success: true,
      data: {
        domainAnalysis,
        concepts,
        learningPath,
        mentalAnchors,
        confusionPairs,
        rawContent,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Parsing failed - please regenerate',
    };
  }
}

export function extractStagesFromLearningPath(learningPath: ParsedLearningPath): ParsedStage[] {
  return learningPath.stages.map(stage => ({
    id: `stage-${stage.order}-${slugify(stage.name)}`,
    order: stage.order,
    name: stage.name,
    concepts: stage.concepts.map(c => slugify(c)),
  }));
}
