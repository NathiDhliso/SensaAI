import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PersonaId } from '@/features/ai-coach';
import type { Mood } from '@/features/ai-coach';

export type UserRole = 'architect' | 'operator' | 'specialist' | 'learner';
export type FamiliarSystem = 'construction' | 'cooking' | 'travel' | 'healthcare' | 'sports' | 'nature';
export type PracticeMode = 'blocked' | 'mixed' | 'progressive';

export type BehavioralSignals = {
  avgTimePerConcept: number;  // seconds
  conceptRevisits: number;    // count of times user revisited concepts
  consecutiveErrors: number;  // errors in a row

  velocityEngagement: number; // 0-1 scale
  totalConceptsViewed: number;
};

export type MetaphorSettings = {
  showVisualAnchors: boolean;        // 🧮 Abacus vs just "Addition"
  showAnalogies: boolean;            // "Like a calculator" explanations
  metaphorComplexity: 'simple' | 'rich'; // "Key" vs "Master key with timer"
  allowCustomMetaphors: boolean;     // User can replace system metaphors
};

type PersonalizationState = {
  onboardingComplete: boolean;
  chosenRole: UserRole | null;
  familiarSystem: FamiliarSystem | null;

  // AI Coach Settings
  selectedPersona: PersonaId;
  coachVoiceEnabled: boolean;
  coachIntensity: number; // 1-5 scale
  lastSessionMood: Mood | null;

  // Cognitive Load Settings
  stressFreeMode: boolean; // Shorter AI explanations + forced Bionic Text

  // Metaphor Settings
  metaphorSettings: MetaphorSettings;

  // Practice Mode (Learning Science)
  practiceMode: PracticeMode;

  // Academic Schedule
  semesterStartDate: string | null; // ISO Date String
};

type PersonalizationActions = {
  completeOnboarding: (role: UserRole, system: FamiliarSystem) => void;
  resetOnboarding: () => void;
  updateRole: (role: UserRole) => void;
  updateFamiliarSystem: (system: FamiliarSystem) => void;

  // AI Coach Actions
  setSelectedPersona: (persona: PersonaId) => void;
  setCoachVoiceEnabled: (enabled: boolean) => void;
  setCoachIntensity: (intensity: number) => void;
  setLastSessionMood: (mood: Mood) => void;

  // Cognitive Load Actions
  setStressFreeMode: (enabled: boolean) => void;

  // Metaphor Actions
  updateMetaphorSettings: (settings: MetaphorSettings) => void;
  trackMetaphorUsage: (action: string, value: string) => void;

  // Practice Mode Actions
  setPracticeMode: (mode: PracticeMode) => void;

  // Academic Schedule Actions
  setSemesterStartDate: (date: string | null) => void;
};

export const usePersonalizationStore = create<PersonalizationState & PersonalizationActions>()(
  persist(
    (set) => ({
      onboardingComplete: false,
      chosenRole: null,
      familiarSystem: null,

      // AI Coach Defaults
      selectedPersona: 'buddy',
      coachVoiceEnabled: true,
      coachIntensity: 3,
      lastSessionMood: null,

      // Cognitive Load Defaults
      stressFreeMode: false,

      // Metaphor Defaults
      metaphorSettings: {
        showVisualAnchors: true,
        showAnalogies: true,
        metaphorComplexity: 'simple',
        allowCustomMetaphors: false,
      },

      // Practice Mode Defaults
      practiceMode: 'progressive',

      // Academic Schedule Defaults
      semesterStartDate: null,

      completeOnboarding: (role, system) => {
        set({
          onboardingComplete: true,
          chosenRole: role,
          familiarSystem: system,
        });
      },

      resetOnboarding: () => {
        set({
          onboardingComplete: false,
          chosenRole: null,
          familiarSystem: null,
          semesterStartDate: null,
        });
      },

      updateRole: (role) => {
        set({ chosenRole: role });
      },

      updateFamiliarSystem: (system) => {
        set({ familiarSystem: system });
      },

      // AI Coach Actions
      setSelectedPersona: (persona) => {
        set({ selectedPersona: persona });
      },

      setCoachVoiceEnabled: (enabled) => {
        set({ coachVoiceEnabled: enabled });
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
        // For now, just log to console. In production, this would send to analytics
        console.log('Metaphor usage:', { action, value, timestamp: new Date().toISOString() });
      },

      // Practice Mode Actions
      setPracticeMode: (mode) => {
        set({ practiceMode: mode });
      },

      // Academic Schedule Actions
      setSemesterStartDate: (date) => {
        set({ semesterStartDate: date });
      },
    }),
    {
      name: 'personalization-storage',
      version: 2,
    }
  )
);
