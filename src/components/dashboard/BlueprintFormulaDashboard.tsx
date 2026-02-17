/**
 * BlueprintFormulaDashboard Component
 *
 * Unified Learning Health panel — collapsible from the toolbar.
 * I = min(h, Q_k × Q_r × Q_c × Q_f × Q_p)
 *
 * Merges the old EquationTracker (progress bar, grind warning) with
 * the detailed Q-variable breakdown into one expandable panel.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Info, Target, AlertTriangle } from 'lucide-react';
import type { HealthVariable } from '@/shared/constants/sensa-flow-constants';
import { EQUATION_COLORS, HEALTH_THRESHOLD } from '@/shared/constants/sensa-flow-constants';
import type { LearnerQMetrics, FeedbackSignal } from '@/shared/services/blueprint-formula';
import type { SubjectType } from '@/shared/types/macro-workflow';
import type { SensaPhase } from '@/shared/types/sensa-flow';
import styles from './BlueprintFormulaDashboard.module.css';

export interface BlueprintFormulaDashboardProps {
    h: number;
    I: number;
    phase: SensaPhase;
    metrics: LearnerQMetrics | null;
    weakestVariable: { variable: HealthVariable; value: number };
    recommendation: string;
    subjectType: SubjectType | undefined;
    feedbackSignal: FeedbackSignal | null;
}

const VARIABLE_CONFIG: Record<HealthVariable, { symbol: string; color: string }> = {
    Q_k: { symbol: 'Q_k', color: EQUATION_COLORS.Q_k },
    Q_r: { symbol: 'Q_r', color: EQUATION_COLORS.Q_r },
    Q_c: { symbol: 'Q_c', color: EQUATION_COLORS.Q_c },
    Q_f: { symbol: 'Q_f', color: EQUATION_COLORS.Q_f },
    Q_p: { symbol: 'Q_p', color: EQUATION_COLORS.Q_p }
};

export function BlueprintFormulaDashboard({
    h,
    I,
    phase,
    metrics,
    weakestVariable,
    recommendation,
    subjectType,
    feedbackSignal
}: BlueprintFormulaDashboardProps) {
    if (!metrics) return null;

    const healthPercent = Math.round(I * 100);
    const isGrindingFutile = phase === 'study' && metrics.Q_p < 0.2;

    const rows: { key: HealthVariable; value: number; label: string }[] = [
        { key: 'Q_k', value: metrics.Q_k, label: metrics.labels.Q_k },
        { key: 'Q_r', value: metrics.Q_r, label: metrics.labels.Q_r },
        { key: 'Q_c', value: metrics.Q_c, label: metrics.labels.Q_c },
        { key: 'Q_f', value: metrics.Q_f, label: metrics.labels.Q_f },
        { key: 'Q_p', value: metrics.Q_p, label: metrics.labels.Q_p }
    ];

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
            <div className={styles.header}>
                <span className={styles.headerTitle}>Learning Health Diagnostics</span>
                {subjectType && (
                    <span className={styles.typeBadge}>
                        {subjectType}
                    </span>
                )}
            </div>

            <div className={styles.progressContainer}>
                <div className={styles.progressTrack}>
                    <motion.div
                        className={styles.progressFill}
                        initial={{ width: 0 }}
                        animate={{ width: `${healthPercent}%` }}
                        transition={{ duration: 0.5 }}
                    />
                    <div
                        className={styles.healthTarget}
                        style={{ left: `${HEALTH_THRESHOLD * 100}%` }}
                    >
                        <Target size={10} />
                    </div>
                </div>
                <span className={styles.progressLabel}>
                    {healthPercent}% to healthy
                </span>
            </div>

            <div className={styles.metricsGrid}>
                {rows.map(({ key, value, label }) => {
                    const isWeakest = weakestVariable.variable === key;
                    const percent = Math.round(value * 100);
                    const config = VARIABLE_CONFIG[key];

                    return (
                        <div
                            key={key}
                            className={`${styles.metricRow} ${isWeakest ? styles.weakest : ''}`}
                        >
                            <div className={styles.metricLabel}>
                                <span className={styles.labelName}>{label}</span>
                                <span className={styles.labelSymbol}>{config.symbol}</span>
                            </div>

                            <div className={styles.barTrack}>
                                <motion.div
                                    className={styles.barFill}
                                    style={{ backgroundColor: config.color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percent}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>

                            <span className={styles.metricValue}>{percent}%</span>
                        </div>
                    );
                })}

                <div className={styles.moodRow}>
                    <span className={styles.moodLabel}>Cognitive Bandwidth (h)</span>
                    <span className={styles.moodValue}>{Math.round(h * 100)}%</span>
                </div>
            </div>

            {recommendation && (
                <motion.div
                    className={styles.recommendationBox}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className={styles.recHeader}>
                        <Lightbulb size={14} />
                        <span>Focus Area</span>
                    </div>
                    <p className={styles.recText}>{recommendation}</p>
                </motion.div>
            )}

            <AnimatePresence>
                {isGrindingFutile && (
                    <motion.div
                        className={styles.grindWarning}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        <AlertTriangle size={16} className={styles.warnIcon} />
                        <div>
                            <strong>Process quality is critically low</strong>
                            <p className={styles.warnText}>
                                You may be skipping steps or rushing through phases.
                                Take a moment to follow the learning loop.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {feedbackSignal?.isStrugglingWithBlueprint && (
                <motion.div
                    className={styles.alertBox}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Info size={16} className={styles.alertIcon} />
                    <div className={styles.alertContent}>
                        <span className={styles.alertTitle}>Strategy Adjustment</span>
                        <p className={styles.alertText}>{feedbackSignal.suggestion}</p>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

export default BlueprintFormulaDashboard;
