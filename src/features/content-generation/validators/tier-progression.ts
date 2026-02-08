/**
 * SENSA v2.0 Tier Progression Validator
 * 
 * Validates that learner progression respects tier hierarchy and
 * calculates mastery using the Universal Learning Equation.
 * 
 * I = min(h, G × f(M(P(x))))
 */

import { GRAPH_COLORS, COLORS } from '@/shared/constants/theme-colors';
import type { LearningConcept } from '@/shared/types/learning';
import type { TierType, TierDistribution } from '@/shared/types/sensa-flow';

// ============================================================================
// Configuration
// ============================================================================

export const TIER_CONFIG = {
    root: { color: GRAPH_COLORS.root, label: 'Root' },
    trunk: { color: GRAPH_COLORS.trunk, label: 'Trunk' },
    leaf: { color: COLORS.text.muted, label: 'Leaf' }
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
    if (concept.tier === 'root') {
        return true;
    }

    if (concept.tier === 'trunk') {
        return concept.dependencies.every(depId => {
            const dep = allConcepts.find(c => c.id === depId);
            if (!dep) return false;

            if (dep.tier === 'root') {
                return masteredConceptIds.has(depId);
            }

            return masteredConceptIds.has(depId);
        });
    }

    if (concept.tier === 'leaf') {
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
        root: [],
        trunk: [],
        leaf: [],
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
        root: 0,
        trunk: 0,
        leaf: 0,
    };

    const tierCounts: Record<TierType, number> = {
        root: 0,
        trunk: 0,
        leaf: 0,
    };

    for (const concept of concepts) {
        tierCounts[concept.tier]++;
        if (masteredConceptIds.has(concept.id)) {
            tierProgress[concept.tier]++;
        }
    }

    const rootPct = tierCounts.root > 0
        ? tierProgress.root / tierCounts.root
        : 0;
    const trunkPct = tierCounts.trunk > 0
        ? tierProgress.trunk / tierCounts.trunk
        : 0;
    const leafPct = tierCounts.leaf > 0
        ? tierProgress.leaf / tierCounts.leaf
        : 0;

    return Math.min(rootPct, trunkPct, leafPct);
}

/**
 * Returns detailed tier mastery breakdown.
 */
export function getTierMasteryBreakdown(
    concepts: LearningConcept[],
    masteredConceptIds: Set<string>
): TierDistribution & { masteryPerTier: Record<TierType, number> } {
    const counts: Record<TierType, number> = { root: 0, trunk: 0, leaf: 0 };
    const mastered: Record<TierType, number> = { root: 0, trunk: 0, leaf: 0 };

    for (const concept of concepts) {
        counts[concept.tier]++;
        if (masteredConceptIds.has(concept.id)) {
            mastered[concept.tier]++;
        }
    }

    return {
        root: counts.root,
        trunk: counts.trunk,
        leaf: counts.leaf,
        total: concepts.length,
        masteryPerTier: {
            root: counts.root > 0 ? mastered.root / counts.root : 0,
            trunk: counts.trunk > 0 ? mastered.trunk / counts.trunk : 0,
            leaf: counts.leaf > 0 ? mastered.leaf / counts.leaf : 0,
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
