
import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import styles from './ScoreCard.module.css';

interface ScoreCardProps {
    title: string;
    value: string | number;
    unit?: string;
    icon: LucideIcon;
    status?: 'good' | 'warning' | 'neutral';
    tooltip?: string;
    delay?: number;
}

// Softer, more trustworthy colors
const STATUS_COLORS = {
    good: '#10B981',    // Sage green - calming success
    warning: '#F59E0B', // Warm amber - gentle attention
    neutral: '#60A5FA', // Calm blue - informational
};

export const ScoreCard: React.FC<ScoreCardProps> = ({
    title,
    value,
    unit,
    icon: Icon,
    status = 'neutral',
    delay = 0
}) => {
    const color = STATUS_COLORS[status];

    return (
        <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4, ease: 'easeOut' }}
            style={{ '--status-color': color } as React.CSSProperties}
        >
            <div className={styles.header}>
                <span className={styles.title}>{title}</span>
                <div className={styles.iconWrapper}>
                    <Icon size={18} color={color} strokeWidth={2} />
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.valueGroup}>
                    <span className={styles.value}>{value}</span>
                    {unit && <span className={styles.unit}>{unit}</span>}
                </div>
            </div>

            {/* Subtle glow indicator */}
            <div className={styles.glow} />
        </motion.div>
    );
};
