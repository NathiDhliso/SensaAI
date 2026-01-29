import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRandomTerm, getDomainName } from '@/lib/utils/subject-domain-detector';
import styles from '@/pages/Generate.module.css';

interface CognitiveStreamProps {
    pass: number;
    intensity: number;
    isGenerating: boolean;
    subject?: string;
}

export const CognitiveStream: React.FC<CognitiveStreamProps> = ({ pass, intensity, isGenerating, subject }) => {
    const [thought, setThought] = useState('');

    // Cycle thoughts based on pass and intensity
    useEffect(() => {
        if (!isGenerating) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Valid reset when not generating
            setThought("SYSTEM_READY :: WAITING_FOR_INPUT");
            return;
        }

        const getThoughts = () => {
            const subjectName = subject || 'content';
            const domainName = getDomainName(subjectName);
            
            // Generate domain-specific terms on each call
            const nodes = getRandomTerm(subjectName, 'nodes');
            const concepts = getRandomTerm(subjectName, 'concepts');
            const structures = getRandomTerm(subjectName, 'structures');
            const processes = getRandomTerm(subjectName, 'processes');
            
            const thoughtsWithContext = {
                pass1: [
                    `SCANNING ${subjectName.toUpperCase()} ${nodes.toUpperCase()}...`,
                    `PARSING ${nodes.toUpperCase()} FOR RELEVANCE...`,
                    `DETECTING ${domainName.toUpperCase()} SEMANTIC DENSITY...`,
                    `ANALYZING ${structures.toUpperCase()}...`,
                    `ISOLATING KEY ${concepts.toUpperCase()}...`,
                    `CROSS-REFERENCING ${nodes.toUpperCase()}...`,
                    "FILTERING IRRELEVANT DATA...",
                    "FOCUSING ON CORE PATTERNS..."
                ],
                pass2: [
                    `MAPPING ${subjectName.toUpperCase()} ${structures.toUpperCase()}...`,
                    `TRACING ${processes.toUpperCase()}...`,
                    `VALIDATING ${concepts.toUpperCase()}...`,
                    `CONNECTING ${nodes.toUpperCase()}...`,
                    `IDENTIFYING ${domainName.toUpperCase()} DEPENDENCIES...`,
                    "WEAVING CONTEXTUAL RELATIONSHIPS...",
                    `CALCULATING ${concepts.toUpperCase()} ENTROPY...`,
                    "OPTIMIZING KNOWLEDGE PATHWAYS..."
                ],
                pass3: [
                    `SYNTHESIZING ${concepts.toUpperCase()}...`,
                    `STRUCTURING ${nodes.toUpperCase()}...`,
                    `ORGANIZING ${structures.toUpperCase()}...`,
                    "GENERATING RETENTION ANCHORS...",
                    `CRYSTALLIZING ${domainName.toUpperCase()} INSIGHTS...`,
                    `ENCODING ${processes.toUpperCase()}...`,
                    "VALIDATING LEARNING HIERARCHY...",
                    "FINALIZING COGNITIVE ARCHITECTURE..."
                ],
                pass4: [
                    "RUNNING FINAL DIAGNOSTICS...",
                    `VERIFYING ${concepts.toUpperCase()} INTEGRITY...`,
                    `CHECKING ${nodes.toUpperCase()} COHERENCE...`,
                    `VALIDATING ${structures.toUpperCase()}...`,
                    "OPTIMIZING TRANSFER EFFICIENCY...",
                    `CALIBRATING ${domainName.toUpperCase()} COMPLEXITY...`,
                    "FINALIZING KNOWLEDGE MAP...",
                    "PREPARING DELIVERY SEQUENCE..."
                ]
            };
            
            if (pass === 1) return thoughtsWithContext.pass1;
            if (pass === 2) return thoughtsWithContext.pass2;
            if (pass === 3) return thoughtsWithContext.pass3;
            if (pass === 4) return thoughtsWithContext.pass4;
            return [`PROCESSING ${subjectName.toUpperCase()}...`];
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
                        className={`${styles.streamBit} ${intensity > 80 ? styles.streamBitHigh : ''}`}
                        animate={{
                            height: [2, 12, 2],
                            opacity: [0.3, 1, 0.3]
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
