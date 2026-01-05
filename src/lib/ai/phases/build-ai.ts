/**
 * Build AI - Phase 2: Build the Web
 * 
 * Provides AI suggestions for concept map building:
 * - Connection suggestions between concepts
 * - Gap detection for missing connections
 * - Label validation for connection descriptions
 */

import type { LearningConcept } from '@/lib/types/learning';
import { getPersonaResponse, type PersonaId } from '../coach';

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
 * Suggest connections between concepts based on their relationships
 */
export function suggestConnections(
    concepts: LearningConcept[],
    existingConnections: Array<{ fromId: string; toId: string }>
): ConnectionSuggestion[] {
    const suggestions: ConnectionSuggestion[] = [];
    const existingPairs = new Set(
        existingConnections.map(c => `${c.fromId}-${c.toId}`)
    );

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

            // Check for keyword overlap
            const connection = findConnectionType(conceptA, conceptB);
            if (connection) {
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

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Find connection type between two concepts
 */
function findConnectionType(
    conceptA: LearningConcept,
    conceptB: LearningConcept
): { label: string; confidence: number; reasoning: string } | null {
    // Check if concepts share keywords
    const wordsA = extractKeywords(conceptA);
    const wordsB = extractKeywords(conceptB);

    const sharedWords = wordsA.filter(w => wordsB.includes(w));

    if (sharedWords.length === 0) {
        return null;
    }

    // Determine relationship type
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
            return { label: pattern.label, confidence, reasoning: pattern.reasoning };
        }
    }

    // Default generic connection
    return {
        label: 'relates to',
        confidence: confidence * 0.7,
        reasoning: `Shared concepts: ${sharedWords.slice(0, 3).join(', ')}`,
    };
}

/**
 * Extract keywords from a concept
 */
function extractKeywords(concept: LearningConcept): string[] {
    const words: string[] = [];

    // From name
    words.push(...concept.name.toLowerCase().split(/\s+/));

    // From key points
    if (concept.keyPoints) {
        concept.keyPoints.forEach(point => {
            words.push(...point.toLowerCase().split(/\s+/).filter(w => w.length > 3));
        });
    }

    return [...new Set(words)];
}

/**
 * Detect concepts that might be missing connections
 */
export function detectGaps(
    concepts: LearningConcept[],
    nodesOnMap: string[],
    connections: Array<{ fromId: string; toId: string }>
): GapDetection[] {
    const gaps: GapDetection[] = [];

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
                suggestedConnections: findPotentialConnections(concept, concepts, nodesOnMap),
            });
        } else if (connectionCount === 1 && nodesOnMap.length > 3) {
            gaps.push({
                conceptId: nodeId,
                conceptName: concept.name,
                message: `"${concept.name}" only has one connection. Are there more relationships?`,
                suggestedConnections: findPotentialConnections(concept, concepts, nodesOnMap),
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
    nodesOnMap: string[]
): string[] {
    const keywords = extractKeywords(concept);
    const potentials: string[] = [];

    for (const other of allConcepts) {
        if (other.id === concept.id) continue;
        if (!nodesOnMap.includes(other.id)) continue;

        const otherKeywords = extractKeywords(other);
        const shared = keywords.filter(k => otherKeywords.includes(k));

        if (shared.length > 0) {
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
    fromConcept: LearningConcept,
    toConcept: LearningConcept
): LabelValidation {
    const labelLower = label.toLowerCase().trim();

    // Check for placeholder labels
    if (labelLower === '?' || labelLower === '' || labelLower === 'connects to') {
        return {
            isValid: false,
            suggestion: suggestLabel(fromConcept, toConcept),
            reasoning: 'Please describe HOW these concepts relate',
        };
    }

    // Check for vague labels
    const vagueLabels = ['relates to', 'connects', 'is related', 'link'];
    if (vagueLabels.includes(labelLower)) {
        return {
            isValid: false,
            suggestion: suggestLabel(fromConcept, toConcept),
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
function suggestLabel(from: LearningConcept, to: LearningConcept): string {
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
