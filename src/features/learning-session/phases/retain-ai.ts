/**
 * Verify Phase (Step 3c): Confirm Retention
 * 
 * AI-enhanced scoring for blank sheet tests:
 * - Compare user response to original concept map
 * - Generate personalized coach feedback
 * - Suggest optimal review timing (spacing)
 */
import type { LearningConcept } from '@/shared/types/learning';
import { getPersonaResponse, type PersonaId } from '@/shared/utils/persona';
export interface BlankSheetScore {
    conceptsRecalled: number;
    conceptsTotal: number;
    connectionsRecalled: number;
    connectionsTotal: number;
    labelsAccuracy: number;
    overallScore: number;
    strengthAreas: string[];
    focusAreas: string[];
}
export interface CoachFeedback {
    headline: string;
    message: string;
    encouragement: string;
    nextAction: string;
}
export interface SpacingRecommendation {
    nextReviewDate: Date;
    intervalDays: number;
    reasoning: string;
}
/**
 * Score a blank sheet test by comparing to original data
 */
export function scoreBlankSheet(
    responseText: string,
    concepts: LearningConcept[],
    originalConnections: Array<{ fromId: string; toId: string; label: string }>
): BlankSheetScore {
    const responseLower = responseText.toLowerCase();
    // Score concepts recalled
    let conceptsRecalled = 0;
    const strengthAreas: string[] = [];
    const focusAreas: string[] = [];
    for (const concept of concepts) {
        const conceptWords = concept.name.toLowerCase().split(/\s+/);
        const mainWord = conceptWords[0];
        if (responseLower.includes(mainWord) ||
            conceptWords.some(w => w.length > 4 && responseLower.includes(w))) {
            conceptsRecalled++;
            strengthAreas.push(concept.name);
        } else {
            focusAreas.push(concept.name);
        }
    }
    // Score connections recalled
    let connectionsRecalled = 0;
    let labelMatches = 0;
    for (const conn of originalConnections) {
        const fromConcept = concepts.find(c => c.id === conn.fromId);
        const toConcept = concepts.find(c => c.id === conn.toId);
        if (!fromConcept || !toConcept) continue;
        // Check if both concepts and relationship mentioned together
        const fromWord = fromConcept.name.toLowerCase().split(/\s+/)[0];
        const toWord = toConcept.name.toLowerCase().split(/\s+/)[0];
        if (responseLower.includes(fromWord) && responseLower.includes(toWord)) {
            connectionsRecalled++;
            // Check if label/relationship type mentioned
            if (conn.label && responseLower.includes(conn.label.toLowerCase())) {
                labelMatches++;
            }
        }
    }
    // Calculate scores
    const conceptScore = concepts.length > 0 ? (conceptsRecalled / concepts.length) * 100 : 0;
    const connectionScore = originalConnections.length > 0
        ? (connectionsRecalled / originalConnections.length) * 100 : 0;
    const labelsAccuracy = connectionsRecalled > 0
        ? (labelMatches / connectionsRecalled) * 100 : 0;
    // Overall weighted score
    const overallScore = Math.round(
        (conceptScore * 0.4) + (connectionScore * 0.4) + (labelsAccuracy * 0.2)
    );
    return {
        conceptsRecalled,
        conceptsTotal: concepts.length,
        connectionsRecalled,
        connectionsTotal: originalConnections.length,
        labelsAccuracy: Math.round(labelsAccuracy),
        overallScore,
        strengthAreas: strengthAreas.slice(0, 3),
        focusAreas: focusAreas.slice(0, 3)
    };
}
/**
 * Generate personalized coach feedback based on score
 */
export function generateCoachFeedback(
    score: BlankSheetScore,
    personaId: PersonaId
): CoachFeedback {
    const isGood = score.overallScore >= 70;
    const isOkay = score.overallScore >= 40;
    // Get persona-specific message
    const situation = isGood ? 'success' : isOkay ? 'encouragement' : 'struggle';
    const baseMessage = getPersonaResponse(personaId, 'retain', situation);
    // Generate headline based on score
    let headline: string;
    if (isGood) {
        headline = `${score.overallScore}% - Excellent Recall!`;
    } else if (isOkay) {
        headline = `${score.overallScore}% - Making Progress`;
    } else {
        headline = `${score.overallScore}% - Room to Grow`;
    }
    // Generate detail message
    let message: string;
    if (score.conceptsRecalled === score.conceptsTotal) {
        message = `You remembered all ${score.conceptsTotal} concepts!`;
    } else {
        message = `You recalled ${score.conceptsRecalled} of ${score.conceptsTotal} concepts.`;
    }
    if (score.connectionsRecalled > 0) {
        message += ` You identified ${score.connectionsRecalled} connections.`;
    }
    // Next action based on score
    let nextAction: string;
    if (score.focusAreas.length > 0) {
        nextAction = `Review these concepts: ${score.focusAreas.join(', ')}`;
    } else {
        nextAction = 'Great work! Move on to the next challenge.';
    }
    // Socratic Persona: Add reflective question
    if (personaId === 'socratic') {
        const reflectionTopic = score.focusAreas.length > 0 ? score.focusAreas[0] : score.strengthAreas[0];
        if (reflectionTopic) {
            const questions = [
                `Why is "${reflectionTopic}" essential to this system?`,
                `How does "${reflectionTopic}" connect to the bigger picture?`,
                `What would happen if "${reflectionTopic}" didn't exist?`
            ];
            const randomQ = questions[Math.floor(Math.random() * questions.length)];
            nextAction += ` Reflect: ${randomQ}`;
        }
    }
    return {
        headline,
        message,
        encouragement: baseMessage,
        nextAction
    };
}
/**
 * Calculate optimal spacing interval for next review
 */
export function calculateSpacing(
    score: BlankSheetScore,
    reviewCount: number
): SpacingRecommendation {
    // Base interval starts at 1 day
    let baseInterval = 1;
    // Increase interval based on success and review count
    if (score.overallScore >= 80) {
        baseInterval = Math.pow(2, Math.min(reviewCount, 5)); // 1, 2, 4, 8, 16, 32 days
    } else if (score.overallScore >= 60) {
        baseInterval = Math.pow(1.5, Math.min(reviewCount, 6)); // slower growth
    } else {
        baseInterval = 1; // Review again tomorrow
    }
    const intervalDays = Math.round(baseInterval);
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);
    let reasoning: string;
    if (intervalDays === 1) {
        reasoning = 'Review tomorrow to strengthen memory';
    } else if (intervalDays <= 3) {
        reasoning = 'Short interval to reinforce learning';
    } else if (intervalDays <= 7) {
        reasoning = 'Good progress - extending review interval';
    } else {
        reasoning = 'Strong retention - moving to maintenance mode';
    }
    return {
        nextReviewDate,
        intervalDays,
        reasoning
    };
}
/**
 * Get struggle celebration message (when struggling is good)
 */
export function getStruggleCelebration(personaId: PersonaId): string {
    return getPersonaResponse(personaId, 'retain', 'struggle');
}
