/**
 * DoorwayTransition - Cinematic transition between exterior and interior views
 * 
 * Orchestrates a smooth "entering building" sequence:
 * 1. Fade out exterior view
 * 2. Fade in blueprint grid
 * 3. Rooms appear with border animations
 * 4. Emoji concepts pop in (Foundation first)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './DoorwayTransition.module.css';

export type TransitionPhase =
    | 'idle'           // No transition
    | 'fade-out'       // Fading exterior
    | 'grid-fade-in'   // Blueprint grid appearing
    | 'rooms-draw'     // Room borders drawing
    | 'concepts-pop'   // Emojis popping in
    | 'complete';      // Transition done

export interface DoorwayTransitionProps {
    /** Whether transition is active */
    isTransitioning: boolean;
    /** Direction of transition */
    direction: 'enter' | 'exit';
    /** Callback when transition completes */
    onComplete?: () => void;
    /** Children to render during transition */
    children?: React.ReactNode;
}

/**
 * Transition phase durations in milliseconds
 */
const PHASE_DURATIONS = {
    'fade-out': 600,
    'grid-fade-in': 400,
    'rooms-draw': 800,
    'concepts-pop': 600,
} as const;

/**
 * Total transition duration
 */
export const TOTAL_TRANSITION_DURATION =
    PHASE_DURATIONS['fade-out'] +
    PHASE_DURATIONS['grid-fade-in'] +
    PHASE_DURATIONS['rooms-draw'] +
    PHASE_DURATIONS['concepts-pop'];

/**
 * Hook to manage transition phase state
 */
export function useTransitionPhase(
    isTransitioning: boolean,
    direction: 'enter' | 'exit'
): TransitionPhase {
    const [phase, setPhase] = useState<TransitionPhase>('idle');

    useEffect(() => {
        if (!isTransitioning) {
            setPhase('idle');
            return;
        }

        if (direction === 'enter') {
            // Enter sequence: fade-out → grid → rooms → concepts
            setPhase('fade-out');

            const timers = [
                setTimeout(() => setPhase('grid-fade-in'), PHASE_DURATIONS['fade-out']),
                setTimeout(() => setPhase('rooms-draw'),
                    PHASE_DURATIONS['fade-out'] + PHASE_DURATIONS['grid-fade-in']),
                setTimeout(() => setPhase('concepts-pop'),
                    PHASE_DURATIONS['fade-out'] + PHASE_DURATIONS['grid-fade-in'] + PHASE_DURATIONS['rooms-draw']),
                setTimeout(() => setPhase('complete'), TOTAL_TRANSITION_DURATION),
            ];

            return () => timers.forEach(clearTimeout);
        } else {
            // Exit sequence (reverse): fade concepts → rooms → grid → exterior
            setPhase('concepts-pop');

            const timers = [
                setTimeout(() => setPhase('rooms-draw'), PHASE_DURATIONS['concepts-pop']),
                setTimeout(() => setPhase('grid-fade-in'),
                    PHASE_DURATIONS['concepts-pop'] + PHASE_DURATIONS['rooms-draw']),
                setTimeout(() => setPhase('fade-out'),
                    PHASE_DURATIONS['concepts-pop'] + PHASE_DURATIONS['rooms-draw'] + PHASE_DURATIONS['grid-fade-in']),
                setTimeout(() => setPhase('complete'), TOTAL_TRANSITION_DURATION),
            ];

            return () => timers.forEach(clearTimeout);
        }
    }, [isTransitioning, direction]);

    return phase;
}

/**
 * DoorwayTransition component
 * Wraps content with transition overlay effects
 */
export function DoorwayTransition({
    isTransitioning,
    direction,
    onComplete,
    children,
}: DoorwayTransitionProps) {
    const phase = useTransitionPhase(isTransitioning, direction);

    // Call onComplete when transition finishes
    useEffect(() => {
        if (phase === 'complete' && onComplete) {
            onComplete();
        }
    }, [phase, onComplete]);

    const isEntering = direction === 'enter';

    return (
        <div className={styles.transitionContainer}>
            {/* Content layer */}
            <div className={styles.contentLayer}>
                {children}
            </div>

            {/* Transition overlay */}
            <AnimatePresence>
                {isTransitioning && phase !== 'complete' && (
                    <motion.div
                        className={styles.overlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Dark vignette during fade */}
                        {(phase === 'fade-out' || (phase === 'grid-fade-in' && !isEntering)) && (
                            <motion.div
                                className={styles.vignette}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.9 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                            />
                        )}

                        {/* Blueprint grid emerging */}
                        {(phase === 'grid-fade-in' || phase === 'rooms-draw' || phase === 'concepts-pop') && isEntering && (
                            <motion.div
                                className={styles.blueprintGrid}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                transition={{ duration: 0.4 }}
                            >
                                <svg className={styles.gridSvg} viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <defs>
                                        <pattern id="transitionGrid" width="5" height="5" patternUnits="userSpaceOnUse">
                                            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="var(--overlay-primary-10)" strokeWidth="0.5" />
                                        </pattern>
                                    </defs>
                                    <rect width="100" height="100" fill="url(#transitionGrid)" />
                                </svg>
                            </motion.div>
                        )}

                        {/* "Entering" text indicator */}
                        {phase === 'fade-out' && isEntering && (
                            <motion.div
                                className={styles.enteringIndicator}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.4, delay: 0.2 }}
                            >
                                <span className={styles.doorIcon}>🚪</span>
                                <span className={styles.enteringText}>Entering Mind Palace...</span>
                            </motion.div>
                        )}

                        {/* "Exiting" text indicator */}
                        {phase === 'concepts-pop' && !isEntering && (
                            <motion.div
                                className={styles.enteringIndicator}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.4 }}
                            >
                                <span className={styles.doorIcon}>🏠</span>
                                <span className={styles.enteringText}>Returning to Exterior...</span>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default DoorwayTransition;
