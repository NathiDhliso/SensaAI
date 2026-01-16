/**
 * Navigation Slice - Manages concept and stage navigation
 * Handles progression, completion, and access control
 */

import type { StateCreator } from 'zustand';
import type { LearningStore, NavigationSliceActions, UserProgress } from './types';
import { getInitialProgress } from './createSessionSlice';

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createNavigationSlice: StateCreator<
  LearningStore,
  [],
  [],
  NavigationSliceActions
> = (set, get) => ({
  completeConcept: (conceptId: string) => {
    const state = get();
    if (!state.currentSession) return;

    const concepts = state.currentSession.concepts;
    const stages = state.currentSession.stages;
    const currentProgress = state.currentSession.progress;

    const concept = concepts.find((c) => c.id === conceptId);
    if (!concept) return;

    const stage = stages.find((s) => s.id === concept.stageId);
    if (!stage) return;

    const newCompletedConcepts = [...currentProgress.completedConcepts, conceptId];
    const today = new Date().toISOString().split('T')[0];
    const conceptsToday =
      currentProgress.lastSessionDate === today
        ? currentProgress.conceptsLearnedToday + 1
        : 1;

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
    };

    set({
      currentSession: {
        ...state.currentSession,
        progress: newProgress,
      },
    });

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

    const currentConcept = concepts.find((c) => c.id === progress.currentConceptId);
    if (!currentConcept) return null;

    const sameStageConcepts = concepts
      .filter((c) => c.stageId === currentConcept.stageId)
      .sort((a, b) => a.order - b.order);

    const nextInStage = sameStageConcepts.find(
      (c) => c.order > currentConcept.order && !progress.completedConcepts.includes(c.id)
    );

    if (nextInStage) return nextInStage.id;

    const currentStageIndex = stages.findIndex((s) => s.id === currentConcept.stageId);

    for (let i = currentStageIndex + 1; i < stages.length; i++) {
      const nextStage = stages[i];
      const firstConcept = concepts
        .filter((c) => c.stageId === nextStage.id)
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
