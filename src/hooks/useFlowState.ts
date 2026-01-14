/**
 * useFlowState Hook
 * 
 * Detects when a user is in a productive "flow state" based on
 * behavioral signals, and provides functions to manage checkpoints.
 * 
 * Flow state is protected - we suppress interruptions when detected.
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useLearningStore } from '@/store/learning-store';
import { FLOW_STATE } from '@/constants/ui-constants';

export interface FlowStateInfo {
    /** Whether the user is currently in flow state */
    isInFlow: boolean;
    /** Current uninterrupted streak count */
    streakCount: number;
    /** Whether a checkpoint should be shown */
    shouldShowCheckpoint: boolean;
    /** Whether a health break should be suggested (90+ min) */
    shouldShowHealthBreak: boolean;
    /** Time since session started in ms */
    sessionDurationMs: number;
    /** Whether time goal has been exceeded */
    timeGoalExceeded: boolean;
}

export function useFlowState(): FlowStateInfo {
    const { studySession } = useLearningStore();

    const [sessionDurationMs, setSessionDurationMs] = useState(0);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000); // Update every second to keep duration accurate
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!studySession?.startedAt) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync derived state from external clock
            setSessionDurationMs(0);
            return;
        }
        const startTime = new Date(studySession.startedAt).getTime();
        setSessionDurationMs(now - startTime);
    }, [now, studySession?.startedAt]);

    const targetDurationMs = useMemo(() => {
        return (studySession?.targetDuration || 30) * 60 * 1000;
    }, [studySession?.targetDuration]);

    const timeGoalExceeded = sessionDurationMs > targetDurationMs;

    const streakCount = studySession?.metrics?.uninterruptedConceptStreak || 0;
    const averageConceptTime = studySession?.metrics?.averageConceptTime || 0;
    const flowStateMinutes = studySession?.metrics?.flowStateMinutes || 0;

    // Calculate user baseline (use default if not enough data)
    const userBaseline = useMemo(() => {
        // Default baseline: 2 minutes per concept
        const DEFAULT_BASELINE = 120;

        // Use session average if available
        if (averageConceptTime > 0) {
            return averageConceptTime;
        }

        return DEFAULT_BASELINE;
    }, [averageConceptTime]);

    // Flow state detection
    const isInFlow = useMemo(() => {
        // Need at least some activity to be in flow
        if (streakCount < FLOW_STATE.MIN_STREAK_FOR_FLOW) return false;

        // Check if user is faster than baseline
        if (averageConceptTime > 0 && userBaseline > 0) {
            if (averageConceptTime > userBaseline * FLOW_STATE.SPEED_THRESHOLD) {
                return false;
            }
        }

        // If we've tracked flow minutes, use that
        if (flowStateMinutes > 0) return true;

        // Base case: streak is high enough
        return streakCount >= FLOW_STATE.MIN_STREAK_FOR_FLOW;
    }, [streakCount, averageConceptTime, userBaseline, flowStateMinutes]);

    // Checkpoint logic
    const shouldShowCheckpoint = useMemo(() => {
        // Don't show if in flow
        if (isInFlow) return false;

        // Only show if time goal exceeded
        if (!timeGoalExceeded) return false;

        // Don't show if we recently offered one and they declined
        const lastCheckpoint = studySession?.lastCheckpointAt;
        if (lastCheckpoint) {
            const timeSinceCheckpoint = now - new Date(lastCheckpoint).getTime();
            if (timeSinceCheckpoint < FLOW_STATE.CHECKPOINT_BUFFER_MS) {
                return false;
            }
        }

        return true;
    }, [isInFlow, timeGoalExceeded, studySession?.lastCheckpointAt, now]);

    // Health break logic (90+ min continuous learning)
    const shouldShowHealthBreak = useMemo(() => {
        return sessionDurationMs >= FLOW_STATE.HEALTH_BREAK_THRESHOLD_MS;
    }, [sessionDurationMs]);

    return {
        isInFlow,
        streakCount,
        shouldShowCheckpoint,
        shouldShowHealthBreak,
        sessionDurationMs,
        timeGoalExceeded,
    };
}

/**
 * Hook to manage checkpoint dismissal and continuation
 */
export function useCheckpointActions() {
    const recordCheckpointShown = useCallback(() => {
        // This would update studySession.lastCheckpointAt
        // Implementation depends on store action being added
    }, []);

    const recordContinueDecision = useCallback(() => {
        // User chose to continue - extend buffer
    }, []);

    const recordExitDecision = useCallback(() => {
        // User chose to exit - prepare recap data
    }, []);

    return {
        recordCheckpointShown,
        recordContinueDecision,
        recordExitDecision,
    };
}
