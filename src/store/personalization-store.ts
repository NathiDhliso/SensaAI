import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PersonaId } from '@/lib/ai/coach';
import type { Mood } from '@/lib/ai/coach';

export type UserRole = 'architect' | 'operator' | 'specialist' | 'learner';
export type FamiliarSystem = 'construction' | 'cooking' | 'travel' | 'healthcare' | 'sports' | 'nature';

// Learning Profile System - Predictive Detection
export type LearningProfile = 'velocity-optimal' | 'undetermined';

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
  preferredLearningStyle: 'visual' | 'practical' | 'theoretical' | null;
  aphantasiaMode: boolean;
  bionicReading: boolean;

  // Inferred Learning Profile (Zero Administration)
  inferredProfile: LearningProfile;
  profileConfidence: number; // 0-100%
  behavioralSignals: BehavioralSignals;

  // AI Coach Settings
  selectedPersona: PersonaId;
  coachVoiceEnabled: boolean;
  coachIntensity: number; // 1-5 scale
  lastSessionMood: Mood | null;
  elevenLabsApiKey: string | null;
};

// Default behavioral signals
const DEFAULT_BEHAVIORAL_SIGNALS: BehavioralSignals = {
  avgTimePerConcept: 0,
  conceptRevisits: 0,
  consecutiveErrors: 0,

  velocityEngagement: 0,
  totalConceptsViewed: 0,
};

type PersonalizationActions = {
  completeOnboarding: (role: UserRole, system: FamiliarSystem, style: 'visual' | 'practical' | 'theoretical') => void;
  resetOnboarding: () => void;
  updateRole: (role: UserRole) => void;
  updateFamiliarSystem: (system: FamiliarSystem) => void;
  setAphantasiaMode: (enabled: boolean) => void;
  setBionicReading: (enabled: boolean) => void;

  // Learning Profile Actions
  updateBehavioralSignals: (signals: Partial<BehavioralSignals>) => void;
  setInferredProfile: (profile: LearningProfile, confidence: number) => void;

  // AI Coach Actions
  setSelectedPersona: (persona: PersonaId) => void;
  setCoachVoiceEnabled: (enabled: boolean) => void;
  setCoachIntensity: (intensity: number) => void;
  setLastSessionMood: (mood: Mood) => void;
  setElevenLabsApiKey: (key: string | null) => void;
};

export const usePersonalizationStore = create<PersonalizationState & PersonalizationActions>()(
  persist(
    (set) => ({
      onboardingComplete: false,
      chosenRole: null,
      familiarSystem: null,
      preferredLearningStyle: null,
      aphantasiaMode: false,
      bionicReading: false,

      // Learning Profile Defaults (Zero Administration)
      inferredProfile: 'undetermined',
      profileConfidence: 0,
      behavioralSignals: DEFAULT_BEHAVIORAL_SIGNALS,

      // AI Coach Defaults
      selectedPersona: 'buddy',
      coachVoiceEnabled: true,
      coachIntensity: 3,
      lastSessionMood: null,
      elevenLabsApiKey: null,

      completeOnboarding: (role, system, style) => {
        set({
          onboardingComplete: true,
          chosenRole: role,
          familiarSystem: system,
          preferredLearningStyle: style,
        });
      },

      resetOnboarding: () => {
        set({
          onboardingComplete: false,
          chosenRole: null,
          familiarSystem: null,
          preferredLearningStyle: null,
        });
      },

      updateRole: (role) => {
        set({ chosenRole: role });
      },

      updateFamiliarSystem: (system) => {
        set({ familiarSystem: system });
      },

      setAphantasiaMode: (enabled) => {
        set({ aphantasiaMode: enabled });
      },

      setBionicReading: (enabled) => {
        set({ bionicReading: enabled });
      },

      // Learning Profile Actions
      updateBehavioralSignals: (signals) => {
        set((state) => ({
          behavioralSignals: { ...state.behavioralSignals, ...signals },
        }));
      },

      setInferredProfile: (profile, confidence) => {
        set({ inferredProfile: profile, profileConfidence: confidence });
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

      setElevenLabsApiKey: (key) => {
        set({ elevenLabsApiKey: key });
      },
    }),
    {
      name: 'personalization-storage',
    }
  )
);
