/**
 * Session Slice - Manages the current learning session state
 * Handles loading, updating, and clearing of learning sessions
 */

import type { StateCreator } from 'zustand';
import type {
  LearningStore,
  SessionSliceState,
  SessionSliceActions,
  CurrentSession,
  CognitiveMetrics,
  UserProgress,
  LearningStage,
  LearningConcept,
} from './types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createSessionSlice: StateCreator<
  LearningStore,
  [],
  [],
  SessionSliceState & SessionSliceActions
> = (set, get) => ({
  // Initial State
  currentSession: null,
  sessionTimer: null,

  // Actions
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

  getStages: () => get().currentSession?.stages || [],

  getConcepts: () => get().currentSession?.concepts || [],

  hasCustomContent: () => get().currentSession !== null,

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
});

// Export helper for use in other slices
export { getInitialProgress, getDefaultCognitiveMetrics };
