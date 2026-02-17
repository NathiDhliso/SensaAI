/**
 * EquationTracker Component
 * 
 * Real-time visualization of the Learning Health Equation:
 * I = min(h, Q_k × Q_r × Q_c × Q_f × Q_p)
 * 
 * Shows current values and highlights the weakest variable.
 * Proactive intervention when Q_p is critically low (< 0.2) during Study phase.
 *
 * This measures ONLY the learner — not the AI, not the platform.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import { Z_INDEX } from '@/shared/constants/z-index';
import type { SensaPhase } from '@/shared/types/sensa-flow';
import type { HealthVariable } from '@/shared/constants/sensa-flow-constants';
import { EQUATION_COLORS, HEALTH_THRESHOLD } from '@/shared/constants/sensa-flow-constants';
import styles from './EquationTracker.module.css';

interface EquationTrackerProps {
    h: number;
    Q_k: number;
    Q_r: number;
    Q_c: number;
    Q_f: number;
    Q_p: number;
    I: number;
    phase: SensaPhase;
    weakestVariable: { variable: HealthVariable; value: number };
    recommendation: string;
    qLabels: { Q_k: string; Q_r: string; Q_c: string; Q_f: string; Q_p: string };
}

const VARIABLE_INFO: Record<HealthVariable, { label: string; symbol: string }> = {
    Q_k: { label: 'Prior Knowledge', symbol: 'Qₖ' },
    Q_r: { label: 'Recall Quality', symbol: 'Qᵣ' },
    Q_c: { label: 'Connection Quality', symbol: 'Q꜀' },
    Q_f: { label: 'Spacing Quality', symbol: 'Q_f' },
    Q_p: { label: 'Process Quality', symbol: 'Qₚ' }
};

export function EquationTracker({
    h,
    Q_k,
    Q_r,
    Q_c,
    Q_f,
    Q_p,
    I,
    phase,
    weakestVariable,
    recommendation,
    qLabels
}: EquationTrackerProps) {
    if (phase === 'complete') return null;

    const healthPercent = Math.round(I * 100);
    const hPercent = Math.round(h * 100);
    const isGrindingFutile = phase === 'study' && Q_p < 0.2;
    const variables: { key: HealthVariable; value: number; label: string }[] = [
        { key: 'Q_k', value: Q_k, label: qLabels.Q_k },
        { key: 'Q_r', value: Q_r, label: qLabels.Q_r },
        { key: 'Q_c', value: Q_c, label: qLabels.Q_c },
        { key: 'Q_f', value: Q_f, label: qLabels.Q_f },
        { key: 'Q_p', value: Q_p, label: qLabels.Q_p }
    ];

    return (
        <motion.div
            className={styles.tracker}
            style={{ zIndex: Z_INDEX.EQUATION_TRACKER }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Header with Learning Health label */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <span className={styles.title}>Learning Health</span>
                    <span className={styles.equation}>I = min(h, Qₖ × Qᵣ × Q꜀ × Q_f × Qₚ)</span>
                </div>
                <div className={styles.headerRight}>
                    <motion.span
                        className={styles.healthScore}
                        key={healthPercent}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                    >
                        {healthPercent}%
                    </motion.span>
                    {I >= HEALTH_THRESHOLD
                        ? <TrendingUp size={14} className={styles.trendUp} />
                        : <TrendingDown size={14} className={styles.trendDown} />
                    }
                </div>
            </div>

            {/* Health index progress bar */}
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

            {/* Mood ceiling (h) indicator */}
            <div className={styles.ceilingRow}>
                <span className={styles.ceilingLabel}>Bandwidth (h)</span>
                <span className={styles.ceilingValue}>{hPercent}%</span>
            </div>

            {/* Variable bars */}
            <div className={styles.variables}>
                {variables.map(({ key, value, label }) => {
                    const isWeakest = weakestVariable.variable === key;
                    const percent = Math.round(value * 100);
                    const info = VARIABLE_INFO[key];
                    return (
                        <div
                            key={key}
                            className={`${styles.variable} ${isWeakest ? styles.weakest : ''}`}
                        >
                            <div className={styles.varHeader}>
                                <span className={styles.varSymbol}>{info.symbol}</span>
                                <span className={styles.varLabel}>{label}</span>
                                <span className={styles.varValue}>{percent}%</span>
                            </div>
                            <div className={styles.varTrack}>
                                <motion.div
                                    className={styles.varFill}
                                    style={{ backgroundColor: EQUATION_COLORS[key] }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percent}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                            {isWeakest && (
                                <motion.span
                                    className={styles.weakBadge}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    bottleneck
                                </motion.span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Recommendation */}
            {recommendation && weakestVariable.value < 0.5 && (
                <motion.div
                    className={styles.recommendation}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                >
                    <span className={styles.recLabel}>💡 {recommendation}</span>
                </motion.div>
            )}

            {/* Grinding futile warning — proactive intervention */}
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
                                Take a moment to follow the learning loop: Test → Encode → Verify.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default EquationTracker;