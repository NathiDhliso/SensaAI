/**
 * Build AI - Phase 2: Build the Web
 * 
 * Provides AI suggestions for concept map building:
 * - Connection suggestions between concepts
 * - Gap detection for missing connections
 * - Label validation for connection descriptions
 */

import type { LearningConcept } from '@/shared/types/learning';
import { getPersonaResponse, type PersonaId } from '../coach';

const GENERIC_STOP_WORDS = new Set([
    'the', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'by', 'as',
    'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'a', 'an', 'this', 'that', 'these', 'those',
    'it', 'its', 'from', 'into', 'onto',
    'concept', 'intro', 'introduction', 'summary', 'overview', 'basic', 'basics',
    'create', 'creating', 'update', 'updating', 'configure', 'configuring',
    'monitor', 'monitoring', 'optimize', 'optimizing',
    'define', 'defining', 'manage', 'management', 'analysis', 'analytics' // Common action verbs
]);

export interface ConnectionSuggestion {
    id: string;
    fromConceptId: string;
    toConceptId: string;
    suggestedLabel: string;
    confidence: number;
    reasoning: string;
}

export interface GapDetection {
    conceptId: string;
    conceptName: string;
    message: string;
    suggestedConnections: string[];
}

export interface LabelValidation {
    isValid: boolean;
    suggestion?: string;
    reasoning: string;
}

/**
 * Check if a concept has an AI-generated connection to another concept
 * Returns the connection type (requires, extends, enables, contains) or null
 */
function getAIConnection(conceptA: LearningConcept, conceptB: LearningConcept): { type: string; isReverse: boolean } | null {
    // Check if conceptA has a connection to conceptB
    if (conceptA.connections && Array.isArray(conceptA.connections)) {
        const match = conceptA.connections.find(
            (c: { target?: string; type?: string }) =>
                c.target && c.target.toLowerCase() === conceptB.name.toLowerCase()
        );
        if (match && match.type) {
            return { type: match.type, isReverse: false };
        }
    }

    // Check reverse: if conceptB has a connection to conceptA
    if (conceptB.connections && Array.isArray(conceptB.connections)) {
        const match = conceptB.connections.find(
            (c: { target?: string; type?: string }) =>
                c.target && c.target.toLowerCase() === conceptA.name.toLowerCase()
        );
        if (match && match.type) {
            return { type: match.type, isReverse: true };
        }
    }

    return null;
}

/**
 * Suggest connections between concepts based on their relationships
 * PRIORITY: AI-generated connections > Keyword matching
 */
