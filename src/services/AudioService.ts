/**
 * AudioService - Singleton Audio Manager
 * 
 * PRODUCTION-HARDENED VERSION
 * 
 * Prevents memory leaks from creating multiple Audio instances.
 * Manages a single audio context for the entire application lifecycle.
 * Respects global mute/volume settings.
 * 
 * DEFENSIVE FEATURES:
 * - Priority-based interrupt protocol (high priority fades out current audio)
 * - Queue system for normal-priority audio
 * - Smooth fade transitions to prevent audio cacophony
 * - Web Audio API restriction handling
 * - Race condition prevention
 * - Missing audio file graceful degradation
 * 
 * @module services/AudioService
 */

// ============================================================================
// TYPES
// ============================================================================

export type AudioTrack = 'success' | 'error' | 'notification' | 'mastery' | 'coach';
export type AudioPriority = 'high' | 'normal';

interface AudioConfig {
    volume: number;
    muted: boolean;
}

interface AudioQueueItem {
    track: AudioTrack;
    src: string;
    priority: AudioPriority;
    resolve: () => void;
    reject: (error: Error) => void;
}


// ============================================================================
// AUDIO SERVICE CLASS
// ============================================================================

class AudioServiceClass {
    private static instance: AudioServiceClass;
    private audioContext: Map<AudioTrack, HTMLAudioElement>;
    private config: AudioConfig;
    private initialized: boolean;

    /** Currently playing audio element */
    private currentlyPlaying: HTMLAudioElement | null = null;

    /** Current audio track playing */
    private currentTrack: AudioTrack | null = null;

    /** Queue for normal-priority audio */
    private queue: AudioQueueItem[] = [];

    /** Whether queue is being processed */
    private isProcessingQueue: boolean = false;

    /** Fade duration in milliseconds (default: 200ms) */
    public fadeDuration: number = 200;

    /** Active fade animation frame ID */
    private fadeAnimationId: number | null = null;

    /** Lock to prevent race conditions during playback transitions */
    private playbackLock: boolean = false;

    private constructor() {
        this.audioContext = new Map();
        this.config = {
            volume: 0.5,
            muted: false,
        };
        this.initialized = false;
    }

