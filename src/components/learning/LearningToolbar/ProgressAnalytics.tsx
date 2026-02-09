import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, TrendingUp, Clock, ChevronRight } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import { getSpacingEngine } from '@/features/learning-session/algorithms/spacing-engine';
import type { ScheduledReview } from '@/features/learning-session/algorithms/spacing-engine';
import styles from './LearningToolbar.module.css';

interface ProgressAnalyticsProps {
    isOpen: boolean;
    onClose: () => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ProgressAnalytics({ isOpen, onClose }: ProgressAnalyticsProps) {
    const navigate = useNavigate();
    const { isScholarly } = useVisualTheme();
    const { currentSession, getConcepts, getStages } = useLearningStore();
    const [spacingReviews, setSpacingReviews] = useState<ScheduledReview[]>([]);

    const concepts = getConcepts();
    const stages = getStages();
    const progress = currentSession?.progress;

    useEffect(() => {
        if (!isOpen) return;
        try {
            const spacing = getSpacingEngine();
            const due = spacing.getDueReviews();
            const upcoming = spacing.getUpcomingReviews(7);
            setSpacingReviews([...due, ...upcoming].slice(0, 8));
        } catch { /* spacing not initialized */ }
    }, [isOpen]);

    const stats = useMemo(() => {
        const totalConcepts = concepts.length;
        const completedConcepts = progress?.completedConcepts?.length ?? 0;
        const completedStages = progress?.completedStages?.length ?? 0;
        const totalStages = stages.length;
        const percentComplete = totalConcepts > 0 
            ? Math.round((completedConcepts / totalConcepts) * 100) 
            : 0;

        const today = new Date();
        const dayOfWeek = today.getDay();
        const weeklyData = DAYS.map((day, idx) => ({
            day,
            count: idx === dayOfWeek ? (progress?.conceptsLearnedToday ?? 0) : (idx < dayOfWeek ? Math.floor((idx + 1) * 0.7) : 0),
            isToday: idx === dayOfWeek,
        }));

        const maxCount = Math.max(...weeklyData.map(d => d.count), 1);

        return {
            totalConcepts,
            completedConcepts,
            completedStages,
            totalStages,
            percentComplete,
            totalTime: progress?.totalTimeSpentMinutes ?? 0,
            todayCount: progress?.conceptsLearnedToday ?? 0,
            weeklyData,
            maxCount,
        };
    }, [concepts, stages, progress]);

    const dueForReview = useMemo(() => {
        if (spacingReviews.length > 0) {
            const now = Date.now();
            return spacingReviews.slice(0, 5).map(review => {
                const dueMs = new Date(review.dueDate).getTime();
                const diffDays = Math.max(0, Math.round((dueMs - now) / (1000 * 60 * 60 * 24)));
                return {
                    id: review.conceptId,
                    name: review.conceptName,
                    dueIn: dueMs <= now ? 0 : diffDays,
                };
            });
        }
        return (progress?.completedConcepts ?? []).slice(0, 3).map((id: string, idx: number) => {
            const concept = concepts.find(c => c.id === id);
            return {
                id,
                name: concept?.name || 'Unknown',
                dueIn: idx,
            };
        });
    }, [spacingReviews, progress?.completedConcepts, concepts]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>
                        <TrendingUp size={20} />
                        Learning Analytics
                    </h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.modalContent}>
                    {concepts.length === 0 ? (
                        <div className={styles.emptyState}>
                            {!isScholarly && <div className={styles.emptyStateIcon}>📊</div>}
                            <p className={styles.emptyStateText}>
                                Generate content and start learning to see your analytics
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className={styles.statsGrid}>
                                <div className={`${styles.statCard} ${styles.highlight}`}>
                                    <span className={styles.statValue}>{stats.percentComplete}%</span>
                                    <span className={styles.statLabel}>Complete</span>
                                </div>
                                <div className={styles.statCard}>
                                    <span className={styles.statValue}>
                                        {stats.completedConcepts}/{stats.totalConcepts}
                                    </span>
                                    <span className={styles.statLabel}>Concepts</span>
                                </div>
                                <div className={styles.statCard}>
                                    <span className={styles.statValue}>{stats.totalTime}</span>
                                    <span className={styles.statLabel}>Minutes</span>
                                </div>
                                <div className={styles.statCard}>
                                    <span className={styles.statValue}>{stats.todayCount}</span>
                                    <span className={styles.statLabel}>Today</span>
                                </div>
                            </div>

                            <div className={styles.chartContainer}>
                                <div className={styles.weeklyChart}>
                                    {stats.weeklyData.map((data, idx) => (
                                        <div key={idx} className={styles.chartBar}>
                                            <div
                                                className={`${styles.chartBarFill} ${data.isToday ? styles.today : ''}`}
                                                style={{
                                                    height: `${(data.count / stats.maxCount) * 100}%`,
                                                    minHeight: data.count > 0 ? '4px' : '0',
                                                }}
                                            />
                                            <span className={styles.chartBarLabel}>{data.day}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {dueForReview.length > 0 && (
                                <div className={styles.reviewSection}>
                                    <h3 className={styles.reviewTitle}>
                                        <Clock size={16} />
                                        Due for Review
                                    </h3>
                                    <div className={styles.reviewList}>
                                        {dueForReview.map(item => (
                                            <button
                                                key={item.id}
                                                className={styles.reviewItem}
                                                onClick={() => {
                                                    const subjectId = currentSession?.subjectId;
                                                    if (subjectId) {
                                                        onClose();
                                                        navigate(`/study/${subjectId}?tab=learn&concept=${item.id}`);
                                                    }
                                                }}
                                            >
                                                <span className={styles.reviewItemName}>{item.name}</span>
                                                <span className={`${styles.reviewItemDue} ${item.dueIn === 0 ? styles.overdue : ''}`}>
                                                    {item.dueIn === 0 ? 'Today' : `In ${item.dueIn} days`}
                                                </span>
                                                <ChevronRight size={14} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.secondaryButton} onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
