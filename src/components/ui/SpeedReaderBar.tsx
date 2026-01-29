/**
 * SpeedReaderBar Component
 * 
 * A 2-minute timer bar that tracks concept reading pace.
 * Provides visual feedback to encourage optimal 2-minute per concept timing.
 * 
 * Now integrated with focus-session store to report concept timing
 * for unified session analytics.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Clock, Zap, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import { formatTime } from '@/shared/utils/utils';
import styles from './SpeedReaderBar.module.css';

interface SpeedReaderBarProps {
    /** Unique ID for the current concept (resets timer on change) */
    conceptId: string;
    /** Target time in seconds (default: 120 = 2 minutes) */
    targetTimeSeconds?: number;
    /** Whether the timer is paused */
    paused?: boolean;
    /** Callback when target time is reached */
    onTargetReached?: () => void;
}

type PaceStatus = 'optimal' | 'good' | 'warning' | 'overtime';

export default function SpeedReaderBar({
    conceptId,
    targetTimeSeconds = 120,
    paused = false,
    onTargetReached,
}: SpeedReaderBarProps) {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [hasReachedTarget, setHasReachedTarget] = useState(false);
    const [isMinimized, setIsMinimized] = useState(true);  // Start minimized to reduce distraction
    const prevConceptId = useRef<string>(conceptId);

    // Focus session integration (merged into learning store)
    const { isSessionActive, recordConceptStart, recordConceptEnd, getConcepts } = useLearningStore();

    // Get concept name for session tracking
    const getConceptName = useCallback((id: string) => {
        const concepts = getConcepts();
        return concepts.find(c => c.id === id)?.name || id;
    }, [getConcepts]);

    // Report concept start when concept changes and session is active
    useEffect(() => {
        if (conceptId !== prevConceptId.current) {
            // End previous concept if session is active
            if (isSessionActive && prevConceptId.current) {
                recordConceptEnd(prevConceptId.current, false);
            }

            // Reset local timer
            setElapsedSeconds(0);
            setHasReachedTarget(false);

            // Start tracking new concept if session is active
            if (isSessionActive) {
                recordConceptStart(conceptId, getConceptName(conceptId));
            }

            prevConceptId.current = conceptId;
        }
    }, [conceptId, isSessionActive, recordConceptStart, recordConceptEnd, getConceptName]);

    // Start tracking on mount if session already active
    useEffect(() => {
        if (isSessionActive && conceptId) {
            recordConceptStart(conceptId, getConceptName(conceptId));
        }

        // Cleanup: end concept tracking on unmount
        return () => {
            if (isSessionActive && conceptId) {
                recordConceptEnd(conceptId, false);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only on mount/unmount

    // Timer tick
    useEffect(() => {
        if (paused) return;

        const interval = setInterval(() => {
            setElapsedSeconds(prev => {
                const next = prev + 1;

                // Check if we just hit the target
                if (next === targetTimeSeconds && !hasReachedTarget) {
                    setHasReachedTarget(true);
                    onTargetReached?.();
                }

                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [paused, targetTimeSeconds, hasReachedTarget, onTargetReached]);

    // Calculate progress percentage (capped at 100%)
    const progressPercent = Math.min((elapsedSeconds / targetTimeSeconds) * 100, 100);

    // Determine pace status
    const getPaceStatus = (): PaceStatus => {
        const ratio = elapsedSeconds / targetTimeSeconds;
        if (ratio <= 0.5) return 'optimal';  // Under 1 minute
        if (ratio <= 0.85) return 'good';    // Under 1:42
        if (ratio <= 1) return 'warning';    // Under 2 minutes
        return 'overtime';                    // Over 2 minutes
    };

    const paceStatus = getPaceStatus();

    // Get status message
    const getStatusMessage = () => {
        switch (paceStatus) {
            case 'optimal':
                return 'Great pace!';
            case 'good':
                return 'On track';
            case 'warning':
                return 'Almost there';
            case 'overtime':
                return 'Take your time';
        }
    };

    // Get status icon
    const StatusIcon = () => {
        switch (paceStatus) {
            case 'optimal':
                return <Zap className={styles.statusIcon} />;
            case 'good':
                return <CheckCircle2 className={styles.statusIcon} />;
            case 'warning':
                return <Clock className={styles.statusIcon} />;
            case 'overtime':
                return <AlertTriangle className={styles.statusIcon} />;
        }
    };

    return (
        <div className={`${styles.container} ${isMinimized ? styles.minimized : ''}`}>
            <button
                className={styles.toggleButton}
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand timer' : 'Minimize timer'}
            >
                {isMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>

            {isMinimized ? (
                <div className={`${styles.minimizedView} ${styles[paceStatus]}`}>
                    <StatusIcon />
                    <span className={styles.minimizedStatus}>{getStatusMessage()}</span>
                    <span className={styles.minimizedTime}>{formatTime(elapsedSeconds)}</span>
                </div>
            ) : (
                <>
                    <div className={styles.label}>
                        <span className={styles.labelLeft}>
                            <Clock className={styles.icon} />
                            Reading Time
                        </span>
                        <span className={styles.time}>
                            {formatTime(elapsedSeconds)} / {formatTime(targetTimeSeconds)}
                        </span>
                    </div>

                    <div className={styles.barContainer}>
                        <div
                            className={`${styles.barFill} ${styles[paceStatus]}`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    <div className={`${styles.status} ${styles[paceStatus]}`}>
                        <StatusIcon />
                        {getStatusMessage()}
                    </div>
                </>
            )}
        </div>
    );
}
