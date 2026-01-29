/**
 * useCountdownTimer Hook
 * 
 * PRODUCTION-HARDENED VERSION (Anti-Cheat)
 * 
 * Implements delta-based timing using Date.now() instead of interval tick counting.
 * This prevents the timer from "pausing" when the user switches tabs, which
 * browsers do to save resources (and which could be exploited to cheat).
 * 
 * ANTI-CHEAT FEATURES:
 * - Uses (endTime - Date.now()) for remaining time calculation
 * - Timer continues accurately even in background tabs
 * - Prevents "paused timer" exploit
 * - Tracks elapsed time for verification
 * 
 * @module hooks/useCountdownTimer
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface UseCountdownTimerOptions {
  /** Initial countdown duration in seconds */
  initialSeconds: number;
  /** Callback when timer expires */
  onExpire?: () => void;
  /** Start timer immediately on mount (default: false) */
  autoStart?: boolean;
  /** UI update interval in ms (default: 100). Does NOT affect timing accuracy. */
  displayUpdateInterval?: number;
  /** Enable anti-cheat mode - timer continues in background (default: true) */
  antiCheat?: boolean;
}

export interface UseCountdownTimerReturn {
  /** Seconds remaining (calculated from delta, not ticks) */
  timeRemaining: number;
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Whether the timer has expired */
  isExpired: boolean;
  /** Start or resume the timer */
  start: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Reset to initial or specified duration */
  reset: (newSeconds?: number) => void;
  /** Get urgency level based on thresholds */
  getUrgencyLevel: (warningThreshold: number, criticalThreshold: number) => 'normal' | 'warning' | 'critical';
  /** Get elapsed time in seconds (for analytics) */
  getElapsedTime: () => number;
  /** Get actual remaining time (ignores display state) */
  getActualRemaining: () => number;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useCountdownTimer({
  initialSeconds,
  onExpire,
  autoStart = false,
  displayUpdateInterval = 100,
  antiCheat = true,
}: UseCountdownTimerOptions): UseCountdownTimerReturn {
  // State for display (updates at displayUpdateInterval)
  const [displayTimeRemaining, setDisplayTimeRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Refs for accurate timing (not affected by render cycles)
  /** When the timer will expire (timestamp in ms) */
  const endTimeRef = useRef<number>(0);
  /** When the timer was started (for elapsed time calculation) */
  const startTimeRef = useRef<number>(0);
  /** Original duration in seconds */
  const durationRef = useRef<number>(initialSeconds);
  /** Time remaining when paused (for resume accuracy) */
  const pausedTimeRemainingRef = useRef<number>(initialSeconds);
  /** Callback ref to avoid stale closures */
  const onExpireRef = useRef(onExpire);
  /** Track if timer has fired expiration */
  const hasExpiredRef = useRef(false);

  // Keep onExpire ref updated
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // ========================================================================
  // CORE TIMING LOGIC (Delta-based, anti-cheat)
  // ========================================================================

  /**
   * Calculate remaining time using timestamps (not tick counting)
   */
  const calculateRemaining = useCallback((): number => {
    if (!isRunning || endTimeRef.current === 0) {
      return pausedTimeRemainingRef.current;
    }
    const remaining = (endTimeRef.current - Date.now()) / 1000;
    return Math.max(0, remaining);
  }, [isRunning]);

  /**
   * Get actual remaining time (for verification)
   */
  const getActualRemaining = useCallback((): number => {
    return calculateRemaining();
  }, [calculateRemaining]);

  /**
   * Get elapsed time since start
   */
  const getElapsedTime = useCallback((): number => {
    if (startTimeRef.current === 0) return 0;
    return (Date.now() - startTimeRef.current) / 1000;
  }, []);

  // ========================================================================
  // DISPLAY UPDATE EFFECT
  // ========================================================================

  useEffect(() => {
    if (!isRunning) return;

    // Immediate update on start
    setDisplayTimeRemaining(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setDisplayTimeRemaining(remaining);

      // Check for expiration
      if (remaining <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        setIsRunning(false);
        setIsExpired(true);
        onExpireRef.current?.();
      }
    }, displayUpdateInterval);

    return () => clearInterval(interval);
  }, [isRunning, displayUpdateInterval, calculateRemaining]);

  // ========================================================================
  // VISIBILITY CHANGE HANDLER (Anti-cheat: update on tab focus)
  // ========================================================================

  useEffect(() => {
    if (!antiCheat || !isRunning) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User returned to tab - immediately update display
        const remaining = calculateRemaining();
        setDisplayTimeRemaining(remaining);

        // Check if expired while away
        if (remaining <= 0 && !hasExpiredRef.current) {
          hasExpiredRef.current = true;
          setIsRunning(false);
          setIsExpired(true);
          onExpireRef.current?.();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [antiCheat, isRunning, calculateRemaining]);

  // ========================================================================
  // CONTROLS
  // ========================================================================

  /**
   * Start or resume the timer
   */
  const start = useCallback(() => {
    if (isRunning) return;

    const now = Date.now();

    // Set end time based on paused remaining time
    endTimeRef.current = now + (pausedTimeRemainingRef.current * 1000);

    // Track start time if this is a fresh start
    if (startTimeRef.current === 0) {
      startTimeRef.current = now;
    }

    hasExpiredRef.current = false;
    setIsExpired(false);
    setIsRunning(true);
  }, [isRunning]);

  /**
   * Pause the timer
   */
  const pause = useCallback(() => {
    if (!isRunning) return;

    // Save current remaining time
    pausedTimeRemainingRef.current = calculateRemaining();
    setIsRunning(false);
  }, [isRunning, calculateRemaining]);

  /**
   * Reset the timer to initial or new duration
   */
  const reset = useCallback((newSeconds?: number) => {
    const duration = newSeconds ?? initialSeconds;
    durationRef.current = duration;
    pausedTimeRemainingRef.current = duration;
    endTimeRef.current = 0;
    startTimeRef.current = 0;
    hasExpiredRef.current = false;

    setDisplayTimeRemaining(duration);
    setIsRunning(false);
    setIsExpired(false);
  }, [initialSeconds]);

  /**
   * Get urgency level for UI styling
   */
  const getUrgencyLevel = useCallback((
    warningThreshold: number,
    criticalThreshold: number
  ): 'normal' | 'warning' | 'critical' => {
    if (displayTimeRemaining <= criticalThreshold) return 'critical';
    if (displayTimeRemaining <= warningThreshold) return 'warning';
    return 'normal';
  }, [displayTimeRemaining]);

  // ========================================================================
  // AUTO-START EFFECT
  // ========================================================================

  useEffect(() => {
    if (autoStart) {
      start();
    }
  }, []); // Only run on mount

  // ========================================================================
  // RETURN
  // ========================================================================

  return {
    timeRemaining: displayTimeRemaining,
    isRunning,
    isExpired,
    start,
    pause,
    reset,
    getUrgencyLevel,
    getElapsedTime,
    getActualRemaining,
  };
}

export default useCountdownTimer;
