/**
 * SENSA v2.0 Tier Progression Validator
 * 
 * Validates that learner progression respects tier hierarchy and
 * calculates mastery using the Universal Learning Equation.
 * 
 * I = min(h, G × f(M(P(x))))
 */
import { getGraphColors } from '@/shared/constants/theme-colors';
import type { LearningConcept } from '@/shared/types/learning';
import type { TierType, TierDistribution } from '@/shared/types/sensa-flow';
// ============================================================================
// Configuration
// ============================================================================
export function getTierConfig() {
    const colors = getGraphColors();
    return {
        trunk: { color: colors.trunk, label: 'Trunk' },
        branch: { color: colors.branch, label: 'Branch' },
        leaf: { color: colors.leaf, label: 'Leaf' }
    };
}
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
    if (concept.tier === 'trunk') {
        return true;
    }
    if (concept.tier === 'branch') {
        return concept.dependencies.every(depId => {
            const dep = allConcepts.find(c => c.id === depId);
            if (!dep) return false;
            if (dep.tier === 'trunk') {
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
        trunk: [],
        branch: [],
        leaf: []
    };
    for (const concept of concepts) {
        result[concept.tier].push({
            concept,
            accessible: canAccessConcept(concept, masteredConceptIds, concepts),
            mastered: masteredConceptIds.has(concept.id)
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
        trunk: 0,
        branch: 0,
        leaf: 0
    };
    const tierCounts: Record<TierType, number> = {
        trunk: 0,
        branch: 0,
        leaf: 0
    };
    for (const concept of concepts) {
        tierCounts[concept.tier]++;
        if (masteredConceptIds.has(concept.id)) {
            tierProgress[concept.tier]++;
        }
    }
    const trunkPct = tierCounts.trunk > 0
        ? tierProgress.trunk / tierCounts.trunk
        : 0;
    const branchPct = tierCounts.branch > 0
        ? tierProgress.branch / tierCounts.branch
        : 0;
    const leafPct = tierCounts.leaf > 0
        ? tierProgress.leaf / tierCounts.leaf
        : 0;
    return Math.min(trunkPct, branchPct, leafPct);
}
/**
 * Returns detailed tier mastery breakdown.
 */
export function getTierMasteryBreakdown(
    concepts: LearningConcept[],
    masteredConceptIds: Set<string>
): TierDistribution & { masteryPerTier: Record<TierType, number> } {
    const counts: Record<TierType, number> = { trunk: 0, branch: 0, leaf: 0 };
    const mastered: Record<TierType, number> = { trunk: 0, branch: 0, leaf: 0 };
    for (const concept of concepts) {
        counts[concept.tier]++;
        if (masteredConceptIds.has(concept.id)) {
            mastered[concept.tier]++;
        }
    }
    return {
        trunk: counts.trunk,
        branch: counts.branch,
        leaf: counts.leaf,
        total: concepts.length,
        masteryPerTier: {
            trunk: counts.trunk > 0 ? mastered.trunk / counts.trunk : 0,
            branch: counts.branch > 0 ? mastered.branch / counts.branch : 0,
            leaf: counts.leaf > 0 ? mastered.leaf / counts.leaf : 0
        }
    };
}
// ============================================================================
// Universal Learning Equation
// ============================================================================
import {
    calculateHealthIndex,
    findWeakestVariable as findWeakestVariableCore,
    type HealthVariable
} from '@/shared/constants/sensa-flow-constants';

/**
 * Calculates I using the Universal Learning Equation.
 * 
 * I = min(h, Q_k × Q_r × Q_c × Q_f × Q_p)
 */
export function calculateMasteryIndex(
    Q_k: number,
    Q_r: number,
    Q_c: number,
    Q_f: number,
    Q_p: number,
    h: number = 1.0
): number {
    return calculateHealthIndex({ h, Q_k, Q_r, Q_c, Q_f, Q_p });
}

/**
 * Determines which equation variable is the weakest link.
 */
export function findWeakestVariable(
    equationState: { Q_k: number; Q_r: number; Q_c: number; Q_f: number; Q_p: number }
): { variable: HealthVariable; value: number; recommendation: string } {
    const weakest = findWeakestVariableCore(
        equationState.Q_k,
        equationState.Q_r,
        equationState.Q_c,
        equationState.Q_f,
        equationState.Q_p
    );

    const recommendations: Record<HealthVariable, string> = {
        Q_k: 'Preview the concepts and make predictions before diving in.',
        Q_r: 'Practice recalling from memory without prompts.',
        Q_c: 'Add more connections between concepts in your map.',
        Q_f: 'Return to review concepts you learned before starting new ones.',
        Q_p: 'Complete each learning phase fully instead of skipping ahead.'
    };

    return {
        variable: weakest.variable,
        value: weakest.value,
        recommendation: recommendations[weakest.variable]
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
        violations
    };
}
