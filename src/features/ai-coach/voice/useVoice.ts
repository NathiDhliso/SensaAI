/**
 * useVoice Hook (AI Coach Feature)
 * 
 * PRODUCTION-HARDENED VERSION
 * 
 * Manages text-to-speech playback using pre-recorded static audio files.
 * Implements anti-repetition logic to prevent fatigue from hearing the same lines.
 * 
 * DEFENSIVE FEATURES:
 * - LRU (Least Recently Used) tracking to prevent line repetition
 * - Category-based history reset when all lines exhausted
 * - Silent fallback for missing audio assets
 * - Memory-safe history management
 * - Graceful degradation on playback failures
 * 
 * @module features/ai-coach/voice/useVoice
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePersonalizationStore } from '@/store/personalization-store';
import { STATIC_VOICE_LINES } from '@/features/ai-coach/voice/static-lines';
import type { PersonaId, PhaseKey } from '@/features/ai-coach';
import { AudioService } from '@/services/AudioService';

// ============================================================================
// TYPES
// ============================================================================

interface UseVoiceResult {
    play: (text: string, personaId?: PersonaId) => Promise<void>;
    playBySituation: (situation: SituationType, personaId?: PersonaId) => Promise<void>;
    stop: () => void;
    toggle: (text: string, personaId?: PersonaId) => Promise<void>;
    isPlaying: boolean;
    isLoading: boolean;
    error: string | null;
    audioUrl: string | null;
    /** Number of unique lines played this session */
    linesPlayedCount: number;
}

/** Voice line situation types matching the persona response structure */
export type SituationType =
    | `${PhaseKey}_intro`
    | `${PhaseKey}_encouragement`
    | `${PhaseKey}_struggle`
    | `${PhaseKey}_success`
    | `${PhaseKey}_transition`;

interface PlayHistoryEntry {
    lineId: string;
    timestamp: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Maximum number of recently played lines to track for anti-repetition */
const MAX_HISTORY_SIZE = 5;

/** Time in milliseconds before a line can be replayed (5 minutes) */
const LINE_COOLDOWN_MS = 5 * 60 * 1000;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all available voice lines for a given situation (category)
 * Matches lines by their filename pattern: {persona}_{phase}_{type}.mp3
 * 
 * @param situation - The situation type (e.g., 'prime_intro')
 * @param personaId - Optional persona filter (e.g., 'goggins')
 */
function getVoiceLinesForSituation(
    situation: SituationType,
    personaId?: PersonaId
): Array<{ text: string; filename: string }> {
    const lines: Array<{ text: string; filename: string }> = [];

    for (const [text, filename] of Object.entries(STATIC_VOICE_LINES)) {
        // Expected pattern: {persona}_{phase}_{type}.mp3
        // e.g., goggins_prime_intro.mp3
        const pattern = personaId
            ? `${personaId}_${situation}.mp3`
            : `_${situation}.mp3`;

        if (filename.endsWith(pattern) || filename.includes(`_${situation}.`)) {
            // Additional persona filter if specified
            if (personaId && !filename.startsWith(personaId)) {
                continue;
            }
            lines.push({ text, filename });
        }
    }

    return lines;
}

/**
 * Get a random line from available options, excluding recently played
 * Implements LRU-style anti-repetition
 */
function selectNonRepeatedLine(
    availableLines: Array<{ text: string; filename: string }>,
    history: PlayHistoryEntry[],
    cooldownMs: number = LINE_COOLDOWN_MS
): { text: string; filename: string } | null {
    if (availableLines.length === 0) {
        return null;
    }

    const now = Date.now();
    const recentLineIds = new Set(
        history
            .filter(entry => now - entry.timestamp < cooldownMs)
            .map(entry => entry.lineId)
    );

    // Filter out recently played lines
    const freshLines = availableLines.filter(
        line => !recentLineIds.has(line.filename)
    );

    // If all lines are in cooldown, pick the oldest one (LRU)
    if (freshLines.length === 0) {
        console.log('[Voice] All lines in cooldown, selecting least recent');

        // Sort history by timestamp (oldest first)
        const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);

        // Find the oldest line that's in our available set
        for (const entry of sortedHistory) {
            const match = availableLines.find(l => l.filename === entry.lineId);
            if (match) {
                return match;
            }
        }

        // Fallback: just pick a random one
        return availableLines[Math.floor(Math.random() * availableLines.length)];
    }

