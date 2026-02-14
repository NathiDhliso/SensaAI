import { useMemo } from 'react';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import { usePersonalizationStore } from '@/store/personalization-store';
import {
  TIER_NARRATIVE,
  PHASE_NARRATIVE,
  SESSION_NARRATIVE,
  CELEBRATION_NARRATIVE,
  getProgressNarrative,
  type TierType,
  type NarrativeText
} from '@/shared/constants/tree-narrative';

interface TreeNarrativeResult {
  isActive: boolean;
  tier: (tier: TierType) => string;
  tierLabel: (tier: TierType) => string;
  phase: (phase: string) => { label: string; description: string };
  progress: (completed: number, total: number) => { label: string; description: string };
  mood: (moodId: string) => { label: string; description: string };
  goal: (goalId: string) => { label: string; description: string };
  celebration: (type: 'stage' | 'course') => { title: string; message: string };
  conceptMastered: () => string;
}

export function useTreeNarrative(): TreeNarrativeResult {
  const { isScholarly } = useVisualTheme();
  const { metaphorSettings } = usePersonalizationStore();
  const isActive = metaphorSettings.showAnalogies && !isScholarly;

  return useMemo(() => {
    const pick = (narrative: NarrativeText) =>
      isScholarly ? narrative.scholarly : narrative.description;

    const pickLabel = (narrative: NarrativeText) =>
      isScholarly ? narrative.scholarly : narrative.label;

    return {
      isActive,

      tier: (tier: TierType) => {
        if (!isActive) return TIER_NARRATIVE[tier].scholarly;
        return pick(TIER_NARRATIVE[tier]);
      },

      tierLabel: (tier: TierType) => {
        if (!isActive) return tier.charAt(0).toUpperCase() + tier.slice(1);
        return pickLabel(TIER_NARRATIVE[tier]);
      },

      phase: (phase: string) => {
        const narrative = PHASE_NARRATIVE[phase] || PHASE_NARRATIVE.LEARN;
        if (!isActive) return { label: narrative.scholarly, description: narrative.scholarly };
        return { label: narrative.label, description: narrative.description };
      },

      progress: (completed: number, total: number) => {
        const narrative = getProgressNarrative(completed, total);
        if (!isActive) return { label: narrative.scholarly, description: narrative.scholarly };
        return { label: narrative.label, description: narrative.description };
      },

      mood: (moodId: string) => {
        const narrative = SESSION_NARRATIVE.moodFraming[moodId as keyof typeof SESSION_NARRATIVE.moodFraming];
        if (!narrative) return { label: moodId, description: '' };
        if (!isActive) return { label: narrative.scholarly, description: narrative.scholarly };
        return { label: narrative.label, description: narrative.description };
      },

      goal: (goalId: string) => {
        const narrative = SESSION_NARRATIVE.goals[goalId as keyof typeof SESSION_NARRATIVE.goals];
        if (!narrative) return { label: goalId, description: '' };
        if (!isActive) return { label: narrative.scholarly, description: narrative.scholarly };
        return { label: narrative.label, description: narrative.description };
      },

      celebration: (type: 'stage' | 'course') => {
        const narrative = type === 'course'
          ? CELEBRATION_NARRATIVE.courseDone
          : CELEBRATION_NARRATIVE.stageDone;
        if (!isActive) return narrative.scholarly;
        return { title: narrative.title, message: narrative.message };
      },

      conceptMastered: () => {
        if (!isActive) return 'Concept mastered';
        const options = CELEBRATION_NARRATIVE.conceptMastered;
        return options[Math.floor(Math.random() * options.length)];
      }
    };
  }, [isActive, isScholarly]);
}
