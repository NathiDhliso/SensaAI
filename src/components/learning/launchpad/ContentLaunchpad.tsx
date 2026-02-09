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
    ChevronDown,
    ChevronUp,
    ClipboardCheck,
    Target,
    Check,
    X,
    FileText,
    Dumbbell,
    BarChart3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { storageManager } from '@/features/content-storage';
import { parseGeneratedContent } from '@/features/content-generation/parsers';
import type { ParsedGeneratedContent } from '@/features/content-generation/parsers/types';
import type { SavedResult } from '@/features/content-storage/types';
import { auditContent, parseSyllabusText, type ContentAuditResult, type ConceptVerdict } from '@/features/content-audit';
import { getSpacingEngine } from '@/features/learning-session/algorithms/spacing-engine';
import type { ScheduledReview } from '@/features/learning-session/algorithms/spacing-engine';
import { moodToBandwidth, type CognitiveBandwidth } from '@/features/ai-coach';
import { usePersonalizationStore } from '@/store/personalization-store';

import styles from './ContentLaunchpad.module.css';

const OBJECTIVES_KEY_PREFIX = 'sensa:objectives:';

type LaunchpadTab = 'gym' | 'insights';

function loadSavedObjectives(subjectId: string): string[] {
    try {
        const raw = localStorage.getItem(`${OBJECTIVES_KEY_PREFIX}${subjectId}`);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function persistObjectives(subjectId: string, objectives: string[]): void {
    localStorage.setItem(`${OBJECTIVES_KEY_PREFIX}${subjectId}`, JSON.stringify(objectives));
}

const VERDICT_LABELS: Record<ConceptVerdict['verdict'], string> = {
    'objective-aligned': 'Aligned',
    'supplementary': 'Supplementary',
    'not-in-objectives': 'Not in Objectives',
    'unverified': 'Unverified',
};

const VERDICT_STYLES: Record<ConceptVerdict['verdict'], string> = {
    'objective-aligned': styles.verdictExamCritical,
    'supplementary': styles.verdictSupplementary,
    'not-in-objectives': styles.verdictFluff,
    'unverified': styles.verdictUnverified,
};

function getScoreColor(score: number): string {
    if (score >= 70) return 'var(--color-success)';
    if (score >= 40) return 'var(--color-warning)';
    return 'var(--color-error)';
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

    const [activeTab, setActiveTab] = useState<LaunchpadTab>('gym');
    const [result, setResult] = useState<SavedResult | null>(null);
    const [parsedData, setParsedData] = useState<ParsedGeneratedContent | null>(null);
    const [audit, setAudit] = useState<ContentAuditResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dueReviews, setDueReviews] = useState<ScheduledReview[]>([]);
    const [expandedConcept, setExpandedConcept] = useState<string | null>(null);

    const [objectivesText, setObjectivesText] = useState('');
    const [objectivesPanelOpen, setObjectivesPanelOpen] = useState(false);
    const [objectivesSaved, setObjectivesSaved] = useState(false);

    const parsedPreview = useMemo(() => {
        if (!objectivesText.trim()) return [];
        return parseSyllabusText(objectivesText);
    }, [objectivesText]);

    const bandwidth: CognitiveBandwidth = useMemo(() => {
        return lastSessionMood ? moodToBandwidth(lastSessionMood) : 'medium';
    }, [lastSessionMood]);

    const bwConfig = BANDWIDTH_CONFIG[bandwidth];

    const runAudit = useCallback((parsed: ParsedGeneratedContent, objectives: string[]) => {
        setAudit(auditContent(parsed, objectives));
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
                        if (savedObjectives.length > 0) {
                            setObjectivesText(savedObjectives.join('\n'));
                        } else {
                            setObjectivesPanelOpen(true);
                        }
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

    const handleSaveObjectives = () => {
        if (!parsedData || !subjectId) return;
        const cleaned = parseSyllabusText(objectivesText);
        persistObjectives(subjectId, cleaned);
        runAudit(parsedData, cleaned);
        setObjectivesSaved(true);
        setObjectivesPanelOpen(false);
        setTimeout(() => setObjectivesSaved(false), 2500);
    };

    const handleClearObjectives = () => {
        if (!parsedData || !subjectId) return;
        setObjectivesText('');
        persistObjectives(subjectId, []);
        runAudit(parsedData, []);
        setObjectivesPanelOpen(true);
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

            <nav className={styles.tabBar}>
                <button
                    className={`${styles.tab} ${activeTab === 'gym' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('gym')}
                >
                    <Dumbbell size={16} /> Gym
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'insights' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('insights')}
                >
                    <BarChart3 size={16} /> Insights
                </button>
            </nav>

            {activeTab === 'gym' && (
                <div className={styles.gymLayout}>
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
                                <span>No reviews due — you&apos;re all caught up!</span>
                            </div>
                        )}
                    </section>

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
            )}

            {activeTab === 'insights' && audit && (
                <div className={styles.insightsLayout}>
                    <div className={styles.scoreRow}>
                        {audit.hasObjectives ? (
                            <div className={styles.metricCard} style={{ borderLeftColor: getScoreColor(audit.objectivesCoverage) }}>
                                <span className={styles.metricValue}>
                                    {audit.objectivesCovered}<span className={styles.metricSuffix}>/ {audit.objectivesProvided}</span>
                                </span>
                                <span className={styles.metricLabel}>Objectives Covered</span>
                            </div>
                        ) : (
                            <div
                                className={`${styles.metricCard} ${styles.metricCardClickable}`}
                                style={{ borderLeftColor: 'var(--color-text-tertiary)' }}
                                onClick={() => setObjectivesPanelOpen(true)}
                            >
                                <span className={styles.metricValue}>?</span>
                                <span className={styles.metricLabel}>Add Objectives</span>
                            </div>
                        )}
                        {audit.hasObjectives ? (
                            <div className={styles.metricCard} style={{ borderLeftColor: audit.unmappedConcepts > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                                <span className={styles.metricValue}>
                                    {audit.unmappedConcepts}<span className={styles.metricSuffix}>/ {audit.conceptCount}</span>
                                </span>
                                <span className={styles.metricLabel}>Unmapped Concepts</span>
                            </div>
                        ) : (
                            <div className={styles.metricCard} style={{ borderLeftColor: 'var(--color-text-tertiary)' }}>
                                <span className={styles.metricValue}>?</span>
                                <span className={styles.metricLabel}>Alignment Unknown</span>
                            </div>
                        )}
                        <div className={styles.metricCard} style={{ borderLeftColor: getScoreColor(audit.contentHealth) }}>
                            <span className={styles.metricValue}>
                                {audit.contentHealth}<span className={styles.metricSuffix}>%</span>
                            </span>
                            <span className={styles.metricLabel}>Content Health</span>
                        </div>
                        <div className={styles.metricCard} style={{ borderLeftColor: 'var(--color-accent)' }}>
                            <span className={styles.metricValue}>{audit.conceptCount}</span>
                            <span className={styles.metricLabel}>Concepts</span>
                        </div>
                    </div>

                    <div className={styles.objectivesPanel}>
                        <div
                            className={styles.objectivesHeader}
                            onClick={() => setObjectivesPanelOpen(!objectivesPanelOpen)}
                        >
                            <div className={styles.objectivesHeaderLeft}>
                                <Target size={16} />
                                <span className={styles.objectivesTitle}>
                                    {audit.hasObjectives
                                        ? `${audit.objectivesProvided} Exam Objectives Loaded`
                                        : 'Add Exam Objectives'}
                                </span>
                                {objectivesSaved && (
                                    <span className={styles.objectivesSavedBadge}>
                                        <Check size={12} /> Saved
                                    </span>
                                )}
                            </div>
                            <div className={styles.objectivesHeaderRight}>
                                {audit.hasObjectives && !objectivesPanelOpen && (
                                    <button
                                        className={styles.objectivesClearBtn}
                                        onClick={e => { e.stopPropagation(); handleClearObjectives(); }}
                                    >
                                        <X size={14} /> Clear
                                    </button>
                                )}
                                {objectivesPanelOpen
                                    ? <ChevronUp size={18} className={styles.objectivesChevron} />
                                    : <ChevronDown size={18} className={styles.objectivesChevron} />
                                }
                            </div>
                        </div>

                        <AnimatePresence>
                            {objectivesPanelOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className={styles.objectivesBody}
                                >
                                    <p className={styles.objectivesHint}>
                                        Paste your exam objectives, syllabus, or course outline below. Any format works
                                        &mdash; numbered lists, bullet points, tables, raw copy-paste. We&apos;ll clean it up automatically.
                                    </p>
                                    <textarea
                                        className={styles.objectivesInput}
                                        value={objectivesText}
                                        onChange={e => setObjectivesText(e.target.value)}
                                        placeholder={'Paste anything here — messy is fine.\n\nExamples:\n1. Manage Azure identities and governance (20-25%)\n2. Implement and manage storage (15-20%)\n\nOr:\n- Module 3: Virtual Networking\n  - Configure VNets and subnets\n  - Network security groups\n\nOr just copy-paste from your exam/course page.'}
                                        rows={8}
                                        spellCheck={false}
                                    />

                                    {parsedPreview.length > 0 && (
                                        <div className={styles.objectivesPreview}>
                                            <div className={styles.objectivesPreviewHeader}>
                                                <FileText size={14} />
                                                <span>{parsedPreview.length} objectives detected</span>
                                            </div>
                                            <ul className={styles.objectivesPreviewList}>
                                                {parsedPreview.map((obj, i) => (
                                                    <li key={i}>{obj}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className={styles.objectivesActions}>
                                        <button
                                            className={styles.objectivesCancelBtn}
                                            onClick={() => setObjectivesPanelOpen(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className={styles.objectivesSaveBtn}
                                            onClick={handleSaveObjectives}
                                            disabled={parsedPreview.length === 0}
                                        >
                                            <Check size={16} />
                                            Save {parsedPreview.length > 0 ? `${parsedPreview.length} Objectives` : ''}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className={styles.insightsSection}>
                        <div className={styles.sectionTitle}>
                            <span><AlertTriangle size={14} /> Honest Assessment</span>
                        </div>
                        <div className={styles.insightsList}>
                            {audit.harshInsights.map((insight, i) => (
                                <div
                                    key={i}
                                    className={`${styles.insightItem} ${
                                        insight.tone === 'positive' ? styles.insightItemPositive : ''
                                    }`}
                                >
                                    {insight.message}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.auditSection}>
                        <div className={styles.sectionTitle}>
                            <span><ClipboardCheck size={14} /> Concept-by-Concept Audit</span>
                            <span className={styles.sortHint}>{audit.hasObjectives ? 'Sorted by alignment' : 'Sorted by health'}</span>
                        </div>
                        <div className={styles.conceptList}>
                            {audit.verdicts.map(verdict => {
                                const isExpanded = expandedConcept === verdict.conceptId;
                                const criticalCount = verdict.issues.filter(i => i.severity === 'critical').length;
                                const warningCount = verdict.issues.filter(i => i.severity === 'warning').length;

                                return (
                                    <div key={verdict.conceptId} className={styles.conceptRow}>
                                        <div
                                            className={styles.conceptRowHeader}
                                            onClick={() => setExpandedConcept(isExpanded ? null : verdict.conceptId)}
                                        >
                                            <div className={styles.conceptRowLeft}>
                                                <span className={styles.conceptName}>{verdict.conceptName}</span>
                                                <span className={styles.tierBadge}>{verdict.tier}</span>
                                            </div>
                                            <div className={styles.conceptRowRight}>
                                                <span className={`${styles.verdictBadge} ${VERDICT_STYLES[verdict.verdict]}`}>
                                                    {VERDICT_LABELS[verdict.verdict]}
                                                </span>
                                                {verdict.issues.length > 0 && (
                                                    <span className={styles.issueCount}>
                                                        {criticalCount > 0 && `${criticalCount} critical`}
                                                        {criticalCount > 0 && warningCount > 0 && ', '}
                                                        {warningCount > 0 && `${warningCount} warn`}
                                                    </span>
                                                )}
                                                <ChevronDown
                                                    size={16}
                                                    className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`}
                                                />
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className={styles.conceptDetail}
                                                >
                                                    <div className={styles.detailScores}>
                                                        <div className={styles.detailScore}>
                                                            <span className={styles.detailScoreLabel}>Content Health</span>
                                                            <span className={styles.detailScoreValue} style={{ color: getScoreColor(verdict.contentHealth) }}>
                                                                {verdict.contentHealth}%
                                                            </span>
                                                        </div>
                                                        {audit.hasObjectives && (
                                                            <div className={styles.detailScore}>
                                                                <span className={styles.detailScoreLabel}>Objective Match</span>
                                                                <span className={styles.detailScoreValue} style={{ color: getScoreColor(verdict.objectiveAlignment) }}>
                                                                    {verdict.objectiveAlignment}%
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className={styles.detailScore}>
                                                            <span className={styles.detailScoreLabel}>Bloom&apos;s Level</span>
                                                            <span className={styles.detailScoreValue}>{verdict.cognitiveLevel}</span>
                                                        </div>
                                                    </div>

                                                    {verdict.matchedObjective && (
                                                        <div className={styles.detailSubsection}>
                                                            <div className={styles.detailSubsectionTitle}>Matched Objective</div>
                                                            <div className={styles.matchedObjective}>{verdict.matchedObjective}</div>
                                                        </div>
                                                    )}

                                                    {verdict.issues.length > 0 && (
                                                        <div className={styles.detailSubsection}>
                                                            <div className={styles.detailSubsectionTitle}>Issues ({verdict.issues.length})</div>
                                                            <div className={styles.issueList}>
                                                                {verdict.issues.map((issue, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className={`${styles.issueItem} ${
                                                                            issue.severity === 'critical' ? styles.issueCritical : styles.issueWarning
                                                                        }`}
                                                                    >
                                                                        <div className={styles.issueContent}>
                                                                            <div className={styles.issueMessage}>{issue.message}</div>
                                                                            <div className={styles.issueImpact}>{issue.impact}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {verdict.strengths.length > 0 && (
                                                        <div className={styles.detailSubsection}>
                                                            <div className={styles.detailSubsectionTitle}>Strengths</div>
                                                            <div className={styles.strengthList}>
                                                                {verdict.strengths.map((s, idx) => (
                                                                    <span key={idx} className={styles.strengthItem}>{s}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <footer className={styles.footer}>
                <div className={styles.footerStats}>
                    <div className={styles.footerStat}>
                        <span className={styles.statLabel}>Generated</span>
                        <span className={styles.statValue}>{new Date(result.generatedAt).toLocaleDateString()}</span>
                    </div>
                    {activeTab === 'gym' ? (
                        <div className={styles.footerStat}>
                            <span className={styles.statLabel}>Reviews Due</span>
                            <span className={styles.statValue}>{dueReviews.length}</span>
                        </div>
                    ) : audit && (
                        <>
                            <div className={styles.footerStat}>
                                <span className={styles.statLabel}>Overall</span>
                                <span className={styles.statValue}>{audit.overallScore}%</span>
                            </div>
                            <div className={styles.footerStat}>
                                <span className={styles.statLabel}>Tier Split</span>
                                <span className={styles.statValue}>
                                    {audit.tierDistribution.root}R / {audit.tierDistribution.trunk}T / {audit.tierDistribution.leaf}L
                                </span>
                            </div>
                        </>
                    )}
                </div>
                <button onClick={handleStartLearning} className={styles.startButton}>
                    <Play size={18} /> Start Session
                </button>
            </footer>
        </div>
    );
}
