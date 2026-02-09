/**
 * useCoachMessage Hook
 * 
 * Convenient hook for displaying AI Coach messages in any component.
 * Handles message state, auto-dismissal, cooldown, and persona integration.
 * 
 * @example
 * ```tsx
 * const { showMessage, currentMessage } = useCoachMessage();
 * 
 * // Show a message
 * showMessage('prime', 'intro', 5000); // Auto-dismiss after 5s
 * 
 * // Render
 * {currentMessage && (
 * <CoachMessage message={currentMessage} />
 * )}
 * ```
 */
import { useState, useCallback, useRef } from 'react';
import { usePersonalizationStore } from '@/store/personalization-store';
import { useLearningStore } from '@/store/learning-store';
import { getPersonaResponse, type PhaseKey, type PhaseResponses } from '@/features/ai-coach';
interface UseCoachMessageOptions {
 /** Auto-dismiss timeout in milliseconds (default: 8000) */
 autoDismissMs?: number;
 /** Whether to respect user's mood for message adjustment */
 useMoodAdjustment?: boolean;
 /** Minimum time between messages in milliseconds (default: 30000 = 30s) */
 cooldownMs?: number;
}
interface UseCoachMessageReturn {
 /** Current message being displayed */
 currentMessage: string | null;
 /** Show a coach message */
 showMessage: (
 phase: PhaseKey,
 situation: keyof PhaseResponses,
 customDismissMs?: number
 ) => void;
 /** Show a custom message (not from persona templates) */
 showCustomMessage: (message: string, customDismissMs?: number) => void;
 /** Manually dismiss the current message */
 dismissMessage: () => void;
 /** Whether a message is currently showing */
 isShowing: boolean;
}
export function useCoachMessage(
 options: UseCoachMessageOptions = {}
): UseCoachMessageReturn {
 const {
 autoDismissMs = 8000,
 useMoodAdjustment = true,
 cooldownMs = 30000, // 30 seconds default cooldown
 } = options;
 const [currentMessage, setCurrentMessage] = useState<string | null>(null);
 const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const lastMessageTimeRef = useRef<number>(0);
 const { selectedPersona } = usePersonalizationStore();
 const { studySession } = useLearningStore();
 /**
 * Clear any existing dismiss timer
 */
 const clearDismissTimer = useCallback(() => {
 if (dismissTimerRef.current) {
 clearTimeout(dismissTimerRef.current);
 dismissTimerRef.current = null;
 }
 }, []);
 /**
 * Dismiss the current message
 */
 const dismissMessage = useCallback(() => {
 clearDismissTimer();
 setCurrentMessage(null);
 }, [clearDismissTimer]);
 /**
 * Show a coach message from persona templates
 */
 const showMessage = useCallback(
 (
 phase: PhaseKey,
 situation: keyof PhaseResponses,
 customDismissMs?: number
 ) => {
 const now = Date.now();
 // Enforce cooldown (except for struggle messages which are important)
 if (situation !== 'struggle' && now - lastMessageTimeRef.current < cooldownMs) {
 console.log('[Coach] Message suppressed - cooldown active');
 return;
 }
 // Clear any existing timer
 clearDismissTimer();
 // Get mood if enabled
 const mood = useMoodAdjustment ? studySession?.mood : undefined;
 // Get message from persona
 const message = getPersonaResponse(selectedPersona, phase, situation, mood);
 // Set message
 setCurrentMessage(message);
 lastMessageTimeRef.current = now;
 // Set auto-dismiss timer
 const dismissMs = customDismissMs ?? autoDismissMs;
 if (dismissMs > 0) {
 dismissTimerRef.current = setTimeout(() => {
 setCurrentMessage(null);
 }, dismissMs);
 }
 },
 [
 selectedPersona,
 studySession?.mood,
 useMoodAdjustment,
 autoDismissMs,
 cooldownMs,
 clearDismissTimer
 ]
 );
 /**
 * Show a custom message (not from templates)
 */
 const showCustomMessage = useCallback(
 (message: string, customDismissMs?: number) => {
 const now = Date.now();
 // Enforce cooldown for custom messages too
 if (now - lastMessageTimeRef.current < cooldownMs) {
 console.log('[Coach] Custom message suppressed - cooldown active');
 return;
 }
 clearDismissTimer();
 setCurrentMessage(message);
 lastMessageTimeRef.current = now;
 const dismissMs = customDismissMs ?? autoDismissMs;
 if (dismissMs > 0) {
 dismissTimerRef.current = setTimeout(() => {
 setCurrentMessage(null);
 }, dismissMs);
 }
 },
 [autoDismissMs, cooldownMs, clearDismissTimer]
 );
 return {
 currentMessage,
 showMessage,
 showCustomMessage,
 dismissMessage,
 isShowing: currentMessage !== null
 };
}
export default useCoachMessage;