
import { useMemo } from 'react';
import { useLearningStore } from '@/store/learning-store';
import type { LearningConcept } from '@/shared/types/learning';
export type LearningPhase =
 | 'IDLE' // No active session
 | 'PRIME' // Intent setting (Start Modal)
 | 'LOCK_IN' // Confirmation gate (VelocityLockInGate)
 | 'SCOUT' // Initial survey (SessionScoutPreview)
 | 'PREVIEW' // Question preview (SessionScoutPreview phase=preview)
 | 'BUILD' // Concept Mapping (ConceptMapBuilder)
 | 'DIAGNOSE' // Diagnostic Assessment (DiagnosticLaunchSystem)
 | 'LEARN' // Micro-Learning Loop (MicroLearningLoopController)
 | 'REMEDIATE' // Neural Reset (triggered when Blank Sheet score < 60%)
 | 'MASTER' // Mastery Challenge (MasteryChallenge)
 | 'COMPLETE'; // All caught up
export interface LearningFlow {
 currentPhase: LearningPhase;
 completedPhases: LearningPhase[];
 activeConcept: LearningConcept | null;
 progress: {
 completed: number;
 total: number;
 percentage: number;
 };
 showDashboard: boolean;
 showStartModal: boolean;
}
export function useLearningFlow(): LearningFlow {
 const {
 currentSession,
 studySession,
 diagnosticSession,
 getNextConcept
 } = useLearningStore();
 // 1. Calculate Active Concept
 const activeConcept = useMemo(() => {
 if (!currentSession) return null;
 // Strategy: Trust the store's "currentConceptId", but verify it's not already complete.
 // If complete, try to find the next incomplete one.
 const currentId = currentSession.progress.currentConceptId;
 const completedIds = currentSession.progress.completedConcepts;
 // If current is valid, incomplete, AND exists in concepts, use it
 if (currentId && !completedIds.includes(currentId)) {
 const current = currentSession.concepts.find(c => c.id === currentId);
 if (current) return current;
 // currentId is stale/invalid, fall through to recovery
 }
 // Try getNextConcept (depends on valid currentConceptId)
 const nextId = getNextConcept();
 if (nextId) {
 const next = currentSession.concepts.find(c => c.id === nextId);
 if (next) return next;
 }
 // RECOVERY: currentId is invalid/completed and getNextConcept failed.
 // Find the FIRST concept that is NOT completed.
 // This ensures we ALWAYS have an activeConcept if there are incomplete concepts.
 const firstIncomplete = currentSession.concepts.find(c => !completedIds.includes(c.id));
 if (firstIncomplete) {
 return firstIncomplete;
 }
 return null;
 }, [currentSession, getNextConcept]);
 // 2. Determine Current Phase (The State Machine)
 const currentPhase = useMemo((): LearningPhase => {
 // --- Level 0: No Session ---
 if (!currentSession) return 'IDLE';
 // --- Level 1: Intent & Primer ---
 // If no study session active, or active but missing primer -> PRIME
 // But wait, VelocityLearning had a "LockIn" logic. 
 // Let's assume PRIME implies the need for the StartModal/Primer flow.
 if (!studySession || !studySession.isActive) {
 // If we have no study session at all, we are at the Start Gate
 // In the old code this was "LockInGate" then "StartModal"
 // Let's call it LOCK_IN for the gate, PRIME for the modal?
 // Actually, simplified: If no session, we need to PRIME.
 return 'PRIME';
 }
 // If active session but no primer set (and we aren't bypassing it)
 if (!studySession.primer) {
 return 'PRIME';
 }
 // ================================================================
 // GOAL-SPECIFIC FLOW ROUTING (Flexible - Accumulates Mastery)
 // ================================================================
 // Key Principle: All completed concepts count toward mastery journey
 // regardless of which goal/mood was active when they were learned.
 // Users can switch between goals and still make progress.
 // --- EXPLORE MODE (Stressed users) ---
 // Zero pressure, calming browse-only experience
 // Shows SensaSynopticView for passive reading
 // BUT: If user has already started learning, let them continue
 if (studySession.goal === 'explore') {
 // If user has already completed some concepts, they can continue learning
 // This allows switching from tired energized mid-session
 const hasStartedLearning = currentSession.progress.completedConcepts.length > 0;
 if (hasStartedLearning) {
 // User started learning in a previous session, let them continue
 // Follow the normal flow based on what's completed
 // (Will fall through to standard flow below)
 } else {
 // Fresh explore session - show calm browse view
 return 'COMPLETE';
 }
 }
 // --- REVIEW MODE (Tired users) ---
 // Light refresher, minimal cognitive load
 // Focuses on reviewing already-learned concepts
 if (studySession.goal === 'review') {
 const hasStartedLearning = currentSession.progress.completedConcepts.length > 0;
 if (hasStartedLearning) {
 // User has progress, let them continue the full flow
 // (Will fall through to standard flow below)
 } else {
 // Fresh review session - light map review only
 if (!studySession.mapBuilt) return 'BUILD';
 // After map, show review interface (COMPLETE with review mode)
 return 'COMPLETE';
 }
 }
 // --- LEARN-NEW MODE (Energized/Neutral users) ---
 // Full learning flow with all phases
 if (studySession.goal === 'learn-new') {
 // Level 2: Scout & Preview (Explore Mode)
 if (!studySession.scouted) return 'SCOUT';
 if (!studySession.previewed) return 'PREVIEW';
 }
 // ================================================================
 // STANDARD FLOW (All Goals Can Progress Through These Phases)
 // ================================================================
 // This allows users to switch moods/goals and still accumulate mastery
 // --- Level 3: Build (Structure) ---
 // After scouting, build the map (or skip if already built)
 if (!studySession.mapBuilt) return 'BUILD';
 // --- Level 4: Diagnose (Optional) ---
 // Priority: If explicit active diagnostic exists DIAGNOSE
 if (diagnosticSession && !diagnosticSession.isComplete) {
 return 'DIAGNOSE';
 }
 const isFresh = currentSession.progress.completedConcepts.length === 0;
 if (isFresh && !diagnosticSession?.isComplete) {
 return 'DIAGNOSE';
 }
 // --- Level 5: Learn (The Loop) ---
 // If there are concepts to learn, show them regardless of goal
 // This allows tired energized transitions to continue learning
 if (activeConcept) {
 return 'LEARN';
 }
 // --- Level 6: Master (Final Challenge) ---
 // All concepts done (activeConcept is null) and not yet mastered
 if (!studySession.mastered) {
 return 'MASTER';
 }
 // --- Level 7: Complete ---
 return 'COMPLETE';
 }, [currentSession, studySession, diagnosticSession, activeConcept]);
 const completedPhases = useMemo(() => {
 const completed: LearningPhase[] = [];
 if (!currentSession || !studySession || !studySession.isActive) {
 return completed;
 }
 if (studySession.primer) {
 completed.push('PRIME');
 }
 if (studySession.mapBuilt) {
 completed.push('BUILD');
 }
 const diagnosticDone = diagnosticSession?.isComplete ?? false;
 const pastDiagnose = ['LEARN', 'MASTER', 'COMPLETE'].includes(currentPhase);
 if (diagnosticDone || pastDiagnose) {
 completed.push('DIAGNOSE');
 }
 const hasCompletedAnyConcepts = currentSession.progress.completedConcepts.length > 0;
 const allConceptsDone = hasCompletedAnyConcepts &&
 currentSession.progress.completedConcepts.length >= currentSession.concepts.length;
 if (allConceptsDone) {
 completed.push('LEARN');
 }
 if (studySession.mastered) {
 completed.push('MASTER');
 }
 return completed;
 }, [currentSession, studySession, diagnosticSession, currentPhase]);
 // 3. Calculated Metrics
 const progress = useMemo(() => {
 if (!currentSession) return { completed: 0, total: 0, percentage: 0 };
 const completed = currentSession.progress.completedConcepts.length;
 const total = currentSession.concepts.length;
 return {
 completed,
 total,
 percentage: total > 0 ? Math.round((completed / total) * 100) : 0
 };
 }, [currentSession]);
 // 4. UI Flags
 const showDashboard = useMemo(() => {
 // Show dashboard during "Meta" phases, hide during deep work
 return ['SCOUT', 'PREVIEW', 'DIAGNOSE', 'COMPLETE', 'IDLE'].includes(currentPhase);
 }, [currentPhase]);
 const showStartModal = currentPhase === 'PRIME';
 return {
 currentPhase,
 completedPhases,
 activeConcept,
 progress,
 showDashboard,
 showStartModal
 };
}
