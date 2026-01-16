/**
 * AudioService - Singleton Audio Manager
 * 
 * Prevents memory leaks from creating multiple Audio instances.
 * Manages a single audio context for the entire application lifecycle.
 * Respects global mute/volume settings.
 */

type AudioTrack = 'success' | 'error' | 'notification' | 'mastery';

interface AudioConfig {
    volume: number;
    muted: boolean;
}

class AudioServiceClass {
    private static instance: AudioServiceClass;
    private audioContext: Map<AudioTrack, HTMLAudioElement>;
    private config: AudioConfig;
    private initialized: boolean;

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

    /**
     * Initialize audio context (requires user gesture for Safari)
     */
    public initialize(): void {
        if (this.initialized) return;

        // Preload common audio files
        this.preloadAudio('mastery', '/audio/voice/sage_master_success.mp3');

        this.initialized = true;
    }

    /**
     * Preload an audio file
     */
    private preloadAudio(track: AudioTrack, src: string): void {
        if (this.audioContext.has(track)) return;

        const audio = new Audio(src);
        audio.volume = this.config.volume;
        audio.preload = 'auto';

        this.audioContext.set(track, audio);
    }

    /**
     * Play an audio track
     */
    public play(track: AudioTrack, src?: string): Promise<void> {
        if (this.config.muted) {
            return Promise.resolve();
        }

        // If src is provided and track doesn't exist, preload it
        if (src && !this.audioContext.has(track)) {
            this.preloadAudio(track, src);
        }

        const audio = this.audioContext.get(track);
        if (!audio) {
            console.warn(`[AudioService] Track "${track}" not found`);
            return Promise.resolve();
        }

        // Reset to beginning if already playing
        audio.currentTime = 0;
        audio.volume = this.config.volume;

        return audio.play().catch((error) => {
            // Handle autoplay policy errors gracefully
            if (error.name === 'NotAllowedError') {
                console.warn('[AudioService] Autoplay blocked by browser policy');
            } else {
                console.error('[AudioService] Playback error:', error);
            }
        });
    }

    /**
     * Stop a specific track
     */
    public stop(track: AudioTrack): void {
        const audio = this.audioContext.get(track);
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    }

    /**
     * Stop all playing audio
     */
    public stopAll(): void {
        this.audioContext.forEach((audio) => {
            audio.pause();
            audio.currentTime = 0;
        });
    }

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

    /**
     * Cleanup resources
     */
    public dispose(): void {
        this.stopAll();
        this.audioContext.clear();
        this.initialized = false;
    }
}

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
