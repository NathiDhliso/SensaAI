/**
 * Concept Selection Utilities
 * 
 * Phase 3: Cognitive Load Mitigations - Smart Interleaving
 * Provides optimal next-concept selection based on cognitive science principles.
 * 
 * Key Principles:
 * - Interleaving Effect: Mixed practice improves long-term retention
 * - Spacing Effect: Distributed practice > massed practice
 * - Prerequisite Gates: Only suggest concepts with satisfied dependencies
 * - Tier Balance: Maintain Foundation → Keystone → Utility progression
 * 
 * @see SILVER_BULLET_LEARNING_ARCHITECTURE.md Phase 3.B
 */

import type { LearningConcept, LearningStage, LifecyclePhaseKey } from '@/lib/types/learning';

/**
 * Options for concept selection algorithm.
 */
export interface ConceptSelectionOptions {
  /** Prefer interleaving lifecycle phases */
  interleavePhases?: boolean;
  /** Prefer interleaving tiers */
  interleaveTiers?: boolean;
  /** Strictly enforce prerequisites */
  strictPrerequisites?: boolean;
  /** Weight for tier balance (0-1) */
  tierBalanceWeight?: number;
}

/**
 * Context for concept selection decisions.
 */
export interface SelectionContext {
  /** All available concepts */
  allConcepts: LearningConcept[];
  /** All stages */
  allStages: LearningStage[];
  /** Concepts the user has completed */
  completedConcepts: string[];
  /** The last concept the user viewed/completed */
  lastConceptId?: string;
  /** The last lifecycle phase worked on */
  lastPhase?: LifecyclePhaseKey;
}

/**
 * Result of concept selection with reasoning.
 */
export interface SelectionResult {
  /** The recommended concept */
  concept: LearningConcept;
  /** Why this concept was chosen */
  reason: string;
  /** Alternative concepts if user wants to choose */
  alternatives: LearningConcept[];
  /** Score breakdown for debugging */
  scores: {
    prerequisiteScore: number;
    interleavingScore: number;
    tierBalanceScore: number;
    totalScore: number;
  };
}

/**
 * Get the lifecycle phase title from a concept.
 */
function getConceptPhase(concept: LearningConcept): string | null {
  return concept.lifecycle?.phase1?.title || null;
}

/**
 * Get the tier of a concept.
 */
function getConceptTier(concept: LearningConcept): 'Foundation' | 'Keystone' | 'Utility' {
  const t = concept.tier || concept.mnemonic?.tier || 'utility';
  const pascal = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  return pascal as 'Foundation' | 'Keystone' | 'Utility';
}

/**
 * Check if all prerequisites for a concept are met.
 */
function prerequisitesMet(
  concept: LearningConcept,
  allConcepts: LearningConcept[],
  completedConcepts: string[]
): boolean {
  if (!concept.prerequisites || concept.prerequisites.length === 0) {
    return true;
  }

  return concept.prerequisites.every(prereq => {
    const prereqConcept = allConcepts.find(c =>
      c.name.toLowerCase() === prereq.toLowerCase() ||
      c.id === prereq
    );
    return prereqConcept ? completedConcepts.includes(prereqConcept.id) : true;
  });
}

/**
 * Calculate tier distribution from completed concepts.
 */
function calculateTierDistribution(
  completedConcepts: string[],
  allConcepts: LearningConcept[]
): { foundation: number; keystone: number; utility: number } {
  const completed = allConcepts.filter(c => completedConcepts.includes(c.id));
  const total = completed.length || 1;

  return {
    foundation: completed.filter(c => getConceptTier(c) === 'Foundation').length / total,
    keystone: completed.filter(c => getConceptTier(c) === 'Keystone').length / total,
    utility: completed.filter(c => getConceptTier(c) === 'Utility').length / total,
  };
}

/**
 * Get the ideal next tier based on current distribution.
 * Ideal progression: Foundation 40%, Keystone 35%, Utility 25%
 */
function getIdealNextTier(
  distribution: { foundation: number; keystone: number; utility: number }
): 'Foundation' | 'Keystone' | 'Utility' {
  const idealFoundation = 0.4;
  const idealKeystone = 0.35;
  const idealUtility = 0.25;

  const foundationDelta = idealFoundation - distribution.foundation;
  const keystoneDelta = idealKeystone - distribution.keystone;
  const utilityDelta = idealUtility - distribution.utility;

  // Return the tier that's most behind its ideal
  if (foundationDelta >= keystoneDelta && foundationDelta >= utilityDelta) {
    return 'Foundation';
  } else if (keystoneDelta >= utilityDelta) {
    return 'Keystone';
  }
  return 'Utility';
}

/**
 * Calculate a score for a candidate concept.
 */
