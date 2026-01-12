/**
 * BucketReadinessChecklist Component
 * 
 * Replaces Tier Distribution Chart with specific bucket readiness percentages.
 * Shows: "Foundation: 100% Solid" / "Keystone: 15% Hollow"
 * 
 * Part of Mental Filing Cabinet transformation.
 */

import { motion } from 'framer-motion';
import { CheckCircle2, Flame, AlertTriangle } from 'lucide-react';
import { FEEDBACK_COLORS } from '@/constants/theme-colors';
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
}

type ReadinessStatus = 'solid' | 'warming' | 'hollow';

function getReadinessStatus(percentage: number): ReadinessStatus {
    if (percentage >= 80) return 'solid';
    if (percentage >= 40) return 'warming';
    return 'hollow';
}

function getStatusIcon(status: ReadinessStatus) {
    switch (status) {
        case 'solid':
            return <CheckCircle2 size={18} style={{ color: FEEDBACK_COLORS.correct }} />;
        case 'warming':
            return <Flame size={18} style={{ color: 'var(--color-warning)' }} />;
        case 'hollow':
            return <AlertTriangle size={18} style={{ color: 'var(--color-primary-coral)' }} />;
    }
}

function getStatusLabel(status: ReadinessStatus): string {
    switch (status) {
        case 'solid': return 'Solid';
        case 'warming': return 'Warming';
        case 'hollow': return 'Hollow';
    }
}

export function BucketReadinessChecklist({
    foundation,
    keystone,
    utility,
    delay = 0
}: BucketReadinessChecklistProps) {
    const buckets = [
        { name: 'Foundation', data: foundation, description: 'Core concepts you need first' },
        { name: 'Keystone', data: keystone, description: 'Central logic and relationships' },
        { name: 'Utility', data: utility, description: 'Practical application tools' }
    ];

    return (
        <div className={styles.container}>
            {buckets.map((bucket, index) => {
                const percentage = bucket.data.total > 0
                    ? Math.round((bucket.data.mastered / bucket.data.total) * 100)
                    : 0;
                const status = getReadinessStatus(percentage);

                return (
                    <motion.div
                        key={bucket.name}
                        className={`${styles.bucketRow} ${styles[status]}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: delay + (index * 0.1) }}
                    >
                        <div className={styles.bucketHeader}>
                            <span className={styles.bucketName}>{bucket.name}</span>
                            <div className={styles.statusBadge}>
                                {getStatusIcon(status)}
                                <span className={styles.statusLabel}>
                                    {percentage}% {getStatusLabel(status)}
                                </span>
                            </div>
                        </div>

                        <div className={styles.progressTrack}>
                            <motion.div
                                className={`${styles.progressFill} ${styles[status]}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ delay: delay + 0.2 + (index * 0.1), duration: 0.6, ease: 'easeOut' }}
                            />
                        </div>

                        <div className={styles.bucketMeta}>
                            <span className={styles.conceptCount}>
                                {bucket.data.mastered}/{bucket.data.total} concepts
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
