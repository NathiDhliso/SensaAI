import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  UserProgress, 
  CelebrationData, 
  LearningStage, 
  LearningConcept,
  StudySession,
  StudyGoal,
  LifecyclePhaseKey,
  EnhancedCognitiveMetrics,
} from '@/lib/types/learning';
import type { SprintResult } from '@/lib/types/sprint';

// ============================================================================
// PHASE 0.3: UNIFIED SESSION STATE
// Consolidates: customContent, sprintResult, cognitiveMetrics, showNeuralReset
// ============================================================================

/**
 * Metadata about the generated content source.
 */
export type ContentMetadata = {
  domain: string;
  role: string;
  source: string;
  conceptCount: number;
};

/**
 * Cognitive load tracking for adaptive learning.
 * Used to detect when student needs a "neural reset" break.
 */
export type CognitiveMetrics = {
  currentLoad: number;           // 0-100 scale
  consecutiveCorrect: number;    // Fast/correct streaks
  consecutiveErrors: number;     // Wrong/slow streaks
  avgResponseTimeMs: number;     // Rolling average
  lastInteractionTime: number;   // Timestamp
  conceptsThisSession: number;   // Concepts viewed this session
  needsReset: boolean;           // Triggers neural reset modal
};

/**
 * UNIFIED LEARNING SESSION
 * 
 * Single source of truth for all active learning state.
 * Replaces scattered customContent, sprintResult, cognitiveMetrics.
 * 
 * @see SILVER_BULLET_LEARNING_ARCHITECTURE.md Phase 0.3
 */
export interface CurrentSession {
  /** Unique session ID (UUID) */
  id: string;
  /** Generated subject identifier (matches Results page) */
  subjectId: string;
  /** Human-readable subject name */
  subject: string;
  /** Current learning mode */
  mode: 'learn' | 'sprint' | 'explore';
  /** When session was created */
  createdAt: string;
  
  // ─── Content ─────────────────────────────────────────────────────────
  stages: LearningStage[];
  concepts: LearningConcept[];
  metadata: ContentMetadata | null;
  
  // ─── Progress ────────────────────────────────────────────────────────
  progress: UserProgress;
  
  // ─── Sprint Results (if mode === 'sprint') ───────────────────────────
  sprintResult?: SprintResult;
  
  // ─── Cognitive Metrics ───────────────────────────────────────────────
  cognitiveMetrics: CognitiveMetrics;
}

// Legacy type alias for backward compatibility during migration
type CustomContent = {
  stages: LearningStage[];
  concepts: LearningConcept[];
  metadata: ContentMetadata | null;
};

// ============================================================================
// PHASE 5: STUDY SESSION STATE
// Session-based learning model for single-page experience
// ============================================================================

/** Default enhanced cognitive metrics for new study sessions */
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

/** Create a new study session */
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
});

type LearningState = {
  // ─── UNIFIED SESSION (Phase 0.3) ─────────────────────────────────────
  currentSession: CurrentSession | null;
  
  // ─── STUDY SESSION (Phase 5) ─────────────────────────────────────────
  /** Active study session for single-page experience */
  studySession: StudySession | null;
  /** Show session start modal */
  showSessionModal: boolean;
  
  // ─── UI State ────────────────────────────────────────────────────────
  showCelebration: boolean;
  celebrationData: CelebrationData | null;
  showNeuralReset: boolean;
  isExploreMode: boolean;
  isSprintReady: boolean;
  
  // ─── Internal ────────────────────────────────────────────────────────
  sessionTimer: ReturnType<typeof setInterval> | null;
  
  // ─── LEGACY (deprecated - use currentSession instead) ────────────────
  /** @deprecated Use currentSession.progress */
  progress: UserProgress;
  /** @deprecated Use currentSession */
  customContent: CustomContent | null;
  /** @deprecated Use currentSession.sprintResult */
  sprintResult: SprintResult | null;
  /** @deprecated Use currentSession.cognitiveMetrics */
  cognitiveMetrics: CognitiveMetrics;
};