    // Pick randomly from fresh lines
    return freshLines[Math.floor(Math.random() * freshLines.length)];
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useVoice(): UseVoiceResult {
    const { coachVoiceEnabled } = usePersonalizationStore();

    // Local state
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [linesPlayedCount, setLinesPlayedCount] = useState(0);

    // Audio reference
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Play history for anti-repetition (persists across renders)
    const playHistoryRef = useRef<PlayHistoryEntry[]>([]);

    // ========================================================================
    // HISTORY MANAGEMENT
    // ========================================================================

    /**
     * Add a line to play history
     */
    const recordPlayedLine = useCallback((lineId: string) => {
        const now = Date.now();

        // Remove existing entry for this line (if any)
        playHistoryRef.current = playHistoryRef.current.filter(
            entry => entry.lineId !== lineId
        );

        // Add new entry at the end
        playHistoryRef.current.push({
            lineId,
            timestamp: now,
        });

        // Trim to max size (remove oldest entries)
        if (playHistoryRef.current.length > MAX_HISTORY_SIZE) {
            playHistoryRef.current = playHistoryRef.current.slice(-MAX_HISTORY_SIZE);
        }

        setLinesPlayedCount(prev => prev + 1);
    }, []);

    // ========================================================================
    // PLAYBACK CONTROLS
    // ========================================================================

    /**
     * Cleanup on unmount
     */
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    /**
     * Stop current playback
     */
    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
    }, []);

    /**
     * Core play function with anti-repetition
     */
    const playInternal = useCallback(async (
        text: string,
        filename: string
    ): Promise<void> => {
        const localUrl = `/audio/voice/${filename}`;
        setAudioUrl(localUrl);

        const audio = new Audio(localUrl);
        audioRef.current = audio;

        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
            // Silent failure is preferred over crashing
            console.warn(`[Voice] Asset missing: "${text}" (${localUrl})`);
            setError('Voice asset not found');
            setIsPlaying(false);
        };

        try {
            // Use AudioService for priority handling
            await AudioService.stopCurrent(true); // Fade out current
            await audio.play();
            setIsPlaying(true);
            recordPlayedLine(filename);
        } catch (err) {
            console.warn('[Voice] Playback failed/blocked', err);
            setIsPlaying(false);
        }
    }, [recordPlayedLine]);

    /**
     * Play by exact text match (original behavior)
     */
    const play = useCallback(async (text: string, _personaId?: PersonaId) => {
        // Validation
        if (!coachVoiceEnabled) return;

        // Stop existing
        stop();

        setIsLoading(true);
        setError(null);

        // Check for exact text match in static lines
        if (STATIC_VOICE_LINES[text]) {
            await playInternal(text, STATIC_VOICE_LINES[text]);
        } else {
            // No static line found - Silent fallback
            // In "Studio Quality Only" mode, dynamic text is intentionally silent.
            console.log('[Voice] No static line for text:', text.substring(0, 50));
        }

        setIsLoading(false);
    }, [coachVoiceEnabled, stop, playInternal]);

    /**
     * Play by situation with anti-repetition
     * This is the preferred method for AI Coach integration
     */
    const playBySituation = useCallback(async (
        situation: SituationType,
        personaId?: PersonaId
    ) => {
        if (!coachVoiceEnabled) return;

        stop();
        setIsLoading(true);
        setError(null);

        // Get all available lines for this situation
        const availableLines = getVoiceLinesForSituation(situation, personaId);

        if (availableLines.length === 0) {
            console.log(`[Voice] No lines available for: ${situation} (${personaId || 'any'})`);
            setIsLoading(false);
            return;
        }

        // Select a non-repeated line using LRU logic
        const selectedLine = selectNonRepeatedLine(
            availableLines,
            playHistoryRef.current,
            LINE_COOLDOWN_MS
        );

        if (selectedLine) {
            await playInternal(selectedLine.text, selectedLine.filename);
        } else {
            // This shouldn't happen, but handle gracefully
            console.warn('[Voice] Could not select line for situation:', situation);
        }

        setIsLoading(false);
    }, [coachVoiceEnabled, stop, playInternal]);

    /**
     * Toggle playback
     */
    const toggle = useCallback(async (text: string, personaId?: PersonaId) => {
        if (isPlaying) {
            stop();
        } else {
            await play(text, personaId);
        }
    }, [isPlaying, play, stop]);

    // ========================================================================
    // RETURN
    // ========================================================================

    return {
        play,
        playBySituation,
        stop,
        toggle,
        isPlaying,
        isLoading,
        error,
        audioUrl,
        linesPlayedCount,
    };
}

export default useVoice;
