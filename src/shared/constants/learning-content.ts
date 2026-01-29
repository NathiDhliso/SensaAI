// Deprecated: Content is now loaded dynamically via ContentContext
import type { LearningStage, LearningConcept } from '@/shared/types/learning';

export const LEARNING_STAGES: LearningStage[] = [];
export const LEARNING_CONCEPTS: LearningConcept[] = [];

/**
 * Default fallback scenario for MasteryChallenge
 * Used when dynamic content fails to load
 */
export const DEFAULT_MASTERY_SCENARIO = `You are consulting for a client who needs to implement a comprehensive solution.

**Scenario:**
Design and explain a complete system that integrates the concepts you've learned.

**Requirements:**
1. Explain how each concept contributes to the solution
2. Describe the relationships between concepts
3. Identify potential challenges and how you'd address them
4. Provide a step-by-step implementation approach

**Your Response:**`;
