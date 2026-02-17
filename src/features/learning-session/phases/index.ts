/**
 * Phase AI Modules Index
 * 
 * Export all phase-specific AI functionality.
 */
// Step 3a: Test (Predict & Expose Gaps)
export {
    generatePracticeQuestions,
    extractPrerequisites,
    getPreviewCoachMessage,
    generatePreviewAnalysis,
    type PracticeQuestion,
    type PreviewAnalysis
} from './preview-ai';
// Step 3b: Encode (Build Understanding)
export {
    suggestConnections,
    detectGaps,
    validateConnectionLabel,
    getBuildCoachMessage,
    type ConnectionSuggestion,
    type GapDetection,
    type LabelValidation
} from './build-ai';
// Step 3c: Verify (Confirm Retention)
export {
    scoreBlankSheet,
    generateCoachFeedback,
    calculateSpacing,
    getStruggleCelebration,
    type BlankSheetScore,
    type CoachFeedback,
    type SpacingRecommendation
} from './retain-ai';
// Map Scoring (Build Phase Validation)
export {
    scoreConceptMap,
    getScoreCoachMessage,
    type MapScore,
    type MapScoreBreakdown
} from './score-map';
