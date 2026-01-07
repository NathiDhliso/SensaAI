import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FOCUS_SESSION_CONFIG, UI_TIMINGS } from '@/constants/ui-constants';
import { STORAGE_KEYS } from '@/constants/storage-keys';
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
// TYPES
// ============================================================================

/**
 * Metadata about the generated content source.
 * Extended with SensaAI Learning Velocity Engine readiness fields.
 */
export type ContentMetadata = {
  domain: string;
  role: string;
  source: string;
  conceptCount: number;
  // SensaAI Learning Velocity Engine fields
  foundationConcepts?: number;        // Count of foundation-level concepts eligible for diagnostics
  diagnosticReady?: boolean;          // True if enough foundation concepts for diagnostic assessments
  metadataCompleteness?: number;      // 0-100% - completeness of learning metadata for velocity engine
  fullDocument?: string;              // Raw generated document for reference tab
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

  // Content
  stages: LearningStage[];
  concepts: LearningConcept[];
  metadata: ContentMetadata | null;

  // Progress
  progress: UserProgress;



  // Cognitive Metrics
  cognitiveMetrics: CognitiveMetrics;
}

/**
 * SensaAI Diagnostic Session - tracks diagnostic assessment state
 * Used by the Learning Velocity Engine for diagnostic-first learning flow
 */
