/**
 * useVoice Hook
 * 
 * Manages text-to-speech playback using ElevenLabs service.
 * Handles state, error management, and store integration.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePersonalizationStore } from '@/store/personalization-store';
import { voiceService } from '@/lib/voice/elevenlabs';
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

        try {
            // Generate audio
            const url = await voiceService.speak(text, targetPersona);
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
