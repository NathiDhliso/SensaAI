/**
 * Diagnostic Assessment Generator
 * 
 * Generates diagnostic questions for foundation concepts to enable
 * the SensaAI Learning Velocity Engine diagnostic-first learning approach.
 * 
 * PRE-TESTING EFFECT:
 * Research shows testing BEFORE teaching primes learning better than studying first.
 * This module supports creating pre-test assessments where answers are revealed
 * only after the learner has attempted all questions AND completed the learning phase.
 * 
 * Requirements: 1.2, 3.4, 3.5
 */

import { getBedrockClient, invokeClaudeModel, type BedrockConfig } from '@/features/content-generation/api/claude-client';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import type { SensaAILearningConcept, DiagnosticQuestion } from '@/features/content-generation/parsers/transformer';

const BATCH_GENERATION_TOKENS = 3000;

const DIAGNOSTIC_SYSTEM_PROMPT = `You are an expert at creating diagnostic assessments. Generate questions that quickly assess existing knowledge without teaching new concepts.

DIAGNOSTIC PRINCIPLES:
1. Test what learners ALREADY know, not what they need to learn
2. Questions should be answerable in 20-45 seconds
3. Focus on foundation concepts that unlock other learning
4. Use recognition over recall when possible
5. Avoid trick questions - test genuine understanding

QUESTION TYPES:
- "recognition": Can they identify the concept's purpose/role?
- "distinction": Can they distinguish it from similar concepts?
- "application": Do they know when/where to use it?

OUTPUT FORMAT (JSON array):
[
  {
    "id": "diag-1",
    "question": "What is the primary purpose of [concept]?",
    "type": "multiple-choice",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "expectedTime": 30,
    "keyPoints": ["Key point being tested"],
    "rationale": "Why this tests existing knowledge"
  }
]`;

/**
 * Enhanced diagnostic question generation using Claude
 */
export async function generateEnhancedDiagnosticQuestions(
  concepts: SensaAILearningConcept[],
  subject: string,
  config: BedrockConfig,
  questionsPerConcept: number = 2
): Promise<Map<string, DiagnosticQuestion[]>> {
  const questionMap = new Map<string, DiagnosticQuestion[]>();

  // Only generate for foundation concepts (diagnostic eligible)
  const foundationConcepts = concepts.filter(c => c.foundationLevel);

  if (foundationConcepts.length === 0) {
    return questionMap;
  }

  // Process concepts in batches to avoid overwhelming the API
  const batchSize = 3;
  for (let i = 0; i < foundationConcepts.length; i += batchSize) {
    const batch = foundationConcepts.slice(i, i + batchSize);

    try {
      const batchQuestions = await generateDiagnosticBatch(batch, subject, config, questionsPerConcept);

      // Merge batch results into main map
      batchQuestions.forEach((questions, conceptId) => {
        questionMap.set(conceptId, questions);
      });

      // Small delay between batches to be respectful to the API
      if (i + batchSize < foundationConcepts.length) {
        await new Promise(resolve => setTimeout(resolve, UI_TIMINGS.ONE_SECOND));
      }

    } catch (error) {
      console.error(`[DiagnosticGenerator] Failed to generate batch ${i}-${i + batchSize}:`, error);

      // Fallback to built-in generation for this batch
      batch.forEach(concept => {
        questionMap.set(concept.id, concept.diagnosticQuestions);
      });
    }
  }

  return questionMap;
}

/**
 * Generate diagnostic questions for a batch of concepts
 */