export interface DiagnosticSession {
  /** Unique session ID */
  id: string;
  /** When diagnostic started */
  startedAt: string;
  /** When diagnostic completed */
  completedAt?: string;
  /** Total time limit in seconds (3 minutes default) */
  timeLimitSeconds: number;
  /** Concepts that were correctly identified as known */
  knownConcepts: string[];
  /** Concepts identified as knowledge gaps */
  knowledgeGaps: string[];
  /** Confidence scores per concept (1-5) */
  confidenceScores: Record<string, number>;
  /** Whether learner can skip foundation content */
  canSkipFoundation: boolean;
  /** Whether assessment is complete */
  isComplete: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getDefaultEnhancedMetrics = (): EnhancedCognitiveMetrics => ({
  currentLoad: 30,
  consecutiveCorrect: 0,
  consecutiveErrors: 0,
  avgResponseTimeMs: 0,
  phaseLoadBalance: { prepare: 0, model: 0, deliver: 0 },
  confusionDrillAccuracy: 0,
  conceptRevisits: 0,
  uninterruptedConceptStreak: 0,
  averageConceptTime: 0,
  flowStateMinutes: 0,
});



const createStudySession = (
  subjectId: string,
  goal: StudyGoal,
  targetDuration: number,
  targetConcepts: string[] = [],
  targetPhases: LifecyclePhaseKey[] = ['phase1', 'phase2', 'phase3']
): StudySession => ({
  id: `study-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  subjectId,
  startedAt: new Date().toISOString(),
  goal,
  targetConcepts,
  targetPhases,
  targetDuration,
  conceptsCompleted: [],
  phasesCompleted: {},
  confusionDrillsCompleted: 0,
  metrics: getDefaultEnhancedMetrics(),
  breaksTaken: 0,
  isActive: true,
  goalAchieved: false,
  // SENSA Phase 0: See
  primer: null,
  // SENSA Phase 1: Explore
  scouted: false,
  // SENSA Explore+
  previewed: false,
  // SENSA Phase 2: Note
  mapBuilt: false,
  conceptMap: null,
  mapReconstructed: false,
  mastered: false,
  // Step 3: The Guess (Priming)
  predictions: {},
});

const getInitialProgress = (stages: LearningStage[], concepts: LearningConcept[]): UserProgress => {
  const firstStage = stages[0];
  const firstConcept = concepts.find(c => c.stageId === firstStage?.id && c.order === 1) || concepts[0];

  return {
    currentStageId: firstStage?.id || '',
    currentConceptId: firstConcept?.id || '',
    completedConcepts: [],
    completedStages: [],
    conceptsLearnedToday: 0,
    lastSessionDate: new Date().toISOString().split('T')[0],
    totalTimeSpentMinutes: 0,
    sessionStartTime: null,
  };
};

const generateSessionId = (): string => {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const getDefaultCognitiveMetrics = (): CognitiveMetrics => ({
  currentLoad: 30,
  consecutiveCorrect: 0,
  consecutiveErrors: 0,
  avgResponseTimeMs: 0,
  lastInteractionTime: Date.now(),
  conceptsThisSession: 0,
  needsReset: false,
});

const getInitialFocusSessionState = () => ({
  isSessionActive: false,
  isPaused: false,
  sessionType: 'focus' as const,
  focusDurationMinutes: FOCUS_SESSION_CONFIG.DEFAULT_FOCUS_MINUTES,
  breakDurationMinutes: FOCUS_SESSION_CONFIG.DEFAULT_BREAK_MINUTES,
  timeRemainingSeconds: FOCUS_SESSION_CONFIG.DEFAULT_FOCUS_MINUTES * 60,
  focusSessionStartTime: null as number | null,
  currentFocusConceptId: null as string | null,
  currentFocusConceptStartTime: null as number | null,
  conceptTimings: [] as ConceptTiming[],
  totalSessionsCompleted: 0,
  totalFocusMinutes: 0,
  totalConceptsMastered: 0,
  sessionsUntilLongBreak: FOCUS_SESSION_CONFIG.SESSIONS_UNTIL_LONG_BREAK,
  showSessionSummary: false,
  lastSessionSummary: null as SessionSummary | null,
});

// ============================================================================
// STATE TYPE
// ============================================================================

type LearningState = {
  // Current Learning Session
  currentSession: CurrentSession | null;

  // Study Session (Phase 5)
  studySession: StudySession | null;
  showSessionModal: boolean;

  // SensaAI Diagnostic Session
  diagnosticSession: DiagnosticSession | null;

  // UI State
  showCelebration: boolean;
  celebrationData: CelebrationData | null;
  showNeuralReset: boolean;
  isExploreMode: boolean;

  sessionTimer: ReturnType<typeof setInterval> | null;

  // Focus Session State (merged from focus-session-store)
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

// ============================================================================
// ACTIONS TYPE
// ============================================================================

type LearningActions = {
  // Session Actions
  loadSession: (session: Omit<CurrentSession, 'id' | 'createdAt' | 'progress' | 'cognitiveMetrics'> & {
    progress?: UserProgress;
    cognitiveMetrics?: CognitiveMetrics;
  }) => void;
  updateSessionProgress: (progress: Partial<UserProgress>) => void;
  setSessionMode: (mode: CurrentSession['mode']) => void;
  clearSession: () => void;
  getSession: () => CurrentSession | null;

  // Diagnostic Session Actions (SensaAI Learning Velocity Engine)
  startDiagnostic: () => void;
  completeDiagnostic: (results: {
    knownConcepts: string[];
    knowledgeGaps: string[];
    confidenceScores: Record<string, number>;
    canSkipFoundation: boolean;
  }) => void;
  clearDiagnostic: () => void;
  getDiagnosticSession: () => DiagnosticSession | null;

  // Study Session Actions
  startStudySession: (goal: StudyGoal, duration: number, targetConcepts?: string[]) => void;
  setSessionPrimer: (primer: SessionPrimer) => void;
  markSessionScouted: () => void;
  markSessionPreviewed: () => void;
  markSessionMapBuilt: (data?: ConceptMapData) => void;
  markSessionMapReconstructed: (passed: boolean) => void;
  markSessionMastered: () => void;
  savePrediction: (conceptId: string, prediction: string) => void;

  // Progress
  completeConcept: (conceptId: string) => void;
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

  // Concept Navigation
  setCurrentConcept: (conceptId: string) => void;
  getConceptStatus: (conceptId: string) => 'locked' | 'available' | 'current' | 'completed';
  getStageStatus: (stageId: string) => 'locked' | 'available' | 'current' | 'completed';
  getNextConcept: () => string | null;
  getPreviousConcept: () => string | null;
  canAccessConcept: (conceptId: string) => boolean;

  // UI State
  triggerCelebration: (data: CelebrationData) => void;
  dismissCelebration: () => void;
  toggleExploreMode: () => void;
  resetProgress: () => void;

  // Learning Session Timer
  startSession: () => void;
  endSession: () => void;

  // Content Accessors
  getStages: () => LearningStage[];
  getConcepts: () => LearningConcept[];
  hasCustomContent: () => boolean;



  // Cognitive Load
  recordInteraction: (correct: boolean, responseTimeMs: number) => void;
  triggerNeuralReset: () => void;
  dismissNeuralReset: () => void;
  resetCognitiveLoad: () => void;
  getCognitiveLoadLevel: () => 'low' | 'optimal' | 'high' | 'overload';

  // Focus Session Actions (merged from focus-session-store)
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

// ============================================================================
// STORE
// ============================================================================

export const useLearningStore = create<LearningState & LearningActions>()(
  persist(
    (set, get) => ({
      // Initial State
      currentSession: null,
      studySession: null,
      showSessionModal: false,
      diagnosticSession: null,
      showCelebration: false,
      celebrationData: null,
      showNeuralReset: false,
      isExploreMode: false,

      sessionTimer: null,

      // Focus Session Initial State
      ...getInitialFocusSessionState(),

      // =====================================================================
      // DIAGNOSTIC SESSION ACTIONS (SensaAI Learning Velocity Engine)
      // =====================================================================

      startDiagnostic: () => {
        const diagnosticSession: DiagnosticSession = {
          id: `diagnostic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          startedAt: new Date().toISOString(),
          timeLimitSeconds: 180, // 3 minutes default
          knownConcepts: [],
          knowledgeGaps: [],
          confidenceScores: {},
          canSkipFoundation: false,
          isComplete: false,
        };
        set({ diagnosticSession });
      },

