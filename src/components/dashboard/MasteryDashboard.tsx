import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Trophy,
    Clock,
    Brain,
    Target,
    Zap,
    Home,
    BookOpen,
    BarChart3,
    Star,
    TrendingUp,
} from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import type { SensaPhase } from '@/shared/types/sensa-flow';
import styles from './MasteryDashboard.module.css';

interface MasteryDashboardProps {
    concepts: LearningConcept[];
    completedConcepts: string[];
    subjectName: string;
    sessionStartTime: number;
    equation: {
        G: number;
        Q_f: number;
        Q_M: number;
        Q_P: number;
        I: number;
        phase: SensaPhase;
    };
    streakCount: number;
    onReturnHome: () => void;
    onReviewConcepts: () => void;
}

export function MasteryDashboard({
    concepts,
    completedConcepts,
    subjectName,
    sessionStartTime,
    equation,
    streakCount,
    onReturnHome,
    onReviewConcepts,
}: MasteryDashboardProps) {
    const stats = useMemo(() => {
        const totalConcepts = concepts.length;
        const mastered = completedConcepts.length;
        const completionRate = totalConcepts > 0 ? Math.round((mastered / totalConcepts) * 100) : 0;
        const timeSpentMs = Date.now() - sessionStartTime;
        const timeSpentMin = Math.floor(timeSpentMs / 60000);
        const avgTimePerConcept = mastered > 0 ? Math.round(timeSpentMs / mastered / 1000) : 0;

        const tierBreakdown = {
            foundation: concepts.filter(c => (c.tier || '').toLowerCase() === 'foundation').length,
            keystone: concepts.filter(c => (c.tier || '').toLowerCase() === 'keystone').length,
            utility: concepts.filter(c => {
                const t = (c.tier || '').toLowerCase();
                return t !== 'foundation' && t !== 'keystone';
            }).length,
        };

        const efficiencyScore = Math.round(equation.I * 100);

        return {
            totalConcepts,
            mastered,
            completionRate,
            timeSpentMin,
            avgTimePerConcept,
            tierBreakdown,
            efficiencyScore,
        };
    }, [concepts, completedConcepts, sessionStartTime, equation]);

    const grade = useMemo(() => {
        if (stats.efficiencyScore >= 80) return { label: 'S', color: 'var(--color-gold, #f59e0b)', message: 'Exceptional mastery!' };
        if (stats.efficiencyScore >= 65) return { label: 'A', color: 'var(--color-success, #10b981)', message: 'Strong performance' };
        if (stats.efficiencyScore >= 50) return { label: 'B', color: 'var(--color-info, #3b82f6)', message: 'Solid progress' };
        if (stats.efficiencyScore >= 35) return { label: 'C', color: 'var(--color-warning, #f59e0b)', message: 'Room to grow' };
        return { label: 'D', color: 'var(--color-error, #ef4444)', message: 'Keep practicing' };
    }, [stats.efficiencyScore]);

    return (
        <div className={styles.container}>
            <motion.div
                className={styles.header}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className={styles.gradeCircle} style={{ borderColor: grade.color }}>
                    <span className={styles.gradeLabel} style={{ color: grade.color }}>{grade.label}</span>
                </div>
                <h1 className={styles.title}>Session Complete</h1>
                <p className={styles.subtitle}>{subjectName}</p>
                <p className={styles.gradeMessage}>{grade.message}</p>
            </motion.div>

            <motion.div
                className={styles.statsGrid}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <div className={styles.statCard}>
                    <Brain size={20} className={styles.statIcon} />
                    <span className={styles.statValue}>{stats.mastered}/{stats.totalConcepts}</span>
                    <span className={styles.statLabel}>Concepts Mastered</span>
                </div>
                <div className={styles.statCard}>
                    <Clock size={20} className={styles.statIcon} />
                    <span className={styles.statValue}>{stats.timeSpentMin}m</span>
                    <span className={styles.statLabel}>Time Spent</span>
                </div>
                <div className={styles.statCard}>
                    <Zap size={20} className={styles.statIcon} />
                    <span className={styles.statValue}>{stats.avgTimePerConcept}s</span>
                    <span className={styles.statLabel}>Avg per Concept</span>
                </div>
                <div className={styles.statCard}>
                    <Target size={20} className={styles.statIcon} />
                    <span className={styles.statValue}>{stats.completionRate}%</span>
                    <span className={styles.statLabel}>Completion</span>
                </div>
                <div className={styles.statCard}>
                    <TrendingUp size={20} className={styles.statIcon} />
                    <span className={styles.statValue}>{streakCount}</span>
                    <span className={styles.statLabel}>Best Streak</span>
                </div>
                <div className={styles.statCard}>
                    <Star size={20} className={styles.statIcon} />
                    <span className={styles.statValue}>{stats.efficiencyScore}%</span>
                    <span className={styles.statLabel}>Efficiency (I)</span>
                </div>
            </motion.div>

            <motion.div
                className={styles.equationSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <h3 className={styles.sectionTitle}>
                    <BarChart3 size={18} />
                    Learning Equation Breakdown
                </h3>
                <div className={styles.equationBars}>
                    <EquationBar label="Generation (G)" value={equation.G} />
                    <EquationBar label="Flow (Q_f)" value={equation.Q_f} />
                    <EquationBar label="Mastery (Q_M)" value={equation.Q_M} />
                    <EquationBar label="Practice (Q_P)" value={equation.Q_P} />
                </div>
            </motion.div>

            <motion.div
                className={styles.tierSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <h3 className={styles.sectionTitle}>
                    <Trophy size={18} />
                    Tier Coverage
                </h3>
                <div className={styles.tierBars}>
                    <TierBar label="Foundation" count={stats.tierBreakdown.foundation} total={stats.totalConcepts} color="var(--tier-foundation, #3b82f6)" />
                    <TierBar label="Keystone" count={stats.tierBreakdown.keystone} total={stats.totalConcepts} color="var(--tier-keystone, #8b5cf6)" />
                    <TierBar label="Utility" count={stats.tierBreakdown.utility} total={stats.totalConcepts} color="var(--tier-utility, #10b981)" />
                </div>
            </motion.div>

            <motion.div
                className={styles.actions}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
            >
                <button onClick={onReturnHome} className={styles.primaryButton}>
                    <Home size={18} />
                    Return to Dashboard
                </button>
                <button onClick={onReviewConcepts} className={styles.secondaryButton}>
                    <BookOpen size={18} />
                    Review Concepts
                </button>
            </motion.div>
        </div>
    );
}

function EquationBar({ label, value }: { label: string; value: number }) {
    const percent = Math.round(value * 100);
    const color = percent >= 70 ? 'var(--color-success, #10b981)' : percent >= 40 ? 'var(--color-warning, #f59e0b)' : 'var(--color-error, #ef4444)';

    return (
        <div className={styles.barRow}>
            <span className={styles.barLabel}>{label}</span>
            <div className={styles.barTrack}>
                <motion.div
                    className={styles.barFill}
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </div>
            <span className={styles.barValue}>{percent}%</span>
        </div>
    );
}

function TierBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;

    return (
        <div className={styles.barRow}>
            <span className={styles.barLabel}>{label} ({count})</span>
            <div className={styles.barTrack}>
                <motion.div
                    className={styles.barFill}
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </div>
            <span className={styles.barValue}>{percent}%</span>
        </div>
    );
}