async function generateDiagnosticBatch(
  concepts: SensaAILearningConcept[],
  subject: string,
  config: BedrockConfig,
  questionsPerConcept: number
): Promise<Map<string, DiagnosticQuestion[]>> {
  const conceptDetails = concepts.map(c => ({
    id: c.id,
    name: c.name,
    hookSentence: c.hookSentence,
    keyPoints: c.keyPoints.slice(0, 3), // Limit context
    whyYouNeed: c.whyYouNeed,
    tier: c.tier
  }));

  const prompt = `Generate ${questionsPerConcept} diagnostic questions for each of these foundation concepts in "${subject}":

${conceptDetails.map(c => `
CONCEPT: ${c.name}
Purpose: ${c.hookSentence}
Key Points: ${c.keyPoints.join(', ')}
Why Important: ${c.whyYouNeed}
Tier: ${c.tier}
`).join('\n')}

For each concept, create ${questionsPerConcept} questions that test EXISTING knowledge:
1. One recognition question (multiple choice, 4 options)
2. One application question (true/false or multiple choice)

Requirements:
- Questions should be answerable by someone who already knows the concept
- Avoid teaching new information in the question
- Focus on practical understanding, not memorization
- Include realistic distractors for multiple choice
- Keep questions concise and clear

Return a JSON object with concept IDs as keys:
{
  "concept-id-1": [
    {
      "id": "diag-concept-1-1",
      "question": "Question text here",
      "type": "multiple-choice",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "expectedTime": 30,
      "keyPoints": ["What this tests"],
      "rationale": "Why this assesses existing knowledge"
    }
  ]
}`;

  const client = await getBedrockClient(config);
  const messages = [{ role: 'user' as const, content: prompt }];

  const response = await invokeClaudeModel(
    client,
    messages,
    DIAGNOSTIC_SYSTEM_PROMPT,
    BATCH_GENERATION_TOKENS // Longer context for batch processing
  );

  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const rawQuestions = JSON.parse(jsonMatch[0]);
    const questionMap = new Map<string, DiagnosticQuestion[]>();

    // Validate and normalize questions
    concepts.forEach(concept => {
      const conceptQuestions = rawQuestions[concept.id] || [];

      if (Array.isArray(conceptQuestions)) {
        const validatedQuestions = conceptQuestions.map((qItem: unknown, index: number) => {
          const q = qItem as {
            id?: string;
            question?: string;
            type?: string;
            options?: string[];
            correctAnswer?: number;
            keyPoints?: string[];
            rationale?: string;
            expectedTime?: number;
            complexity?: string;
          };

          return {
            id: q.id || `diag-${concept.id}-${index + 1}`,
            question: q.question || `What is the purpose of ${concept.name}?`,
            type: ['multiple-choice', 'true-false', 'short-answer'].includes(q.type || '')
              ? (q.type as 'multiple-choice' | 'true-false' | 'short-answer')
              : 'multiple-choice',
            options: Array.isArray(q.options) ? q.options : undefined,
            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
            expectedTime: typeof q.expectedTime === 'number' ? q.expectedTime : 30,
            keyPoints: Array.isArray(q.keyPoints) ? q.keyPoints : [concept.hookSentence || 'Concept mastery'],
            rationale: q.rationale || 'Tests existing knowledge of concept',
            complexity: (q.complexity as 'basic' | 'intermediate' | 'advanced') || 'intermediate'
          };
        });

        questionMap.set(concept.id, validatedQuestions);
      } else {
        // Fallback to built-in questions
        questionMap.set(concept.id, concept.diagnosticQuestions);
      }
    });

    return questionMap;

  } catch (error) {
    console.error('[DiagnosticGenerator] Failed to parse response:', error);
    throw error;
  }
}

/**
 * Create a diagnostic assessment from foundation concepts
 */
