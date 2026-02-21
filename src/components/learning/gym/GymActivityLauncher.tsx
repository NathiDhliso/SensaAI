import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
 ArrowLeft,
 ArrowRight,
 Map,
 MessageCircle,
 AlertTriangle,
 CheckCircle,
 RefreshCw,
 Lightbulb,
 ChevronDown,
 X,
} from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import ConceptMapBuilder from '@/components/learning/activities/ConceptMapBuilder';
import { PeerReviewActivity } from '@/components/learning/activities/PeerReviewActivity';
import PreMortemActivity from '@/components/learning/activities/PreMortemActivity';
import styles from './GymActivityLauncher.module.css';

export type GymActivity = 'concept-map' | 'peer-review' | 'pre-mortem';

interface GymActivityLauncherProps {
 activity: GymActivity;
 concepts: LearningConcept[];
 onBack: () => void;
 /** Deprecated - kept for compatibility */
 ulcPattern?: null;
 /** Optional: pre-select a specific concept */
 initialConceptId?: string | null;
}

const ACTIVITY_META: Record<GymActivity, { label: string; icon: React.ReactNode; needsConcept: boolean; description: string }> = {
 'concept-map': {
 label: 'Concept Map',
 icon: <Map size={20} />,
 needsConcept: false,
 description: 'Build connections between ideas'
 },
 'peer-review': {
 label: 'Peer Review',
 icon: <MessageCircle size={20} />,
 needsConcept: true,
 description: 'Defend your understanding against a simulated peer'
 },
 'pre-mortem': {
 label: 'Pre-Mortem',
 icon: <AlertTriangle size={20} />,
 needsConcept: true,
 description: 'Find the failure before it happens'
 }
};

const TIER_COLORS: Record<string, string> = {
 trunk: 'var(--color-trunk)',
 branch: 'var(--color-branch)',
 leaf: 'var(--color-leaf)',
};

type LauncherPhase = 'active' | 'result';

