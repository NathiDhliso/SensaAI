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
    // Extract lifecycle phases from content
    const lifecycleMatch = content.match(/Lifecycle:\s*([A-Z]+)\s*→\s*([A-Z]+)\s*→\s*([A-Z]+)/i);

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
        domain: extractValue(content, 'Domain:') || 'General Domain',
        professionalRole: extractValue(content, 'Professional Role:') || 'Learner',
        lifecycle: {
            phase1: lifecycleMatch?.[1] || 'PREPARE',
            phase2: lifecycleMatch?.[2] || 'MODEL',
            phase3: lifecycleMatch?.[3] || 'DELIVER',
        },
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

    // Find JSON blocks containing concepts array
    const jsonBlockRegex = /```json\s*(\{[\s\S]*?"concepts"[\s\S]*?\})\s*```/g;
    let match;

    while ((match = jsonBlockRegex.exec(content)) !== null) {
        try {
            // Unescape the JSON content
            let jsonStr = match[1];

            // Remove any trailing commas in arrays/objects (common LLM error)
            jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

            // Sanitize control characters that aren't valid in JSON strings
            jsonStr = jsonStr.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

            const parsed = JSON.parse(jsonStr);
            if (parsed.concepts && Array.isArray(parsed.concepts)) {
                for (const concept of parsed.concepts) {
                    const parsedConcept = convertJsonConcept(concept);
                    if (parsedConcept) {
                        concepts.push(parsedConcept);
                    }
                }
            }
        } catch (e) {
            console.warn('[ContentParser] Failed to parse JSON block:', e);
        }
    }

    // Alternative: Try to find concepts in escaped JSON format (when fullDocument is stringified)
    if (concepts.length === 0) {
        const escapedJsonRegex = /\\?"concepts\\?":\s*\[/g;
        if (escapedJsonRegex.test(content)) {
            return parseConceptsFromEscapedContent(content);
        }
    }

    // Final fallback: Parse markdown-style concept headers (## N. Concept Name)
    if (concepts.length === 0) {
        return parseConceptsFromMarkdown(content);
    }

    return concepts;
}

/**
 * Parse concepts from markdown-style headers like:
 * ## 1. Power BI Service Workspace Management
 */
