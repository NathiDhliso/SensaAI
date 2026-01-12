/**
 * MasteryDashboard Component — SENSA v2.0
 * 
 * Replaces VelocityDashboard. Focuses on:
 * - Mastery Index (I) as primary KPI
 * - Universal Learning Equation breakdown
 * - Tier mastery visualization
 * - Session history with I progression
 * - Weakest variable recommendations
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Brain,
    TrendingUp,
    Target,
    AlertTriangle,
    Layers,
    Clock,
    ArrowUpRight,
    Sparkles
} from 'lucide-react';
import type { LearningConcept } from '@/lib/types/learning';
import type { EquationMetadata } from '@/lib/types/sensa-flow.types';
import { calculateMasteryIndex, findWeakestVariable, MASTERY_THRESHOLD } from '@/constants/sensa-flow-constants';
import { EQUATION_COLORS_HEX } from '@/constants/sensa-flow-constants';
import { GRAPH_COLORS } from '@/constants/theme-colors';
import styles from './MasteryDashboard.module.css';

// ============================================================================
// Types
// ============================================================================

interface SessionSummary {
    id: string;
    date: Date;
    I: number;
    G: number;
    Q_P: number;
    Q_M: number;
    Q_f: number;
    conceptsStudied: number;
}

interface MasteryDashboardProps {
    concepts: LearningConcept[];
    sessions: SessionSummary[];
    currentEquation: {
        G: number;
        Q_P: number;
        Q_M: number;
        Q_f: number;
    };
    equationMetadata?: EquationMetadata | null;
}

// ============================================================================
// Component
// ============================================================================

export function MasteryDashboard({
    concepts,
    sessions,
    currentEquation,
    equationMetadata,
}: MasteryDashboardProps) {
    // Calculate current mastery index
    const currentI = useMemo(() =>
        calculateMasteryIndex(
            currentEquation.G,
            currentEquation.Q_P,
            currentEquation.Q_M,
            currentEquation.Q_f
        ),
        [currentEquation]
    );

    // Find weakest variable
    const weakest = useMemo(() =>
        findWeakestVariable(
            currentEquation.G,
            currentEquation.Q_P,
            currentEquation.Q_M,
            currentEquation.Q_f
        ),
        [currentEquation]
    );

    // Calculate tier mastery percentages
    const tierMastery = useMemo(() => {
        const tiers = { foundation: 0, keystone: 0, utility: 0 };
        const counts = { foundation: 0, keystone: 0, utility: 0 };

        concepts.forEach(c => {
            counts[c.tier]++;
            // Assume lifecycle.stage indicates mastery (this would come from actual data)
            if (c.lifecycle?.stage === 'mastered') {
                tiers[c.tier]++;
            }
        });

        return {
            foundation: counts.foundation > 0 ? (tiers.foundation / counts.foundation) * 100 : 0,
            keystone: counts.keystone > 0 ? (tiers.keystone / counts.keystone) * 100 : 0,
            utility: counts.utility > 0 ? (tiers.utility / counts.utility) * 100 : 0,
        };
    }, [concepts]);

    // I progression over last 7 sessions
    const iProgression = useMemo(() => {
        return sessions.slice(-7).map(s => ({
            date: s.date,
            I: s.I,
        }));
    }, [sessions]);

    // Recommendations based on weakest variable
    const recommendations = useMemo(() => {
        const recs: Record<string, { action: string; detail: string }> = {
            G: {
                action: 'Improve Environment',
                detail: 'Find a quieter space or use focus mode'
            },
            Q_P: {
                action: 'Revisit Explore Phase',
                detail: 'Spend more time on structure & predictions'
            },
            Q_M: {
                action: 'Rebuild Concept Maps',
                detail: 'Add more connections between concepts'
            },
            Q_f: {
                action: 'Practice Flow Mode',
                detail: 'Complete speed drills to boost fluency'
            },
        };
        return recs[weakest.variable];
    }, [weakest]);

    // =========================================================================
    // Render Helpers
    // =========================================================================

    const renderEquationCard = () => (
        <div className={styles.equationCard}>
            <div className={styles.cardHeader}>
                <Brain size={20} />
                <h3>Universal Learning Equation</h3>
            </div>

            <div className={styles.equationDisplay}>
                <span className={styles.equationFormula}>
                    I = G × Q<sub>f</sub> × Q<sub>M</sub> × Q<sub>P</sub>
                </span>
            </div>

            <div className={styles.variableGrid}>
                {[
                    { key: 'G', value: currentEquation.G, color: EQUATION_COLORS_HEX.G },
                    { key: 'Q_f', value: currentEquation.Q_f, color: EQUATION_COLORS_HEX.Q_f },
                    { key: 'Q_M', value: currentEquation.Q_M, color: EQUATION_COLORS_HEX.Q_M },
                    { key: 'Q_P', value: currentEquation.Q_P, color: EQUATION_COLORS_HEX.Q_P },
                ].map(v => (
                    <div
                        key={v.key}
                        className={`${styles.variableCell} ${weakest.variable === v.key ? styles.weak : ''}`}
                        style={{ '--var-color': v.color } as React.CSSProperties}
                    >
                        <span className={styles.varLabel}>{v.key}</span>
                        <span className={styles.varValue}>{(v.value * 100).toFixed(0)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderMasteryGauge = () => {
        const percentage = currentI * 100;
        const hasMastery = currentI >= MASTERY_THRESHOLD;

        return (
            <div className={styles.masteryGauge}>
                <div className={styles.gaugeRing}>
                    <svg viewBox="0 0 100 100">
                        <circle
                            className={styles.gaugeTrack}
                            cx="50" cy="50" r="42"
                        />
                        <circle
                            className={`${styles.gaugeFill} ${hasMastery ? styles.mastered : ''}`}
                            cx="50" cy="50" r="42"
                            style={{
                                strokeDasharray: `${percentage * 2.64} 999`,
                            }}
                        />
                    </svg>
                    <div className={styles.gaugeCenter}>
                        <span className={styles.gaugeValue}>{percentage.toFixed(0)}%</span>
                        <span className={styles.gaugeLabel}>Mastery</span>
                    </div>
                </div>

                {hasMastery ? (
                    <div className={styles.masteryBadge}>
                        <Target size={16} />
                        <span>Mastery Achieved!</span>
                    </div>
                ) : (
                    <div className={styles.masteryProgress}>
                        <span>{Math.round((currentI / MASTERY_THRESHOLD) * 100)}% to threshold</span>
                    </div>
                )}
            </div>
        );
    };

    const renderTierProgress = () => (
        <div className={styles.tierCard}>
            <div className={styles.cardHeader}>
                <Layers size={20} />
                <h3>Tier Mastery</h3>
            </div>

            <div className={styles.tierBars}>
                {[
                    { tier: 'Foundation', value: tierMastery.foundation, color: GRAPH_COLORS.foundation },
                    { tier: 'Keystone', value: tierMastery.keystone, color: GRAPH_COLORS.keystone },
                    { tier: 'Utility', value: tierMastery.utility, color: GRAPH_COLORS.utility },
                ].map(t => (
                    <div key={t.tier} className={styles.tierRow}>
                        <span className={styles.tierLabel}>{t.tier}</span>
                        <div className={styles.tierBar}>
                            <motion.div
                                className={styles.tierFill}
                                style={{ backgroundColor: t.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${t.value}%` }}
                            />
                        </div>
                        <span className={styles.tierValue}>{t.value.toFixed(0)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderRecommendation = () => (
        <div className={styles.recommendationCard}>
            <div className={styles.cardHeader}>
                <AlertTriangle size={20} className={styles.warningIcon} />
                <h3>Focus Area</h3>
            </div>

            <div className={styles.recommendationContent}>
                <div
                    className={styles.weakVariable}
                    style={{ '--var-color': EQUATION_COLORS_HEX[weakest.variable] } as React.CSSProperties}
                >
                    {weakest.variable} = {(weakest.value * 100).toFixed(0)}%
                </div>
                <h4>{recommendations.action}</h4>
                <p>{recommendations.detail}</p>
                <button className={styles.actionButton}>
                    <Sparkles size={16} />
                    Start Improvement
                </button>
            </div>
        </div>
    );

    const renderSessionHistory = () => (
        <div className={styles.historyCard}>
            <div className={styles.cardHeader}>
                <Clock size={20} />
                <h3>Recent Sessions</h3>
            </div>

            <div className={styles.historyChart}>
                {iProgression.map((point, idx) => (
                    <div
                        key={idx}
                        className={styles.historyBar}
                        style={{
                            '--height': `${point.I * 100}%`,
                            '--delay': `${idx * 0.1}s`,
                        } as React.CSSProperties}
                    >
                        <motion.div
                            className={styles.historyFill}
                            initial={{ height: 0 }}
                            animate={{ height: 'var(--height)' }}
                            transition={{ delay: idx * 0.1, duration: 0.4 }}
                        />
                    </div>
                ))}
            </div>

            <div className={styles.historyLabels}>
                {iProgression.map((point, idx) => (
                    <span key={idx} className={styles.historyLabel}>
                        {point.date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                ))}
            </div>

            {sessions.length > 0 && (
                <div className={styles.historyTrend}>
                    <TrendingUp size={14} />
                    <span>
                        {sessions.length > 1 && sessions[sessions.length - 1].I > sessions[sessions.length - 2].I
                            ? 'Improving!'
                            : 'Keep practicing'
                        }
                    </span>
                </div>
            )}
        </div>
    );

    // =========================================================================
    // Main Render
    // =========================================================================

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>
                    <Brain size={24} />
                    Mastery Dashboard
                </h2>
                <p>Track your learning progress with the Universal Equation</p>
            </div>

            <div className={styles.grid}>
                {/* Row 1: Mastery Gauge + Equation */}
                <div className={styles.primarySection}>
                    {renderMasteryGauge()}
                    {renderEquationCard()}
                </div>

                {/* Row 2: Tier Progress + Recommendation */}
                <div className={styles.secondarySection}>
                    {renderTierProgress()}
                    {renderRecommendation()}
                </div>

                {/* Row 3: Session History */}
                {renderSessionHistory()}
            </div>
        </div>
    );
}

export default MasteryDashboard;
