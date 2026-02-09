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
export type CognitiveBandwidth = 'high' | 'medium' | 'low';
export function moodToBandwidth(mood: Mood): CognitiveBandwidth {
 if (mood === 'energized') return 'high';
 if (mood === 'neutral') return 'medium';
 return 'low';
}
export interface MoodOption {
 id: Mood;
 emoji: string;
 label: string;
 description: string;
 sessionAdjustment: string;
 bandwidth: CognitiveBandwidth;
 bandwidthLabel: string;
}
export const MOOD_OPTIONS: MoodOption[] = [
 {
 id: 'energized',
 label: 'Pumped / High Focus',
 description: 'All features unlocked — deep work and complex challenges',
 sessionAdjustment: 'Full toolkit, harder concepts first',
 bandwidth: 'high',
 bandwidthLabel: 'High Bandwidth'
 },
 {
 id: 'neutral',
 label: 'Steady / Good',
 description: 'Standard features — building and connecting ideas',
 sessionAdjustment: 'Balanced mix of activities',
 bandwidth: 'medium',
 bandwidthLabel: 'Med Bandwidth'
 },
 {
 id: 'tired',
 label: 'Low / Brain Fog',
 description: 'Light review only — high-load tools hidden',
 sessionAdjustment: 'Fluency drills, familiar concepts',
 bandwidth: 'low',
 bandwidthLabel: 'Low Bandwidth'
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
 pattern: 'Inhale 4s Hold 7s Exhale 8s'
 },
 box: {
 id: 'box',
 name: 'Box Breathing',
 description: 'Equal rhythm for focus',
 duration: 16,
 pattern: 'Inhale 4s Hold 4s Exhale 4s Hold 4s'
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
// ============================================================================
// ELABORATIVE INTERROGATION (METACOGNITION)
// ============================================================================
/**
 * Elaboration prompt types for deeper learning.
 * 
 * Elaborative interrogation research shows these prompts improve:
 * - Encoding of new information
 * - Connection to prior knowledge
 * - Transfer to new contexts
 */
export type ElaborationPromptType =
 | 'why_true' // "Why would X be true?"
 | 'connect_prior' // "What does this remind you of?"
 | 'real_world' // "Where would you use this?"
 | 'self_explain' // "Explain in your own words"
 | 'compare' // "How is this different from X?"
 | 'predict'; // "What do you think would happen if...?"
/**
 * Persona-specific elaboration prompt templates.
 * The {concept} placeholder will be replaced with the concept name.
 */
export const ELABORATION_PROMPTS: Record<PersonaId, Record<ElaborationPromptType, string>> = {
 goggins: {
 why_true: "Why does {concept} work this way? Explain it. No shortcuts.",
 connect_prior: "What existing knowledge connects to {concept}?",
 real_world: "Give me a real example of {concept} in action. Make it count.",
 self_explain: "Teach me {concept} in your own words. Now.",
 compare: "How is {concept} different from what we covered before?",
 predict: "If you applied {concept} differently, what would happen?"
 },
 sage: {
 why_true: "Sit with {concept}. Why does it feel true?",
 connect_prior: "What echoes of prior learning do you notice in {concept}?",
 real_world: "How might {concept} appear in your daily experience?",
 self_explain: "Speak {concept} aloud in your own voice. Let understanding flow.",
 compare: "How does {concept} dance with what came before?",
 predict: "What ripples might form if {concept} were different?"
 },
 socratic: {
 why_true: "Why do you think {concept} is the case? What makes it true?",
 connect_prior: "What prior knowledge might connect to {concept}?",
 real_world: "In what situations might {concept} be relevant?",
 self_explain: "How would you explain {concept} to someone unfamiliar?",
 compare: "What similarities or differences exist between {concept} and related ideas?",
 predict: "If conditions changed, how might {concept} behave differently?"
 },
 coach: {
 why_true: "Think about why {concept} makes sense. What's the underlying reason?",
 connect_prior: "Does {concept} remind you of anything you already know?",
 real_world: "Where in your life might you actually use {concept}?",
 self_explain: "Try explaining {concept} in your own words—it'll help it stick!",
 compare: "How does {concept} compare to what we've learned before?",
 predict: "What do you think would happen if you changed how {concept} works?"
 },
 buddy: {
 why_true: "Hey, why do you think {concept} works that way?",
 connect_prior: "Does {concept} remind you of anything we talked about before?",
 real_world: "Where might you actually run into {concept} out there?",
 self_explain: "Could you explain {concept} back to me? Helps me know you got it!",
 compare: "How is {concept} different from similar stuff?",
 predict: "What if we changed things up with {concept}? What would happen?"
 }
};
/**
 * Get an elaboration prompt for a concept, tailored to the persona.
 * 
 * @param personaId The coach persona to use
 * @param type The type of elaboration to prompt
 * @param conceptName The concept to elaborate on
 * @returns A formatted elaboration prompt string
 */
export function getElaborationPrompt(
 personaId: PersonaId,
 type: ElaborationPromptType,
 conceptName: string
): string {
 const template = ELABORATION_PROMPTS[personaId]?.[type]
 ?? ELABORATION_PROMPTS.coach[type];
 return template.replace('{concept}', conceptName);
}
/**
 * Get a random elaboration prompt for variety.
 */
export function getRandomElaborationPrompt(
 personaId: PersonaId,
 conceptName: string
): { type: ElaborationPromptType; prompt: string } {
 const types: ElaborationPromptType[] = [
 'why_true', 'connect_prior', 'real_world',
 'self_explain', 'compare', 'predict'
 ];
 const type = types[Math.floor(Math.random() * types.length)];
 return {
 type,
 prompt: getElaborationPrompt(personaId, type, conceptName)
 };
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
 /**
 * Get an elaboration prompt for deeper learning.
 */
 getElaboration(
 personaId: PersonaId,
 type: ElaborationPromptType,
 conceptName: string
 ): string {
 return getElaborationPrompt(personaId, type, conceptName);
 }
 /**
 * Get a random elaboration prompt for variety.
 */
 getRandomElaboration(
 personaId: PersonaId,
 conceptName: string
 ): { type: ElaborationPromptType; prompt: string } {
 return getRandomElaborationPrompt(personaId, conceptName);
 }
}
export const aiCoach = AICoachService.getInstance();