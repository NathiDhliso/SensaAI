import type { LearningConcept } from '@/shared/types/learning';
import { VELOCITY_CONFIG } from '@/shared/constants/ui-constants';

export interface ConfusionPair {
  concept1: LearningConcept;
  concept2: LearningConcept;
  similarityScore: number;
  confusingAspects: string[];
}

// Re-export types used in Drill
export interface ConfusionQuestion {
  id: string;
  scenario: string;
  optionA: string;
  optionB: string;
  correctChoice: 'A' | 'B';
  explanation: string;
}

export interface ConfusionAnswer {
  questionId: string;
  selectedChoice: 'A' | 'B' | null;
  correct: boolean;
  responseTimeMs: number;
}

export interface ConfusionDrillResult {
  pairId: string;
  score: number;
  mastered: boolean;
  timeSpent: number;
}


/**
 * Calculate similarity between two concepts
 * Returns score 0-1 (1 = identical)
 */
export function calculateConceptSimilarity(
  concept1: LearningConcept,
  concept2: LearningConcept
): number {
  let score = 0;


  // Name similarity
  const name1Words = concept1.name.toLowerCase().split(/\s+/);
  const name2Words = concept2.name.toLowerCase().split(/\s+/);
  const nameOverlap = name1Words.filter(w => name2Words.includes(w)).length;
  score += (nameOverlap / Math.max(name1Words.length, name2Words.length)) * VELOCITY_CONFIG.CONFUSION.NAME_WEIGHT;

  // Category/stage similarity
  if (concept1.stageId === concept2.stageId) {
    score += VELOCITY_CONFIG.CONFUSION.CATEGORY_WEIGHT;
  }

  // Hook sentence word overlap
  if (concept1.hookSentence && concept2.hookSentence) {
    const hook1Words = concept1.hookSentence.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const hook2Words = concept2.hookSentence.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const hookOverlap = hook1Words.filter(w => hook2Words.some(hw => hw.includes(w))).length;
    score += (hookOverlap / Math.max(hook1Words.length, hook2Words.length, 1)) * VELOCITY_CONFIG.CONFUSION.HOOK_WEIGHT;
  }

  // How-to-use overlap
  if (concept1.howToUse?.length && concept2.howToUse?.length) {
    const use1 = concept1.howToUse.join(' ').toLowerCase();
    const use2 = concept2.howToUse.join(' ').toLowerCase();
    const use1Words = use1.split(/\s+/).filter(w => w.length > 3);
    const use2Words = use2.split(/\s+/).filter(w => w.length > 3);
    const useOverlap = use1Words.filter(w => use2Words.some(uw => uw.includes(w))).length;
    score += (useOverlap / Math.max(use1Words.length, use2Words.length, 1)) * VELOCITY_CONFIG.CONFUSION.USAGE_WEIGHT;
  }

  return Math.min(1, score);
}

/**
 * Identify confusing aspects between two concepts
 */
export function identifyConfusingAspects(
  concept1: LearningConcept,
  concept2: LearningConcept
): string[] {
  const aspects: string[] = [];

  // Similar names
  if (concept1.name.toLowerCase().includes(concept2.name.toLowerCase()) ||
    concept2.name.toLowerCase().includes(concept1.name.toLowerCase())) {
    aspects.push('Similar names');
  }

  // Same category
  if (concept1.stageId === concept2.stageId) {
    aspects.push('Same category');
  }

  // Similar purpose
  if (concept1.hookSentence && concept2.hookSentence) {
    const commonWords = concept1.hookSentence.toLowerCase().split(/\s+/)
      .filter(w => w.length > 4 && concept2.hookSentence?.toLowerCase().includes(w));
    if (commonWords.length > 2) {
      aspects.push('Similar purpose');
    }
  }

  return aspects;
}

/**
 * Find confusion pairs for a concept
 */
