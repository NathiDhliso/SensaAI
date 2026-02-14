import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 ChevronRight, Brain, Sparkles, ArrowLeft,
 Zap, BatteryLow, Activity, AlertCircle,
 Clock, Timer
} from 'lucide-react';
import type { StudyGoal, SessionRecommendation } from '@/shared/types/learning';
import { MOOD_OPTIONS, type Mood } from '@/features/ai-coach';
import { usePersonalizationStore } from '@/store/personalization-store';
import { MOOD_COLORS } from '@/shared/constants/theme-colors';
import { useTreeNarrative } from '@/shared/hooks/useTreeNarrative';
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
export const MOOD_GOAL_MAP: Record<Mood, { goal: StudyGoal; duration: number; storeMood: 'pumped' | 'good' | 'okay' | 'struggling' | 'tired' }> = {
 energized: { goal: 'velocity', duration: 45, storeMood: 'pumped' },
 neutral: { goal: 'learn-new', duration: 30, storeMood: 'good' },
 tired: { goal: 'review', duration: 15, storeMood: 'tired' },
 stressed: { goal: 'explore', duration: 15, storeMood: 'struggling' }
};
export function SessionStartModal({
 subjectName,
 totalConcepts,
 completedConcepts,
 recommendation,
 onStart,
 onBack
}: SessionStartModalProps) {
 const [step, setStep] = useState<'setup' | 'prime'>('setup');
 const [selectedMood, setSelectedMood] = useState<Mood>('neutral');
 const { setLastSessionMood } = usePersonalizationStore();
 const narrative = useTreeNarrative();
 const progress = useMemo(() => {
 return Math.round((completedConcepts / totalConcepts) * 100);
 }, [completedConcepts, totalConcepts]);
 const selectedGoal = MOOD_GOAL_MAP[selectedMood].goal;
 const selectedDuration = MOOD_GOAL_MAP[selectedMood].duration;
 const handleNext = () => {
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
 <h2>{step === 'setup' ? (narrative.isActive ? 'Tend Your Tree' : 'Start Session') : (narrative.isActive ? 'Set Your Intention' : 'Step 1: The Why')}</h2>
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
 {narrative.isActive
 ? `${narrative.progress(completedConcepts, totalConcepts).label} — ${completedConcepts} of ${totalConcepts} concepts`
 : `${completedConcepts} of ${totalConcepts} concepts (${progress}%)`
 }
 </span>
 </div>
 {/* Mood Selection */}
 <div className={styles.moodSection}>
 <div className={styles.moodHeader}>
 <Sparkles size={18} />
 <h3>How are you feeling?</h3>
 </div>
 <div className={styles.moodGrid}>
 {MOOD_OPTIONS.map(mood => {
 const MoodIcon = {
 energized: Zap,
 neutral: Activity,
 tired: BatteryLow,
 stressed: AlertCircle
 }[mood.id] || Activity;
 const moodColor = MOOD_COLORS[mood.id as keyof typeof MOOD_COLORS] || 'currentColor';
 const isActive = selectedMood === mood.id;
 const curatedInfo = MOOD_GOAL_MAP[mood.id];
 return (
 <button
 key={mood.id}
 className={`${styles.moodCard} ${isActive ? styles.moodCardActive : ''}`}
 onClick={() => setSelectedMood(mood.id)}
 >
 <div className={styles.moodIconWrapper} style={{ color: moodColor }}>
 <MoodIcon size={28} />
 </div>
 <span className={styles.moodLabel}>{mood.label}</span>
 <span className={styles.moodDesc}>{mood.description}</span>
 {isActive && (
 <motion.div
 className={styles.moodMeta}
 initial={{ opacity: 0, y: 4 }}
 animate={{ opacity: 1, y: 0 }}
 >
 <span className={styles.moodMetaItem}>
 <Timer size={12} />
 {curatedInfo.duration} min
 </span>
 </motion.div>
 )}
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
 onClick={handleNext}
 >
 Use
 <ChevronRight size={16} />
 </button>
 </div>
 )}
 {/* Next Button */}
 <button className={styles.startButton} onClick={handleNext}>
 <span>{narrative.isActive ? 'Begin Growth' : 'Begin Session'}</span>
 <span className={styles.startMeta}>
 <Clock size={14} />
 {selectedDuration} min
 </span>
 <ChevronRight size={20} />
 </button>
 </motion.div>
 ) : (
 <GuidedPrimer
 subjectName={subjectName}
 duration={selectedDuration}
 mood={selectedMood}
 onComplete={(data) => {
 onStart(selectedGoal, selectedDuration, data);
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
