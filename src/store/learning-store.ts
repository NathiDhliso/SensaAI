/**
 * Learning Store - Unified state management for learning sessions
 * 
 * This store composes multiple slices for maintainability:
 * - SessionSlice: Current learning session management
 * - DiagnosticSlice: Diagnostic assessment sessions
 * - StudySlice: Study session lifecycle and phases
 * - NavigationSlice: Concept/stage navigation and progression
 * - CognitiveSlice: Cognitive load tracking
 * - FocusSlice: Pomodoro-style focus sessions
 * - UISlice: Celebrations, modals, and UI preferences
 * 
 * @module store/learning-store
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/shared/constants/storage-keys';
import { cleanupExpiredActivityDrafts } from '@/shared/hooks/useActivityAutosave';
import { userdataApi } from '@/shared/api/userdata';
import { getCurrentUserId, fireAndForget } from '@/shared/api/cloud-sync';
// Import slice creators
import {
    createSessionSlice,
    createDiagnosticSlice,
    createStudySlice,
    createNavigationSlice,
    createCognitiveSlice,
    createFocusSlice,
    createUISlice
} from './slices';
// Import types
import type { LearningStore } from './slices';
// Re-export types for backward compatibility
export type {
    ContentMetadata,
    CognitiveMetrics,
    ConceptTiming,
    PaceRating,
    SessionSummary,
    CurrentSession,
    DiagnosticSession,
    LearningStore
} from './slices';
// ============================================================================
// STORE CREATION
// ============================================================================
export const useLearningStore = create<LearningStore>()(
    persist(
        (...args) => ({
            // Compose all slices
            ...createSessionSlice(...args),
            ...createDiagnosticSlice(...args),
            ...createStudySlice(...args),
            ...createNavigationSlice(...args),
            ...createCognitiveSlice(...args),
            ...createFocusSlice(...args),
            ...createUISlice(...args)
        }),
        {
            name: STORAGE_KEYS.LEARNING_STORE,
            partialize: (state) => ({
                // Session persistence
                currentSession: state.currentSession,
                // Focus session persistence
                focusDurationMinutes: state.focusDurationMinutes,
                breakDurationMinutes: state.breakDurationMinutes,
                totalSessionsCompleted: state.totalSessionsCompleted,
                totalFocusMinutes: state.totalFocusMinutes,
                totalConceptsMastered: state.totalConceptsMastered,
                sessionsUntilLongBreak: state.sessionsUntilLongBreak
            }),
            onRehydrateStorage: () => (state) => {
                // After localStorage restore, merge with cloud stats
                if (!state) return;
                const userId = getCurrentUserId();
                if (!userId) return;
                userdataApi.getAll(userId, 'STATS#focus').then(response => {
                    const cloudItem = response.items?.[0];
                    if (!cloudItem?.data) return;
                    const cloud = cloudItem.data as Record<string, number>;
                    const current = useLearningStore.getState();
                    // Take the max of each counter
                    const merged = {
                        totalSessionsCompleted: Math.max(current.totalSessionsCompleted || 0, cloud.totalSessionsCompleted || 0),
                        totalFocusMinutes: Math.max(current.totalFocusMinutes || 0, cloud.totalFocusMinutes || 0),
                        totalConceptsMastered: Math.max(current.totalConceptsMastered || 0, cloud.totalConceptsMastered || 0),
                    };
                    if (merged.totalSessionsCompleted > (current.totalSessionsCompleted || 0) ||
                        merged.totalFocusMinutes > (current.totalFocusMinutes || 0) ||
                        merged.totalConceptsMastered > (current.totalConceptsMastered || 0)) {
                        useLearningStore.setState(merged);
                        console.log('[LearningStore] Merged focus stats from cloud');
                    }
                }).catch(e => console.warn('[LearningStore] Cloud stats sync failed:', e));
            }
        }
    )
);
// Re-export for backward compatibility with existing imports
export const useFocusSessionStore = useLearningStore;
// ============================================================================
// STALE STATE GUARD (Zombie Session Prevention)
// ============================================================================
/**
 * Automatically clears completed sessions older than 24 hours to prevent
 * "zombie sessions" where users are permanently stuck on the "All Caught Up" screen.
 * 
 * This runs once on app initialization.
 */
const STALE_SESSION_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
const initializeStaleStateGuard = () => {
    const state = useLearningStore.getState();
    const { currentSession, studySession, clearSession } = state;
    // Check if we have a completed study session
    if (studySession && studySession.mastered && studySession.endedAt) {
        const sessionEndTime = new Date(studySession.endedAt).getTime();
        const now = Date.now();
        const age = now - sessionEndTime;
        if (age > STALE_SESSION_THRESHOLD_MS) {
            console.warn('[StaleStateGuard] Clearing zombie session older than 24h:', {
                sessionId: studySession.id,
                endedAt: studySession.endedAt,
                ageHours: Math.round(age / (60 * 60 * 1000))
            });
            clearSession();
        }
    }
    // Also check if current session is in a stale state
    if (currentSession && currentSession.createdAt) {
        const sessionCreateTime = new Date(currentSession.createdAt).getTime();
        const now = Date.now();
        const age = now - sessionCreateTime;
        // If session is older than 24h and all concepts are completed, clear it
        const allConceptsComplete =
            currentSession.concepts.length > 0 &&
            currentSession.concepts.every((c) =>
                currentSession.progress.completedConcepts.includes(c.id)
            );
        if (age > STALE_SESSION_THRESHOLD_MS && allConceptsComplete) {
            console.warn('[StaleStateGuard] Clearing stale completed session:', {
                sessionId: currentSession.id,
                createdAt: currentSession.createdAt,
                ageHours: Math.round(age / (60 * 60 * 1000))
            });
            clearSession();
        }
    }
};
// Run the guard on module initialization
if (typeof window !== 'undefined') {
    initializeStaleStateGuard();
    cleanupExpiredActivityDrafts();

    // Subscribe to focus stats changes and sync to cloud (debounced)
    let focusSyncTimeout: ReturnType<typeof setTimeout> | null = null;
    let prevStats = {
        s: useLearningStore.getState().totalSessionsCompleted,
        f: useLearningStore.getState().totalFocusMinutes,
        c: useLearningStore.getState().totalConceptsMastered,
    };
    useLearningStore.subscribe((state) => {
        const cur = {
            s: state.totalSessionsCompleted,
            f: state.totalFocusMinutes,
            c: state.totalConceptsMastered,
        };
        if (cur.s === prevStats.s && cur.f === prevStats.f && cur.c === prevStats.c) return;
        prevStats = cur;
        if (focusSyncTimeout) clearTimeout(focusSyncTimeout);
        focusSyncTimeout = setTimeout(() => {
            const userId = getCurrentUserId();
            if (!userId) return;
            fireAndForget(
                () => userdataApi.put(userId, 'STATS#focus', {
                    totalSessionsCompleted: state.totalSessionsCompleted,
                    totalFocusMinutes: state.totalFocusMinutes,
                    totalConceptsMastered: state.totalConceptsMastered,
                }),
                'focusStats'
            );
        }, 2000); // 2s debounce
    });
}
