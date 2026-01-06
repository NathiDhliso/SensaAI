/**
 * Sprint Generator
 * 
 * Generates yes/no binary decision questions to test pattern recognition
 * and automaticity - the key skill for exam success.
 */

import { getBedrockClient, invokeClaudeModel, type BedrockConfig } from './claude-client';
import { SPRINT_CONFIG } from '@/constants/ui-constants';
import type { SprintQuestion, SprintResult, SprintAnswer } from '@/lib/types/sprint';
import type { LearningConcept } from '@/lib/types/learning';

const SPRINT_SYSTEM_PROMPT = `You are an exam preparation expert. Generate binary yes/no questions that test pattern recognition and automatic recall.

RULES:
1. Questions must be answerable in under 6 seconds with a YES or NO
2. Questions test PATTERN RECOGNITION, not obscure details
3. Questions should be scenario-based where possible
4. Include a brief explanation for why the answer is yes or no
5. Tag each question with relevant concept IDs

QUESTION CATEGORIES:
- "core": Tests fundamental understanding of a single concept
- "discrimination": Tests ability to distinguish between similar concepts
- "application": Tests when/where/how to apply a concept

OUTPUT FORMAT (JSON array):
[
  {
    "id": "s1",
    "question": "Would you use a Load Balancer to distribute traffic between different AWS REGIONS?",
    "correctAnswer": false,
    "explanation": "No - Load Balancers work within a region. For cross-region traffic, use Route 53 or Global Accelerator.",
    "conceptTags": ["load-balancer", "route53"],
    "category": "application"
  }
]`;

/**
 * Generate sprint questions based on learned concepts
 */
export async function generateSprintQuestions(
    concepts: LearningConcept[],
    subject: string,
    config: BedrockConfig
): Promise<SprintQuestion[]> {
    const { core, discrimination, application } = SPRINT_CONFIG.DISTRIBUTION;

    // Extract concept data with mnemonics for context
    const conceptContext = concepts.map(c => {
        const mnemonicInfo = c.mnemonic
            ? ` (Mnemonic: ${c.mnemonic.anchor} - ${c.mnemonic.story})`
            : '';
        return `- ${c.name}${mnemonicInfo}`;
    }).join('\n');

    console.log('Sprint Generator: Starting generation for', concepts.length, 'concepts');
    console.log('Sprint Generator: Config region:', config.region);

    const prompt = `Generate exactly ${SPRINT_CONFIG.QUESTION_COUNT} binary YES/NO questions for testing automaticity in: "${subject}"

The learner has studied these concepts (with their memory palace analogies):
${conceptContext}

Distribution:
- ${core} CORE questions (test single concept understanding)
- ${discrimination} DISCRIMINATION questions (distinguish similar concepts)  
- ${application} APPLICATION questions (when/where to use concepts)
- IMPORTANT: Include questions that reference the Mnemonics/Analogies explicitly to reinforce the memory palace connection (e.g., "In our story, does the [Anchor] represent [Concept]?").

Questions should:
1. Be answerable in 6 seconds or less
2. Test pattern recognition and mnemonic association
3. Use realistic scenarios where applicable
4. Have clear, unambiguous yes/no answers
5. Use child-friendly language matching the analogies

Return ONLY the JSON array, no other text.`;

    const client = await getBedrockClient(config);
    const messages = [{ role: 'user' as const, content: prompt }];

    console.log('Sprint Generator: Calling Bedrock API...');

    try {
        const response = await invokeClaudeModel(
            client,
            messages,
            SPRINT_SYSTEM_PROMPT
        );

        console.log('Sprint Generator: Received response, length:', response.length);

        // Extract JSON from response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('Sprint Generator: No JSON array in response:', response.substring(0, 500));
            throw new Error('No JSON array found in response');
        }

        const questions: SprintQuestion[] = JSON.parse(jsonMatch[0]);

        // Validate structure
        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('Invalid questions array');
        }

        console.log('Sprint Generator: Successfully parsed', questions.length, 'questions');

        // Validate and normalize each question
        return questions.map((q, index) => ({
            id: q.id || `s${index + 1}`,
            question: q.question,
            correctAnswer: Boolean(q.correctAnswer),
            explanation: q.explanation || 'No explanation provided.',
            conceptTags: Array.isArray(q.conceptTags) ? q.conceptTags : [],
            category: ['core', 'discrimination', 'application'].includes(q.category)
                ? q.category as 'core' | 'discrimination' | 'application'
                : 'core',
        }));
    } catch (error) {
        console.error('Sprint Generator: Error:', error);

        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes('AccessDenied') || error.message.includes('credentials')) {
                throw new Error('AWS credentials invalid or expired. Please update in Settings.');
            }
            if (error.message.includes('ResourceNotFoundException') || error.message.includes('model')) {
                throw new Error('Claude model not available. Check AWS region settings.');
            }
            if (error.message.includes('ThrottlingException')) {
                throw new Error('API rate limited. Please wait a moment and try again.');
            }
            if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
                throw new Error('Request timed out. Check your network connection.');
            }
            throw new Error(`Generation failed: ${error.message}`);
        }
        throw new Error('Failed to generate sprint questions. Please try again.');
    }
}

