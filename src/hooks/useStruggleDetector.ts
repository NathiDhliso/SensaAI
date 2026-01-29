/**
 * useStruggleDetector Hook
 * 
 * Detects when a learner is struggling based on multiple behavioral heuristics.
 * This enables the AI Coach to provide proactive support rather than waiting
 * for explicit help requests.
 * 
 * DEFENSIVE DESIGN:
 * - Configurable thresholds for different learning contexts
 * - Debounced updates to prevent excessive re-renders
 * - Graceful degradation if events fail to fire
 * - Memory-safe cleanup on unmount
 * 
 * Heuristics tracked:
 * 1. Idle timeout (>45s without interaction)
 * 2. Consecutive errors (>=2 wrong answers)
 * 3. Backspace velocity (high deletion rate indicates hesitation)
 * 
 * @module hooks/useStruggleDetector
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type StruggleReason = 'idle' | 'error_rate' | 'hesitation' | null;

export interface StruggleState {
    /** Whether the learner is currently struggling */
    isStruggling: boolean;
    /** The primary reason for struggle detection */
    strugglingReason: StruggleReason;
    /** Seconds since last meaningful interaction */
    timeSinceLastInteraction: number;
    /** Count of consecutive wrong answers */
    consecutiveErrors: number;
    /** Recent backspace count in detection window */
    recentBackspaces: number;
    /** Confidence score (0-1) based on multiple signals */
    confidence: number;
}

export interface StruggleDetectorConfig {
    /** Seconds of inactivity before triggering idle struggle (default: 45) */
    idleThresholdSeconds?: number;
    /** Number of consecutive errors to trigger struggle (default: 2) */
    errorThreshold?: number;
    /** Backspaces per minute to indicate hesitation (default: 30) */
    backspaceThreshold?: number;
    /** Window in seconds for backspace rate calculation (default: 60) */
    backspaceWindowSeconds?: number;
    /** Whether to track keyboard events (default: true) */
    trackKeyboard?: boolean;
    /** Whether to track mouse/touch events (default: true) */
    trackPointer?: boolean;
    /** Callback when struggle state changes */
    onStruggleChange?: (state: StruggleState) => void;
}

