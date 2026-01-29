import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PersonaId } from '@/features/ai-coach';
import type { Mood } from '@/features/ai-coach';

export type UserRole = 'architect' | 'operator' | 'specialist' | 'learner';
export type FamiliarSystem = 'construction' | 'cooking' | 'travel' | 'healthcare' | 'sports' | 'nature';

export type BehavioralSignals = {
  avgTimePerConcept: number;  // seconds
  conceptRevisits: number;    // count of times user revisited concepts
  consecutiveErrors: number;  // errors in a row

  velocityEngagement: number; // 0-1 scale
  totalConceptsViewed: number;
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
