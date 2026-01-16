/**
 * Slices Index - Re-exports all slice creators and types
 */

// Slice creators
export { createSessionSlice, getInitialProgress, getDefaultCognitiveMetrics } from './createSessionSlice';
export { createDiagnosticSlice } from './createDiagnosticSlice';
export { createStudySlice, getDefaultEnhancedMetrics } from './createStudySlice';
export { createNavigationSlice } from './createNavigationSlice';
export { createCognitiveSlice } from './createCognitiveSlice';
export { createFocusSlice, getInitialFocusSessionState } from './createFocusSlice';
export { createUISlice } from './createUISlice';

// Types
export type {
  // Shared types
  ContentMetadata,
  CognitiveMetrics,
  ConceptTiming,
  PaceRating,
  SessionSummary,
  CurrentSession,
  DiagnosticSession,
  LearningProfile,
  // Slice types
  SessionSliceState,
  SessionSliceActions,
  DiagnosticSliceState,
  DiagnosticSliceActions,
  StudySliceState,
  StudySliceActions,
  NavigationSliceActions,
  CognitiveSliceState,
  CognitiveSliceActions,
  FocusSliceState,
  FocusSliceActions,
  UISliceState,
  UISliceActions,
  // Combined types
  LearningState,
  LearningActions,
  LearningStore,
  // Re-exported learning types
  UserProgress,
  CelebrationData,
  LearningStage,
  LearningConcept,
  StudySession,
  StudyGoal,
  LifecyclePhaseKey,
  EnhancedCognitiveMetrics,
  SessionPrimer,
  ConceptMapData,
} from './types';