export function createDiagnosticAssessment(
  concepts: SensaAILearningConcept[],
  enhancedQuestions?: Map<string, DiagnosticQuestion[]>
): {
  concepts: SensaAILearningConcept[];
  questions: DiagnosticQuestion[];
  totalTime: number;
  metadata: {
    foundationCount: number;
    questionCount: number;
    avgComplexity: number;
    tierDistribution: Record<string, number>;
  };
} {
  // Select 5-7 foundation concepts for diagnostic (cognitive load management)
  const foundationConcepts = concepts
    .filter(c => c.foundationLevel)
    .sort((a, b) => {
      // Prioritize by diagnostic suitability score
      const scoreA = a.prerequisiteWeight * 0.4 + a.frequencyWeight * 0.3 +
        (a.abstractionLevel === 'concrete' ? 0.3 : 0);
      const scoreB = b.prerequisiteWeight * 0.4 + b.frequencyWeight * 0.3 +
        (b.abstractionLevel === 'concrete' ? 0.3 : 0);
      return scoreB - scoreA;
    })
    .slice(0, 7);

  // Collect questions for selected concepts
  const allQuestions: DiagnosticQuestion[] = [];

  foundationConcepts.forEach(concept => {
    const conceptQuestions = enhancedQuestions?.get(concept.id) || concept.diagnosticQuestions;

    // Limit to 1-2 questions per concept to keep diagnostic under 3 minutes
    const selectedQuestions = conceptQuestions.slice(0, 2);
    allQuestions.push(...selectedQuestions);
  });

  // Calculate metadata
  const totalTime = allQuestions.reduce((sum, q) => sum + q.expectedTime, 0);
  const avgComplexity = foundationConcepts.reduce((sum, c) => sum + c.complexityScore, 0) / foundationConcepts.length;

  const tierDistribution = foundationConcepts.reduce((dist, c) => {
    dist[c.tier] = (dist[c.tier] || 0) + 1;
    return dist;
  }, {} as Record<string, number>);

  return {
    concepts: foundationConcepts,
    questions: allQuestions,
    totalTime,
    metadata: {
      foundationCount: foundationConcepts.length,
      questionCount: allQuestions.length,
      avgComplexity: Math.round(avgComplexity * 10) / 10,
      tierDistribution
    }
  };
}

/**
 * Validate diagnostic assessment quality
 */
export function validateDiagnosticAssessment(assessment: ReturnType<typeof createDiagnosticAssessment>): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check concept count (5-7 optimal)
  if (assessment.concepts.length < 5) {
    issues.push(`Only ${assessment.concepts.length} foundation concepts, need at least 5`);
    recommendations.push('Ensure more concepts are marked as foundation level');
  }

  if (assessment.concepts.length > 7) {
    issues.push(`${assessment.concepts.length} concepts may cause cognitive overload`);
    recommendations.push('Consider reducing to 7 concepts for optimal cognitive load');
  }

  // Check time limit (should be under 3 minutes = 180 seconds)
  if (assessment.totalTime > 180) {
    issues.push(`Assessment takes ${Math.round(assessment.totalTime / 60)} minutes, exceeds 3-minute limit`);
    recommendations.push('Reduce questions per concept or select faster questions');
  }

  // Check question distribution
  if (assessment.questions.length < assessment.concepts.length) {
    issues.push('Some concepts have no diagnostic questions');
    recommendations.push('Ensure all foundation concepts have at least one diagnostic question');
  }

  // Check tier balance (should have some variety)
  const tierCount = Object.keys(assessment.metadata.tierDistribution).length;
  if (tierCount === 1) {
    issues.push('All concepts are from the same tier');
    recommendations.push('Include concepts from different tiers for better coverage');
  }

  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
}

// ============================================================================
// PRE-TESTING EFFECT
// ============================================================================

/**
 * Pre-test result with priming information
 * 
 * The pre-testing effect (also called "test-enhanced learning") shows that
 * attempting to retrieve information BEFORE learning primes the brain for
 * better encoding, even when the initial retrieval attempt fails.
 */
export interface PreTestResult {
  /** Questions to present before teaching */
  questions: DiagnosticQuestion[];
  /** Concept IDs that will be primed by this pre-test */
  primedConceptIds: string[];
  /** 
   * When to reveal correct answers:
   * - 'after_all_attempts': Show answers after all questions attempted (within session)
   * - 'after_learning': Show answers only after completing Learn phase
   * - 'never': Never show answers (pure priming, no feedback)
   */
  answerRevealTiming: 'after_all_attempts' | 'after_learning' | 'never';
  /** Learner's responses (filled during pre-test) */
  responses: Map<string, { selectedAnswer: number; wasCorrect?: boolean }>;
  /** Total expected time in seconds */
  estimatedTime: number;
  /** Whether all questions have been attempted */
  isComplete: boolean;
}