    public static getInstance(): AudioServiceClass {
        if (!AudioServiceClass.instance) {
            AudioServiceClass.instance = new AudioServiceClass();
        }
        return AudioServiceClass.instance;
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize audio context (requires user gesture for Safari)
     */
    public initialize(): void {
        if (this.initialized) return;

        // Preload common audio files
        this.preloadAudio('mastery', '/audio/voice/sage_master_success.mp3');

        this.initialized = true;
        console.log('[AudioService] Initialized');
    }

    // ========================================================================
    // PRELOADING
    // ========================================================================

    /**
     * Preload an audio file for faster playback
     * 
     * @param track - Track identifier
     * @param src - Audio source URL
     */
    private preloadAudio(track: AudioTrack, src: string): void {
        if (this.audioContext.has(track)) return;

        try {
            const audio = new Audio(src);
            audio.volume = this.config.volume;
            audio.preload = 'auto';

            // Handle preload errors gracefully
            audio.onerror = () => {
                console.warn(`[AudioService] Failed to preload: ${src}`);
            };

            this.audioContext.set(track, audio);
        } catch (error) {
            console.warn(`[AudioService] Failed to create audio for: ${src}`, error);
        }
    }

    // ========================================================================
    // PLAYBACK
    // ========================================================================

    /**
     * Play an audio track with priority handling
     * 
     * PRIORITY BEHAVIOR:
     * - 'high': Immediately fades out current audio and plays new track
     * - 'normal': Queues the audio to play after current track finishes
     * 
     * @param track - Track identifier
     * @param src - Audio source URL (optional if pre-loaded)
     * @param priority - Priority level (default: 'normal')
     */
    public play(
        track: AudioTrack,
        src?: string,
        priority: AudioPriority = 'normal'
    ): Promise<void> {
        // Check mute status
        if (this.config.muted) {
            return Promise.resolve();
        }

        // If src is provided and track doesn't exist, preload it
        if (src && !this.audioContext.has(track)) {
            this.preloadAudio(track, src);
        }

        return new Promise((resolve, reject) => {
            const queueItem: AudioQueueItem = {
                track,
                src: src || '',
                priority,
                resolve,
                reject,
            };

            if (priority === 'high') {
                // High priority: Interrupt current audio with fade
                this.handleHighPriorityPlay(queueItem);
            } else {
                // Normal priority: Add to queue
                this.queue.push(queueItem);
                this.processQueue();
            }
        });
    }

    /**
     * Handle high-priority playback with interrupt
     */
    private async handleHighPriorityPlay(item: AudioQueueItem): Promise<void> {
        // Prevent race conditions
        if (this.playbackLock) {
            // Wait briefly and retry
            await this.sleep(50);
            if (this.playbackLock) {
                item.reject(new Error('Playback locked'));
                return;
            }
        }

        this.playbackLock = true;

        try {
            // If something is playing, fade it out first
            if (this.currentlyPlaying && !this.currentlyPlaying.paused) {
                await this.fadeOut(this.currentlyPlaying, this.fadeDuration);
            }

            // Clear any pending queue items since high priority takes over
            this.clearQueue();

            // Play the new track
            await this.playTrackInternal(item);
            item.resolve();
        } catch (error) {
            console.warn('[AudioService] High priority play failed:', error);
            item.reject(error instanceof Error ? error : new Error('Playback failed'));
        } finally {
            this.playbackLock = false;
        }
    }

    /**
     * Process the audio queue sequentially
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessingQueue || this.queue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.queue.length > 0) {
            // Wait if something is currently playing
            if (this.currentlyPlaying && !this.currentlyPlaying.paused) {
                await this.waitForAudioEnd(this.currentlyPlaying);
            }

            const item = this.queue.shift();
            if (!item) continue;

            try {
                await this.playTrackInternal(item);
                item.resolve();
            } catch (error) {
                console.warn('[AudioService] Queue item failed:', error);
                item.reject(error instanceof Error ? error : new Error('Playback failed'));
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * Internal method to play a track
     */
    private async playTrackInternal(item: AudioQueueItem): Promise<void> {
        const audio = this.audioContext.get(item.track);
        if (!audio) {
            console.warn(`[AudioService] Track "${item.track}" not found`);
            return;
        }

        // Reset to beginning
        audio.currentTime = 0;
        audio.volume = this.config.volume;

        // Track current playback
        this.currentlyPlaying = audio;
        this.currentTrack = item.track;

        try {
            await audio.play();
        } catch (error) {
            // Handle autoplay policy errors gracefully
            if (error instanceof Error && error.name === 'NotAllowedError') {
                console.warn('[AudioService] Autoplay blocked by browser policy');
            } else {
                console.error('[AudioService] Playback error:', error);
                throw error;
            }
        }

        // Clear reference when audio ends
        audio.onended = () => {
            if (this.currentlyPlaying === audio) {
                this.currentlyPlaying = null;
                this.currentTrack = null;
            }
        };
    }

    // ========================================================================
    // FADE CONTROL
    // ========================================================================

    /**
     * Fade out an audio element smoothly
     * 
     * @param audio - HTMLAudioElement to fade
     * @param duration - Fade duration in milliseconds
     */
    public fadeOut(audio: HTMLAudioElement, duration: number = this.fadeDuration): Promise<void> {
        return new Promise((resolve) => {
            if (!audio || audio.paused) {
                resolve();
                return;
            }

            const startVolume = audio.volume;
            const startTime = performance.now();

            // Cancel any existing fade
            if (this.fadeAnimationId) {
                cancelAnimationFrame(this.fadeAnimationId);
                this.fadeAnimationId = null;
            }

            const fadeStep = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Ease-out curve for smoother fade
                const easedProgress = 1 - Math.pow(1 - progress, 2);
                audio.volume = startVolume * (1 - easedProgress);

                if (progress < 1) {
                    this.fadeAnimationId = requestAnimationFrame(fadeStep);
                } else {
                    // Fade complete - stop audio
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = this.config.volume; // Reset volume
                    this.fadeAnimationId = null;

                    if (this.currentlyPlaying === audio) {
                        this.currentlyPlaying = null;
                        this.currentTrack = null;
                    }

                    resolve();
                }
            };

            this.fadeAnimationId = requestAnimationFrame(fadeStep);
        });
    }

