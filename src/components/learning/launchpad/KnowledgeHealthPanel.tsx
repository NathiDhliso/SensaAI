/**
 * KnowledgeHealthPanel — Enhancement C, Layer 2
 *
 * Expandable section inside ContentLaunchpad showing per-concept decay bars.
 * Each row: concept name, retention %, due date, OVERDUE if applicable.
 * Cluster detection: if ≥3 related concepts are all red → targeted review CTA.
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Activity, AlertTriangle } from 'lucide-react';
import type { DecayStatus } from '@/features/learning-session/algorithms/spacing-engine';
import styles from './KnowledgeHealthPanel.module.css';

export interface ConceptHealth {
    id: string;
    name: string;
    /** 0-100 retention estimate */
    retention: number;
    decay: DecayStatus;
    /** ISO date or 'OVERDUE' */
    dueLabel: string;
}

interface KnowledgeHealthPanelProps {
    concepts: ConceptHealth[];
    onLaunchTargetedReview?: (conceptIds: string[]) => void;
}

export function KnowledgeHealthPanel({ concepts, onLaunchTargetedReview }: KnowledgeHealthPanelProps) {
    const [isOpen, setIsOpen] = useState(false);

    const sorted = useMemo(() =>
        [...concepts].sort((a, b) => a.retention - b.retention),
        [concepts]
    );

    const forgottenCluster = useMemo(() => {
        const forgotten = concepts.filter(c => c.decay === 'forgotten');
        return forgotten.length >= 3 ? forgotten : [];
    }, [concepts]);

    const retentionColor = (pct: number) => {
        if (pct >= 70) return 'var(--color-success)';
        if (pct >= 40) return 'var(--color-warning)';
        return 'var(--color-error)';
    };

    if (concepts.length === 0) return null;

    return (
        <div className={styles.container}>
            <div className={styles.header} onClick={() => setIsOpen(o => !o)}>
                <div className={styles.headerLeft}>
                    <Activity size={16} className={styles.headerIcon} />
                    <span>Knowledge Health Detail</span>
                </div>
                <ChevronDown
                    size={16}
                    className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                />
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={styles.body}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {sorted.map(c => (
                            <div key={c.id} className={styles.conceptRow}>
                                <span className={styles.conceptName}>{c.name}</span>
                                <div className={styles.retentionBar}>
                                    <div
                                        className={styles.retentionFill}
                                        style={{
                                            width: `${c.retention}%`,
                                            background: retentionColor(c.retention)
                                        }}
                                    />
                                </div>
                                <span
                                    className={styles.retentionPct}
                                    style={{ color: retentionColor(c.retention) }}
                                >
                                    {c.retention}%
                                </span>
                                <span className={`${styles.dueLabel} ${c.dueLabel === 'OVERDUE' ? styles.overdue : ''}`}>
                                    {c.dueLabel}
                                </span>
                            </div>
                        ))}

                        {forgottenCluster.length >= 3 && onLaunchTargetedReview && (
                            <div className={styles.clusterAlert}>
                                <AlertTriangle size={16} />
                                <span>{forgottenCluster.length} related concepts need attention</span>
                                <button
                                    className={styles.clusterButton}
                                    onClick={() => onLaunchTargetedReview(forgottenCluster.map(c => c.id))}
                                >
                                    Launch Targeted Review
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default KnowledgeHealthPanel;
