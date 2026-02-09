import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Play,
    AlertCircle,
    Sparkles,
    Clock,
    Lock,
    Map,
    MessageCircle,
    Trophy,
    AlertTriangle,
    Zap,
    BatteryFull,
    Battery,
    BatteryLow,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { storageManager } from '@/features/content-storage';
import { parseGeneratedContent } from '@/features/content-generation/parsers';
import type { ParsedGeneratedContent } from '@/features/content-generation/parsers/types';
import type { SavedResult } from '@/features/content-storage/types';
import { auditContent } from '@/features/content-audit';
import { getSpacingEngine } from '@/features/learning-session/algorithms/spacing-engine';
import type { ScheduledReview } from '@/features/learning-session/algorithms/spacing-engine';
import { moodToBandwidth, type CognitiveBandwidth } from '@/features/ai-coach';
import { usePersonalizationStore } from '@/store/personalization-store';

import styles from './ContentLaunchpad.module.css';

const OBJECTIVES_KEY_PREFIX = 'sensa:objectives:';

function loadSavedObjectives(subjectId: string): string[] {
    try {
        const raw = localStorage.getItem(`${OBJECTIVES_KEY_PREFIX}${subjectId}`);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

const BANDWIDTH_CONFIG: Record<CognitiveBandwidth, { icon: React.ReactNode; label: string; color: string }> = {
    high: { icon: <BatteryFull size={16} />, label: 'High Focus', color: 'var(--color-success)' },
    medium: { icon: <Battery size={16} />, label: 'Steady', color: 'var(--color-warning)' },
    low: { icon: <BatteryLow size={16} />, label: 'Low Battery', color: 'var(--color-text-muted)' },
};

export default function ContentLaunchpad() {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();
    const { lastSessionMood } = usePersonalizationStore();

    const [result, setResult] = useState<SavedResult | null>(null);
    const [_parsedData, setParsedData] = useState<ParsedGeneratedContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dueReviews, setDueReviews] = useState<ScheduledReview[]>([]);

    const bandwidth: CognitiveBandwidth = useMemo(() => {
        return lastSessionMood ? moodToBandwidth(lastSessionMood) : 'medium';
    }, [lastSessionMood]);

    const bwConfig = BANDWIDTH_CONFIG[bandwidth];

    const runAudit = useCallback((parsed: ParsedGeneratedContent, objectives: string[]) => {
        auditContent(parsed, objectives);
    }, []);

    useEffect(() => {
        const loadData = async () => {
            if (!subjectId) return;
            try {
                const data = await storageManager.loadResult(subjectId);
                if (data) {
                    setResult(data);
                    const parseResult = parseGeneratedContent(data.fullDocument);
                    if (parseResult.success && parseResult.data) {
                        setParsedData(parseResult.data);
                        const savedObjectives = loadSavedObjectives(subjectId);
                        runAudit(parseResult.data, savedObjectives);
                    }
                } else {
                    setError('Content not found');
                }
            } catch (err) {
                setError('Failed to load content');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [subjectId, runAudit]);

    useEffect(() => {
        try {
            const spacing = getSpacingEngine();
            const due = spacing.getDueReviews();
            setDueReviews(due);
        } catch { /* spacing not initialized yet */ }
    }, []);

    const handleStartLearning = () => {
        navigate(`/study/${subjectId}?tab=learn`);
    };

    const handleReviewConcept = (conceptId: string) => {
        navigate(`/study/${subjectId}?tab=learn&concept=${conceptId}&mode=micro-loop`);
    };

    if (loading) {
        return (
            <div className={`${styles.container} ${styles.loadingContainer}`}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={styles.loadingContent}
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className={styles.loadingSpinner}
                    >
                        <Sparkles size={32} className={styles.loadingIcon} />
                    </motion.div>
                    <p className={styles.loadingText}>Loading your gym...</p>
                </motion.div>
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className={`${styles.container} ${styles.errorContainer}`}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={styles.errorContent}
                >
                    <AlertCircle size={40} className={styles.errorIcon} />
                    <h2 className={styles.errorTitle}>
                        {error || 'Content Not Found'}
                    </h2>
                    <p className={styles.errorMessage}>
                        {error ? 'We couldn\'t load this content. Please try again.' : 'This content is no longer available.'}
                    </p>
                    <button onClick={() => navigate('/library')} className={`${styles.backButton} ${styles.errorBack}`}>
                        <ArrowLeft size={16} /> Back to Library
                    </button>
                </motion.div>
            </div>
        );
    }

    const showBuildLab = bandwidth !== 'low';
    const showProvingGrounds = bandwidth === 'high';

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleGroup}>
                    <button onClick={() => navigate('/library')} className={styles.backButton}>
                        <ArrowLeft size={16} /> Library
                    </button>
                    <div className={styles.titleRow}>
                        <h1>{result.subject}</h1>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.batteryIndicator} style={{ borderColor: bwConfig.color }}>
                        {bwConfig.icon}
                        <span className={styles.batteryLabel}>{bwConfig.label}</span>
                    </div>
                    <button onClick={handleStartLearning} className={styles.headerCta}>
                        <Play size={18} /> Start Session
                    </button>
                </div>
            </header>

            <div className={styles.gymLayout}>
                {/* ═══════════════════════════════════════════════════════════
                    ZONE 1: THE DAILY STACK
                ═══════════════════════════════════════════════════════════ */}
                <section className={styles.zone}>
                    <div className={styles.zoneHeader}>
                        <div className={styles.zoneTitle}>
                            <Clock size={18} />
                            <h2>The Daily Stack</h2>
                        </div>
                        <span className={styles.zoneBadge}>
                            {dueReviews.length} due
                        </span>
                    </div>

                    {dueReviews.length > 0 ? (
                        <div className={styles.dailyTicker}>
                            {dueReviews.slice(0, 8).map(review => {
                                const overdueDays = Math.max(0, Math.floor(
                                    (Date.now() - new Date(review.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                                ));
                                return (
                                    <button
                                        key={review.conceptId}
                                        className={`${styles.reviewCard} ${overdueDays > 3 ? styles.reviewCardStale : ''}`}
                                        onClick={() => handleReviewConcept(review.conceptId)}
                                    >
                                        <span className={styles.reviewName}>{review.conceptName}</span>
                                        <span className={styles.reviewMeta}>
                                            {overdueDays > 0 ? (
                                                <><AlertTriangle size={12} /> {overdueDays}d overdue</>
                                            ) : (
                                                <><Zap size={12} /> Due today</>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={styles.zoneEmpty}>
                            <Sparkles size={20} />
                            <span>No reviews due — you're all caught up!</span>
                        </div>
                    )}
                </section>

                {/* ═══════════════════════════════════════════════════════════
                    ZONE 2: THE BUILD LAB
                ═══════════════════════════════════════════════════════════ */}
                <section className={`${styles.zone} ${!showBuildLab ? styles.zoneLocked : ''}`}>
                    <div className={styles.zoneHeader}>
                        <div className={styles.zoneTitle}>
                            <Map size={18} />
                            <h2>The Build Lab</h2>
                        </div>
                        {!showBuildLab && (
                            <span className={styles.zoneLockBadge}>
                                <Lock size={14} /> Needs Steady+
                            </span>
                        )}
                    </div>

                    {showBuildLab ? (
                        <div className={styles.zoneCards}>
                            <button
                                className={styles.activityCard}
                                onClick={() => navigate(`/study/${subjectId}?tab=learn&activity=concept-map`)}
                            >
                                <div className={styles.activityIcon}>
                                    <Map size={24} />
                                </div>
                                <div className={styles.activityInfo}>
                                    <span className={styles.activityName}>Concept Map</span>
                                    <span className={styles.activityDesc}>Build connections between ideas</span>
                                </div>
                            </button>
                            <button
                                className={styles.activityCard}
                                onClick={() => navigate(`/study/${subjectId}?tab=learn&activity=peer-review`)}
                            >
                                <div className={styles.activityIcon}>
                                    <MessageCircle size={24} />
                                </div>
                                <div className={styles.activityInfo}>
                                    <span className={styles.activityName}>Peer Review</span>
                                    <span className={styles.activityDesc}>Defend your understanding</span>
                                </div>
                            </button>
                        </div>
                    ) : (
                        <div className={styles.zoneLockedOverlay}>
                            <Lock size={28} />
                            <p>Set battery to Steady or higher to unlock</p>
                        </div>
                    )}
                </section>

                {/* ═══════════════════════════════════════════════════════════
                    ZONE 3: THE PROVING GROUNDS
                ═══════════════════════════════════════════════════════════ */}
                <section className={`${styles.zone} ${!showProvingGrounds ? styles.zoneLocked : ''}`}>
                    <div className={styles.zoneHeader}>
                        <div className={styles.zoneTitle}>
                            <Trophy size={18} />
                            <h2>The Proving Grounds</h2>
                        </div>
                        {!showProvingGrounds && (
                            <span className={styles.zoneLockBadge}>
                                <Lock size={14} /> Needs High Focus
                            </span>
                        )}
                    </div>

                    {showProvingGrounds ? (
                        <div className={styles.zoneCards}>
                            <button
                                className={styles.activityCard}
                                onClick={() => navigate(`/study/${subjectId}?tab=learn&activity=mastery`)}
                            >
                                <div className={styles.activityIcon}>
                                    <Trophy size={24} />
                                </div>
                                <div className={styles.activityInfo}>
                                    <span className={styles.activityName}>Mastery Challenge</span>
                                    <span className={styles.activityDesc}>Prove deep understanding</span>
                                </div>
                            </button>
                            <button
                                className={styles.activityCard}
                                onClick={() => navigate(`/study/${subjectId}?tab=learn&activity=pre-mortem`)}
                            >
                                <div className={styles.activityIcon}>
                                    <AlertTriangle size={24} />
                                </div>
                                <div className={styles.activityInfo}>
                                    <span className={styles.activityName}>Pre-Mortem</span>
                                    <span className={styles.activityDesc}>Find the failure before it happens</span>
                                </div>
                            </button>
                        </div>
                    ) : (
                        <div className={styles.zoneLockedOverlay}>
                            <Lock size={28} />
                            <p>Set battery to High Focus to unlock</p>
                        </div>
                    )}
                </section>
            </div>

            <footer className={styles.footer}>
                <div className={styles.footerStats}>
                    <div className={styles.footerStat}>
                        <span className={styles.statLabel}>Generated</span>
                        <span className={styles.statValue}>{new Date(result.generatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className={styles.footerStat}>
                        <span className={styles.statLabel}>Reviews Due</span>
                        <span className={styles.statValue}>{dueReviews.length}</span>
                    </div>
                </div>
                <button onClick={handleStartLearning} className={styles.startButton}>
                    <Play size={18} /> Start Session
                </button>
            </footer>
        </div>
    );
}
