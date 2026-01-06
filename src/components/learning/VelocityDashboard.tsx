/**
 * SensaAI Velocity Dashboard
 * 
 * Displays learning velocity metrics, retention rates, and optimal action recommendations.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { useRef, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Brain,
    Clock,
    Zap,
    ChevronDown,
    ChevronUp,
    TrendingUp,
    TrendingDown,
    Minus,
    ArrowRight,
    Target,
    BarChart3,
    Coffee
} from 'lucide-react';
import { getSpacingEngine } from '@/lib/learning/spacing-engine';
import type { SpacingMetrics } from '@/lib/learning/spacing-engine';
import { VELOCITY_CONFIG } from '@/constants/ui-constants';
import styles from './VelocityDashboard.module.css';

// ============================================================================
// TYPES
// ============================================================================

export interface VelocityMetrics {
    /** Concepts learned per hour (quality-adjusted) */
    conceptsPerHour: number;
    /** Current session velocity */
    currentVelocity: number;
    /** Previous session velocity for comparison */
    previousVelocity: number;
    /** Trend: up, down, or stable */
    trend: 'up' | 'down' | 'stable';
    /** Trend percentage change */
    trendPercent: number;
}

export interface RetentionMetrics {
    /** 24-hour retention rate */
    retention24h: number;
    /** 7-day retention rate */
    retention7d: number;
    /** Overall retention rate */
    retentionOverall: number;
}

export interface OptimalAction {
    /** Action type */
    type: 'review' | 'learn' | 'break' | 'continue';
    /** Human-readable recommendation */
    message: string;
    /** Priority level */
    priority: 'high' | 'medium' | 'low';
    /** Count of items if applicable */
    count?: number;
}

export interface VelocityDashboardProps {
    /** Current session concepts completed */
    sessionConceptsCompleted?: number;
    /** Session start time */
    sessionStartTime?: Date;
    /** Current cognitive load (0-1) */
    cognitiveLoad?: number;
    /** Callback when action is selected */
    onActionSelect?: (action: OptimalAction) => void;
}

// ============================================================================
// CALCULATIONS
// ============================================================================

function calculateVelocityMetrics(
    completedCount: number,
    sessionMinutes: number,
    previousVelocity: number = 0
): VelocityMetrics {
    const hours = Math.max(sessionMinutes / 60, 0.1); // Avoid division by zero
    const conceptsPerHour = Math.round(completedCount / hours * 10) / 10;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercent = 0;

    if (previousVelocity > 0) {
        trendPercent = Math.round(((conceptsPerHour - previousVelocity) / previousVelocity) * 100);
        if (trendPercent > VELOCITY_CONFIG.SCORING.TREND_SIGNIFICANCE) trend = 'up';
        else if (trendPercent < -VELOCITY_CONFIG.SCORING.TREND_SIGNIFICANCE) trend = 'down';
    }

    return {
        conceptsPerHour,
        currentVelocity: conceptsPerHour,
        previousVelocity,
        trend,
        trendPercent: Math.abs(trendPercent),
    };
}

