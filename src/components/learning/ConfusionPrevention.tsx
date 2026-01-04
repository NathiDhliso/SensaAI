/**
 * SensaAI Confusion Prevention System
 * 
 * Implements confusion risk detection and clarification drills.
 * Uses 60% similarity threshold for triggering confusion prevention.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
    Lightbulb,
    Split
} from 'lucide-react';
import type { LearningConcept } from '@/lib/types/learning';
import styles from './ConfusionPrevention.module.css';

// ============================================================================
// TYPES
// ============================================================================

export interface ConfusionPair {
    concept1: LearningConcept;
    concept2: LearningConcept;
    similarityScore: number;
    confusingAspects: string[];
}

export interface ConfusionDrillResult {
    pairId: string;
    identified: boolean;
    keyDifferences: string[];
    exampleProvided: boolean;
    timeSpent: number;
    markedResistant: boolean;
}

export interface ConfusionPreventionProps {
    /** Current concept just completed */
    currentConcept: LearningConcept;
    /** All concepts for comparison */
    allConcepts: LearningConcept[];
    /** Confusion threshold (default 0.6 = 60%) */
    threshold?: number;
    /** Callback when drill completes */
    onDrillComplete: (result: ConfusionDrillResult) => void;
    /** Callback to skip drill */
    onSkip: () => void;
}

// ============================================================================
// CONFUSION DETECTION
// ============================================================================

/**
 * Calculate similarity between two concepts
 * Returns score 0-1 (1 = identical)
 */
function calculateConceptSimilarity(
    concept1: LearningConcept,
    concept2: LearningConcept
): number {
    let score = 0;
    let factors = 0;

    // Name similarity
    const name1Words = concept1.name.toLowerCase().split(/\s+/);
    const name2Words = concept2.name.toLowerCase().split(/\s+/);
    const nameOverlap = name1Words.filter(w => name2Words.includes(w)).length;
    score += (nameOverlap / Math.max(name1Words.length, name2Words.length)) * 0.3;
    factors++;

    // Category/stage similarity
    if (concept1.stageId === concept2.stageId) {
        score += 0.2;
    }
    factors++;

    // Hook sentence word overlap
    if (concept1.hookSentence && concept2.hookSentence) {
        const hook1Words = concept1.hookSentence.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const hook2Words = concept2.hookSentence.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const hookOverlap = hook1Words.filter(w => hook2Words.some(hw => hw.includes(w))).length;
        score += (hookOverlap / Math.max(hook1Words.length, hook2Words.length, 1)) * 0.2;
    }
    factors++;

    // How-to-use overlap
    if (concept1.howToUse?.length && concept2.howToUse?.length) {
        const use1 = concept1.howToUse.join(' ').toLowerCase();
        const use2 = concept2.howToUse.join(' ').toLowerCase();
        const use1Words = use1.split(/\s+/).filter(w => w.length > 3);
        const use2Words = use2.split(/\s+/).filter(w => w.length > 3);
        const useOverlap = use1Words.filter(w => use2Words.some(uw => uw.includes(w))).length;
        score += (useOverlap / Math.max(use1Words.length, use2Words.length, 1)) * 0.3;
    }
    factors++;

    return Math.min(1, score);
}

/**
 * Identify confusing aspects between two concepts
 */
function identifyConfusingAspects(
    concept1: LearningConcept,
    concept2: LearningConcept
): string[] {
    const aspects: string[] = [];

    // Similar names
    if (concept1.name.toLowerCase().includes(concept2.name.toLowerCase()) ||
        concept2.name.toLowerCase().includes(concept1.name.toLowerCase())) {
        aspects.push('Similar names');
    }

    // Same category
    if (concept1.stageId === concept2.stageId) {
        aspects.push('Same category');
    }

    // Similar purpose
    if (concept1.hookSentence && concept2.hookSentence) {
        const commonWords = concept1.hookSentence.toLowerCase().split(/\s+/)
            .filter(w => w.length > 4 && concept2.hookSentence?.toLowerCase().includes(w));
        if (commonWords.length > 2) {
            aspects.push('Similar purpose');
        }
    }

    return aspects;
}

/**
 * Find confusion pairs for a concept
 */
