/**
 * Navigation Slice - Manages concept and stage navigation
 * Handles progression, completion, and access control
 */

import type { StateCreator } from 'zustand';
import type { LearningStore, NavigationSliceActions, UserProgress } from './types';
import { getInitialProgress } from './createSessionSlice';
import { normalizeScore, determineStatus } from '@/lib/utils/score-utils';
import { saveSessionProgress } from '@/lib/storage/session-progress';

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createNavigationSlice: StateCreator<
  LearningStore,
  [],
  [],
  NavigationSliceActions
> = (set, get) => ({
  completeConcept: (conceptId: string, score?: number, outcome?: 'mastered' | 'needs-learning' | 'needs-review') => {
    const state = get();
    if (!state.currentSession) return;

    const concepts = state.currentSession.concepts;
    const stages = state.currentSession.stages;
    const currentProgress = state.currentSession.progress;

    const concept = concepts.find((c) => c.id === conceptId);
    if (!concept) return;

    const stage = stages.find((s) => s.id === concept.stageId);
    if (!stage) return;

    // Track attempts
    const attempts = (currentProgress.conceptAttempts[conceptId] || 0) + 1;
    const maxAttempts = currentProgress.maxAttemptsPerConcept || 3;
    
    // Normalize score to handle edge cases (null, NaN, out of range)
    const normalizedScore = normalizeScore(score, 0);
    
    // Determine status using utility function (handles boundaries explicitly)
    let status: 'not-started' | 'in-progress' | 'needs-review' | 'mastered' | 'skipped' = 'in-progress';
    
    if (attempts >= maxAttempts) {
      // Max attempts reached - skip this concept
      status = 'skipped';
      console.warn(`[Navigation] Concept ${conceptId} skipped after ${attempts} attempts`);
    } else if (outcome) {
      // Use provided outcome
      if (outcome === 'mastered') {
        status = 'mastered';
      } else if (outcome === 'needs-review') {
        status = 'needs-review';
      } else {
        status = 'in-progress'; // needs-learning -> keep trying
      }
    } else if (score !== undefined) {
      // Derive status from score using utility function
      const derivedStatus = determineStatus(normalizedScore);
      status = derivedStatus === 'needs-learning' ? 'in-progress' : derivedStatus;
    }

    // Update attempts and scores
    const newConceptAttempts = { ...currentProgress.conceptAttempts, [conceptId]: attempts };
    const newConceptScores = { ...currentProgress.conceptScores, [conceptId]: normalizedScore };
    const newConceptStatuses = { ...currentProgress.conceptStatuses, [conceptId]: status };

    // Only add to completed if mastered or skipped
    const shouldComplete = status === 'mastered' || status === 'skipped';
    const newCompletedConcepts = shouldComplete && !currentProgress.completedConcepts.includes(conceptId)
      ? [...currentProgress.completedConcepts, conceptId]
      : currentProgress.completedConcepts;

    const today = new Date().toISOString().split('T')[0];
    const conceptsToday =
      currentProgress.lastSessionDate === today
        ? currentProgress.conceptsLearnedToday + (shouldComplete ? 1 : 0)
        : (shouldComplete ? 1 : 0);

    const stageConceptIds = concepts.filter((c) => c.stageId === stage.id).map((c) => c.id);
    const allStageConceptsComplete = stageConceptIds.every((id) =>
      newCompletedConcepts.includes(id)
    );

    const newCompletedStages = [...currentProgress.completedStages];
    if (allStageConceptsComplete && !newCompletedStages.includes(stage.id)) {
      newCompletedStages.push(stage.id);
    }

    const nextConcept = state.getNextConcept();
    const nextConceptData = nextConcept ? concepts.find((c) => c.id === nextConcept) : null;
    const nextStageId = nextConceptData?.stageId || currentProgress.currentStageId;

    const newProgress: UserProgress = {
      ...currentProgress,
      completedConcepts: newCompletedConcepts,
      completedStages: newCompletedStages,
      currentConceptId: nextConcept || conceptId,
      currentStageId: nextStageId,
      conceptsLearnedToday: conceptsToday,
      lastSessionDate: today,
      conceptAttempts: newConceptAttempts,
      conceptScores: newConceptScores,
      conceptStatuses: newConceptStatuses,
    };

    set({
      currentSession: {
        ...state.currentSession,
        progress: newProgress,
      },
    });

    // CRITICAL: Persist progress to localStorage immediately
    // This allows recovery after browser refresh or tab close
    try {
      saveSessionProgress({
        sessionId: state.currentSession.id,
        subjectId: state.currentSession.subjectId,
        progress: newProgress,
        currentPhase: 'LEARN', // TODO: Get actual phase from state
        activeConcept: nextConcept,
      });
    } catch (error) {
      console.error('[Navigation] Failed to persist progress:', error);
      // Don't throw - progress saving is non-critical
    }

    // Show intervention modal if max attempts reached
    if (status === 'skipped') {
      // TODO: Trigger intervention modal
      console.log(`[Navigation] Intervention needed for concept ${conceptId} (score: ${normalizedScore.toFixed(2)})`);
    }

    // Trigger celebrations
    if (allStageConceptsComplete) {
      const allStagesComplete = stages.every((s) => newCompletedStages.includes(s.id));

      if (allStagesComplete) {
        get().triggerCelebration({
          type: 'course',
          title: 'Course Complete!',
          message: "Congratulations! You've mastered all the core concepts!",
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

    const concept = state.currentSession.concepts.find((c) => c.id === conceptId);
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

  getConceptStatus: (conceptId: string) => {
    const state = get();
    if (!state.currentSession) return 'locked';

    const { progress, concepts } = state.currentSession;

    if (progress.completedConcepts.includes(conceptId)) return 'completed';
    if (progress.currentConceptId === conceptId) return 'current';

    const concept = concepts.find((c) => c.id === conceptId);
    if (!concept) return 'locked';

    const prerequisitesMet = (concept.prerequisites || []).every((prereq) =>
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

    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return 'locked';

    const stageIndex = stages.findIndex((s) => s.id === stageId);
    if (stageIndex === 0) return 'available';

    const previousStage = stages[stageIndex - 1];
    return progress.completedStages.includes(previousStage.id) ? 'available' : 'locked';
  },

  getNextConcept: () => {
    const state = get();
    if (!state.currentSession) return null;

    const { concepts, stages, progress } = state.currentSession;
    const maxAttempts = progress.maxAttemptsPerConcept || 3;

    const currentConcept = concepts.find((c) => c.id === progress.currentConceptId);
    if (!currentConcept) return null;

    // Filter out concepts that are completed or have reached max attempts
    const isAvailable = (conceptId: string) => {
      if (progress.completedConcepts.includes(conceptId)) return false;
      const attempts = progress.conceptAttempts[conceptId] || 0;
      const status = progress.conceptStatuses[conceptId];
      if (status === 'skipped') return false;
      if (attempts >= maxAttempts && status !== 'mastered') return false;
      return true;
    };

    const sameStageConcepts = concepts
      .filter((c) => c.stageId === currentConcept.stageId)
      .sort((a, b) => a.order - b.order);

    const nextInStage = sameStageConcepts.find(
      (c) => c.order > currentConcept.order && isAvailable(c.id)
    );

    if (nextInStage) return nextInStage.id;

    const currentStageIndex = stages.findIndex((s) => s.id === currentConcept.stageId);

    for (let i = currentStageIndex + 1; i < stages.length; i++) {
      const nextStage = stages[i];
      const firstConcept = concepts
        .filter((c) => c.stageId === nextStage.id)
        .sort((a, b) => a.order - b.order)[0];

      if (firstConcept && isAvailable(firstConcept.id)) {
        return firstConcept.id;
      }
    }

    // EXIT CONDITION: No more available concepts
    // All concepts are either completed or have reached max attempts
    console.log('[Navigation] No more available concepts - all completed or max attempts reached');
    return null;
  },

  getPreviousConcept: () => {
    const state = get();
    if (!state.currentSession) return null;

    const { concepts, stages, progress } = state.currentSession;

    const currentConcept = concepts.find((c) => c.id === progress.currentConceptId);
    if (!currentConcept) return null;

    const sameStageConcepts = concepts
      .filter((c) => c.stageId === currentConcept.stageId)
      .sort((a, b) => a.order - b.order);

    const prevInStage = [...sameStageConcepts]
      .reverse()
      .find((c) => c.order < currentConcept.order);

    if (prevInStage) return prevInStage.id;

    const currentStageIndex = stages.findIndex((s) => s.id === currentConcept.stageId);

    if (currentStageIndex > 0) {
      const prevStage = stages[currentStageIndex - 1];
      const lastConcept = concepts
        .filter((c) => c.stageId === prevStage.id)
        .sort((a, b) => b.order - a.order)[0];

      if (lastConcept) return lastConcept.id;
    }

    return null;
  },

  canAccessConcept: (conceptId: string) => {
    return get().getConceptStatus(conceptId) !== 'locked';
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
});
