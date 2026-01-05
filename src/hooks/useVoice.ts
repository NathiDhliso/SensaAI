/**
 * useVoice Hook
 * 
 * Manages text-to-speech playback using ElevenLabs service.
 * Handles state, error management, and store integration.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePersonalizationStore } from '@/store/personalization-store';
import { voiceService } from '@/lib/voice/elevenlabs';
import { STATIC_VOICE_LINES } from '@/lib/voice/static-lines';
import type { PersonaId } from '@/lib/ai/coach';

interface UseVoiceResult {
    play: (text: string, personaId?: PersonaId) => Promise<void>;
    stop: () => void;
    toggle: (text: string, personaId?: PersonaId) => Promise<void>;
    isPlaying: boolean;
    isLoading: boolean;
    error: string | null;
    audioUrl: string | null;
}

export function useVoice(): UseVoiceResult {
    const { coachVoiceEnabled, elevenLabsApiKey, selectedPersona } = usePersonalizationStore();

    // Local state
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    // Audio reference
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Update service key if store changes
    useEffect(() => {
        if (elevenLabsApiKey) {
            voiceService.setApiKey(elevenLabsApiKey);
        }
    }, [elevenLabsApiKey]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
    }, []);

    const play = useCallback(async (text: string, overridePersonaId?: PersonaId) => {
        // Validation
        if (!coachVoiceEnabled) return;
        if (!elevenLabsApiKey) {
            setError('API Key missing');
            return;
        }

        // Stop existing
        stop();

        setIsLoading(true);
        setError(null);

        const targetPersona = overridePersonaId || selectedPersona;

        // Check for local static file first
        if (STATIC_VOICE_LINES[text]) {
            const localUrl = `/audio/voice/${STATIC_VOICE_LINES[text]}`;
            // console.log('Using local voice asset:', localUrl); // Reduced noise
            setAudioUrl(localUrl);

            const audio = new Audio(localUrl);
            audioRef.current = audio;

            audio.onended = () => setIsPlaying(false);
            audio.onerror = () => {
                // If local fails (e.g. file missing), fallback to API
                console.warn('Local asset missing, falling back to API');

                // --- INTENSITY LOGIC (Fallback) ---
                const { coachIntensity } = usePersonalizationStore.getState();
                let intensityMod = 0;
                let styleMod = 0;

                if (coachIntensity === 1) intensityMod = 0.2; // Calmer
                if (coachIntensity === 2) intensityMod = 0.1;
                if (coachIntensity === 4) { intensityMod = -0.1; styleMod = 0.1; }
                if (coachIntensity === 5) { intensityMod = -0.2; styleMod = 0.2; } // Intense

                voiceService.speak(text, targetPersona, { stability: 0.5 + intensityMod, style: styleMod }) // Estimate base stability if not accessible here, or just pass clean overrides
                    .then(url => {
                        setAudioUrl(url);
                        audio.src = url;
                        audio.play();
                    })
                    .catch(() => {
                        setError('Voice playback failed');
                        setIsPlaying(false);
                    });
            };

            await audio.play();
            setIsPlaying(true);
            setIsLoading(false);
            return;
        }

        try {
            // --- INTENSITY LOGIC (Primary) ---
            const { coachIntensity } = usePersonalizationStore.getState();

            // Get base config from persona map directly to be accurate
            const { PERSONAS } = await import('@/lib/ai/coach/personas');
            const personaConfig = PERSONAS[targetPersona]?.voiceConfig;
            const baseStability = personaConfig?.stability || 0.5;
            const baseStyle = personaConfig?.style || 0.0;

            let intensityMod = 0;
            let styleMod = 0;

            if (coachIntensity === 1) intensityMod = 0.2;
            if (coachIntensity === 2) intensityMod = 0.1;
            if (coachIntensity === 4) { intensityMod = -0.1; styleMod = 0.1; }
            if (coachIntensity === 5) { intensityMod = -0.2; styleMod = 0.2; }

            // Clamp stability 0-1
            const targetStability = Math.max(0.1, Math.min(1.0, baseStability + intensityMod));
            const targetStyle = Math.max(0.0, Math.min(1.0, baseStyle + styleMod));

            // Generate audio via API
            const url = await voiceService.speak(text, targetPersona, {
                stability: targetStability,
                style: targetStyle
            });

            setAudioUrl(url);

            // Play
            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onended = () => setIsPlaying(false);
            audio.onerror = () => {
                setError('Playback error');
                setIsPlaying(false);
            };

            await audio.play();
            setIsPlaying(true);
        } catch (err: any) {
            console.error('Voice playback failed:', err);
            setError(err.message || 'Failed to play voice');
        } finally {
            setIsLoading(false);
        }
    }, [coachVoiceEnabled, elevenLabsApiKey, selectedPersona, stop]);

    const toggle = useCallback(async (text: string, overridePersonaId?: PersonaId) => {
        if (isPlaying) {
            stop();
        } else {
            await play(text, overridePersonaId);
        }
    }, [isPlaying, play, stop]);

    return {
        play,
        stop,
        toggle,
        isPlaying,
        isLoading,
        error,
        audioUrl
    };
}
