import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    TrendingUp,
    Lightbulb,
    Gauge,
} from 'lucide-react';
import type { SubjectType } from '@/shared/types/macro-workflow';
import { SUBJECT_TYPE_META } from '@/shared/types/macro-workflow';
import type { TypeAwareQMetrics, FeedbackSignal } from '@/shared/services/blueprint-formula';
import type { SensaPhase } from '@/shared/types/sensa-flow';
import styles from './BlueprintFormulaDashboard.module.css';

interface BlueprintFormulaDashboardProps {
    subjectType: SubjectType | undefined;
    G: number;
    gBaseline: number;
    Q_f: number;
    Q_M: number;
    Q_P: number;
    I: number;
    phase: SensaPhase;
    qLabels: { Q_f: string; Q_M: string; Q_P: string };
    typeAwareMetrics: TypeAwareQMetrics | null;
    feedbackSignal: FeedbackSignal | null;
    recommendation: string;
    weakestVariable: { variable: 'G' | 'Q_P' | 'Q_M' | 'Q_f'; value: number };
}

export function BlueprintFormulaDashboard({
    subjectType,
    G,
    gBaseline,
    Q_f,
    Q_M,
    Q_P,
    I,
    qLabels,
    feedbackSignal,
    recommendation,
    weakestVariable,
}: BlueprintFormulaDashboardProps) {
    const typeMeta = subjectType ? SUBJECT_TYPE_META[subjectType] : null;
    const efficiencyPercent = Math.round(I * 100);

    const gDelta = useMemo(() => {
        const diff = G - gBaseline;
        if (Math.abs(diff) < 0.01) return null;
        return diff;
    }, [G, gBaseline]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Gauge size={18} />
                <span className={styles.headerTitle}>Blueprint-Formula</span>
                {typeMeta && (
                    <span className={styles.typeBadge} style={{ backgroundColor: typeMeta.color + '20', color: typeMeta.color }}>
                        {typeMeta.icon} {typeMeta.label}
                    </span>
                )}
            </div>

            <div className={styles.gSection}>
                <div className={styles.gRow}>
                    <span className={styles.gLabel}>Generation (G)</span>
                    <span className={styles.gValue}>
                        {(G * 100).toFixed(0)}%
                        {gDelta !== null && (
                            <span className={gDelta > 0 ? styles.gPositive : styles.gNegative}>
                                {gDelta > 0 ? '+' : ''}{(gDelta * 100).toFixed(0)}%
                            </span>
                        )}
                    </span>
                </div>
                <div className={styles.barTrack}>
                    <motion.div
                        className={styles.barFill}
                        style={{ backgroundColor: 'var(--color-governance, #6366f1)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${G * 100}%` }}
                        transition={{ duration: 0.6 }}
                    />
                </div>
            </div>

            <div className={styles.metricsGrid}>
                <MetricRow label={qLabels.Q_f} variable="Q_f" value={Q_f} isWeakest={weakestVariable.variable === 'Q_f'} />
                <MetricRow label={qLabels.Q_M} variable="Q_M" value={Q_M} isWeakest={weakestVariable.variable === 'Q_M'} />
                <MetricRow label={qLabels.Q_P} variable="Q_P" value={Q_P} isWeakest={weakestVariable.variable === 'Q_P'} />
            </div>

            <div className={styles.efficiencyRow}>
                <span className={styles.efficiencyLabel}>
                    <TrendingUp size={14} />
                    Effective Learning (I)
                </span>
                <span className={styles.efficiencyValue}>{efficiencyPercent}%</span>
            </div>

            {feedbackSignal?.isStrugglingWithBlueprint && feedbackSignal.suggestion && (
                <motion.div
                    className={styles.alertBox}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                >
                    <AlertTriangle size={16} className={styles.alertIcon} />
                    <p className={styles.alertText}>{feedbackSignal.suggestion}</p>
                </motion.div>
            )}

            {recommendation && !feedbackSignal?.isStrugglingWithBlueprint && (
                <div className={styles.insightBox}>
                    <Lightbulb size={14} className={styles.insightIcon} />
                    <p className={styles.insightText}>{recommendation}</p>
                </div>
            )}
        </div>
    );
}

function MetricRow({ label, variable, value, isWeakest }: {
    label: string;
    variable: string;
    value: number;
    isWeakest: boolean;
}) {
    const percent = Math.round(value * 100);
    const colorVar = `var(--color-${variable === 'Q_f' ? 'fluency' : variable === 'Q_M' ? 'modeling' : 'preparation'}, #888)`;

    return (
        <div className={`${styles.metricRow} ${isWeakest ? styles.weakest : ''}`}>
            <span className={styles.metricLabel}>
                {label}
                {isWeakest && <span className={styles.weakBadge}>weakest</span>}
            </span>
            <div className={styles.barTrack}>
                <motion.div
                    className={styles.barFill}
                    style={{ backgroundColor: colorVar }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.6 }}
                />
            </div>
            <span className={styles.metricValue}>{percent}%</span>
        </div>
    );
}