      completeDiagnostic: (results) => {
        const state = get();
        if (!state.diagnosticSession) return;

        set({
          diagnosticSession: {
            ...state.diagnosticSession,
            completedAt: new Date().toISOString(),
            knownConcepts: results.knownConcepts,
            knowledgeGaps: results.knowledgeGaps,
            confidenceScores: results.confidenceScores,
            canSkipFoundation: results.canSkipFoundation,
            isComplete: true,
          },
        });
      },

      clearDiagnostic: () => {
        set({ diagnosticSession: null });
      },

      getDiagnosticSession: () => get().diagnosticSession,

      // =====================================================================
      // SESSION ACTIONS
      // =====================================================================

      loadSession: (sessionData) => {
        const stages = sessionData.stages;
        const concepts = sessionData.concepts;
        const initialProgress = sessionData.progress || getInitialProgress(stages, concepts);
        const initialMetrics = sessionData.cognitiveMetrics || getDefaultCognitiveMetrics();

        const session: CurrentSession = {
          id: generateSessionId(),
          subjectId: sessionData.subjectId,
          subject: sessionData.subject,
          mode: sessionData.mode,
          createdAt: new Date().toISOString(),
          stages,
          concepts,
          metadata: sessionData.metadata,
          progress: initialProgress,

          cognitiveMetrics: initialMetrics,
        };

        set({
          currentSession: session,
          showCelebration: false,
          celebrationData: null,
        });
      },

      updateSessionProgress: (progressUpdate) => {
        const state = get();
        if (!state.currentSession) return;

        const newProgress = { ...state.currentSession.progress, ...progressUpdate };

        set({
          currentSession: {
            ...state.currentSession,
            progress: newProgress,
          },
        });
      },

      setSessionMode: (mode) => {
        const state = get();
        if (!state.currentSession) return;

        set({
          currentSession: {
            ...state.currentSession,
            mode,
          },
        });
      },

      clearSession: () => {
        set({
          currentSession: null,
          showCelebration: false,
          celebrationData: null,
        });
      },

      getSession: () => get().currentSession,

      // =====================================================================
      // STUDY SESSION ACTIONS
      // =====================================================================

      startStudySession: (goal, duration, targetConcepts = []) => {
        const state = get();
        const subjectId = state.currentSession?.subjectId || 'unknown';
        const session = createStudySession(subjectId, goal, duration, targetConcepts);
        set({ studySession: session, showSessionModal: false });
      },

      setSessionPrimer: (primer) => {
        const state = get();
        if (!state.studySession) return;
        set({
          studySession: {
            ...state.studySession,
            primer
          }
        });
      },

      markSessionScouted: () => {
        set((state) => ({
          studySession: state.studySession
            ? { ...state.studySession, scouted: true }
            : null
        }));
      },

      markSessionPreviewed: () => {
        set((state) => ({
          studySession: state.studySession
            ? { ...state.studySession, previewed: true }
            : null
        }));
      },

      markSessionMapBuilt: (data?: ConceptMapData) => {
        set((state) => ({
          studySession: state.studySession
            ? { ...state.studySession, mapBuilt: true, conceptMap: data || null }
            : null
        }));
      },

      markSessionMapReconstructed: (_passed: boolean) => {
        set((state) => ({
          studySession: state.studySession
            ? { ...state.studySession, mapReconstructed: true }
            : null
        }));
      },

      markSessionMastered: () => {
        set((state) => ({
          studySession: state.studySession
            ? { ...state.studySession, mastered: true }
            : null
        }));
      },

      savePrediction: (conceptId: string, prediction: string) => {
        set((state) => ({
          studySession: state.studySession
            ? {
              ...state.studySession,
              predictions: {
                ...state.studySession.predictions,
                [conceptId]: prediction
              }
            }
            : null
        }));
      },

      // =====================================================================
      // PROGRESS ACTIONS
      // =====================================================================

      endStudySession: () => {
        const state = get();
        if (!state.studySession) return;

        const session = state.studySession;
        const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 1000 / 60;

        const goalAchieved = session.conceptsCompleted.length >= session.targetConcepts.length ||
          elapsed >= session.targetDuration;

        set({
          studySession: {
            ...session,
            endedAt: new Date().toISOString(),
            isActive: false,
            goalAchieved,
          },
        });
      },

