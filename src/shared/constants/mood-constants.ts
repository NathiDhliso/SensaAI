import type { StudyGoal } from '@/shared/types/learning';
import type { Mood } from '@/features/ai-coach';

export const MOOD_GOAL_MAP: Record<Mood, { goal: StudyGoal; duration: number; storeMood: 'pumped' | 'good' | 'okay' | 'struggling' | 'tired' }> = {
 energized: { goal: 'velocity', duration: 45, storeMood: 'pumped' },
 neutral: { goal: 'learn-new', duration: 30, storeMood: 'good' },
 tired: { goal: 'review', duration: 15, storeMood: 'tired' },
 stressed: { goal: 'explore', duration: 15, storeMood: 'struggling' }
};
