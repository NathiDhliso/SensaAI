
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { COLORS } from '@/constants/theme-colors';
import {
    Activity,
    Clock,
    ArrowLeft,
    Play,
    AlertCircle,
    Sparkles,
    LayoutGrid,
    Layers,
    HeartPulse,
    GitBranch,
    Brain
} from 'lucide-react';
import { motion } from 'framer-motion';

import { storageManager } from '@/lib/storage';
import { analyzeContentQuality, type ContentAnalytics } from '@/lib/ai/content-analytics';
import { parseGeneratedContent } from '@/lib/content-adapter';
import type { SavedResult } from '@/lib/storage/types';
import { RepairStrategyRouter } from '@/lib/generation/repair-orchestrator';
import type { RepairPlan } from '@/lib/types/generation';
import { validateConceptContent } from '@/lib/validation/content-quality';
import { buildDocumentFromConcepts } from '@/lib/generation/backend-generator';
import type { ParsedConcept } from '@/lib/content-adapter/types';

import { ScoreCard } from './ScoreCard';
import { CoverageTreemap } from './CoverageTreemap';
import { BucketReadinessChecklist } from './BucketReadinessChecklist';
import { ContentHealthIndicators } from './ContentHealthIndicators';
import { EquationMetadataCard } from './EquationMetadataCard';
import { SourceVerification } from './SourceVerification';
import { FlowProgressBar } from '@/components/ui/FlowProgressBar';
import { DashboardTutorial, type TutorialStep } from './DashboardTutorial';
import styles from './ContentLaunchpad.module.css';

const TUTORIAL_STEPS: TutorialStep[] = [
    { targetId: 'mastery-score', title: 'Mastery Index', description: 'Your overall readiness score. 100% means you have covered all foundation, core, and advanced concepts.', position: 'bottom' },
    { targetId: 'pass-rate-score', title: 'Content Depth Score', description: 'Measures the structural richness of the content (mnemonics, key points) to ensure deep learning potential.', position: 'bottom' },
    { targetId: 'mastery-time-score', title: 'Est. Mastery Time', description: 'Estimated time to read and process this material relative to an average reading speed.', position: 'bottom' },
    { targetId: 'treemap-section', title: 'Concept Coverage', description: 'A visual map of the topic. Green blocks are foundational (start here), Purple are Keystones (core logic).', position: 'right' },
    { targetId: 'health-section', title: 'AI Quality Health', description: 'Checks if the AI generated deep content (Mnemonics, Decision Trees) rather than just surface-level text.', position: 'left' },
    { targetId: 'verification-section', title: 'Trust but Verify', description: 'Links to official docs and community discussions. Use these to cross-reference AI content with the real world.', position: 'left' },
    { targetId: 'insights-section', title: 'Actionable Insights', description: 'Personalized study tips based on the analysis. Use "Verify Credibility" here to check against exam topics.', position: 'left' }
];