      updateStudyMetrics: (metrics) => {
        const state = get();
        if (!state.studySession) return;

        set({
          studySession: {
            ...state.studySession,
            metrics: { ...state.studySession.metrics, ...metrics },
          },
        });
      },

      completeStudySessionConcept: (conceptId, phase) => {
        const state = get();
        if (!state.studySession) return;

        const session = state.studySession;
        const newCompleted = session.conceptsCompleted.includes(conceptId)
          ? session.conceptsCompleted
          : [...session.conceptsCompleted, conceptId];

        const newPhasesCompleted = { ...session.phasesCompleted };
        if (phase) {
          const existingPhases = newPhasesCompleted[conceptId] || [];
          if (!existingPhases.includes(phase)) {
            newPhasesCompleted[conceptId] = [...existingPhases, phase];
          }
        }

        set({
          studySession: {
            ...session,
            conceptsCompleted: newCompleted,
            phasesCompleted: newPhasesCompleted,
            metrics: {
              ...session.metrics,
              uninterruptedConceptStreak: session.metrics.uninterruptedConceptStreak + 1,
            },
          },
        });
      },

      recordConfusionDrill: (passed) => {
        const state = get();
        if (!state.studySession) return;

        const session = state.studySession;
        const newAccuracy = passed
          ? Math.min(100, session.metrics.confusionDrillAccuracy + 10)
          : Math.max(0, session.metrics.confusionDrillAccuracy - 5);

        set({
          studySession: {
            ...session,
            confusionDrillsCompleted: session.confusionDrillsCompleted + 1,
            metrics: { ...session.metrics, confusionDrillAccuracy: newAccuracy },
          },
        });
      },

      recordBreak: () => {
        const state = get();
        if (!state.studySession) return;

        set({
          studySession: {
            ...state.studySession,
            breaksTaken: state.studySession.breaksTaken + 1,
            metrics: { ...state.studySession.metrics, uninterruptedConceptStreak: 0 },
          },
        });
      },

      setShowSessionModal: (show) => set({ showSessionModal: show }),

      getStudySessionStats: () => {
        const state = get();
        if (!state.studySession) return null;

        const session = state.studySession;
        const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 1000 / 60;

        const goalProgress = session.targetConcepts.length > 0
          ? (session.conceptsCompleted.length / session.targetConcepts.length) * 100
          : (elapsed / session.targetDuration) * 100;

        return {
          elapsedMinutes: Math.round(elapsed),
          conceptsCompleted: session.conceptsCompleted.length,
          goalProgress: Math.min(100, Math.round(goalProgress)),
        };
      },

      // =====================================================================
      // CONTENT ACCESSORS
      // =====================================================================

      getStages: () => get().currentSession?.stages || [],
      getConcepts: () => get().currentSession?.concepts || [],
      hasCustomContent: () => get().currentSession !== null,

      // =====================================================================
      // CONCEPT NAVIGATION
      // =====================================================================

      completeConcept: (conceptId: string) => {
        const state = get();
        if (!state.currentSession) return;

        const concepts = state.currentSession.concepts;
        const stages = state.currentSession.stages;
        const currentProgress = state.currentSession.progress;

        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;

        const stage = stages.find(s => s.id === concept.stageId);
        if (!stage) return;

        const newCompletedConcepts = [...currentProgress.completedConcepts, conceptId];
        const today = new Date().toISOString().split('T')[0];
        const conceptsToday = currentProgress.lastSessionDate === today
          ? currentProgress.conceptsLearnedToday + 1
          : 1;

        const stageConceptIds = concepts
          .filter(c => c.stageId === stage.id)
          .map(c => c.id);
        const allStageConceptsComplete = stageConceptIds.every(id =>
          newCompletedConcepts.includes(id)
        );

        const newCompletedStages = [...currentProgress.completedStages];
        if (allStageConceptsComplete && !newCompletedStages.includes(stage.id)) {
          newCompletedStages.push(stage.id);
        }

        const nextConcept = state.getNextConcept();
        const nextConceptData = nextConcept ? concepts.find(c => c.id === nextConcept) : null;
        const nextStageId = nextConceptData?.stageId || currentProgress.currentStageId;

        const newProgress: UserProgress = {
          ...currentProgress,
          completedConcepts: newCompletedConcepts,
          completedStages: newCompletedStages,
          currentConceptId: nextConcept || conceptId,
          currentStageId: nextStageId,
          conceptsLearnedToday: conceptsToday,
          lastSessionDate: today,
        };

        set({
          currentSession: {
            ...state.currentSession,
            progress: newProgress,
          },
        });

        if (allStageConceptsComplete) {
          const allStagesComplete = stages.every(s => newCompletedStages.includes(s.id));

          if (allStagesComplete) {
            get().triggerCelebration({
              type: 'course',
              title: 'Course Complete!',
              message: 'Congratulations! You\'ve mastered all the core concepts!',
              conceptsCompleted: newCompletedConcepts,
              timeSpent: currentProgress.totalTimeSpentMinutes,
              badgeIcon: '🏆',
            });
          } else {
            get().triggerCelebration({
              type: 'stage',
              title: stage.celebrationTitle,
              message: stage.celebrationMessage,
              conceptsCompleted: stageConceptIds,
              badgeIcon: stage.icon,
            });
          }
        }
      },

