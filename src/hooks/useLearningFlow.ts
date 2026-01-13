
import { useMemo } from 'react';
import { useLearningStore } from '@/store/learning-store';
import type { LearningConcept } from '@/lib/types/learning';

export type LearningPhase =
    | 'IDLE'            // No active session
    | 'PRIME'           // Intent setting (Start Modal)
    | 'LOCK_IN'         // Confirmation gate (VelocityLockInGate)
    | 'SCOUT'           // Initial survey (SessionScoutPreview)
    | 'PREVIEW'         // Question preview (SessionScoutPreview phase=preview)
    | 'BUILD'           // Concept Mapping (ConceptMapBuilder)
    | 'DIAGNOSE'        // Diagnostic Assessment (DiagnosticLaunchSystem)
    | 'LEARN'           // Micro-Learning Loop (MicroLearningLoopController)
    | 'REMEDIATE'       // Neural Reset (triggered when Blank Sheet score < 60%)
    | 'MASTER'          // Mastery Challenge (MasteryChallenge)
    | 'COMPLETE';       // All caught up

export interface LearningFlow {
    currentPhase: LearningPhase;
    activeConcept: LearningConcept | null;
    progress: {
        completed: number;
        total: number;
        percentage: number;
    };
    // Flags for UI decision making
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
        // GOAL-SPECIFIC FLOW ROUTING
        // ================================================================

        // --- EXPLORE MODE (Stressed users) ---
        // Zero pressure, calming browse-only experience
        // NO testing, NO active recall, just passive reading
        if (studySession.goal === 'explore') {
            // Skip everything — go straight to COMPLETE which shows a calm browse view
            // The user can read concepts at their own pace without any assessments
            return 'COMPLETE';
        }

        // --- REVIEW MODE (Tired users) ---
        // Light refresher, minimal cognitive load
        // Skip exploration phases, just light map review then complete
        if (studySession.goal === 'review') {
            // Optional: light map review, but skip all testing
            if (!studySession.mapBuilt) return 'BUILD';
            // After map, go straight to COMPLETE (no Learn phase, no Blank Sheet)
            return 'COMPLETE';
        }

        // --- LEARN-NEW MODE (Energized/Neutral users) ---
        // Full learning flow with all phases
        if (studySession.goal === 'learn-new') {
            // Level 2: Scout & Preview (Explore Mode)
            if (!studySession.scouted) return 'SCOUT';
            if (!studySession.previewed) return 'PREVIEW';
        }

        // --- Level 3: Build (Structure) ---
        // After scouting, build the map
        if (!studySession.mapBuilt) return 'BUILD';

        // --- Level 4: Diagnose (Optional) ---
        // Priority: If explicit active diagnostic exists -> DIAGNOSE
        if (diagnosticSession && !diagnosticSession.isComplete) {
            return 'DIAGNOSE';
        }
        // Auto-detect need for diagnostic (Fresh session + Foundation Content)
        // Only if we haven't started learning yet (no completed concepts)
        const isFresh = currentSession.progress.completedConcepts.length === 0;
        const foundationCount = currentSession.metadata?.foundationConcepts ?? 0;
        if (isFresh && foundationCount >= 5 && !activeConcept) {
            // Note: !activeConcept check acts as a safeguard, but really we check completion
            return 'DIAGNOSE';
        }

        // --- Level 5: Learn (The Loop) ---
        if (activeConcept) {
            return 'LEARN';
        }



        if (studySession.mapReconstructed && !studySession.mastered) {
            return 'MASTER';
        }

        // --- Level 7: Complete ---
        return 'COMPLETE';

    }, [currentSession, studySession, diagnosticSession, activeConcept]);

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
        activeConcept,
        progress,
        showDashboard,
        showStartModal
    };
}
