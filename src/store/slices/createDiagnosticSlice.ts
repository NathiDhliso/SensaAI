/**
 * Diagnostic Slice - Manages diagnostic assessment sessions
 * Used by the Learning Velocity Engine for diagnostic-first learning flow
 */

import type { StateCreator } from 'zustand';
import type {
  LearningStore,
  DiagnosticSliceState,
  DiagnosticSliceActions,
  DiagnosticSession,
} from './types';

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createDiagnosticSlice: StateCreator<
  LearningStore,
  [],
  [],
  DiagnosticSliceState & DiagnosticSliceActions
> = (set, get) => ({
  // Initial State
  diagnosticSession: null,

  // Actions
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
});
