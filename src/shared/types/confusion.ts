/**
 * Confusion Types
 * 
 * Types for the Confusion Drill system - helps learners distinguish
 * between similar concepts that are commonly confused.
 */

/**
 * A pair of concepts that are commonly confused
 */
export interface ConfusionPair {
    id: string;
    conceptA: {
        name: string;
        description: string;
    };
    conceptB: {
        name: string;
        description: string;
    };
    distinctionKey: string;  // The key difference in one sentence
    whenToUseA: string;      // When to pick concept A
    whenToUseB: string;      // When to pick concept B
    commonMistake: string;   // What people typically get wrong
}

/**
 * A discrimination question testing the pair
 */
export interface ConfusionQuestion {
    id: string;
    pairId: string;
    scenario: string;        // A realistic scenario
    correctChoice: 'A' | 'B';
    optionA: string;         // Concept A name
    optionB: string;         // Concept B name
    explanation: string;     // Why this is the correct answer
}

/**
 * User's answer to a confusion question
 */
export interface ConfusionAnswer {
    questionId: string;
    selectedChoice: 'A' | 'B' | null;  // null = timeout
    correct: boolean;
    responseTimeMs: number;
}

/**
 * State for an active drill session
 */
export interface ConfusionDrillState {
    pair: ConfusionPair;
    questions: ConfusionQuestion[];
    currentIndex: number;
    answers: ConfusionAnswer[];
    isComplete: boolean;
    showFeedback: boolean;
    lastAnswerCorrect: boolean | null;
}

/**
 * Result of a completed drill
 */
export interface ConfusionDrillResult {
    pairId: string;
    conceptA: string;
    conceptB: string;
    correctAnswers: number;
    totalQuestions: number;
    avgResponseTimeMs: number;
    mastered: boolean;  // 80%+ correct
    completedAt: string;
}
