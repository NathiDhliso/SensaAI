/**
 * BucketReadinessChecklist Component
 * 
 * Shows tier distribution BEFORE learning begins (counts only).
 * After learning starts, shows mastery progress percentages.
 * 
 * Part of Mental Filing Cabinet transformation.
 */

import { motion } from 'framer-motion';
import { CheckCircle2, Flame, Circle, BookOpen } from 'lucide-react';
import { FEEDBACK_COLORS, GRAPH_COLORS } from '@/constants/theme-colors';
import styles from './BucketReadinessChecklist.module.css';

interface BucketProgress {
    total: number;
    mastered: number;
}

interface BucketReadinessChecklistProps {
    foundation: BucketProgress;
    keystone: BucketProgress;
    utility: BucketProgress;
    delay?: number;
    /** If true, shows mastery progress. If false (default), shows content overview */
    showProgress?: boolean;
}

type ReadinessStatus = 'solid' | 'warming' | 'hollow' | 'ready';

function getReadinessStatus(percentage: number, hasStarted: boolean): ReadinessStatus {
    if (!hasStarted) return 'ready'; // Pre-learning state
    if (percentage >= 80) return 'solid';
    if (percentage >= 40) return 'warming';
    return 'hollow';
}

function getStatusIcon(status: ReadinessStatus, tierColor: string) {
    switch (status) {
        case 'solid':
            return <CheckCircle2 size={18} style={{ color: FEEDBACK_COLORS.correct }} />;
        case 'warming':
            return <Flame size={18} style={{ color: 'var(--color-warning)' }} />;
        case 'hollow':
            return <Circle size={18} style={{ color: 'var(--color-text-muted)' }} />;
        case 'ready':
            return <BookOpen size={18} style={{ color: tierColor }} />;
    }
}

function getStatusLabel(status: ReadinessStatus, total: number): string {
    switch (status) {
        case 'solid': return 'Mastered';
        case 'warming': return 'In Progress';
        case 'hollow': return 'Not Started';
        case 'ready': return `${total} concepts`;
    }
}

const TIER_COLORS = {
    Foundation: GRAPH_COLORS.foundation,
    Keystone: GRAPH_COLORS.keystone,
    Utility: GRAPH_COLORS.utility,
};

export function BucketReadinessChecklist({
    foundation,
    keystone,
    utility,
    delay = 0,
    showProgress = false
}: BucketReadinessChecklistProps) {
    const buckets = [
        { name: 'Foundation' as const, data: foundation, description: 'Core concepts you need first' },
        { name: 'Keystone' as const, data: keystone, description: 'Central logic and relationships' },
        { name: 'Utility' as const, data: utility, description: 'Practical application tools' }
    ];

    // Determine if learning has started (any concepts mastered)
    const hasStarted = showProgress && (foundation.mastered > 0 || keystone.mastered > 0 || utility.mastered > 0);

    return (
        <div className={styles.container}>
            {buckets.map((bucket, index) => {
                const percentage = bucket.data.total > 0
                    ? Math.round((bucket.data.mastered / bucket.data.total) * 100)
                    : 0;
                const status = getReadinessStatus(percentage, hasStarted);
                const tierColor = TIER_COLORS[bucket.name];

                return (
                    <motion.div
                        key={bucket.name}
                        className={`${styles.bucketRow} ${styles[status]}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: delay + (index * 0.1) }}
                    >
                        <div className={styles.bucketHeader}>
                            <span className={styles.bucketName} style={{ color: tierColor }}>
                                {bucket.name}
                            </span>
                            <div className={styles.statusBadge}>
                                {getStatusIcon(status, tierColor)}
                                <span className={styles.statusLabel}>
                                    {hasStarted ? `${percentage}% ${getStatusLabel(status, bucket.data.total)}` : getStatusLabel(status, bucket.data.total)}
                                </span>
                            </div>
                        </div>

                        <div className={styles.progressTrack}>
                            <motion.div
                                className={`${styles.progressFill} ${styles[status]}`}
                                style={{ backgroundColor: hasStarted ? undefined : tierColor }}
                                initial={{ width: 0 }}
                                animate={{ width: hasStarted ? `${percentage}%` : '100%' }}
                                transition={{ delay: delay + 0.2 + (index * 0.1), duration: 0.6, ease: 'easeOut' }}
                            />
                        </div>

                        <div className={styles.bucketMeta}>
                            <span className={styles.conceptCount}>
                                {hasStarted 
                                    ? `${bucket.data.mastered}/${bucket.data.total} mastered`
                                    : `${bucket.data.total} concepts to learn`
                                }
                            </span>
                            <span className={styles.description}>{bucket.description}</span>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}

export default BucketReadinessChecklist;
