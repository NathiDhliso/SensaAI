/**
 * ConceptProgressIndicator
 * 
 * Shows "Concept X of Y" with progress bar
 * Provides clear visual feedback of learning progress
 */

import { motion } from 'framer-motion';
import styles from './ConceptProgressIndicator.module.css';

interface ConceptProgressIndicatorProps {
    current: number;
    total: number;
    compact?: boolean;
}

export function ConceptProgressIndicator({
    current,
    total,
    compact = false,
}: ConceptProgressIndicatorProps) {
    const percentage = total > 0 ? (current / total) * 100 : 0;

    return (
        <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
            <div className={styles.label}>
                <span className={styles.current}>Concept {current}</span>
                <span className={styles.separator}>of</span>
                <span className={styles.total}>{total}</span>
                <span className={styles.percentage}>• {Math.round(percentage)}%</span>
            </div>

            <div className={styles.progressBar}>
                <motion.div
                    className={styles.progressFill}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
            </div>
        </div>
    );
}

export default ConceptProgressIndicator;