export function suggestConnections(
    concepts: LearningConcept[],
    existingConnections: Array<{ fromId: string; toId: string }>,
    subjectName?: string
): ConnectionSuggestion[] {
    const suggestions: ConnectionSuggestion[] = [];
    const existingPairs = new Set(
        existingConnections.map(c => `${c.fromId}-${c.toId}`)
    );

    // Dynamic Stopwords: Flatten the subject name into tokens
    const subjectTokens = subjectName
        ? new Set(cleanTokens(subjectName, new Set()))
        : new Set<string>();

    // Merge generic words with subject-specific noise
    // e.g. if subject is "Subject Name", then 'subject' and 'name' become stopwords
    const effectiveStopWords = new Set([...GENERIC_STOP_WORDS, ...subjectTokens]);

    // Analyze each pair of concepts for potential connections
    for (let i = 0; i < concepts.length; i++) {
        for (let j = i + 1; j < concepts.length; j++) {
            const conceptA = concepts[i];
            const conceptB = concepts[j];

            // Skip if connection already exists
            const pairKey = `${conceptA.id}-${conceptB.id}`;
            const reversePairKey = `${conceptB.id}-${conceptA.id}`;
            if (existingPairs.has(pairKey) || existingPairs.has(reversePairKey)) {
                continue;
            }

            // PRIORITY 1: Check for AI-generated connections
            const aiConnection = getAIConnection(conceptA, conceptB);
            if (aiConnection) {
                // Use AI connection with high confidence
                suggestions.push({
                    id: `suggestion-${Date.now()}-${i}-${j}`,
                    fromConceptId: aiConnection.isReverse ? conceptB.id : conceptA.id,
                    toConceptId: aiConnection.isReverse ? conceptA.id : conceptB.id,
                    suggestedLabel: aiConnection.type,
                    confidence: 0.95, // High confidence for AI-generated connections
                    reasoning: `AI-generated: "${conceptA.name}" ${aiConnection.type} "${conceptB.name}"`,
                });
                continue;
            }

            // PRIORITY 2: Fall back to keyword matching
            const connection = findConnectionType(conceptA, conceptB, effectiveStopWords);

            // STRICTER THRESHOLD for keyword-based connections:
            // Generic 'relates to' requires >0.65 (approx 3 shared words)
            // Specific labels (uses, requires) require >0.55 (2 shared words)
            if (connection) {
                const isGeneric = connection.label === 'relates to';
                const threshold = isGeneric ? 0.65 : 0.55;

                if (connection.confidence >= threshold) {
                    suggestions.push({
                        id: `suggestion-${Date.now()}-${i}-${j}`,
                        fromConceptId: conceptA.id,
                        toConceptId: conceptB.id,
                        suggestedLabel: connection.label,
                        confidence: connection.confidence,
                        reasoning: connection.reasoning,
                    });
                }
            }
        }
    }

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Find connection type between two concepts
 */
function findConnectionType(
    conceptA: LearningConcept,
    conceptB: LearningConcept,
    stopWords: Set<string>
): { label: string; confidence: number; reasoning: string } | null {
    // Check if concepts share keywords
    const wordsA = extractKeywords(conceptA, stopWords);
    const wordsB = extractKeywords(conceptB, stopWords);

    const sharedWords = wordsA.filter(w => wordsB.includes(w));

    if (sharedWords.length === 0) {
        return null;
    }

    // Determine relationship type
    // Base confidence logic: 1 word = 0.5, 2 words = 0.7, 3+ words = 0.9
    const confidence = Math.min(0.9, 0.3 + (sharedWords.length * 0.2));

    // Common relationship patterns
    const patterns = [
        { keywords: ['use', 'uses', 'using'], label: 'uses', reasoning: 'Usage relationship detected' },
        { keywords: ['depend', 'requires', 'needs'], label: 'requires', reasoning: 'Dependency detected' },
        { keywords: ['part', 'component', 'contains'], label: 'is part of', reasoning: 'Composition detected' },
        { keywords: ['type', 'kind', 'variant'], label: 'is a type of', reasoning: 'Classification detected' },
        { keywords: ['result', 'leads', 'causes'], label: 'leads to', reasoning: 'Causal relationship detected' },
    ];

    for (const pattern of patterns) {
        if (sharedWords.some(w => pattern.keywords.includes(w.toLowerCase()))) {
            return { label: pattern.label, confidence: Math.max(confidence, 0.7), reasoning: pattern.reasoning };
        }
    }

    // Default generic connection
    // We penalize generic "relates to" if it's just 1 shared word
    if (sharedWords.length < 2) return null;

    return {
        label: 'relates to',
        confidence: confidence * 0.8, // 2 words (0.7) * 0.8 = 0.56. Filtered out by 0.65 threshold.
        reasoning: `Shared concepts: ${sharedWords.slice(0, 3).join(', ')}`,
    };
}

/**
 * Extract keywords from a concept
 */
function extractKeywords(concept: LearningConcept, stopWords: Set<string>): string[] {
    const words: string[] = [];

    // From name
    words.push(...cleanTokens(concept.name, stopWords));

    // From key points
    if (concept.keyPoints) {
        concept.keyPoints.forEach(point => {
            words.push(...cleanTokens(point, stopWords));
        });
    }

    return [...new Set(words)];
}

function cleanTokens(text: string, stopWords: Set<string>): string[] {
    return text.toLowerCase()
        .split(/[^a-z0-9]+/i) // Split by non-alphanumeric
        .filter(w => w.length > 2) // Filter very short words
        .filter(w => !stopWords.has(w));
}

/**
 * Detect concepts that might be missing connections
 */
/**
 * Detect concepts that might be missing connections
 */
export function detectGaps(
    concepts: LearningConcept[],
    nodesOnMap: string[],
    connections: Array<{ fromId: string; toId: string }>,
    subjectName?: string
): GapDetection[] {
    const gaps: GapDetection[] = [];

    // Dynamic Stopwords (consistency with suggestConnections)
    const subjectTokens = subjectName
        ? new Set(cleanTokens(subjectName, new Set()))
        : new Set<string>();
    const effectiveStopWords = new Set([...GENERIC_STOP_WORDS, ...subjectTokens]);

    // Check each node on the map
    for (const nodeId of nodesOnMap) {
        const concept = concepts.find(c => c.id === nodeId);
        if (!concept) continue;

        // Count connections for this node
        const connectionCount = connections.filter(
            c => c.fromId === nodeId || c.toId === nodeId
        ).length;

        // Flag if isolated (no connections) or orphaned (only 1 connection)
        if (connectionCount === 0) {
            gaps.push({
                conceptId: nodeId,
                conceptName: concept.name,
                message: `"${concept.name}" has no connections. How does it relate to other concepts?`,
                suggestedConnections: findPotentialConnections(concept, concepts, nodesOnMap, effectiveStopWords),
            });
        } else if (connectionCount === 1 && nodesOnMap.length > 3) {
            gaps.push({
                conceptId: nodeId,
                conceptName: concept.name,
                message: `"${concept.name}" only has one connection. Are there more relationships?`,
                suggestedConnections: findPotentialConnections(concept, concepts, nodesOnMap, effectiveStopWords),
            });
        }
    }

    return gaps;
}

/**
 * Find potential connections for a concept
 */
function findPotentialConnections(
    concept: LearningConcept,
    allConcepts: LearningConcept[],
    nodesOnMap: string[],
    stopWords: Set<string>
): string[] {
    const keywords = extractKeywords(concept, stopWords);
    const potentials: string[] = [];

    for (const other of allConcepts) {
        if (other.id === concept.id) continue;
        if (!nodesOnMap.includes(other.id)) continue;

        const otherKeywords = extractKeywords(other, stopWords);
        const shared = keywords.filter(k => otherKeywords.includes(k));

        // Stricter threshold for gap suggestions
        if (shared.length > 1) {
            potentials.push(other.name);
        }
    }

    return potentials.slice(0, 3);
}

/**
 * Validate a connection label
 */
export function validateConnectionLabel(
    label: string,
    _fromConcept: LearningConcept,
    _toConcept: LearningConcept
): LabelValidation {
    const labelLower = label.toLowerCase().trim();

    // Check for placeholder labels
    if (labelLower === '?' || labelLower === '' || labelLower === 'connects to') {
        return {
            isValid: false,
            suggestion: suggestLabel(),
            reasoning: 'Please describe HOW these concepts relate',
        };
    }

    // Check for vague labels
    const vagueLabels = ['relates to', 'connects', 'is related', 'link'];
    if (vagueLabels.includes(labelLower)) {
        return {
            isValid: false,
            suggestion: suggestLabel(),
            reasoning: 'Try to be more specific. What type of relationship?',
        };
    }

    return {
        isValid: true,
        reasoning: 'Good descriptive label',
    };
}

/**
 * Suggest a label for a connection
 */
function suggestLabel(): string {
    const suggestions = [
        'uses',
        'requires',
        'is part of',
        'leads to',
        'depends on',
        'enables',
        'implements',
    ];

    // Simple heuristic - could be replaced with AI inference
    return suggestions[Math.floor(Math.random() * suggestions.length)];
}

/**
 * Get coach message for building phase
 */
export function getBuildCoachMessage(
    personaId: PersonaId,
    situation: 'intro' | 'encouragement' | 'struggle' | 'success'
): string {
    return getPersonaResponse(personaId, 'build', situation);
}