/**
 * Calculate sprint result from answers
 */
export function calculateSprintResult(
    questions: SprintQuestion[],
    answers: SprintAnswer[]
): SprintResult {
    const correctAnswers = answers.filter(a => a.correct).length;
    const timeoutAnswers = answers.filter(a => a.userAnswer === null).length;

    // Calculate automaticity score (penalize slow answers and timeouts)
    const fastThresholdMs = 4000;  // Under 4 seconds = automatic recall
    const fastCorrectCount = answers.filter(
        a => a.correct && a.responseTimeMs < fastThresholdMs
    ).length;

    // Score formula: weight fast correct answers higher
    const automaticityScore = Math.round(
        ((fastCorrectCount * 1.5) + (correctAnswers - fastCorrectCount)) /
        (questions.length * 1.5) * 100
    );

    // Category breakdown
    const categoryBreakdown = {
        core: { correct: 0, total: 0 },
        discrimination: { correct: 0, total: 0 },
        application: { correct: 0, total: 0 },
    };

    questions.forEach((q, index) => {
        categoryBreakdown[q.category].total++;
        if (answers[index]?.correct) {
            categoryBreakdown[q.category].correct++;
        }
    });

    // Identify weak concepts (answered wrong or timed out)
    const weakConceptSet = new Set<string>();
    answers.forEach((answer, index) => {
        if (!answer.correct) {
            questions[index].conceptTags.forEach(tag => weakConceptSet.add(tag));
        }
    });

    // Calculate average response time (excluding timeouts)
    const validResponses = answers.filter(a => a.userAnswer !== null);
    const avgResponseTimeMs = validResponses.length > 0
        ? Math.round(validResponses.reduce((sum, a) => sum + a.responseTimeMs, 0) / validResponses.length)
        : 0;

    // Exam readiness: 70%+ automaticity score
    const examReady = automaticityScore >= 70;

    return {
        totalQuestions: questions.length,
        correctAnswers,
        timeoutAnswers,
        avgResponseTimeMs,
        automaticityScore: Math.min(100, Math.max(0, automaticityScore)),
        categoryBreakdown,
        weakConcepts: Array.from(weakConceptSet),
        examReady,
        completedAt: new Date().toISOString(),
    };
}

/**
 * Get recommendation based on sprint result
 */
export function getSprintRecommendation(result: SprintResult): {
    message: string;
    action: 'celebrate' | 'review' | 'retry';
} {
    if (result.automaticityScore >= 85) {
        return {
            message: "Outstanding! Your pattern recognition is automatic. You're exam-ready!",
            action: 'celebrate',
        };
    }

    if (result.automaticityScore >= 70) {
        return {
            message: "Great job! You've achieved exam-ready status. Consider reviewing weak areas for perfection.",
            action: 'celebrate',
        };
    }

    if (result.automaticityScore >= 50) {
        return {
            message: "Good progress! Review your weak concepts and try one more sprint for full readiness.",
            action: 'review',
        };
    }

    return {
        message: "Keep going! Focus on the flagged concepts and then retry the sprint.",
        action: 'retry',
    };
}
