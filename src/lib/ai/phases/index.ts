/**
 * Phase AI Modules Index
 * 
 * Export all phase-specific AI functionality.
 */

// Phase 1.5: Problem Preview
export {
    generatePracticeQuestions,
    extractPrerequisites,
    getPreviewCoachMessage,
    generatePreviewAnalysis,
    type PracticeQuestion,
    type PreviewAnalysis,
} from './preview-ai';

// Phase 2: Build the Web
export {
    suggestConnections,
    detectGaps,
    validateConnectionLabel,
    getBuildCoachMessage,
    type ConnectionSuggestion,
    type GapDetection,
    type LabelValidation,
} from './build-ai';

// Phase 3: Keep It Strong
export {
    scoreBlankSheet,
    generateCoachFeedback,
    calculateSpacing,
    getStruggleCelebration,
    type BlankSheetScore,
    type CoachFeedback,
    type SpacingRecommendation,
} from './retain-ai';
