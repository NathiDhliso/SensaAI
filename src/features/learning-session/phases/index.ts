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
