/**
 * SessionScoutPreview Component — SENSA v2.0
 * 
 * Implements Step 2: Explore (merged Survey + Prime)
 * 3 unified steps: Structure Visual Prime
 * 
 * Outputs: Map<conceptId, guessedKeystoneId> for validation in Step 3
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Map as MapIcon,
 ArrowRight,
 ArrowLeft,
 BookOpen,
 Zap,
 AlertCircle,
 Sparkles,
 Layers,
 ChevronRight
} from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import type { DependencyGraph } from '@/shared/types/sensa-flow';
import { generatePreviewAnalysis } from '@/features/learning-session/phases';
import { usePersonalizationStore } from '@/store/personalization-store';
import { useLearningStore } from '@/store/learning-store';
import { useMetaphorContent } from '@/shared/hooks/useMetaphorContent';
import { NomenclatureSprint } from '@/components/learning/activities/NomenclatureSprint';
import styles from './SessionScoutPreview.module.css';
// ============================================================================
// Types
// ============================================================================
export type ExploreStep = 'structure' | 'sprint' | 'prime';
interface SessionScoutPreviewProps {
 concepts: LearningConcept[];
 dependencyGraph?: DependencyGraph;
 onComplete: (guesses: Map<string, string>) => void;
 initialPhase?: string;
}
const STEP_CONFIG = {
 structure: { label: 'Tier Structure', icon: Layers, eqVar: 'Q_P' },
 sprint: { label: 'Nomenclature Sprint', icon: Zap, eqVar: 'Q_M' },
 prime: { label: 'Gap Priming', icon: AlertCircle, eqVar: 'Q_M' }
} as const;
const STEPS_ORDER: ExploreStep[] = ['structure', 'sprint', 'prime'];
// Helper component for concept chips that respects metaphor settings
const ConceptChip = ({ concept, className }: { concept: LearningConcept; className: string }) => {
 const adaptedContent = useMetaphorContent(concept);
 return (
 <motion.div
 className={className}
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.1 }}
 whileHover={{ scale: 1.02 }}
 >
 {adaptedContent.visualAnchor && (
 <span className={styles.chipIcon}>
 {adaptedContent.visualAnchor}
 </span>
 )}
 <span className={styles.chipName}>{concept.name}</span>
 </motion.div>
 );
};
// ============================================================================
// Component
// ============================================================================
export function SessionScoutPreview({
 concepts,
 onComplete
}: SessionScoutPreviewProps) {
 const [step, setStep] = useState<ExploreStep>('structure');
 const [guesses] = useState<Map<string, string>>(new Map()); // Kept for onComplete signature
 const [acknowledgedGaps, setAcknowledgedGaps] = useState<Set<string>>(new Set());
 const { selectedPersona } = usePersonalizationStore();
 const { markSessionScouted, markSessionPreviewed } = useLearningStore();
 const navigate = useNavigate();
 // Group concepts by tier
 const conceptsByTier = useMemo(() => {
 const trunk = concepts.filter(c => (c.tier || c.mnemonic?.tier || '').toLowerCase() === 'trunk');
 const branch = concepts.filter(c => (c.tier || c.mnemonic?.tier || '').toLowerCase() === 'branch');
 const leaf = concepts.filter(c => {
 const t = (c.tier || c.mnemonic?.tier || '').toLowerCase();
 return t !== 'trunk' && t !== 'branch';
 });
 return { trunk, branch, leaf };
 }, [concepts]);
 // Generate AI Preview Analysis for priming step
 const aiPreview = useMemo(() => {
 return generatePreviewAnalysis(concepts, selectedPersona);
 }, [concepts, selectedPersona]);
 const currentStepIndex = STEPS_ORDER.indexOf(step);
 const isLastStep = currentStepIndex === STEPS_ORDER.length - 1;
 const handleBack = useCallback(() => {
 // Go to home instead of back (prevents returning to generate page)
 navigate('/');
 }, [navigate]);
 const handleAcknowledgeGap = useCallback((conceptId: string) => {
 setAcknowledgedGaps(prev => new Set(prev).add(conceptId));
 }, []);
 const handleNext = useCallback(() => {
 // Mark phase completion based on current step
 if (step === 'structure') {
 markSessionScouted(); // User has surveyed the tier structure
 }
 if (isLastStep) {
 markSessionPreviewed(); // User has completed all explore steps
 onComplete(guesses);
 } else {
 setStep(STEPS_ORDER[currentStepIndex + 1]);
 }
 }, [isLastStep, currentStepIndex, guesses, onComplete, step, markSessionScouted, markSessionPreviewed]);
 // ========================================================================
 // Step 1: Structure — Tier Visualization
 // ========================================================================
 const renderStructureStep = () => (
 <div className={styles.stepContent}>
 <div className={styles.instructionBox}>
 <BookOpen size={20} className={styles.instructionIcon} />
 <div>
 <h3>Scan the Tier Structure</h3>
 <p>Trunks are exam domains, Branches are sub-topics, and Leaves are testable concepts. Notice the flow.</p>
 </div>
 </div>
 <div className={styles.tierFlow}>
 <div className={styles.tierColumn}>
 <div className={`${styles.tierHeader} ${styles.tierTrunk}`}>
 <span className={styles.tierLabel}>Trunk</span>
 <span className={styles.tierCount}>{conceptsByTier.trunk.length}</span>
 </div>
 <div className={styles.tierConceptList}>
 {conceptsByTier.trunk.map(c => (
 <ConceptChip
 key={c.id}
 concept={c}
 className={`${styles.conceptChip} ${styles.trunkChip}`}
 />
 ))}
 </div>
 </div>
 <ArrowRight className={styles.flowArrow} size={24} />
 <div className={styles.tierColumn}>
 <div className={`${styles.tierHeader} ${styles.tierBranch}`}>
 <span className={styles.tierLabel}>Branch</span>
 <span className={styles.tierCount}>{conceptsByTier.branch.length}</span>
 </div>
 <div className={styles.tierConceptList}>
 {conceptsByTier.branch.map(c => (
 <ConceptChip
 key={c.id}
 concept={c}
 className={`${styles.conceptChip} ${styles.branchChip}`}
 />
 ))}
 </div>
 </div>
 <ArrowRight className={styles.flowArrow} size={24} />
 <div className={styles.tierColumn}>
 <div className={`${styles.tierHeader} ${styles.tierLeaf}`}>
 <span className={styles.tierLabel}>Leaf</span>
 <span className={styles.tierCount}>{conceptsByTier.leaf.length}</span>
 </div>
 <div className={styles.tierConceptList}>
 {conceptsByTier.leaf.map(c => (
 <ConceptChip
 key={c.id}
 concept={c}
 className={`${styles.conceptChip} ${styles.leafChip}`}
 />
 ))}
 </div>
 </div>
 </div>
 <div className={styles.tierInsight}>
 <Sparkles size={16} />
 <span>
 <strong>{conceptsByTier.trunk.length}</strong> trunk domains
 grow into <strong>{conceptsByTier.branch.length}</strong> branches
 with <strong>{conceptsByTier.leaf.length}</strong> leaf details.
 </span>
 </div>
 </div>
 );
 // ========================================================================
 // Step 2: Sprint — Nomenclature Sprint (REPLACES Predict Links)
 // ========================================================================
 const renderSprintStep = () => {
 const handleSprintComplete = (passed: boolean) => {
 if (passed) {
 // Move to next step
 setStep('prime');
 }
 // If not passed, NomenclatureSprint handles retry internally
 };
 return (
 <NomenclatureSprint
 concepts={concepts}
 onComplete={handleSprintComplete}
 />
 );
 };
 // ========================================================================
 // Step 3: Prime — Gap Acknowledgment
 // ========================================================================
 const renderPrimeStep = () => (
 <div className={styles.stepContent}>
 <div className={styles.instructionBox}>
 <AlertCircle size={20} className={styles.instructionIcon} />
 <div>
 <h3>Acknowledge Your Gaps</h3>
 <p>Look at these questions. Don't solve them—just notice what you don't know <em>yet</em>.</p>
 </div>
 </div>
 {/* Coach Context */}
 <div className={styles.coachContextBox}>
 <Sparkles size={20} className={styles.coachIcon} />
 <div>
 <h4>Coach Context</h4>
 <p>"{aiPreview.coachMessage}"</p>
 </div>
 </div>
 <div className={styles.alertBox}>
 <AlertCircle size={20} />
 <span><strong>Don't solve these yet!</strong> Just ask: "What would I need to know?"</span>
 </div>
 <div className={styles.questionsList}>
 {aiPreview.questions.slice(0, 4).map((q, idx) => {
 const conceptId = q.concepts[0];
 const concept = concepts.find(c => c.id === conceptId);
 const conceptName = concept?.name || 'Concept';
 const isAcknowledged = acknowledgedGaps.has(conceptId);
 return (
 <motion.div
 key={idx}
 className={styles.questionCard}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: idx * 0.1 }}
 >
 <div className={styles.questionHeader}>
 <span className={`${styles.questionType} ${styles.capitalize}`}>
 {q.difficulty}
 </span>
 <span className={styles.relatedConcept}>
 {concept?.tier} · {conceptName}
 </span>
 </div>
 <p className={styles.questionText}>{q.question}</p>
 <div className={styles.reflectionInput}>
 {!isAcknowledged ? (
 <button
 className={styles.gapButton}
 onClick={() => handleAcknowledgeGap(conceptId)}
 >
 <span>I need to learn this</span>
 <ArrowRight size={16} />
 </button>
 ) : (
 <motion.div
 initial={{ opacity: 0, y: 5 }}
 animate={{ opacity: 1, y: 0 }}
 className={styles.gapAcknowledged}
 >
 <div className={styles.checkCircle}>
 <Sparkles size={14} color="white" />
 </div>
 <span><strong>Goal Set:</strong> Master {conceptName}</span>
 </motion.div>
 )}
 </div>
 </motion.div>
 );
 })}
 </div>
 </div>
 );
 // ========================================================================
 // Render Current Step
 // ========================================================================
 const renderStep = () => {
 switch (step) {
 case 'structure': return renderStructureStep();
 case 'sprint': return renderSprintStep();
 case 'prime': return renderPrimeStep();
 }
 };
 // ========================================================================
 // Main Render
 // ========================================================================
 return (
 <div className={styles.container}>
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className={styles.phaseContainer}
 >
 {/* Header */}
 <div className={styles.header}>
 <button className={styles.backButton} onClick={handleBack} title="Go back">
 <ArrowLeft size={20} />
 </button>
 <div className={styles.headerIcon}>
 <MapIcon size={32} />
 </div>
 <div>
 <h2 className={styles.title}>Step 2: Explore</h2>
 <p className={styles.subtitle}>
 {STEP_CONFIG[step].label} · {currentStepIndex + 1} of {STEPS_ORDER.length}
 </p>
 </div>
 </div>
 {/* Step Progress */}
 <div className={styles.stepNav}>
 {STEPS_ORDER.map((s, idx) => {
 const config = STEP_CONFIG[s];
 const Icon = config.icon;
 const isActive = s === step;
 const isComplete = idx < currentStepIndex;
 return (
 <div
 key={s}
 className={`${styles.stepNavItem} ${isActive ? styles.active : ''} ${isComplete ? styles.complete : ''}`}
 >
 <Icon size={16} />
 <span>{config.label}</span>
 </div>
 );
 })}
 </div>
 {/* Progress Bar */}
 <div className={styles.progressBar}>
 <div
 className={styles.progressFill}
 style={{ width: `${((currentStepIndex + 1) / STEPS_ORDER.length) * 100}%` }}
 />
 </div>
 {/* Step Content */}
 <div className={styles.scoutContent}>
 <AnimatePresence mode="wait">
 <motion.div
 key={step}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 style={{ width: '100%' }}
 >
 {renderStep()}
 </motion.div>
 </AnimatePresence>
 </div>
 {/* Footer */}
 <div className={styles.actionFooter}>
 <button className={styles.primaryButton} onClick={handleNext}>
 {isLastStep ? 'Start Step 3: Note ' : 'Next: ' + STEP_CONFIG[STEPS_ORDER[currentStepIndex + 1]]?.label}
 <ChevronRight size={20} />
 </button>
 </div>
 </motion.div>
 </div>
 );
}
export default SessionScoutPreview;
