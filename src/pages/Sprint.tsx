/**
 * Sprint Page
 * 
 * The 15-minute Automaticity Sprint - tests pattern recognition
 * with binary yes/no questions under time pressure.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Check, X, ArrowLeft } from 'lucide-react';
import { useGenerationStore } from '@/store/generation-store';
import { useLearningStore } from '@/store/learning-store';
import { generateSprintQuestions, calculateSprintResult } from '@/lib/generation/sprint-generator';
import { UI_TIMINGS, SPRINT_CONFIG } from '@/constants/ui-constants';
import { formatTime, getTimerUrgency } from '@/lib/utils';
import type { SprintQuestion, SprintAnswer } from '@/lib/types/sprint';
import styles from './Sprint.module.css';

type SprintPhase = 'loading' | 'countdown' | 'active' | 'feedback' | 'complete';

export default function Sprint() {
    const navigate = useNavigate();
    const { bedrockConfig } = useGenerationStore();
    const { getConcepts, currentSession, setSprintResult } = useLearningStore();

    // Phase state - start with 'loading' instead of 'countdown'
    const [phase, setPhase] = useState<SprintPhase>('loading');
    const [countdown, setCountdown] = useState(3);

    // Quiz state
    const [questions, setQuestions] = useState<SprintQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<SprintAnswer[]>([]);
    const [lastAnswer, setLastAnswer] = useState<{ correct: boolean; explanation: string } | null>(null);

    // Timer state
    const [totalTimeRemaining, setTotalTimeRemaining] = useState<number>(SPRINT_CONFIG.TOTAL_TIME_MINUTES * 60);
    const [questionTimeRemaining, setQuestionTimeRemaining] = useState<number>(SPRINT_CONFIG.SECONDS_PER_QUESTION);
    const questionStartTime = useRef<number>(Date.now());
    const isGenerating = useRef<boolean>(false);

    // Error state
    const [error, setError] = useState<string | null>(null);

    const currentQuestion = questions[currentIndex];
    const concepts = getConcepts();
    const subject = currentSession?.metadata?.domain || 'General Knowledge';

    // Generate questions immediately on mount (loading phase)
    useEffect(() => {
        if (phase !== 'loading') return;
        if (isGenerating.current) return; // Prevent duplicate calls

        // Check prerequisites first
        if (!bedrockConfig) {
            console.error('Sprint: AWS credentials not configured');
            setError('AWS credentials not configured. Please set up your credentials in Settings.');
            return;
        }
        if (concepts.length === 0) {
            console.error('Sprint: No concepts loaded');
            setError('No concepts loaded. Complete the learning journey first.');
            return;
        }

        isGenerating.current = true;

        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Generation timed out. Please try again.')), UI_TIMINGS.GENERATION_TIMEOUT);
        });

        // Race between generation and timeout
        Promise.race([
            generateSprintQuestions(concepts, subject, bedrockConfig),
            timeoutPromise
        ])
            .then(generatedQuestions => {
                setQuestions(generatedQuestions);
                // When ready, transition to countdown
                setPhase('countdown');
            })
            .catch(err => {
                console.error('Sprint: Generation failed:', err);
                const errorMessage = err instanceof Error ? err.message : 'Failed to generate questions';
                setError(errorMessage);
            })
            .finally(() => {
                isGenerating.current = false;
            });
    }, [phase, bedrockConfig, concepts.length, subject]);

    // Countdown runs only after questions are ready
    useEffect(() => {
        if (phase !== 'countdown') return;

        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), UI_TIMINGS.ONE_SECOND);
            return () => clearTimeout(timer);
        }

        // Countdown finished - start the quiz immediately!
        setPhase('active');
        questionStartTime.current = Date.now();
    }, [phase, countdown]);

    // Handle answer
    const handleAnswer = useCallback((userAnswer: boolean | null) => {
        if (phase !== 'active' || !currentQuestion) return;

        const responseTimeMs = Date.now() - questionStartTime.current;
        const correct = userAnswer === currentQuestion.correctAnswer;

        const answer: SprintAnswer = {
            questionId: currentQuestion.id,
            userAnswer,
            correct,
            responseTimeMs,
        };

        const newAnswers = [...answers, answer];
        setAnswers(newAnswers);
        setLastAnswer({ correct, explanation: currentQuestion.explanation });
        setPhase('feedback');

        // Show feedback briefly, then advance
        setTimeout(() => {
            if (currentIndex < questions.length - 1) {
                setCurrentIndex(prev => prev + 1);
                setQuestionTimeRemaining(SPRINT_CONFIG.SECONDS_PER_QUESTION);
                questionStartTime.current = Date.now();
                setLastAnswer(null);
                setPhase('active');
            } else {
                finishSprint(newAnswers);
            }
        }, UI_TIMINGS.SPRINT_FEEDBACK_TIME);
    }, [phase, currentQuestion, currentIndex, questions.length, answers]);

    // Finish and show results
    const finishSprint = (finalAnswers: SprintAnswer[]) => {
        const result = calculateSprintResult(questions, finalAnswers);
        setSprintResult(result);
        setPhase('complete');

        // Navigate to results after brief delay
        setTimeout(() => {
            navigate('/study/current?tab=sprint');
        }, UI_TIMINGS.ONE_SECOND);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (phase !== 'active') return;

            if (e.key.toLowerCase() === 'y' || e.key === '1') {
                handleAnswer(true);
            } else if (e.key.toLowerCase() === 'n' || e.key === '2') {
                handleAnswer(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [phase, handleAnswer]);

    // Total timer countdown
    useEffect(() => {
        if (phase !== 'active' && phase !== 'feedback') return;

        const interval = setInterval(() => {
            setTotalTimeRemaining(prev => {
                if (prev <= 1) {
                    // Time's up - finish with current answers
                    finishSprint(answers);
                    return 0;
                }
                return prev - 1;
            });
        }, UI_TIMINGS.ONE_SECOND);

        return () => clearInterval(interval);
    }, [phase, answers]);

    // Question timer countdown
    useEffect(() => {
        if (phase !== 'active') return;

        const interval = setInterval(() => {
            setQuestionTimeRemaining(prev => {
                if (prev <= 0) {
                    // Auto-advance on timeout
                    handleAnswer(null);
                    return SPRINT_CONFIG.SECONDS_PER_QUESTION;
                }
                return prev - 0.1;
            });
        }, UI_TIMINGS.MARKER_UPDATE_FAST);

        return () => clearInterval(interval);
    }, [phase, handleAnswer]);

    const timerUrgency = getTimerUrgency(totalTimeRemaining, 180, 60);
    const getTimerClass = () => timerUrgency === 'critical' ? styles.critical : timerUrgency === 'warning' ? styles.warning : '';

    const questionUrgency = getTimerUrgency(questionTimeRemaining, 4, 2);
    const getQuestionTimerClass = () => questionUrgency === 'critical' ? styles.critical : questionUrgency === 'warning' ? styles.warning : '';

    // Get accuracy
    const correctCount = answers.filter(a => a.correct).length;
    const accuracy = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerTitle}>
                    <span className={styles.headerIcon}>⚡</span>
                    <h1 className={styles.title}>Automaticity Sprint</h1>
                </div>

                {(phase === 'active' || phase === 'feedback') && (
                    <div className={styles.headerRight}>
                        <div className={styles.accuracyBar}>
                            <span className={styles.accuracyLabel}>Accuracy:</span>
                            <span className={styles.accuracyValue}>{accuracy}%</span>
                        </div>

                        <div className={styles.progressDisplay}>
                            <strong>{currentIndex + 1}</strong> / {questions.length}
                        </div>

                        <div className={`${styles.timerDisplay} ${getTimerClass()}`}>
                            <Clock size={20} />
                            {formatTime(totalTimeRemaining)}
                        </div>
                    </div>
                )}
            </header>

            {/* Main content */}
            <main className={styles.main}>
                <AnimatePresence mode="wait">
                    {/* Countdown Screen */}
                    {phase === 'countdown' && !error && (
                        <motion.div
                            key="countdown"
                            className={styles.countdownScreen}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                        >
                            <motion.div
                                key={countdown}
                                className={styles.countdownNumber}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 1.5, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                {countdown > 0 ? countdown : '⚡'}
                            </motion.div>
                            <p className={styles.countdownLabel}>
                                {countdown > 0 ? 'Get ready...' : 'GO!'}
                            </p>
                        </motion.div>
                    )}

                    {/* Error State - shows during loading if there's an error */}
                    {phase === 'loading' && error && (
                        <motion.div
                            key="error"
                            className={styles.introScreen}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <span className={styles.introIcon}>⚠️</span>
                            <h2 className={styles.introTitle}>Can't Start Sprint</h2>
                            <p className={styles.introDescription}>{error}</p>
                            <button
                                onClick={() => navigate('/study/current')}
                                className={styles.startButton}
                            >
                                <ArrowLeft size={20} />
                                Back to Learning
                            </button>
                        </motion.div>
                    )}

                    {/* Loading State - questions being generated */}
                    {phase === 'loading' && !error && (
                        <motion.div
                            key="loading"
                            className={styles.loadingContainer}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className={styles.spinner} />
                            <p className={styles.loadingText}>Preparing your sprint...</p>
                            <p className={styles.loadingSubtext}>
                                Generating {concepts.length > 0 ? `${Math.min(15, concepts.length * 3)} questions` : 'questions'}
                            </p>
                        </motion.div>
                    )}

                    {/* Active Quiz */}
                    {(phase === 'active' || phase === 'feedback') && currentQuestion && (
                        <motion.div
                            key={`question-${currentIndex}`}
                            className={styles.questionCard}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Category badge */}
                            <span className={`${styles.categoryBadge} ${styles[currentQuestion.category]}`}>
                                {currentQuestion.category}
                            </span>

                            {/* Question */}
                            <div className={styles.questionContent}>
                                <p className={styles.question}>{currentQuestion.question}</p>
                            </div>

                            {/* Answer buttons */}
                            <div className={styles.answerButtons}>
                                <button
                                    className={`${styles.answerButton} ${styles.yes}`}
                                    onClick={() => handleAnswer(true)}
                                    disabled={phase === 'feedback'}
                                >
                                    <Check size={32} className={styles.answerIcon} />
                                    <span>YES</span>
                                    <span className={styles.keyboardHint}>Press Y or 1</span>
                                </button>

                                <button
                                    className={`${styles.answerButton} ${styles.no}`}
                                    onClick={() => handleAnswer(false)}
                                    disabled={phase === 'feedback'}
                                >
                                    <X size={32} className={styles.answerIcon} />
                                    <span>NO</span>
                                    <span className={styles.keyboardHint}>Press N or 2</span>
                                </button>
                            </div>

                            {/* Question timer */}
                            {phase === 'active' && (
                                <div className={styles.questionTimer}>
                                    <div
                                        className={`${styles.questionTimerFill} ${getQuestionTimerClass()}`}
                                        style={{ width: `${(questionTimeRemaining / SPRINT_CONFIG.SECONDS_PER_QUESTION) * 100}%` }}
                                    />
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Complete state */}
                    {phase === 'complete' && (
                        <motion.div
                            key="complete"
                            className={styles.loadingContainer}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <span style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</span>
                            <p className={styles.loadingText}>Calculating your Automaticity Score...</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Feedback overlay */}
            <AnimatePresence>
                {phase === 'feedback' && lastAnswer && (
                    <motion.div
                        className={styles.feedbackOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className={styles.feedbackCard}>
                            <span className={styles.feedbackIcon}>
                                {lastAnswer.correct ? '✅' : '❌'}
                            </span>
                            <h3 className={`${styles.feedbackTitle} ${lastAnswer.correct ? styles.correct : styles.incorrect}`}>
                                {lastAnswer.correct ? 'Correct!' : 'Not quite'}
                            </h3>
                            <p className={styles.feedbackExplanation}>
                                {lastAnswer.explanation}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
