/**
 * SensaAI Diagnostic Launch System
 * 
 * Provides diagnostic assessment capability before starting the learning journey.
 * Implements diagnostic-first learning flow as per Learning Velocity Engine spec.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, CheckCircle2, Clock, Play, Target, Zap, ChevronRight, RotateCcw, ArrowLeft } from 'lucide-react';
import type { SensaAILearningConcept, DiagnosticQuestion } from '@/features/content-generation/parsers/transformer';
import { getTrunkConcepts } from '@/features/content-generation/parsers/ai-integration';
import { UI_TIMINGS, VELOCITY_CONFIG } from '@/shared/constants/ui-constants';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import styles from './DiagnosticLaunchSystem.module.css';
// ============================================================================
// TYPES
// ============================================================================
export interface DiagnosticLaunchSystemProps {
 /** SensaAI enhanced concepts with diagnostic metadata */
 concepts: SensaAILearningConcept[];
 /** Domain name for context */
 domain: string;
 /** Whether diagnostic data is ready */
 diagnosticReady: boolean;
 /** Callback when user wants to start learning (skipping diagnostic) */
 onStartLearning: () => void;
 /** Callback when diagnostic assessment completes */
 onDiagnosticComplete: (results: DiagnosticResults) => void;
 /** Optional callback to exit/go back */
 onBack?: () => void;
}
export interface DiagnosticResults {
 /** Correctly answered concepts */
 knownConcepts: string[];
 /** Incorrectly answered concepts - need focused learning */
 knowledgeGaps: string[];
 /** Total time taken in seconds */
 totalTimeSeconds: number;
 /** Confidence scores per concept */
 confidenceScores: Record<string, number>;
 /** Whether to skip to advanced content */
 canSkipTrunk: boolean;
}
interface QuestionWithMeta {
 question: DiagnosticQuestion;
 conceptId: string;
 conceptName: string;
}
// ============================================================================
// DIAGNOSTIC CONCEPT SELECTOR
// ============================================================================
/**
 * Select foundation concepts for diagnostic assessment using ranking criteria:
 * - Prerequisite weight (40%): How many concepts depend on this
 * - Frequency weight (30%): How often concept is used
 * - Abstraction level (30%): Prefer concrete over abstract
 */
function selectDiagnosticConcepts(
 concepts: SensaAILearningConcept[],
 maxConcepts: number = VELOCITY_CONFIG.DIAGNOSTIC.CONCEPTS_TO_TEST
): SensaAILearningConcept[] {
 // Use the integration utility which implements the ranking logic
 return getTrunkConcepts(concepts).slice(0, maxConcepts);
}
/**
 * Build assessment questions from selected concepts
 * Returns 1-2 questions per concept, prioritizing variety
 */
