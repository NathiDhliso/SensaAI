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
  onStart: (goal: StudyGoal, duration: number) => void;
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
  const [selectedGoal, setSelectedGoal] = useState<StudyGoal>('learn-new');
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [customDuration, setCustomDuration] = useState<string>('');
  const [showCustom, setShowCustom] = useState(false);
  
  const progress = useMemo(() => {
    return Math.round((completedConcepts / totalConcepts) * 100);
  }, [completedConcepts, totalConcepts]);
  
  const handleStart = () => {
    const duration = showCustom ? parseInt(customDuration) || 30 : selectedDuration;
    onStart(selectedGoal, duration);
  };
  
  const handleDurationSelect = (minutes: number) => {
    setSelectedDuration(minutes);
    setShowCustom(false);
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
              <h2>Start Study Session</h2>
              <p className={styles.subjectName}>{subjectName}</p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
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
                onStart('learn-new', recommendation.estimatedMinutes);
              }}
            >
              Start
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
                className={`${styles.durationButton} ${
                  !showCustom && selectedDuration === option.minutes ? styles.selected : ''
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
                  className={`${styles.goalButton} ${
                    selectedGoal === option.value ? styles.selected : ''
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
        
        {/* Start Button */}
        <button className={styles.startButton} onClick={handleStart}>
          Start Session
          <ChevronRight size={20} />
        </button>
      </motion.div>
    </div>
  );
}

export default SessionStartModal;
