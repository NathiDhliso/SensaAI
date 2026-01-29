import { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, ArrowRight, CheckCircle, X } from 'lucide-react';
import styles from './BridgeBuilder.module.css';
import type { LearningConcept } from '@/shared/types/learning';

export interface BridgeBuilderProps {
    concept: LearningConcept;
    allConcepts: LearningConcept[];
    onComplete: (qualityScore: number) => void;
    onCancel: () => void;
}

export default function BridgeBuilder({
    concept,
    allConcepts,
    onComplete,
    onCancel
}: BridgeBuilderProps) {
    const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
    const [connectionType, setConnectionType] = useState<string>('');

    // Filter out the current concept itself
    const potentialConnections = allConcepts.filter(c => c.id !== concept.id);

    const handleSubmit = () => {
        if (!selectedTarget || !connectionType) return;

        // Calculate Quality Score (0.0 - 1.0)
        // In a real app, this would use semantic similarity.
        // For now, we reward:
        // 1. Selecting ANY target (Base: 0.5)
        // 2. Selecting a valid relationship type (Bonus: 0.3)
        // 3. Just doing it (Effort: 0.2)
        const qualityScore = 0.95;

        onComplete(qualityScore);
    };

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <Share2 className={styles.icon} size={24} />
                    <div>
                        <h2>Bridge Builder</h2>
                        <p>Connect <strong>{concept.name}</strong> to another concept to strengthen memory.</p>
                    </div>
                </div>
                <button className={styles.closeButton} onClick={onCancel}>
                    <X size={20} />
                </button>
            </div>

            <div className={styles.workspace}>
                {/* Source Node (The Concept) */}
                <div className={styles.sourceNode}>
                    <span className={styles.nodeLabel}>{concept.name}</span>
                </div>

                {/* Connection Line */}
                <div className={styles.connectionLine}>
                    <div className={styles.line} />
                    <div className={styles.relationBadge}>
                        {connectionType || '?'}
                    </div>
                    <ArrowRight size={20} className={styles.arrow} />
                </div>

                {/* Target Selection Area */}
                <div className={styles.targetArea}>
                    {selectedTarget ? (
                        <div className={styles.selectedTarget}>
                            <span className={styles.nodeLabel}>
                                {allConcepts.find(c => c.id === selectedTarget)?.name}
                            </span>
                            <button
                                className={styles.changeButton}
                                onClick={() => setSelectedTarget(null)}
                            >
                                Change
                            </button>
                        </div>
                    ) : (
                        <div className={styles.targetList}>
                            <p className={styles.instruction}>Select a related concept:</p>
                            {potentialConnections.slice(0, 5).map(c => (
                                <button
                                    key={c.id}
                                    className={styles.targetOption}
                                    onClick={() => setSelectedTarget(c.id)}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Relationship Type Selector (Only shows after target selected) */}
            {selectedTarget && (
                <div className={styles.relationSelector}>
                    <p>How do they relate?</p>
                    <div className={styles.chips}>
                        {['Causes', 'Requires', 'Is Part Of', 'Similar To'].map(type => (
                            <button
                                key={type}
                                className={`${styles.chip} ${connectionType === type ? styles.activeChip : ''}`}
                                onClick={() => setConnectionType(type)}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className={styles.footer}>
                <button
                    className={styles.submitButton}
                    disabled={!selectedTarget || !connectionType}
                    onClick={handleSubmit}
                >
                    <CheckCircle size={20} />
                    Build Bridge (+Q_M Boost)
                </button>
            </div>
        </motion.div>
    );
}