type LearningActions = {
  // ─── UNIFIED SESSION ACTIONS (Phase 0.3 - PRIMARY API) ───────────────
  /** Load a new learning session with all content and state */
  loadSession: (session: Omit<CurrentSession, 'id' | 'createdAt' | 'progress' | 'cognitiveMetrics'> & { 
    progress?: UserProgress;
    cognitiveMetrics?: CognitiveMetrics;
  }) => void;
  /** Update session progress */
  updateSessionProgress: (progress: Partial<UserProgress>) => void;
  /** Update session mode (learn/sprint/explore) */
  setSessionMode: (mode: CurrentSession['mode']) => void;
  /** Clear current session */
  clearSession: () => void;
  /** Get current session data */
  getSession: () => CurrentSession | null;
  
  // ─── STUDY SESSION ACTIONS (Phase 5) ─────────────────────────────────
  /** Start a new study session */
  startStudySession: (goal: StudyGoal, duration: number, targetConcepts?: string[]) => void;
  /** End the current study session */
  endStudySession: () => void;
  /** Update study session metrics */
  updateStudyMetrics: (metrics: Partial<EnhancedCognitiveMetrics>) => void;
  /** Complete a concept in study session */
  completeStudySessionConcept: (conceptId: string, phase?: LifecyclePhaseKey) => void;
  /** Record confusion drill completion */
  recordConfusionDrill: (passed: boolean) => void;
  /** Record a break taken */
  recordBreak: () => void;
  /** Show/hide session start modal */
  setShowSessionModal: (show: boolean) => void;
  /** Get study session stats */
  getStudySessionStats: () => { 
    elapsedMinutes: number; 
    conceptsCompleted: number;
    goalProgress: number;
  } | null;
  
  // ─── CONCEPT NAVIGATION ──────────────────────────────────────────────
  completeConcept: (conceptId: string) => void;
  setCurrentConcept: (conceptId: string) => void;
  getConceptStatus: (conceptId: string) => 'locked' | 'available' | 'current' | 'completed';
  getStageStatus: (stageId: string) => 'locked' | 'available' | 'current' | 'completed';
  getNextConcept: () => string | null;
  getPreviousConcept: () => string | null;
  canAccessConcept: (conceptId: string) => boolean;
  
  // ─── UI STATE ────────────────────────────────────────────────────────
  triggerCelebration: (data: CelebrationData) => void;
  dismissCelebration: () => void;
  toggleExploreMode: () => void;
  resetProgress: () => void;
  
  // ─── SESSION TIMER ───────────────────────────────────────────────────
  startSession: () => void;
  endSession: () => void;
  
  // ─── CONTENT ACCESSORS ───────────────────────────────────────────────
  getStages: () => LearningStage[];
  getConcepts: () => LearningConcept[];
  hasCustomContent: () => boolean;
  
  // ─── SPRINT ──────────────────────────────────────────────────────────
  setSprintResult: (result: SprintResult) => void;
  clearSprintResult: () => void;
  setSprintReady: (ready: boolean) => void;
  
  // ─── COGNITIVE LOAD ──────────────────────────────────────────────────
  recordInteraction: (correct: boolean, responseTimeMs: number) => void;
  triggerNeuralReset: () => void;
  dismissNeuralReset: () => void;
  resetCognitiveLoad: () => void;
  getCognitiveLoadLevel: () => 'low' | 'optimal' | 'high' | 'overload';
  
  // ─── LEGACY (deprecated - maintained for backward compatibility) ─────
  /** @deprecated Use loadSession instead */
  loadCustomContent: (content: { stages: LearningStage[]; concepts: LearningConcept[]; metadata: ContentMetadata }) => void;
  /** @deprecated Use clearSession instead */
  clearCustomContent: () => void;
};

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

