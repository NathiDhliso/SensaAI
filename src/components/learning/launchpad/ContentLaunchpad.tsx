
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Activity,
    Clock,
    Target,
    ArrowLeft,
    Play,
    AlertCircle,
    Sparkles,
    LayoutGrid,
    Layers,
    HeartPulse,
    GitBranch
} from 'lucide-react';
import { motion } from 'framer-motion';

import { storageManager } from '@/lib/storage';
import { analyzeContentQuality, type ContentAnalytics } from '@/lib/ai/content-analytics';
import type { SavedResult } from '@/lib/storage/types';

import { ScoreCard } from './ScoreCard';
import { CoverageTreemap } from './CoverageTreemap';
import { TierDistributionChart } from './TierDistributionChart';
import { ContentHealthIndicators } from './ContentHealthIndicators';
import { LifecyclePhaseDisplay } from './LifecyclePhaseDisplay';
import styles from './ContentLaunchpad.module.css';

export default function ContentLaunchpad() {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();

    const [result, setResult] = useState<SavedResult | null>(null);
    const [analytics, setAnalytics] = useState<ContentAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 1. Fetch Data
    useEffect(() => {
        const loadData = async () => {
            if (!subjectId) return;
            try {
                const data = await storageManager.loadResult(subjectId);
                if (data) {
                    setResult(data);
                    // 2. Run Analytics (Pure Calculation)
                    const metrics = analyzeContentQuality(data);
                    setAnalytics(metrics);
                } else {
                    setError('Content not found');
                }
            } catch (err) {
                setError('Failed to load content analytics');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [subjectId]);

    // 3. Handlers
    const handleStartLearning = () => {
        navigate(`/study/${subjectId}?tab=learn`);
    };

    if (loading) {
        return (
            <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        style={{ marginBottom: '1rem' }}
                    >
                        <Sparkles size={32} className={styles.loadingIcon} />
                    </motion.div>
                    <p style={{ fontSize: '1rem', fontWeight: 500 }}>Preparing your dashboard...</p>
                </motion.div>
            </div>
        );
    }

    if (error || !analytics || !result) {
        return (
            <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        textAlign: 'center',
                        color: 'var(--color-text-secondary)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem'
                    }}
                >
                    <AlertCircle size={40} style={{ color: 'var(--color-warning)' }} />
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                        {error || 'Analytics Unavailable'}
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: '300px' }}>
                        We couldn't load the analytics for this content. Please try again.
                    </p>
                    <button onClick={() => navigate('/library')} className={styles.backButton} style={{ marginTop: '0.5rem' }}>
                        <ArrowLeft size={16} /> Back to Library
                    </button>
                </motion.div>
            </div>
        );
    }

    const { metrics, systemPromptMetrics, coverageMap, recommendations } = analytics;

    return (
        <div className={styles.container}>
            {/* HEADER */}
            <header className={styles.header}>
                <div className={styles.titleGroup}>
                    <button onClick={() => navigate('/library')} className={styles.backButton}>
                        <ArrowLeft size={16} /> Library
                    </button>
                    <h1>{result.subject}</h1>
                    {/* Lifecycle Phases - STEP 2 from System Prompt */}
                    {systemPromptMetrics.lifecyclePhases && (
                        <LifecyclePhaseDisplay
                            phases={systemPromptMetrics.lifecyclePhases}
                            delay={0.05}
                        />
                    )}
                </div>
            </header>

            {/* SCORECARDS */}
            <div className={styles.scoreRow}>
                <ScoreCard
                    title="Readiness Score"
                    value={`${metrics.qualityScore}%`}
                    icon={Target}
                    status={metrics.qualityScore > 80 ? 'good' : metrics.qualityScore > 60 ? 'neutral' : 'warning'}
                    delay={0.1}
                />
                <ScoreCard
                    title="Predicted Pass Rate"
                    value={`${metrics.predictedPassRate}%`}
                    icon={Activity}
                    status={metrics.predictedPassRate > 75 ? 'good' : metrics.predictedPassRate > 50 ? 'neutral' : 'warning'}
                    delay={0.15}
                />
                <ScoreCard
                    title="Est. Mastery Time"
                    value={metrics.masteryTimeMinutes}
                    unit="mins"
                    icon={Clock}
                    status="neutral"
                    delay={0.2}
                />
            </div>

            {/* MAIN GRID - Extended with new sections */}
            <div className={styles.mainGrid}>
                {/* LEFT COLUMN */}
                <div className={styles.leftColumn}>
                    {/* TREEMAP */}
                    <motion.div
                        className={styles.treemapSection}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.4 }}
                    >
                        <div className={styles.sectionTitle}>
                            <span>Content Coverage</span>
                            <LayoutGrid size={18} />
                        </div>
                        <div style={{ flexGrow: 1, minHeight: 0 }}>
                            <CoverageTreemap data={coverageMap} />
                        </div>
                    </motion.div>

                    {/* TIER DISTRIBUTION - STEP 3.7 from System Prompt */}
                    <motion.div
                        className={styles.tierSection}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.4 }}
                    >
                        <div className={styles.sectionTitle}>
                            <span>Dependency Tiers</span>
                            <Layers size={18} />
                        </div>
                        <TierDistributionChart
                            data={systemPromptMetrics.tierDistribution}
                            delay={0.4}
                        />
                    </motion.div>
                </div>

                {/* RIGHT COLUMN */}
                <div className={styles.rightColumn}>
                    {/* CONTENT HEALTH - System Prompt Elements */}
                    <motion.div
                        className={styles.healthSection}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                    >
                        <div className={styles.sectionTitle}>
                            <span>Content Health</span>
                            <HeartPulse size={18} />
                        </div>
                        <ContentHealthIndicators
                            shapeCoverage={systemPromptMetrics.shapeCoverage}
                            mnemonicCoverage={systemPromptMetrics.mnemonicCoverage}
                            confusionPairsCount={systemPromptMetrics.confusionPairs.length}
                            hasDecisionTrees={systemPromptMetrics.decisionFrameworks.available}
                            delay={0.35}
                        />
                    </motion.div>

                    {/* RECOMMENDATIONS / INSIGHTS */}
                    <motion.div
                        className={styles.recommendationsSection}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.4 }}
                    >
                        <div className={styles.sectionTitle}>
                            <span>Insights</span>
                            <Sparkles size={18} />
                        </div>

                        <div className={styles.recList}>
                            {recommendations.length > 0 ? recommendations.map((rec, i) => (
                                <motion.div
                                    key={i}
                                    className={styles.recItem}
                                    initial={{ opacity: 0, x: 8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.45 + (i * 0.08) }}
                                >
                                    {rec}
                                </motion.div>
                            )) : (
                                <div className={styles.emptyState}>
                                    Looking good! No recommendations at this time.
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* CONFUSION PAIRS PREVIEW - STEP 5.5 */}
                    {systemPromptMetrics.confusionPairs.length > 0 && (
                        <motion.div
                            className={styles.confusionSection}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.4 }}
                        >
                            <div className={styles.sectionTitle}>
                                <span>Confusion Pairs</span>
                                <GitBranch size={18} />
                            </div>
                            <div className={styles.confusionList}>
                                {systemPromptMetrics.confusionPairs.slice(0, 3).map((pair, i) => (
                                    <motion.div
                                        key={pair.id}
                                        className={styles.confusionPair}
                                        initial={{ opacity: 0, x: 8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.55 + (i * 0.08) }}
                                    >
                                        <div className={styles.pairConcepts}>
                                            <span className={styles.conceptA}>{pair.conceptA}</span>
                                            <span className={styles.vsLabel}>vs</span>
                                            <span className={styles.conceptB}>{pair.conceptB}</span>
                                        </div>
                                        <p className={styles.distinctionKey}>{pair.distinctionKey}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* FOOTER */}
            <motion.footer
                className={styles.footer}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
            >
                <div className={styles.footerStats}>
                    <div className={styles.footerStat}>
                        <span className={styles.statLabel}>Concepts</span>
                        <span className={styles.statValue}>{metrics.totalConcepts}</span>
                    </div>
                    <div className={styles.footerStat}>
                        <span className={styles.statLabel}>Word Count</span>
                        <span className={styles.statValue}>{metrics.wordCount.toLocaleString()}</span>
                    </div>
                </div>

                <button onClick={handleStartLearning} className={styles.startButton}>
                    Begin Learning <Play size={18} fill="currentColor" />
                </button>
            </motion.footer>
        </div>
    );
}
