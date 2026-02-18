import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Info, AlertTriangle, BookOpen, Layers, TrendingUp, X, Brain, RotateCcw, Link, Clock, Zap } from 'lucide-react';
import type { HealthVariable } from '@/shared/constants/sensa-flow-constants';
import { EQUATION_COLORS_HEX, HEALTH_THRESHOLD } from '@/shared/constants/sensa-flow-constants';
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
    subjectName?: string;
    conceptsCompleted?: number;
    conceptsTotal?: number;
    onClose?: () => void;
}

const PHASE_LABELS: Record<SensaPhase, string> = {
    see: 'See — Preview & Predict',
    explore: 'Explore — Deep Dive',
    note: 'Note — Capture Insights',
    study: 'Study — Active Recall',
    apply: 'Apply — Real Problems',
    complete: 'Complete — Mastered'
};

const VARIABLE_CONFIG: Record<HealthVariable, { symbol: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
    Q_k: { symbol: 'Qk', color: EQUATION_COLORS_HEX.Q_k, icon: Brain },
    Q_r: { symbol: 'Qr', color: EQUATION_COLORS_HEX.Q_r, icon: RotateCcw },
    Q_c: { symbol: 'Qc', color: EQUATION_COLORS_HEX.Q_c, icon: Link },
    Q_f: { symbol: 'Qf', color: EQUATION_COLORS_HEX.Q_f, icon: Clock },
    Q_p: { symbol: 'Qp', color: EQUATION_COLORS_HEX.Q_p, icon: Zap }
};

function getHealthLevel(percent: number): { label: string; className: string } {
    if (percent >= 80) return { label: 'Excellent', className: styles.healthExcellent };
    if (percent >= 60) return { label: 'Good', className: styles.healthGood };
    if (percent >= 40) return { label: 'Building', className: styles.healthBuilding };
    if (percent >= 20) return { label: 'Developing', className: styles.healthDeveloping };
    return { label: 'Starting Out', className: styles.healthStarting };
}

export function BlueprintFormulaDashboard({
    h,
    I,
    phase,
    metrics,
    weakestVariable,
    recommendation,
    subjectType,
    feedbackSignal,
    subjectName,
    conceptsCompleted = 0,
    conceptsTotal = 0,
    onClose
}: BlueprintFormulaDashboardProps) {
    if (!metrics) return null;

    const healthPercent = Math.round(I * 100);
    const isGrindingFutile = phase === 'study' && metrics.Q_p < 0.2;
    const healthLevel = getHealthLevel(healthPercent);
    const targetPercent = Math.round(HEALTH_THRESHOLD * 100);

    const rows: { key: HealthVariable; value: number; label: string }[] = [
        { key: 'Q_k', value: metrics.Q_k, label: metrics.labels.Q_k },
        { key: 'Q_r', value: metrics.Q_r, label: metrics.labels.Q_r },
        { key: 'Q_c', value: metrics.Q_c, label: metrics.labels.Q_c },
        { key: 'Q_f', value: metrics.Q_f, label: metrics.labels.Q_f },
        { key: 'Q_p', value: metrics.Q_p, label: metrics.labels.Q_p }
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <TrendingUp size={16} className={styles.headerIcon} />
                    <span className={styles.headerTitle}>Learning Health</span>
                </div>
                {onClose && (
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={16} />
                    </button>
                )}
            </div>

            {subjectName && (
                <div className={styles.contextSection}>
                    <div className={styles.contextRow}>
                        <BookOpen size={14} />
                        <span className={styles.contextLabel}>{subjectName}</span>
                        {subjectType && <span className={styles.typeBadge}>{subjectType}</span>}
                    </div>
                    <div className={styles.contextRow}>
                        <Layers size={14} />
                        <span className={styles.contextLabel}>{PHASE_LABELS[phase]}</span>
                    </div>
                    {conceptsTotal > 0 && (
                        <div className={styles.progressMini}>
                            <span className={styles.progressMiniLabel}>
                                {conceptsCompleted} / {conceptsTotal} concepts
                            </span>
                            <div className={styles.progressMiniTrack}>
                                <motion.div
                                    className={styles.progressMiniFill}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.round((conceptsCompleted / conceptsTotal) * 100)}%` }}
                                    transition={{ duration: 0.4 }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className={styles.scoreSection}>
                <div className={styles.scoreRing}>
                    <svg viewBox="0 0 100 100" className={styles.scoreSvg}>
                        <circle cx="50" cy="50" r="42" className={styles.scoreTrack} />
                        <motion.circle
                            cx="50" cy="50" r="42"
                            className={styles.scoreFill}
                            strokeDasharray={`${healthPercent * 2.64} 264`}
                            initial={{ strokeDasharray: '0 264' }}
                            animate={{ strokeDasharray: `${healthPercent * 2.64} 264` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                    </svg>
                    <div className={styles.scoreValue}>
                        <span className={styles.scoreNumber}>{healthPercent}</span>
                        <span className={styles.scoreUnit}>%</span>
                    </div>
                </div>
                <div className={styles.scoreInfo}>
                    <span className={`${styles.scoreStatus} ${healthLevel.className}`}>
                        {healthLevel.label}
                    </span>
                    <span className={styles.scoreTarget}>
                        Target: {targetPercent}%
                    </span>
                    <span className={styles.scoreEquation}>
                        I = min(h, Qk × Qr × Qc × Qf × Qp)
                    </span>
                </div>
            </div>

            <div className={styles.metricsGrid}>
                <div className={styles.metricsHeader}>Variable Breakdown</div>
                {rows.map(({ key, value, label }) => {
                    const isWeakest = weakestVariable.variable === key;
                    const percent = Math.round(value * 100);
                    const config = VARIABLE_CONFIG[key];
                    const IconComponent = config.icon;

                    return (
                        <div
                            key={key}
                            className={`${styles.metricRow} ${isWeakest ? styles.weakest : ''}`}
                        >
                            <span className={styles.metricIcon}>
                                <IconComponent size={16} />
                            </span>
                            <div className={styles.metricLabel}>
                                <span className={styles.labelName}>{label}</span>
                            </div>
                            <div className={styles.barTrack}>
                                <motion.div
                                    className={styles.barFill}
                                    style={{ backgroundColor: config.color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percent}%` }}
                                    transition={{ duration: 0.5, delay: 0.1 }}
                                />
                            </div>
                            <span className={styles.metricValue} style={{ color: config.color }}>
                                {percent}%
                            </span>
                            {isWeakest && <span className={styles.weakBadge}>Weakest</span>}
                        </div>
                    );
                })}

                <div className={styles.moodRow}>
                    <span className={styles.moodLabel}>Cognitive Bandwidth</span>
                    <div className={styles.moodBar}>
                        <motion.div
                            className={styles.moodBarFill}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round(h * 100)}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
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
        </div>
    );
}

export default BlueprintFormulaDashboard;
