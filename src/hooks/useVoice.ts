/**
 * useVoice Hook
 * 
 * Manages text-to-speech playback using ElevenLabs service.
 * Handles state, error management, and store integration.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePersonalizationStore } from '@/store/personalization-store';
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
    const { coachVoiceEnabled } = usePersonalizationStore(); // API key removed

    // Local state
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    // Audio reference
    const audioRef = useRef<HTMLAudioElement | null>(null);

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

    const play = useCallback(async (text: string, _overridePersonaId?: PersonaId) => {
        // Validation
        if (!coachVoiceEnabled) return;

        // Stop existing
        stop();

        setIsLoading(true);
        setError(null);

        // CHECK FOR LOCAL STATIC FILE ONLY
        // We strictly only play pre-recorded assets. No generation.
        if (STATIC_VOICE_LINES[text]) {
            const localUrl = `/audio/voice/${STATIC_VOICE_LINES[text]}`;
            setAudioUrl(localUrl);

            const audio = new Audio(localUrl);
            audioRef.current = audio;

            audio.onended = () => setIsPlaying(false);
            audio.onerror = () => {
                // Silent failure is preferred over crashing or weird states
                console.warn(`[Voice] Asset missing for: "${text}" (${localUrl})`);
                setError('Voice asset not found');
                setIsPlaying(false);
            };

            try {
                await audio.play();
                setIsPlaying(true);
            } catch (err) {
                console.warn('[Voice] Playback failed/blocked', err);
                setIsPlaying(false);
            }
        } else {
            // No static line found - Silent fallback
            // In "Studio Quality Only" mode, dynamic text is intentionally silent.
            // We do not error here, we just don't play.
        }

        setIsLoading(false);
    }, [coachVoiceEnabled, stop]);

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
