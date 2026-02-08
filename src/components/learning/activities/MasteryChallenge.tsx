/**
 * MasteryChallenge Component
 * 
 * Implements Phase 3.5: Prove Mastery (Boss Battle).
 * Presents a comprehensive, time-boxed challenge requiring synthesis of multiple concepts.
 */
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Trophy,
    Clock,
    CheckCircle2,
    AlertTriangle
} from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { DEFAULT_MASTERY_SCENARIO } from '@/shared/constants/learning-content';
import { usePauseGlobalTimer } from '@/shared/hooks/usePauseGlobalTimer';
import styles from './MasteryChallenge.module.css';

interface MasteryChallengeProps {
    concepts: LearningConcept[];
    onComplete: (passed: boolean) => void;
}

function scoreMasteryResponse(response: string, concepts: LearningConcept[]): { score: number; matched: string[]; missed: string[] } {
    const lower = response.toLowerCase();
    const allKeywords: string[] = [];

    for (const c of concepts.slice(0, 5)) {
        allKeywords.push(c.name.toLowerCase());
        if (c.keyPoints) {
            for (const kp of c.keyPoints.slice(0, 2)) {
                const words = kp.toLowerCase().split(/\s+/).filter(w => w.length > 4);
                allKeywords.push(...words);
            }
        }
        if (c.howToUse) {
            for (const step of c.howToUse.slice(0, 1)) {
                const words = step.toLowerCase().split(/\s+/).filter(w => w.length > 4);
                allKeywords.push(...words);
            }
        }
    }

    const unique = [...new Set(allKeywords)];
    const matched = unique.filter(kw => lower.includes(kw));
    const missed = unique.filter(kw => !lower.includes(kw));
    const keywordScore = unique.length > 0 ? matched.length / unique.length : 0;
    const lengthBonus = Math.min(0.15, response.length / 1000);
    const conceptNameHits = concepts.slice(0, 5).filter(c => lower.includes(c.name.toLowerCase())).length;
    const conceptCoverage = concepts.length > 0 ? conceptNameHits / Math.min(5, concepts.length) : 0;

    const total = Math.min(1, keywordScore * 0.5 + conceptCoverage * 0.35 + lengthBonus);
    return { score: total, matched, missed };
}

export default function MasteryChallenge({
    concepts,
    onComplete
}: MasteryChallengeProps) {
    const [phase, setPhase] = useState<'intro' | 'challenge' | 'complete'>('intro');
    const [timeRemaining, setTimeRemaining] = useState<number>(UI_TIMINGS.MASTERY_TIME_SECONDS);
    const [userResponse, setUserResponse] = useState('');
    const [scoreResult, setScoreResult] = useState<{ score: number; matched: string[]; missed: string[] } | null>(null);

    usePauseGlobalTimer();

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

    const conceptNames = concepts.slice(0, 3).map(c => c.name).join(', ');
    const scenario = useMemo(() => concepts.length > 0
        ? `You are consulting for a client who needs to implement a comprehensive solution using the concepts you've learned.

**Scenario:**
Design and explain a complete system that integrates ${conceptNames}${concepts.length > 3 ? ', and more' : ''}.

**Requirements:**
1. Explain how each concept contributes to the solution
2. Describe the relationships between concepts
3. Identify potential challenges and how you'd address them
4. Provide a step-by-step implementation approach

**Your Response:**`
        : DEFAULT_MASTERY_SCENARIO, [concepts, conceptNames]);

    const handleStartChallenge = () => {
        setPhase('challenge');
    };

    const handleSubmit = () => {
        const result = scoreMasteryResponse(userResponse, concepts);
        setScoreResult(result);
        setPhase('complete');
    };

    const handleComplete = () => {
        const passed = (scoreResult?.score ?? 0) >= 0.35;
        onComplete(passed);
    };

    const scorePercent = scoreResult ? Math.round(scoreResult.score * 100) : 0;
    const passed = scorePercent >= 35;

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
                                    'Results'}
                        </h2>
                        <p className={styles.subtitle}>
                            {phase === 'intro' ? 'A comprehensive challenge to demonstrate your understanding' :
                                phase === 'challenge' ? 'Apply everything you\'ve learned' :
                                    `Score: ${scorePercent}%`}
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
                                <li>A real-world scenario requiring multiple concepts</li>
                                <li>10 minutes to craft your response</li>
                                <li>Automated scoring based on concept coverage</li>
                                <li>Use specific terminology from what you learned</li>
                            </ul>
                        </div>

                        <div className={styles.warningCard}>
                            <AlertTriangle size={20} />
                            <p>Final challenge — reference specific concepts by name</p>
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
                            placeholder="Reference specific concepts by name. Explain how they connect and what steps to take..."
                        />

                        <button
                            className={styles.submitButton}
                            onClick={handleSubmit}
                            disabled={userResponse.length < 80}
                        >
                            Submit Response
                            <CheckCircle2 size={16} />
                        </button>
                    </motion.div>
                )}

                {phase === 'complete' && scoreResult && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={styles.completeContainer}
                    >
                        <div className={styles.celebrationCard}>
                            <Trophy size={48} className={styles.celebrationIcon} />
                            <h2>{passed ? (scorePercent >= 70 ? 'Outstanding!' : 'Well Done!') : 'Keep Practicing'}</h2>
                            <p style={{ fontSize: '2rem', fontWeight: 700 }}>{scorePercent}%</p>
                            <p>
                                {passed
                                    ? `You covered ${scoreResult.matched.length} key terms across the concepts.`
                                    : `You missed key terms. Try mentioning specific concept names and their properties.`}
                            </p>
                        </div>

                        {scoreResult.missed.length > 0 && scoreResult.missed.length <= 8 && (
                            <div className={styles.responseCard}>
                                <h3>Terms to Review:</h3>
                                <div className={styles.responseContent}>
                                    <p>{scoreResult.missed.slice(0, 8).join(', ')}</p>
                                </div>
                            </div>
                        )}

                        <button className={styles.startButton} onClick={handleComplete}>
                            {passed ? 'Complete' : 'Continue'}
                            <Trophy size={20} />
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
