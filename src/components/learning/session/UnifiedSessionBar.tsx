/**
 * UnifiedSessionBar Component
 * 
 * A compact, persistent header bar that displays during active focus sessions.
 * Shows:
 * - Focus timer countdown (outer boundary)
 * - Current concept/session progress
 * - Session statistics (concepts covered, avg pace)
 * - Session controls (pause, skip to break, end)
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Pause, Play, Coffee, X, BookOpen, Zap } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import styles from './UnifiedSessionBar.module.css';

export function UnifiedSessionBar() {
    const {
        isSessionActive,
        isPaused,
        sessionType,
        timeRemainingSeconds,
        getFormattedTimeRemaining,
        getProgressPercent,
        getConceptsThisSession,
        getAvgPaceThisSession,
        getPaceRating,
        pauseSession,
        resumeSession,
        skipToBreak,
        endFocusSession,
        tick,
        getConcepts,
    } = useLearningStore();
    const concepts = getConcepts();
    const totalConcepts = concepts.length;
    const conceptsThisSession = getConceptsThisSession();
    const avgPace = getAvgPaceThisSession();
    const paceRating = getPaceRating(avgPace);

    // Timer interval
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isSessionActive && !isPaused) {
            intervalRef.current = setInterval(() => {
                tick();
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isSessionActive, isPaused, tick]);

    // Format pace as mm:ss
    const formatPace = (seconds: number) => {
        if (seconds === 0) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Get pace indicator color class
    const getPaceClass = () => {
        switch (paceRating) {
            case 'optimal': return styles.paceOptimal;
            case 'good': return styles.paceGood;
            case 'warning': return styles.paceWarning;
            case 'overtime': return styles.paceOvertime;
        }
    };

    // Get timer urgency class
    const getTimerClass = () => {
        if (timeRemainingSeconds <= 60) return styles.timerCritical;
        if (timeRemainingSeconds <= 180) return styles.timerWarning;
        return '';
    };

    if (!isSessionActive) return null;

    return (
        <AnimatePresence>
            <motion.div
                className={`${styles.container} ${sessionType === 'break' ? styles.breakMode : ''}`}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
            >
                {/* Session type indicator */}
                <div className={styles.sessionType}>
                    {sessionType === 'focus' ? (
                        <>
                            <span className={styles.sessionIcon}>🍅</span>
                            <span className={styles.sessionLabel}>Focus</span>
                        </>
                    ) : (
                        <>
                            <Coffee size={16} className={styles.breakIcon} />
                            <span className={styles.sessionLabel}>Break</span>
                        </>
                    )}
                </div>

                {/* Timer display */}
                <div className={`${styles.timerSection} ${getTimerClass()}`}>
                    <Timer size={16} className={styles.timerIcon} />
                    <span className={styles.timerValue}>{getFormattedTimeRemaining()}</span>
                </div>

                {/* Progress bar */}
                <div className={styles.progressContainer}>
                    <div
                        className={`${styles.progressBar} ${sessionType === 'break' ? styles.breakProgress : ''}`}
                        style={{ width: `${getProgressPercent()}%` }}
                    />
                </div>

                {/* Session stats (focus mode only) */}
                {sessionType === 'focus' && (
                    <div className={styles.statsSection}>
                        <div className={styles.statItem}>
                            <BookOpen size={14} />
                            <span>{conceptsThisSession}/{totalConcepts}</span>
                        </div>
                        <div className={`${styles.statItem} ${getPaceClass()}`}>
                            <Zap size={14} />
                            <span>{formatPace(avgPace)}</span>
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className={styles.controls}>
                    <button
                        className={styles.controlButton}
                        onClick={isPaused ? resumeSession : pauseSession}
                        title={isPaused ? 'Resume' : 'Pause'}
                    >
                        {isPaused ? <Play size={16} /> : <Pause size={16} />}
                    </button>

                    {sessionType === 'focus' && (
                        <button
                            className={styles.controlButton}
                            onClick={skipToBreak}
                            title="Skip to Break"
                        >
                            <Coffee size={16} />
                        </button>
                    )}

                    <button
                        className={`${styles.controlButton} ${styles.endButton}`}
                        onClick={endFocusSession}
                        title="End Session"
                    >
                        <X size={16} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
