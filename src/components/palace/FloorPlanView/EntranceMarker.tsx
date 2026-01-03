/**
 * EntranceMarker - Glowing door indicator on exterior view
 * 
 * Placed on the Street View panorama to indicate where users
 * can click to enter the Mind Palace interior (Floor Plan).
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './EntranceMarker.module.css';

export interface EntranceMarkerProps {
    /** Callback when entrance is clicked */
    onEnter: () => void;
    /** Whether the entrance is currently accessible */
    isEnabled?: boolean;
    /** Custom position (0-100 percent based) */
    position?: { x: number; y: number };
}

/**
 * EntranceMarker renders a glowing door icon that triggers
 * the transition into the Floor Plan view.
 */
export function EntranceMarker({
    onEnter,
    isEnabled = true,
    position = { x: 50, y: 80 },
}: EntranceMarkerProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            className={styles.entranceMarker}
            style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
            }}
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={isEnabled ? onEnter : undefined}
        >
            {/* Outer glow ring */}
            <motion.div
                className={styles.glowRing}
                animate={{
                    scale: isHovered ? 1.3 : [1, 1.15, 1],
                    opacity: isHovered ? 0.8 : [0.4, 0.6, 0.4],
                }}
                transition={{
                    duration: isHovered ? 0.2 : 2,
                    repeat: isHovered ? 0 : Infinity,
                    ease: 'easeInOut',
                }}
            />

            {/* Door icon */}
            <motion.div
                className={styles.doorIcon}
                animate={{
                    scale: isHovered ? 1.1 : 1,
                }}
                transition={{ duration: 0.2 }}
            >
                🚪
            </motion.div>

            {/* Tooltip */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        className={styles.tooltip}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                    >
                        <span className={styles.tooltipText}>Enter Floor Plan</span>
                        <span className={styles.tooltipHint}>Click to explore interior</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Particle effects on hover */}
            <AnimatePresence>
                {isHovered && (
                    <>
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                className={styles.particle}
                                initial={{
                                    opacity: 0,
                                    x: 0,
                                    y: 0,
                                    scale: 0,
                                }}
                                animate={{
                                    opacity: [0, 1, 0],
                                    x: Math.cos((i / 6) * Math.PI * 2) * 40,
                                    y: Math.sin((i / 6) * Math.PI * 2) * 40,
                                    scale: [0, 1, 0],
                                }}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    delay: i * 0.1,
                                }}
                            />
                        ))}
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default EntranceMarker;
