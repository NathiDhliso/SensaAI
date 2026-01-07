/**
 * SessionScoutPreview Component
 * 
 * Implements Step 2: The What (Surveying) and Step 3: The Guess (Priming)
 * of The SENSA Method™ - See. Explore. Note. Study. Apply.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Map as MapIcon,
    HelpCircle,
    ChevronRight,
    ArrowRight,
    ArrowLeft,
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
import { useLearningStore } from '@/store/learning-store';
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
    const [showAllHeadings, setShowAllHeadings] = useState(false);
    const [prediction, setPrediction] = useState('');
    const [predictionSubmitted, setPredictionSubmitted] = useState(false);

    // Phase 1.5 State
    const [conceptsNeeded, setConceptsNeeded] = useState<Record<string, string>>({});
    const { selectedPersona } = usePersonalizationStore();
    const { savePrediction } = useLearningStore();
    const { toggle, isPlaying: isVoicePlaying, isLoading: isVoiceLoading } = useVoice();
    const navigate = useNavigate();

    const handleBack = () => {
        navigate(-1);
    };


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
        // Persist the prediction/gap acknowledgment to store
        savePrediction(id, value);
    };

    // Render logic for Scout Steps
    const renderScoutStep = () => {
        switch (scoutStep) {
            case 1: // Logical Flow
                const phaseNames = Object.keys(conceptsByPhase);
                const hasMultiplePhases = phaseNames.length > 1;
                const firstPhase = phaseNames[0] || 'this section';
                const secondPhase = phaseNames[1] || 'the next section';

                return (
                    <div className={styles.stepContent}>
                        <div className={styles.instructionBox}>
                            <BookOpen size={20} className={styles.instructionIcon} />
                            <div>
                                <h3>Step 1: Scan the Generated Outline</h3>
                                <p>
                                    {hasMultiplePhases
                                        ? `Ask: "Why does ${secondPhase} come after ${firstPhase}?" Look for the logical narrative.`
                                        : `Ask: "Why are these concepts grouped under '${firstPhase}'?" Look for the common theme.`
                                    }
                                </p>
                            </div>
                        </div>
                        <div className={styles.tocList}>
                            {Object.entries(conceptsByPhase).map(([phaseName, phaseConcepts], idx) => (
                                <div key={phaseName} className={styles.tocItem}>
                                    <div className={styles.tocHeader}>
                                        <span className={styles.tocNumber}>{idx + 1}</span>
                                        <span className={styles.tocTitle}>{phaseName}</span>
                                        <span className={styles.tocCount}>{phaseConcepts.length} concepts</span>
                                    </div>
                                    <div className={styles.tocConcepts}>
                                        {phaseConcepts.map(c => (
                                            <span key={c.id} className={styles.miniConceptChip}>• {c.name}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 2: // Big Ideas
                const visibleHeadings = showAllHeadings ? concepts : concepts.slice(0, 6);

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
                            {visibleHeadings.map(c => (
                                <div key={c.id} className={styles.headingCard}>
                                    <span className={styles.headingRole}>{c.mnemonic?.tier || 'Concept'}</span>
                                    <span className={styles.headingTitle}>{c.name}</span>
                                </div>
                            ))}
                            {!showAllHeadings && concepts.length > 6 && (
                                <button
                                    className={styles.moreCard}
                                    onClick={() => setShowAllHeadings(true)}
                                    type="button"
                                >
                                    +{concepts.length - 6} more headings...
                                    <br /><span className={styles.showAllLink}>Show all</span>
                                </button>
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
                                <h3>Step 3: Visualize Structure</h3>
                                <p>Since we are building a mental map, imagine how these concepts connect. Look for <strong>Bold Terms</strong>.</p>
                            </div>
                        </div>
                        <div className={styles.visualsGrid}>
                            {concepts.slice(0, 4).map(c => (
                                <motion.div key={c.id} className={styles.visualCard} layoutId={`learning-focus-container`}>
                                    <div className={styles.visualPlaceholder}>
                                        {/* Simple node-link visualization simulation */}
                                        <div className={styles.visualNodeContainer}>
                                            {renderShapeOrIcon(c.icon, 'md')}
                                            <div className={styles.visualDotPrimary} />
                                            <div className={styles.visualDotSecondary} />
                                        </div>
                                    </div>
                                    <span className={styles.visualLabel}>Structure: {c.name}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                );
            case 4: // Predictions
                const handlePredictionSubmit = () => {
                    if (!prediction.trim()) return;
                    setPredictionSubmitted(true);
                    // Play a subtle success sound or effect if possible
                };

                return (
                    <div className={styles.stepContent}>
                        <div className={styles.instructionBox}>
                            <Lightbulb size={20} className={`${styles.instructionIcon} ${styles.iconWarning}`} />
                            <div>
                                <h3>Step 4: Make a Hypothesis</h3>
                                <p>Don't just read—predict. How might {concepts[0]?.name} lead to {concepts[1]?.name}?</p>
                            </div>
                        </div>
                        <div className={styles.predictionPrompt}>
                            <div className={styles.connectionLine}>
                                <div className={styles.node}>{concepts[0]?.name}</div>
                                <ArrowRight className={styles.arrow} />
                                <motion.div
                                    className={styles.questionMark}
                                    animate={predictionSubmitted ? { rotate: 360, scale: [1, 1.2, 1], backgroundColor: 'var(--color-success)' } : {}}
                                >
                                    {predictionSubmitted ? <Lightbulb size={24} color="white" /> : '?'}
                                </motion.div>
                                <ArrowRight className={styles.arrow} />
                                <div className={styles.node}>{concepts[1]?.name || 'Next Concept'}</div>
                            </div>

                            {!predictionSubmitted ? (
                                <div className={styles.interactionArea}>
                                    <textarea
                                        className={styles.predictionInput}
                                        placeholder="I think these connect because..."
                                        value={prediction}
                                        onChange={(e) => setPrediction(e.target.value)}
                                        rows={3}
                                    />
                                    <button
                                        className={styles.primaryButton}
                                        onClick={handlePredictionSubmit}
                                        disabled={!prediction.trim()}
                                        className={`${styles.primaryButton} ${styles.widthFull}`}
                                    >
                                        Lock in Prediction
                                    </button>
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={styles.feedbackArea}
                                >
                                    <div className={styles.successBadge}>
                                        <Sparkles size={16} />
                                        <span>Hypothesis Recorded</span>
                                    </div>
                                    <p className={styles.feedbackText}>
                                        <strong>Great curiosity!</strong> By guessing first, your brain just opened a "gap" that it will now eagerly try to fill during study.
                                    </p>
                                    {concepts[0]?.logicalConnection && (
                                        <div className={styles.logicReveal}>
                                            <span className={styles.logicLabel}>Hint from the App:</span>
                                            <p>"{concepts[0].logicalConnection}"</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
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
                            <button className={styles.backButton} onClick={handleBack} title="Go back">
                                <ArrowLeft size={20} />
                            </button>
                            <div className={styles.headerIcon}>
                                <MapIcon size={32} />
                            </div>
                            <div>
                                <h2 className={styles.title}>Step 2: The What (Surveying)</h2>
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
                            <button className={styles.backButton} onClick={handleBack} title="Go back">
                                <ArrowLeft size={20} />
                            </button>
                            <div className={styles.headerIcon}>
                                <HelpCircle size={32} />
                            </div>
                            <div>
                                <h2 className={styles.title}>Step 3: The Guess (Priming)</h2>
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
                                            className={styles.voicePlayButtonInline}
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
                                                <span className={`${styles.questionType} ${styles.capitalize}`}>
                                                    {q.difficulty}
                                                </span>
                                                <span className={styles.relatedConcept}>{conceptName}</span>
                                            </div>
                                            <p className={styles.questionText}>{q.question}</p>
                                            <div className={styles.reflectionInput}>
                                                {!conceptsNeeded[conceptId] ? (
                                                    <button
                                                        className={styles.gapButton}
                                                        onClick={() => handleConceptNeededChange(conceptId, 'acknowledged')}
                                                    >
                                                        <span>I don't know how to solve this yet</span>
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
                                Start Step 4: The Map
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
