
import React from 'react';
import { motion } from 'framer-motion';
import { GRAPH_COLORS } from '@/shared/constants/theme-colors';
import type { TierDistribution } from '@/shared/types/content-analytics';
import styles from './TierDistributionChart.module.css';

interface TierDistributionChartProps {
    data: TierDistribution;
    delay?: number;
}

const TIER_CONFIG = {
    foundation: {
        label: 'Foundation',
        description: 'Core capabilities',
        color: GRAPH_COLORS.foundation,
    },
    keystone: {
        label: 'Keystone',
        description: 'Major functions',
        color: GRAPH_COLORS.keystone,
    },
    utility: {
        label: 'Utility',
        description: 'Specialized tools',
        color: GRAPH_COLORS.utility,
    },
} as const;

export const TierDistributionChart: React.FC<TierDistributionChartProps> = ({
    data,
    delay = 0
}) => {
    const total = data.total || 1; // Prevent division by zero

    const tiers = [
        { key: 'foundation', count: data.foundation },
        { key: 'keystone', count: data.keystone },
        { key: 'utility', count: data.utility },
    ] as const;

    // Calculate percentages
    const tiersWithPercentage = tiers.map(tier => ({
        ...tier,
        percentage: Math.round((tier.count / total) * 100),
        config: TIER_CONFIG[tier.key],
    }));

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
        >
            {/* Stacked Bar */}
            <div className={styles.barContainer}>
                {tiersWithPercentage.map((tier, i) => (
                    <motion.div
                        key={tier.key}
                        className={styles.barSegment}
                        style={{
                            width: `${tier.percentage}%`,
                            backgroundColor: tier.config.color,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${tier.percentage}%` }}
                        transition={{ delay: delay + 0.1 + (i * 0.1), duration: 0.5, ease: 'easeOut' }}
                    />
                ))}
            </div>

            {/* Legend */}
            <div className={styles.legend}>
                {tiersWithPercentage.map((tier, i) => (
                    <motion.div
                        key={tier.key}
                        className={styles.legendItem}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: delay + 0.3 + (i * 0.08) }}
                    >
                        <div
                            className={styles.legendDot}
                            style={{ backgroundColor: tier.config.color }}
                        />
                        <div className={styles.legendText}>
                            <span className={styles.tierLabel}>{tier.config.label}</span>
                            <span className={styles.tierCount}>{tier.count}</span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};
