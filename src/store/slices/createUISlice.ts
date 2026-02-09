/**
 * UI Slice - Manages UI state for celebrations, modals, and user preferences
 * Handles celebration triggers, explore mode, and learning profile
 */
import type { StateCreator } from 'zustand';
import type {
 LearningStore,
 UISliceState,
 UISliceActions,
 CelebrationData,
 LearningProfile
} from './types';
// ============================================================================
// SLICE CREATOR
// ============================================================================
export const createUISlice: StateCreator<
 LearningStore,
 [],
 [],
 UISliceState & UISliceActions
> = (set) => ({
 // Initial State
 showCelebration: false,
 celebrationData: null,
 isExploreMode: false,
 learningProfile: {
 onboardingCompleted: false
 },
 // Actions
 triggerCelebration: (data: CelebrationData) => {
 set({ showCelebration: true, celebrationData: data });
 },
 dismissCelebration: () => {
 set({ showCelebration: false, celebrationData: null });
 },
 toggleExploreMode: () => {
 set((state) => ({ isExploreMode: !state.isExploreMode }));
 },
 setLearningProfile: (profileUpdate: Partial<LearningProfile>) => {
 set((state) => ({
 learningProfile: {
 ...state.learningProfile,
 ...profileUpdate
 }
 }));
 }
});