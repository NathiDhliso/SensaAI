import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Target, BookOpen, RefreshCw, Compass,
  ChevronRight, Brain, Sparkles, Heart, ArrowLeft,
  Zap, BatteryLow, Activity, AlertCircle, GraduationCap
} from 'lucide-react';
import type { StudyGoal, SessionDuration, SessionRecommendation } from '@/shared/types/learning';
import { MOOD_OPTIONS, type Mood } from '@/features/ai-coach';
import { usePersonalizationStore } from '@/store/personalization-store';
import { MOOD_COLORS } from '@/shared/constants/theme-colors';
import GuidedPrimer from '@/components/learning/onboarding/GuidedPrimer';
import styles from './SessionStartModal.module.css';

interface SessionStartModalProps {
  /** Subject name */
  subjectName: string;
  /** Total concepts */
  totalConcepts: number;
  /** Completed concepts */
  completedConcepts: number;
  /** AI-generated recommendation */
  recommendation?: SessionRecommendation;
  /** Called when session is started */
  onStart: (goal: StudyGoal, duration: number, primer?: { reason: string; action: string; reward: string }) => void;
  /** Optional callback to exit/go back */
  onBack?: () => void;
}

const DURATION_OPTIONS: Array<{ value: SessionDuration; label: string; minutes: number }> = [
  { value: 15, label: '15 min', minutes: 15 },
  { value: 30, label: '30 min', minutes: 30 },
  { value: 45, label: '45 min', minutes: 45 },
  { value: 60, label: '1 hour', minutes: 60 },
];

const GOAL_OPTIONS: Array<{
  value: StudyGoal;
  label: string;
  description: string;
  icon: typeof BookOpen;
  color: string;
}> = [
    {
      value: 'learn-new',
      label: 'Learn New Concepts',
      description: 'Deep learning with full lifecycle phases',
      icon: BookOpen,
      color: 'var(--color-primary)',
    },
    {
      value: 'velocity',
      label: 'Velocity Mode',
      description: 'High-intensity speed drills',
      icon: Zap,
      color: 'var(--color-accent-purple)',
    },
    {
      value: 'review',
      label: 'Review Completed',
      description: 'Spaced repetition for retention',
      icon: RefreshCw,
      color: 'var(--color-success)',
    },

    {
      value: 'explore',
      label: 'Explore Freely',
      description: 'Self-directed discovery',
      icon: Compass,
      color: 'var(--color-secondary)',
    },
  ];

