
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { COLORS } from '@/constants/theme-colors';
import type { ShapeCoverage, MnemonicCoverage } from '@/lib/ai/content-analytics';
import styles from './ContentHealthIndicators.module.css';

interface ContentHealthIndicatorsProps {
    shapeCoverage: ShapeCoverage;
    mnemonicCoverage: MnemonicCoverage;
    confusionPairsCount: number;
    hasDecisionTrees: boolean;
    delay?: number;
}

interface HealthIndicatorProps {
    label: string;
    value: number | string;
    status: 'complete' | 'partial' | 'missing';
    tooltip?: string;
    delay: number;
}

const STATUS_CONFIG = {
    complete: {
        Icon: CheckCircle,
        color: COLORS.success,
        bgClass: 'statusComplete',
    },
    partial: {
        Icon: Circle,
        color: COLORS.warning,
        bgClass: 'statusPartial',
    },
    missing: {
        Icon: AlertCircle,
        color: COLORS.text.muted,
        bgClass: 'statusMissing',
    },
} as const;

const HealthIndicator: React.FC<HealthIndicatorProps> = ({
    label,
    value,
    status,
    delay
}) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.Icon;

    return (
        <motion.div
            className={`${styles.indicator} ${styles[config.bgClass]}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.3 }}
        >
            <Icon size={16} color={config.color} strokeWidth={2.5} />
            <div className={styles.indicatorContent}>
                <span className={styles.indicatorLabel}>{label}</span>
                <span className={styles.indicatorValue}>{value}</span>
            </div>
        </motion.div>
    );
};

export const ContentHealthIndicators: React.FC<ContentHealthIndicatorsProps> = ({
    shapeCoverage,
    mnemonicCoverage,
    confusionPairsCount,
    hasDecisionTrees,
    delay = 0
}) => {
    // Determine statuses based on coverage
    const getStatus = (percentage: number): 'complete' | 'partial' | 'missing' => {
        if (percentage >= 80) return 'complete';
        if (percentage > 0) return 'partial';
        return 'missing';
    };

    const indicators: Array<{
        label: string;
        value: number | string;
        status: 'complete' | 'partial' | 'missing';
    }> = [
        {
            label: 'SHAPE Sections',
            value: `${shapeCoverage.percentage}%`,
            status: getStatus(shapeCoverage.percentage),
        },
        {
            label: 'Memory Anchors',
            value: `${mnemonicCoverage.percentage}%`,
            status: getStatus(mnemonicCoverage.percentage),
        },
        {
            label: 'Confusion Pairs',
            value: confusionPairsCount,
            status: confusionPairsCount >= 3 ? 'complete' : confusionPairsCount > 0 ? 'partial' : 'missing',
        },
        {
            label: 'Decision Trees',
            value: hasDecisionTrees ? 'Available' : 'None',
            status: hasDecisionTrees ? 'complete' : 'missing',
        },
    ];

    return (
        <div className={styles.container}>
            {indicators.map((ind, i) => (
                <HealthIndicator
                    key={ind.label}
                    label={ind.label}
                    value={ind.value}
                    status={ind.status}
                    delay={delay + (i * 0.08)}
                />
            ))}
        </div>
    );
};
