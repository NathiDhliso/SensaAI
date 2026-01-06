/**
 * SessionScoutPreview Component
 * 
 * Implements SENSA Phase 1 (Explore) and Phase 1.5 (Explore+)
 * of The SENSA Method™ - See. Explore. Note. Study. Apply.
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Map as MapIcon,
    HelpCircle,
    ChevronRight,
    ArrowRight,
    TrendingUp,
    AlertCircle,
    BookOpen,
    Eye,
    Image as ImageIcon,
    Lightbulb,
    Sparkles,
    Volume2,
    Loader2,
    Square
} from 'lucide-react';
import { useVoice } from '@/hooks/useVoice';
import type { LearningConcept } from '@/lib/types/learning';
import { generatePreviewAnalysis } from '@/lib/ai/phases';
import { usePersonalizationStore } from '@/store/personalization-store';
import { renderShapeOrIcon } from '@/components/ui/SensaShape';
import styles from './SessionScoutPreview.module.css';

interface SessionScoutPreviewProps {
    concepts: LearningConcept[];
    initialPhase?: 'scout' | 'preview';
    onComplete: () => void;
}

type ScoutStep = 1 | 2 | 3 | 4;

export function SessionScoutPreview({ concepts, initialPhase = 'scout', onComplete }: SessionScoutPreviewProps) {
    const [phase, setPhase] = useState<'scout' | 'preview'>(initialPhase);
    const [scoutStep, setScoutStep] = useState<ScoutStep>(1);

    // Phase 1.5 State
    const [conceptsNeeded, setConceptsNeeded] = useState<Record<string, string>>({});
    const { selectedPersona } = usePersonalizationStore();
    const { toggle, isPlaying: isVoicePlaying, isLoading: isVoiceLoading } = useVoice();


    // Group concepts by phase for "Logical Flow"
    const conceptsByPhase = useMemo(() => {
        const grouped: Record<string, LearningConcept[]> = {};
        concepts.forEach(c => {
            const phase = c.lifecycle?.phase1?.title || 'Uncategorized';
            if (!grouped[phase]) grouped[phase] = [];
            grouped[phase].push(c);
        });
        return grouped;
    }, [concepts]);

    // Generate AI Preview Analysis
    const aiPreview = useMemo(() => {
        return generatePreviewAnalysis(concepts, selectedPersona);
    }, [concepts, selectedPersona]);

    const handleNextScoutStep = () => {
        if (scoutStep < 4) {
            setScoutStep((prev) => (prev + 1) as ScoutStep);
        } else {
            setPhase('preview');
        }
    };

    const handleConceptNeededChange = (id: string, value: string) => {
        setConceptsNeeded(prev => ({ ...prev, [id]: value }));
    };

    // Render logic for Scout Steps
    const renderScoutStep = () => {
        switch (scoutStep) {
            case 1: // Logical Flow
                return (
                    <div className={styles.stepContent}>
                        <div className={styles.instructionBox}>
                            <BookOpen size={20} className={styles.instructionIcon} />
                            <div>
                                <h3>Step 1: Read the Table of Contents</h3>
                                <p>Ask specific questions: "Why does {Object.keys(conceptsByPhase)[1] || 'Section 2'} come after {Object.keys(conceptsByPhase)[0] || 'Section 1'}?" Look for logical flow.</p>
                            </div>
                        </div>
                        <div className={styles.tocList}>
                            {Object.entries(conceptsByPhase).map(([phaseName, phaseConcepts], idx) => (
                                <div key={phaseName} className={styles.tocItem}>
                                    <span className={styles.tocNumber}>{idx + 1}</span>
                                    <span className={styles.tocTitle}>{phaseName}</span>
                                    <span className={styles.tocCount}>{phaseConcepts.length} concepts</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 2: // Big Ideas
                return (
                    <div className={styles.stepContent}>
                        <div className={styles.instructionBox}>
                            <Eye size={20} className={styles.instructionIcon} />
                            <div>
                                <h3>Step 2: Flip through Headings</h3>
                                <p>Don't read paragraphs. Just notice "Big Ideas" vs "Sub-ideas".</p>
                            </div>
                        </div>
                        <div className={styles.cardGrid}>
                            {concepts.slice(0, 6).map(c => (
                                <div key={c.id} className={styles.headingCard}>
                                    <span className={styles.headingRole}>{c.mnemonic?.tier || 'Concept'}</span>
                                    <span className={styles.headingTitle}>{c.name}</span>
                                </div>
                            ))}
                            {concepts.length > 6 && (
                                <div className={styles.moreCard}>+{concepts.length - 6} more headings...</div>
                            )}
                        </div>
                    </div>
                );
            case 3: // Visuals
                return (
                    <div className={styles.stepContent}>
                        <div className={styles.instructionBox}>
                            <ImageIcon size={20} className={styles.instructionIcon} />
                            <div>
                                <h3>Step 3: Look at Diagrams & Bold Terms</h3>
                                <p>One diagram often explains more than a page of text. Circle mentally what seems important.</p>
                            </div>
                        </div>
                        <div className={styles.visualsGrid}>
                            {concepts.slice(0, 4).map(c => (
                                <motion.div key={c.id} className={styles.visualCard} layoutId={`learning-focus-container`}>
                                    <div className={styles.visualPlaceholder}>
                                        {renderShapeOrIcon(c.icon, 'md')}
                                    </div>
                                    <span className={styles.visualLabel}>Diagram: {c.name} Structure</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                );
            case 4: // Predictions
                return (
                    <div className={styles.stepContent}>
                        <div className={styles.instructionBox}>
                            <Lightbulb size={20} className={styles.instructionIcon} style={{ color: 'var(--color-warning)' }} />
                            <div>
                                <h3>Step 4: Make Quick Predictions</h3>
                                <p>Guess: "How might {concepts[0]?.name} connect to {concepts[1]?.name}?" Curiosity builds "shelves" in your brain.</p>
                            </div>
                        </div>
                        <div className={styles.predictionPrompt}>
                            <div className={styles.connectionLine}>
                                <div className={styles.node}>{concepts[0]?.name}</div>
                                <ArrowRight className={styles.arrow} />
                                <div className={styles.questionMark}>?</div>
                                <ArrowRight className={styles.arrow} />
                                <div className={styles.node}>{concepts[1]?.name || 'Next Concept'}</div>
                            </div>
                            <p className={styles.predictionHelper}>Don't worry about being right.</p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className={styles.container}>
            <AnimatePresence mode="wait">
                {phase === 'scout' ? (
                    <motion.div
                        key="scout"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className={styles.phaseContainer}
                    >
                        <div className={styles.header}>
                            <div className={styles.headerIcon}>
                                <MapIcon size={32} />
                            </div>
                            <div>
                                <h2 className={styles.title}>SENSA Phase 1: Explore</h2>
                                <p className={styles.subtitle}>
                                    Building a mental skeleton. Step {scoutStep} of 4.
                                </p>
                            </div>
                        </div>

                        <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: `${(scoutStep / 4) * 100}%` }} />
                        </div>

                        <div className={styles.scoutContent}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={scoutStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    style={{ width: '100%' }}
                                >
                                    {renderScoutStep()}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className={styles.actionFooter}>
                            <button className={styles.primaryButton} onClick={handleNextScoutStep}>
                                {scoutStep === 4 ? 'Go to Explore+ Preview' : 'Next Step'}
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="preview"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={styles.phaseContainer}
                    >
                        <div className={styles.header}>
                            <div className={styles.headerIcon}>
                                <HelpCircle size={32} />
                            </div>
                            <div>
                                <h2 className={styles.title}>SENSA Explore+</h2>
                                <p className={styles.subtitle}>
                                    See what "done" looks like.
                                </p>
                            </div>
                        </div>

                        <div className={styles.previewContent}>
                            {/* AI Coach Framework Message */}
                            <div className={styles.coachContextBox}>
                                <Sparkles size={20} className={styles.coachIcon} />
                                <div>
                                    <h4>
                                        Coach Context
                                        <button
                                            className={styles.voicePlayButton} // We'll need to share or duplicate this style
                                            onClick={() => toggle(aiPreview.coachMessage)}
                                            disabled={isVoiceLoading}
                                            title={isVoicePlaying ? "Stop" : "Hear coach"}
                                            style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}
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
                                <span><strong>Don't solve these yet!</strong> Just ask: "What tools would I need?"</span>
                            </div>

                            <div className={styles.questionsList}>
                                {aiPreview.questions.map((q, idx) => {
                                    const conceptId = q.concepts[0];
                                    const conceptName = concepts.find(c => c.id === conceptId)?.name || 'Concept';
                                    return (
                                        <div key={idx} className={styles.questionCard}>
                                            <div className={styles.questionHeader}>
                                                <span className={styles.questionType} style={{ textTransform: 'capitalize' }}>
                                                    {q.difficulty}
                                                </span>
                                                <span className={styles.relatedConcept}>{conceptName}</span>
                                            </div>
                                            <p className={styles.questionText}>{q.question}</p>
                                            <div className={styles.reflectionInput}>
                                                <label>What concepts seem confusing/needed?</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Rate of change, Friction..."
                                                    value={conceptsNeeded[conceptId] || ''}
                                                    onChange={(e) => handleConceptNeededChange(conceptId, e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className={styles.actionFooter}>
                            <div className={styles.hintBox}>
                                <TrendingUp size={18} />
                                <span>You are now active hunting for knowledge.</span>
                            </div>
                            <button className={styles.primaryButton} onClick={onComplete}>
                                Start SENSA Phase 2: Note
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default SessionScoutPreview;
