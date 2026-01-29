/**
 * JSON Content Parser
 * 
 * Handles the special JSON format with fullDocument field containing escaped content.
 * This parser extracts and processes the embedded content properly.
 */

import type {
    ParsedGeneratedContent,
    ParsedDomainAnalysis,
    ParsedConcept,
    ParsedLearningPath,
    ParsedMentalAnchor,
    ParsedConfusionPair,
    ParsedMnemonic,
} from './types';

// ============================================================================
// TYPES
// ============================================================================

interface ContentJsonFile {
    id?: string;
    subject?: string;
    generatedAt?: string;
    fullDocument: string;
}

export type ParseResult = {
    success: true;
    data: ParsedGeneratedContent;
} | {
    success: false;
    error: string;
};

// ============================================================================
// MAIN PARSER FUNCTION
// ============================================================================

/**
 * Parse JSON content
 * Handles the wrapper format with fullDocument field
 */
export function parseContent(rawContent: string): ParseResult {
    try {
        // Try to parse as JSON wrapper first
        let content = rawContent;

        try {
            const parsed = JSON.parse(rawContent) as ContentJsonFile;
            if (parsed.fullDocument) {
                content = parsed.fullDocument;
            }
        } catch {
            // Not a JSON wrapper, use raw content directly
        }

        // Parse domain analysis from content
        const domainAnalysis = parseDomainAnalysis(content);

        // Parse concepts from JSON blocks
        const concepts = parseConcepts(content);

        if (concepts.length === 0) {
            return {
                success: false,
                error: 'No concepts detected in content'
            };
        }

        // Parse learning path
        const learningPath = parseLearningPath(concepts);

        // Parse mental anchors from mnemonics
        const mentalAnchors = parseMentalAnchors(concepts);

        // Parse confusion pairs
        const confusionPairs: ParsedConfusionPair[] = [];

        return {
            success: true,
            data: {
                domainAnalysis,
                concepts,
                learningPath,
                mentalAnchors,
                confusionPairs,
                rawContent: content,
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to parse content'
        };
    }
}

// ============================================================================
// DOMAIN ANALYSIS PARSER
// ============================================================================

function parseDomainAnalysis(content: string): ParsedDomainAnalysis {
    // Try to extract domain from JSON format first (e.g., {"domain": "Subject Name", ...})
    let domain: string | undefined;
    let lifecycle: { phase1: string; phase2: string; phase3: string } | undefined;

    try {
        // Remove BOM and control characters
        let cleanContent = content.replace(/^\uFEFF/, '');
        // eslint-disable-next-line no-control-regex
        cleanContent = cleanContent.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');

        const firstBrace = cleanContent.indexOf('{');
        if (firstBrace !== -1) {
            const possibleJson = cleanContent.substring(firstBrace).trim();
            const parsed = JSON.parse(possibleJson);
            
            // Extract domain from JSON
            if (parsed.domain) {
                domain = parsed.domain;
            }
            
            // Extract lifecycle from JSON
            if (parsed.lifecycle) {
                lifecycle = {
                    phase1: parsed.lifecycle.phase1 || 'PREPARE',
                    phase2: parsed.lifecycle.phase2 || 'MODEL',
                    phase3: parsed.lifecycle.phase3 || 'DELIVER',
                };
            }
        }
    } catch {
        // Not valid JSON, fall back to text extraction
    }

    // Fallback: Extract lifecycle phases from text content
    if (!lifecycle) {
        const lifecycleMatch = content.match(/Lifecycle:\s*([A-Z]+)\s*→\s*([A-Z]+)\s*→\s*([A-Z]+)/i);
        lifecycle = {
            phase1: lifecycleMatch?.[1] || 'PREPARE',
            phase2: lifecycleMatch?.[2] || 'MODEL',
            phase3: lifecycleMatch?.[3] || 'DELIVER',
        };
    }

    // Fallback: Extract domain from text marker
    if (!domain) {
        domain = extractValue(content, 'Domain:') || 'General Domain';
    }

    // Try to extract concept names
    const conceptNames: string[] = [];
    const conceptNameRegex = /"name":\s*"([^"]+)"/g;
    let match;
    while ((match = conceptNameRegex.exec(content)) !== null) {
        if (match[1] && !conceptNames.includes(match[1])) {
            conceptNames.push(match[1]);
        }
    }

    return {
        domain,
        professionalRole: extractValue(content, 'Professional Role:') || 'Learner',
        lifecycle,
        sourceVerification: 'Documentation',
        recentUpdates: extractListItems(content, 'Recent Updates:'),
        numericalLimits: extractListItems(content, 'Numerical Limits:'),
        coreConceptsCount: conceptNames.length || parseInt(extractValue(content, 'Core Concepts Identified:') || '0', 10),
        conceptNames,
    };
}

function extractValue(content: string, marker: string): string | undefined {
    const regex = new RegExp(`${marker}\\s*(.+?)(?:\\n|$)`, 'i');
    const match = content.match(regex);
    return match?.[1]?.trim();
}