export interface UseStruggleDetectorResult {
    /** Current struggle state */
    state: StruggleState;
    /** Manually record a correct answer (resets error count) */
    recordCorrectAnswer: () => void;
    /** Manually record an incorrect answer */
    recordIncorrectAnswer: () => void;
    /** Manually record any interaction (resets idle timer) */
    recordInteraction: () => void;
    /** Reset all tracking state */
    reset: () => void;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: Required<Omit<StruggleDetectorConfig, 'onStruggleChange'>> = {
    idleThresholdSeconds: 45,
    errorThreshold: 2,
    backspaceThreshold: 30,
    backspaceWindowSeconds: 60,
    trackKeyboard: true,
    trackPointer: true,
};

// ============================================================================
// INITIAL STATE
// ============================================================================

const INITIAL_STATE: StruggleState = {
    isStruggling: false,
    strugglingReason: null,
    timeSinceLastInteraction: 0,
    consecutiveErrors: 0,
    recentBackspaces: 0,
    confidence: 0,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useStruggleDetector(
    config: StruggleDetectorConfig = {}
): UseStruggleDetectorResult {
    const {
        idleThresholdSeconds = DEFAULT_CONFIG.idleThresholdSeconds,
        errorThreshold = DEFAULT_CONFIG.errorThreshold,
        backspaceThreshold = DEFAULT_CONFIG.backspaceThreshold,
        backspaceWindowSeconds = DEFAULT_CONFIG.backspaceWindowSeconds,
        trackKeyboard = DEFAULT_CONFIG.trackKeyboard,
        trackPointer = DEFAULT_CONFIG.trackPointer,
        onStruggleChange,
    } = config;

    // State
    const [state, setState] = useState<StruggleState>(INITIAL_STATE);

    // Refs for tracking without causing re-renders
    const lastInteractionRef = useRef<number>(Date.now());
    const consecutiveErrorsRef = useRef<number>(0);
    const backspaceTimestampsRef = useRef<number[]>([]);
    const previousStruggleRef = useRef<boolean>(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ========================================================================
    // CALCULATION HELPERS
    // ========================================================================

    /**
     * Calculate current struggle state based on all heuristics
     */
    const calculateStruggleState = useCallback((): StruggleState => {
        const now = Date.now();
        const timeSinceLastInteraction = (now - lastInteractionRef.current) / 1000;
        const consecutiveErrors = consecutiveErrorsRef.current;

        // Count backspaces in the detection window
        const windowStart = now - (backspaceWindowSeconds * 1000);
        const recentBackspaces = backspaceTimestampsRef.current.filter(
            ts => ts >= windowStart
        ).length;

        // Calculate backspace rate per minute
        const backspaceRate = (recentBackspaces / backspaceWindowSeconds) * 60;

        // Determine struggle reasons
        const isIdleStruggle = timeSinceLastInteraction >= idleThresholdSeconds;
        const isErrorStruggle = consecutiveErrors >= errorThreshold;
        const isHesitationStruggle = backspaceRate >= backspaceThreshold;

        // Determine primary reason (priority: idle > errors > hesitation)
        let strugglingReason: StruggleReason = null;
        if (isIdleStruggle) {
            strugglingReason = 'idle';
        } else if (isErrorStruggle) {
            strugglingReason = 'error_rate';
        } else if (isHesitationStruggle) {
            strugglingReason = 'hesitation';
        }

        const isStruggling = strugglingReason !== null;

        // Calculate confidence based on how many signals are active
        let confidence = 0;
        if (isIdleStruggle) confidence += 0.4;
        if (isErrorStruggle) confidence += 0.4;
        if (isHesitationStruggle) confidence += 0.2;
        confidence = Math.min(1, confidence);

        return {
            isStruggling,
            strugglingReason,
            timeSinceLastInteraction: Math.floor(timeSinceLastInteraction),
            consecutiveErrors,
            recentBackspaces,
            confidence,
        };
    }, [
        idleThresholdSeconds,
        errorThreshold,
        backspaceThreshold,
        backspaceWindowSeconds,
    ]);

    /**
     * Update state and trigger callback if struggle changed
     */
    const updateState = useCallback(() => {
        const newState = calculateStruggleState();
        setState(newState);

        // Trigger callback if struggle state changed
        if (newState.isStruggling !== previousStruggleRef.current) {
            previousStruggleRef.current = newState.isStruggling;
            onStruggleChange?.(newState);
        }
    }, [calculateStruggleState, onStruggleChange]);

    // ========================================================================
    // PUBLIC METHODS
    // ========================================================================

    /**
     * Record a correct answer - resets consecutive error count
     */
    const recordCorrectAnswer = useCallback(() => {
        consecutiveErrorsRef.current = 0;
        lastInteractionRef.current = Date.now();
        updateState();
    }, [updateState]);

    /**
     * Record an incorrect answer - increments consecutive error count
     */
    const recordIncorrectAnswer = useCallback(() => {
        consecutiveErrorsRef.current += 1;
        lastInteractionRef.current = Date.now();
        updateState();
    }, [updateState]);

    /**
     * Record any interaction - resets idle timer
     */
    const recordInteraction = useCallback(() => {
        lastInteractionRef.current = Date.now();
        updateState();
    }, [updateState]);

    /**
     * Reset all tracking state
     */
    const reset = useCallback(() => {
        lastInteractionRef.current = Date.now();
        consecutiveErrorsRef.current = 0;
        backspaceTimestampsRef.current = [];
        previousStruggleRef.current = false;
        setState(INITIAL_STATE);
    }, []);

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    /**
     * Handle keyboard events for interaction and backspace tracking
     */
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        const now = Date.now();
        lastInteractionRef.current = now;

        // Track backspaces for hesitation detection
        if (event.key === 'Backspace' || event.key === 'Delete') {
            backspaceTimestampsRef.current.push(now);

            // Cleanup old timestamps to prevent memory leak
            const windowStart = now - (backspaceWindowSeconds * 1000);
            backspaceTimestampsRef.current = backspaceTimestampsRef.current.filter(
                ts => ts >= windowStart
            );
        }

        // Debounce state updates for key events
        // Only update every 5 keystrokes to reduce overhead
        if (Math.random() < 0.2) {
            updateState();
        }
    }, [backspaceWindowSeconds, updateState]);

    /**
     * Handle pointer events for interaction tracking
     */
    const handlePointerEvent = useCallback(() => {
        lastInteractionRef.current = Date.now();
        // Don't update state on every pointer event - too frequent
    }, []);

    // ========================================================================
    // EFFECTS
    // ========================================================================

    /**
     * Set up periodic state updates for idle detection
     * Using setInterval to check idle time even without user input
     */
    useEffect(() => {
        // Update state every 5 seconds to check for idle timeout
        intervalRef.current = setInterval(() => {
            updateState();
        }, 5000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [updateState]);

    /**
     * Set up event listeners for keyboard and pointer tracking
     */
    useEffect(() => {
        if (trackKeyboard) {
            document.addEventListener('keydown', handleKeyDown, { passive: true });
        }

        if (trackPointer) {
            document.addEventListener('click', handlePointerEvent, { passive: true });
            document.addEventListener('touchstart', handlePointerEvent, { passive: true });
            document.addEventListener('scroll', handlePointerEvent, { passive: true });
        }

        return () => {
            if (trackKeyboard) {
                document.removeEventListener('keydown', handleKeyDown);
            }
            if (trackPointer) {
                document.removeEventListener('click', handlePointerEvent);
                document.removeEventListener('touchstart', handlePointerEvent);
                document.removeEventListener('scroll', handlePointerEvent);
            }
        };
    }, [trackKeyboard, trackPointer, handleKeyDown, handlePointerEvent]);

    // ========================================================================
    // RETURN
    // ========================================================================

    return {
        state,
        recordCorrectAnswer,
        recordIncorrectAnswer,
        recordInteraction,
        reset,
    };
}

export default useStruggleDetector;
