/**
 * AI Coach Feature
 * AI coach personalities, voice, and mood-based adjustments
 */

import { getPersona, getPersonaResponse, type PersonaId } from './personas';

export { getPersona, getPersonaResponse, getAllPersonas, PERSONAS, type PersonaId, type PhaseKey, type PhaseResponses } from './personas';
export * from './voice/static-lines';
export * from './voice/useVoice';

// Mood types and utilities
export type Mood = 'energized' | 'neutral' | 'tired' | 'stressed';

export interface MoodOption {
    id: Mood;
    emoji: string;
    label: string;
    description: string;
    sessionAdjustment: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
    {
        id: 'energized',
        emoji: '😊',
        label: 'Energized',
        description: 'Focused and ready to tackle challenges',
        sessionAdjustment: 'Full intensity, challenging concepts first'
    },
    {
        id: 'neutral',
        emoji: '😐',
        label: 'Neutral',
        description: "Let's see how it goes",
        sessionAdjustment: 'Standard pacing, balanced approach'
    },
    {
        id: 'tired',
        emoji: '😴',
        label: 'Tired',
        description: 'Low energy but showing up',
        sessionAdjustment: 'Shorter bursts, more encouragement, easier concepts first'
    },
    {
        id: 'stressed',
        emoji: '😤',
        label: 'Stressed',
        description: 'Need to clear my head',
        sessionAdjustment: 'Extended calming intro, easy wins first'
    }
];

/**
 * Get mood-adjusted intro from persona
 */
export function getMoodAdjustedIntro(personaId: PersonaId, mood: Mood): string {
    const persona = getPersona(personaId);
    const baseIntro = getPersonaResponse(personaId, 'prime', 'intro');

    // Adjust intro based on mood and persona personality
    switch (mood) {
        case 'tired':
            if (persona.traits.warmth >= 4) {
                return `I see you're tired today. That's okay—showing up is what matters. ${baseIntro}`;
            } else if (persona.traits.intensity >= 4) {
                return `Tired? That's when champions separate themselves. ${baseIntro}`;
            }
            return baseIntro;

        case 'stressed':
            if (persona.traits.warmth >= 4) {
                return `Take a moment. Breathe. Learning will help clear your mind. ${baseIntro}`;
            } else if (personaId === 'socratic') {
                return `What's causing the stress? Perhaps focused learning can provide clarity. ${baseIntro}`;
            }
            return baseIntro;

        case 'energized':
            if (persona.traits.intensity >= 4) {
                return `I like that energy! Let's channel it. ${baseIntro}`;
            }
            return `Great energy today! ${baseIntro}`;

        default:
            return baseIntro;
    }
}

/**
 * Calculate session intensity based on mood
 */
export function getSessionIntensity(mood: Mood): number {
    switch (mood) {
        case 'energized': return 1.0;
        case 'neutral': return 0.8;
        case 'tired': return 0.6;
        case 'stressed': return 0.5;
        default: return 0.8;
    }
}

/**
 * Get breathing exercise recommendation based on mood
 */
export type BreathingPattern = '478' | 'box' | 'quick' | 'none';

export interface BreathingExercise {
    id: BreathingPattern;
    name: string;
    description: string;
    duration: number; // seconds
    pattern: string;
}

export const BREATHING_EXERCISES: Record<BreathingPattern, BreathingExercise> = {
    '478': {
        id: '478',
        name: '4-7-8 Relaxation',
        description: 'Deep relaxation for stress relief',
        duration: 19,
        pattern: 'Inhale 4s → Hold 7s → Exhale 8s'
    },
    box: {
        id: 'box',
        name: 'Box Breathing',
        description: 'Equal rhythm for focus',
        duration: 16,
        pattern: 'Inhale 4s → Hold 4s → Exhale 4s → Hold 4s'
    },
    quick: {
        id: 'quick',
        name: 'Quick Energizer',
        description: 'Three deep breaths to reset',
        duration: 15,
        pattern: '3 deep breaths, in through nose, out through mouth'
    },
    none: {
        id: 'none',
        name: 'Skip Breathing',
        description: 'Go straight to priming',
        duration: 0,
        pattern: ''
    }
};

export function getRecommendedBreathing(mood: Mood): BreathingPattern {
    switch (mood) {
        case 'stressed': return '478';
        case 'tired': return 'quick';
        case 'energized': return 'box';
        case 'neutral': return 'quick';
        default: return 'quick';
    }
}

/**
 * AI Coach singleton for global access
 */
class AICoachService {
    private static instance: AICoachService;
    private currentPhase: string = 'prime';
    private sessionMood: Mood = 'neutral';

    private constructor() { }

    static getInstance(): AICoachService {
        if (!AICoachService.instance) {
            AICoachService.instance = new AICoachService();
        }
        return AICoachService.instance;
    }

    setCurrentPhase(phase: string) {
        this.currentPhase = phase;
    }

    getCurrentPhase(): string {
        return this.currentPhase;
    }

    setSessionMood(mood: Mood) {
        this.sessionMood = mood;
    }

    getSessionMood(): Mood {
        return this.sessionMood;
    }

    getResponse(personaId: PersonaId, situation: string, phase?: string): string {
        const targetPhase = phase || this.currentPhase;
        return getPersonaResponse(personaId, targetPhase as any, situation as any);
    }

    getIntro(personaId: PersonaId, mood?: Mood): string {
        return getMoodAdjustedIntro(personaId, mood || this.sessionMood);
    }
}

export const aiCoach = AICoachService.getInstance();