      setCurrentConcept: (conceptId: string) => {
        const state = get();
        if (!state.currentSession) return;

        const concept = state.currentSession.concepts.find(c => c.id === conceptId);
        if (!concept) return;

        set({
          currentSession: {
            ...state.currentSession,
            progress: {
              ...state.currentSession.progress,
              currentConceptId: conceptId,
              currentStageId: concept.stageId,
            },
          },
        });
      },

      triggerCelebration: (data: CelebrationData) => {
        set({ showCelebration: true, celebrationData: data });
      },

      dismissCelebration: () => {
        set({ showCelebration: false, celebrationData: null });
      },

      toggleExploreMode: () => {
        set(state => ({ isExploreMode: !state.isExploreMode }));
      },

      resetProgress: () => {
        const state = get();
        if (!state.currentSession) return;

        const newProgress = getInitialProgress(
          state.currentSession.stages,
          state.currentSession.concepts
        );

        set({
          currentSession: {
            ...state.currentSession,
            progress: newProgress,
          },
          showCelebration: false,
          celebrationData: null,
          isExploreMode: false,
        });
      },

      startSession: () => {
        const state = get();
        if (!state.currentSession) return;

        if (state.sessionTimer) {
          clearInterval(state.sessionTimer);
        }

        const timer = setInterval(() => {
          const current = get();
          if (!current.currentSession) return;

          if (current.currentSession.progress.sessionStartTime) {
            set({
              currentSession: {
                ...current.currentSession,
                progress: {
                  ...current.currentSession.progress,
                  totalTimeSpentMinutes: current.currentSession.progress.totalTimeSpentMinutes + 1,
                },
              },
            });
          }
        }, 60000);

        set({
          currentSession: {
            ...state.currentSession,
            progress: {
              ...state.currentSession.progress,
              sessionStartTime: Date.now(),
            },
          },
          sessionTimer: timer,
        });
      },

      endSession: () => {
        const state = get();
        if (state.sessionTimer) {
          clearInterval(state.sessionTimer);
        }

        if (!state.currentSession?.progress.sessionStartTime) {
          set({ sessionTimer: null });
          return;
        }

        const sessionMinutes = Math.round(
          (Date.now() - state.currentSession.progress.sessionStartTime) / 60000
        );

        set({
          currentSession: {
            ...state.currentSession,
            progress: {
              ...state.currentSession.progress,
              totalTimeSpentMinutes: state.currentSession.progress.totalTimeSpentMinutes + sessionMinutes,
              sessionStartTime: null,
            },
          },
          sessionTimer: null,
        });
      },

      getConceptStatus: (conceptId: string) => {
        const state = get();
        if (!state.currentSession) return 'locked';

        const { progress, concepts } = state.currentSession;

        if (progress.completedConcepts.includes(conceptId)) return 'completed';
        if (progress.currentConceptId === conceptId) return 'current';

        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return 'locked';

        const prerequisitesMet = (concept.prerequisites || []).every(prereq =>
          progress.completedConcepts.includes(prereq)
        );

        return prerequisitesMet ? 'available' : 'locked';
      },

      getStageStatus: (stageId: string) => {
        const state = get();
        if (!state.currentSession) return 'locked';

        const { progress, stages } = state.currentSession;

        if (progress.completedStages.includes(stageId)) return 'completed';
        if (progress.currentStageId === stageId) return 'current';

        const stage = stages.find(s => s.id === stageId);
        if (!stage) return 'locked';

        const stageIndex = stages.findIndex(s => s.id === stageId);
        if (stageIndex === 0) return 'available';

        const previousStage = stages[stageIndex - 1];
        return progress.completedStages.includes(previousStage.id) ? 'available' : 'locked';
      },

      getNextConcept: () => {
        const state = get();
        if (!state.currentSession) return null;

        const { concepts, stages, progress } = state.currentSession;

        const currentConcept = concepts.find(c => c.id === progress.currentConceptId);
        if (!currentConcept) return null;

        const sameStageConcepts = concepts
          .filter(c => c.stageId === currentConcept.stageId)
          .sort((a, b) => a.order - b.order);

        const nextInStage = sameStageConcepts.find(
          c => c.order > currentConcept.order && !progress.completedConcepts.includes(c.id)
        );

        if (nextInStage) return nextInStage.id;

        const currentStageIndex = stages.findIndex(s => s.id === currentConcept.stageId);

        for (let i = currentStageIndex + 1; i < stages.length; i++) {
          const nextStage = stages[i];
          const firstConcept = concepts
            .filter(c => c.stageId === nextStage.id)
            .sort((a, b) => a.order - b.order)[0];

          if (firstConcept && !progress.completedConcepts.includes(firstConcept.id)) {
            return firstConcept.id;
          }
        }

        return null;
      },

