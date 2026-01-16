/**
 * Cognitive Slice - Manages cognitive load tracking
 * Handles interaction recording, neural reset, and load level calculation
 */

import type { StateCreator } from 'zustand';
import type { LearningStore, CognitiveSliceState, CognitiveSliceActions, CognitiveMetrics } from './types';
import { getDefaultCognitiveMetrics } from './createSessionSlice';

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createCognitiveSlice: StateCreator<
  LearningStore,
  [],
  [],
  CognitiveSliceState & CognitiveSliceActions
> = (set, get) => ({
  // Initial State
  showNeuralReset: false,

  // Actions
  recordInteraction: (correct, responseTimeMs) => {
    const state = get();
    if (!state.currentSession) return;

    const metrics = state.currentSession.cognitiveMetrics;

    const newConsecutiveCorrect = correct ? metrics.consecutiveCorrect + 1 : 0;
    const newConsecutiveErrors = !correct ? metrics.consecutiveErrors + 1 : 0;

    const newAvgTime =
      metrics.avgResponseTimeMs === 0
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
});
