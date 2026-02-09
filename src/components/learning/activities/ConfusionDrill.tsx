/**
 * ConfusionDrill Component
 * 
 * A focused drill that helps learners distinguish between
 * commonly confused concepts through A/B scenario questions.
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { useLearningStore } from '@/store/learning-store';
import { usePauseGlobalTimer } from '@/shared/hooks/usePauseGlobalTimer';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import { useMetaphorContent } from '@/shared/hooks/useMetaphorContent';
import { calculateConfusionDrillResult } from '@/features/learning-session/activities/confusion-generator';
import type { ConfusionPair, ConfusionQuestion, ConfusionAnswer, ConfusionDrillResult } from '@/features/learning-session/activities/confusion-generator';
import styles from './ConfusionDrill.module.css';
const TIME_PER_QUESTION_MS = UI_TIMINGS.CONFUSION_QUESTION_MS;
interface ConfusionDrillProps {
 pair: ConfusionPair;
 questions: ConfusionQuestion[];
 onComplete: (result: ConfusionDrillResult) => void;
 onClose: () => void;
}
export default function ConfusionDrill({
 pair,
 questions,
 onComplete,
 onClose
}: ConfusionDrillProps) {
 const { recordInteraction } = useLearningStore();
 const { isScholarly } = useVisualTheme();
 const { analogicalModel: analogy1 } = useMetaphorContent(pair.concept1);
 const { analogicalModel: analogy2 } = useMetaphorContent(pair.concept2);
 // Pause global focus session timer during drill
 usePauseGlobalTimer();
 const [currentIndex, setCurrentIndex] = useState(0);
 const [answers, setAnswers] = useState<ConfusionAnswer[]>([]);
 const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);
 const [showFeedback, setShowFeedback] = useState(false);
 const [isComplete, setIsComplete] = useState(false);
 const [timeRemaining, setTimeRemaining] = useState<number>(TIME_PER_QUESTION_MS);
 const [questionStartTime, setQuestionStartTime] = useState(Date.now());
 const currentQuestion = questions[currentIndex];
 // Timer countdown
 useEffect(() => {
 if (showFeedback || isComplete) return;
 const interval = setInterval(() => {
 setTimeRemaining(prev => {
 if (prev <= 100) {
 // Timeout - record as incorrect
 handleAnswer(null);
 return TIME_PER_QUESTION_MS;
 }
 return prev - 100;
 });
 }, 100);
 return () => clearInterval(interval);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [showFeedback, isComplete, currentIndex]);
 // Keyboard shortcuts
 useEffect(() => {
 if (showFeedback || isComplete) return;
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === 'a' || e.key === 'A' || e.key === '1') {
 handleAnswer('A');
 } else if (e.key === 'b' || e.key === 'B' || e.key === '2') {
 handleAnswer('B');
 }
 };
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [showFeedback, isComplete, currentIndex]);
 const handleAnswer = useCallback((choice: 'A' | 'B' | null) => {
 const responseTimeMs = Date.now() - questionStartTime;
 const correct = choice === currentQuestion.correctChoice;
 const answer: ConfusionAnswer = {
 questionId: currentQuestion.id,
 selectedChoice: choice,
 correct,
 responseTimeMs
 };
 setSelectedChoice(choice);
 setShowFeedback(true);
 setAnswers(prev => [...prev, answer]);
 // Record for cognitive load tracking
 recordInteraction(correct, responseTimeMs);
 // Auto-advance after feedback
 setTimeout(() => {
 if (currentIndex < questions.length - 1) {
 setCurrentIndex(prev => prev + 1);
 setSelectedChoice(null);
 setShowFeedback(false);
 setTimeRemaining(TIME_PER_QUESTION_MS);
 setQuestionStartTime(Date.now());
 } else {
 // Complete drill
 const allAnswers = [...answers, answer];
 const result = calculateConfusionDrillResult(pair, questions, allAnswers);
 setIsComplete(true);
 onComplete(result);
 }
 }, UI_TIMINGS.TOAST_SHORT);
 }, [currentQuestion, currentIndex, questions, pair, answers, questionStartTime, recordInteraction, onComplete]);
 // Timer percentage
 const timerPercent = (timeRemaining / TIME_PER_QUESTION_MS) * 100;
 const timerClass = timerPercent > 50 ? '' : timerPercent > 25 ? styles.warning : styles.critical;
 // Result screen
 if (isComplete) {
 const correctCount = answers.filter(a => a.correct).length;
 const mastered = (correctCount / questions.length) >= 0.8;
 return (
 <div className={styles.overlay}>
 <motion.div
 className={styles.modal}
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 >
 <div className={styles.result}>
 <h2 className={styles.resultTitle}>
 {mastered ? 'Distinction Mastered!' : 'Keep Practicing'}
 </h2>
 <p className={styles.resultScore}>
 {correctCount}/{questions.length} correct
 </p>
 <button className={styles.resultButton} onClick={onClose}>
 <Check size={20} />
 Continue
 </button>
 </div>
 </motion.div>
 </div>
 );
 }
 return (
 <div className={styles.overlay}>
 <motion.div
 className={styles.modal}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3 }}
 >
 {/* Timer bar */}
 <div className={styles.timerBar}>
 <div
 className={`${styles.timerFill} ${timerClass}`}
 style={{ width: `${timerPercent}%` }}
 />
 </div>
 {/* Header */}
 <div className={styles.header}>
 <div className={styles.headerTitle}>
 {!isScholarly && <span className={styles.headerIcon}></span>}
 <h3 className={styles.title}>{isScholarly ? 'Discrimination Drill' : 'Confusion Drill'}</h3>
 </div>
 <span className={styles.progress}>
 {currentIndex + 1}/{questions.length}
 </span>
 </div>
 {/* Concepts being compared */}
 <div className={styles.vsSection}>
 <span className={styles.conceptLabel}>{pair.concept1.name}</span>
 <span className={styles.vsText}>vs</span>
 <span className={styles.conceptLabel}>{pair.concept2.name}</span>
 </div>
 {/* Scenario */}
 <AnimatePresence mode="wait">
 <motion.div
 key={currentIndex}
 className={styles.scenario}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 >
 <p className={styles.scenarioText}>{currentQuestion.scenario}</p>
 </motion.div>
 </AnimatePresence>
 {/* Choice buttons */}
 <div className={styles.choices}>
 <button
 className={`${styles.choiceButton} 
 ${selectedChoice === 'A' ? styles.selected : ''} 
 ${showFeedback && currentQuestion.correctChoice === 'A' ? styles.correct : ''} 
 ${showFeedback && selectedChoice === 'A' && currentQuestion.correctChoice !== 'A' ? styles.incorrect : ''}`}
 onClick={() => handleAnswer('A')}
 disabled={showFeedback}
 >
 <span className={styles.choiceLetter}>A</span>
 <span className={styles.choiceName}>{currentQuestion.optionA}</span>
 <span className={styles.keyHint}>Press A or 1</span>
 </button>
 <button
 className={`${styles.choiceButton} 
 ${selectedChoice === 'B' ? styles.selected : ''} 
 ${showFeedback && currentQuestion.correctChoice === 'B' ? styles.correct : ''} 
 ${showFeedback && selectedChoice === 'B' && currentQuestion.correctChoice !== 'B' ? styles.incorrect : ''}`}
 onClick={() => handleAnswer('B')}
 disabled={showFeedback}
 >
 <span className={styles.choiceLetter}>B</span>
 <span className={styles.choiceName}>{currentQuestion.optionB}</span>
 <span className={styles.keyHint}>Press B or 2</span>
 </button>
 </div>
 {/* Feedback */}
 {showFeedback && (
 <motion.div
 className={styles.feedback}
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 >
 <p className={styles.feedbackText}>{currentQuestion.explanation}</p>
 {(analogy1 || analogy2) && (
 <div className={styles.feedbackAnalogies}>
 {analogy1 && <p><strong>{pair.concept1.name}:</strong> {analogy1}</p>}
 {analogy2 && <p><strong>{pair.concept2.name}:</strong> {analogy2}</p>}
 </div>
 )}
 </motion.div>
 )}
 </motion.div>
 </div>
 );
}