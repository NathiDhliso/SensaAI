import type { LearningConcept } from '@/shared/types/learning';

export interface MCQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface CuedQuestion {
  id: string;
  cue: string;
  hint: string;
}

export interface TransferChallenge {
  id: string;
  scenario: string;
  prompt: string;
  requirements: string[];
}

export function generateMCQuestions(concepts: LearningConcept[]): MCQuestion[] {
  return concepts.slice(0, 5).map((concept) => ({
    id: `mc-${concept.id}`,
    question: `What is the main purpose of ${concept.name}?`,
    options: [
      concept.whyYouNeed || 'Primary purpose',
      'Alternative option A',
      'Alternative option B',
      'Alternative option C'
    ],
    correctIndex: 0
  }));
}

export function generateCuedQuestions(concepts: LearningConcept[]): CuedQuestion[] {
  return concepts.slice(0, 5).map(concept => ({
    id: `cued-${concept.id}`,
    cue: `Explain how ${concept.name} works in your own words.`,
    hint: concept.hookSentence || 'Think about the core mechanism'
  }));
}

export function generateTransferChallenges(concepts: LearningConcept[]): TransferChallenge[] {
  return concepts.slice(0, 3).map(concept => ({
    id: `transfer-${concept.id}`,
    scenario: `Real-world application of ${concept.name}`,
    prompt: `How would you apply ${concept.name} to solve a practical problem?`,
    requirements: [
      'Explain the core concept',
      'Describe a specific use case',
      'Identify potential challenges'
    ]
  }));
}
