import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PersonaId } from '@/features/ai-coach';
import type { Mood } from '@/features/ai-coach';
export type PracticeMode = 'blocked' | 'mixed' | 'progressive';
export type BehavioralSignals = {
 avgTimePerConcept: number; // seconds
 conceptRevisits: number; // count of times user revisited concepts
 consecutiveErrors: number; // errors in a row
 velocityEngagement: number; // 0-1 scale
 totalConceptsViewed: number;
};
export type MetaphorSettings = {
 showAnalogies: boolean; // "Like a calculator" explanations
 metaphorComplexity: 'simple' | 'rich'; // "Key" vs "Master key with timer"
 allowCustomMetaphors: boolean; // User can replace system metaphors
};
type PersonalizationState = {
 selectedPersona: PersonaId;
 coachIntensity: number; // 1-5 scale
 lastSessionMood: Mood | null;
 // Cognitive Load Settings
 stressFreeMode: boolean; // Shorter AI explanations + forced Bionic Text
 // Metaphor Settings
 metaphorSettings: MetaphorSettings;
 metaphorGraduation: Record<string, number>; // CONCEPT_ID -> SCORE (0-100)
 // Practice Mode (Learning Science)
 practiceMode: PracticeMode;
 // Academic Schedule
 semesterStartDate: string | null; // ISO Date String
};
type PersonalizationActions = {
 setSelectedPersona: (persona: PersonaId) => void;
 setCoachIntensity: (intensity: number) => void;
 setLastSessionMood: (mood: Mood) => void;
 // Cognitive Load Actions
 setStressFreeMode: (enabled: boolean) => void;
 // Metaphor Actions
 updateMetaphorSettings: (settings: MetaphorSettings) => void;
 trackMetaphorUsage: (action: string, value: string) => void;
 updateGraduationScore: (conceptId: string, score: number) => void;
 // Practice Mode Actions
 setPracticeMode: (mode: PracticeMode) => void;
 // Academic Schedule Actions
 setSemesterStartDate: (date: string | null) => void;
};
export const usePersonalizationStore = create<PersonalizationState & PersonalizationActions>()(
 persist(
 (set) => ({
 selectedPersona: 'buddy',
 coachIntensity: 3,
 lastSessionMood: null,
 // Cognitive Load Defaults
 stressFreeMode: false,
 // Metaphor Defaults
 metaphorSettings: {
 showAnalogies: true,
 metaphorComplexity: 'simple',
 allowCustomMetaphors: false
 },
 metaphorGraduation: {},
 // Practice Mode Defaults
 practiceMode: 'progressive',
 // Academic Schedule Defaults
 semesterStartDate: null,
 setSelectedPersona: (persona) => {
 set({ selectedPersona: persona });
 },
 setCoachIntensity: (intensity) => {
 set({ coachIntensity: Math.max(1, Math.min(5, intensity)) });
 },
 setLastSessionMood: (mood) => {
 set({ lastSessionMood: mood });
 },
 // Cognitive Load Actions
 setStressFreeMode: (enabled) => {
 set({ stressFreeMode: enabled });
 },
 // Metaphor Actions
 updateMetaphorSettings: (settings) => {
 set({ metaphorSettings: settings });
 },
 trackMetaphorUsage: (action, value) => {
 if (import.meta.env.DEV) {
 console.debug('[MetaphorAnalytics]', { action, value, timestamp: Date.now() });
 }
 },
 // Graduation Actions
 updateGraduationScore: (conceptId, score) => {
 set((state) => ({
 metaphorGraduation: {
 ...state.metaphorGraduation,
 [conceptId]: score
 }
 }));
 },
 // Practice Mode Actions
 setPracticeMode: (mode) => {
 set({ practiceMode: mode });
 },
 // Academic Schedule Actions
 setSemesterStartDate: (date) => {
 set({ semesterStartDate: date });
 }
 }),
 {
 name: 'personalization-storage',
 version: 3, // Increment version for schema change
 }
 )
);
