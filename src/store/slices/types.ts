/**
 * Shared types for Zustand slices
 * This file defines the state and action types that are shared across slices
 */

import type {
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
} from '@/lib/types/learning';

// ============================================================================
// SHARED TYPES
// ============================================================================

/**
 * Metadata about the generated content source.
 */
export type ContentMetadata = {
  domain: string;
  role: string;
  source: string;
  conceptCount: number;
  foundationConcepts?: number;
  diagnosticReady?: boolean;
  metadataCompleteness?: number;
  fullDocument?: string;
};

/**
 * Cognitive load tracking for adaptive learning.
 */
export type CognitiveMetrics = {
  currentLoad: number;
  consecutiveCorrect: number;
  consecutiveErrors: number;
  avgResponseTimeMs: number;
  lastInteractionTime: number;
  conceptsThisSession: number;
  needsReset: boolean;
};

/**
 * Focus session concept timing tracking
 */
export type ConceptTiming = {
  conceptId: string;
  conceptName: string;
  startTime: number;
  endTime: number | null;
  durationSeconds: number;
  completed: boolean;
};

/**
 * Pace rating based on reading time vs target
 */
export type PaceRating = 'optimal' | 'good' | 'warning' | 'overtime';

/**
 * Session summary for display in modal
 */
export type SessionSummary = {
  duration: number;
  conceptsCount: number;
  conceptsCompleted: number;
  avgPaceSeconds: number;
  paceRating: PaceRating;
  conceptTimings: ConceptTiming[];
  recommendation: string;
};

/**
 * Current learning session - single source of truth for active content
 */
export interface CurrentSession {
  id: string;
  subjectId: string;
  subject: string;
  mode: 'learn' | 'explore';
  createdAt: string;
  stages: LearningStage[];
  concepts: LearningConcept[];
  metadata: ContentMetadata | null;
  progress: UserProgress;
  cognitiveMetrics: CognitiveMetrics;
}

/**
 * SensaAI Diagnostic Session
 */
export interface DiagnosticSession {
  id: string;
  startedAt: string;
  completedAt?: string;
  timeLimitSeconds: number;
  knownConcepts: string[];
  knowledgeGaps: string[];
  confidenceScores: Record<string, number>;
  canSkipFoundation: boolean;
  isComplete: boolean;
}

/**
 * Learning Profile
 */
export type LearningProfile = {
  onboardingCompleted: boolean;
};

// ============================================================================
// SLICE STATE TYPES
// ============================================================================

export type SessionSliceState = {
  currentSession: CurrentSession | null;
  sessionTimer: ReturnType<typeof setInterval> | null;
};

export type SessionSliceActions = {
  loadSession: (session: Omit<CurrentSession, 'id' | 'createdAt' | 'progress' | 'cognitiveMetrics'> & {
    progress?: UserProgress;
    cognitiveMetrics?: CognitiveMetrics;
  }) => void;
  updateSessionProgress: (progress: Partial<UserProgress>) => void;
  setSessionMode: (mode: CurrentSession['mode']) => void;
  clearSession: () => void;
  getSession: () => CurrentSession | null;
  getStages: () => LearningStage[];
  getConcepts: () => LearningConcept[];
  hasCustomContent: () => boolean;
  startSession: () => void;
  endSession: () => void;
};

export type DiagnosticSliceState = {
  diagnosticSession: DiagnosticSession | null;
};

export type DiagnosticSliceActions = {
  startDiagnostic: () => void;
  completeDiagnostic: (results: {
    knownConcepts: string[];
    knowledgeGaps: string[];
    confidenceScores: Record<string, number>;
    canSkipFoundation: boolean;
  }) => void;
  clearDiagnostic: () => void;
  getDiagnosticSession: () => DiagnosticSession | null;
};

export type StudySliceState = {
  studySession: StudySession | null;
  showSessionModal: boolean;
};