function extractListItems(content: string, marker: string): string[] {
    const startIndex = content.indexOf(marker);
    if (startIndex === -1) return [];

    const sectionContent = content.substring(startIndex + marker.length, startIndex + 1000);
    const items: string[] = [];

    const lines = sectionContent.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
            items.push(trimmed.replace(/^[•-]\s*/, ''));
        } else if (trimmed.length > 0 && !trimmed.includes(':') && items.length > 0) {
            // Stop at next section
            break;
        }
    }

    return items;
}

// ============================================================================
// CONCEPTS PARSER
// ============================================================================

function parseConcepts(content: string): ParsedConcept[] {
    const concepts: ParsedConcept[] = [];
    const seenIds = new Set<string>(); // Prevent duplicates from merged blocks

    // Find JSON blocks containing concepts array
    // Find JSON blocks containing concepts array
    // We strictly look for blocks that look like JSON arrays or objects
    const jsonBlockRegex = /```(?:json)?\s*(\{[\s\S]*?"concepts"[\s\S]*?\})\s*```/g;
    let match;
    let blockCount = 0;

    // Fast path: Try parsing entire content as JSON object with concepts
    try {
        // Remove BOM (Byte Order Mark) if present
        let cleanContent = content.replace(/^\uFEFF/, '');

        // Remove control characters EXCEPT valid whitespace (newline, carriage return, tab)
        // eslint-disable-next-line no-control-regex
        cleanContent = cleanContent.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');

        // AGGRESSIVE CLEANUP: Remove common non-JSON headers that LLMs leak
        cleanContent = cleanContent.replace(/^[#\s]*VISUAL MASTER HIERARCHICAL CHART.*$/gmi, '');
        cleanContent = cleanContent.replace(/^={3,}.*$/gm, '');
        cleanContent = cleanContent.replace(/^Content-Type:.*$/gm, '');

        // Locate the FIRST opening brace that is part of a valid object structure
        const firstBrace = cleanContent.indexOf('{');
        if (firstBrace !== -1) {
            const possibleJson = cleanContent.substring(firstBrace).trim();
            // Simple check if it ends with } or is large enough
            if (possibleJson.length > 20) {
                const directParse = JSON.parse(possibleJson);
                if (directParse && directParse.concepts && Array.isArray(directParse.concepts)) {
                    for (const concept of directParse.concepts) {
                        const parsedConcept = convertJsonConcept(concept);
                        if (parsedConcept && !seenIds.has(parsedConcept.id)) {
                            seenIds.add(parsedConcept.id);
                            concepts.push(parsedConcept);
                        }
                    }
                    if (concepts.length > 0) return concepts;
                }
            }
        }
    } catch {
        // Not a single valid JSON object, continue to block searching
    }

    while ((match = jsonBlockRegex.exec(content)) !== null) {
        blockCount++;
        try {
            // Unescape the JSON content
            let jsonStr = match[1];

            // ROBUST EXTRACTION: Find the actual JSON object bounds
            // The AI often leaks headers like "VISUAL MASTERY" inside the ```json block
            const firstOpenBrace = jsonStr.indexOf('{');
            const lastCloseBrace = jsonStr.lastIndexOf('}');

            if (firstOpenBrace !== -1 && lastCloseBrace !== -1 && lastCloseBrace > firstOpenBrace) {
                // Extract just the JSON part
                jsonStr = jsonStr.substring(firstOpenBrace, lastCloseBrace + 1);
            }

            // Remove any potential header text that might have been included before the brace
            // (Though the substring above handles most of it)

            // Remove any trailing commas in arrays/objects (common LLM error)
            jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

            // Sanitize control characters that aren't valid in JSON strings
            // eslint-disable-next-line no-control-regex
            jsonStr = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, (char) => {
                // Preserve actual newlines and tabs for re-escaping
                if (char === '\n') return '\\n';
                if (char === '\r') return '\\r';
                if (char === '\t') return '\\t';
                return '';
            });

            // Fix unescaped quotes inside strings (common LLM error)
            // This attempts to fix quotes that appear within string values
            jsonStr = jsonStr.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (_match, content) => {
                // Re-escape any unescaped quotes that might have slipped through
                const fixed = content.replace(/(?<!\\)"/g, '\\"');
                return `"${fixed}"`;
            });

            // Handle truncated JSON by attempting to close open brackets
            let openBraces = 0;
            let openBrackets = 0;
            for (const char of jsonStr) {
                if (char === '{') openBraces++;
                if (char === '}') openBraces--;
                if (char === '[') openBrackets++;
                if (char === ']') openBrackets--;
            }

            // If truncated, try to complete it
            if (openBrackets > 0 || openBraces > 0) {
                // Add closing brackets/braces
                jsonStr += ']'.repeat(openBrackets) + '}'.repeat(openBraces);
            }

            const parsed = JSON.parse(jsonStr);
            if (parsed && parsed.concepts && Array.isArray(parsed.concepts)) {
                for (const concept of parsed.concepts) {
                    const parsedConcept = convertJsonConcept(concept);
                    // Deduplicate by ID to handle merged content
                    if (parsedConcept && !seenIds.has(parsedConcept.id)) {
                        seenIds.add(parsedConcept.id);
                        concepts.push(parsedConcept);
                    }
                }
            }
        } catch (e) {
            console.warn(`[ContentParser] Failed to parse JSON block ${blockCount}`, e);
            // Continue to next block
        }
    }

    // Extraction complete


    // Fallback: Try to find raw JSON object start if no blocks found
    if (concepts.length === 0) {
        // Look for { "concepts": [ ...
        const rawJsonStart = content.search(/\{\s*"concepts"\s*:\s*\[/);
        if (rawJsonStart !== -1) {
            try {
                // Try to extract just the concepts object
                // We'll count braces to find the end
                let braceCount = 0;
                let inString = false;
                let escape = false;
                let endIndex = -1;

                for (let i = rawJsonStart; i < content.length; i++) {
                    const char = content[i];

                    if (escape) {
                        escape = false;
                        continue;
                    }

                    if (char === '\\') {
                        escape = true;
                        continue;
                    }

                    if (char === '"') {
                        inString = !inString;
                        continue;
                    }

                    if (!inString) {
                        if (char === '{') braceCount++;
                        if (char === '}') {
                            braceCount--;
                            if (braceCount === 0) {
                                endIndex = i + 1;
                                break;
                            }
                        }
                    }
                }

                if (endIndex !== -1) {
                    const jsonStr = content.substring(rawJsonStart, endIndex);
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.concepts && Array.isArray(parsed.concepts)) {
                        for (const concept of parsed.concepts) {
                            const parsedConcept = convertJsonConcept(concept);
                            if (parsedConcept) concepts.push(parsedConcept);
                        }
                    }
                }
            } catch {
                // Raw JSON extraction failed
            }
        }
    }

    // Alternative: Try to find concepts in escaped JSON format (when fullDocument is stringified)
    if (concepts.length === 0) {
        const escapedJsonRegex = /\\?"concepts\\?":\s*\[/g;
        if (escapedJsonRegex.test(content)) {
            return parseConceptsFromEscapedContent(content);
        }
    }

    // Final fallback: Parse markdown-style concept headers (## N. Concept Name or similar)
    if (concepts.length === 0) {
        return parseConceptsFromMarkdown(content);
    }

    return concepts;
}

/**
 * Parse concepts from markdown-style headers like:
 * ## 1. Example Concept Name
 */
function parseConceptsFromMarkdown(content: string): ParsedConcept[] {
    const concepts: ParsedConcept[] = [];

    // Find concept blocks using markdown headers: ## N. Concept Name
    const conceptHeaderRegex = /##\s*(?:(\d+)\.\s*)?([^\n]+)/g;
    const conceptMatches: Array<{ order: number; name: string; startIndex: number }> = [];

    let match;
    let fallbackOrder = 1;
    while ((match = conceptHeaderRegex.exec(content)) !== null) {
        const capturedName = match[2].trim();
        if (['deliverables', 'timeline', 'overview', 'summary'].includes(capturedName.toLowerCase())) {
            continue;
        }

        conceptMatches.push({
            order: match[1] ? parseInt(match[1], 10) : fallbackOrder++,
            name: capturedName,
            startIndex: match.index,
        });
    }

    // Parse each concept block
    for (let i = 0; i < conceptMatches.length; i++) {
        const current = conceptMatches[i];
        const next = conceptMatches[i + 1];

        // Extract block content
        const blockEnd = next ? next.startIndex : content.length;
        const blockContent = content.substring(current.startIndex, blockEnd);

        // --- EXTRACT LIFECYCLE PHASES (V4 PROMPT) ---
        // Support both old "PREPARE:" and new "[LIFECYCLE_PHASE_1]" markers
        const p1Regex = /(?:\[LIFECYCLE_PHASE_1\]|[-─]\s*PREPARE:)\s*([\s\S]*?)(?=\[LIFECYCLE_PHASE_2\]|[-─]\s*MODEL:|$)/i;
        const p2Regex = /(?:\[LIFECYCLE_PHASE_2\]|[-─]\s*MODEL:)\s*([\s\S]*?)(?=\[LIFECYCLE_PHASE_3\]|[-─]\s*DELIVER:|$)/i;
        const p3Regex = /(?:\[LIFECYCLE_PHASE_3\]|[-─]\s*DELIVER:)\s*([\s\S]*?)(?=\n##|\n```|⚠️|$)/i;

        const p1Match = blockContent.match(p1Regex);
        const p2Match = blockContent.match(p2Regex);
        const p3Match = blockContent.match(p3Regex);

        const p1Text = p1Match?.[1] || '';
        const p2Text = p2Match?.[1] || '';
        const p3Text = p3Match?.[1] || '';

        // --- EXTRACT PHASE 1 FIELDS ---
        // explicit extraction of Hook Sentence
        const hookMatch = p1Text.match(/\*\*Hook Sentence\*\*:\s*([^\n]+)/i);
        const metaphorMatch = p1Text.match(/\*\*Micro-Metaphor\*\*:\s*([^\n]+)/i);
        const prereqMatch = p1Text.match(/(?:\*\*Prerequisite\*\*|Prerequisite):\s*([^\n]+)/i);
        const executionMatch = p1Text.match(/(?:\*\*Execution\*\*|Execution):\s*([^\n]+)/i);

        // --- EXTRACT PHASE 2 FIELDS ---
        const criticalDistinctions: string[] = [];
        const designBoundaries: string[] = [];
        const examFocus: string[] = [];

        // Regex for bolded markers
        const cdRegex = /\*\*\[Critical Distinction\]:\*\*\s*([^\n]+)/gi;
        const dbRegex = /\*\*\[Design Boundary\]:\*\*\s*([^\n]+)/gi;
        const efRegex = /\*\*\[Exam Focus\]:\*\*\s*([^\n]+)/gi;
        const pcRegex = /\*\*\[Prerequisite Check\]:\*\*\s*([^\n]+)/gi;

        let m;
        while ((m = cdRegex.exec(p2Text)) !== null) criticalDistinctions.push(m[1].trim());
        while ((m = dbRegex.exec(p2Text)) !== null) designBoundaries.push(m[1].trim());
        while ((m = efRegex.exec(p2Text)) !== null) examFocus.push(m[1].trim());
        while ((m = pcRegex.exec(p2Text)) !== null) designBoundaries.push(m[1].trim()); // Treat prereq checks as boundaries

        // --- EXTRACT SHAPE SECTIONS (V4 PROMPT) ---
        const shapeSimple = blockContent.match(/\*\*S - SIMPLE CORE\*\*\s*(?:\([^)]+\)\s*)?\n([^\n]+)/i);
        const shapeHighStakes = blockContent.match(/\*\*H - HIGH-STAKES EXAMPLE\*\*\s*(?:\([^)]+\)\s*)?\n([\s\S]*?)(?=\n\*\*A -|\n\*\*P -|$)/i);
        const shapeAnalogy = blockContent.match(/\*\*A - ANALOGICAL MODEL\*\*\s*(?:\([^)]+\)\s*)?\n([\s\S]*?)(?=\n\*\*P -|\n\*\*E -|$)/i);
        const shapePattern = blockContent.match(/\*\*P - PATTERN RECOGNITION\*\*\s*(?:\([^)]+\)\s*)?\n([\s\S]*?)(?=\n\*\*E -|$)/i);
        const shapeElimination = blockContent.match(/\*\*E - ELIMINATION LOGIC\*\*\s*(?:\([^)]+\)\s*)?\n([^\n]+)/i);

        const concept: ParsedConcept = {
            id: slugifyName(current.name),
            name: current.name,
            order: current.order,
            stageId: determineStageId(current.order),

            // Phase 1
            phase1: {
                // Prefer explicit Hook Sentence, fall back to first line of P1 if missing (but try to be smart)
                hookSentence: hookMatch?.[1]?.trim() || extractFirstSentence(p1Text),
                microMetaphor: metaphorMatch?.[1]?.trim() || '',
                prerequisite: prereqMatch?.[1]?.trim() || '',
                selection: [],
                execution: executionMatch?.[1]?.trim() || '',
            },

            // Phase 2
            phase2: [], // Deprecated in V4, using specific arrays below
            criticalDistinctions,
            designBoundaries,
            examFocus,

            // Phase 3
            phase3: {
                tool: p3Text.match(/Tool:\s*([^\n]+)/i)?.[1]?.trim() || '',
                metrics: p3Text.match(/Metric:\s*([^\n]+)/i)?.[1]?.trim() ? [p3Text.match(/Metric:\s*([^\n]+)/i)![1].trim()] : [],
                thresholds: p3Text.match(/Thresholds?:\s*([^\n]+)/i)?.[1]?.trim() || '',
            },

            // SHAPE
            shape: {
                simpleCore: shapeSimple?.[1]?.trim() || '',
                highStakesExample: shapeHighStakes?.[1]?.trim() || '',
                analogicalModel: shapeAnalogy?.[1]?.trim() || '',
                patternRecognition: {
                    question: shapePattern?.[1]?.split('Answer:')?.[0]?.replace('Question:', '')?.trim() || '',
                    answer: shapePattern?.[1]?.split('Answer:')?.[1]?.trim() || ''
                },
                eliminationLogic: shapeElimination?.[1]?.trim() || '',
            },

            // Root Fields for UI
            whyYouNeed: shapeSimple?.[1]?.trim() || hookMatch?.[1]?.trim() || '', // Simple Core is the best "Why"
            technicalDetails: p2Text.substring(0, 300).trim(), // Phase 2 is technical details

            mnemonic: {
                tier: determineTier(current.order, current.name),
                anchor: `${current.name}`,
                // Fallback story if JSON extraction fails (will be overwritten if JSON is found)
                story: criticalDistinctions[0] || designBoundaries[0] || '',
            },
        };

        concepts.push(concept);
    }

    // --- ENHANCE WITH JSON MNEMONICS ---
    // The prompt generates a separate JSON block for mnemonics. We must find and merge it.
    try {
        const jsonBlockRegex = /```json\s*(\[\s*\{[\s\S]*?\}\s*\])\s*```/g;
        // Also look for object wrapper { "mnemonics": [...] }
        const jsonObjectRegex = /```json\s*(\{[\s\S]*?\})\s*```/g;

        // Helper to process JSON data
        const processMnemonicData = (data: unknown[]) => {
            if (!Array.isArray(data)) return;

            data.forEach((item: unknown) => {
                // Check if item IS the mnemonic object or CONTAINs it
                const mItem = item as {
                    mnemonic?: { anchor?: string; story?: string; tier?: string };
                    anchor?: string;
                    story?: string;
                    name?: string;
                    conceptName?: string;
                    parentConcept?: string;
                    parentName?: string;
                    tier?: string;
                };
                const mnemonicData = mItem.mnemonic || mItem;
                const anchor = mnemonicData.anchor || mItem.anchor;
                const story = mnemonicData.story || mItem.story;

                if (!anchor && !story) return;

                // Fuzzy match name
                const concept = concepts.find(c =>
                    c.name.toLowerCase().includes((mItem.name || mItem.conceptName || '').toLowerCase()) ||
                    (mItem.name && c.name.toLowerCase().includes(mItem.name.toLowerCase()))
                );

                if (concept) {
                    // Safe access to current mnemonic state
                    const curTier = concept.mnemonic?.tier;
                    const curAnchor = concept.mnemonic?.anchor || '';
                    const curStory = concept.mnemonic?.story || '';

                    concept.mnemonic = {
                        tier: (mItem.tier as 'foundation' | 'keystone' | 'utility') || curTier,
                        anchor: anchor || curAnchor,
                        story: story || curStory,
                        parentName: mItem.parentConcept || mItem.parentName || undefined,
                    };
                }
            });
        };

        let m;
        while ((m = jsonBlockRegex.exec(content)) !== null) {
            try { processMnemonicData(JSON.parse(m[1])); } catch (_e) { /* Parse failures expected for non-mnemonic blocks */ }
        }

        while ((m = jsonObjectRegex.exec(content)) !== null) {
            try {
                const obj = JSON.parse(m[1]);
                if (obj.mnemonics) processMnemonicData(obj.mnemonics);
                // Some prompts output { "mnemonic": ... } per concept, but usually it's a list
            } catch (_e) { /* Parse failures expected for non-mnemonic blocks */ }
        }

    } catch (e) {
        console.warn('Failed to merge mnemonic JSON', e);
    }

    return concepts;
}