export function findConfusionPairs(
  concept: LearningConcept,
  allConcepts: LearningConcept[],
  threshold: number = VELOCITY_CONFIG.CONFUSION.SIMILARITY_THRESHOLD
): ConfusionPair[] {
  return allConcepts
    .filter(c => c.id !== concept.id)
    .map(other => ({
      concept1: concept,
      concept2: other,
      similarityScore: calculateConceptSimilarity(concept, other),
      confusingAspects: identifyConfusingAspects(concept, other),
    }))
    .filter(pair => pair.similarityScore >= threshold)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 3); // Max 3 confusion pairs
}

/**
 * calculate result
 */
export function calculateConfusionDrillResult(
  pair: ConfusionPair,
  questions: ConfusionQuestion[],
  answers: ConfusionAnswer[]
): ConfusionDrillResult {
  const correctCount = answers.filter(a => a.correct).length;
  return {
    pairId: `${pair.concept1.id}-${pair.concept2.id}`,
    score: (correctCount / questions.length) * 100,
    mastered: (correctCount / questions.length) >= 0.8,
    timeSpent: answers.reduce((sum, a) => sum + a.responseTimeMs, 0) / 1000
  };
}

/**
 * Generate drill questions for a confusion pair
 */
export function generateConfusionQuestions(pair: ConfusionPair): ConfusionQuestion[] {
  const questions: ConfusionQuestion[] = [];
  const { concept1, concept2, confusingAspects } = pair;

  // 1. Definition / Purpose Discrimination
  questions.push({
    id: `q-${pair.concept1.id}-${pair.concept2.id}-1`,
    scenario: `You need to ${concept1.hookSentence ? concept1.hookSentence.toLowerCase() : 'apply a specific concept'}. Which one is best?`,
    optionA: concept1.name,
    optionB: concept2.name,
    correctChoice: 'A',
    explanation: `${concept1.name} is primarily for ${concept1.hookSentence || 'this purpose'}, while ${concept2.name} is different.`
  });

  // 2. Reverse Scenario
  questions.push({
    id: `q-${pair.concept1.id}-${pair.concept2.id}-2`,
    scenario: `You are looking to ${concept2.hookSentence ? concept2.hookSentence.toLowerCase() : 'do something else'}. What do you choose?`,
    optionA: concept1.name,
    optionB: concept2.name,
    correctChoice: 'B',
    explanation: `${concept2.name} is the correct choice here because it handles ${concept2.hookSentence || 'this scenario'}.`
  });

  // 3. Aspect-based Question (if aspects exist)
  if (confusingAspects.length > 0) {
    // Randomize which option is the "correct" one (Concept 1) to avoid 'A' bias
    const isConcept1OptionA = Math.random() > 0.5;

    questions.push({
      id: `q-${pair.concept1.id}-${pair.concept2.id}-3`,
      scenario: `Consider the aspect of "${confusingAspects[0]}". Which concept handles this more directly?`,
      optionA: isConcept1OptionA ? concept1.name : concept2.name,
      optionB: isConcept1OptionA ? concept2.name : concept1.name,
      correctChoice: isConcept1OptionA ? 'A' : 'B',
      explanation: `This is a nuanced difference. ${concept1.name} often addresses ${confusingAspects[0]} in a specific way that differs from ${concept2.name}.`
    });
  }

  return questions;
}

/**
 * Generate SensaAI enhanced confusion pairs for a set of concepts
 * Used by sensa-ai-integration for AI-enhanced assessment generation
 */
export async function generateSensaAIConfusionPairs(
  concepts: LearningConcept[],
  _domain: string,
  _config: unknown,
  maxPairs: number = 5
): Promise<ConfusionPair[]> {
  // Find all pairs across all concepts
  const allPairs: ConfusionPair[] = [];
  const seenPairIds = new Set<string>();

  for (const concept of concepts) {
    const pairs = findConfusionPairs(concept, concepts);
    for (const pair of pairs) {
      // Create a unique ID to avoid duplicates (A-B same as B-A)
      const pairId = [pair.concept1.id, pair.concept2.id].sort().join('-');
      if (!seenPairIds.has(pairId)) {
        seenPairIds.add(pairId);
        allPairs.push(pair);
      }
    }
  }

  // Sort by similarity and return top N
  return allPairs
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, maxPairs);
}
