/**
 * SENSA v2.0 Tier Progression Validator
 * 
 * Validates that learner progression respects tier hierarchy and
 * calculates mastery using the Universal Learning Equation.
 * 
 * I = min(h, G × f(M(P(x))))
 */

import type { LearningConcept } from '@/lib/types/learning';
import type { TierType, TierDistribution } from '@/lib/types/sensa-flow.types';

// ============================================================================
// Configuration
// ============================================================================

export const TIER_CONFIG = {
    foundation: { color: '#6366f1', label: 'Foundation' }, // Indigo
    keystone: { color: '#f59e0b', label: 'Keystone' },     // Amber
    utility: { color: '#64748b', label: 'Utility' }        // Slate
} as const;

// ============================================================================
// Tier Access Control
// ============================================================================

/**
 * Validates that a learner can access a concept based on tier hierarchy.
 * Foundation concepts are always accessible.
 * Keystone requires all Foundation dependencies mastered.
 * Utility requires all Keystone dependencies mastered.
 */
export function canAccessConcept(
    concept: LearningConcept,
    masteredConceptIds: Set<string>,
    allConcepts: LearningConcept[]
): boolean {
    // Foundation concepts are always accessible
    if (concept.tier === 'foundation') {
        return true;
    }

    // Keystone requires all Foundation dependencies mastered
    if (concept.tier === 'keystone') {
        return concept.dependencies.every(depId => {
            const dep = allConcepts.find(c => c.id === depId);
            if (!dep) return false;

            // If dependency is Foundation, it must be mastered
            if (dep.tier === 'foundation') {
                return masteredConceptIds.has(depId);
            }

            // If dependency is also Keystone, it must be mastered
            return masteredConceptIds.has(depId);
        });
    }

    // Utility requires all Keystone/Utility dependencies mastered
    if (concept.tier === 'utility') {
        return concept.dependencies.every(depId => {
            const dep = allConcepts.find(c => c.id === depId);
            if (!dep) return false;

            return masteredConceptIds.has(depId);
        });
    }

    return false;
}

/**
 * Returns all concepts the learner can currently access.
 */
export function getAccessibleConcepts(
    concepts: LearningConcept[],
    masteredConceptIds: Set<string>
): LearningConcept[] {
    return concepts.filter(c => canAccessConcept(c, masteredConceptIds, concepts));
}

/**
 * Returns concepts grouped by tier with access status.
 */
export function getConceptsByTierWithAccess(
    concepts: LearningConcept[],
    masteredConceptIds: Set<string>
): Record<TierType, Array<{ concept: LearningConcept; accessible: boolean; mastered: boolean }>> {
    const result: Record<TierType, Array<{ concept: LearningConcept; accessible: boolean; mastered: boolean }>> = {
        foundation: [],
        keystone: [],
        utility: [],
    };

    for (const concept of concepts) {
        result[concept.tier].push({
            concept,
            accessible: canAccessConcept(concept, masteredConceptIds, concepts),
            mastered: masteredConceptIds.has(concept.id),
        });
    }

    return result;
}

// ============================================================================
// Tier Ceiling Calculation
// ============================================================================

/**
 * Calculates maximum achievable I based on tier mastery.
 * I is capped by the weakest tier percentage.
 * 
 * Example: If Foundation=100%, Keystone=50%, Utility=0%, 
 * the ceiling is 0 because Utility blocks progress.
 */
export function calculateTierCeiling(
    concepts: LearningConcept[],
    masteredConceptIds: Set<string>
): number {
    const tierProgress: Record<TierType, number> = {
        foundation: 0,
        keystone: 0,
        utility: 0,
    };

    const tierCounts: Record<TierType, number> = {
        foundation: 0,
        keystone: 0,
        utility: 0,
    };

    for (const concept of concepts) {
        tierCounts[concept.tier]++;
        if (masteredConceptIds.has(concept.id)) {
            tierProgress[concept.tier]++;
        }
    }

    const foundationPct = tierCounts.foundation > 0
        ? tierProgress.foundation / tierCounts.foundation
        : 0;
    const keystonePct = tierCounts.keystone > 0
        ? tierProgress.keystone / tierCounts.keystone
        : 0;
    const utilityPct = tierCounts.utility > 0
        ? tierProgress.utility / tierCounts.utility
        : 0;

    // I is capped by weakest tier
    return Math.min(foundationPct, keystonePct, utilityPct);
}

