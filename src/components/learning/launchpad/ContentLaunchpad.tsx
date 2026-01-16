
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { useLearningStore } from '@/store/learning-store';

import { storageManager } from '@/lib/storage';
import { analyzeContentQuality, type ContentAnalytics } from '@/lib/ai/content-analytics';
import { parseGeneratedContent } from '@/lib/content-adapter';
import type { SavedResult } from '@/lib/storage/types';
import { RepairStrategyRouter } from '@/lib/generation/repair-orchestrator';
import type { RepairPlan } from '@/lib/types/generation';
import { validateConceptContent, type VerifiableConcept } from '@/lib/validation/content-quality';
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
    { targetId: 'content-quality-score', title: 'Content Quality', description: 'AI baseline score measuring content structure quality - not your mastery. Higher scores mean better mnemonics, examples, and decision frameworks.', position: 'bottom' },
    { targetId: 'structural-completeness-score', title: 'Structural Completeness', description: 'Checks if AI generated all required fields: SHAPE sections, mnemonics, and decision trees. Missing elements trigger auto-repair.', position: 'bottom' },
    { targetId: 'difficulty-score', title: 'Difficulty', description: 'Cognitive load rating based on concept density. Shows Beginner/Moderate/Advanced/Expert to help you plan study intensity.', position: 'bottom' },
    { targetId: 'mastery-time-score', title: 'Est. Time', description: 'Time range to read and process this material. Accounts for different learning speeds (faster learners → lower end, methodical learners → upper end).', position: 'bottom' },
    { targetId: 'treemap-section', title: 'Content Coverage', description: 'Visual map of concepts organized by tier. Green = Foundation (start here), Purple = Keystone (core exam logic), Amber = Utility (supporting).', position: 'bottom' },
    { targetId: 'bucket-readiness-section', title: 'Bucket Readiness', description: 'Your progress through the three tiers of concepts. Foundation (green) → Keystone (purple) → Utility (amber). Shows concepts to learn before starting, or your completion % after.', position: 'bottom' },
    { targetId: 'health-section', title: 'Content Health', description: 'Checks if AI generated deep learning elements (SHAPE sections, Mnemonics, Confusion Pairs, Decision Trees) instead of just surface text.', position: 'bottom' },
    { targetId: 'insights-section', title: 'Study Insights', description: 'Personalized study recommendations generated from content analysis. Shows specific gaps or strengths to focus on.', position: 'bottom' },
    { targetId: 'verification-section', title: 'Study Tip', description: 'Helpful guidance on using AI-generated content effectively. Links to official exam docs, reference materials, and real-world community discussions for cross-referencing.', position: 'bottom' }
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

    // Get real progress from store
    const { currentSession } = useLearningStore();

    // Calculate mastery counts by tier
    const getMasteredCount = (tier: string) => {
        if (!currentSession || !currentSession.progress) return 0;
        const completedIds = currentSession.progress.completedConcepts;
        return currentSession.concepts.filter(c => c.tier === tier && completedIds.includes(c.id)).length;
    };

    const foundationMastered = getMasteredCount('foundation');
    const keystoneMastered = getMasteredCount('keystone');
    const utilityMastered = getMasteredCount('utility');

    // Tutorial State
    const [showTutorial, setShowTutorial] = useState(false);

    // Calculate staleness (days since generation)
    const daysSinceGeneration = result ? Math.floor(
        (Date.now() - new Date(result.generatedAt).getTime()) / (1000 * 60 * 60 * 24)
    ) : 0;
    const isStale = daysSinceGeneration > 90;

    // Difficulty level based on cognitive load
    const getDifficultyLabel = (score: number): string => {
        if (score <= 3) return 'Beginner';
        if (score <= 5) return 'Moderate';
        if (score <= 7) return 'Advanced';
        return 'Expert';
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

                    const allGaps = loadedConcepts.flatMap(c => validateConceptContent(c as unknown as VerifiableConcept));
                    const criticalGaps = allGaps.filter(g => g.severity === 'critical');

                    if (criticalGaps.length > 0) {
                        const plan = strategies.generateRepairPlan(criticalGaps, loadedConcepts);
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

            {/* SCORECARDS - Renamed for clarity */}
            <div className={styles.scoreRow}>
                <ScoreCard
                    id="content-quality-score"
                    title="Content Quality"
                    value={`${systemPromptMetrics.equationMetadata?.I_baseline
                        ? Math.round(systemPromptMetrics.equationMetadata.I_baseline.value * 100)
                        : Math.round(metrics.qualityScore)}%`}
                    icon={Brain}
                    status={metrics.qualityScore > 80 ? 'good' : metrics.qualityScore > 60 ? 'neutral' : 'warning'}
                    tooltip="AI baseline score - measures content structure quality, not your mastery"
                    delay={0.1}
                />
                <ScoreCard
                    id="structural-completeness-score"
                    title="Structural Completeness"
                    value={`${metrics.predictedPassRate}%`}
                    icon={Activity}
                    status={metrics.predictedPassRate > 75 ? 'good' : metrics.predictedPassRate > 50 ? 'neutral' : 'warning'}
                    tooltip="Measures if AI generated all required fields: SHAPE sections, mnemonics, decision trees"
                    delay={0.15}
                />
                <ScoreCard
                    id="difficulty-score"
                    title="Difficulty"
                    value={getDifficultyLabel(metrics.cognitiveLoadScore)}
                    icon={Layers}
                    status={metrics.cognitiveLoadScore > 7 ? 'warning' : metrics.cognitiveLoadScore > 4 ? 'neutral' : 'good'}
                    tooltip={`Cognitive load: ${metrics.cognitiveLoadScore}/10 - based on concept density`}
                    delay={0.2}
                />
                <ScoreCard
                    id="mastery-time-score"
                    title="Est. Time"
                    value={`${Math.round(metrics.masteryTimeMinutes * 0.7)}-${Math.round(metrics.masteryTimeMinutes * 1.3)}`}
                    unit="mins"
                    icon={Clock}
                    status="neutral"
                    tooltip="Time range accounts for different learning speeds"
                    delay={0.25}
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
                        <div style={{ flexGrow: 1, height: '100%', minHeight: '200px' }}>
                            <CoverageTreemap data={coverageMap} />
                        </div>
                    </motion.div>
                </div>

                {/* RIGHT COLUMN */}
                <div className={styles.rightColumn}>
                    {/* BUCKET READINESS CHECKLIST - Mental Filing Cabinet */}
                    <motion.div
                        id="bucket-readiness-section"
                        className={styles.tierSection}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.4 }}
                    >
                        <div className={styles.sectionTitle}>
                            <span>Bucket Readiness</span>
                            <Layers size={18} />
                        </div>
                        <BucketReadinessChecklist
                            foundation={{
                                total: systemPromptMetrics.tierDistribution.foundation,
                                mastered: foundationMastered
                            }}
                            keystone={{
                                total: systemPromptMetrics.tierDistribution.keystone,
                                mastered: keystoneMastered
                            }}
                            utility={{
                                total: systemPromptMetrics.tierDistribution.utility,
                                mastered: utilityMastered
                            }}
                            delay={0.3}
                        />
                    </motion.div>

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

                    {/* STUDY INSIGHTS */}
                    <motion.div
                        id="insights-section"
                        className={styles.recommendationsSection}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.4 }}
                    >
                        <div className={styles.sectionTitle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>Study Insights</span>
                                <Sparkles size={18} />
                            </div>
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
                        <SourceVerification 
                            subject={result.subject} 
                            generatedAt={result.generatedAt}
                            isStale={isStale}
                            delay={0.45} 
                        />
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