function parseConceptsFromMarkdown(content: string): ParsedConcept[] {
    const concepts: ParsedConcept[] = [];

    // Find concept blocks using markdown headers: ## N. Concept Name
    // The format is ## followed by a number, period, and concept name
    const conceptHeaderRegex = /##\s*(\d+)\.\s*([^\n]+)/g;
    const conceptMatches: Array<{ order: number; name: string; startIndex: number }> = [];

    let match;
    while ((match = conceptHeaderRegex.exec(content)) !== null) {
        conceptMatches.push({
            order: parseInt(match[1], 10),
            name: match[2].trim(),
            startIndex: match.index,
        });
    }

    // Parse each concept block
    for (let i = 0; i < conceptMatches.length; i++) {
        const current = conceptMatches[i];
        const next = conceptMatches[i + 1];

        // Extract block content between this header and the next
        const blockEnd = next ? next.startIndex : content.length;
        const blockContent = content.substring(current.startIndex, blockEnd);

        // Extract PREPARE section (phase1)
        const prepareMatch = blockContent.match(/[-─]\s*PREPARE:\s*([\s\S]*?)(?:\n•\s*MODEL:|\n[-─]\s*MODEL:|$)/i);
        const modelMatch = blockContent.match(/[•]\s*MODEL:\s*([\s\S]*?)(?:\n○\s*DELIVER:|\n[-─]\s*DELIVER:|$)/i);
        const deliverMatch = blockContent.match(/[○]\s*DELIVER:\s*([\s\S]*?)(?=\n##|\n```|$)/i);

        // Extract critical distinction
        const criticalMatch = blockContent.match(/\*\*\[Critical Distinction\]:\*\*\s*([^\n]+)/i);
        const designMatch = blockContent.match(/\*\*\[Design Boundary\]:\*\*\s*([^\n]+)/i);
        const examMatch = blockContent.match(/\*\*\[Exam Focus\]:\*\*\s*([^\n]+)/i);

        // Extract prerequisite if available
        const prereqMatch = prepareMatch?.[1]?.match(/Prerequisite:\s*([^\n]+)/i);
        const executionMatch = prepareMatch?.[1]?.match(/Execution:\s*([^\n]+(?:\n(?![•○-])[^\n]+)*)/i);

        // Extract tool and metrics from DELIVER section
        const toolMatch = deliverMatch?.[1]?.match(/Tool:\s*([^\n]+)/i);
        const metricMatch = deliverMatch?.[1]?.match(/Metric:\s*([^\n]+)/i);
        const validationMatch = deliverMatch?.[1]?.match(/Validation:\s*([^\n]+)/i);

        // Parse MODEL section for configuration items
        const phase2Items: string[] = [];
        if (modelMatch?.[1]) {
            const configLines = modelMatch[1].match(/\*\*([^*]+)\*\*:\s*([^\n]+)/g);
            if (configLines) {
                configLines.forEach(line => {
                    const cleaned = line.replace(/\*\*/g, '').trim();
                    if (cleaned.length > 0 && cleaned.length < 200) {
                        phase2Items.push(cleaned);
                    }
                });
            }
        }

        const concept: ParsedConcept = {
            id: slugifyName(current.name),
            name: current.name,
            order: current.order,
            stageId: determineStageId(current.order),
            phase1: {
                hookSentence: extractFirstSentence(prepareMatch?.[1] || ''),
                microMetaphor: '',
                prerequisite: prereqMatch?.[1]?.trim() || '',
                selection: [],
                execution: executionMatch?.[1]?.trim() || '',
            },
            phase2: phase2Items.slice(0, 10), // Limit to 10 items
            phase3: {
                tool: toolMatch?.[1]?.trim() || '',
                metrics: metricMatch ? [metricMatch[1].trim()] : [],
                thresholds: validationMatch?.[1]?.trim() || '',
            },
            shape: {
                simpleCore: extractFirstSentence(prepareMatch?.[1] || ''),
                highStakesExample: examMatch?.[1]?.trim() || '',
                analogicalModel: '',
                patternRecognition: { question: '', answer: '' },
                eliminationLogic: '',
            },
            mnemonic: {
                tier: determineTier(current.order, current.name) as 'Foundation' | 'Keystone' | 'Utility',
                anchor: `${current.name}`,
                story: criticalMatch?.[1]?.trim() || '',
            },
            criticalDistinctions: criticalMatch ? [criticalMatch[1].trim()] : [],
            designBoundaries: designMatch ? [designMatch[1].trim()] : [],
            examFocus: examMatch ? [examMatch[1].trim()] : [],
        };

        concepts.push(concept);
    }

    console.log(`[ContentParser] Parsed ${concepts.length} concepts from markdown format`);
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
 */
function determineTier(order: number, name: string): string {
    // Foundation concepts (first in each stage, or core infrastructure)
    const foundationKeywords = ['workspace', 'environment', 'schema', 'security', 'dashboard', 'apps'];
    const keystoneKeywords = ['query', 'relationship', 'dax', 'filter', 'refresh', 'gateway'];

    const nameLower = name.toLowerCase();

    for (const keyword of foundationKeywords) {
        if (nameLower.includes(keyword)) return 'Foundation';
    }

    for (const keyword of keystoneKeywords) {
        if (nameLower.includes(keyword)) return 'Keystone';
    }

    // Fallback based on order
    if (order <= 5 || order % 10 === 1) return 'Foundation';
    if (order <= 30) return 'Keystone';
    return 'Utility';
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

    return {
        tier: (tierMatch?.[1] as 'Foundation' | 'Keystone' | 'Utility') || 'Foundation',
        anchor: anchorMatch?.[1]?.replace(/\\"/g, '"') || '',
        story: storyMatch?.[1]?.replace(/\\"/g, '"') || '',
    };
}

function determineStageId(order: number): string {
    // Dynamic stage assignment based on order
    // Assuming ~10-15 concepts per stage
    const stageNum = Math.ceil(order / 12);
    return `stage-${Math.min(stageNum, 6)}`;
}

function convertJsonConcept(concept: Record<string, unknown>): ParsedConcept | null {
    if (!concept || typeof concept !== 'object') return null;

    const c = concept;
    const order = typeof c.order === 'number' ? c.order : 1;
    const name = typeof c.name === 'string' ? c.name : 'Unknown Concept';

    // Extract lifecycle phases
    let hookSentence = '';
    let microMetaphor = '';
    let prerequisite = '';
    let execution = '';
    let selection: string[] = [];
    let phase2: string[] = [];
    let tool = '';
    let metrics: string[] = [];
    let thresholds = '';

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
    let mnemonic: ParsedMnemonic | undefined;
    if (c.mnemonic && typeof c.mnemonic === 'object') {
        const m = c.mnemonic as Record<string, unknown>;
        mnemonic = {
            tier: (typeof m.tier === 'string' ? m.tier : 'Foundation') as 'Foundation' | 'Keystone' | 'Utility',
            anchor: typeof m.anchor === 'string' ? m.anchor : '',
            story: typeof m.story === 'string' ? m.story : '',
            parentName: typeof m.parentConcept === 'string' ? m.parentConcept : undefined,
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
            ...((c.lifecycle as any)?.phase1 || {})
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