      getPreviousConcept: () => {
        const state = get();
        if (!state.currentSession) return null;

        const { concepts, stages, progress } = state.currentSession;

        const currentConcept = concepts.find(c => c.id === progress.currentConceptId);
        if (!currentConcept) return null;

        const sameStageConcepts = concepts
          .filter(c => c.stageId === currentConcept.stageId)
          .sort((a, b) => a.order - b.order);

        const prevInStage = [...sameStageConcepts]
          .reverse()
          .find(c => c.order < currentConcept.order);

        if (prevInStage) return prevInStage.id;

        const currentStageIndex = stages.findIndex(s => s.id === currentConcept.stageId);

        if (currentStageIndex > 0) {
          const prevStage = stages[currentStageIndex - 1];
          const lastConcept = concepts
            .filter(c => c.stageId === prevStage.id)
            .sort((a, b) => b.order - a.order)[0];

          if (lastConcept) return lastConcept.id;
        }

        return null;
      },

      canAccessConcept: (conceptId: string) => {
        return get().getConceptStatus(conceptId) !== 'locked';
      },



      // =====================================================================
      // COGNITIVE LOAD
      // =====================================================================

      recordInteraction: (correct, responseTimeMs) => {
        const state = get();
        if (!state.currentSession) return;

        const metrics = state.currentSession.cognitiveMetrics;

        const newConsecutiveCorrect = correct ? metrics.consecutiveCorrect + 1 : 0;
        const newConsecutiveErrors = !correct ? metrics.consecutiveErrors + 1 : 0;

        const newAvgTime = metrics.avgResponseTimeMs === 0
          ? responseTimeMs
          : Math.round(metrics.avgResponseTimeMs * 0.7 + responseTimeMs * 0.3);

        let loadDelta = 0;
        if (correct && responseTimeMs < 4000) {
          loadDelta = -5;
        } else if (correct) {
          loadDelta = -2;
        } else {
          loadDelta = 15;
        }

        if (newConsecutiveErrors >= 3) loadDelta += 10;

        const timeSinceLastMs = Date.now() - metrics.lastInteractionTime;
        if (timeSinceLastMs > 300000) loadDelta += 5;

        const newLoad = Math.min(100, Math.max(0, metrics.currentLoad + loadDelta));
        const needsReset = newLoad >= 85 || newConsecutiveErrors >= 5;

        const newMetrics: CognitiveMetrics = {
          currentLoad: newLoad,
          consecutiveCorrect: newConsecutiveCorrect,
          consecutiveErrors: newConsecutiveErrors,
          avgResponseTimeMs: newAvgTime,
          lastInteractionTime: Date.now(),
          conceptsThisSession: metrics.conceptsThisSession + 1,
          needsReset,
        };

        set({
          currentSession: {
            ...state.currentSession,
            cognitiveMetrics: newMetrics,
          },
          showNeuralReset: needsReset,
        });

        // Update behavioral signals for learning profile inference
        import('@/store/personalization-store').then(({ usePersonalizationStore }) => {
          import('@/lib/learning/profile-detector').then(({ inferLearningProfile }) => {
            const personalization = usePersonalizationStore.getState();
            const currentSignals = personalization.behavioralSignals;

            // Calculate updated signals
            const newTotalConcepts = currentSignals.totalConceptsViewed + 1;
            const newAvgTimePerConcept = currentSignals.avgTimePerConcept === 0
              ? responseTimeMs / 1000
              : (currentSignals.avgTimePerConcept * 0.8 + (responseTimeMs / 1000) * 0.2);

            const updatedSignals = {
              avgTimePerConcept: newAvgTimePerConcept,
              consecutiveErrors: newConsecutiveErrors,
              totalConceptsViewed: newTotalConcepts,
            };

            personalization.updateBehavioralSignals(updatedSignals);

            // Re-run profile inference with updated signals
            const allSignals = { ...currentSignals, ...updatedSignals };
            const { profile, confidence } = inferLearningProfile(allSignals, personalization.aphantasiaMode);

            // Only update if confidence increased
            if (confidence > personalization.profileConfidence) {
              personalization.setInferredProfile(profile, confidence);
            }
          });
        });
      },

      triggerNeuralReset: () => set({ showNeuralReset: true }),

