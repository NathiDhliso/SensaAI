// Shared utilities and types
// Reusable across all features

// Note: This is a barrel export file for convenience
// Import directly from specific files to avoid circular dependencies

// API
export * from './api';

// Utils (export before types to avoid conflicts)
export * from './utils/utils';
export * from './utils/score-utils';
export * from './utils/toast';
export * from './utils/alias-generator';
export * from './utils/subject-domain-detector';
export * from './utils/performance';
export * from './utils/content-loader';
export * from './utils/context-optimizer';

// Layout utils (has TierType)
export { 
  calculateNodeSize, 
  getScreenOrientation, 
  type ScreenOrientation 
} from './utils/layout-utils';

// Types (use type-only exports to avoid conflicts)
export type { 
  LearningConcept,
  LearningStage,
  LifecyclePhaseKey,
  UserProgress,
  StudySession,
  ConceptMapData,
  DependencyMetrics,
  DependencyEdge,
  SubjectGraph
} from './types/learning';

export type {
  ConfusionPair,
  ConfusionDrillResult
} from './types/confusion';

export type {
  TierDistribution
} from './types/content-analytics';

export type {
  Pass1Result,
  PassStatus,
  ValidationResult,
  GenerationResult,
  ProgressCallback
} from './types/generation';

export type {
  SensaPhase,
  DependencyGraph,
  EquationMetadata
} from './types/sensa-flow';

export type {
  ConceptSchema
} from './types/concept-schema';

// Hooks (some export types that conflict)
export * from './hooks/useBackgroundJobRecovery';
export * from './hooks/useBionicReading';
export * from './hooks/useClickOutside';
export * from './hooks/useCollisionDetection';
export * from './hooks/useContent';
export * from './hooks/useCountdownTimer';
export * from './hooks/useEscapeKey';
export * from './hooks/useFlowState';
export * from './hooks/useGenerationEngine';
export * from './hooks/useGenerationRecovery';
export * from './hooks/useLearningFlow';
export * from './hooks/useOrientationAwareZoom';
export * from './hooks/usePauseGlobalTimer';
export * from './hooks/useQuizKeyboard';
export * from './hooks/useResponsiveNodeSize';

// useSensaFlow exports SensaFlowState which conflicts
export { useSensaFlow } from './hooks/useSensaFlow';

// Constants
export * from './constants/app-config';
export * from './constants/learning-content';
export * from './constants/learning-science';
export * from './constants/sensa-flow-constants';
export * from './constants/storage-keys';
export * from './constants/theme-colors';
export * from './constants/ui-constants';
export * from './constants/z-index';

// Services
export * from './services/audio';
export * from './services/AudioService';
