export { default as JourneyMap } from './JourneyMap';
export { default as ConceptCard } from './ConceptCard';
export { default as CelebrationModal } from './CelebrationModal';
export { LearningToolbar, FocusTimer, ProgressAnalytics, QuickQuiz } from './LearningToolbar';
export { default as CognitiveGauge } from './CognitiveGauge';
export { default as NeuralResetBanner } from './NeuralResetModal';
export { default as ConfusionDrill } from './ConfusionDrill';
export { UnifiedSessionBar } from './UnifiedSessionBar';
export { SessionSummary } from './SessionSummary';
export { LifecycleFlow, LifecyclePhaseStep } from './LifecyclePhaseStep';
export { LifecycleNavigator } from './LifecycleNavigator';
export type { LifecycleLabels, PhaseProgress, LifecycleNavigatorProps } from './LifecycleNavigator';
export { ConceptChunks } from './ConceptChunks';
export type { ConceptChunksProps } from './ConceptChunks';

// SENSA Phase 3: Study - Prerequisite Gates
export { PrerequisiteCheck, usePrerequisiteCheck } from './PrerequisiteCheck';

// Phase 5: Session Start Modal
export { SessionStartModal } from './SessionStartModal';

// SensaAI Learning Velocity Engine: Diagnostic Launch System
export { DiagnosticLaunchSystem } from './DiagnosticLaunchSystem';
export type { DiagnosticLaunchSystemProps, DiagnosticResults } from './DiagnosticLaunchSystem';

// SensaAI Learning Velocity Engine: Micro-Learning Loop Controller
export { MicroLearningLoopController } from './MicroLearningLoopController';
export type { MicroLearningLoopProps, LoopPhase, LoopOutcome } from './MicroLearningLoopController';

// SensaAI Learning Velocity Engine: Blank Sheet Test
export { BlankSheetTest } from './BlankSheetTest';
export type { BlankSheetTestProps, BlankSheetResult, TypingMetrics } from './BlankSheetTest';

// SensaAI Learning Velocity Engine: Velocity Dashboard
export { VelocityDashboard } from './VelocityDashboard';
export type { VelocityMetrics, RetentionMetrics, OptimalAction, VelocityDashboardProps } from './VelocityDashboard';

// SensaAI Learning Velocity Engine: Confusion Prevention
export { ConfusionPrevention, findConfusionPairs } from './ConfusionPrevention';
export type { ConfusionPair, ConfusionDrillResult, ConfusionPreventionProps } from './ConfusionPrevention';

// SensaAI Learning Velocity Engine: Session Goal Manager
export { SessionGoalManager } from './SessionGoalManager';
export type { SessionGoalType, SessionGoal, SessionGoalManagerProps } from './SessionGoalManager';

// SensaAI Learning Velocity Engine: Onboarding Flow
export { OnboardingFlow, HelpTooltip, LEARNING_SCIENCE } from './OnboardingFlow';
export type { OnboardingStep, OnboardingFlowProps, HelpTooltipProps } from './OnboardingFlow';
