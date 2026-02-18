/**
 * Study Slice - Manages study sessions with SENSA phases
 * Handles session lifecycle, predictions, metrics, and phase completion
 */
import type { StateCreator } from 'zustand';
import type {
 LearningStore,
 StudySliceState,
 StudySliceActions,
 StudySession,
 StudyGoal,
 LifecyclePhaseKey,
 EnhancedCognitiveMetrics,
 SessionPrimer,
 ConceptMapData
} from './types';
import { getSpacingEngine } from '@/features/learning-session/algorithms/spacing-engine';
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
 flowStateMinutes: 0
});
const createStudySession = (
 subjectId: string,
 goal: StudyGoal,
 targetDuration: number,
 targetConcepts: string[] = [],
 primer: SessionPrimer | null = null,
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
 primer: primer,
 scouted: false,
 previewed: false,
 mapBuilt: false,
 conceptMap: null,
 mapReconstructed: false,
 mastered: false,
 overviewViewed: false,
 predictions: {},
 checkpointOffers: 0,
 lastCheckpointAt: null,
 isInFlowState: false,
 timeToastShownAt: null
});
// ============================================================================
// SLICE CREATOR
// ============================================================================
export const createStudySlice: StateCreator<
 LearningStore,
 [],
 [],
 StudySliceState & StudySliceActions
> = (set, get) => ({
 // Initial State
 studySession: null,
 showSessionModal: false,
 // Actions
 startStudySession: (goal, duration, targetConcepts = [], primer = null) => {
 const state = get();
 const subjectId = state.currentSession?.subjectId || 'unknown';
 const session = createStudySession(subjectId, goal, duration, targetConcepts, primer);
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
 setMood: (mood) => {
 const state = get();
 if (!state.studySession) return;
 set({
 studySession: {
 ...state.studySession,
 mood
 }
 });
 },
 setSessionGoal: (goal: StudyGoal) => {
 const state = get();
 if (!state.studySession) return;
 set({
 studySession: {
 ...state.studySession,
 goal
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
 markOverviewViewed: () => {
 set((state) => ({
 studySession: state.studySession
 ? { ...state.studySession, overviewViewed: true }
 : null
 }));
 },
 returnToMapBuilding: () => {
 set((state) => ({
 studySession: state.studySession
 ? { ...state.studySession, mapBuilt: false }
 : null
 }));
 },
 markSessionMapReconstructed: (_passed: boolean) => {
 const state = get();
 const currentConceptId = state.currentSession?.progress?.currentConceptId;
 if (currentConceptId) {
 try {
 const spacing = getSpacingEngine();
 if (spacing.getReview(currentConceptId)) {
 spacing.recordReviewWithQuality(currentConceptId, 4);
 }
 } catch { /* non-critical */ }
 }
 set((state) => ({
 studySession: state.studySession
 ? { ...state.studySession, mapReconstructed: true }
 : null
 }));
 },
 markSessionMastered: () => {
 const state = get();
 const currentConceptId = state.currentSession?.progress?.currentConceptId;
 if (currentConceptId) {
 try {
 const spacing = getSpacingEngine();
 if (spacing.getReview(currentConceptId)) {
 spacing.recordReviewWithQuality(currentConceptId, 5);
 }
 } catch { /* non-critical */ }
 }
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
 updateStudyMetrics: (metrics) => {
 const state = get();
 if (!state.studySession) return;
 set({
 studySession: {
 ...state.studySession,
 metrics: { ...state.studySession.metrics, ...metrics }
 }
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
 uninterruptedConceptStreak: session.metrics.uninterruptedConceptStreak + 1
 }
 }
 });
 },
 recordConfusionDrill: (passed) => {
 const state = get();
 if (!state.studySession) return;
 const session = state.studySession;
 const newAccuracy = passed
 ? Math.min(100, session.metrics.confusionDrillAccuracy + 10)
 : Math.max(0, session.metrics.confusionDrillAccuracy - 5);
 const currentConceptId = state.currentSession?.progress?.currentConceptId;
 if (currentConceptId) {
 try {
 const spacing = getSpacingEngine();
 if (spacing.getReview(currentConceptId)) {
 spacing.recordReviewWithQuality(currentConceptId, passed ? 4 : 1);
 }
 } catch { /* non-critical */ }
 }
 set({
 studySession: {
 ...session,
 confusionDrillsCompleted: session.confusionDrillsCompleted + 1,
 metrics: { ...session.metrics, confusionDrillAccuracy: newAccuracy }
 }
 });
 },
 recordBreak: () => {
 const state = get();
 if (!state.studySession) return;
 set({
 studySession: {
 ...state.studySession,
 breaksTaken: state.studySession.breaksTaken + 1,
 metrics: { ...state.studySession.metrics, uninterruptedConceptStreak: 0 }
 }
 });
 },
 setShowSessionModal: (show) => set({ showSessionModal: show }),
 updateSessionEquation: (equation) => {
 const state = get();
 if (!state.studySession) return;
 set({
  studySession: {
  ...state.studySession,
  equation
  }
 });
 },
 getStudySessionStats: () => {
 const state = get();
 if (!state.studySession) return null;
 const session = state.studySession;
 const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 1000 / 60;
 const goalProgress =
 session.targetConcepts.length > 0
 ? (session.conceptsCompleted.length / session.targetConcepts.length) * 100
 : (elapsed / session.targetDuration) * 100;
 return {
 elapsedMinutes: Math.round(elapsed),
 conceptsCompleted: session.conceptsCompleted.length,
 goalProgress: Math.min(100, Math.round(goalProgress))
 };
 }
});
// Export helper for use in other slices
export { getDefaultEnhancedMetrics };
