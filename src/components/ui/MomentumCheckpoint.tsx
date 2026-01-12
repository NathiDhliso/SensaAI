/**
 * MomentumCheckpoint Component
 * 
 * A "natural pause" checkpoint that appears at concept boundaries
 * when the user's selected time has been exceeded.
 * 
 * Designed to respect flow state and use the Zeigarnik Effect
 * to encourage return by showing "Up Next" teaser.
 */

import { motion } from 'framer-motion';
import {
    Trophy,
    Flame,
    ArrowRight,
    Bookmark,
    Clock,
    Sparkles
} from 'lucide-react';
import type { LearningConcept } from '@/lib/types/learning';
import { MOMENTUM_CHECKPOINT } from '@/constants/ui-constants';
import styles from './MomentumCheckpoint.module.css';

interface MomentumCheckpointProps {
    /** Number of concepts completed this session */
    conceptsCompleted: number;
    /** Time spent in minutes */
    timeSpentMinutes: number;
    /** The next concept waiting (for Zeigarnik teaser) */
    nextConcept: LearningConcept | null;
    /** Current streak count */
    streakCount: number;
    /** Handler for "Continue" action */
    onContinue: () => void;
    /** Handler for "Save & Exit" action */
    onExit: () => void;
}

export default function MomentumCheckpoint({
    conceptsCompleted,
    timeSpentMinutes,
    nextConcept,
    streakCount,
    onContinue,
    onExit
}: MomentumCheckpointProps) {
    const isOnFire = streakCount >= MOMENTUM_CHECKPOINT.STREAK_CELEBRATION_THRESHOLD;

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: MOMENTUM_CHECKPOINT.CHECKPOINT_ANIMATION_MS / 1000 }}
        >
            <motion.div
                className={styles.card}
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
                {/* Header with celebration */}
                <div className={styles.header}>
                    <div className={styles.iconContainer}>
                        {isOnFire ? (
                            <Flame size={32} className={styles.fireIcon} />
                        ) : (
                            <Trophy size={32} className={styles.trophyIcon} />
                        )}
                    </div>
                    <h2 className={styles.title}>
                        {isOnFire ? 'You\'re on fire!' : 'Great work!'}
                    </h2>
                </div>

                {/* Stats */}
                <div className={styles.stats}>
                    <div className={styles.stat}>
                        <Sparkles size={16} />
                        <span className={styles.statValue}>{conceptsCompleted}</span>
                        <span className={styles.statLabel}>
                            concept{conceptsCompleted !== 1 ? 's' : ''} completed
                        </span>
                    </div>
                    <div className={styles.stat}>
                        <Clock size={16} />
                        <span className={styles.statValue}>{timeSpentMinutes}</span>
                        <span className={styles.statLabel}>minutes focused</span>
                    </div>
                </div>

                {/* Zeigarnik Teaser - "Up Next" */}
                {nextConcept && (
                    <div className={styles.upNext}>
                        <span className={styles.upNextLabel}>Up Next</span>
                        <div className={styles.upNextConcept}>
                            <span className={styles.upNextName}>{nextConcept.name}</span>
                            {nextConcept.tier && (
                                <span className={styles.upNextTier}>{nextConcept.tier}</span>
                            )}
                        </div>
                        <p className={styles.upNextHook}>
                            {nextConcept.hook || 'Continue your journey...'}
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className={styles.actions}>
                    <button className={styles.exitButton} onClick={onExit}>
                        <Bookmark size={18} />
                        Save & Exit
                    </button>
                    <button className={styles.continueButton} onClick={onContinue}>
                        Continue
                        <ArrowRight size={18} />
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
