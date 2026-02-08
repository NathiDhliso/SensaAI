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

import type { LearningConcept, LearningStage, LifecyclePhaseKey } from '@/shared/types/learning';

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
function getConceptTier(concept: LearningConcept): 'Root' | 'Trunk' | 'Leaf' {
  const t = concept.tier || concept.mnemonic?.tier || 'leaf';
  const pascal = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  return pascal as 'Root' | 'Trunk' | 'Leaf';
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
): { root: number; trunk: number; leaf: number } {
  const completed = allConcepts.filter(c => completedConcepts.includes(c.id));
  const total = completed.length || 1;

  return {
    root: completed.filter(c => getConceptTier(c) === 'Root').length / total,
    trunk: completed.filter(c => getConceptTier(c) === 'Trunk').length / total,
    leaf: completed.filter(c => getConceptTier(c) === 'Leaf').length / total,
  };
}

/**
 * Get the ideal next tier based on current distribution.
 * Ideal progression: Foundation 40%, Keystone 35%, Utility 25%
 */
function getIdealNextTier(
  distribution: { root: number; trunk: number; leaf: number }
): 'Root' | 'Trunk' | 'Leaf' {
  const idealRoot = 0.2;
  const idealTrunk = 0.5;
  const idealLeaf = 0.3;

  const rootDelta = idealRoot - distribution.root;
  const trunkDelta = idealTrunk - distribution.trunk;
  const leafDelta = idealLeaf - distribution.leaf;

  if (rootDelta >= trunkDelta && rootDelta >= leafDelta) {
    return 'Root';
  } else if (trunkDelta >= leafDelta) {
    return 'Trunk';
  }
  return 'Leaf';
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
    (idealTier === 'Root' && candidateTier === 'Trunk') ||
    (idealTier === 'Trunk' && candidateTier === 'Leaf')
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

// ============================================================================
// ADAPTIVE DIFFICULTY (ZONE OF PROXIMAL DEVELOPMENT)
// ============================================================================

/**
 * Difficulty metrics for a concept based on learner performance.
 * 
 * Uses Zone of Proximal Development (ZPD) theory:
 * - Too easy: Mastered quickly, high confidence → boring
 * - ZPD: Challenging but achievable with support → optimal learning
 * - Too hard: Repeated failures, low confidence → frustrating
 */
export interface ConceptDifficulty {
  /** Concept ID */
  conceptId: string;
  /** Inherent difficulty (1-10, based on prerequisites/complexity) */
  inherentDifficulty: number;
  /** Learner-specific difficulty based on performance history */
  personalDifficulty: number;
  /** Number of attempts on this concept */
  attempts: number;
  /** Number of errors/failures */
  errors: number;
  /** Average time spent (seconds) */
  avgTimeSpent: number;
  /** Whether this concept is in the learner's ZPD */
  inZPD: boolean;
  /** ZPD classification */
  zone: 'too_easy' | 'zpd' | 'too_hard';
}

/**
 * Calculate difficulty metrics for a concept.
 * 
 * @param concept The concept to evaluate
 * @param performance Historical performance data
 * @returns ConceptDifficulty assessment
 */
export function calculateConceptDifficulty(
  concept: LearningConcept,
  performance: {
    attempts: number;
    errors: number;
    avgTimeSpent: number;
    wasSkipped?: boolean;
  }
): ConceptDifficulty {
  // Calculate inherent difficulty from concept properties
  let inherentDifficulty = 3; // Default medium

  // Higher order = typically harder
  if (concept.order && concept.order > 15) inherentDifficulty += 2;
  else if (concept.order && concept.order > 8) inherentDifficulty += 1;

  // Tier affects difficulty
  const tier = getConceptTier(concept);
  if (tier === 'Leaf') inherentDifficulty += 2;
  else if (tier === 'Trunk') inherentDifficulty += 1;

  // Prerequisites add difficulty
  if (concept.prerequisites && concept.prerequisites.length > 2) {
    inherentDifficulty += 1;
  }

  // Clamp to 1-10
  inherentDifficulty = Math.max(1, Math.min(10, inherentDifficulty));

  // Calculate personal difficulty based on performance
  let personalDifficulty = inherentDifficulty;

  if (performance.attempts > 0) {
    const errorRate = performance.errors / performance.attempts;

    // High error rate increases personal difficulty
    if (errorRate > 0.5) personalDifficulty += 2;
    else if (errorRate > 0.25) personalDifficulty += 1;
    else if (errorRate < 0.1) personalDifficulty -= 1;

    // Slow time increases personal difficulty
    if (performance.avgTimeSpent > 120) personalDifficulty += 1; // > 2 min
    else if (performance.avgTimeSpent < 30) personalDifficulty -= 1; // < 30 sec
  }

  // Clamp to 1-10
  personalDifficulty = Math.max(1, Math.min(10, personalDifficulty));

  // Determine zone
  let zone: 'too_easy' | 'zpd' | 'too_hard';
  if (personalDifficulty <= 3) {
    zone = 'too_easy';
  } else if (personalDifficulty <= 7) {
    zone = 'zpd'; // Goldilocks zone
  } else {
    zone = 'too_hard';
  }

  return {
    conceptId: concept.id,
    inherentDifficulty,
    personalDifficulty,
    attempts: performance.attempts,
    errors: performance.errors,
    avgTimeSpent: performance.avgTimeSpent,
    inZPD: zone === 'zpd',
    zone,
  };
}

/**
 * Get concepts that are in the learner's Zone of Proximal Development.
 * 
 * ZPD = concepts that are challenging but achievable with support.
 * These provide optimal learning - not too easy (boring) or too hard (frustrating).
 * 
 * @param concepts All available concepts
 * @param performanceMap Performance data keyed by concept ID
 * @param options Filtering options
 * @returns Concepts sorted by ZPD suitability
 */
export function getZPDConcepts(
  concepts: LearningConcept[],
  performanceMap: Map<string, {
    attempts: number;
    errors: number;
    avgTimeSpent: number;
  }>,
  options: {
    /** Minimum concepts to return even if not in ZPD */
    minConcepts?: number;
    /** Prefer concepts with fewer attempts (novelty) */
    preferNovel?: boolean;
  } = {}
): { concept: LearningConcept; difficulty: ConceptDifficulty }[] {
  const { minConcepts = 3, preferNovel = true } = options;

  // Calculate difficulty for all concepts
  const withDifficulty = concepts.map(concept => {
    const perf = performanceMap.get(concept.id) || {
      attempts: 0,
      errors: 0,
      avgTimeSpent: 0,
    };
    return {
      concept,
      difficulty: calculateConceptDifficulty(concept, perf),
    };
  });

  // Separate by zone
  const inZPD = withDifficulty.filter(c => c.difficulty.zone === 'zpd');
  const tooEasy = withDifficulty.filter(c => c.difficulty.zone === 'too_easy');
  const tooHard = withDifficulty.filter(c => c.difficulty.zone === 'too_hard');

  // Sort ZPD by personal difficulty (prefer middle of ZPD)
  inZPD.sort((a, b) => {
    // Ideal difficulty is 5
    const aDist = Math.abs(5 - a.difficulty.personalDifficulty);
    const bDist = Math.abs(5 - b.difficulty.personalDifficulty);
    return aDist - bDist;
  });

  // If we have enough ZPD concepts, return them
  if (inZPD.length >= minConcepts) {
    return inZPD;
  }

  // Otherwise, add some too-easy concepts (for confidence building)
  // and some too-hard concepts (for stretch goals)
  const result = [...inZPD];

  // Add too-easy concepts (sorted by inherent difficulty descending - hardest of the easy)
  tooEasy.sort((a, b) => b.difficulty.inherentDifficulty - a.difficulty.inherentDifficulty);
  while (result.length < minConcepts && tooEasy.length > 0) {
    result.push(tooEasy.shift()!);
  }

  // Add too-hard concepts only if we still need more
  tooHard.sort((a, b) => a.difficulty.personalDifficulty - b.difficulty.personalDifficulty);
  while (result.length < minConcepts && tooHard.length > 0) {
    result.push(tooHard.shift()!);
  }

  // Optionally sort by novelty (fewer attempts first)
  if (preferNovel) {
    result.sort((a, b) => a.difficulty.attempts - b.difficulty.attempts);
  }

  return result;
}

/**
 * Get adaptive difficulty recommendations for a learner.
 */
export function getAdaptiveDifficultyRecommendation(
  concepts: LearningConcept[],
  performanceMap: Map<string, { attempts: number; errors: number; avgTimeSpent: number }>
): {
  recommendation: 'increase' | 'decrease' | 'maintain';
  reason: string;
  zpdCount: number;
  tooEasyCount: number;
  tooHardCount: number;
} {
  const withDifficulty = concepts.map(concept => {
    const perf = performanceMap.get(concept.id) || { attempts: 0, errors: 0, avgTimeSpent: 0 };
    return calculateConceptDifficulty(concept, perf);
  });

  const zpdCount = withDifficulty.filter(c => c.zone === 'zpd').length;
  const tooEasyCount = withDifficulty.filter(c => c.zone === 'too_easy').length;
  const tooHardCount = withDifficulty.filter(c => c.zone === 'too_hard').length;

  if (tooEasyCount > zpdCount && tooEasyCount > tooHardCount) {
    return {
      recommendation: 'increase',
      reason: `Most concepts (${tooEasyCount}) feel too easy. Time to increase difficulty!`,
      zpdCount,
      tooEasyCount,
      tooHardCount,
    };
  }

  if (tooHardCount > zpdCount && tooHardCount > tooEasyCount) {
    return {
      recommendation: 'decrease',
      reason: `Many concepts (${tooHardCount}) feel too challenging. Let's build more foundations first.`,
      zpdCount,
      tooEasyCount,
      tooHardCount,
    };
  }

  return {
    recommendation: 'maintain',
    reason: `Great balance! ${zpdCount} concepts are in your optimal learning zone.`,
    zpdCount,
    tooEasyCount,
    tooHardCount,
  };
}
