// AI Coach Feature
// AI coach personalities and voice

export * from './personas';
export * from './voice/static-lines';
export * from './voice/useVoice';

// Re-export from old coach index for backwards compatibility
export type { Mood, MoodOption, BreathingPattern, BreathingExercise } from '@/lib/ai/coach';
export { 
  MOOD_OPTIONS, 
  getMoodAdjustedIntro, 
  getRecommendedBreathing, 
  BREATHING_EXERCISES,
  getSessionIntensity,
  aiCoach
} from '@/lib/ai/coach';
