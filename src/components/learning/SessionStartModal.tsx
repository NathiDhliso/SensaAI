/**
 * SessionStartModal Component
 * 
 * Step 1: The Why (Establish Intent)
 * Modal for starting a study session with goal and time selection.
 * 
 * @see SILVER_BULLET_LEARNING_ARCHITECTURE.md Step 1
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Target, BookOpen, RefreshCw, Compass,
  ChevronRight, Brain, Sparkles, Heart, ArrowLeft
} from 'lucide-react';
import type { StudyGoal, SessionDuration, SessionRecommendation } from '@/lib/types/learning';
import { MOOD_OPTIONS, type Mood } from '@/lib/ai/coach';
import { usePersonalizationStore } from '@/store/personalization-store';
import GuidedPrimer from './GuidedPrimer';
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

              {/* Mood Selection */}
              <div className={styles.moodSection}>
                <div className={styles.moodHeader}>
                  <Heart size={18} />
                  <h3>How are you feeling right now?</h3>
                </div>
                <div className={styles.moodGrid}>
                  {MOOD_OPTIONS.map(mood => (
                    <button
                      key={mood.id}
                      className={`${styles.moodCard} ${selectedMood === mood.id ? styles.moodCardActive : ''}`}
                      onClick={() => setSelectedMood(mood.id)}
                      title={mood.description}
                    >
                      <span className={styles.moodEmoji}>{mood.emoji}</span>
                      <span className={styles.moodLabel}>{mood.label}</span>
                    </button>
                  ))}
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
      </motion.div>
    </div>
  );
}

export default SessionStartModal;