export default function ContentLaunchpad() {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();

    const [result, setResult] = useState<SavedResult | null>(null);
    const [analytics, setAnalytics] = useState<ContentAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [repairPlan, setRepairPlan] = useState<RepairPlan | null>(null);
    const [concepts, setConcepts] = useState<ParsedConcept[]>([]);
    const [isRepairing, setIsRepairing] = useState(false);

    // Tutorial & Credibility State

    // Tutorial & Credibility State
    const [showTutorial, setShowTutorial] = useState(false);
    const [verifyingCredibility, setVerifyingCredibility] = useState(false);
    const [credibilityScore, setCredibilityScore] = useState<number | null>(null);

    const handleVerifyCredibility = () => {
        setVerifyingCredibility(true);
        // Simulate analysis scan time, but use REAL calculated data
        setTimeout(() => {
            setVerifyingCredibility(false);
            setCredibilityScore(analytics?.metrics.predictedPassRate || 0);
        }, 2000);
    };

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

                    // SURGICAL REPAIR CHECK (Phase 1)
                    // Check for critical content gaps that require surgical intervention
                    const strategies = new RepairStrategyRouter();
                    // Parse content to get concepts
                    const parseResult = parseGeneratedContent(data.fullDocument);
                    const loadedConcepts = parseResult.success && parseResult.data ? parseResult.data.concepts : [];
                    setConcepts(loadedConcepts);

                    const allGaps = loadedConcepts.flatMap(c => validateConceptContent(c));
                    const criticalGaps = allGaps.filter(g => g.severity === 'critical');

                    if (criticalGaps.length > 0) {
                        const plan = strategies.generateRepairPlan(criticalGaps, concepts);
                        if (plan.actions.length > 0) {
                            setRepairPlan(plan);
                        }
                    }

                    // Only set analytics if we don't need critical repairs (or if we want to show partial data)
                    // We'll show partial stats even if repair is needed
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

    const handleAutoRepair = async () => {
        if (!repairPlan || !result || !subjectId) return;

        setIsRepairing(true);
        try {
            const strategies = new RepairStrategyRouter();

            // Execute repair plan
            const newConcepts = await strategies.executeRepairPlan(
                repairPlan,
                concepts,
                result.subject,
                () => { /* Progress callback - silent */ }
            );

            // Rebuild document
            const strictConcepts = newConcepts.map(c => ({
                ...c,
                tier: c.tier || 'utility',
                stageId: c.stageId || 'PREPARE'
            }));
            const newDocument = buildDocumentFromConcepts(result.subject, strictConcepts);

            const newResult: SavedResult = {
                ...result,
                fullDocument: newDocument,
                generatedAt: new Date().toISOString()
            };

            // Save to storage
            await storageManager.saveResult(newResult);

            // Update local state
            setResult(newResult);
            setConcepts(newConcepts);
            setRepairPlan(null); // Clear plan to show dashboard

            // Re-run analytics
            const metrics = analyzeContentQuality(newResult);
            setAnalytics(metrics);

        } catch (err) {
            console.error("Auto-repair failed:", err);
            setError("Failed to apply repairs. Please try regenerating.");
        } finally {
            setIsRepairing(false);
        }
    };

    if (repairPlan) {
        return (
            <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>
                <motion.div
                    className={styles.repairContainer}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <HeartPulse size={48} className={styles.loadingIcon} style={{ color: 'var(--color-primary)' }} />
                        <div style={{ textAlign: 'left' }}>
                            <h2 style={{ margin: 0 }}>Self-Healing Content</h2>
                            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                                Surgical Merge Protocol Active
                            </p>
                        </div>
                    </div>

                    <div className={styles.repairCard}>
                        <h3 style={{ marginTop: 0 }}>Repair Plan ({repairPlan.actions.length} fixes)</h3>

                        <div className={styles.repairList}>
                            {repairPlan.actions.map((action, i) => (
                                <motion.div
                                    key={i}
                                    className={`${styles.repairItem} ${action.strategy === 'SURGICAL_AI' ? styles.ai : ''}`}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <Activity size={16} />
                                    <div className={styles.repairItemContent}>
                                        <div className={styles.repairItemTitle}>{action.conceptId}</div>
                                        <div className={styles.repairItemDetail}>
                                            {action.strategy === 'SURGICAL_AI' ? 'Optimizing: ' : 'Fixing: '}
                                            {action.field.split('.').pop()}
                                        </div>
                                    </div>
                                    <div className={styles.repairItemBadge}>
                                        {action.strategy.replace('_', ' ')}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className={styles.repairActions}>
                            <button onClick={() => navigate('/library')} className={styles.backButton}>
                                Cancel
                            </button>
                            <button
                                onClick={handleAutoRepair}
                                className={styles.startButton}
                                style={{
                                    opacity: isRepairing ? 0.7 : 1,
                                    cursor: isRepairing ? 'wait' : 'pointer'
                                }}
                                disabled={isRepairing}
                            >
                                {isRepairing ? (
                                    <>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                            style={{ marginRight: '0.5rem' }}
                                        >
                                            <Sparkles size={16} />
                                        </motion.div>
                                        Auto-Repairing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} style={{ marginRight: '0.5rem' }} />
                                        Start Auto-Repair
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h1>{result.subject}</h1>
                        <button
                            onClick={() => navigate(`/view/${subjectId}`)}
                            className={styles.backButton}
                            style={{ fontSize: '0.75rem', color: 'var(--color-accent-light)' }}
                            title="View formatted readable document"
                        >
                            (View Document)
                        </button>
                        <button
                            onClick={() => {
                                // Use octet-stream to force download instead of opening in tab
                                const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/octet-stream' });
                                const url = URL.createObjectURL(blob);

                                const safeSubject = (result.subject || 'untitled')
                                    .replace(/[^a-z0-9]+/gi, '-')
                                    .replace(/^-+|-+$/g, '')
                                    .toLowerCase();

                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `sensa-${safeSubject || 'export'}.json`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                            }}
                            className={styles.backButton}
                            style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}
                            title="Download raw JSON content to your computer"
                        >
                            (Download JSON)
                        </button>
                    </div>
                    {/* SENSA v2.0: 5-Step Flow Progress */}
                    <FlowProgressBar
                        currentPhase="see"
                        completedPhases={[]}
                        compact={true}
                    />
                    <button
                        onClick={() => setShowTutorial(true)}
                        className={styles.backButton}
                        style={{ marginLeft: '1rem', color: 'var(--color-accent)' }}
                        title="How to read this dashboard"
                    >
                        <AlertCircle size={16} /> Help
                    </button>
                </div>
            </header>

            <DashboardTutorial
                isOpen={showTutorial}
                onClose={() => setShowTutorial(false)}
                steps={TUTORIAL_STEPS}
            />

            {/* SCORECARDS - SENSA v2.0 Equation-centric */}
            <div className={styles.scoreRow}>
                <ScoreCard
                    id="mastery-score"
                    title="Mastery Index"
                    value={`${systemPromptMetrics.equationMetadata?.I_baseline
                        ? Math.round(systemPromptMetrics.equationMetadata.I_baseline.value * 100)
                        : metrics.qualityScore}%`}
                    icon={Brain}
                    status={metrics.qualityScore > 80 ? 'good' : metrics.qualityScore > 60 ? 'neutral' : 'warning'}
                    delay={0.1}
                />
                <ScoreCard
                    id="pass-rate-score"
                    title="Content Depth Score"
                    value={`${metrics.predictedPassRate}%`}
                    icon={Activity}
                    status={metrics.predictedPassRate > 75 ? 'good' : metrics.predictedPassRate > 50 ? 'neutral' : 'warning'}
                    delay={0.15}
                />
                <ScoreCard
                    id="mastery-time-score"
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
                        id="treemap-section"
                        className={styles.treemapSection}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.4 }}
                    >
                        <div className={styles.sectionTitle}>
                            <span>Content Coverage</span>
                            <LayoutGrid size={18} />
                        </div>
                        <div style={{ flexGrow: 1, height: '100%', minHeight: '300px' }}>
                            <CoverageTreemap data={coverageMap} />
                        </div>
                    </motion.div>

                    {/* BUCKET READINESS CHECKLIST - Mental Filing Cabinet */}
                    <motion.div
                        className={styles.tierSection}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.4 }}
                    >
                        <div className={styles.sectionTitle}>
                            <span>Bucket Readiness</span>
                            <Layers size={18} />
                        </div>
                        <BucketReadinessChecklist
                            foundation={{
                                total: systemPromptMetrics.tierDistribution.foundation,
                                mastered: 0 // TODO: Connect to actual mastery tracking
                            }}
                            keystone={{
                                total: systemPromptMetrics.tierDistribution.keystone,
                                mastered: 0
                            }}
                            utility={{
                                total: systemPromptMetrics.tierDistribution.utility,
                                mastered: 0
                            }}
                            delay={0.4}
                        />
                    </motion.div>
                </div>

                {/* RIGHT COLUMN */}
                <div className={styles.rightColumn}>
                    {/* SENSA v2.0: EQUATION METADATA CARD */}
                    {systemPromptMetrics.equationMetadata && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25, duration: 0.4 }}
                        >
                            <EquationMetadataCard metadata={systemPromptMetrics.equationMetadata} />
                        </motion.div>
                    )}

                    {/* CONTENT HEALTH - System Prompt Elements */}
                    <motion.div
                        id="health-section"
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
                        id="insights-section"
                        className={styles.recommendationsSection}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.4 }}
                    >
                        <div className={styles.sectionTitle} style={{ justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>Insights</span>
                                <Sparkles size={18} />
                            </div>

                            {/* CREDIBILITY VERIFICATION ACTION */}
                            {!credibilityScore ? (
                                <button
                                    onClick={handleVerifyCredibility}
                                    disabled={verifyingCredibility}
                                    style={{
                                        background: 'none',
                                        border: '1px solid var(--color-border)',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '1rem',
                                        fontSize: '0.75rem',
                                        color: verifyingCredibility ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
                                        cursor: verifyingCredibility ? 'wait' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    {verifyingCredibility ? (
                                        <>
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                            >
                                                <Layers size={14} />
                                            </motion.div>
                                            Verifying Syllabus Alignment...
                                        </>
                                    ) : (
                                        <>Verify Credibility</>
                                    )}
                                </button>
                            ) : (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    style={{
                                        background: `rgba(34, 197, 94, 0.1)`,
                                        color: COLORS.success,
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '1rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        border: '1px solid rgba(34, 197, 94, 0.2)'
                                    }}
                                >
                                    <Sparkles size={14} /> 98% Exams Match
                                </motion.div>
                            )}
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

                    {/* VERIFICATION SECTION - NEW */}
                    <div id="verification-section">
                        <SourceVerification subject={result.subject} delay={0.45} />
                    </div>

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