/** Generate unique session ID */
const generateSessionId = (): string => {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/** Default cognitive metrics for new sessions */
const getDefaultCognitiveMetrics = (): CognitiveMetrics => ({
  currentLoad: 30,  // Start at 30% (light load)
  consecutiveCorrect: 0,
  consecutiveErrors: 0,
  avgResponseTimeMs: 0,
  lastInteractionTime: Date.now(),
  conceptsThisSession: 0,
  needsReset: false,
});

export const useLearningStore = create<LearningState & LearningActions>()(
  persist(
    (set, get) => ({
      // ─── UNIFIED SESSION (Phase 0.3) ─────────────────────────────────
      currentSession: null,
      
      // ─── STUDY SESSION (Phase 5) ─────────────────────────────────────
      studySession: null,
      showSessionModal: false,
      
      // ─── UI State ────────────────────────────────────────────────────
      showCelebration: false,
      celebrationData: null,
      showNeuralReset: false,
      isExploreMode: false,
      isSprintReady: false,
      sessionTimer: null,
      
      // ─── LEGACY STATE (kept for backward compatibility) ──────────────
      progress: getInitialProgress([], []),
      customContent: null,
      sprintResult: null,
      cognitiveMetrics: getDefaultCognitiveMetrics(),

      // ═══════════════════════════════════════════════════════════════════
      // UNIFIED SESSION ACTIONS (Phase 0.3 - PRIMARY API)
      // ═══════════════════════════════════════════════════════════════════

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
          sprintResult: sessionData.sprintResult,
          cognitiveMetrics: initialMetrics,
        };
        
        set({
          currentSession: session,
          // Also update legacy state for backward compatibility
          customContent: { stages, concepts, metadata: sessionData.metadata },
          progress: initialProgress,
          cognitiveMetrics: initialMetrics,
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
          // Legacy sync
          progress: newProgress,
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
        const newProgress = getInitialProgress([], []);
        set({
          currentSession: null,
          // Legacy sync
          customContent: null,
          progress: newProgress,
          sprintResult: null,
          cognitiveMetrics: getDefaultCognitiveMetrics(),
          showCelebration: false,
          celebrationData: null,
        });
      },
      
      getSession: () => get().currentSession,

      // ═══════════════════════════════════════════════════════════════════
      // STUDY SESSION ACTIONS (Phase 5 - Single-Page Experience)
      // ═══════════════════════════════════════════════════════════════════

      startStudySession: (goal, duration, targetConcepts = []) => {
        const state = get();
        const subjectId = state.currentSession?.subjectId || 'unknown';
        
        const session = createStudySession(subjectId, goal, duration, targetConcepts);
        
        set({ 
          studySession: session,
          showSessionModal: false,
        });
      },
      
      endStudySession: () => {
        const state = get();
        if (!state.studySession) return;
        
        const session = state.studySession;
        const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 1000 / 60;
        
        // Check if goal was achieved
        const goalAchieved = session.goal === 'sprint' 
          ? session.confusionDrillsCompleted >= 3
          : session.conceptsCompleted.length >= session.targetConcepts.length || 
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
            metrics: {
              ...state.studySession.metrics,
              ...metrics,
            },
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
            metrics: {
              ...session.metrics,
              confusionDrillAccuracy: newAccuracy,
            },
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
            metrics: {
              ...state.studySession.metrics,
              uninterruptedConceptStreak: 0, // Reset streak on break
            },
          },
        });
      },
      
      setShowSessionModal: (show) => {
        set({ showSessionModal: show });
      },
      
      getStudySessionStats: () => {
        const state = get();
        if (!state.studySession) return null;
        
        const session = state.studySession;
        const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 1000 / 60;
        
        const goalProgress = session.goal === 'sprint'
          ? (session.confusionDrillsCompleted / 10) * 100
          : session.targetConcepts.length > 0
            ? (session.conceptsCompleted.length / session.targetConcepts.length) * 100
            : (elapsed / session.targetDuration) * 100;
        
        return {
          elapsedMinutes: Math.round(elapsed),
          conceptsCompleted: session.conceptsCompleted.length,
          goalProgress: Math.min(100, Math.round(goalProgress)),
        };
      },

      // ═══════════════════════════════════════════════════════════════════
      // CONTENT ACCESSORS (now session-aware)
      // ═══════════════════════════════════════════════════════════════════

      getStages: () => {
        const state = get();
        // Prefer unified session, fallback to legacy
        return state.currentSession?.stages || state.customContent?.stages || [];
      },

      getConcepts: () => {
        const state = get();
        return state.currentSession?.concepts || state.customContent?.concepts || [];
      },

      hasCustomContent: () => {
        const state = get();
        return state.currentSession !== null || state.customContent !== null;
      },

      // ═══════════════════════════════════════════════════════════════════
      // LEGACY ACTIONS (deprecated - maintained for backward compatibility)
      // ═══════════════════════════════════════════════════════════════════

      loadCustomContent: (content) => {
        // Bridge to new unified session API
        get().loadSession({
          subjectId: `legacy-${Date.now()}`,
          subject: content.metadata?.domain || 'Imported Content',
          mode: 'learn',
          stages: content.stages,
          concepts: content.concepts,
          metadata: content.metadata,
        });
      },

      clearCustomContent: () => {
        get().clearSession();
      },

      completeConcept: (conceptId: string) => {
        const state = get();
        const concepts = state.getConcepts();
        const stages = state.getStages();
        // Get current progress from session or legacy
        const currentProgress = state.currentSession?.progress || state.progress;

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

        // Update both session and legacy state
        set({
          progress: newProgress,
          ...(state.currentSession && {
            currentSession: {
              ...state.currentSession,
              progress: newProgress,
            },
          }),
        });

        if (allStageConceptsComplete) {
          const allStagesComplete = stages.every(s =>
            newCompletedStages.includes(s.id)
          );

          if (allStagesComplete) {
            get().triggerCelebration({
              type: 'course',
              title: 'Course Complete!',
              message: 'Congratulations! You\'ve mastered all the core concepts!',
              conceptsCompleted: newCompletedConcepts,
              timeSpent: state.progress.totalTimeSpentMinutes,
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
        const concepts = state.getConcepts();
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;

        const newProgress = {
          ...(state.currentSession?.progress || state.progress),
          currentConceptId: conceptId,
          currentStageId: concept.stageId,
        };

        set({
          progress: newProgress,
          ...(state.currentSession && {
            currentSession: {
              ...state.currentSession,
              progress: newProgress,
            },
          }),
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
        const stages = state.getStages();
        const concepts = state.getConcepts();
        const newProgress = getInitialProgress(stages, concepts);
        
        set({
          progress: newProgress,
          showCelebration: false,
          celebrationData: null,
          isExploreMode: false,
          ...(state.currentSession && {
            currentSession: {
              ...state.currentSession,
              progress: newProgress,
            },
          }),
        });
      },

      startSession: () => {
        const state = get();
        if (state.sessionTimer) {
          clearInterval(state.sessionTimer);
        }

        const timer = setInterval(() => {
          const current = get();
          const currentProgress = current.currentSession?.progress || current.progress;
          if (currentProgress.sessionStartTime) {
            const newProgress = {
              ...currentProgress,
              totalTimeSpentMinutes: currentProgress.totalTimeSpentMinutes + 1,
            };
            set({
              progress: newProgress,
              ...(current.currentSession && {
                currentSession: {
                  ...current.currentSession,
                  progress: newProgress,
                },
              }),
            });
          }
        }, 60000);

        const currentProgress = state.currentSession?.progress || state.progress;
        const newProgress = {
          ...currentProgress,
          sessionStartTime: Date.now(),
        };

        set({
          progress: newProgress,
          sessionTimer: timer,
          ...(state.currentSession && {
            currentSession: {
              ...state.currentSession,
              progress: newProgress,
            },
          }),
        });
      },

      endSession: () => {
        const state = get();
        if (state.sessionTimer) {
          clearInterval(state.sessionTimer);
        }

        const currentProgress = state.currentSession?.progress || state.progress;

        if (!currentProgress.sessionStartTime) {
          set({ sessionTimer: null });
          return;
        }

        const sessionMinutes = Math.round(
          (Date.now() - currentProgress.sessionStartTime) / 60000
        );

        const newProgress = {
          ...currentProgress,
          totalTimeSpentMinutes: currentProgress.totalTimeSpentMinutes + sessionMinutes,
          sessionStartTime: null,
        };

        set({
          progress: newProgress,
          sessionTimer: null,
          ...(state.currentSession && {
            currentSession: {
              ...state.currentSession,
              progress: newProgress,
            },
          }),
        });
      },

      getConceptStatus: (conceptId: string) => {
        const state = get();
        const concepts = state.getConcepts();
        const progress = state.currentSession?.progress || state.progress;

        if (progress.completedConcepts.includes(conceptId)) {
          return 'completed';
        }

        if (progress.currentConceptId === conceptId) {
          return 'current';
        }

        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return 'locked';

        const prerequisitesMet = concept.prerequisites.every(prereq =>
          progress.completedConcepts.includes(prereq)
        );

        return prerequisitesMet ? 'available' : 'locked';
      },

      getStageStatus: (stageId: string) => {
        const state = get();
        const stages = state.getStages();
        const progress = state.currentSession?.progress || state.progress;

        if (progress.completedStages.includes(stageId)) {
          return 'completed';
        }

        if (progress.currentStageId === stageId) {
          return 'current';
        }

        const stage = stages.find(s => s.id === stageId);
        if (!stage) return 'locked';

        const stageIndex = stages.findIndex(s => s.id === stageId);
        if (stageIndex === 0) return 'available';

        const previousStage = stages[stageIndex - 1];
        return progress.completedStages.includes(previousStage.id)
          ? 'available'
          : 'locked';
      },

      getNextConcept: () => {
        const state = get();
        const concepts = state.getConcepts();
        const stages = state.getStages();
        const progress = state.currentSession?.progress || state.progress;

        const currentConcept = concepts.find(
          c => c.id === progress.currentConceptId
        );
        if (!currentConcept) return null;

        const sameStageConcepts = concepts
          .filter(c => c.stageId === currentConcept.stageId)
          .sort((a, b) => a.order - b.order);

        const nextInStage = sameStageConcepts.find(
          c => c.order > currentConcept.order &&
            !progress.completedConcepts.includes(c.id)
        );

        if (nextInStage) return nextInStage.id;

        const currentStageIndex = stages.findIndex(
          s => s.id === currentConcept.stageId
        );

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
        const concepts = state.getConcepts();
        const stages = state.getStages();
        const progress = state.currentSession?.progress || state.progress;

        const currentConcept = concepts.find(
          c => c.id === progress.currentConceptId
        );
        if (!currentConcept) return null;

        const sameStageConcepts = concepts
          .filter(c => c.stageId === currentConcept.stageId)
          .sort((a, b) => a.order - b.order);

        const prevInStage = [...sameStageConcepts]
          .reverse()
          .find(c => c.order < currentConcept.order);

        if (prevInStage) return prevInStage.id;

        const currentStageIndex = stages.findIndex(
          s => s.id === currentConcept.stageId
        );

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
        const state = get();
        const status = state.getConceptStatus(conceptId);
        return status !== 'locked';
      },

      setSprintResult: (result) => {
        const state = get();
        set({ 
          sprintResult: result,
          // Update unified session if active
          ...(state.currentSession && {
            currentSession: {
              ...state.currentSession,
              sprintResult: result,
              mode: 'sprint' as const,
            },
          }),
        });
      },

      clearSprintResult: () => {
        const state = get();
        set({ 
          sprintResult: null,
          ...(state.currentSession && {
            currentSession: {
              ...state.currentSession,
              sprintResult: undefined,
            },
          }),
        });
      },

      setSprintReady: (ready) => set({ isSprintReady: ready }),

      // Cognitive load actions
      recordInteraction: (correct, responseTimeMs) => {
        const state = get();
        // Use session metrics if available, otherwise legacy
        const metrics = state.currentSession?.cognitiveMetrics || state.cognitiveMetrics;

        // Update streaks
        const newConsecutiveCorrect = correct ? metrics.consecutiveCorrect + 1 : 0;
        const newConsecutiveErrors = !correct ? metrics.consecutiveErrors + 1 : 0;

        // Rolling average response time (weighted)
        const newAvgTime = metrics.avgResponseTimeMs === 0
          ? responseTimeMs
          : Math.round(metrics.avgResponseTimeMs * 0.7 + responseTimeMs * 0.3);

        // Calculate cognitive load
        let loadDelta = 0;

        // Fast correct answers reduce load
        if (correct && responseTimeMs < 4000) {
          loadDelta = -5;
        }
        // Slow correct answers slightly reduce load
        else if (correct) {
          loadDelta = -2;
        }
        // Errors increase load significantly
        else {
          loadDelta = 15;
        }

        // Consecutive errors compound the load
        if (newConsecutiveErrors >= 3) {
          loadDelta += 10;
        }

        // Time between interactions affects load
        const timeSinceLastMs = Date.now() - metrics.lastInteractionTime;
        if (timeSinceLastMs > 300000) {  // 5+ minutes
          loadDelta += 5;  // Slight increase for cold restart
        }

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
          cognitiveMetrics: newMetrics,
          showNeuralReset: needsReset,
          // Update unified session if active
          ...(state.currentSession && {
            currentSession: {
              ...state.currentSession,
              cognitiveMetrics: newMetrics,
            },
          }),
        });
      },

      triggerNeuralReset: () => set({ showNeuralReset: true }),

      dismissNeuralReset: () => {
        const state = get();
        const currentMetrics = state.currentSession?.cognitiveMetrics || state.cognitiveMetrics;
        const newMetrics: CognitiveMetrics = {
          ...currentMetrics,
          currentLoad: Math.max(30, currentMetrics.currentLoad - 30),
          consecutiveErrors: 0,
          needsReset: false,
        };
        
        set({
          showNeuralReset: false,
          cognitiveMetrics: newMetrics,
          ...(state.currentSession && {
            currentSession: {
              ...state.currentSession,
              cognitiveMetrics: newMetrics,
            },
          }),
        });
      },

      resetCognitiveLoad: () => {
        const state = get();
        const defaultMetrics = getDefaultCognitiveMetrics();
        
        set({
          cognitiveMetrics: defaultMetrics,
          showNeuralReset: false,
          ...(state.currentSession && {
            currentSession: {
              ...state.currentSession,
              cognitiveMetrics: defaultMetrics,
            },
          }),
        });
      },

      getCognitiveLoadLevel: () => {
        const state = get();
        const { currentLoad } = state.currentSession?.cognitiveMetrics || state.cognitiveMetrics;
        if (currentLoad < 30) return 'low';
        if (currentLoad < 60) return 'optimal';
        if (currentLoad < 85) return 'high';
        return 'overload';
      },
    }),
    {
      name: 'sensa-learning-progress',
      partialize: (state) => ({
        // Unified session (Phase 0.3)
        currentSession: state.currentSession,
        // Legacy state (backward compatibility)
        progress: state.progress,
        customContent: state.customContent,
      }),
    }
  )
);
