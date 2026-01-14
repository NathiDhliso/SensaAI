/**
 * SensaAI Session Goal Manager
 * 
 * Manages session-based learning with goal selection, AI recommendations,
 * and auto-start countdown functionality.
 * 
 * Requirements: From Task 12 of Learning Velocity Engine
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target,
    Clock,
    Play,
    Pause,
    CheckCircle2,
    Brain,
    Zap,
    ArrowRight
} from 'lucide-react';
import type { LearningConcept } from '@/lib/types/learning';
import { getInterleavingAlgorithm } from '@/lib/learning/interleaving-algorithm';
import { getSpacingEngine } from '@/lib/learning/spacing-engine';
import styles from './SessionGoalManager.module.css';

// ============================================================================
// TYPES
// ============================================================================

export type SessionGoalType = 'review' | 'learn-new' | 'deep-dive' | 'quick-practice';

export interface SessionGoal {
    type: SessionGoalType;
    label: string;
    description: string;
    estimatedMinutes: number;
    conceptCount: number;
    isRecommended?: boolean;
}

export interface SessionGoalManagerProps {
    /** Available concepts to learn */
    availableConcepts: LearningConcept[];
    /** Callback when session starts */
    onSessionStart: (goal: SessionGoal, concepts: LearningConcept[]) => void;
    /** Auto-start countdown in seconds (default 5) */
    autoStartCountdown?: number;
}

// ============================================================================
// GOAL GENERATION
// ============================================================================

function generateSessionGoals(concepts: LearningConcept[]): SessionGoal[] {
    const spacingEngine = getSpacingEngine();
    const dueReviews = spacingEngine.getDueReviews();
    const overdueReviews = spacingEngine.getOverdueReviews();

    const goals: SessionGoal[] = [];

    // Review session (if there are due reviews)
    if (dueReviews.length > 0) {
        goals.push({
            type: 'review',
            label: 'Review Session',
            description: `${overdueReviews.length} overdue, ${dueReviews.length} total due`,
            estimatedMinutes: Math.min(30, dueReviews.length * 3),
            conceptCount: Math.min(10, dueReviews.length),
            isRecommended: overdueReviews.length > 0, // Recommend if overdue
        });
    }

    // Learn new concepts
    const unlearned = concepts.filter(c => !spacingEngine.getReview(c.id));
    if (unlearned.length > 0) {
        goals.push({
            type: 'learn-new',
            label: 'Learn New Concepts',
            description: `${unlearned.length} concepts available`,
            estimatedMinutes: 25,
            conceptCount: Math.min(5, unlearned.length),
            isRecommended: dueReviews.length === 0, // Recommend if no reviews due
        });
    }

    // Deep dive (focus on one concept)
    if (concepts.length > 0) {
        goals.push({
            type: 'deep-dive',
            label: 'Deep Dive',
            description: 'Master one concept thoroughly',
            estimatedMinutes: 15,
            conceptCount: 1,
        });
    }

    // Quick practice (5 minute session)
    goals.push({
        type: 'quick-practice',
        label: 'Quick Practice',
        description: '5-minute skill check',
        estimatedMinutes: 5,
        conceptCount: 3,
    });

    return goals;
}

