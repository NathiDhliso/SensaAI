/**
 * MasteryChallenge Component
 * 
 * Implements Phase 3.5: Prove Mastery (Boss Battle).
 * Presents a comprehensive, time-boxed challenge requiring synthesis of multiple concepts.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Trophy,
    Clock,
    CheckCircle2,
    AlertTriangle
} from 'lucide-react';
import type { LearningConcept } from '@/lib/types/learning';
import { UI_TIMINGS } from '@/constants/ui-constants';
import { DEFAULT_MASTERY_SCENARIO } from '@/constants/learning-content';
import { usePauseGlobalTimer } from '@/hooks';
import styles from './MasteryChallenge.module.css';

interface MasteryChallengeProps {
    concepts: LearningConcept[];
    onComplete: (passed: boolean) => void;
}

export default function MasteryChallenge({
    concepts,
    onComplete
}: MasteryChallengeProps) {
    const [phase, setPhase] = useState<'intro' | 'challenge' | 'complete'>('intro');
    const [timeRemaining, setTimeRemaining] = useState<number>(UI_TIMINGS.MASTERY_TIME_SECONDS);
    const [userResponse, setUserResponse] = useState('');
    const [selfAssessment, setSelfAssessment] = useState<'excellent' | 'good' | 'needs-work' | null>(null);

    // Pause global focus session timer during challenge
    usePauseGlobalTimer();

    // Timer countdown
    useEffect(() => {
        if (phase !== 'challenge') return;

        const interval = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setPhase('complete');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [phase]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Generate a boss battle scenario - dynamic with fallback
    const conceptNames = concepts.slice(0, 3).map(c => c.name).join(', ');
    const scenario = concepts.length > 0
        ? `You are consulting for a client who needs to implement a comprehensive solution using the concepts you've learned.

**Scenario:**
Design and explain a complete system that integrates ${conceptNames}${concepts.length > 3 ? ', and more' : ''}.

**Requirements:**
1. Explain how each concept contributes to the solution
2. Describe the relationships between concepts
3. Identify potential challenges and how you'd address them
4. Provide a step-by-step implementation approach

**Your Response:**`
        : DEFAULT_MASTERY_SCENARIO;

    const handleStartChallenge = () => {
        setPhase('challenge');
    };

    const handleSubmit = () => {
        setPhase('complete');
    };

    const handleSelfAssess = (assessment: 'excellent' | 'good' | 'needs-work') => {
        setSelfAssessment(assessment);
        // Pass if excellent or good
        onComplete(assessment === 'excellent' || assessment === 'good');
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.headerIcon}>
                        <Trophy size={24} />
                    </div>
                    <div>
                        <h2 className={styles.title}>
                            {phase === 'intro' ? 'Boss Battle: Prove Your Mastery' :
                                phase === 'challenge' ? 'Challenge in Progress' :
                                    'Challenge Complete'}
                        </h2>
                        <p className={styles.subtitle}>
                            {phase === 'intro' ? 'A comprehensive challenge to demonstrate your understanding' :
                                phase === 'challenge' ? 'Apply everything you\'ve learned' :
                                    'How did you do?'}
                        </p>
                    </div>
                </div>

                {phase === 'challenge' && (
                    <div className={`${styles.timerBadge} ${timeRemaining < 60 ? styles.warning : ''}`}>
                        <Clock size={16} />
                        <span className={`${styles.timerText} ${timeRemaining < 60 ? styles.warning : ''}`}>
                            {formatTime(timeRemaining)}
                        </span>
                    </div>
                )}
            </div>

            <div className={styles.content}>
                {phase === 'intro' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={styles.introContainer}
                    >
                        <div className={styles.infoCard}>
                            <h3>What to Expect</h3>
                            <ul>
                                <li>A complex, real-world scenario requiring multiple concepts</li>
                                <li>10 minutes to craft your response</li>
                                <li>Self-assessment of your performance</li>
                                <li>Opportunity to demonstrate true mastery</li>
                            </ul>
                        </div>

                        <div className={styles.warningCard}>
                            <AlertTriangle size={20} />
                            <p>Final test</p>
                        </div>

                        <button
                            className={styles.startButton}
                            onClick={handleStartChallenge}
                        >
                            Begin Challenge
                            <Trophy size={20} />
                        </button>
                    </motion.div>
                )}

                {phase === 'challenge' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={styles.challengeContainer}
                    >
                        <div className={styles.scenarioCard}>
                            <pre>{scenario}</pre>
                        </div>

                        <textarea
                            className={styles.textarea}
                            value={userResponse}
                            onChange={(e) => setUserResponse(e.target.value)}
                            placeholder="Type your comprehensive response here..."
                        />

                        <button
                            className={styles.submitButton}
                            onClick={handleSubmit}
                            disabled={userResponse.length < 100}
                        >
                            Submit Response
                            <CheckCircle2 size={16} />
                        </button>
                    </motion.div>
                )}

                {phase === 'complete' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={styles.completeContainer}
                    >
                        <div className={styles.responseCard}>
                            <h3>Your Response:</h3>
                            <div className={styles.responseContent}>
                                <p>{userResponse || 'No response provided'}</p>
                            </div>
                        </div>

                        {!selfAssessment ? (
                            <div className={styles.assessmentSection}>
                                <h3>How well did you do?</h3>
                                <div className={styles.assessmentButtons}>
                                    <button
                                        className={`${styles.assessmentButton} ${styles.excellent}`}
                                        onClick={() => handleSelfAssess('excellent')}
                                    >
                                        Excellent
                                    </button>
                                    <button
                                        className={`${styles.assessmentButton} ${styles.good}`}
                                        onClick={() => handleSelfAssess('good')}
                                    >
                                        Good
                                    </button>
                                    <button
                                        className={`${styles.assessmentButton} ${styles.needsWork}`}
                                        onClick={() => handleSelfAssess('needs-work')}
                                    >
                                        Needs Work
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.celebrationCard}>
                                <Trophy size={48} className={styles.celebrationIcon} />
                                <h2>
                                    {selfAssessment === 'excellent' ? 'Outstanding!' :
                                        selfAssessment === 'good' ? 'Well Done!' :
                                            'Keep Practicing!'}
                                </h2>
                                <p>
                                    {selfAssessment === 'excellent' ? 'You\'ve demonstrated true mastery of these concepts.' :
                                        selfAssessment === 'good' ? 'You have a solid understanding. Keep building on this foundation.' :
                                            'Review the concepts and try again when you\'re ready.'}
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
