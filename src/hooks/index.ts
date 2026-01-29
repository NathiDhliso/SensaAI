/**
 * Hooks Index
 * 
 * Central export point for all custom React hooks.
 */

// Learning & Session
export { useFlowState } from './useFlowState';
export { useLearningFlow } from './useLearningFlow';
export { useSensaFlow } from './useSensaFlow';
export { useCountdownTimer } from './useCountdownTimer';

// Generation & Recovery
export { useGenerationEngine } from './useGenerationEngine';
export { useGenerationRecovery } from './useGenerationRecovery';
export { useBackgroundJobRecovery } from './useBackgroundJobRecovery';

// Content & Context
export { useContent } from './useContent';

// Voice & AI Coach
export { useVoice } from './useVoice';
export { useStruggleDetector } from './useStruggleDetector';
export type {
    StruggleState,
    StruggleDetectorConfig,
    StruggleReason,
    UseStruggleDetectorResult
} from './useStruggleDetector';

// UI & Interaction
export { useBionicReading } from './useBionicReading';
export { useClickOutside } from './useClickOutside';
export { useCollisionDetection } from './useCollisionDetection';
export { useEscapeKey } from './useEscapeKey';
export { useOrientationAwareZoom } from './useOrientationAwareZoom';
export { usePauseGlobalTimer } from './usePauseGlobalTimer';
export { useQuizKeyboard } from './useQuizKeyboard';
export { useResponsiveNodeSize } from './useResponsiveNodeSize';