export default function GymActivityLauncher({
 activity,
 concepts,
 onBack,
 initialConceptId
}: GymActivityLauncherProps) {
 const navigate = useNavigate();
 const { subjectId } = useParams<{ subjectId: string }>();
 const meta = ACTIVITY_META[activity];

 // Determine initial concept: prefer initialConceptId, then tier-based
 const getInitialConceptId = (): string | null => {
 if (!meta.needsConcept) return null;
 // 1. Explicit initial concept
 if (initialConceptId && concepts.find(c => c.id === initialConceptId)) {
 return initialConceptId;
 }
 // 2. Tier-based fallback
 const grouped = groupByTier(concepts);
 return (grouped.trunk?.[0] || grouped.branch?.[0] || grouped.leaf?.[0])?.id || null;
 };

 const [phase, setPhase] = useState<LauncherPhase>('active');
 const [selectedConceptId, setSelectedConceptId] = useState<string | null>(getInitialConceptId);
 const [result, setResult] = useState<{ passed: boolean } | null>(null);
 const [showConceptPicker, setShowConceptPicker] = useState(false);

 const handleBackToGym = useCallback(() => {
 if (subjectId) {
 navigate(`/launchpad/${subjectId}`);
 } else {
 onBack();
 }
 }, [subjectId, navigate, onBack]);

 const selectedConcept = concepts.find(c => c.id === selectedConceptId) || null;

 const handleComplete = useCallback((passed: boolean) => {
 setResult({ passed });
 setPhase('result');

 // Auto-advance after 3 seconds if passed
 if (passed) {
 setTimeout(() => {
 // Sequential next concept
 const currentIndex = concepts.findIndex(c => c.id === selectedConceptId);
 const nextConcept = concepts[currentIndex + 1];
 if (nextConcept) {
 setSelectedConceptId(nextConcept.id);
 setResult(null);
 setPhase('active');
 } else {
 handleBackToGym();
 }
 }, 3000);
 }
 }, [concepts, selectedConceptId, handleBackToGym]);

 const handleRetry = useCallback(() => {
 setResult(null);
 setPhase('active');
 }, []);

 const renderActivity = () => {
 switch (activity) {
 case 'concept-map':
 return (
 <ConceptMapBuilder
 concepts={concepts}
 onComplete={() => handleComplete(true)}
 mode="free"
 />
 );

 case 'peer-review':
 if (!selectedConcept) return null;
 return (
 <PeerReviewActivity
 concept={selectedConcept}
 allConcepts={concepts}
 onComplete={(success: boolean) => handleComplete(success)}
 />
 );

 case 'pre-mortem':
 if (!selectedConcept) return null;
 return (
 <PreMortemActivity
 concept={selectedConcept}
 onComplete={(success: boolean) => handleComplete(success)}
 />
 );

 default:
 return null;
 }
 };

 const renderResult = () => {
 if (!result) return null;
 const passed = result.passed;

 return (
 <div className={styles.resultContainer}>
 <div className={`${styles.resultIcon} ${passed ? styles.resultIconSuccess : styles.resultIconFail}`}>
 {passed ? <CheckCircle size={28} /> : <AlertTriangle size={28} />}
 </div>
 <h3 className={styles.resultTitle}>
 {passed ? 'Well Done!' : 'Keep Practicing'}
 </h3>
 <p className={styles.resultMessage}>
 {passed
 ? `You completed the ${meta.label} activity successfully.`
 : `This ${meta.label} is challenging. The detailed feedback shows what to focus on next time.`
 }
 </p>
 {passed && (
 <p className={styles.autoAdvanceHint}>
 Auto-advancing to next concept in 3 seconds...
 </p>
 )}
 {!passed && (
 <div className={styles.practiceNote}>
 <Lightbulb size={16} />
 <span>The Gym is for practice — you can retry, continue, or come back later.</span>
 </div>
 )}
 <div className={styles.resultActions}>
 <button
 className={styles.resultActionPrimary}
 onClick={handleRetry}
 title="Practice makes progress — try again with the feedback in mind"
 >
 <RefreshCw size={14} /> Try Again
 </button>
 {meta.needsConcept ? (
 <button
 className={styles.resultActionSecondary}
 onClick={() => {
 // Sequential next concept
 const currentIndex = concepts.findIndex(c => c.id === selectedConceptId);
 const nextConcept = concepts[currentIndex + 1];
 if (nextConcept) {
 setSelectedConceptId(nextConcept.id);
 setResult(null);
 setPhase('active');
 } else {
 handleBackToGym();
 }
 }}
 title="Move forward — you can always come back"
 >
 <ArrowRight size={14} /> {concepts.findIndex(c => c.id === selectedConceptId) < concepts.length - 1 ? 'Next Concept' : 'Back to Gym'}
 </button>
 ) : (
 <button
 className={styles.resultActionSecondary}
 onClick={handleBackToGym}
 title="Return to the gym dashboard"
 >
 <ArrowLeft size={14} /> Back to Gym
 </button>
 )}
 {meta.needsConcept && (
 <button
 className={styles.resultActionTertiary}
 onClick={handleBackToGym}
 title="Return to the gym dashboard"
 >
 <ArrowLeft size={14} /> Back to Gym
 </button>
 )}
 </div>
 </div>
 );
 };

 const tierGroups = (['trunk', 'branch', 'leaf'] as const).map(tier => ({
 tier,
 items: concepts.filter(c => c.tier === tier),
 })).filter(g => g.items.length > 0);

 return (
 <div className={styles.container}>
 <div className={styles.header}>
 <div className={styles.headerLeft}>
 <button className={styles.backButton} onClick={handleBackToGym}>
 <ArrowLeft size={14} />
 Back to Gym
 </button>
 <span className={styles.activityTitle}>
 {meta.icon}
 {meta.label}
 </span>
 </div>
 <div className={styles.headerRight}>
 {meta.needsConcept && phase === 'active' && concepts.length > 1 && (
 <button
 className={styles.conceptPickerTrigger}
 onClick={() => setShowConceptPicker(true)}
 >
 <span
 className={styles.conceptPickerDot}
 style={{ background: TIER_COLORS[selectedConcept?.tier ?? 'leaf'] }}
 />
 <span className={styles.conceptPickerTriggerName}>
 {selectedConcept?.name ?? 'Select concept'}
 </span>
 <ChevronDown size={12} />
 </button>
 )}
 </div>
 </div>

 <div className={styles.activityContent}>
 {phase === 'active' && renderActivity()}
 {phase === 'result' && renderResult()}
 </div>

 {createPortal(
 <AnimatePresence>
 {showConceptPicker && (
 <motion.div
 className={styles.conceptPickerOverlay}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.18 }}
 onClick={(e) => { if (e.target === e.currentTarget) setShowConceptPicker(false); }}
 >
 <motion.div
 className={styles.conceptPickerModal}
 initial={{ opacity: 0, scale: 0.95, y: 12 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 12 }}
 transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
 >
 <div className={styles.conceptPickerHeader}>
 <div>
 <p className={styles.conceptPickerTitle}>Choose a Concept</p>
 <p className={styles.conceptPickerSubtitle}>{concepts.length} concepts available</p>
 </div>
 <button
 className={styles.conceptPickerClose}
 onClick={() => setShowConceptPicker(false)}
 >
 <X size={14} />
 </button>
 </div>
 <div className={styles.conceptPickerList}>
 {tierGroups.map(({ tier, items }) => (
 <div key={tier}>
 <p className={styles.conceptPickerTierLabel}>{tier}</p>
 {items.map(c => (
 <button
 key={c.id}
 className={`${styles.conceptPickerItem} ${
 c.id === selectedConceptId ? styles.conceptPickerItemActive : ''
 }`}
 onClick={() => {
 setSelectedConceptId(c.id);
 setShowConceptPicker(false);
 }}
 >
 <span
 className={styles.conceptPickerDot}
 style={{ background: TIER_COLORS[tier] }}
 />
 <span className={styles.conceptPickerItemName}>{c.name}</span>
 <span className={styles.conceptPickerItemTier}>{tier}</span>
 {c.id === selectedConceptId && (
 <CheckCircle size={14} className={styles.conceptPickerCheck} />
 )}
 </button>
 ))}
 </div>
 ))}
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>,
 document.body
 )}
 </div>
 );
}

function groupByTier(concepts: LearningConcept[]): Record<string, LearningConcept[]> {
 const groups: Record<string, LearningConcept[]> = { trunk: [], branch: [], leaf: [] };
 for (const c of concepts) {
 const tier = c.tier || 'leaf';
 if (!groups[tier]) groups[tier] = [];
 groups[tier].push(c);
 }
 return groups;
}
