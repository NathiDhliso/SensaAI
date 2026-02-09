/**
 * SessionSummary Component
 * 
 * Modal that displays when a focus session completes.
 * Shows session statistics, concepts covered, pace analysis,
 * and provides options to take a break or continue focusing.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Coffee, Play, Clock, BookOpen, Zap, CheckCircle2, Circle, TrendingUp } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import { formatDuration, formatPace } from '@/shared/utils/utils';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import styles from './SessionSummary.module.css';

export function SessionSummary() {
    const {
        showSessionSummary,
        lastSessionSummary,
        dismissSessionSummary,
        startBreak,
        startFocusSession,
        totalSessionsCompleted,
        totalFocusMinutes,
        sessionsUntilLongBreak,
    } = useLearningStore();

    const { isScholarly } = useVisualTheme();

    if (!showSessionSummary || !lastSessionSummary) return null;

    const summary = lastSessionSummary;
    const getPaceDisplay = (rating: string) => {
        switch (rating) {
            case 'optimal': return { emoji: isScholarly ? '' : '🟢', label: 'Optimal' };
            case 'good': return { emoji: isScholarly ? '' : '🟡', label: 'Good' };
            case 'warning': return { emoji: isScholarly ? '' : '🟠', label: 'Slow' };
            case 'overtime': return { emoji: isScholarly ? '' : '🔴', label: 'Very Slow' };
            default: return { emoji: isScholarly ? '' : '⚪', label: 'N/A' };
        }
    };

    const paceDisplay = getPaceDisplay(summary.paceRating);
    const isLongBreak = sessionsUntilLongBreak === 0;

    const handleTakeBreak = () => {
        dismissSessionSummary();
        startBreak();
    };

    const handleContinueFocus = () => {
        dismissSessionSummary();
        startFocusSession();
    };

    return (
        <AnimatePresence>
            <motion.div
                className={styles.overlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={dismissSessionSummary}
            >
                <motion.div
                    className={styles.modal}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={styles.header}>
                        <div className={styles.headerContent}>
                            {!isScholarly && <span className={styles.headerIcon}>🎉</span>}
                            <div>
                                <h2 className={styles.title}>Focus Session Complete!</h2>
                                <p className={styles.subtitle}>
                                    Session #{totalSessionsCompleted} • {totalFocusMinutes} total minutes focused
                                </p>
                            </div>
                        </div>
                        <button className={styles.closeButton} onClick={dismissSessionSummary}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Stats Grid */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <Clock size={20} className={styles.statIcon} />
                            <div className={styles.statValue}>{formatDuration(summary.duration)}</div>
                            <div className={styles.statLabel}>Duration</div>
                        </div>

                        <div className={styles.statCard}>
                            <BookOpen size={20} className={styles.statIcon} />
                            <div className={styles.statValue}>{summary.conceptsCount}</div>
                            <div className={styles.statLabel}>Concepts</div>
                        </div>

                        <div className={`${styles.statCard} ${styles.highlight}`}>
                            <Zap size={20} className={styles.statIcon} />
                            <div className={styles.statValue}>{formatPace(summary.avgPaceSeconds)}</div>
                            <div className={styles.statLabel}>Avg Pace</div>
                        </div>

                        <div className={styles.statCard}>
                            <TrendingUp size={20} className={styles.statIcon} />
                            <div className={styles.statValue}>{paceDisplay.emoji} {paceDisplay.label}</div>
                            <div className={styles.statLabel}>Rating</div>
                        </div>
                    </div>

                    {/* Concepts List */}
                    {summary.conceptTimings.length > 0 && (
                        <div className={styles.conceptsSection}>
                            <h3 className={styles.sectionTitle}>Concepts This Session</h3>
                            <div className={styles.conceptsList}>
                                {summary.conceptTimings.map((timing) => (
                                    <div key={timing.conceptId} className={styles.conceptItem}>
                                        <div className={styles.conceptStatus}>
                                            {timing.completed ? (
                                                <CheckCircle2 size={16} className={styles.completedIcon} />
                                            ) : (
                                                <Circle size={16} className={styles.inProgressIcon} />
                                            )}
                                        </div>
                                        <span className={styles.conceptName}>{timing.conceptName}</span>
                                        <span className={styles.conceptTime}>{formatPace(timing.durationSeconds)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recommendation */}
                    <div className={styles.recommendation}>
                        {!isScholarly && <span className={styles.recommendationIcon}>💡</span>}
                        <p>{summary.recommendation}</p>
                    </div>

                    {/* Actions */}
                    <div className={styles.actions}>
                        <button className={styles.breakButton} onClick={handleTakeBreak}>
                            <Coffee size={18} />
                            {isLongBreak ? 'Take Long Break (15m)' : 'Take Break (5m)'}
                        </button>
                        <button className={styles.continueButton} onClick={handleContinueFocus}>
                            <Play size={18} />
                            Continue Focus
                        </button>
                    </div>

                    {/* Break counter */}
                    {!isLongBreak && (
                        <p className={styles.breakHint}>
                            {sessionsUntilLongBreak} more session{sessionsUntilLongBreak !== 1 ? 's' : ''} until long break
                        </p>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