/**
 * Create a URL-safe slug from a concept name
 */
function slugifyName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Extract the first meaningful sentence from a block of text
 */
function extractFirstSentence(text: string): string {
    // Clean up the text
    const cleaned = text
        .replace(/•\s*/g, '')
        .replace(/○\s*/g, '')
        .replace(/-\s*/g, '')
        .replace(/\*\*/g, '')
        .trim();

    // Get first sentence
    const match = cleaned.match(/^([^.!?]+[.!?])/);
    return match ? match[1].trim() : cleaned.slice(0, 200);
}

/**
 * Determine tier based on concept order and name
 * Returns lowercase tier values: 'foundation', 'keystone', 'utility'
 */
function determineTier(order: number, _name: string): 'foundation' | 'keystone' | 'utility' {
    // SILVER BULLET SCALING LOGIC (Parser Version):
    // When parsing stream/markdown, we might not know the total count yet.
    // We use a safe "Growth" heuristic assuming a standard ~30-50 concept curriculum.

    // 1. Foundation: First 5 concepts are almost always setup/definitions
    if (order <= 5) return 'foundation';

    // 2. Keystone: The core body of knowledge (next ~20-25 concepts)
    if (order <= 30) return 'keystone';

    // 3. Utility: Everything else is application/advanced
    return 'utility';
}