/**
 * Returns detailed tier mastery breakdown.
 */
export function getTierMasteryBreakdown(
    concepts: LearningConcept[],
    masteredConceptIds: Set<string>
): TierDistribution & { masteryPerTier: Record<TierType, number> } {
    const counts: Record<TierType, number> = { foundation: 0, keystone: 0, utility: 0 };
    const mastered: Record<TierType, number> = { foundation: 0, keystone: 0, utility: 0 };

    for (const concept of concepts) {
        counts[concept.tier]++;
        if (masteredConceptIds.has(concept.id)) {
            mastered[concept.tier]++;
        }
    }

    return {
        foundation: counts.foundation,
        keystone: counts.keystone,
        utility: counts.utility,
        total: concepts.length,
        masteryPerTier: {
            foundation: counts.foundation > 0 ? mastered.foundation / counts.foundation : 0,
            keystone: counts.keystone > 0 ? mastered.keystone / counts.keystone : 0,
            utility: counts.utility > 0 ? mastered.utility / counts.utility : 0,
        },
    };
}

// ============================================================================
// Universal Learning Equation
// ============================================================================

/**
 * Calculates I using the Universal Learning Equation.
 * 
 * I = min(h, G × f × M × P)
 * 
 * Where:
 * - h = ceiling (default 1.0)
 * - G = governance multiplier (environment quality)
 * - f = Q_f = fluency/delivery quality
 * - M = Q_M = modeling quality
 * - P = Q_P = preparation quality
 */
export function calculateMasteryIndex(
    G: number,
    Q_f: number,
    Q_M: number,
    Q_P: number,
    h: number = 1.0
): number {
    return Math.min(h, G * Q_f * Q_M * Q_P);
}

/**
 * Determines which equation variable is the weakest link.
 */
export function findWeakestVariable(
    equationState: { G: number; Q_f: number; Q_M: number; Q_P: number }
): { variable: 'G' | 'Q_f' | 'Q_M' | 'Q_P'; value: number; recommendation: string } {
    const variables = [
        { key: 'G' as const, value: equationState.G, name: 'Governance' },
        { key: 'Q_f' as const, value: equationState.Q_f, name: 'Fluency' },
        { key: 'Q_M' as const, value: equationState.Q_M, name: 'Modeling' },
        { key: 'Q_P' as const, value: equationState.Q_P, name: 'Preparation' },
    ];

    const weakest = variables.reduce((min, curr) => curr.value < min.value ? curr : min);

    const recommendations: Record<string, string> = {
        G: 'Set clearer learning goals and reduce distractions.',
        Q_f: 'Practice more with timed challenges to improve recall speed.',
        Q_M: 'Rebuild concept maps and review dependency relationships.',
        Q_P: 'Revisit the Explore phase and re-scan tier structures.',
    };

    return {
        variable: weakest.key,
        value: weakest.value,
        recommendation: recommendations[weakest.key],
    };
}

// ============================================================================
// Progression Validation
// ============================================================================

/**
 * Validates that a learner's progression path is valid.
 * Returns any violations of tier hierarchy.
 */
export function validateProgressionPath(
    completedConcepts: string[],
    allConcepts: LearningConcept[]
): { valid: boolean; violations: string[] } {
    const violations: string[] = [];
    const masteredSoFar = new Set<string>();

    for (const conceptId of completedConcepts) {
        const concept = allConcepts.find(c => c.id === conceptId);
        if (!concept) continue;

        // Check if access was valid at time of completion
        if (!canAccessConcept(concept, masteredSoFar, allConcepts)) {
            violations.push(
                `${concept.name} was completed before its dependencies: ` +
                concept.dependencies.filter(d => !masteredSoFar.has(d)).join(', ')
            );
        }

        masteredSoFar.add(conceptId);
    }

    return {
        valid: violations.length === 0,
        violations,
    };
}