/**
 * Create a pre-test assessment that tests BEFORE teaching.
 * 
 * Research shows this "desirable difficulty" primes learning:
 * - Failed retrieval attempts create stronger encoding
 * - Learners become aware of knowledge gaps
 * - Curiosity is sparked for upcoming content
 * 
 * @param concepts All concepts in the learning session
 * @param options Configuration for pre-test behavior
 * @returns PreTestResult ready for presentation
 */
export function createPreTestAssessment(
  concepts: SensaAILearningConcept[],
  options: {
    /** How many concepts to pre-test (default: 5) */
    conceptCount?: number;
    /** When to reveal answers (default: 'after_learning') */
    answerRevealTiming?: PreTestResult['answerRevealTiming'];
    /** Questions per concept (default: 1) */
    questionsPerConcept?: number;
  } = {}
): PreTestResult {
  const {
    conceptCount = 5,
    answerRevealTiming = 'after_learning',
    questionsPerConcept = 1
  } = options;

  // Select foundation concepts prioritized by importance
  const foundationConcepts = concepts
    .filter(c => c.foundationLevel)
    .sort((a, b) => {
      // Prioritize by prerequisite weight (most foundational first)
      const scoreA = a.prerequisiteWeight * 0.5 + a.frequencyWeight * 0.3 +
        (a.abstractionLevel === 'concrete' ? 0.2 : 0);
      const scoreB = b.prerequisiteWeight * 0.5 + b.frequencyWeight * 0.3 +
        (b.abstractionLevel === 'concrete' ? 0.2 : 0);
      return scoreB - scoreA;
    })
    .slice(0, conceptCount);

  // Collect ONE question per concept for quick pre-test
  const preTestQuestions: DiagnosticQuestion[] = [];
  const primedConceptIds: string[] = [];

  foundationConcepts.forEach(concept => {
    primedConceptIds.push(concept.id);

    // Take first N questions (already validated during generation)
    const conceptQuestions = concept.diagnosticQuestions.slice(0, questionsPerConcept);
    preTestQuestions.push(...conceptQuestions);
  });

  // Calculate total expected time
  const estimatedTime = preTestQuestions.reduce((sum, q) => sum + q.expectedTime, 0);

  return {
    questions: preTestQuestions,
    primedConceptIds,
    answerRevealTiming,
    responses: new Map(),
    estimatedTime,
    isComplete: false
  };
}

/**
 * Record a response to a pre-test question.
 * Does NOT reveal correctness until appropriate timing.
 */
export function recordPreTestResponse(
  preTest: PreTestResult,
  questionId: string,
  selectedAnswer: number
): PreTestResult {
  const question = preTest.questions.find(q => q.id === questionId);
  if (!question) return preTest;

  // Record response WITHOUT correctness (stored for later reveal)
  preTest.responses.set(questionId, {
    selectedAnswer,
    wasCorrect: undefined // Will be revealed later
  });

  // Check if all questions attempted
  preTest.isComplete = preTest.responses.size === preTest.questions.length;

  return preTest;
}

/**
 * Reveal pre-test answers based on timing configuration.
 * Call this after learning phase to show learners what they got right/wrong.
 */
export function revealPreTestAnswers(preTest: PreTestResult): PreTestResult {
  if (preTest.answerRevealTiming === 'never') {
    return preTest; // Never reveal
  }

  // Reveal correctness for all responses
  preTest.questions.forEach(question => {
    const response = preTest.responses.get(question.id);
    if (response) {
      response.wasCorrect = response.selectedAnswer === question.correctAnswer;
    }
  });

  return preTest;
}

/**
 * Get pre-test statistics after reveal.
 */
export function getPreTestStats(preTest: PreTestResult): {
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  primedConcepts: string[];
} {
  let correct = 0;
  let incorrect = 0;

  preTest.responses.forEach(response => {
    if (response.wasCorrect !== undefined) {
      if (response.wasCorrect) correct++;
      else incorrect++;
    }
  });

  const attempted = correct + incorrect;

  return {
    attempted,
    correct,
    incorrect,
    accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
    primedConcepts: preTest.primedConceptIds
  };
}