function parseConceptsFromEscapedContent(content: string): ParsedConcept[] {
    const concepts: ParsedConcept[] = [];

    // Extract individual concept blocks using regex pattern matching
    const conceptBlockRegex = /\\"order\\":\s*(\d+),[\s\S]*?\\"name\\":\s*\\"([^"\\]+)\\"/g;
    const orderNamePairs: { order: number; name: string }[] = [];

    let match;
    while ((match = conceptBlockRegex.exec(content)) !== null) {
        orderNamePairs.push({
            order: parseInt(match[1], 10),
            name: match[2]
        });
    }

    // Create basic concepts from detected name/order pairs
    for (const pair of orderNamePairs) {
        const concept = createDefaultParsedConcept(pair.order, pair.name, content);
        concepts.push(concept);
    }

    return concepts;
}

function createDefaultParsedConcept(order: number, name: string, content: string): ParsedConcept {
    const mnemonic = extractMnemonic(content, name);

    return {
        id: `concept-${order}`,
        name,
        order,
        stageId: determineStageId(order),
        phase1: {
            hookSentence: extractConceptField(content, name, 'hookSentence') || `Understanding ${name}`,
            microMetaphor: extractConceptField(content, name, 'analogicalModel') || '',
            prerequisite: extractConceptField(content, name, 'prerequisite') || '',
            selection: [],
            execution: extractConceptField(content, name, 'execution') || '',
        },
        phase2: [],
        phase3: {
            tool: '',
            metrics: [],
            thresholds: '',
        },
        shape: {
            simpleCore: extractConceptField(content, name, 'simpleCore') || '',
            highStakesExample: extractConceptField(content, name, 'highStakesExample') || '',
            analogicalModel: extractConceptField(content, name, 'analogicalModel') || '',
            patternRecognition: { question: '', answer: '' },
            eliminationLogic: '',
        },
        mnemonic,
        criticalDistinctions: [],
        designBoundaries: [],
        examFocus: [],
    };
}

