import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COGNITIVE_THOUGHTS } from '@/constants/ui-constants';
import styles from '@/pages/Generate.module.css';

interface CognitiveStreamProps {
    pass: number;
    intensity: number;
    isGenerating: boolean;
}

export const CognitiveStream: React.FC<CognitiveStreamProps> = ({ pass, intensity, isGenerating }) => {
    const [thought, setThought] = useState('');

    // Cycle thoughts based on pass and intensity
    useEffect(() => {
        if (!isGenerating) {
            setThought("SYSTEM_READY :: WAITING_FOR_INPUT");
            return;
        }

        const getThoughts = () => {
            if (pass === 1) return COGNITIVE_THOUGHTS.pass1;
            if (pass === 2) return COGNITIVE_THOUGHTS.pass2;
            if (pass === 3) return COGNITIVE_THOUGHTS.pass3;
            if (pass === 4) return COGNITIVE_THOUGHTS.pass4;
            return ["PROCESSING..."];
        };

        const thoughts = getThoughts();

        // Cycle speed based on intensity (Higher intensity = faster thoughts)
        // Intensity 0 = 5000ms, Intensity 100 = 2000ms (Slower overall)
        const intervalTime = Math.max(2000, 5000 - (intensity * 30));

        let lastIndex = -1;
        const pickNextThought = () => {
            let nextIndex;
            do {
                nextIndex = Math.floor(Math.random() * thoughts.length);
            } while (nextIndex === lastIndex && thoughts.length > 1);

            lastIndex = nextIndex;
            setThought(thoughts[nextIndex]);
        };

        pickNextThought(); // Initial pick

        const intervalId = setInterval(pickNextThought, intervalTime);

        return () => clearInterval(intervalId);
    }, [pass, intensity, isGenerating]);

    return (
        <div className={styles.cognitiveStreamContainer}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={thought}
                    initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                    transition={{ duration: 0.4 }}
                    className={styles.thoughtText}
                >
                    {thought}
                </motion.div>
            </AnimatePresence>

            {/* Dynamic Wave Animation */}
            <div className={styles.streamDecoration}>
                {Array.from({ length: 48 }).map((_, i) => (
                    <motion.div
                        key={i}
                        className={styles.streamBit}
                        animate={{
                            height: [2, 12, 2],
                            opacity: [0.3, 1, 0.3],
                            backgroundColor: intensity > 80 ? '#ef4444' : '#8b5cf6'
                        }}
                        transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.05,
                            ease: "easeInOut"
                        }}
                        style={{
                            height: '2px',
                            width: '4px',
                            borderRadius: '2px'
                        }}
                    />
                ))}
            </div>
        </div>
    );
};
