/**
 * Diagnostic Assessment Generator
 * 
 * Generates diagnostic questions for foundation concepts to enable
 * the SensaAI Learning Velocity Engine diagnostic-first learning approach.
 * 
 * Requirements: 1.2, 3.4, 3.5
 */

import { getBedrockClient, invokeClaudeModel, type BedrockConfig } from './claude-client';
import { UI_TIMINGS } from '@/constants/ui-constants';
import type { SensaAILearningConcept, DiagnosticQuestion } from '@/lib/content-adapter/transformer';

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
    console.warn('[DiagnosticGenerator] No foundation concepts found for diagnostic generation');
    return questionMap;
  }

  console.log(`[DiagnosticGenerator] Generating questions for ${foundationConcepts.length} foundation concepts`);

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

  console.log('[DiagnosticGenerator] Calling Claude API for batch generation...');

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
        const validatedQuestions = conceptQuestions.map((q: any, index: number) => ({
          id: q.id || `diag-${concept.id}-${index + 1}`,
          question: q.question || `What is the purpose of ${concept.name}?`,
          type: ['multiple-choice', 'true-false', 'short-answer'].includes(q.type)
            ? q.type as 'multiple-choice' | 'true-false' | 'short-answer'
            : 'multiple-choice',
          options: Array.isArray(q.options) ? q.options : undefined,
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          expectedTime: typeof q.expectedTime === 'number' ? q.expectedTime : 30,
          keyPoints: Array.isArray(q.keyPoints) ? q.keyPoints : [concept.hookSentence],
          rationale: q.rationale || 'Tests existing knowledge of concept'
        }));

        questionMap.set(concept.id, validatedQuestions);
      } else {
        // Fallback to built-in questions
        questionMap.set(concept.id, concept.diagnosticQuestions);
      }
    });

    console.log(`[DiagnosticGenerator] Successfully generated questions for ${questionMap.size} concepts`);
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