function extractConceptField(content: string, conceptName: string, fieldName: string): string {
    // Look for the field near the concept name
    const escapedName = conceptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\"${escapedName}\\"[\\s\\S]{0,2000}\\"${fieldName}\\":\\s*\\"([^"]{0,500})`, 'i');
    const match = content.match(pattern);
    return match?.[1]?.replace(/\\n/g, ' ').replace(/\\"/g, '"') || '';
}

function extractMnemonic(content: string, conceptName: string): ParsedMnemonic | undefined {
    const escapedName = conceptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mnemonicPattern = new RegExp(`\\"${escapedName}\\"[\\s\\S]{0,3000}\\"mnemonic\\":\\s*\\{([^}]+)\\}`, 'i');
    const match = content.match(mnemonicPattern);

    if (!match) return undefined;

    const tierMatch = match[1].match(/\\"tier\\":\s*\\"([^"]+)\\"/);
    const anchorMatch = match[1].match(/\\"anchor\\":\s*\\"([^"]+)\\"/);
    const storyMatch = match[1].match(/\\"story\\":\s*\\"([^"]{0,500})/);
    const imageMatch = match[1].match(/\\"imageUrl\\":\s*\\"([^"]+)\\"/);

    return {
        tier: (tierMatch?.[1]?.toLowerCase() as 'foundation' | 'keystone' | 'utility') || 'foundation',
        anchor: anchorMatch?.[1]?.replace(/\\"/g, '"') || '',
        story: storyMatch?.[1]?.replace(/\\"/g, '"') || '',
        imageUrl: imageMatch?.[1]?.replace(/\\"/g, '"'),
    };
}

function determineStageId(order: number): string {
    // Dynamic stage assignment based on order
    // Assuming ~10-15 concepts per stage
    const stageNum = Math.ceil(order / 12);
    return `stage-${Math.min(stageNum, 6)}`;
}

/**
 * SILVER BULLET: Extract semantic connections from AI-generated concept JSON.
 * 
 * This function handles both naming conventions:
 * - `strictConnections` (frontend surgical prompt)
 * - `connections` (Lambda batch prompt)
 * 
 * It normalizes the output to the ParsedConcept.strictConnections format.
 */
function extractStrictConnections(
    c: Record<string, unknown>
): Array<{ target: string; type: 'requires' | 'extends' | 'enables' | 'contains' | 'related-to' }> | undefined {
    const connections: Array<{ target: string; type: 'requires' | 'extends' | 'enables' | 'contains' | 'related-to' }> = [];
    
    // Priority 1: strictConnections (frontend prompt format)
    if (Array.isArray(c.strictConnections)) {
        for (const conn of c.strictConnections) {
            if (typeof conn === 'object' && conn && typeof (conn as Record<string, unknown>).target === 'string') {
                const connObj = conn as Record<string, unknown>;
                const type = normalizeConnectionType(connObj.type as string);
                connections.push({
                    target: connObj.target as string,
                    type,
                });
            }
        }
    }
    
    // Priority 2: connections (Lambda prompt format)
    if (connections.length === 0 && Array.isArray(c.connections)) {
        for (const conn of c.connections) {
            if (typeof conn === 'object' && conn && typeof (conn as Record<string, unknown>).target === 'string') {
                const connObj = conn as Record<string, unknown>;
                const type = normalizeConnectionType(connObj.type as string);
                connections.push({
                    target: connObj.target as string,
                    type,
                });
            }
        }
    }
    
    return connections.length > 0 ? connections : undefined;
}

/**
 * Normalize connection type to one of the valid semantic types.
 * Prevents generic/invalid types from slipping through.
 */
function normalizeConnectionType(type: string | undefined): 'requires' | 'extends' | 'enables' | 'contains' | 'related-to' {
    if (!type) return 'related-to';
    
    const t = type.toLowerCase().trim();
    
    // Exact matches
    if (t === 'requires' || t === 'prerequisite' || t === 'depends-on' || t === 'depends_on') return 'requires';
    if (t === 'extends' || t === 'enhances' || t === 'specializes') return 'extends';
    if (t === 'enables' || t === 'provides' || t === 'powers') return 'enables';
    if (t === 'contains' || t === 'includes' || t === 'comprises') return 'contains';
    
    // Fallback - but log a warning for investigation
    if (t !== 'related-to' && t !== 'relates-to' && t !== 'relates to') {
        console.warn(`[ConnectionParser] Unknown connection type "${type}" normalized to "related-to"`);
    }
    
    return 'related-to';
}

function convertJsonConcept(concept: Record<string, unknown>): ParsedConcept | null {
    if (!concept || typeof concept !== 'object') return null;

    const c = concept;
    const order = typeof c.order === 'number' ? c.order : 1;
    const name = typeof c.name === 'string' ? c.name : 'Unknown Concept';

    // Extract lifecycle phases - check BOTH lifecycle.phase1 AND root-level phase1
    let hookSentence = '';
    let microMetaphor = '';
    let prerequisite = '';
    let execution = '';
    let selection: string[] = [];
    let phase2: string[] = [];
    let tool = '';
    let metrics: string[] = [];
    let thresholds = '';

    // NEW: Extract root-level fields that UI needs (whyYouNeed, technicalDetails)
    const whyYouNeed = typeof c.whyYouNeed === 'string' ? c.whyYouNeed : '';
    const technicalDetails = typeof c.technicalDetails === 'string' ? c.technicalDetails : '';
    const tierJustification = typeof c.tierJustification === 'string' ? c.tierJustification : '';
    const workedExample = c.workedExample && typeof c.workedExample === 'object' ? c.workedExample : undefined;
    const keyPoints = Array.isArray(c.keyPoints) ? c.keyPoints as string[] : [];

    // Phase 2: Extract cognitive classification
    let cognitiveLevel: ParsedConcept['cognitiveLevel'] | undefined;
    if (typeof c.cognitiveLevel === 'string') {
        const level = c.cognitiveLevel.toLowerCase();
        if (['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'].includes(level)) {
            cognitiveLevel = level as ParsedConcept['cognitiveLevel'];
        }
    }
    const commonPitfalls = Array.isArray(c.commonPitfalls) ? c.commonPitfalls as string[] : [];


    // Check for lifecycle wrapper first (legacy format)
    if (c.lifecycle && typeof c.lifecycle === 'object') {
        const lifecycle = c.lifecycle as Record<string, unknown>;

        if (lifecycle.phase1 && typeof lifecycle.phase1 === 'object') {
            const p1 = lifecycle.phase1 as Record<string, unknown>;
            hookSentence = typeof p1.hookSentence === 'string' ? p1.hookSentence : '';
            microMetaphor = typeof p1.microMetaphor === 'string' ? p1.microMetaphor : '';
            prerequisite = typeof p1.prerequisite === 'string' ? p1.prerequisite : '';
            execution = typeof p1.execution === 'string' ? p1.execution : '';
            selection = Array.isArray(p1.selection) ? p1.selection as string[] : [];
        }

        if (Array.isArray(lifecycle.phase2)) {
            phase2 = lifecycle.phase2 as string[];
        }

        if (lifecycle.phase3 && typeof lifecycle.phase3 === 'object') {
            const p3 = lifecycle.phase3 as Record<string, unknown>;
            tool = typeof p3.tool === 'string' ? p3.tool : '';
            metrics = Array.isArray(p3.metrics) ? p3.metrics as string[] : [];
            thresholds = typeof p3.thresholds === 'string' ? p3.thresholds : '';
        }
    }

    // ALSO check root-level phase1/2/3 (new prompt format puts them at root)
    if (c.phase1 && typeof c.phase1 === 'object') {
        const p1 = c.phase1 as Record<string, unknown>;
        if (!hookSentence) hookSentence = typeof p1.hookSentence === 'string' ? p1.hookSentence : '';
        if (!microMetaphor) microMetaphor = typeof p1.microMetaphor === 'string' ? p1.microMetaphor : '';
        if (!prerequisite) prerequisite = typeof p1.prerequisite === 'string' ? p1.prerequisite : '';
        if (!execution) execution = typeof p1.execution === 'string' ? p1.execution : '';
        if (selection.length === 0) selection = Array.isArray(p1.selection) ? p1.selection as string[] : [];
    }

    if (phase2.length === 0 && Array.isArray(c.phase2)) {
        phase2 = (c.phase2 as Array<{ title?: string; content?: string } | string>).map(item => {
            if (typeof item === 'string') return item;
            if (typeof item === 'object' && item.content) return item.content;
            return '';
        }).filter(Boolean);
    }

    if (!tool && c.phase3 && typeof c.phase3 === 'object') {
        const p3 = c.phase3 as Record<string, unknown>;
        tool = typeof p3.tool === 'string' ? p3.tool : '';
        if (metrics.length === 0) metrics = Array.isArray(p3.metrics) ? p3.metrics as string[] : [];
        if (!thresholds) thresholds = typeof p3.thresholds === 'string' ? p3.thresholds : '';
    }

    // Extract SHAPE data
    let shape: ParsedConcept['shape'];
    if (c.shape && typeof c.shape === 'object') {
        const s = c.shape as Record<string, unknown>;
        shape = {
            simpleCore: typeof s.simpleCore === 'string' ? s.simpleCore : '',
            highStakesExample: typeof s.highStakesExample === 'string' ? s.highStakesExample : '',
            analogicalModel: typeof s.analogicalModel === 'string' ? s.analogicalModel : '',
            patternRecognition: s.patternRecognition as { question: string; answer: string } || { question: '', answer: '' },
            eliminationLogic: typeof s.eliminationLogic === 'string' ? s.eliminationLogic : '',
        };
    }

    // Extract mnemonic
    // Extract mnemonic and Tier (checking root level first for Sensa v2.0 compliance)
    let tier: 'foundation' | 'keystone' | 'utility' | undefined;

    // Check root level tier (preferred in new prompt)
    if (typeof c.tier === 'string') {
        const t = c.tier.toLowerCase();
        if (t === 'foundation') tier = 'foundation';
        else if (t === 'keystone') tier = 'keystone';
        else if (t === 'utility') tier = 'utility';
    }

    let mnemonic: ParsedMnemonic | undefined;
    if (c.mnemonic && typeof c.mnemonic === 'object') {
        const m = c.mnemonic as Record<string, unknown>;

        // If not found at root, check inside mnemonic
        if (!tier && typeof m.tier === 'string') {
            const t = m.tier.toLowerCase();
            if (t === 'foundation') tier = 'foundation';
            else if (t === 'keystone') tier = 'keystone';
            else if (t === 'utility') tier = 'utility';
        }

        mnemonic = {
            tier: tier || 'foundation', // Default to foundation if still missing
            anchor: typeof m.anchor === 'string' ? m.anchor : '',
            story: typeof m.story === 'string' ? m.story : '',
            parentName: typeof m.parentConcept === 'string' ? m.parentConcept : undefined,
        };
    } else if (tier) {
        // If mnemonic object missing but tier exists at root, create minimal mnemonic
        mnemonic = {
            tier: tier,
            anchor: `${name}`,
            story: '',
        };
    }

    // Extract annotations
    let criticalDistinctions: string[] = [];
    let designBoundaries: string[] = [];
    let examFocus: string[] = [];

    if (c.annotations && typeof c.annotations === 'object') {
        const a = c.annotations as Record<string, unknown>;
        criticalDistinctions = Array.isArray(a.criticalDistinctions) ? a.criticalDistinctions as string[] : [];
        designBoundaries = Array.isArray(a.designBoundaries) ? a.designBoundaries as string[] : [];
        examFocus = Array.isArray(a.examFocus) ? a.examFocus as string[] : [];
    }

    return {
        id: `concept-${order}`,
        name,
        order,
        stageId: determineStageId(order),
        phase1: {
            hookSentence: hookSentence || (shape?.simpleCore || ''),
            microMetaphor,
            prerequisite,
            selection,
            execution,
            ...((c.lifecycle && typeof c.lifecycle === 'object' ? (c.lifecycle as Record<string, unknown>).phase1 as Record<string, unknown> : {}) || {}),
            ...((c.phase1 && typeof c.phase1 === 'object') ? c.phase1 as Record<string, unknown> : {})
        },
        phase2,
        phase3: {
            tool,
            metrics,
            thresholds,
        },
        shape,
        mnemonic,
        criticalDistinctions,
        designBoundaries,
        examFocus,
        // NEW: Root-level fields for UI consumption
        whyYouNeed,
        technicalDetails,
        tierJustification,
        workedExample: workedExample ? {
            problem: (workedExample as Record<string, unknown>).problem as string || '',
            solution: (workedExample as Record<string, unknown>).solution as string || '',
            steps: Array.isArray((workedExample as Record<string, unknown>).steps)
                ? (workedExample as Record<string, unknown>).steps as string[]
                : []
        } : undefined,
        keyPoints,
        // Phase 2 Cognitive Model
        cognitiveLevel,
        commonPitfalls,
        // NEW: Extract dependsOn from root level (Sensa v2.0 compliance)
        dependsOn: Array.isArray(c.dependsOn) ? c.dependsOn as string[] : [],
        // SILVER BULLET: Extract semantic connections from AI output
        // Priority: strictConnections (frontend prompt) > connections (Lambda prompt)
        strictConnections: extractStrictConnections(c),
        // Also store tier at root for transformer
        tier: tier,
    };
}

// ============================================================================
// LEARNING PATH PARSER
// ============================================================================

function parseLearningPath(concepts: ParsedConcept[]): ParsedLearningPath {
    // Group concepts by stage
    const stageMap = new Map<string, ParsedConcept[]>();

    for (const concept of concepts) {
        const stageId = concept.stageId;
        if (!stageMap.has(stageId)) {
            stageMap.set(stageId, []);
        }
        stageMap.get(stageId)!.push(concept);
    }

    // Define stage metadata (Generic fallback)
    const stageNames: Record<string, string> = {
        'stage-1': 'Foundation Concepts',
        'stage-2': 'Building Blocks',
        'stage-3': 'Structuring',
        'stage-4': 'Advanced Logic',
        'stage-5': 'Presentation',
        'stage-6': 'Administration & Optimization',
    };

    const stages: ParsedLearningPath['stages'] = [];

    for (const [stageId, stageConcepts] of stageMap) {
        const order = parseInt(stageId.replace('stage-', ''), 10);
        stages.push({
            order,
            name: stageNames[stageId] || `Stage ${order}`,
            concepts: stageConcepts.map(c => c.name),
            conceptsWithDifficulty: stageConcepts.map(c => ({
                name: c.name,
                difficulty: order <= 2 ? 'foundational' as const : order <= 4 ? 'intermediate' as const : 'advanced' as const,
            })),
            capabilitiesGained: `Master ${stageNames[stageId] || `Stage ${order}`} concepts`,
        });
    }

    // Sort by order
    stages.sort((a, b) => a.order - b.order);

    return { stages };
}

// ============================================================================
// MENTAL ANCHORS PARSER
// ============================================================================

function parseMentalAnchors(concepts: ParsedConcept[]): ParsedMentalAnchor[] {
    return concepts
        .filter(c => c.mnemonic?.anchor)
        .map(c => ({
            name: c.name,
            metaphor: c.mnemonic!.anchor,
            mappings: [{
                concept: c.name,
                metaphorElement: c.mnemonic!.anchor,
            }],
            whyItHelps: c.mnemonic!.story || 'Provides a memorable visual anchor for the concept',
        }));
}

export default parseContent;
