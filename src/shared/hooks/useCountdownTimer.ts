import { useState, useEffect, useCallback, useRef } from 'react';
interface UseCountdownTimerOptions {
 initialSeconds: number;
 onExpire?: () => void;
 autoStart?: boolean;
 tickInterval?: number;
}
interface UseCountdownTimerReturn {
 timeRemaining: number;
 isRunning: boolean;
 isExpired: boolean;
 start: () => void;
 pause: () => void;
 reset: (newSeconds?: number) => void;
 getUrgencyLevel: (warningThreshold: number, criticalThreshold: number) => 'normal' | 'warning' | 'critical';
}
export function useCountdownTimer({
 initialSeconds,
 onExpire,
 autoStart = false,
 tickInterval = 100
}: UseCountdownTimerOptions): UseCountdownTimerReturn {
 const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
 const [isRunning, setIsRunning] = useState(autoStart);
 const onExpireRef = useRef(onExpire);
 // Update the ref in an effect to avoid updating during render
 useEffect(() => {
 onExpireRef.current = onExpire;
 }, [onExpire]);
 useEffect(() => {
 if (!isRunning) return;
 const interval = setInterval(() => {
 setTimeRemaining(prev => {
 const newTime = prev - tickInterval / 1000;
 if (newTime <= 0) {
 setIsRunning(false);
 onExpireRef.current?.();
 return 0;
 }
 return newTime;
 });
 }, tickInterval);
 return () => clearInterval(interval);
 }, [isRunning, tickInterval]);
 const start = useCallback(() => setIsRunning(true), []);
 const pause = useCallback(() => setIsRunning(false), []);
 const reset = useCallback((newSeconds?: number) => {
 setTimeRemaining(newSeconds ?? initialSeconds);
 setIsRunning(false);
 }, [initialSeconds]);
 const getUrgencyLevel = useCallback((warningThreshold: number, criticalThreshold: number) => {
 if (timeRemaining <= criticalThreshold) return 'critical';
 if (timeRemaining <= warningThreshold) return 'warning';
 return 'normal';
 }, [timeRemaining]);
 return {
 timeRemaining,
 isRunning,
 isExpired: timeRemaining <= 0,
 start,
 pause,
 reset,
 getUrgencyLevel
 };
}