function recommendGoal(goals: SessionGoal[]): SessionGoal {
    // Find already recommended
    const recommended = goals.find(g => g.isRecommended);
    if (recommended) return recommended;

    // Default to first goal
    return goals[0];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SessionGoalManager({
    availableConcepts,
    onSessionStart,
    autoStartCountdown = 5,
}: SessionGoalManagerProps) {
    const [selectedGoal, setSelectedGoal] = useState<SessionGoal | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [isPaused, setIsPaused] = useState(false);

    // Generate goals
    const goals = useMemo(() =>
        generateSessionGoals(availableConcepts),
        [availableConcepts]
    );

    // Get recommended goal
    const recommendedGoal = useMemo(() => recommendGoal(goals), [goals]);

    // Auto-select recommended on mount
    useEffect(() => {
        if (!selectedGoal && recommendedGoal) {
            setSelectedGoal(recommendedGoal);
            setCountdown(autoStartCountdown);
        }
    }, [recommendedGoal, selectedGoal, autoStartCountdown]);

    // Start session with selected goal
    const handleStartSession = useCallback(() => {
        if (!selectedGoal) return;

        // Get concepts for this session using interleaving algorithm
        const interleaving = getInterleavingAlgorithm();
        let sessionConcepts: LearningConcept[] = [];

        if (selectedGoal.type === 'review') {
            // Get due reviews
            const spacingEngine = getSpacingEngine();
            const dueReviews = spacingEngine.getInterleavedSession(selectedGoal.conceptCount);
            sessionConcepts = availableConcepts.filter(c =>
                dueReviews.some(r => r.conceptId === c.id)
            );
        } else {
            // Use interleaving for new concepts
            sessionConcepts = interleaving.getInterleavedSession(
                availableConcepts,
                selectedGoal.conceptCount
            );
        }

        onSessionStart(selectedGoal, sessionConcepts);
    }, [selectedGoal, availableConcepts, onSessionStart]);

    // Countdown timer
    useEffect(() => {
        if (countdown === null || isPaused) return;

        if (countdown <= 0) {
            handleStartSession();
            return;
        }

        const timer = setTimeout(() => {
            setCountdown(countdown - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [countdown, isPaused, handleStartSession]);


    // Handle goal selection (user override)
    const handleGoalSelect = useCallback((goal: SessionGoal) => {
        setSelectedGoal(goal);
        setCountdown(autoStartCountdown);
        setIsPaused(false);
    }, [autoStartCountdown]);

    // Toggle pause
    const togglePause = useCallback(() => {
        setIsPaused(prev => !prev);
    }, []);

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className={styles.header}>
                <Target size={24} className={styles.icon} />
                <div>
                    <h2 className={styles.title}>Choose Your Goal</h2>
                    <p className={styles.subtitle}>AI recommends based on your progress</p>
                </div>
            </div>

            {/* Goal options */}
            <div className={styles.goals}>
                {goals.map((goal) => (
                    <button
                        key={goal.type}
                        className={`${styles.goalCard} ${selectedGoal?.type === goal.type ? styles.selected : ''} ${goal.isRecommended ? styles.recommended : ''}`}
                        onClick={() => handleGoalSelect(goal)}
                    >
                        {goal.isRecommended && (
                            <span className={styles.aiTag}>
                                <Brain size={12} /> AI Pick
                            </span>
                        )}
                        <div className={styles.goalIcon}>
                            {goal.type === 'review' && <Clock size={24} />}
                            {goal.type === 'learn-new' && <Zap size={24} />}
                            {goal.type === 'deep-dive' && <Target size={24} />}
                            {goal.type === 'quick-practice' && <Play size={24} />}
                        </div>
                        <div className={styles.goalInfo}>
                            <h3>{goal.label}</h3>
                            <p>{goal.description}</p>
                            <span className={styles.goalMeta}>
                                ~{goal.estimatedMinutes} min • {goal.conceptCount} concepts
                            </span>
                        </div>
                        {selectedGoal?.type === goal.type && (
                            <CheckCircle2 size={20} className={styles.checkIcon} />
                        )}
                    </button>
                ))}
            </div>

            {/* Auto-start countdown */}
            <AnimatePresence>
                {selectedGoal && countdown !== null && (
                    <motion.div
                        className={styles.countdownSection}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <div className={styles.countdownContent}>
                            <div className={styles.countdownTimer}>
                                <span className={styles.countdownNumber}>{countdown}</span>
                                <span className={styles.countdownLabel}>seconds</span>
                            </div>

                            <button
                                className={styles.pauseButton}
                                onClick={togglePause}
                            >
                                {isPaused ? <Play size={16} /> : <Pause size={16} />}
                                {isPaused ? 'Resume' : 'Pause'}
                            </button>
                        </div>

                        <button
                            className={styles.startButton}
                            onClick={handleStartSession}
                        >
                            Start Now
                            <ArrowRight size={18} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default SessionGoalManager;
