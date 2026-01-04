/**
 * PL-300 JSON File Parser
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

interface PL300JsonFile {
    id?: string;
    subject?: string;
    generatedAt?: string;
    fullDocument: string;
}

type ParseResult = {
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
 * Parse PL-300 JSON content
 * Handles the wrapper format with fullDocument field
 */
export function parsePL300Content(rawContent: string): ParseResult {
    try {
        // Try to parse as JSON wrapper first
        let content = rawContent;

        try {
            const parsed = JSON.parse(rawContent) as PL300JsonFile;
            if (parsed.fullDocument) {
                content = parsed.fullDocument;
            }
        } catch {
            // Not a JSON wrapper, use raw content directly
        }

        // Parse domain analysis from content
        const domainAnalysis = parseDomainAnalysisPL300(content);

        // Parse concepts from JSON blocks
        const concepts = parseConceptsPL300(content);

        if (concepts.length === 0) {
            return {
                success: false,
                error: 'No concepts detected in PL-300 content'
            };
        }

        // Parse learning path
        const learningPath = parseLearningPathPL300(concepts);

        // Parse mental anchors from mnemonics
        const mentalAnchors = parseMentalAnchorsPL300(concepts);

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
            error: error instanceof Error ? error.message : 'Failed to parse PL-300 content'
        };
    }
}

// ============================================================================
// DOMAIN ANALYSIS PARSER
// ============================================================================

function parseDomainAnalysisPL300(content: string): ParsedDomainAnalysis {
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
        domain: extractValue(content, 'Domain:') || 'Business Intelligence & Data Analytics',
        professionalRole: extractValue(content, 'Professional Role:') || 'Power BI Data Analyst',
        lifecycle: {
            phase1: lifecycleMatch?.[1] || 'PREPARE',
            phase2: lifecycleMatch?.[2] || 'MODEL',
            phase3: lifecycleMatch?.[3] || 'DELIVER',
        },
        sourceVerification: 'Microsoft Learn PL-300 Documentation',
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

function parseConceptsPL300(content: string): ParsedConcept[] {
    const concepts: ParsedConcept[] = [];

    // Find JSON blocks containing concepts array
    const jsonBlockRegex = /```json\s*(\{[\s\S]*?"concepts"[\s\S]*?\})\s*```/g;
    let match;

    while ((match = jsonBlockRegex.exec(content)) !== null) {
        try {
            // Unescape the JSON content
            let jsonStr = match[1];
            jsonStr = jsonStr.replace(/\\\\/g, '\\')
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r')
                .replace(/\\"/g, '"')
                .replace(/\\t/g, '\t');

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
            console.warn('[PL300Parser] Failed to parse JSON block:', e);
        }
    }

    // Alternative: Try to find concepts in escaped JSON format (when fullDocument is stringified)
    if (concepts.length === 0) {
        const escapedJsonRegex = /\\?"concepts\\?":\s*\[/g;
        if (escapedJsonRegex.test(content)) {
            return parseConceptsFromEscapedContent(content);
        }
    }

    return concepts;
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
    if (order <= 10) return 'stage-1';
    if (order <= 20) return 'stage-2';
    if (order <= 30) return 'stage-3';
    if (order <= 40) return 'stage-4';
    if (order <= 50) return 'stage-5';
    return 'stage-6';
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

function parseLearningPathPL300(concepts: ParsedConcept[]): ParsedLearningPath {
    // Group concepts by stage
    const stageMap = new Map<string, ParsedConcept[]>();

    for (const concept of concepts) {
        const stageId = concept.stageId;
        if (!stageMap.has(stageId)) {
            stageMap.set(stageId, []);
        }
        stageMap.get(stageId)!.push(concept);
    }

    // Define stage metadata
    const stageNames: Record<string, string> = {
        'stage-1': 'Foundation Concepts',
        'stage-2': 'Data Preparation',
        'stage-3': 'Data Modeling',
        'stage-4': 'Advanced DAX',
        'stage-5': 'Visualization',
        'stage-6': 'Administration',
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

function parseMentalAnchorsPL300(concepts: ParsedConcept[]): ParsedMentalAnchor[] {
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

export default parsePL300Content;
