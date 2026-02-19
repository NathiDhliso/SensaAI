/**
 * Phase AI Modules Index
 * 
 * Export all phase-specific AI functionality.
 */
export {
    suggestConnections,
    detectGaps,
    validateConnectionLabel,
    getBuildCoachMessage,
    type ConnectionSuggestion,
    type GapDetection,
    type LabelValidation
} from './build-ai';
export {
    scoreConceptMap,
    getScoreCoachMessage,
    type MapScore,
    type MapScoreBreakdown
} from './score-map';

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

export function generateCoachFeedback(score: BlankSheetScore, _personaId?: string): CoachFeedback {
    const pct = score.overallScore;
    if (pct >= 80) {
        return {
            headline: 'Strong recall!',
            message: `You recalled ${score.conceptsRecalled} of ${score.conceptsTotal} key points.`,
            encouragement: 'Your memory encoding is working well.',
            nextAction: 'Move on to the next concept or try a harder challenge.'
        };
    }
    if (pct >= 60) {
        return {
            headline: 'Good effort',
            message: `You recalled ${score.conceptsRecalled} of ${score.conceptsTotal} key points.`,
            encouragement: 'You are building solid foundations.',
            nextAction: `Review: ${score.focusAreas.slice(0, 2).join(', ') || 'the missed points'}.`
        };
    }
    return {
        headline: 'Keep practising',
        message: `You recalled ${score.conceptsRecalled} of ${score.conceptsTotal} key points.`,
        encouragement: 'Every attempt strengthens the memory trace.',
        nextAction: `Focus on: ${score.focusAreas.slice(0, 2).join(', ') || 'the core concepts'}.`
    };
}