export type StudySliceActions = {
  startStudySession: (goal: StudyGoal, duration: number, targetConcepts?: string[], primer?: SessionPrimer | null) => void;
  setSessionPrimer: (primer: SessionPrimer) => void;
  markSessionScouted: () => void;
  markSessionPreviewed: () => void;
  markSessionMapBuilt: (data?: ConceptMapData) => void;
  markSessionMapReconstructed: (passed: boolean) => void;
  markSessionMastered: () => void;
  savePrediction: (conceptId: string, prediction: string) => void;
  updateStudyMetrics: (metrics: Partial<EnhancedCognitiveMetrics>) => void;
  completeStudySessionConcept: (conceptId: string, phase?: LifecyclePhaseKey) => void;
  recordConfusionDrill: (passed: boolean) => void;
  recordBreak: () => void;
  setShowSessionModal: (show: boolean) => void;
  getStudySessionStats: () => {
    elapsedMinutes: number;
    conceptsCompleted: number;
    goalProgress: number;
  } | null;
};

export type NavigationSliceActions = {
  completeConcept: (conceptId: string) => void;
  setCurrentConcept: (conceptId: string) => void;
  getConceptStatus: (conceptId: string) => 'locked' | 'available' | 'current' | 'completed';
  getStageStatus: (stageId: string) => 'locked' | 'available' | 'current' | 'completed';
  getNextConcept: () => string | null;
  getPreviousConcept: () => string | null;
  canAccessConcept: (conceptId: string) => boolean;
  resetProgress: () => void;
};

export type CognitiveSliceState = {
  showNeuralReset: boolean;
};

export type CognitiveSliceActions = {
  recordInteraction: (correct: boolean, responseTimeMs: number) => void;
  triggerNeuralReset: () => void;
  dismissNeuralReset: () => void;
  resetCognitiveLoad: () => void;
  getCognitiveLoadLevel: () => 'low' | 'optimal' | 'high' | 'overload';
};

export type FocusSliceState = {
  isSessionActive: boolean;
  isPaused: boolean;
  sessionType: 'focus' | 'break';
  focusDurationMinutes: number;
  breakDurationMinutes: number;
  timeRemainingSeconds: number;
  focusSessionStartTime: number | null;
  currentFocusConceptId: string | null;
  currentFocusConceptStartTime: number | null;
  conceptTimings: ConceptTiming[];
  totalSessionsCompleted: number;
  totalFocusMinutes: number;
  totalConceptsMastered: number;
  sessionsUntilLongBreak: number;
  showSessionSummary: boolean;
  lastSessionSummary: SessionSummary | null;
};

export type FocusSliceActions = {
  startFocusSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endFocusSession: () => void;
  startBreak: () => void;
  skipToBreak: () => void;
  tick: () => void;
  setFocusDuration: (minutes: number) => void;
  setBreakDuration: (minutes: number) => void;
  recordConceptStart: (conceptId: string, conceptName: string) => void;
  recordConceptEnd: (conceptId: string, completed: boolean) => void;
  getSessionSummary: () => SessionSummary;
  dismissSessionSummary: () => void;
  getFormattedTimeRemaining: () => string;
  getProgressPercent: () => number;
  getConceptsThisSession: () => number;
  getAvgPaceThisSession: () => number;
  getPaceRating: (avgSeconds: number) => PaceRating;
};

export type UISliceState = {
  showCelebration: boolean;
  celebrationData: CelebrationData | null;
  isExploreMode: boolean;
  learningProfile: LearningProfile;
};

export type UISliceActions = {
  triggerCelebration: (data: CelebrationData) => void;
  dismissCelebration: () => void;
  toggleExploreMode: () => void;
  setLearningProfile: (profile: Partial<LearningProfile>) => void;
};

// ============================================================================
// COMBINED STORE TYPE
// ============================================================================

export type LearningState = SessionSliceState &
  DiagnosticSliceState &
  StudySliceState &
  CognitiveSliceState &
  FocusSliceState &
  UISliceState;

export type LearningActions = SessionSliceActions &
  DiagnosticSliceActions &
  StudySliceActions &
  NavigationSliceActions &
  CognitiveSliceActions &
  FocusSliceActions &
  UISliceActions;

export type LearningStore = LearningState & LearningActions;

// Re-export learning types for convenience
export type {
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
};
