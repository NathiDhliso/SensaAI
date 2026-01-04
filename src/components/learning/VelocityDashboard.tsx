/**
 * SensaAI Velocity Dashboard
 * 
 * Displays learning velocity metrics, retention rates, and optimal action recommendations.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Zap,
    TrendingUp,
    TrendingDown,
    Clock,
    Target,
    Brain,
    Coffee,
    ArrowRight,
    BarChart3
} from 'lucide-react';
import { getSpacingEngine } from '@/lib/learning/spacing-engine';
import type { SpacingMetrics } from '@/lib/learning/spacing-engine';
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
        if (trendPercent > 5) trend = 'up';
        else if (trendPercent < -5) trend = 'down';
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
        return calculateVelocityMetrics(sessionConceptsCompleted, minutes, 5); // 5 as placeholder prev
    }, [sessionConceptsCompleted, sessionStartTime]);

    // Determine optimal action
    const optimalAction = useMemo(() => {
        if (!spacingMetrics) return null;
        return determineOptimalAction(spacingMetrics, cognitiveLoad);
    }, [spacingMetrics, cognitiveLoad]);

    return (
        <motion.div
            className={styles.dashboard}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
        >
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