export function SessionStartModal({
  subjectName,
  totalConcepts,
  completedConcepts,
  recommendation,
  onStart,
  onBack,
}: SessionStartModalProps) {
  const [step, setStep] = useState<'setup' | 'prime'>('setup');
  const [selectedGoal, setSelectedGoal] = useState<StudyGoal>('learn-new');
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [customDuration, setCustomDuration] = useState<string>('');
  const [showCustom, setShowCustom] = useState(false);
  const [selectedMood, setSelectedMood] = useState<Mood>('neutral');

  const { setLastSessionMood } = usePersonalizationStore();

  const progress = useMemo(() => {
    return Math.round((completedConcepts / totalConcepts) * 100);
  }, [completedConcepts, totalConcepts]);

  // ========== SEMESTER HOOK ==========
  // AI-generated "Why this matters in class" line to anchor the session
  const semesterHook = useMemo(() => {
    // Generate contextual hook based on subject and progress
    const hooks = [
      `This knowledge will help you decode your professor's examples in real-time.`,
      `Mastering this now means no panic before your first ${subjectName} exam.`,
      `Your classmates will ask YOU for explanations after lecture.`,
      `This is the foundation that makes advanced ${subjectName} feel like common sense.`,
      `Professors love when students can connect these dots during discussions.`,
    ];
    // Use subject name hash for consistent hook per subject
    const hash = subjectName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return hooks[hash % hooks.length];
  }, [subjectName]);

  const handleDurationSelect = (minutes: number) => {
    setSelectedDuration(minutes);
    setShowCustom(false);
  };

  const handleNext = () => {
    // Phase 0 Requirement: User must actively define their intention.
    // Store the selected mood before moving to prime phase
    setLastSessionMood(selectedMood);
    setStep('prime');
  };

  return (
    <div className={styles.overlay}>
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
      >
        {/* Header */}
        <div className={styles.header}>
          {onBack && (
            <button className={styles.backButton} onClick={onBack} title="Go back">
              <ArrowLeft size={20} />
            </button>
          )}
          <div className={styles.headerContent}>
            <Brain className={styles.headerIcon} size={28} />
            <div>
              <h2>{step === 'setup' ? 'Start Study Session' : 'Step 1: The Why'}</h2>
              <p className={styles.subjectName}>{subjectName}</p>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'setup' ? (
            <motion.div
              key="setup"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
            >
              {/* Progress Summary */}
              <div className={styles.progressSummary}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className={styles.progressText}>
                  {completedConcepts} of {totalConcepts} concepts ({progress}%)
                </span>
              </div>

              {/* Semester Hook - Why this matters */}
              <div className={styles.semesterHook}>
                <div className={styles.hookIcon}>
                  <GraduationCap size={20} />
                </div>
                <div className={styles.hookContent}>
                  <span className={styles.hookLabel}>Why this session matters:</span>
                  <p className={styles.hookText}>{semesterHook}</p>
                </div>
              </div>

              {/* Mood Selection */}
              <div className={styles.moodSection}>
                <div className={styles.moodHeader}>
                  <Heart size={18} />
                  <h3>How are you feeling right now?</h3>
                </div>
                <div className={styles.moodGrid}>
                  {MOOD_OPTIONS.map(mood => {
                    // Map mood to icon
                    const MoodIcon = {
                      energized: Zap,
                      neutral: Activity,
                      tired: BatteryLow,
                      stressed: AlertCircle
                    }[mood.id] || Activity;

                    // Use centralized MOOD_COLORS
                    const moodColor = MOOD_COLORS[mood.id as keyof typeof MOOD_COLORS] || 'currentColor';

                    return (
                      <button
                        key={mood.id}
                        className={`${styles.moodCard} ${selectedMood === mood.id ? styles.moodCardActive : ''}`}
                        onClick={() => {
                          setSelectedMood(mood.id);
                          // Smart Defaults (Curated Session)
                          switch (mood.id) {
                            case 'energized':
                              setSelectedGoal('velocity'); // Redirected to new Velocity Mode
                              setSelectedDuration(45);
                              break;
                            case 'neutral':
                              setSelectedGoal('learn-new');
                              setSelectedDuration(30);
                              break;
                            case 'tired':
                              setSelectedGoal('review'); // Easier cognitive load
                              setSelectedDuration(15);   // Shorter duration
                              break;
                            case 'stressed':
                              setSelectedGoal('explore'); // Low pressure
                              setSelectedDuration(15);    // Quick win
                              break;
                          }
                        }}
                        title={mood.description}
                      >
                        <div className={styles.moodIconWrapper} style={{ color: moodColor }}>
                          <MoodIcon size={24} />
                        </div>
                        <span className={styles.moodLabel}>{mood.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recommendation */}
              {recommendation && (
                <div className={styles.recommendation}>
                  <Sparkles className={styles.recommendIcon} size={18} />
                  <div className={styles.recommendContent}>
                    <span className={styles.recommendLabel}>Recommended for you:</span>
                    <span className={styles.recommendAction}>{recommendation.action}</span>
                    <span className={styles.recommendTime}>~{recommendation.estimatedMinutes} min</span>
                  </div>
                  <button
                    className={styles.recommendButton}
                    onClick={() => {
                      setSelectedGoal('learn-new');
                      setSelectedDuration(recommendation.estimatedMinutes);
                      handleNext();
                    }}
                  >
                    Use
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* Time Selection */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Clock size={18} />
                  <h3>How much time do you have?</h3>
                </div>
                <div className={styles.durationGrid}>
                  {DURATION_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      className={`${styles.durationButton} ${!showCustom && selectedDuration === option.minutes ? styles.selected : ''
                        }`}
                      onClick={() => handleDurationSelect(option.minutes)}
                    >
                      {option.label}
                    </button>
                  ))}
                  <button
                    className={`${styles.durationButton} ${showCustom ? styles.selected : ''}`}
                    onClick={() => setShowCustom(true)}
                  >
                    Custom
                  </button>
                </div>

                <AnimatePresence>
                  {showCustom && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={styles.customInput}
                    >
                      <input
                        type="number"
                        min="5"
                        max="180"
                        placeholder="Minutes"
                        value={customDuration}
                        onChange={e => setCustomDuration(e.target.value)}
                        autoFocus
                      />
                      <span>minutes</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Goal Selection */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Target size={18} />
                  <h3>What's your goal?</h3>
                </div>
                <div className={styles.goalGrid}>
                  {GOAL_OPTIONS.map(option => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        className={`${styles.goalButton} ${selectedGoal === option.value ? styles.selected : ''
                          }`}
                        onClick={() => setSelectedGoal(option.value)}
                        style={{ '--goal-color': option.color } as React.CSSProperties}
                      >
                        <Icon size={24} className={styles.goalIcon} />
                        <span className={styles.goalLabel}>{option.label}</span>
                        <span className={styles.goalDescription}>{option.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Next Button */}
              <button className={styles.startButton} onClick={handleNext}>
                Prepare Engine
                <ChevronRight size={20} />
              </button>
            </motion.div>
          ) : (
            <GuidedPrimer
              subjectName={subjectName}
              duration={showCustom ? parseInt(customDuration) || 30 : selectedDuration}
              mood={selectedMood}
              onComplete={(data) => {
                onStart(selectedGoal, showCustom ? parseInt(customDuration) || 30 : selectedDuration, data);
              }}
              onBack={() => setStep('setup')}
            />
          )}
        </AnimatePresence>
      </motion.div >
    </div >
  );
}

export default SessionStartModal;