function buildAssessmentQuestions(
 selectedConcepts: SensaAILearningConcept[]
): QuestionWithMeta[] {
 const questions: QuestionWithMeta[] = [];
 for (const concept of selectedConcepts) {
 // Take up to 2 questions per concept
 const conceptQuestions = concept.diagnosticQuestions.slice(0, VELOCITY_CONFIG.DIAGNOSTIC.QUESTIONS_PER_CONCEPT);
 for (const question of conceptQuestions) {
 questions.push({
 question,
 conceptId: concept.id,
 conceptName: concept.name
 });
 }
 }
 // Shuffle to avoid predictable order
 return questions.sort(() => Math.random() - 0.5);
}
// ============================================================================
// QUICK KNOWLEDGE CHECK COMPONENT
// ============================================================================
interface QuickKnowledgeCheckProps {
 question: QuestionWithMeta;
 onAnswer: (correct: boolean, confidence: number, timeMs: number) => void;
 questionNumber: number;
 totalQuestions: number;
}
function QuickKnowledgeCheck({
 question,
 onAnswer,
 questionNumber,
 totalQuestions
}: QuickKnowledgeCheckProps) {
 const { isScholarly } = useVisualTheme();
 const [selectedOption, setSelectedOption] = useState<number | null>(null);
 const [textAnswer, setTextAnswer] = useState('');
 const [confidence, setConfidence] = useState(3); // 1-5 scale
 const [startTime] = useState(() => Date.now());
 const [showFeedback, setShowFeedback] = useState(false);
 const [wasCorrect, setWasCorrect] = useState(false);
 const handleSubmit = useCallback(() => {
 const timeMs = Date.now() - startTime;
 let correct = false;
 if (question.question.type === 'multiple-choice') {
 correct = selectedOption === question.question.correctAnswer;
 } else if (question.question.type === 'true-false') {
 correct = selectedOption === question.question.correctAnswer;
 } else {
 // For short-answer, do basic keyword matching
 const answer = textAnswer.toLowerCase();
 const expected = String(question.question.correctAnswer).toLowerCase();
 const keywords = expected.split(' ').filter(w => w.length > 3);
 const matchCount = keywords.filter(kw => answer.includes(kw)).length;
 correct = matchCount >= keywords.length * 0.5;
 }
 setWasCorrect(correct);
 setShowFeedback(true);
 // Show feedback briefly then proceed
 setTimeout(() => {
 onAnswer(correct, confidence, timeMs);
 }, UI_TIMINGS.TOAST_SHORT);
 }, [selectedOption, textAnswer, confidence, startTime, question, onAnswer]);
 const canSubmit = useMemo(() => {
 if (question.question.type === 'short-answer') {
 return textAnswer.trim().length >= VELOCITY_CONFIG.DIAGNOSTIC.MIN_ANSWER_CHARS; // Minimum 10 characters
 }
 return selectedOption !== null;
 }, [question.question.type, textAnswer, selectedOption]);
 // Handle Enter key press
 const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
 if (e.key === 'Enter' && canSubmit && !showFeedback) {
 e.preventDefault();
 handleSubmit();
 }
 }, [canSubmit, showFeedback, handleSubmit]);
 // Auto-submit for true/false questions
 const handleTrueFalseSelect = useCallback((value: number) => {
 setSelectedOption(value);
 // Auto-submit after a brief delay to show selection
 setTimeout(() => {
 const timeMs = Date.now() - startTime;
 const correct = value === question.question.correctAnswer;
 setWasCorrect(correct);
 setShowFeedback(true);
 setTimeout(() => {
 onAnswer(correct, confidence, timeMs);
 }, UI_TIMINGS.TOAST_SHORT);
 }, 300);
 }, [startTime, question, confidence, onAnswer]);
 return (
 <motion.div
 className={styles.questionCard}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 onKeyDown={handleKeyDown}
 >
 {/* Progress indicator */}
 <div className={styles.progressBar}>
 <div
 className={styles.progressFill}
 style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
 />
 </div>
 <div className={styles.questionHeader}>
 <span className={styles.questionNumber}>
 Question {questionNumber} of {totalQuestions}
 </span>
 <span className={styles.conceptBadge}>
 {question.conceptName}
 </span>
 </div>
 <h3 className={styles.questionText}>
 {question.question.question}
 </h3>
 {/* Answer options based on question type */}
 <div className={styles.answerSection}>
 {question.question.type === 'multiple-choice' && question.question.options && (
 <div className={styles.optionsList}>
 {question.question.options.map((option, idx) => (
 <button
 key={idx}
 className={`${styles.optionButton} ${selectedOption === idx ? styles.optionSelected : ''}`}
 onClick={() => setSelectedOption(idx)}
 disabled={showFeedback}
 >
 <span className={styles.optionLetter}>
 {String.fromCharCode(65 + idx)}
 </span>
 {option}
 </button>
 ))}
 </div>
 )}
 {question.question.type === 'true-false' && (
 <div className={styles.trueFalseOptions}>
 <button
 className={`${styles.tfButton} ${selectedOption === 1 ? styles.optionSelected : ''}`}
 onClick={() => handleTrueFalseSelect(1)}
 disabled={showFeedback}
 >
 <CheckCircle2 size={20} />
 True
 </button>
 <button
 className={`${styles.tfButton} ${selectedOption === 0 ? styles.optionSelected : ''}`}
 onClick={() => handleTrueFalseSelect(0)}
 disabled={showFeedback}
 >
 <RotateCcw size={20} />
 False
 </button>
 </div>
 )}
 {question.question.type === 'short-answer' && (
 <textarea
 className={styles.shortAnswerInput}
 value={textAnswer}
 onChange={(e) => setTextAnswer(e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder="Type your answer here (minimum 10 characters)..."
 rows={3}
 disabled={showFeedback}
 />
 )}
 </div>
 {/* Confidence slider */}
 <div className={styles.confidenceSection}>
 <label className={styles.confidenceLabel}>
 How confident are you?
 </label>
 <div className={styles.confidenceSlider}>
 {[1, 2, 3, 4, 5].map((level) => (
 <button
 key={level}
 className={`${styles.confidenceButton} ${confidence === level ? styles.confidenceActive : ''}`}
 onClick={() => setConfidence(level)}
 >
 {isScholarly ? level : (
 <>
 {level === 1 && ''}
 {level === 2 && ''}
 {level === 3 && ''}
 {level === 4 && ''}
 {level === 5 && ''}
 </>
 )}
 </button>
 ))}
 </div>
 </div>
 {/* Feedback overlay */}
 <AnimatePresence>
 {showFeedback && (
 <motion.div
 className={`${styles.feedbackOverlay} ${wasCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect}`}
 initial={{ opacity: 0, scale: 0.8 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0 }}
 >
 {wasCorrect ? (
 <>
 <CheckCircle2 size={48} />
 <span>Correct!</span>
 </>
 ) : (
 <>
 <Target size={48} />
 <span>Let's learn this!</span>
 </>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 {/* Submit button - hidden for true/false since it auto-submits */}
 {question.question.type !== 'true-false' && (
 <button
 className={styles.submitButton}
 onClick={handleSubmit}
 disabled={!canSubmit || showFeedback}
 >
 <span>Submit Answer</span>
 <ChevronRight size={20} />
 </button>
 )}
 </motion.div>
 );
}
// ============================================================================
// DIAGNOSTIC LAUNCH SYSTEM COMPONENT
// ============================================================================
type DiagnosticPhase = 'intro' | 'assessment' | 'results';
export function DiagnosticLaunchSystem({
 concepts,
 domain,
 diagnosticReady,
 onStartLearning,
 onDiagnosticComplete,
 onBack
}: DiagnosticLaunchSystemProps) {
 const [phase, setPhase] = useState<DiagnosticPhase>('intro');
 const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
 const [answers, setAnswers] = useState<Array<{
 conceptId: string;
 correct: boolean;
 confidence: number;
 timeMs: number;
 }>>([]);
 // Select concepts and build questions
 const selectedConcepts = useMemo(() =>
 selectDiagnosticConcepts(concepts), [concepts]
 );
 const questions = useMemo(() =>
 buildAssessmentQuestions(selectedConcepts), [selectedConcepts]
 );
 const estimatedTime = useMemo(() =>
 questions.reduce((sum, q) => sum + q.question.expectedTime, 0) / 60,
 [questions]
 );
 const handleStartDiagnostic = () => {
 setPhase('assessment');
 setCurrentQuestionIndex(0);
 setAnswers([]);
 };
 const handleAnswer = useCallback((correct: boolean, confidence: number, timeMs: number) => {
 const currentQuestion = questions[currentQuestionIndex];
 setAnswers(prev => [...prev, {
 conceptId: currentQuestion.conceptId,
 correct,
 confidence,
 timeMs
 }]);
 if (currentQuestionIndex < questions.length - 1) {
 setCurrentQuestionIndex(prev => prev + 1);
 } else {
 // Assessment complete, calculate results
 const allAnswers = [...answers, { conceptId: currentQuestion.conceptId, correct, confidence, timeMs }];
 const knownConcepts = [...new Set(
 allAnswers.filter(a => a.correct).map(a => a.conceptId)
 )];
 const knowledgeGaps = [...new Set(
 allAnswers.filter(a => !a.correct).map(a => a.conceptId)
 )];
 const totalTimeSeconds = allAnswers.reduce((sum, a) => sum + a.timeMs, 0) / 1000;
 const confidenceScores: Record<string, number> = {};
 allAnswers.forEach(a => {
 // Average confidence per concept
 if (!confidenceScores[a.conceptId]) {
 confidenceScores[a.conceptId] = a.confidence;
 } else {
 confidenceScores[a.conceptId] = (confidenceScores[a.conceptId] + a.confidence) / 2;
 }
 });
 const results: DiagnosticResults = {
 knownConcepts,
 knowledgeGaps,
 totalTimeSeconds,
 confidenceScores,
 canSkipTrunk: knownConcepts.length >= selectedConcepts.length * VELOCITY_CONFIG.DIAGNOSTIC.PASS_THRESHOLD, // 70% threshold
 };
 setPhase('results');
 onDiagnosticComplete(results);
 }
 }, [currentQuestionIndex, questions, answers, selectedConcepts.length, onDiagnosticComplete]);
 // ─── INTRO PHASE ────────────────────────────────────────────────────────────
 if (phase === 'intro') {
 return (
 <div className={styles.container}>
 <motion.div
 className={styles.introCard}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 >
 {onBack && (
 <button className={styles.backButton} onClick={onBack} title="Go back">
 <ArrowLeft size={20} />
 </button>
 )}
 <div className={styles.iconContainer}>
 <Brain size={48} />
 </div>
 <h2 className={styles.title}>Quick Knowledge Check</h2>
 <p className={styles.subtitle}>
 {domain}
 </p>
 {diagnosticReady ? (
 <>
 <div className={styles.statsRow}>
 <div className={styles.statItem}>
 <Target size={20} />
 <span>{selectedConcepts.length} concepts</span>
 </div>
 <div className={styles.statItem}>
 <Clock size={20} />
 <span>~{Math.ceil(estimatedTime)} min</span>
 </div>
 <div className={styles.statItem}>
 <Zap size={20} />
 <span>{questions.length} questions</span>
 </div>
 </div>
 <div className={styles.buttonGroup}>
 <button
 className={styles.primaryButton}
 onClick={handleStartDiagnostic}
 >
 <Play size={20} />
 Start Diagnostic
 </button>
 <button
 className={styles.secondaryButton}
 onClick={onStartLearning}
 >
 Skip & Start Learning
 </button>
 </div>
 </>
 ) : (
 <>
 <p className={styles.notReadyMessage}>
 Diagnostic assessment is not available yet.
 The content needs at least 5 foundation concepts with diagnostic questions.
 </p>
 <button
 className={styles.primaryButton}
 onClick={onStartLearning}
 >
 <Play size={20} />
 Start Learning
 </button>
 </>
 )}
 </motion.div>
 </div>
 );
 }
 // ─── ASSESSMENT PHASE ───────────────────────────────────────────────────────
 if (phase === 'assessment' && questions[currentQuestionIndex]) {
 return (
 <div className={styles.container}>
 <AnimatePresence mode="wait">
 <QuickKnowledgeCheck
 key={currentQuestionIndex}
 question={questions[currentQuestionIndex]}
 onAnswer={handleAnswer}
 questionNumber={currentQuestionIndex + 1}
 totalQuestions={questions.length}
 />
 </AnimatePresence>
 </div>
 );
 }
 // ─── RESULTS PHASE ──────────────────────────────────────────────────────────
 if (phase === 'results') {
 const correctCount = answers.filter(a => a.correct).length;
 const totalTime = answers.reduce((sum, a) => sum + a.timeMs, 0) / 1000;
 const score = Math.round((correctCount / answers.length) * 100);
 return (
 <div className={styles.container}>
 <motion.div
 className={styles.resultsCard}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 >
 <div className={styles.scoreCircle}>
 <span className={styles.scoreValue}>{score}%</span>
 <span className={styles.scoreLabel}>Score</span>
 </div>
 <h2 className={styles.resultsTitle}>
 {score >= 70 ? 'Great Foundation!' : 'Let\'s Build Your Skills!'}
 </h2>
 <div className={styles.resultsStats}>
 <div className={styles.resultStat}>
 <CheckCircle2 size={20} className={styles.correctIcon} />
 <span>{correctCount} correct</span>
 </div>
 <div className={styles.resultStat}>
 <Clock size={20} />
 <span>{Math.round(totalTime)}s total</span>
 </div>
 </div>
 <p className={styles.resultsMessage}>
 {score >= 70
 ? 'You have a solid foundation! We\'ll focus on advanced concepts and filling any gaps.'
 : 'No worries! Your personalized learning path will focus on the concepts you need to master.'
 }
 </p>
 {(() => {
 const knownIds = new Set(answers.filter(a => a.correct).map(a => a.conceptId));
 const gapIds = new Set(answers.filter(a => !a.correct).map(a => a.conceptId));
 const knownNames = selectedConcepts.filter(c => knownIds.has(c.id)).map(c => c.name);
 const gapNames = selectedConcepts.filter(c => gapIds.has(c.id)).map(c => c.name);
 return (
 <div className={styles.gapBreakdown}>
 {knownNames.length > 0 && (
 <div className={styles.gapSection}>
 <div className={styles.gapSectionHeader}>
 <CheckCircle2 size={14} className={styles.correctIcon} />
 <span>Known ({knownNames.length})</span>
 </div>
 <div className={styles.gapChips}>
 {knownNames.map(name => (
 <span key={name} className={styles.gapChipKnown}>{name}</span>
 ))}
 </div>
 </div>
 )}
 {gapNames.length > 0 && (
 <div className={styles.gapSection}>
 <div className={styles.gapSectionHeader}>
 <Target size={14} className={styles.gapIcon} />
 <span>Focus Areas ({gapNames.length})</span>
 </div>
 <div className={styles.gapChips}>
 {gapNames.map(name => (
 <span key={name} className={styles.gapChipGap}>{name}</span>
 ))}
 </div>
 </div>
 )}
 </div>
 );
 })()}
 <button
 className={styles.primaryButton}
 onClick={onStartLearning}
 >
 <Play size={20} />
 Start Personalized Learning
 </button>
 </motion.div>
 </div>
 );
 }
 return null;
}
export default DiagnosticLaunchSystem;
