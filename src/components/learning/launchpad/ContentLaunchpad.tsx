import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Play,
    AlertCircle,
    Sparkles,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    ClipboardCheck,
    Target,
    Check,
    X,
    FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { storageManager } from '@/features/content-storage';
import { parseGeneratedContent } from '@/features/content-generation/parsers';
import type { ParsedGeneratedContent } from '@/features/content-generation/parsers/types';
import type { SavedResult } from '@/features/content-storage/types';
import { auditContent, parseSyllabusText, type ContentAuditResult, type ConceptVerdict } from '@/features/content-audit';

import styles from './ContentLaunchpad.module.css';

const OBJECTIVES_KEY_PREFIX = 'sensa:objectives:';

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

export default function ContentLaunchpad() {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();

    const [result, setResult] = useState<SavedResult | null>(null);
    const [parsedData, setParsedData] = useState<ParsedGeneratedContent | null>(null);
    const [audit, setAudit] = useState<ContentAuditResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedConcept, setExpandedConcept] = useState<string | null>(null);

    const [objectivesText, setObjectivesText] = useState('');
    const [objectivesPanelOpen, setObjectivesPanelOpen] = useState(false);
    const [objectivesSaved, setObjectivesSaved] = useState(false);

    const parsedPreview = useMemo(() => {
        if (!objectivesText.trim()) return [];
        return parseSyllabusText(objectivesText);
    }, [objectivesText]);

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

    const handleStartLearning = () => {
        navigate(`/study/${subjectId}?tab=learn`);
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
                    <p className={styles.loadingText}>Auditing your content...</p>
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

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleGroup}>
                    <button onClick={() => navigate('/library')} className={styles.backButton}>
                        <ArrowLeft size={16} /> Library
                    </button>
                    <div className={styles.titleRow}>
                        <h1>{result.subject}</h1>
                        <button
                            onClick={() => navigate(`/view/${subjectId}`)}
                            className={styles.viewDocLink}
                            title="View formatted readable document"
                        >
                            (View Document)
                        </button>
                    </div>
                </div>
                <button onClick={handleStartLearning} className={styles.headerCta}>
                    <Play size={18} /> Start Learning
                </button>
            </header>

            {audit && (
                <>
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
                                        &mdash; numbered lists, bullet points, tables, raw copy-paste. We'll clean it up automatically.
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
                                        insight.includes('solid') || insight.includes('Coverage looks') ? styles.insightItemPositive : ''
                                    }`}
                                >
                                    {insight}
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
                                                            <span className={styles.detailScoreLabel}>Bloom's Level</span>
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

                    <footer className={styles.footer}>
                        <div className={styles.footerStats}>
                            <div className={styles.footerStat}>
                                <span className={styles.statLabel}>Generated</span>
                                <span className={styles.statValue}>{new Date(result.generatedAt).toLocaleDateString()}</span>
                            </div>
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
                        </div>
                        <button onClick={handleStartLearning} className={styles.startButton}>
                            <Play size={18} /> Start Learning
                        </button>
                    </footer>
                </>
            )}
        </div>
    );
}
