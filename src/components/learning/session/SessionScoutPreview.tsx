/**
 * SessionScoutPreview Component — SENSA v2.0
 * 
 * Implements Step 2: Explore (merged Survey + Prime)
 * 3 unified steps: Structure → Visual → Prime
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
    Volume2,
    Loader2,
    Square,
    Layers,
    ChevronRight,
} from 'lucide-react';
import { useVoice } from '@/features/ai-coach/voice/useVoice';
import type { LearningConcept } from '@/shared/types/learning';
import type { DependencyGraph } from '@/shared/types/sensa-flow';
import { generatePreviewAnalysis } from '@/features/learning-session/phases';
import { usePersonalizationStore } from '@/store/personalization-store';
import { useLearningStore } from '@/store/learning-store';
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
    prime: { label: 'Gap Priming', icon: AlertCircle, eqVar: 'Q_M' },
} as const;

const STEPS_ORDER: ExploreStep[] = ['structure', 'sprint', 'prime'];

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
    const { toggle, isPlaying: isVoicePlaying, isLoading: isVoiceLoading } = useVoice();
    const navigate = useNavigate();

    // Group concepts by tier
    const conceptsByTier = useMemo(() => {
        const foundation = concepts.filter(c => (c.tier || c.mnemonic?.tier || '').toLowerCase() === 'foundation');
        const keystone = concepts.filter(c => (c.tier || c.mnemonic?.tier || '').toLowerCase() === 'keystone');
        // Everything else is utility
        const utility = concepts.filter(c => {
            const t = (c.tier || c.mnemonic?.tier || '').toLowerCase();
            return t !== 'foundation' && t !== 'keystone';
        });

        return { foundation, keystone, utility };
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
                    <p>Foundation concepts enable Keystones, which enable Utilities. Notice the flow.</p>
                </div>
            </div>

            <div className={styles.tierFlow}>
                {/* Foundation Column */}
                <div className={styles.tierColumn}>
                    <div className={`${styles.tierHeader} ${styles.tierFoundation}`}>
                        <span className={styles.tierLabel}>Foundation</span>
                        <span className={styles.tierCount}>{conceptsByTier.foundation.length}</span>
                    </div>
                    <div className={styles.conceptList}>
                        {conceptsByTier.foundation.map(c => (
                            <motion.div
                                key={c.id}
                                className={`${styles.conceptChip} ${styles.foundationChip}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                                whileHover={{ scale: 1.02 }}
                            >
                                <span className={styles.chipEmoji}>
                                    {c.mnemonic?.anchor?.split(' ')[1] || '🔷'}
                                </span>
                                <span className={styles.chipName}>{c.name}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <ArrowRight className={styles.flowArrow} size={24} />

                {/* Keystone Column */}
                <div className={styles.tierColumn}>
                    <div className={`${styles.tierHeader} ${styles.tierKeystone}`}>
                        <span className={styles.tierLabel}>Keystone</span>
                        <span className={styles.tierCount}>{conceptsByTier.keystone.length}</span>
                    </div>
                    <div className={styles.conceptList}>
                        {conceptsByTier.keystone.map(c => (
                            <motion.div
                                key={c.id}
                                className={`${styles.conceptChip} ${styles.keystoneChip}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <span className={styles.chipEmoji}>
                                    {c.mnemonic?.anchor?.split(' ')[1] || '🔶'}
                                </span>
                                <span className={styles.chipName}>{c.name}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <ArrowRight className={styles.flowArrow} size={24} />

                {/* Utility Column */}
                <div className={styles.tierColumn}>
                    <div className={`${styles.tierHeader} ${styles.tierUtility}`}>
                        <span className={styles.tierLabel}>Utility</span>
                        <span className={styles.tierCount}>{conceptsByTier.utility.length}</span>
                    </div>
                    <div className={styles.conceptList}>
                        {conceptsByTier.utility.slice(0, 6).map(c => (
                            <motion.div
                                key={c.id}
                                className={`${styles.conceptChip} ${styles.utilityChip}`}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <span className={styles.chipEmoji}>
                                    {c.mnemonic?.anchor?.split(' ')[1] || '🔹'}
                                </span>
                                <span className={styles.chipName}>{c.name}</span>
                            </motion.div>
                        ))}
                        {conceptsByTier.utility.length > 6 && (
                            <div className={styles.moreChip}>
                                +{conceptsByTier.utility.length - 6} more
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.tierInsight}>
                <Sparkles size={16} />
                <span>
                    <strong>{conceptsByTier.foundation.length}</strong> foundation concepts
                    enable <strong>{conceptsByTier.keystone.length}</strong> keystones
                    supporting <strong>{conceptsByTier.utility.length}</strong> utilities.
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
                    <h4>
                        Coach Context
                        <button
                            className={styles.voicePlayButtonInline}
                            onClick={() => toggle(aiPreview.coachMessage)}
                            disabled={isVoiceLoading}
                            title={isVoicePlaying ? "Stop" : "Hear coach"}
                        >
                            {isVoiceLoading ? <Loader2 size={14} className={styles.spin} /> :
                                isVoicePlaying ? <Square size={14} fill="currentColor" /> : <Volume2 size={14} />}
                        </button>
                    </h4>
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
                        {isLastStep ? 'Start Step 3: Note →' : 'Next: ' + STEP_CONFIG[STEPS_ORDER[currentStepIndex + 1]]?.label}
                        <ChevronRight size={20} />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default SessionScoutPreview;
