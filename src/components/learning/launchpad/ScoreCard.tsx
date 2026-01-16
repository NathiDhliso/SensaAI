
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Info } from 'lucide-react';
import { SCORE_COLORS } from '@/constants/theme-colors';
import styles from './ScoreCard.module.css';

interface ScoreCardProps {
    id?: string;
    title: string;
    value: string | number;
    unit?: string;
    icon: LucideIcon;
    status?: 'good' | 'warning' | 'neutral';
    tooltip?: string;
    delay?: number;
}


export const ScoreCard: React.FC<ScoreCardProps> = ({
    id,
    title,
    value,
    unit,
    icon: Icon,
    status = 'neutral',
    tooltip,
    delay = 0
}) => {
    const color = SCORE_COLORS[status];
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <motion.div
            id={id}
            className={styles.card}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4, ease: 'easeOut' }}
            style={{ '--status-color': color } as React.CSSProperties}
        >
            <div className={styles.header}>
                <span className={styles.title}>{title}</span>
                <div className={styles.iconGroup}>
                    {tooltip && (
                        <div 
                            className={styles.infoIcon}
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                        >
                            <Info size={14} />
                            <AnimatePresence>
                                {showTooltip && (
                                    <motion.div 
                                        className={styles.tooltip}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                    >
                                        {tooltip}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                    <div className={styles.iconWrapper}>
                        <Icon size={18} color={color} strokeWidth={2} />
                    </div>
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
