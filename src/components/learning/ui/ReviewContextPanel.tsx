/**
 * ReviewContextPanel — Enhancement A
 *
 * Collapsible inline panel shown during review sessions only.
 * Surfaces prior review data so the learner has context.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    FileText,
    ChevronDown,
    AlertCircle,
    History
} from 'lucide-react';
import styles from './ReviewContextPanel.module.css';

export interface ReviewContext {
    /** ISO date of last review */
    lastReviewDate?: string;
    /** Previous blank sheet response summary */
    previousResponse?: string;
    /** Mastery question the user previously failed */
    failedQuestion?: string;
    /** Decay status of the concept */
    decayStatus?: 'fresh' | 'fading' | 'forgotten';
}

interface ReviewContextPanelProps {
    conceptName: string;
    context: ReviewContext;
}

export function ReviewContextPanel({ conceptName, context }: ReviewContextPanelProps) {
    const [isOpen, setIsOpen] = useState(false);

    const hasData = context.lastReviewDate || context.previousResponse || context.failedQuestion;

    const formatDate = (iso?: string) => {
        if (!iso) return 'Never';
        const d = new Date(iso);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return d.toLocaleDateString();
    };

    return (
        <div className={styles.container}>
            <div className={styles.header} onClick={() => setIsOpen(o => !o)}>
                <div className={styles.headerLeft}>
                    <History size={16} className={styles.headerIcon} />
                    <span>Your History: {conceptName}</span>
                </div>
                <ChevronDown
                    size={16}
                    className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                />
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={styles.body}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {!hasData ? (
                            <p className={styles.noData}>First time reviewing this concept.</p>
                        ) : (
                            <>
                                <div className={styles.row}>
                                    <Clock size={14} className={styles.rowIcon} />
                                    <div className={styles.rowContent}>
                                        <div className={styles.rowLabel}>Last Reviewed</div>
                                        <div className={styles.rowValue}>{formatDate(context.lastReviewDate)}</div>
                                    </div>
                                </div>
                                {context.previousResponse && (
                                    <div className={styles.row}>
                                        <FileText size={14} className={styles.rowIcon} />
                                        <div className={styles.rowContent}>
                                            <div className={styles.rowLabel}>Your Previous Response</div>
                                            <div className={styles.rowValue}>{context.previousResponse}</div>
                                        </div>
                                    </div>
                                )}
                                {context.failedQuestion && (
                                    <div className={styles.row}>
                                        <AlertCircle size={14} className={styles.rowIcon} />
                                        <div className={styles.rowContent}>
                                            <div className={styles.rowLabel}>Previously Missed</div>
                                            <div className={styles.rowValue}>{context.failedQuestion}</div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ReviewContextPanel;