      dismissNeuralReset: () => {
        const state = get();
        if (!state.currentSession) {
          set({ showNeuralReset: false });
          return;
        }

        const currentMetrics = state.currentSession.cognitiveMetrics;
        set({
          showNeuralReset: false,
          currentSession: {
            ...state.currentSession,
            cognitiveMetrics: {
              ...currentMetrics,
              currentLoad: Math.max(30, currentMetrics.currentLoad - 30),
              consecutiveErrors: 0,
              needsReset: false,
            },
          },
        });
      },

      resetCognitiveLoad: () => {
        const state = get();
        if (!state.currentSession) return;

        set({
          showNeuralReset: false,
          currentSession: {
            ...state.currentSession,
            cognitiveMetrics: getDefaultCognitiveMetrics(),
          },
        });
      },

      getCognitiveLoadLevel: () => {
        const state = get();
        const currentLoad = state.currentSession?.cognitiveMetrics.currentLoad || 30;
        if (currentLoad < 30) return 'low';
        if (currentLoad < 60) return 'optimal';
        if (currentLoad < 85) return 'high';
        return 'overload';
      },

      // =====================================================================
      // FOCUS SESSION (merged from focus-session-store)
      // =====================================================================

      startFocusSession: () => {
        const state = get();
        set({
          isSessionActive: true,
          isPaused: false,
          sessionType: 'focus',
          timeRemainingSeconds: state.focusDurationMinutes * 60,
          focusSessionStartTime: Date.now(),
          currentFocusConceptId: null,
          currentFocusConceptStartTime: null,
          conceptTimings: [],
          showSessionSummary: false,
        });
      },

      pauseSession: () => set({ isPaused: true }),

      resumeSession: () => set({ isPaused: false }),

      endFocusSession: () => {
        const state = get();

        // Finalize any in-progress concept timing
        if (state.currentFocusConceptId && state.currentFocusConceptStartTime) {
          const timing = state.conceptTimings.find(t => t.conceptId === state.currentFocusConceptId);
          if (timing && timing.endTime === null) {
            timing.endTime = Date.now();
            timing.durationSeconds = Math.round((timing.endTime - timing.startTime) / 1000);
          }
        }

        const sessionDurationMinutes = state.focusSessionStartTime
          ? Math.round((Date.now() - state.focusSessionStartTime) / 60000)
          : 0;

        const summary = get().getSessionSummary();
        const completedConcepts = state.conceptTimings.filter(t => t.completed).length;

        set({
          isSessionActive: false,
          isPaused: false,
          focusSessionStartTime: null,
          currentFocusConceptId: null,
          currentFocusConceptStartTime: null,
          totalSessionsCompleted: state.totalSessionsCompleted + 1,
          totalFocusMinutes: state.totalFocusMinutes + sessionDurationMinutes,
          totalConceptsMastered: state.totalConceptsMastered + completedConcepts,
          sessionsUntilLongBreak: state.sessionsUntilLongBreak > 1
            ? state.sessionsUntilLongBreak - 1
            : FOCUS_SESSION_CONFIG.SESSIONS_UNTIL_LONG_BREAK,
          showSessionSummary: true,
          lastSessionSummary: summary,
        });
      },

      startBreak: () => {
        const state = get();
        const breakMinutes = state.sessionsUntilLongBreak === 0
          ? FOCUS_SESSION_CONFIG.LONG_BREAK_MINUTES
          : state.breakDurationMinutes;

        set({
          isSessionActive: true,
          isPaused: false,
          sessionType: 'break',
          timeRemainingSeconds: breakMinutes * 60,
          focusSessionStartTime: Date.now(),
          showSessionSummary: false,
        });
      },

      skipToBreak: () => {
        get().endFocusSession();
        setTimeout(() => get().startBreak(), UI_TIMINGS.NEXT_TICK);
      },

      tick: () => {
        const state = get();
        if (!state.isSessionActive || state.isPaused) return;

        const newTime = state.timeRemainingSeconds - 1;

        if (newTime <= 0) {
          if (state.sessionType === 'focus') {
            get().endFocusSession();
          } else {
            set({
              isSessionActive: false,
              sessionType: 'focus',
              timeRemainingSeconds: state.focusDurationMinutes * 60,
            });
          }
        } else {
          set({ timeRemainingSeconds: newTime });
        }
      },

      setFocusDuration: (minutes) => {
        const state = get();
        set({
          focusDurationMinutes: minutes,
          timeRemainingSeconds: state.isSessionActive ? state.timeRemainingSeconds : minutes * 60,
        });
      },

      setBreakDuration: (minutes) => set({ breakDurationMinutes: minutes }),

