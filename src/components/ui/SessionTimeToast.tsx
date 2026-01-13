/**
 * SessionTimeToast Component
 * 
 * A subtle, non-intrusive toast that appears when the user
 * has reached their selected session duration.
 * 
 * Designed to NOT interrupt flow state - dismisses easily
 * and doesn't block interaction with the main content.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Flame, X } from 'lucide-react';
import { MOMENTUM_CHECKPOINT, UI_TIMINGS } from '@/constants/ui-constants';
import styles from './SessionTimeToast.module.css';

interface SessionTimeToastProps {
    /** Target duration in minutes that was selected */
    targetMinutes: number;
    /** Callback when user clicks "Keep Going" */
    onKeepGoing: () => void;
    /** Callback when user clicks "Take a Break" */
    onTakeBreak: () => void;
    /** Callback when toast is dismissed */
    onDismiss: () => void;
}

export default function SessionTimeToast({
    targetMinutes,
    onKeepGoing,
    onTakeBreak,
    onDismiss
}: SessionTimeToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Slight delay before showing for smoother experience
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, MOMENTUM_CHECKPOINT.TIME_TOAST_DELAY_MS);

        return () => clearTimeout(timer);
    }, []);

    const handleKeepGoing = () => {
        setIsVisible(false);
        setTimeout(onKeepGoing, UI_TIMINGS.DELAY_FAST);
    };

    const handleTakeBreak = () => {
        setIsVisible(false);
        setTimeout(onTakeBreak, UI_TIMINGS.DELAY_FAST);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        setTimeout(onDismiss, UI_TIMINGS.DELAY_FAST);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className={styles.toast}
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                >
                    <div className={styles.content}>
                        <div className={styles.iconContainer}>
                            <Clock size={18} />
                        </div>
                        <div className={styles.message}>
                            <span className={styles.title}>
                                <Flame size={14} className={styles.fireIcon} />
                                You've hit your {targetMinutes}-minute goal!
                            </span>
                            <span className={styles.subtitle}>You're on fire.</span>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button className={styles.keepGoingButton} onClick={handleKeepGoing}>
                            Keep Going
                        </button>
                        <button className={styles.breakButton} onClick={handleTakeBreak}>
                            Take a Break
                        </button>
                    </div>

                    <button className={styles.closeButton} onClick={handleDismiss} title="Dismiss">
                        <X size={16} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
