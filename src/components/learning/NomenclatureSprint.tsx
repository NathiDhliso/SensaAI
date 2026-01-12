/**
 * NomenclatureSprint Component
 * 
 * High-speed matching game: Term ↔ Metaphor
 * 60 second timer with 90% accuracy gate to proceed.
 * Replaces the "Predict Links" mini-game in Phase 2: SCOUT.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    Clock,
    Check,
    X,
    RefreshCw,
    Trophy,
    AlertTriangle,
} from 'lucide-react';
import type { LearningConcept } from '@/lib/types/learning';
import styles from './NomenclatureSprint.module.css';

// ============================================================================
// Types
// ============================================================================

interface MatchPair {
    id: string;
    term: string;
    metaphor: string;
}

interface NomenclatureSprintProps {
    concepts: LearningConcept[];
    onComplete: (passed: boolean, accuracy: number) => void;
}

const SPRINT_DURATION_SECONDS = 60;
const PASS_THRESHOLD = 0.9; // 90% accuracy required

// ============================================================================
// Component
// ============================================================================

export function NomenclatureSprint({
    concepts,
    onComplete,
}: NomenclatureSprintProps) {
    // Game state
    const [isStarted, setIsStarted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(SPRINT_DURATION_SECONDS);
    const [currentPairIndex, setCurrentPairIndex] = useState(0);
    const [score, setScore] = useState({ correct: 0, total: 0 });
    const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [isComplete, setIsComplete] = useState(false);

    // Generate match pairs from concepts
    const matchPairs: MatchPair[] = useMemo(() => {
        return concepts
            .filter(c => c.mnemonic?.anchor || c.hookSentence)
            .slice(0, 15) // Limit to 15 pairs
            .map(c => ({
                id: c.id,
                term: c.name,
                metaphor: c.mnemonic?.anchor || c.hookSentence || c.name,
            }));
    }, [concepts]);

    // Current pair and shuffled options
    const currentPair = matchPairs[currentPairIndex];
    const shuffledOptions = useMemo(() => {
        if (!currentPair) return [];

        // Get 3 wrong options + 1 correct
        const wrongOptions = matchPairs
            .filter(p => p.id !== currentPair.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map(p => p.metaphor);

        return [...wrongOptions, currentPair.metaphor].sort(() => Math.random() - 0.5);
    }, [currentPair, matchPairs]);

    // Timer effect
    useEffect(() => {
        if (!isStarted || isComplete) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isStarted, isComplete]);

    const handleTimeUp = useCallback(() => {
        setIsComplete(true);
        // Accuracy is calculated when handleContinue is called
    }, []);

    const handleStart = useCallback(() => {
        setIsStarted(true);
        setTimeLeft(SPRINT_DURATION_SECONDS);
        setCurrentPairIndex(0);
        setScore({ correct: 0, total: 0 });
    }, []);

    const handleSelect = useCallback((metaphor: string) => {
        if (!currentPair || feedback) return;

        setSelectedTerm(metaphor);
        const isCorrect = metaphor === currentPair.metaphor;

        setFeedback(isCorrect ? 'correct' : 'wrong');
        setScore(prev => ({
            correct: prev.correct + (isCorrect ? 1 : 0),
            total: prev.total + 1,
        }));

        // Move to next pair after brief delay
        setTimeout(() => {
            setFeedback(null);
            setSelectedTerm(null);

            if (currentPairIndex < matchPairs.length - 1) {
                setCurrentPairIndex(prev => prev + 1);
            } else {
                setIsComplete(true);
            }
        }, 500);
    }, [currentPair, currentPairIndex, matchPairs.length, feedback]);

    const handleRetry = useCallback(() => {
        setIsComplete(false);
        setIsStarted(false);
        setTimeLeft(SPRINT_DURATION_SECONDS);
        setCurrentPairIndex(0);
        setScore({ correct: 0, total: 0 });
        setFeedback(null);
        setSelectedTerm(null);
    }, []);

    const handleContinue = useCallback(() => {
        const accuracy = score.total > 0 ? score.correct / score.total : 0;
        onComplete(accuracy >= PASS_THRESHOLD, accuracy);
    }, [score, onComplete]);

    const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    const passed = accuracy >= PASS_THRESHOLD * 100;

    // ========================================================================
    // Pre-start view
    // ========================================================================
    if (!isStarted) {
        return (
            <motion.div
                className={styles.container}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className={styles.startCard}>
                    <div className={styles.startIcon}>
                        <Zap size={48} />
                    </div>
                    <h2>Nomenclature Sprint</h2>
                    <p>Match each term with its metaphor as fast as you can!</p>

                    <div className={styles.rulesBox}>
                        <div className={styles.rule}>
                            <Clock size={18} />
                            <span><strong>60 seconds</strong> to match as many as possible</span>
                        </div>
                        <div className={styles.rule}>
                            <Trophy size={18} />
                            <span><strong>90% accuracy</strong> required to proceed</span>
                        </div>
                        <div className={styles.rule}>
                            <Zap size={18} />
                            <span><strong>{matchPairs.length} pairs</strong> to master</span>
                        </div>
                    </div>

                    <button className={styles.startButton} onClick={handleStart}>
                        <Zap size={20} />
                        Start Sprint
                    </button>
                </div>
            </motion.div>
        );
    }

    // ========================================================================
    // Results view
    // ========================================================================
    if (isComplete) {
        return (
            <motion.div
                className={styles.container}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className={`${styles.resultsCard} ${passed ? styles.passed : styles.failed}`}>
                    <div className={styles.resultsIcon}>
                        {passed ? <Trophy size={48} /> : <AlertTriangle size={48} />}
                    </div>
                    <h2>{passed ? 'Sprint Complete!' : 'Almost There!'}</h2>

                    <div className={styles.scoreDisplay}>
                        <div className={styles.scoreNumber}>{accuracy}%</div>
                        <div className={styles.scoreLabel}>Accuracy</div>
                    </div>

                    <div className={styles.statsRow}>
                        <div className={styles.stat}>
                            <Check size={16} />
                            <span>{score.correct} Correct</span>
                        </div>
                        <div className={styles.stat}>
                            <X size={16} />
                            <span>{score.total - score.correct} Missed</span>
                        </div>
                    </div>

                    {passed ? (
                        <button className={styles.continueButton} onClick={handleContinue}>
                            Continue to Gap Priming →
                        </button>
                    ) : (
                        <div className={styles.retrySection}>
                            <p>You need 90% accuracy to proceed. Don't worry—retry!</p>
                            <button className={styles.retryButton} onClick={handleRetry}>
                                <RefreshCw size={18} />
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        );
    }

    // ========================================================================
    // Sprint game view
    // ========================================================================
    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className={styles.gameCard}>
                {/* Timer bar */}
                <div className={styles.timerBar}>
                    <div
                        className={styles.timerFill}
                        style={{ width: `${(timeLeft / SPRINT_DURATION_SECONDS) * 100}%` }}
                    />
                </div>

                <div className={styles.gameHeader}>
                    <div className={styles.timer}>
                        <Clock size={18} />
                        <span className={timeLeft <= 10 ? styles.timerUrgent : ''}>
                            {timeLeft}s
                        </span>
                    </div>
                    <div className={styles.progress}>
                        {currentPairIndex + 1} / {matchPairs.length}
                    </div>
                    <div className={styles.scoreChip}>
                        <span>{score.correct}</span> / <span>{score.total}</span>
                    </div>
                </div>

                <div className={styles.questionSection}>
                    <div className={styles.termCard}>
                        <Zap size={24} />
                        <span className={styles.termText}>{currentPair?.term}</span>
                    </div>
                    <p className={styles.prompt}>What is this concept's anchor metaphor?</p>
                </div>

                <div className={styles.optionsGrid}>
                    <AnimatePresence>
                        {shuffledOptions.map((option, idx) => {
                            const isSelected = selectedTerm === option;
                            const isCorrectAnswer = option === currentPair?.metaphor;
                            let cardClass = styles.optionCard;

                            if (feedback) {
                                if (isSelected && feedback === 'correct') cardClass += ` ${styles.optionCorrect}`;
                                if (isSelected && feedback === 'wrong') cardClass += ` ${styles.optionWrong}`;
                                if (!isSelected && isCorrectAnswer && feedback === 'wrong') cardClass += ` ${styles.optionReveal}`;
                            }

                            return (
                                <motion.button
                                    key={`${currentPair?.id}-${idx}`}
                                    className={cardClass}
                                    onClick={() => handleSelect(option)}
                                    disabled={!!feedback}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    whileHover={!feedback ? { scale: 1.02 } : {}}
                                    whileTap={!feedback ? { scale: 0.98 } : {}}
                                >
                                    {option}
                                </motion.button>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}

export default NomenclatureSprint;