function scoreConcept(
  candidate: LearningConcept,
  context: SelectionContext,
  options: ConceptSelectionOptions = {}
): { total: number; prerequisite: number; interleaving: number; tierBalance: number } {
  const {
    interleavePhases = true,
    interleaveTiers = true,
    strictPrerequisites = true,
    tierBalanceWeight = 0.3,
  } = options;

  let prerequisiteScore = 1.0;
  let interleavingScore = 0.5;
  let tierBalanceScore = 0.5;

  // 1. Prerequisite Score (0 or 1 if strict, gradual otherwise)
  const prereqsMet = prerequisitesMet(candidate, context.allConcepts, context.completedConcepts);
  if (strictPrerequisites && !prereqsMet) {
    prerequisiteScore = 0;
  } else if (!prereqsMet) {
    prerequisiteScore = 0.3;
  }

  // 2. Interleaving Score
  if (context.lastConceptId) {
    const lastConcept = context.allConcepts.find(c => c.id === context.lastConceptId);
    if (lastConcept) {
      const lastPhase = getConceptPhase(lastConcept);
      const candidatePhase = getConceptPhase(candidate);
      const lastTier = getConceptTier(lastConcept);
      const candidateTier = getConceptTier(candidate);

      // Prefer different phases (interleaving effect)
      if (interleavePhases && lastPhase && candidatePhase) {
        interleavingScore = lastPhase !== candidatePhase ? 1.0 : 0.3;
      }

      // Prefer different tiers
      if (interleaveTiers) {
        if (lastTier !== candidateTier) {
          interleavingScore = Math.min(interleavingScore + 0.3, 1.0);
        }
      }
    }
  }

  // 3. Tier Balance Score
  const distribution = calculateTierDistribution(context.completedConcepts, context.allConcepts);
  const idealTier = getIdealNextTier(distribution);
  const candidateTier = getConceptTier(candidate);

  if (candidateTier === idealTier) {
    tierBalanceScore = 1.0;
  } else if (
    (idealTier === 'Foundation' && candidateTier === 'Keystone') ||
    (idealTier === 'Keystone' && candidateTier === 'Utility')
  ) {
    tierBalanceScore = 0.6;
  }

  // Weight and combine
  const total =
    (prerequisiteScore * 0.4) +
    (interleavingScore * (0.3 - tierBalanceWeight / 2)) +
    (tierBalanceScore * tierBalanceWeight);

  return {
    total,
    prerequisite: prerequisiteScore,
    interleaving: interleavingScore,
    tierBalance: tierBalanceScore,
  };
}

/**
 * Get the optimal next concept based on cognitive science principles.
 * 
 * Algorithm:
 * 1. Filter to incomplete concepts
 * 2. Score each candidate based on prerequisites, interleaving, and tier balance
 * 3. Sort by score and return top candidate with alternatives
 * 
 * @example
 * ```tsx
 * const result = getOptimalNextConcept({
 *   allConcepts,
 *   allStages,
 *   completedConcepts: progress.completedConcepts,
 *   lastConceptId: progress.currentConceptId,
 * });
 * 
 * if (result) {
 *   navigateToConcept(result.concept.id);
 * }
 * ```
 */
export function getOptimalNextConcept(
  context: SelectionContext,
  options: ConceptSelectionOptions = {}
): SelectionResult | null {
  const { allConcepts, completedConcepts } = context;

  // Get incomplete concepts
  const incomplete = allConcepts.filter(c => !completedConcepts.includes(c.id));

  if (incomplete.length === 0) {
    return null;
  }

  // Score all candidates
  const scored = incomplete.map(concept => ({
    concept,
    scores: scoreConcept(concept, context, options),
  }));

  // Sort by total score (descending)
  scored.sort((a, b) => b.scores.total - a.scores.total);

  const best = scored[0];
  const alternatives = scored.slice(1, 4).map(s => s.concept);

  // Generate reason
  let reason = 'Next in sequence';
  if (best.scores.prerequisite === 1.0 && best.scores.interleaving > 0.7) {
    reason = 'Optimal for interleaved learning';
  } else if (best.scores.tierBalance > 0.8) {
    reason = `Balances your ${getConceptTier(best.concept)} concept coverage`;
  } else if (best.scores.prerequisite < 1.0) {
    reason = 'Available with partial prerequisites';
  }

  return {
    concept: best.concept,
    reason,
    alternatives,
    scores: {
      prerequisiteScore: best.scores.prerequisite,
      interleavingScore: best.scores.interleaving,
      tierBalanceScore: best.scores.tierBalance,
      totalScore: best.scores.total,
    },
  };
}

/**
 * Get all concepts ready to learn (prerequisites met).
 */
export function getReadyConcepts(
  allConcepts: LearningConcept[],
  completedConcepts: string[]
): LearningConcept[] {
  return allConcepts.filter(c =>
    !completedConcepts.includes(c.id) &&
    prerequisitesMet(c, allConcepts, completedConcepts)
  );
}

/**
 * Get concepts blocked by missing prerequisites.
 */
export function getBlockedConcepts(
  allConcepts: LearningConcept[],
  completedConcepts: string[]
): Array<{ concept: LearningConcept; missingPrereqs: string[] }> {
  return allConcepts
    .filter(c =>
      !completedConcepts.includes(c.id) &&
      !prerequisitesMet(c, allConcepts, completedConcepts)
    )
    .map(concept => ({
      concept,
      missingPrereqs: (concept.prerequisites || []).filter(prereq => {
        const prereqConcept = allConcepts.find(c =>
          c.name.toLowerCase() === prereq.toLowerCase()
        );
        return prereqConcept && !completedConcepts.includes(prereqConcept.id);
      }),
    }));
}

/**
 * Calculate learning velocity metrics.
 */
export function calculateLearningVelocity(
  completedConcepts: string[],
  allConcepts: LearningConcept[],
  sessionStartTime: number
): {
  conceptsPerHour: number;
  estimatedTimeToComplete: number;
  tierVelocity: Record<string, number>;
} {
  const elapsed = (Date.now() - sessionStartTime) / 1000 / 60 / 60; // hours
  const completed = completedConcepts.length;
  const conceptsPerHour = elapsed > 0 ? completed / elapsed : 0;

  const remaining = allConcepts.length - completed;
  const estimatedTimeToComplete = conceptsPerHour > 0
    ? (remaining / conceptsPerHour) * 60 // minutes
    : remaining * 5; // default 5 min per concept

  const distribution = calculateTierDistribution(completedConcepts, allConcepts);

  return {
    conceptsPerHour: Math.round(conceptsPerHour * 10) / 10,
    estimatedTimeToComplete: Math.round(estimatedTimeToComplete),
    tierVelocity: distribution,
  };
}
