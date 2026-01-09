/**
 * EquationMetadataCard Component
 * 
 * Displays AI-generated equation quality baselines for content.
 * Shows Q_P, Q_M, Q_f, G baseline values with visual score bars.
 */

import { motion } from 'framer-motion';
import { Sparkles, Info } from 'lucide-react';
import type { EquationMetadata } from '@/lib/types/sensa-flow.types';
import { EQUATION_COLORS_HEX } from '@/constants/sensa-flow-constants';
import styles from './EquationMetadataCard.module.css';

// ============================================================================
// Types
// ============================================================================

interface EquationMetadataCardProps {
    metadata: EquationMetadata;
    compact?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function EquationMetadataCard({ metadata, compact = false }: EquationMetadataCardProps) {
    const variables = [
        {
            key: 'Q_P',
            label: 'Preparation Quality',
            value: metadata.Q_P.score,
            color: EQUATION_COLORS_HEX.Q_P,
            justification: metadata.Q_P.reasoning,
        },
        {
            key: 'Q_M',
            label: 'Modeling Quality',
            value: metadata.Q_M.score,
            color: EQUATION_COLORS_HEX.Q_M,
            justification: metadata.Q_M.reasoning,
        },
        {
            key: 'Q_f',
            label: 'Fluency Quality',
            value: metadata.Q_f.score,
            color: EQUATION_COLORS_HEX.Q_f,
            justification: metadata.Q_f.reasoning,
        },
        {
            key: 'G',
            label: 'Governance',
            value: metadata.G.score,
            color: EQUATION_COLORS_HEX.G,
            justification: metadata.G.reasoning,
        },
    ];

    if (compact) {
        return (
            <div className={styles.compactContainer}>
                <Sparkles size={14} />
                <span>I baseline: {(metadata.I_baseline.value * 100).toFixed(0)}%</span>
            </div>
        );
    }

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className={styles.header}>
                <Sparkles size={18} />
                <h3>AI Quality Analysis</h3>
                <div className={styles.baselineScore}>
                    I<sub>baseline</sub> = {(metadata.I_baseline.value * 100).toFixed(0)}%
                </div>
            </div>

            <div className={styles.variableList}>
                {variables.map((v, idx) => (
                    <motion.div
                        key={v.key}
                        className={styles.variableRow}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <div className={styles.variableLabel}>
                            <span className={styles.varKey} style={{ color: v.color }}>
                                {v.key}
                            </span>
                            <span className={styles.varName}>{v.label}</span>
                        </div>

                        <div className={styles.variableBar}>
                            <motion.div
                                className={styles.variableFill}
                                style={{ backgroundColor: v.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${v.value * 100}%` }}
                                transition={{ delay: idx * 0.1 + 0.2, duration: 0.4 }}
                            />
                        </div>

                        <span className={styles.variableValue}>{(v.value * 100).toFixed(0)}%</span>

                        <div className={styles.tooltip}>
                            <Info size={12} />
                            <span className={styles.tooltipText}>{v.justification}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className={styles.footer}>
                <p className={styles.footerNote}>
                    These baselines are calculated from content structure and complexity.
                </p>
            </div>
        </motion.div>
    );
}

export default EquationMetadataCard;
