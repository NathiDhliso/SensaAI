/**
 * NeuralResetBanner Component
 * 
 * Displays simplified analogy content when Blank Sheet Test score < 60%.
 * Uses concept.simpleCore as the remediation content.
 * Part of Mastery Branching for struggling students.
 */

import { motion } from 'framer-motion';
import { Brain, Lightbulb, RefreshCw } from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import styles from './NeuralResetBanner.module.css';

interface NeuralResetBannerProps {
    /** Concept that needs remediation */
    concept: LearningConcept;
    /** Score from the failed blank sheet test */
    failedScore: number;
    /** Callback to retry the test */
    onRetry: () => void;
}

export function NeuralResetBanner({
    concept,
    failedScore,
    onRetry,
}: NeuralResetBannerProps) {
    // Get simplified content from concept's SHAPE data
    const simpleCore = concept.shape?.simpleCore || concept.hookSentence || null;
    const analogicalModel = concept.shape?.analogicalModel || null;

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className={styles.header}>
                <div className={styles.iconWrapper}>
                    <Brain size={24} />
                </div>
                <div>
                    <h2 className={styles.title}>Neural Reset</h2>
                    <p className={styles.subtitle}>
                        Score: {failedScore}% — Let's simplify and try again
                    </p>
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.conceptCard}>
                    <h3 className={styles.conceptName}>{concept.name}</h3>

                    {simpleCore && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <Lightbulb size={16} />
                                <span>Simple Core</span>
                            </div>
                            <p className={styles.sectionContent}>{simpleCore}</p>
                        </div>
                    )}

                    {analogicalModel && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <Brain size={16} />
                                <span>Think of it like...</span>
                            </div>
                            <p className={styles.analogyContent}>"{analogicalModel}"</p>
                        </div>
                    )}

                    {!simpleCore && !analogicalModel && (
                        <div className={styles.fallbackContent}>
                            <p>Take a moment to review the key points:</p>
                            {concept.keyPoints && (
                                <ul className={styles.keyPointsList}>
                                    {concept.keyPoints.slice(0, 3).map((point, idx) => (
                                        <li key={idx}>{point}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.encouragement}>
                    <p>
                        💡 <strong>Don't worry!</strong> This is completely normal.
                        Knowledge sticks better when we encounter it multiple times.
                    </p>
                </div>

                <button className={styles.retryButton} onClick={onRetry}>
                    <RefreshCw size={18} />
                    Try Blank Sheet Again
                </button>
            </div>
        </motion.div>
    );
}

export default NeuralResetBanner;
