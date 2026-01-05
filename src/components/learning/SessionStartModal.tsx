/**
 * SessionStartModal Component
 * 
 * Phase 5: Single-Page Learning Experience
 * Modal for starting a study session with goal and time selection.
 * 
 * @see SILVER_BULLET_LEARNING_ARCHITECTURE.md Phase 5
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Clock, Target, BookOpen, RefreshCw, Zap, Compass,
  ChevronRight, Brain, Sparkles
} from 'lucide-react';
import type { StudyGoal, SessionDuration, SessionRecommendation } from '@/lib/types/learning';
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
  /** Called when modal is closed */
  onClose: () => void;
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
      value: 'sprint',
      label: 'Sprint Practice',
      description: 'Speed drills for automaticity',
      icon: Zap,
      color: 'var(--color-warning)',
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
  onClose,
}: SessionStartModalProps) {
  const [step, setStep] = useState<'setup' | 'prime'>('setup');
  const [selectedGoal, setSelectedGoal] = useState<StudyGoal>('learn-new');
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [customDuration, setCustomDuration] = useState<string>('');
  const [showCustom, setShowCustom] = useState(false);

  // Prime State
  const [reason, setReason] = useState('');
  const [action, setAction] = useState('');
  const [reward, setReward] = useState('');

  const progress = useMemo(() => {
    return Math.round((completedConcepts / totalConcepts) * 100);
  }, [completedConcepts, totalConcepts]);

  const handleDurationSelect = (minutes: number) => {
    setSelectedDuration(minutes);
    setShowCustom(false);
  };

  const handleNext = () => {
    // Auto-fill action based on selected goal/duration if empty
    if (!action) {
      if (selectedGoal === 'learn-new') setAction(`I will complete the 'Prepare' phase for ${Math.floor(selectedDuration / 15)} new concepts`);
      else if (selectedGoal === 'review') setAction(`I will review my concept map for 20 minutes`);
      else if (selectedGoal === 'sprint') setAction(`I will complete 3 confusion drills`);
    }
    setStep('prime');
  };

  const handleStart = () => {
    const duration = showCustom ? parseInt(customDuration) || 30 : selectedDuration;
    // Pass primer data as the 3rd argument (will need to update onStart signature or handle in parent)
    onStart(selectedGoal, duration, { reason, action, reward });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Brain className={styles.headerIcon} size={28} />
            <div>
              <h2>{step === 'setup' ? 'Start Study Session' : 'Phase 0: Prime the Engine'}</h2>
              <p className={styles.subjectName}>{subjectName}</p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
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
            <motion.div
              key="prime"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className={styles.primeSection}
            >
              <div className={styles.primeInfo}>
                <Zap size={24} className={styles.primeIcon} />
                <p>Before we start, give your brain a roadmap. This reduces anxiety and decision fatigue.</p>
              </div>

              <div className={styles.inputGroup}>
                <label>
                  <span>Your Reason</span>
                  <span className={styles.labelHint}>Why does this matter to YOU right now?</span>
                </label>
                <input
                  type="text"
                  placeholder="E.g., I want to understand how my body creates energy..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  autoFocus
                />
              </div>

              <div className={styles.inputGroup}>
                <label>
                  <span>Your Action</span>
                  <span className={styles.labelHint}>What specific task will you control?</span>
                </label>
                <input
                  type="text"
                  placeholder="E.g., I will build one concept map..."
                  value={action}
                  onChange={e => setAction(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>
                  <span>Your Reward</span>
                  <span className={styles.labelHint}>What happens when you finish?</span>
                </label>
                <input
                  type="text"
                  placeholder="E.g., A fresh cup of coffee..."
                  value={reward}
                  onChange={e => setReward(e.target.value)}
                />
              </div>

              <div className={styles.buttonGroup}>
                <button
                  className={styles.backButton}
                  onClick={() => setStep('setup')}
                >
                  Back
                </button>
                <button
                  className={styles.startButton}
                  onClick={handleStart}
                  disabled={!reason || !action || !reward}
                >
                  Start Phase 1: Scout
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default SessionStartModal;