      recordConceptStart: (conceptId, conceptName) => {
        const state = get();
        if (!state.isSessionActive) return;

        if (state.currentFocusConceptId && state.currentFocusConceptId !== conceptId) {
          get().recordConceptEnd(state.currentFocusConceptId, false);
        }

        const existing = state.conceptTimings.find(t => t.conceptId === conceptId);
        if (existing) {
          set({
            currentFocusConceptId: conceptId,
            currentFocusConceptStartTime: Date.now(),
          });
        } else {
          const newTiming: ConceptTiming = {
            conceptId,
            conceptName,
            startTime: Date.now(),
            endTime: null,
            durationSeconds: 0,
            completed: false,
          };

          set({
            currentFocusConceptId: conceptId,
            currentFocusConceptStartTime: Date.now(),
            conceptTimings: [...state.conceptTimings, newTiming],
          });
        }
      },

      recordConceptEnd: (conceptId, completed) => {
        const state = get();
        const timings = [...state.conceptTimings];
        const timing = timings.find(t => t.conceptId === conceptId);

        if (timing && state.currentFocusConceptStartTime) {
          const additionalTime = Math.round((Date.now() - state.currentFocusConceptStartTime) / 1000);
          timing.durationSeconds += additionalTime;
          timing.endTime = Date.now();
          timing.completed = completed || timing.completed;

          set({
            conceptTimings: timings,
            currentFocusConceptId: null,
            currentFocusConceptStartTime: null,
          });
        }
      },

      getSessionSummary: () => {
        const state = get();
        const timings = state.conceptTimings;

        const duration = state.focusSessionStartTime
          ? Math.round((Date.now() - state.focusSessionStartTime) / 1000)
          : 0;

        const conceptsWithTime = timings.filter(t => t.durationSeconds > 0);
        const avgPace = conceptsWithTime.length > 0
          ? Math.round(conceptsWithTime.reduce((sum, t) => sum + t.durationSeconds, 0) / conceptsWithTime.length)
          : 0;

        const paceRating = get().getPaceRating(avgPace);

        let recommendation = '';
        switch (paceRating) {
          case 'optimal':
            recommendation = 'Excellent pacing! You\'re reading efficiently. Keep this rhythm.';
            break;
          case 'good':
            recommendation = 'Good pace! You\'re taking time to understand concepts well.';
            break;
          case 'warning':
            recommendation = 'Consider taking shorter reviews. Focus on key terms first.';
            break;
          case 'overtime':
            recommendation = 'Try the Speed Reader technique: scan headings, then key terms, then details.';
            break;
        }

        return {
          duration,
          conceptsCount: timings.length,
          conceptsCompleted: timings.filter(t => t.completed).length,
          avgPaceSeconds: avgPace,
          paceRating,
          conceptTimings: timings,
          recommendation,
        };
      },

      dismissSessionSummary: () => set({ showSessionSummary: false }),

      getFormattedTimeRemaining: () => {
        const seconds = get().timeRemainingSeconds;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      },

      getProgressPercent: () => {
        const state = get();
        const totalSeconds = state.sessionType === 'focus'
          ? state.focusDurationMinutes * 60
          : state.breakDurationMinutes * 60;
        return ((totalSeconds - state.timeRemainingSeconds) / totalSeconds) * 100;
      },

      getConceptsThisSession: () => get().conceptTimings.length,

      getAvgPaceThisSession: () => {
        const timings = get().conceptTimings.filter(t => t.durationSeconds > 0);
        if (timings.length === 0) return 0;
        return Math.round(timings.reduce((sum, t) => sum + t.durationSeconds, 0) / timings.length);
      },

      getPaceRating: (avgSeconds) => {
        const target = FOCUS_SESSION_CONFIG.CONCEPT_TARGET_SECONDS;
        const ratio = avgSeconds / target;

        if (ratio <= FOCUS_SESSION_CONFIG.PACE_THRESHOLDS.optimal) return 'optimal';
        if (ratio <= FOCUS_SESSION_CONFIG.PACE_THRESHOLDS.good) return 'good';
        if (ratio <= FOCUS_SESSION_CONFIG.PACE_THRESHOLDS.warning) return 'warning';
        return 'overtime';
      },
    }),
    {
      name: STORAGE_KEYS.LEARNING_STORE,
      partialize: (state) => ({
        currentSession: state.currentSession,
        focusDurationMinutes: state.focusDurationMinutes,
        breakDurationMinutes: state.breakDurationMinutes,
        totalSessionsCompleted: state.totalSessionsCompleted,
        totalFocusMinutes: state.totalFocusMinutes,
        totalConceptsMastered: state.totalConceptsMastered,
        sessionsUntilLongBreak: state.sessionsUntilLongBreak,
      }),
    }
  )
);

// Re-export for backward compatibility with existing imports
export const useFocusSessionStore = useLearningStore;
