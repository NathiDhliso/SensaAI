/**
 * ElevenLabs Voice Service
 * 
 * Handles text-to-speech synthesis using the ElevenLabs API.
 */

import { PERSONAS, type PersonaId } from '@/lib/ai/coach/personas';

export interface VoiceConfig {
    elevenLabsId: string;
    stability: number;
    similarityBoost: number;
    style?: number;
}

export class ElevenLabsService {
    private apiKey: string;
    private baseUrl = 'https://api.elevenlabs.io/v1';

    constructor(apiKey?: string) {
        this.apiKey = apiKey || import.meta.env.VITE_ELEVENLABS_API_KEY || '';
    }

    /**
     * Set the API key dynamically (e.g. from user settings)
     */
    setApiKey(key: string) {
        this.apiKey = key;
    }

    /**
     * Synthesize text to speech
     * Returns a Blob url to the audio file
     */
    async speak(text: string, personaId: PersonaId, overrides?: { stability?: number; style?: number }): Promise<string> {
        if (!this.apiKey) {
            console.warn('ElevenLabs API key not found. Voice disabled.');
            throw new Error('API key missing');
        }

        const persona = PERSONAS[personaId];
        if (!persona || !persona.voiceConfig) {
            throw new Error(`Voice config not found for persona: ${personaId}`);
        }

        const { elevenLabsId, stability, similarityBoost, style } = persona.voiceConfig;

        // Apply overrides if provided
        const finalStability = overrides?.stability ?? stability;
        const finalStyle = overrides?.style ?? style ?? 0;

        try {
            const response = await fetch(`${this.baseUrl}/text-to-speech/${elevenLabsId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': this.apiKey,
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_monolingual_v1', // or 'eleven_turbo_v2' for speed
                    voice_settings: {
                        stability: finalStability,
                        similarity_boost: similarityBoost,
                        style: finalStyle,
                        use_speaker_boost: true,
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('ElevenLabs API Error:', errorData);
                throw new Error(`ElevenLabs Error: ${response.statusText}`);
            }

            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } catch (error) {
            console.error('Text-to-speech failed:', error);
            throw error;
        }
    }

    /**
     * Verify API key validity
     */
    async verifyKey(key: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/user`, {
                headers: { 'xi-api-key': key },
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

// Export singleton instance
export const voiceService = new ElevenLabsService();