export function findConfusionPairs(
    concept: LearningConcept,
    allConcepts: LearningConcept[],
    threshold: number = 0.6
): ConfusionPair[] {
    return allConcepts
        .filter(c => c.id !== concept.id)
        .map(other => ({
            concept1: concept,
            concept2: other,
            similarityScore: calculateConceptSimilarity(concept, other),
            confusingAspects: identifyConfusingAspects(concept, other),
        }))
        .filter(pair => pair.similarityScore >= threshold)
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, 3); // Max 3 confusion pairs
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ConfusionPrevention({
    currentConcept,
    allConcepts,
    threshold = 0.6,
    onDrillComplete,
    onSkip,
}: ConfusionPreventionProps) {
    const [currentPairIndex, setCurrentPairIndex] = useState(0);
    const [userDifferences, setUserDifferences] = useState('');
    const [userExample, setUserExample] = useState('');
    const [startTime] = useState(Date.now());
    const [showSuccess, setShowSuccess] = useState(false);

    // Find confusion pairs
    const confusionPairs = useMemo(() =>
        findConfusionPairs(currentConcept, allConcepts, threshold),
        [currentConcept, allConcepts, threshold]
    );

    const currentPair = confusionPairs[currentPairIndex];

    // If no confusion pairs, skip
    if (confusionPairs.length === 0) {
        return null;
    }

    const handleSubmit = useCallback(() => {
        const timeSpent = (Date.now() - startTime) / 1000;
        const differences = userDifferences.split(/[,\n]/).filter(d => d.trim().length > 0);

        const result: ConfusionDrillResult = {
            pairId: `${currentPair.concept1.id}-${currentPair.concept2.id}`,
            identified: differences.length >= 2,
            keyDifferences: differences,
            exampleProvided: userExample.trim().length >= 20,
            timeSpent,
            markedResistant: differences.length >= 2 && userExample.trim().length >= 20,
        };

        if (currentPairIndex < confusionPairs.length - 1) {
            // Show success briefly then move to next
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                setCurrentPairIndex(prev => prev + 1);
                setUserDifferences('');
                setUserExample('');
            }, 1000);
        } else {
            // All pairs done
            onDrillComplete(result);
        }
    }, [currentPair, userDifferences, userExample, startTime, currentPairIndex, confusionPairs.length, onDrillComplete]);

    const isValid = userDifferences.trim().length >= 20 && userExample.trim().length >= 10;

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className={styles.header}>
                <AlertTriangle size={24} className={styles.warningIcon} />
                <div>
                    <h2 className={styles.title}>Confusion Prevention</h2>
                    <p className={styles.subtitle}>
                        These concepts are similar ({Math.round(currentPair.similarityScore * 100)}% match).
                        Let's clarify the differences.
                    </p>
                </div>
                <span className={styles.progress}>
                    {currentPairIndex + 1}/{confusionPairs.length}
                </span>
            </div>

            {/* Side by side comparison */}
            <div className={styles.comparison}>
                <div className={styles.conceptCard}>
                    <span className={styles.conceptIcon}>{currentPair.concept1.icon}</span>
                    <h3>{currentPair.concept1.name}</h3>
                    <p>{currentPair.concept1.hookSentence}</p>
                </div>

                <div className={styles.vs}>
                    <Split size={20} />
                    <span>VS</span>
                </div>

                <div className={styles.conceptCard}>
                    <span className={styles.conceptIcon}>{currentPair.concept2.icon}</span>
                    <h3>{currentPair.concept2.name}</h3>
                    <p>{currentPair.concept2.hookSentence}</p>
                </div>
            </div>

            {/* Confusing aspects */}
            {currentPair.confusingAspects.length > 0 && (
                <div className={styles.aspectsRow}>
                    <Lightbulb size={16} />
                    <span>Why they might be confused: {currentPair.confusingAspects.join(', ')}</span>
                </div>
            )}

            {/* Drill inputs */}
            <div className={styles.drillSection}>
                <div className={styles.inputGroup}>
                    <label>What are the KEY DIFFERENCES? (list at least 2)</label>
                    <textarea
                        value={userDifferences}
                        onChange={(e) => setUserDifferences(e.target.value)}
                        placeholder="1. The first concept focuses on...&#10;2. The second concept is used for..."
                        rows={3}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>Give an example where you'd use ONE but NOT the other</label>
                    <textarea
                        value={userExample}
                        onChange={(e) => setUserExample(e.target.value)}
                        placeholder="I would use [concept 1] when... but [concept 2] when..."
                        rows={2}
                    />
                </div>
            </div>

            {/* Success overlay */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        className={styles.successOverlay}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <CheckCircle2 size={48} />
                        <span>Great clarification!</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Actions */}
            <div className={styles.actions}>
                <button
                    className={styles.submitButton}
                    onClick={handleSubmit}
                    disabled={!isValid}
                >
                    <span>Mark as Confusion-Resistant</span>
                    <ArrowRight size={18} />
                </button>
                <button className={styles.skipButton} onClick={onSkip}>
                    Skip for now
                </button>
            </div>
        </motion.div>
    );
}

export default ConfusionPrevention;
