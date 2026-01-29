/**
 * Focus Slice - Manages Pomodoro-style focus sessions
 * Handles timers, concept timing tracking, and session summaries
 */

import type { StateCreator } from 'zustand';
import type {
  LearningStore,
  FocusSliceState,
  FocusSliceActions,
  ConceptTiming,
  SessionSummary,
  PaceRating,
} from './types';
import { FOCUS_SESSION_CONFIG, UI_TIMINGS } from '@/shared/constants/ui-constants';

// ============================================================================
// INITIAL STATE
// ============================================================================

export const getInitialFocusSessionState = (): FocusSliceState => ({
  isSessionActive: false,
  isPaused: false,
  sessionType: 'focus' as const,
  focusDurationMinutes: FOCUS_SESSION_CONFIG.DEFAULT_FOCUS_MINUTES,
  breakDurationMinutes: FOCUS_SESSION_CONFIG.DEFAULT_BREAK_MINUTES,
  timeRemainingSeconds: FOCUS_SESSION_CONFIG.DEFAULT_FOCUS_MINUTES * 60,
  focusSessionStartTime: null,
  currentFocusConceptId: null,
  currentFocusConceptStartTime: null,
  conceptTimings: [],
  totalSessionsCompleted: 0,
  totalFocusMinutes: 0,
  totalConceptsMastered: 0,
  sessionsUntilLongBreak: FOCUS_SESSION_CONFIG.SESSIONS_UNTIL_LONG_BREAK,
  showSessionSummary: false,
  lastSessionSummary: null,
});

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createFocusSlice: StateCreator<
  LearningStore,
  [],
  [],
  FocusSliceState & FocusSliceActions
> = (set, get) => ({
  // Initial State
  ...getInitialFocusSessionState(),

  // Actions
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
      const timing = state.conceptTimings.find(
        (t) => t.conceptId === state.currentFocusConceptId
      );
      if (timing && timing.endTime === null) {
        timing.endTime = Date.now();
        timing.durationSeconds = Math.round((timing.endTime - timing.startTime) / 1000);
      }
    }

    const sessionDurationMinutes = state.focusSessionStartTime
      ? Math.round((Date.now() - state.focusSessionStartTime) / 60000)
      : 0;

    const summary = get().getSessionSummary();
    const completedConcepts = state.conceptTimings.filter((t) => t.completed).length;

    set({
      isSessionActive: false,
      isPaused: false,
      focusSessionStartTime: null,
      currentFocusConceptId: null,
      currentFocusConceptStartTime: null,
      totalSessionsCompleted: state.totalSessionsCompleted + 1,
      totalFocusMinutes: state.totalFocusMinutes + sessionDurationMinutes,
      totalConceptsMastered: state.totalConceptsMastered + completedConcepts,
      sessionsUntilLongBreak:
        state.sessionsUntilLongBreak > 1
          ? state.sessionsUntilLongBreak - 1
          : FOCUS_SESSION_CONFIG.SESSIONS_UNTIL_LONG_BREAK,
      showSessionSummary: true,
      lastSessionSummary: summary,
    });
  },

  startBreak: () => {
    const state = get();
    const breakMinutes =
      state.sessionsUntilLongBreak === 0
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

    const existing = state.conceptTimings.find((t) => t.conceptId === conceptId);
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
    const timing = timings.find((t) => t.conceptId === conceptId);

    if (timing && state.currentFocusConceptStartTime) {
      const additionalTime = Math.round(
        (Date.now() - state.currentFocusConceptStartTime) / 1000
      );
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

  getSessionSummary: (): SessionSummary => {
    const state = get();
    const timings = state.conceptTimings;

    const duration = state.focusSessionStartTime
      ? Math.round((Date.now() - state.focusSessionStartTime) / 1000)
      : 0;

    const conceptsWithTime = timings.filter((t) => t.durationSeconds > 0);
    const avgPace =
      conceptsWithTime.length > 0
        ? Math.round(
            conceptsWithTime.reduce((sum, t) => sum + t.durationSeconds, 0) /
              conceptsWithTime.length
          )
        : 0;

    const paceRating = get().getPaceRating(avgPace);

    let recommendation = '';
    switch (paceRating) {
      case 'optimal':
        recommendation = "Excellent pacing! You're reading efficiently. Keep this rhythm.";
        break;
      case 'good':
        recommendation = "Good pace! You're taking time to understand concepts well.";
        break;
      case 'warning':
        recommendation = 'Consider taking shorter reviews. Focus on key terms first.';
        break;
      case 'overtime':
        recommendation =
          'Try the Speed Reader technique: scan headings, then key terms, then details.';
        break;
    }

    return {
      duration,
      conceptsCount: timings.length,
      conceptsCompleted: timings.filter((t) => t.completed).length,
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
    const totalSeconds =
      state.sessionType === 'focus'
        ? state.focusDurationMinutes * 60
        : state.breakDurationMinutes * 60;
    return ((totalSeconds - state.timeRemainingSeconds) / totalSeconds) * 100;
  },

  getConceptsThisSession: () => get().conceptTimings.length,

  getAvgPaceThisSession: () => {
    const timings = get().conceptTimings.filter((t) => t.durationSeconds > 0);
    if (timings.length === 0) return 0;
    return Math.round(
      timings.reduce((sum, t) => sum + t.durationSeconds, 0) / timings.length
    );
  },

  getPaceRating: (avgSeconds): PaceRating => {
    const target = FOCUS_SESSION_CONFIG.CONCEPT_TARGET_SECONDS;
    const ratio = avgSeconds / target;

    if (ratio <= FOCUS_SESSION_CONFIG.PACE_THRESHOLDS.optimal) return 'optimal';
    if (ratio <= FOCUS_SESSION_CONFIG.PACE_THRESHOLDS.good) return 'good';
    if (ratio <= FOCUS_SESSION_CONFIG.PACE_THRESHOLDS.warning) return 'warning';
    return 'overtime';
  },
});
