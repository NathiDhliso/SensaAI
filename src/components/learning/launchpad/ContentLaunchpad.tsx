import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
 ArrowLeft,
 Play,
 AlertCircle,
 Sparkles,
 Clock,
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
 Copy,
 X,
 FileText,
 Dumbbell,
 BarChart3,
 TrendingUp,
 Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { storageManager } from '@/features/content-storage';
import { parseGeneratedContent } from '@/features/content-generation/parsers';
import type { ParsedGeneratedContent } from '@/features/content-generation/parsers/types';
import type { SavedResult } from '@/features/content-storage/types';
import { auditContent, parseSyllabusText, type ContentAuditResult, type ConceptVerdict } from '@/features/content-audit';
import { getSpacingEngine } from '@/features/learning-session/algorithms/spacing-engine';
import type { ScheduledReview, SpacingMetrics } from '@/features/learning-session/algorithms/spacing-engine';
import { moodToBandwidth, type CognitiveBandwidth } from '@/features/ai-coach';
import { usePersonalizationStore } from '@/store/personalization-store';
import { formatSafeDate } from '@/shared/utils/utils';
import { toast } from '@/shared/utils/toast';
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
 'unverified': 'Unverified'
};
const VERDICT_STYLES: Record<ConceptVerdict['verdict'], string> = {
 'objective-aligned': styles.verdictExamCritical,
 'supplementary': styles.verdictSupplementary,
 'not-in-objectives': styles.verdictFluff,
 'unverified': styles.verdictUnverified
};
function getScoreColor(score: number): string {
 if (score >= 70) return 'var(--color-success)';
 if (score >= 40) return 'var(--color-warning)';
 return 'var(--color-error)';
}
const BANDWIDTH_CONFIG: Record<CognitiveBandwidth, { icon: React.ReactNode; label: string; color: string }> = {
 high: { icon: <BatteryFull size={16} />, label: 'High Focus', color: 'var(--color-success)' },
 medium: { icon: <Battery size={16} />, label: 'Steady', color: 'var(--color-warning)' },
 low: { icon: <BatteryLow size={16} />, label: 'Low Battery', color: 'var(--color-text-muted)' }
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
 const [spacingMetrics, setSpacingMetrics] = useState<SpacingMetrics | null>(null);
 const [expandedConcept, setExpandedConcept] = useState<string | null>(null);
 const [objectivesText, setObjectivesText] = useState('');
 const [objectivesPanelOpen, setObjectivesPanelOpen] = useState(false);
 const [objectivesSaved, setObjectivesSaved] = useState(false);
 const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
 const parsedPreview = useMemo(() => {
 if (!objectivesText.trim()) return [];
 return parseSyllabusText(objectivesText);
 }, [objectivesText]);
 const bandwidth: CognitiveBandwidth = useMemo(() => {
 return lastSessionMood ? moodToBandwidth(lastSessionMood) : 'medium';
 }, [lastSessionMood]);
 const bwConfig = BANDWIDTH_CONFIG[bandwidth];
 const tierCounts = useMemo(() => {
 if (!parsedData) return { trunk: 0, branch: 0, leaf: 0, total: 0 };
 const concepts = parsedData.concepts || [];
 const trunk = concepts.filter(c => c.tier === 'trunk').length;
 const branch = concepts.filter(c => c.tier === 'branch').length;
 const leaf = concepts.length - trunk - branch;
 return { trunk, branch, leaf, total: concepts.length };
 }, [parsedData]);
 const runAudit = useCallback((parsed: ParsedGeneratedContent, objectives: string[]) => {
 setAudit(auditContent(parsed, objectives));
 }, []);
 const handleCopyConcepts = useCallback(async () => {
 if (!parsedData || parsedData.concepts.length === 0) return;
 const concepts = parsedData.concepts;
 const domain = parsedData.domainAnalysis?.domain || 'Study Material';
 const lines: string[] = [];
 lines.push(`# ${domain}`);
 lines.push(`Generated: ${new Date().toLocaleDateString()}`);
 lines.push(`Concepts: ${concepts.length}`);
 lines.push('='.repeat(60));
 lines.push('');
 concepts.forEach((concept, index) => {
 lines.push(`## ${index + 1}. ${concept.name}`);
 if (concept.tier) lines.push(`Tier: ${concept.tier}`);
 lines.push('');
 if (concept.phase1?.hookSentence) {
 lines.push(`Why it matters: ${concept.phase1.hookSentence}`);
 lines.push('');
 }
 if (concept.phase1?.microMetaphor) {
 lines.push(`Think of it as: ${concept.phase1.microMetaphor}`);
 lines.push('');
 }
 if (concept.whyYouNeed) {
 lines.push(`Why you need this: ${concept.whyYouNeed}`);
 lines.push('');
 }
 if (concept.keyPoints && concept.keyPoints.length > 0) {
 lines.push('Key Points:');
 concept.keyPoints.forEach((point) => lines.push(`  - ${point}`));
 lines.push('');
 }
 if (concept.phase2 && concept.phase2.length > 0) {
 lines.push('Core Knowledge:');
 concept.phase2.forEach((point) => lines.push(`  - ${point}`));
 lines.push('');
 }
 if (concept.shape) {
 const s = concept.shape;
 if (s.simpleCore || s.simple) {
 lines.push(`Simple Core: ${s.simpleCore || s.simple}`);
 lines.push('');
 }
 if (s.highStakesExample || s.highStakes) {
 lines.push(`High-Stakes Example: ${s.highStakesExample || s.highStakes}`);
 lines.push('');
 }
 if (s.analogicalModel || s.analogy) {
 lines.push(`Analogy: ${s.analogicalModel || s.analogy}`);
 lines.push('');
 }
 if (s.patternRecognition || s.pattern) {
 const p = s.patternRecognition || s.pattern;
 if (p) {
 lines.push('Pattern Recognition:');
 lines.push(`  Q: ${p.question}`);
 lines.push(`  A: ${p.answer}`);
 lines.push('');
 }
 }
 if (s.eliminationLogic || s.elimination) {
 lines.push(`Elimination Logic: ${s.eliminationLogic || s.elimination}`);
 lines.push('');
 }
 }
 if (concept.technicalDetails) {
 lines.push(`Technical Details: ${concept.technicalDetails}`);
 lines.push('');
 }
 if (concept.workedExample) {
 lines.push('Worked Example:');
 lines.push(`  Problem: ${concept.workedExample.problem}`);
 if (concept.workedExample.steps?.length) {
 lines.push('  Steps:');
 concept.workedExample.steps.forEach((step, i) => {
 lines.push(`    ${i + 1}. ${step}`);
 });
 }
 lines.push(`  Solution: ${concept.workedExample.solution}`);
 lines.push('');
 }
 if (concept.criticalDistinctions?.length) {
 lines.push('Critical Distinctions:');
 concept.criticalDistinctions.forEach((d) => lines.push(`  - ${d}`));
 lines.push('');
 }
 if (concept.examFocus?.length) {
 lines.push('Exam Focus:');
 concept.examFocus.forEach((e) => lines.push(`  - ${e}`));
 lines.push('');
 }
 if (concept.commonPitfalls?.length) {
 lines.push('Common Pitfalls:');
 concept.commonPitfalls.forEach((p) => lines.push(`  - ${p}`));
 lines.push('');
 }
 lines.push('-'.repeat(60));
 lines.push('');
 });
 const text = lines.join('\n');
 try {
 await navigator.clipboard.writeText(text);
 setCopyState('copied');
 toast.success(`Copied ${concepts.length} concepts to clipboard`);
 setTimeout(() => setCopyState('idle'), 2000);
 } catch {
 const textarea = document.createElement('textarea');
 textarea.value = text;
 textarea.style.position = 'fixed';
 textarea.style.opacity = '0';
 document.body.appendChild(textarea);
 textarea.select();
 document.execCommand('copy');
 document.body.removeChild(textarea);
 setCopyState('copied');
 toast.success(`Copied ${concepts.length} concepts to clipboard`);
 setTimeout(() => setCopyState('idle'), 2000);
 }
 }, [parsedData]);
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
 setDueReviews(spacing.getDueReviews());
 setSpacingMetrics(spacing.getMetrics());
 } catch { /* spacing not initialized yet */ }
 }, []);
 const handleStartLearning = () => {
 navigate(`/study/${subjectId}?tab=learn`);
 };
 const handleReviewConcept = (conceptId: string) => {
 navigate(`/study/${subjectId}?tab=learn&concept=${conceptId}`);
 };
 const handleGymActivity = (activity: string) => {
 navigate(`/study/${subjectId}?tab=learn&activity=${activity}`);
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
 <button
 className={styles.batteryIndicator}
 style={{ borderColor: bwConfig.color }}
 onClick={handleStartLearning}
 title="Start a session to change your energy level"
 >
 {bwConfig.icon}
 <span className={styles.batteryLabel}>{bwConfig.label}</span>
 </button>
 <button onClick={handleStartLearning} className={styles.headerCta}>
 <Play size={18} /> Start Session
 </button>
 </div>
 </header>
 <div className={styles.tabRow}>
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
 {parsedData && parsedData.concepts.length > 0 && (
 <button
 onClick={handleCopyConcepts}
 title="Copy all concepts as text"
 className={styles.copyButton}
 >
 {copyState === 'copied' ? <Check size={14} /> : <Copy size={14} />}
 {copyState === 'copied' ? 'Copied!' : 'Copy Concepts'}
 </button>
 )}
 </div>
 {activeTab === 'gym' && (
 <div className={styles.gymLayout}>
 {tierCounts.total > 0 && (
 <div className={styles.subjectContext}>
 <div className={styles.contextStat}>
 <span className={styles.contextValue}>{tierCounts.total}</span>
 <span className={styles.contextLabel}>Concepts</span>
 </div>
 <div className={styles.contextDivider} />
 <div className={styles.contextStat}>
 <span className={styles.contextValue} style={{ color: 'var(--color-trunk)' }}>{tierCounts.trunk}</span>
 <span className={styles.contextLabel}>Trunk</span>
 </div>
 <div className={styles.contextStat}>
 <span className={styles.contextValue} style={{ color: 'var(--color-branch)' }}>{tierCounts.branch}</span>
 <span className={styles.contextLabel}>Branch</span>
 </div>
 <div className={styles.contextStat}>
 <span className={styles.contextValue} style={{ color: 'var(--color-leaf)' }}>{tierCounts.leaf}</span>
 <span className={styles.contextLabel}>Leaf</span>
 </div>
 <div className={styles.contextDivider} />
 <div className={styles.contextStat}>
 <span className={styles.contextValue}>{dueReviews.length}</span>
 <span className={styles.contextLabel}>Due</span>
 </div>
 </div>
 )}
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
 <>
 <div className={styles.dailyTicker}>
 {dueReviews.slice(0, 8).map(review => {
 const overdueDays = Math.max(0, Math.floor(
 (Date.now() - new Date(review.dueDate).getTime()) / (1000 * 60 * 60 * 24)
 ));
 const easeLabel = review.easeFactor >= 2.2 ? 'Easy' : review.easeFactor >= 1.8 ? 'Medium' : 'Hard';
 const easeColor = review.easeFactor >= 2.2 ? 'var(--color-success)' : review.easeFactor >= 1.8 ? 'var(--color-warning)' : 'var(--color-error)';
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
 <div className={styles.reviewSpacing}>
 <span className={styles.reviewInterval}>
 <TrendingUp size={10} /> {review.intervalDays}d interval
 </span>
 <span className={styles.reviewEase} style={{ color: easeColor }}>
 {easeLabel}
 </span>
 {review.repetitions > 0 && (
 <span className={styles.reviewStreak}>
 {review.repetitions}x streak
 </span>
 )}
 </div>
 </button>
 );
 })}
 </div>
 {spacingMetrics && (
 <div className={styles.spacingFooter}>
 <div className={styles.spacingMetric}>
 <span className={styles.spacingValue}>{spacingMetrics.retentionRate}%</span>
 <span className={styles.spacingLabel}>Retention</span>
 </div>
 <div className={styles.spacingMetric}>
 <span className={styles.spacingValue}>{spacingMetrics.totalConcepts}</span>
 <span className={styles.spacingLabel}>Tracked</span>
 </div>
 <div className={styles.spacingMetric}>
 <span className={styles.spacingValue}>{spacingMetrics.overdue}</span>
 <span className={styles.spacingLabel}>Overdue</span>
 </div>
 <div className={styles.spacingMetric}>
 <span className={styles.spacingValue}>{spacingMetrics.adherencePercent}%</span>
 <span className={styles.spacingLabel}>Adherence</span>
 </div>
 <div className={styles.spacingInfo}>
 <Info size={12} />
 <span>SM-2 adapts intervals based on your recall quality</span>
 </div>
 </div>
 )}
 </>
 ) : (
 <div className={styles.zoneEmpty}>
 <Sparkles size={20} />
 <div className={styles.zoneEmptyContent}>
 <span>No reviews due — you&apos;re all caught up!</span>
 <span className={styles.zoneEmptyHint}>Start a learning session to generate spaced reviews</span>
 </div>
 </div>
 )}
 </section>
 <section className={styles.zone}>
 <div className={styles.zoneHeader}>
 <div className={styles.zoneTitle}>
 <Map size={18} />
 <h2>The Build Lab</h2>
 </div>
 </div>
 <div className={styles.zoneCards}>
 <button
 className={styles.activityCard}
 onClick={() => handleGymActivity('concept-map')}
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
 onClick={() => handleGymActivity('peer-review')}
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
 </section>
 <section className={styles.zone}>
 <div className={styles.zoneHeader}>
 <div className={styles.zoneTitle}>
 <Trophy size={18} />
 <h2>The Proving Grounds</h2>
 </div>
 </div>
 <div className={styles.zoneCards}>
 <button
 className={styles.activityCard}
 onClick={() => handleGymActivity('mastery')}
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
 onClick={() => handleGymActivity('pre-mortem')}
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
 placeholder={'Paste anything here — messy is fine.\n\nExamples:\n1. Manage Azure identities and governance (20-25%)\n2. Implement and manage storage (15-20%)\n\nOr:\n- Module 3: Virtual Networking\n - Configure VNets and subnets\n - Network security groups\n\nOr just copy-paste from your exam/course page.'}
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
 <span className={styles.statValue}>{formatSafeDate(result.generatedAt)}</span>
 </div>
 {activeTab === 'insights' && audit && (
 <>
 <div className={styles.footerStat}>
 <span className={styles.statLabel}>Overall</span>
 <span className={styles.statValue}>{audit.overallScore}%</span>
 </div>
 <div className={styles.footerStat}>
 <span className={styles.statLabel}>Tier Split</span>
 <span className={styles.statValue}>
 {audit.tierDistribution.trunk}T / {audit.tierDistribution.branch}B / {audit.tierDistribution.leaf}L
 </span>
 </div>
 </>
 )}
 </div>
 </footer>
 </div>
 );
}
