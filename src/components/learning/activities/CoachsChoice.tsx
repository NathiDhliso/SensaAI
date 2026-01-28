import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, AlertTriangle, Zap, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './CoachsChoice.module.css';

export interface CoachsChoiceProps {
    type: 'QM' | 'Qf';
    currentValue: number;
    potentialValue: number;
    reason: string;
    onAccept: () => void;
    onDecline: () => void;
}

// Helper to convert score to human-readable badge
function getScoreBadge(value: number): { label: string; className: string } {
    if (value >= 0.8) return { label: 'Strong', className: 'badgeStrong' };
    if (value >= 0.5) return { label: 'Okay', className: 'badgeOkay' };
    return { label: 'Weak', className: 'badgeWeak' };
}

function getScoreLabel(type: 'QM' | 'Qf'): string {
    return type === 'QM' ? 'Understanding' : 'Speed';
}

export default function CoachsChoice({
    type,
    currentValue,
    potentialValue,
    reason,
    onAccept,
    onDecline
}: CoachsChoiceProps) {
    const [showDetails, setShowDetails] = useState(false);

    // Calculate dramatic stats for the urgency
    const reviewsNeededCurrent = Math.round(10 / (currentValue || 0.1));
    const reviewsNeededPotential = Math.round(10 / (potentialValue || 0.1));
    const timeSavedMinutes = (reviewsNeededCurrent - reviewsNeededPotential) * 2;

    const currentBadge = getScoreBadge(currentValue);
    const potentialBadge = getScoreBadge(potentialValue);

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className={styles.container}
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
            >
                <div className={styles.header}>
                    <div className={styles.iconBadge}>
                        <Brain size={24} />
                    </div>
                    <div>
                        <h2>Coach's Insight</h2>
                        <p className={styles.subtitle}>{reason}</p>
                    </div>
                </div>

                <div className={styles.comparisonGrid}>
                    {/* Current Path - The Warning */}
                    <div className={`${styles.pathCard} ${styles.currentPath}`}>
                        <div className={styles.pathHeader}>
                            <AlertTriangle size={18} />
                            <span>Current Trajectory</span>
                        </div>
                        <div className={styles.scoreDisplay}>
                            <span className={styles.scoreLabel}>{getScoreLabel(type)}</span>
                            <span className={`${styles.badge} ${styles[currentBadge.className]}`}>
                                {currentBadge.label}
                            </span>
                        </div>
                        <div className={styles.statRow}>
                            <span>Est. Reviews Needed:</span>
                            <strong>{reviewsNeededCurrent}x</strong>
                        </div>
                        <div className={styles.statRow}>
                            <span>Retention Probability:</span>
                            <strong>Low</strong>
                        </div>
                    </div>

                    {/* Arrow Divider */}
                    <div className={styles.arrowDivider}>
                        <ArrowRight size={24} />
                    </div>

                    {/* Repaired Path - The Promise */}
                    <div className={`${styles.pathCard} ${styles.repairedPath}`}>
                        <div className={styles.pathHeader}>
                            <Zap size={18} />
                            <span>After Quick Fix</span>
                        </div>
                        <div className={styles.scoreDisplay}>
                            <span className={styles.scoreLabel}>{getScoreLabel(type)}</span>
                            <span className={`${styles.badge} ${styles[potentialBadge.className]}`}>
                                {potentialBadge.label}
                            </span>
                        </div>
                        <div className={styles.statRow}>
                            <span>Est. Reviews Needed:</span>
                            <strong>{reviewsNeededPotential}x</strong>
                        </div>
                        <div className={styles.statRow}>
                            <span>Time Saved:</span>
                            <strong style={{ color: 'var(--color-success)' }}>~{timeSavedMinutes} min</strong>
                        </div>
                    </div>
                </div>

                {/* Optional Details Toggle (For Advanced Users) */}
                <button
                    className={styles.detailsToggle}
                    onClick={() => setShowDetails(!showDetails)}
                >
                    {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {showDetails ? 'Hide Details' : 'Show Details'}
                </button>
                {showDetails && (
                    <div className={styles.detailsPanel}>
                        <p>Raw Score: {type} = {currentValue.toFixed(2)} → {potentialValue.toFixed(2)}</p>
                    </div>
                )}

                <div className={styles.actions}>
                    <button className={styles.declineButton} onClick={onDecline}>
                        Ignore & Continue
                    </button>
                    <button className={styles.acceptButton} onClick={onAccept}>
                        <Zap size={18} />
                        {type === 'QM' ? 'Connect Ideas (2 min)' : 'Speed Drill (30 sec)'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