function determineOptimalAction(
    spacingMetrics: SpacingMetrics,
    cognitiveLoad: number = 0.5
): OptimalAction {
    // High cognitive load = recommend break
    if (cognitiveLoad > 0.8) {
        return {
            type: 'break',
            message: 'Take a 5-minute break to refresh your focus',
            priority: 'high',
        };
    }

    // Overdue reviews = highest priority
    if (spacingMetrics.overdue > 0) {
        return {
            type: 'review',
            message: `Review ${spacingMetrics.overdue} overdue concept${spacingMetrics.overdue > 1 ? 's' : ''}`,
            priority: 'high',
            count: spacingMetrics.overdue,
        };
    }

    // Due reviews today
    if (spacingMetrics.dueToday > 0) {
        return {
            type: 'review',
            message: `Complete ${spacingMetrics.dueToday} scheduled review${spacingMetrics.dueToday > 1 ? 's' : ''}`,
            priority: 'medium',
            count: spacingMetrics.dueToday,
        };
    }

    // Low cognitive load - learn new
    return {
        type: 'learn',
        message: 'Learn a new concept',
        priority: 'low',
    };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function VelocityDashboard({
    sessionConceptsCompleted = 0,
    sessionStartTime,
    cognitiveLoad = 0.5,
    onActionSelect,
}: VelocityDashboardProps) {
    const [spacingMetrics, setSpacingMetrics] = useState<SpacingMetrics | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Load spacing metrics
    useEffect(() => {
        const engine = getSpacingEngine();
        setSpacingMetrics(engine.getMetrics());
    }, [sessionConceptsCompleted]);

    // Calculate velocity
    const velocity = useMemo(() => {
        if (!sessionStartTime) {
            return { conceptsPerHour: 0, currentVelocity: 0, previousVelocity: 0, trend: 'stable' as const, trendPercent: 0 };
        }
        const minutes = (Date.now() - sessionStartTime.getTime()) / (1000 * 60);
        return calculateVelocityMetrics(sessionConceptsCompleted, minutes, VELOCITY_CONFIG.SCORING.PREVIOUS_VELOCITY_PLACEHOLDER); // 5 as placeholder prev
    }, [sessionConceptsCompleted, sessionStartTime]);

    // Determine optimal action
    const optimalAction = useMemo(() => {
        if (!spacingMetrics) return null;
        return determineOptimalAction(spacingMetrics, cognitiveLoad);
    }, [spacingMetrics, cognitiveLoad]);

    // Determine optimal action
    const getOptimalAction = () => {
        if (cognitiveLoad > VELOCITY_CONFIG.SCORING.HIGH_COGNITIVE_LOAD) return { icon: Coffee, text: 'Take a break', color: 'var(--color-warning)' };
        if (cognitiveLoad > VELOCITY_CONFIG.SCORING.MODERATE_COGNITIVE_LOAD) return { icon: Brain, text: 'Switch topics', color: 'var(--color-info)' };
        return { icon: Zap, text: 'Push forward', color: 'var(--color-success)' };
    };
    if (!isExpanded) {
        return (
            <motion.button
                className={styles.minimizedPill}
                onClick={() => setIsExpanded(true)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                title="Click to expand dashboard"
            >
                <Zap size={14} className={styles.pillIcon} />
                <span className={styles.pillValue}>{velocity.conceptsPerHour}</span>
                <span className={styles.pillLabel}>/hr</span>
                {spacingMetrics && spacingMetrics.dueToday > 0 && (
                    <span className={styles.pillBadge}>{spacingMetrics.dueToday}</span>
                )}
                <ChevronDown size={14} className={styles.pillExpand} />
            </motion.button>
        );
    }

    // Expanded view
    return (
        <motion.div
            className={styles.dashboard}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Collapse button */}
            <button
                className={styles.collapseButton}
                onClick={() => setIsExpanded(false)}
                title="Minimize dashboard"
            >
                <ChevronUp size={16} />
            </button>

            {/* Velocity section */}
            <div className={styles.velocitySection}>
                <div className={styles.velocityMain}>
                    <Zap size={20} className={styles.velocityIcon} />
                    <span className={styles.velocityValue}>{velocity.conceptsPerHour}</span>
                    <span className={styles.velocityLabel}>concepts/hr</span>
                </div>

                {velocity.trend !== 'stable' && (
                    <div className={`${styles.trend} ${velocity.trend === 'up' ? styles.trendUp : styles.trendDown}`}>
                        {velocity.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span>{velocity.trendPercent}%</span>
                    </div>
                )}
            </div>

            {/* Metrics row */}
            {spacingMetrics && (
                <div className={styles.metricsRow}>
                    <div className={styles.metric}>
                        <Target size={14} />
                        <span>{spacingMetrics.retentionRate}%</span>
                        <span className={styles.metricLabel}>retention</span>
                    </div>
                    <div className={styles.metric}>
                        <Clock size={14} />
                        <span>{spacingMetrics.dueToday}</span>
                        <span className={styles.metricLabel}>due today</span>
                    </div>
                    <div className={styles.metric}>
                        <BarChart3 size={14} />
                        <span>{spacingMetrics.adherencePercent}%</span>
                        <span className={styles.metricLabel}>adherence</span>
                    </div>
                </div>
            )}

            {/* Cognitive load indicator */}
            <div className={styles.loadSection}>
                <Brain size={14} />
                <div className={styles.loadBar}>
                    <div
                        className={`${styles.loadFill} ${cognitiveLoad > 0.7 ? styles.loadHigh : cognitiveLoad > 0.4 ? styles.loadMed : styles.loadLow}`}
                        style={{ width: `${cognitiveLoad * 100}%` }}
                    />
                </div>
                <span className={styles.loadLabel}>
                    {cognitiveLoad > 0.7 ? 'High load' : cognitiveLoad > 0.4 ? 'Moderate' : 'Fresh'}
                </span>
            </div>

            {/* Optimal action recommendation */}
            {optimalAction && (
                <button
                    className={`${styles.actionButton} ${styles[`priority${optimalAction.priority.charAt(0).toUpperCase() + optimalAction.priority.slice(1)}`]}`}
                    onClick={() => onActionSelect?.(optimalAction)}
                >
                    {optimalAction.type === 'break' && <Coffee size={16} />}
                    {optimalAction.type === 'review' && <Clock size={16} />}
                    {optimalAction.type === 'learn' && <Brain size={16} />}
                    <span>{optimalAction.message}</span>
                    <ArrowRight size={14} />
                </button>
            )}
        </motion.div>
    );
}

export default VelocityDashboard;
