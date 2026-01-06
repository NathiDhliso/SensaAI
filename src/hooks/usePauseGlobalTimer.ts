/**
 * usePauseGlobalTimer Hook
 * 
 * Automatically pauses the global focus session timer when a drill is active.
 * Resumes the timer when the drill unmounts.
 * 
 * Usage: Call this hook at the top level of any drill component.
 */
import { useEffect } from 'react';
import { useLearningStore } from '@/store/learning-store';

export function usePauseGlobalTimer() {
    const pauseSession = useLearningStore(state => state.pauseSession);
    const resumeSession = useLearningStore(state => state.resumeSession);
    const isSessionActive = useLearningStore(state => state.isSessionActive);

    useEffect(() => {
        // Only pause if there's an active session
        if (isSessionActive) {
            pauseSession();
        }

        return () => {
            // Resume on unmount
            if (isSessionActive) {
                resumeSession();
            }
        };
    }, [pauseSession, resumeSession, isSessionActive]);
}

export default usePauseGlobalTimer;