    /**
     * Fade in an audio element smoothly
     * 
     * @param audio - HTMLAudioElement to fade
     * @param targetVolume - Target volume (0-1)
     * @param duration - Fade duration in milliseconds
     */
    public fadeIn(
        audio: HTMLAudioElement,
        targetVolume: number = this.config.volume,
        duration: number = this.fadeDuration
    ): Promise<void> {
        return new Promise((resolve) => {
            audio.volume = 0;
            const startTime = performance.now();

            const fadeStep = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Ease-in curve
                const easedProgress = progress * progress;
                audio.volume = targetVolume * easedProgress;

                if (progress < 1) {
                    requestAnimationFrame(fadeStep);
                } else {
                    audio.volume = targetVolume;
                    resolve();
                }
            };

            requestAnimationFrame(fadeStep);
        });
    }

    // ========================================================================
    // STOP CONTROLS
    // ========================================================================

    /**
     * Stop a specific track
     * 
     * @param track - Track to stop
     * @param fade - Whether to fade out (default: false for immediate stop)
     */
    public async stop(track: AudioTrack, fade: boolean = false): Promise<void> {
        const audio = this.audioContext.get(track);
        if (!audio) return;

        if (fade && !audio.paused) {
            await this.fadeOut(audio, this.fadeDuration);
        } else {
            audio.pause();
            audio.currentTime = 0;
        }

        if (this.currentlyPlaying === audio) {
            this.currentlyPlaying = null;
            this.currentTrack = null;
        }
    }

    /**
     * Stop the currently playing audio with optional fade
     * 
     * @param fade - Whether to fade out (default: true)
     */
    public async stopCurrent(fade: boolean = true): Promise<void> {
        if (!this.currentlyPlaying) return;

        if (fade && !this.currentlyPlaying.paused) {
            await this.fadeOut(this.currentlyPlaying, this.fadeDuration);
        } else {
            this.currentlyPlaying.pause();
            this.currentlyPlaying.currentTime = 0;
        }

        this.currentlyPlaying = null;
        this.currentTrack = null;
    }

    /**
     * Stop all playing audio
     * 
     * @param fade - Whether to fade out all tracks
     */
    public async stopAll(fade: boolean = false): Promise<void> {
        // Cancel fade animation
        if (this.fadeAnimationId) {
            cancelAnimationFrame(this.fadeAnimationId);
            this.fadeAnimationId = null;
        }

        // Clear queue
        this.clearQueue();

        // Stop all audio elements
        const stopPromises: Promise<void>[] = [];
        this.audioContext.forEach((audio) => {
            if (fade && !audio.paused) {
                stopPromises.push(this.fadeOut(audio, this.fadeDuration));
            } else {
                audio.pause();
                audio.currentTime = 0;
            }
        });

        if (fade && stopPromises.length > 0) {
            await Promise.all(stopPromises);
        }

        this.currentlyPlaying = null;
        this.currentTrack = null;
        this.isProcessingQueue = false;
    }

    // ========================================================================
    // QUEUE MANAGEMENT
    // ========================================================================

    /**
     * Clear the audio queue
     */
    private clearQueue(): void {
        // Reject all pending queue items
        this.queue.forEach((item) => {
            item.reject(new Error('Queue cleared'));
        });
        this.queue = [];
    }

    /**
     * Get current queue length
     */
    public getQueueLength(): number {
        return this.queue.length;
    }

    /**
     * Check if a specific track is currently playing
     */
    public isPlaying(track?: AudioTrack): boolean {
        if (track) {
            return this.currentTrack === track &&
                this.currentlyPlaying !== null &&
                !this.currentlyPlaying.paused;
        }
        return this.currentlyPlaying !== null && !this.currentlyPlaying.paused;
    }

    // ========================================================================
    // VOLUME CONTROLS
    // ========================================================================

    /**
     * Set global volume (0.0 - 1.0)
     */
    public setVolume(volume: number): void {
        this.config.volume = Math.max(0, Math.min(1, volume));
        this.audioContext.forEach((audio) => {
            audio.volume = this.config.volume;
        });
    }

    /**
     * Mute/unmute all audio
     */
    public setMuted(muted: boolean): void {
        this.config.muted = muted;
        if (muted) {
            this.stopAll();
        }
    }

    /**
     * Get current configuration
     */
    public getConfig(): AudioConfig {
        return { ...this.config };
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    /**
     * Wait for an audio element to finish playing
     */
    private waitForAudioEnd(audio: HTMLAudioElement): Promise<void> {
        return new Promise((resolve) => {
            if (audio.paused || audio.ended) {
                resolve();
                return;
            }

            const onEndOrPause = () => {
                audio.removeEventListener('ended', onEndOrPause);
                audio.removeEventListener('pause', onEndOrPause);
                resolve();
            };

            audio.addEventListener('ended', onEndOrPause);
            audio.addEventListener('pause', onEndOrPause);
        });
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Cleanup resources
     */
    public dispose(): void {
        this.stopAll();
        this.audioContext.clear();
        this.initialized = false;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export singleton instance
export const AudioService = AudioServiceClass.getInstance();

// Initialize on first user interaction (handles Safari autoplay policy)
if (typeof window !== 'undefined') {
    const initOnInteraction = () => {
        AudioService.initialize();
        // Remove listeners after first interaction
        document.removeEventListener('click', initOnInteraction);
        document.removeEventListener('keydown', initOnInteraction);
    };

    document.addEventListener('click', initOnInteraction, { once: true });
    document.addEventListener('keydown', initOnInteraction, { once: true });
}
