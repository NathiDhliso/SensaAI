/**
 * MasteryDashboard Component
 *
 * Final view of the learning session.
 * Displays the Learning Health Equation breakdown (5 learner variables + h).
 * Generates a completion certificate.
 */
import { useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Trophy,
    Clock,
    Brain,
    Target,
    Zap,
    Home,
    BookOpen,
    Activity,
    TrendingUp,
    Award,
    Download,
    Printer
} from 'lucide-react';
import type { LearningConcept, LearningHealthEquation } from '@/shared/types/learning';
import { EQUATION_COLORS } from '@/shared/constants/sensa-flow-constants';
import { getCSSVariable } from '@/shared/constants/theme-colors';
import styles from './MasteryDashboard.module.css';

interface MasteryDashboardProps {
    concepts: LearningConcept[];
    completedConcepts: string[];
    subjectName: string;
    sessionStartTime: number;
    equation: LearningHealthEquation;
    streakCount: number;
    onReturnHome: () => void;
    onReviewConcepts: () => void;
}

const CERT_WIDTH = 1056;
const CERT_HEIGHT = 816;

function drawCertificate(
    ctx: CanvasRenderingContext2D,
    subject: string,
    conceptCount: number,
    grade: string,
    completionRate: number,
    timeMin: number,
    date: string,
) {
    const certBg = getCSSVariable('--color-cert-bg') || '#fdfcfb';
    const certBorder = getCSSVariable('--color-cert-border') || '#1e293b';
    const certBorderInner = getCSSVariable('--color-cert-border-inner') || '#cbd5e1';
    const certHeading = getCSSVariable('--color-cert-heading') || '#0f172a';
    const certSubtext = getCSSVariable('--color-cert-subtext') || '#475569';
    const certMuted = getCSSVariable('--color-cert-muted') || '#64748b';
    const certDivider = getCSSVariable('--color-cert-divider') || '#94a3b8';
    const certBadgeBg = getCSSVariable('--color-cert-badge-bg') || '#f1f5f9';

    ctx.fillStyle = certBg;
    ctx.fillRect(0, 0, CERT_WIDTH, CERT_HEIGHT);

    ctx.strokeStyle = certBorder;
    ctx.lineWidth = 3;
    ctx.strokeRect(32, 32, CERT_WIDTH - 64, CERT_HEIGHT - 64);

    ctx.strokeStyle = certBorderInner;
    ctx.lineWidth = 1;
    ctx.strokeRect(44, 44, CERT_WIDTH - 88, CERT_HEIGHT - 88);

    const cx = CERT_WIDTH / 2;

    ctx.fillStyle = certMuted;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '4px';
    ctx.fillText('CERTIFICATE OF COMPLETION', cx, 110);
    ctx.letterSpacing = '0px';

    ctx.fillStyle = certHeading;
    ctx.font = '700 36px system-ui, sans-serif';
    ctx.fillText(subject, cx, 180);

    ctx.fillStyle = certDivider;
    ctx.fillRect(cx - 60, 200, 120, 1);

    ctx.fillStyle = certSubtext;
    ctx.font = '400 16px system-ui, sans-serif';
    ctx.fillText('This certifies the successful completion of', cx, 250);

    ctx.fillStyle = certHeading;
    ctx.font = '700 52px system-ui, sans-serif';
    ctx.fillText(`${conceptCount} Concepts`, cx, 310);

    ctx.fillStyle = certSubtext;
    ctx.font = '400 16px system-ui, sans-serif';
    ctx.fillText(`with a grade of ${grade} and ${completionRate}% completion in ${timeMin} minutes`, cx, 355);

    ctx.fillStyle = certDivider;
    ctx.fillRect(cx - 60, 385, 120, 1);

    ctx.fillStyle = certMuted;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('LEARNING METRICS', cx, 430);
    ctx.letterSpacing = '0px';

    const metricsY = 470;
    const cols = [-200, -67, 67, 200];
    const labels = ['Grade', 'Concepts', 'Completion', 'Time'];
    const values = [grade, `${conceptCount}`, `${completionRate}%`, `${timeMin}m`];

    labels.forEach((label, i) => {
        ctx.fillStyle = certHeading;
        ctx.font = '700 28px system-ui, sans-serif';
        ctx.fillText(values[i], cx + cols[i], metricsY);

        ctx.fillStyle = certDivider;
        ctx.font = '500 11px system-ui, sans-serif';
        ctx.letterSpacing = '1px';
        ctx.fillText(label.toUpperCase(), cx + cols[i], metricsY + 22);
        ctx.letterSpacing = '0px';
    });

    ctx.fillStyle = certDivider;
    ctx.fillRect(cx - 200, 520, 400, 1);

    ctx.fillStyle = certDivider;
    ctx.font = '400 13px system-ui, sans-serif';
    ctx.fillText(date, cx, 570);

    ctx.fillStyle = certHeading;
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText('SensaAI', cx, 610);

    ctx.fillStyle = certDivider;
    ctx.font = '400 12px system-ui, sans-serif';
    ctx.fillText('Powered by AI-Driven Learning', cx, 635);

    ctx.fillStyle = certBadgeBg;
    ctx.beginPath();
    ctx.arc(cx, 710, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = certMuted;
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText('S', cx, 717);
}

export function MasteryDashboard({
    concepts,
    completedConcepts,
    subjectName,
    sessionStartTime,
    equation,
    streakCount,
    onReturnHome,
    onReviewConcepts
}: MasteryDashboardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const stats = useMemo(() => {
        const totalConcepts = concepts.length;
        const mastered = completedConcepts.length;
        const completionRate = totalConcepts > 0 ? Math.round((mastered / totalConcepts) * 100) : 0;
        const timeSpentMs = Date.now() - sessionStartTime;
        const timeSpentMin = Math.floor(timeSpentMs / 60000);
        const avgTimePerConcept = mastered > 0 ? Math.round(timeSpentMs / mastered / 1000) : 0;

        const tierBreakdown = {
            trunk: concepts.filter(c => (c.tier || '').toLowerCase() === 'trunk').length,
            branch: concepts.filter(c => (c.tier || '').toLowerCase() === 'branch').length,
            leaf: concepts.filter(c => {
                const t = (c.tier || '').toLowerCase();
                return t !== 'trunk' && t !== 'branch';
            }).length
        };

        const efficiencyScore = Math.round(equation.I * 100);

        return {
            totalConcepts,
            mastered,
            completionRate,
            timeSpentMin,
            avgTimePerConcept,
            tierBreakdown,
            efficiencyScore
        };
    }, [concepts, completedConcepts, sessionStartTime, equation]);

    const grade = useMemo(() => {
        if (stats.efficiencyScore >= 80) return { label: 'S', color: getCSSVariable('--color-grade-s') || '#10b981', message: 'Exceptional mastery!' };
        if (stats.efficiencyScore >= 65) return { label: 'A', color: getCSSVariable('--color-grade-a') || '#cbd5e1', message: 'Strong performance' };
        if (stats.efficiencyScore >= 50) return { label: 'B', color: getCSSVariable('--color-grade-b') || '#eab308', message: 'Solid progress' };
        if (stats.efficiencyScore >= 35) return { label: 'C', color: getCSSVariable('--color-grade-c') || '#f97316', message: 'Room to grow' };
        return { label: 'D', color: getCSSVariable('--color-grade-d') || '#ef4444', message: 'Keep practicing' };
    }, [stats.efficiencyScore]);

    const dateString = useMemo(() => {
        return new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }, []);

    const renderCertificateToCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        canvas.width = CERT_WIDTH;
        canvas.height = CERT_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        drawCertificate(
            ctx,
            subjectName,
            stats.mastered,
            grade.label,
            stats.completionRate,
            stats.timeSpentMin,
            dateString,
        );
        return canvas;
    }, [subjectName, stats, grade, dateString]);

    const handleDownload = useCallback(() => {
        const canvas = renderCertificateToCanvas();
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `SensaAI-Certificate-${subjectName.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }, [renderCertificateToCanvas, subjectName]);

    const handlePrint = useCallback(() => {
        const canvas = renderCertificateToCanvas();
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/png');
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
 <html>
 <head><title>Certificate - ${subjectName}</title></head>
 <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:white;">
 <img src="${dataUrl}" style="max-width:100%;height:auto;" />
 </body>
 </html>
 `);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    }, [renderCertificateToCanvas, subjectName]);

    return (
        <div className={styles.container}>
            <canvas ref={canvasRef} className={styles.certificateCanvas} />

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
                    <Brain size={24} className={styles.statIcon} />
                    <span className={styles.statValue}>{stats.mastered}/{stats.totalConcepts}</span>
                    <span className={styles.statLabel}>Concepts Mastered</span>
                </div>
                <div className={styles.statCard}>
                    <Clock size={24} className={styles.statIcon} />
                    <span className={styles.statValue}>{stats.timeSpentMin}m</span>
                    <span className={styles.statLabel}>Time Spent</span>
                </div>
                <div className={styles.statCard}>
                    <Zap size={24} className={styles.statIcon} />
                    <span className={styles.statValue}>{stats.avgTimePerConcept}s</span>
                    <span className={styles.statLabel}>Avg per Concept</span>
                </div>
                <div className={styles.statCard}>
                    <Target size={24} className={styles.statIcon} />
                    <span className={styles.statValue}>{stats.completionRate}%</span>
                    <span className={styles.statLabel}>Completion</span>
                </div>
                <div className={styles.statCard}>
                    <TrendingUp size={24} className={styles.statIcon} />
                    <span className={styles.statValue}>{streakCount}</span>
                    <span className={styles.statLabel}>Best Streak</span>
                </div>
                <div className={styles.statCard}>
                    <Activity size={24} className={styles.statIcon} />
                    <span className={styles.statValue}>{stats.efficiencyScore}%</span>
                    <span className={styles.statLabel}>Health Index (I)</span>
                </div>
            </motion.div>

            <motion.div
                className={styles.section}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <h3 className={styles.sectionTitle}>
                    <Activity size={18} />
                    Learning Health Breakdown
                </h3>
                <div className={styles.equationBars}>
                    <EquationBar label="Cognitive Bandwidth (h)" value={equation.h} color={EQUATION_COLORS.h} />
                    <EquationBar label="Prior Knowledge (Qₖ)" value={equation.Q_k} color={EQUATION_COLORS.Q_k} />
                    <EquationBar label="Recall Quality (Qᵣ)" value={equation.Q_r} color={EQUATION_COLORS.Q_r} />
                    <EquationBar label="Connection Quality (Q꜀)" value={equation.Q_c} color={EQUATION_COLORS.Q_c} />
                    <EquationBar label="Spacing Quality (Q_f)" value={equation.Q_f} color={EQUATION_COLORS.Q_f} />
                    <EquationBar label="Process Quality (Qₚ)" value={equation.Q_p} color={EQUATION_COLORS.Q_p} />
                </div>
            </motion.div>

            <motion.div
                className={styles.section}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <h3 className={styles.sectionTitle}>
                    <Trophy size={18} />
                    Tier Coverage
                </h3>
                <div className={styles.tierBars}>
                    <TierBar label="Trunk" count={stats.tierBreakdown.trunk} total={stats.totalConcepts} color="var(--color-trunk, #d97706)" />
                    <TierBar label="Branch" count={stats.tierBreakdown.branch} total={stats.totalConcepts} color="var(--color-branch, #2563eb)" />
                    <TierBar label="Leaf" count={stats.tierBreakdown.leaf} total={stats.totalConcepts} color="var(--color-leaf, #16a34a)" />
                </div>
            </motion.div>

            <motion.div
                className={styles.section}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
            >
                <h3 className={styles.sectionTitle}>
                    <Award size={18} />
                    Certificate
                </h3>
                <p className={styles.certificateDescription}>
                    Download or print your completion certificate for {subjectName}
                </p>
                <div className={styles.certificateActions}>
                    <button onClick={handleDownload} className={styles.certificateButton}>
                        <Download size={18} />
                        Download PNG
                    </button>
                    <button onClick={handlePrint} className={styles.certificateButton}>
                        <Printer size={18} />
                        Print
                    </button>
                </div>
            </motion.div>

            <motion.div
                className={styles.actions}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.65 }}
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

function EquationBar({ label, value, color }: { label: string; value: number; color: string }) {
    const percent = Math.round(value * 100);

    return (
        <div className={styles.barRow}>
            <span className={styles.barLabel}>{label}</span>
            <div className={styles.barTrack}>
                <motion.div
                    className={styles.barFill}
                    style={{ backgroundColor: color, width: `${percent}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
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
                    style={{ backgroundColor: color, width: `${percent}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                />
            </div>
            <span className={styles.barValue}>{percent}%</span>
        </div>
    );
}

export default MasteryDashboard;
