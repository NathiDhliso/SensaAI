/**
 * MicroLearningLoopController
 * 
 * Orchestrates the test→encode→verify loop for the Learning Velocity Engine.
 * Implements adaptive timing based on concept complexity and user velocity history.
 * 
 * Requirements: 2.1, 2.6, 2.7
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle, Brain, BookOpen, RotateCcw, ChevronRight, Lightbulb, AlertCircle
} from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import type { LearningConcept } from '@/shared/types/learning';
import type { SubjectType } from '@/shared/types/macro-workflow';
import { normalizeScore, determineStatus } from '@/shared/utils/score-utils';
import { synthesizeExample } from '@/shared/utils/example-synthesis';
import BlankSheetTest from '@/components/learning/activities/BlankSheetTest';
import { getRandomElaborationPrompt } from '@/features/ai-coach';
import { usePersonalizationStore } from '@/store/personalization-store';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import { useMetaphorContent } from '@/shared/hooks/useMetaphorContent';
import { useTreeNarrative } from '@/shared/hooks/useTreeNarrative';
import styles from './MicroLearningLoopController.module.css';
// ============================================================================
// TYPES
// ============================================================================
export type LoopPhase = 'worked-example' | 'faded-example' | 'test' | 'learn' | 'verify';
export type LoopOutcome = 'mastered' | 'needs-learning' | 'needs-review';
export interface MicroLearningLoopProps {
    concept: LearningConcept;
    allConcepts?: LearningConcept[];
    complexityScore: number;
    userVelocity?: number;
    subjectType?: SubjectType;
    onLoopComplete: (outcome: LoopOutcome, timeSpent: number) => void;
    onSkip: () => void;
    onReturnToMap?: () => void;
}
interface TestPhaseResult {
    recalledPoints: number;
    totalPoints: number;
    confidence: number;
    timeSpent: number;
}
// ============================================================================
// ADAPTIVE TIMING CALCULATIONS
// ============================================================================
/**
 * Calculate adaptive loop duration based on concept complexity and user velocity
 * Returns time in seconds (60-180s range)
 */
function calculateLoopDuration(
    complexityScore: number,
    userVelocity: number = 1.0
): number {
    // Base time: 60s for complexity 1, 180s for complexity 10
    const baseTime = 60 + (complexityScore - 1) * 13.33; // Approx 120s range
    // Adjust for user velocity: faster learners get less time
    const velocityAdjusted = baseTime / userVelocity;
    // Clamp to 60-180 second range
    return Math.max(60, Math.min(180, Math.round(velocityAdjusted)));
}
/**
 * Determine loop outcome based on test and verify phases
 * Uses robust score normalization and explicit boundary handling
 */
function determineOutcome(
    testResult: TestPhaseResult,
    verifyResult: { correct: boolean; timeSpent: number }
): LoopOutcome {
    // Normalize all scores to [0, 1] range
    const testScore = normalizeScore(
        testResult.totalPoints > 0
            ? testResult.recalledPoints / testResult.totalPoints
            : 0
    );
    const confidenceScore = normalizeScore(testResult.confidence / 5);
    // Calculate composite score (weighted average)
    const compositeScore = (testScore * 0.7) + (confidenceScore * 0.3);
    // Use utility function for status determination
    const status = determineStatus(compositeScore, verifyResult.correct);
    // Map status to outcome
    return status as LoopOutcome;
}
// ============================================================================
// PHASE COMPONENTS
// ============================================================================
interface WorkedExamplePhaseProps {
    concept: LearningConcept;
    onComplete: (timeSpent: number) => void;
    /** Session context: User's Intent (Step 1) and Prediction (Step 3) */
    sessionContext?: {
        intent?: string;
        prediction?: string;
    };
}
/**
 * Worked Example Phase: Make It Real
 * Show problem -> Hide Solution -> User Solves (Mental) -> Reveal Solution
 */
function WorkedExamplePhase({ concept, onComplete, sessionContext }: WorkedExamplePhaseProps) {
    const [isSolutionRevealed, setIsSolutionRevealed] = useState(false);
    const [revealStep, setRevealStep] = useState(0);
    const [startTime] = useState(() => Date.now());
    const example = useMemo(() => synthesizeExample(concept), [concept]);
    const { analogicalModel } = useMetaphorContent(concept);
    const narrative = useTreeNarrative();
    const handleReveal = () => {
        setIsSolutionRevealed(true);
    };
    const handleStepReveal = () => {
        if (revealStep < example.steps.length) {
            setRevealStep(prev => prev + 1);
        } else {
            const timeSpent = (Date.now() - startTime) / 1000;
            onComplete(timeSpent);
        }
    };
    return (
        <motion.div
            className={styles.phaseCard}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
        >
            <div className={styles.phaseHeader}>
                <div className={`${styles.phaseIcon} ${styles.phaseIconExample}`}>
                    <Lightbulb size={24} />
                </div>
                <div>
                    <h3 className={styles.phaseTitle}>{narrative.isActive ? 'Watch It Grow' : 'Make It Real'}</h3>
                    <p className={styles.phaseSubtitle}>{narrative.isActive ? 'See how this branch develops' : 'Worked Example'}</p>
                </div>
            </div>
            <div className={styles.phaseContent}>
                {/* Recall Context: Show Intent and Prediction if available */}
                {(sessionContext?.intent || sessionContext?.prediction) && (
                    <div className={styles.recallContext}>
                        {sessionContext.intent && (
                            <p><strong>Your Intent:</strong> "{sessionContext.intent}"</p>
                        )}
                        {sessionContext.prediction && (
                            <p><strong>You predicted:</strong> You'd need to master this concept. Let's verify.</p>
                        )}
                    </div>
                )}
                {/* Only show problem section if we have real content */}
                {example.problem && (
                    <div className={styles.learningSection}>
                        <h5 className={styles.sectionTitle}>The Problem</h5>
                        <p>{example.problem}</p>
                    </div>
                )}
                {analogicalModel && (
                    <div className={styles.learningSection}>
                        <h5 className={styles.sectionTitle}>Think of it like...</h5>
                        <p className={styles.analogyText}>{analogicalModel}</p>
                    </div>
                )}
                {!isSolutionRevealed ? (
                    <button className={styles.submitButton} onClick={handleReveal}>
                        <span>I have a solution in mind</span>
                        <ChevronRight size={20} />
                    </button>
                ) : (
                    <div className={styles.learningSection}>
                        <div className={styles.sectionHeader}>
                            <h5 className={styles.sectionTitle}>The Solution</h5>
                        </div>
                        <ul className={styles.executionList}>
                            {example.steps.map((step, idx) => (
                                <motion.li
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: idx <= revealStep ? 1 : 0.3, x: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {step}
                                </motion.li>
                            ))}
                        </ul>
                        <button
                            className={styles.submitButton}
                            onClick={handleStepReveal}
                        >
                            <span>{revealStep < example.steps.length - 1 ? 'Next Step' : 'Complete Example'}</span>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
/**
 * Faded Example Phase: Scaffolded Practice
 * Show problem + PARTIAL solution -> User completes the rest
 */
function FadedExamplePhase({ concept, onComplete, sessionContext }: WorkedExamplePhaseProps) {
    const [revealStep, setRevealStep] = useState(0);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [userInputs, setUserInputs] = useState<string[]>([]);
    const [startTime] = useState(() => Date.now());
    const intentMessage = sessionContext?.intent ? `Goal: ${sessionContext.intent}` : null;
    const example = useMemo(() => synthesizeExample(concept), [concept]);
    const { analogicalModel } = useMetaphorContent(concept);
    // Initialize user inputs for missing steps (fade last 50%)
    const fadedStartIndex = Math.max(1, Math.floor(example.steps.length / 2));
    const handleInput = (idx: number, value: string) => {
        const newInputs = [...userInputs];
        newInputs[idx] = value;
        setUserInputs(newInputs);
    };
    const handleStepReveal = () => {
        if (revealStep < example.steps.length) {
            setRevealStep(prev => prev + 1);
        } else {
            const timeSpent = (Date.now() - startTime) / 1000;
            onComplete(timeSpent);
        }
    };
    return (
        <motion.div
            className={styles.phaseCard}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
        >
            <div className={styles.phaseHeader}>
                <div className={`${styles.phaseIcon} ${styles.phaseIconExample}`} style={{ background: 'var(--color-primary-light)' }}>
                    <Lightbulb size={24} color="var(--color-primary)" />
                </div>
                <div>
                    <h3 className={styles.phaseTitle}>Complete the Pattern</h3>
                    <p className={styles.phaseSubtitle}>Faded Example</p>
                </div>
            </div>
            <div className={styles.phaseContent}>
                {intentMessage && (
                    <div className={styles.recallContext} style={{ marginBottom: '1rem' }}>
                        <p><strong>{intentMessage}</strong></p>
                    </div>
                )}
                <div className={styles.learningSection}>
                    <h5 className={styles.sectionTitle}>The Problem</h5>
                    <p>{example.problem}</p>
                </div>
                {analogicalModel && (
                    <div className={styles.learningSection}>
                        <h5 className={styles.sectionTitle}>Think of it like...</h5>
                        <p className={styles.analogyText}>{analogicalModel}</p>
                    </div>
                )}
                <div className={styles.learningSection}>
                    <div className={styles.sectionHeader}>
                        <h5 className={styles.sectionTitle}>The Solution</h5>
                    </div>
                    <ul className={styles.executionList}>
                        {example.steps.map((step, idx) => {
                            const isFaded = idx >= fadedStartIndex;
                            const isVisible = idx <= revealStep;
                            if (!isVisible) return null;
                            return (
                                <motion.li
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                >
                                    {isFaded ? (
                                        <div className={styles.fadedStep}>
                                            <span className={styles.stepNumber}>{idx + 1}.</span>
                                            <input
                                                type="text"
                                                placeholder="What comes next?"
                                                className={styles.fadedInput}
                                                onChange={(e) => handleInput(idx, e.target.value)}
                                                onBlur={(e) => {
                                                    const input = e.target.value.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                                                    const target = step.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                                                    const overlap = input.filter(w => target.some(t => t.includes(w) || w.includes(t))).length;
                                                    const threshold = Math.max(1, Math.floor(target.length * 0.3));
                                                    if (input.length >= 2 && overlap >= threshold) {
                                                        setRevealStep(prev => Math.max(prev, idx + 1));
                                                    }
                                                }}
                                            />
                                            {revealStep > idx && (
                                                <div className={styles.revealedAnswer}>
                                                    <CheckCircle size={14} /> {step}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span>{step}</span>
                                    )}
                                </motion.li>
                            );
                        })}
                    </ul>
                    {/* Manual Helper Button if they get stuck or for non-faded steps */}
                    {revealStep < example.steps.length && (
                        <button
                            className={styles.submitButton}
                            onClick={handleStepReveal}
                        >
                            <span>{revealStep >= fadedStartIndex ? 'Check & Continue' : 'Next Step'}</span>
                            <ChevronRight size={20} />
                        </button>
                    )}
                    {revealStep >= example.steps.length && (
                        <button
                            className={styles.submitButton}
                            onClick={handleStepReveal}
                        >
                            <span>Complete Exercise</span>
                            <ChevronRight size={20} />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
interface TestPhaseProps {
    concept: LearningConcept;
    keyPoints: string[];
    timeLimit: number;
    onComplete: (result: TestPhaseResult) => void;
}
/**
 * Test Phase: Blank sheet recall
 * Uses the comprehensive BlankSheetTest component
 */
function TestPhase({ concept, keyPoints, onComplete }: TestPhaseProps) {
    const handleComplete = useCallback((result: { score: number; scoringConfidence: number; metrics: { totalTime: number } }) => {
        // Map BlankSheetResult to TestPhaseResult
        onComplete({
            recalledPoints: result.score / 100 * keyPoints.length, // approximation
            totalPoints: keyPoints.length,
            confidence: result.scoringConfidence * 5,
            timeSpent: result.metrics.totalTime
        });
    }, [keyPoints.length, onComplete]);
    return (
        <BlankSheetTest
            concept={concept}
            keyPoints={keyPoints}
            onComplete={handleComplete}
        />
    );
}
interface LearnPhaseProps {
    concept: LearningConcept;
    keyPoints: string[];
    onComplete: () => void;
}
/**
 * Categorize key points into Architecture, Execution, and System Physics
 * to reduce cognitive load through functional grouping.
 * 
 * System Physics (formerly Constraints) reframes "Rules" as "Immutable Laws"
 * to avoid the "Pink Elephant" paradox of negative framing.
 */
function categorizeKeyPoints(keyPoints: string[], howToUse: string[]): {
    architecture: string[];
    execution: string[];
    systemPhysics: string[];
} {
    const architecture: string[] = [];
    const execution: string[] = [];
    const systemPhysics: string[] = [];
    // Keywords for categorization
    // Physics keywords focus on capacity, topology, limits as properties
    const physicsKeywords = [
        'max', 'limit', 'only', 'cannot', 'must', 'requires', 'premium', 'licensed', 'mb', 'size', 'not', 'prohibited',
        'capacity', 'topology', 'logic', 'rule', 'constraint'
    ];
    // Execution keywords focus on actions
    const executionKeywords = [
        'create', 'click', 'open', 'set', 'add', 'select', 'configure', 'trigger', 'schedule', 'apply', 'step',
        'subscribe', 'frequency', 'recipients', 'how to'
    ];
    keyPoints.forEach(point => {
        const lower = point.toLowerCase();
        // Check for System Physics (Constraints/Laws)
        if (physicsKeywords.some(kw => lower.includes(kw))) {
            systemPhysics.push(point);
        }
        // Check for Execution (Actions)
        else if (executionKeywords.some(kw => lower.includes(kw))) {
            execution.push(point);
        }
        // Default to Architecture (Structure/Concepts)
        else {
            architecture.push(point);
        }
    });
    // Add howToUse to execution
    howToUse.forEach(step => {
        execution.push(step);
    });
    return { architecture, execution, systemPhysics };
}
/**
 * Learn Phase: Show concept content organized by function
 * Uses the "Silver Bullet" arrangement:
 * 1. Architecture (What goes Where)
 * 2. Execution (How-To)
 * 3. System Physics (Immutable Laws)
 */
function LearnPhase({ concept, keyPoints, onComplete }: LearnPhaseProps) {
    const { architecture, execution, systemPhysics } = categorizeKeyPoints(keyPoints, concept.howToUse || []);
    const { selectedPersona } = usePersonalizationStore();
    const [elaboration] = useState(() =>
        getRandomElaborationPrompt(selectedPersona || 'coach', concept.name)
    );
    const lc = concept.lifecycle;
    const hasLifecycle = lc?.phase1?.title && lc?.phase2?.title && lc?.phase3?.title;
    const sectionLabels = hasLifecycle
        ? {
            s1Title: lc!.phase1.title,
            s1Sub: lc!.phase1.steps?.[0] ?? 'What Goes Where',
            s2Title: lc!.phase2.title,
            s2Sub: lc!.phase2.steps?.[0] ?? 'How To Do It',
            s3Title: lc!.phase3.title,
            s3Sub: lc!.phase3.steps?.[0] ?? 'Immutable Laws',
        }
        : {
            s1Title: 'The Architecture',
            s1Sub: 'What Goes Where',
            s2Title: 'The Execution',
            s2Sub: 'How To Do It',
            s3Title: 'The System Physics',
            s3Sub: 'Immutable Laws',
        };
    const renderShapeOrIcon = (icon: string | undefined, _unused?: unknown, size: 'sm' | 'md' | 'lg' = 'md') => {
        if (!icon) return null;
        return <Brain size={size === 'lg' ? 24 : 20} />;
    };
    return (
        <motion.div
            className={styles.phaseCard}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
        >
            <div className={styles.phaseHeader}>
                <div className={styles.phaseIcon}>
                    <BookOpen size={24} />
                </div>
                <div>
                    <h3 className={styles.phaseTitle}>Encode & Absorb</h3>
                    <p className={styles.phaseSubtitle}>Study the key points for {concept.name}</p>
                </div>
            </div>
            <div className={styles.phaseContent}>
                <div className={styles.conceptHighlight}>
                    <div className={styles.conceptIcon}>
                        {renderShapeOrIcon(concept.icon, null, 'lg')}
                    </div>
                    <div>
                        <div className={styles.conceptTitleRow}>
                            <h4>{concept.name}</h4>
                            {concept.cognitiveLevel && (
                                <span className={`${styles.bloomBadge} ${styles[concept.cognitiveLevel]}`}>
                                    {concept.cognitiveLevel.toUpperCase()}
                                </span>
                            )}
                        </div>
                        <p className={styles.hookSentence}>{concept.hookSentence}</p>
                        {concept.trunkDomain && concept.tier !== 'trunk' && (
                            <span className={styles.breadcrumbHint}>
                                {concept.trunkDomain}
                                {concept.parentName && concept.parentName !== concept.trunkDomain && ` › ${concept.parentName}`}
                            </span>
                        )}
                    </div>
                </div>
                {concept.metaphor && (
                    <div className={styles.metaphor}>
                        <em>Think of it as:</em> {concept.metaphor}
                    </div>
                )}
                {architecture.length > 0 && (
                    <div className={styles.learningSection}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionNumber}>1</span>
                            <div>
                                <h5 className={styles.sectionTitle}>{sectionLabels.s1Title}</h5>
                                <span className={styles.sectionSubtitle}>{sectionLabels.s1Sub}</span>
                            </div>
                        </div>
                        <ul className={styles.sectionList}>
                            {architecture.map((point, idx) => (
                                <li key={idx}>{point}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {execution.length > 0 && (
                    <div className={styles.learningSection}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionNumber}>2</span>
                            <div>
                                <h5 className={styles.sectionTitle}>{sectionLabels.s2Title}</h5>
                                <span className={styles.sectionSubtitle}>{sectionLabels.s2Sub}</span>
                            </div>
                        </div>
                        <ol className={styles.executionList}>
                            {execution.map((step, idx) => (
                                <li key={idx}>{step}</li>
                            ))}
                        </ol>
                    </div>
                )}
                {systemPhysics.length > 0 && (
                    <div className={styles.learningSection}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionNumber}>3</span>
                            <div>
                                <h5 className={styles.sectionTitle}>{sectionLabels.s3Title}</h5>
                                <span className={styles.sectionSubtitle}>{sectionLabels.s3Sub}</span>
                            </div>
                        </div>
                        <ul className={styles.systemPhysicsList}>
                            {systemPhysics.map((rule, idx) => (
                                <li key={idx}>{rule}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {concept.commonPitfalls && concept.commonPitfalls.length > 0 && (
                    <div className={`${styles.learningSection} ${styles.clarificationSection}`}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionNumber}>4</span>
                            <div>
                                <h5 className={styles.sectionTitle}>Critical Clarifications</h5>
                                <span className={styles.sectionSubtitle}>Precision Checks</span>
                            </div>
                        </div>
                        <ul className={styles.clarificationList}>
                            {concept.commonPitfalls.map((pitfall, idx) => (
                                <li key={idx}>
                                    <Lightbulb size={14} className={styles.clarificationIcon} />
                                    <span>{pitfall}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {concept.technicalDetails &&
                    !concept.technicalDetails.includes('is a core concept') &&
                    concept.technicalDetails.trim() !== '' && (
                        <div className={styles.technicalDetails}>
                            <h5>Technical Details</h5>
                            <p>{concept.technicalDetails}</p>
                        </div>
                    )}
                {concept.shape?.highStakesExample && (
                    <div className={styles.learningSection}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionNumber}>!</span>
                            <div>
                                <h5 className={styles.sectionTitle}>High-Stakes Scenario</h5>
                                <span className={styles.sectionSubtitle}>When Getting It Wrong Matters</span>
                            </div>
                        </div>
                        <p className={styles.highStakesText}>{concept.shape.highStakesExample}</p>
                    </div>
                )}
                <div className={styles.elaborationSection}>
                    <div className={styles.elaborationHeader}>
                        <Lightbulb size={18} />
                        <span>Think Deeper</span>
                    </div>
                    <p className={styles.elaborationPrompt}>{elaboration.prompt}</p>
                </div>
                <button className={styles.submitButton} onClick={onComplete}>
                    <span>I understand, let's verify</span>
                    <ChevronRight size={20} />
                </button>
            </div>
        </motion.div>
    );
}
interface VerifyPhaseProps {
    concept: LearningConcept;
    allConcepts?: LearningConcept[];
    keyPoints: string[];
    onComplete: (correct: boolean, timeSpent: number) => void;
}
/**
 * Verify Phase: Quick check question
 */
function VerifyPhase({ concept, allConcepts, onComplete }: VerifyPhaseProps) {
    const { isScholarly } = useVisualTheme();
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [confidence, setConfidence] = useState<number | null>(null);
    const [showConfidencePrompt, setShowConfidencePrompt] = useState(false);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [calibrationFeedback, setCalibrationFeedback] = useState<string | null>(null);
    const [startTime] = useState(() => Date.now());
    // Helper to shuffle an array (Fisher-Yates)
    const shuffleArray = <T,>(arr: T[]): T[] => {
        const result = [...arr];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    };
    // Generate question once on mount using lazy state initializer
    const [question] = useState(() => {
        // 1. Precise Pattern Recognition (The "Golden Question")
        if (concept.shape?.patternRecognition?.question && concept.shape?.patternRecognition?.answer) {
            const correctAnswer = concept.shape.patternRecognition.answer;
            // Generate distractors from other concepts
            const otherConcepts = allConcepts?.filter(c => c.id !== concept.id) || [];
            const distractors: string[] = [];
            if (otherConcepts.length >= 3) {
                const shuffled = shuffleArray(otherConcepts);
                for (let i = 0; i < 3; i++) {
                    const c = shuffled[i];
                    // Try to get a hook sentence or a key point
                    const distractorText = c.hookSentence || (c.howToUse && c.howToUse[0]) || `Related to ${c.name}`;
                    distractors.push(distractorText);
                }
            } else {
                distractors.push("Incorrect Option A", "Incorrect Option B", "Incorrect Option C");
            }
            return {
                question: concept.shape.patternRecognition.question,
                correct: correctAnswer,
                options: shuffleArray([correctAnswer, ...distractors.slice(0, 3)])
            };
        }
        return null;
    });
    useEffect(() => {
        if (!question) {
            const timeSpent = (Date.now() - startTime) / 1000;
            onComplete(true, timeSpent);
        }
    }, [question, startTime, onComplete]);
    if (!question) {
        return null;
    }
    const correctIndex = question.options.indexOf(question.correct);
    const handleSubmit = () => {
        if (selectedAnswer === null || confidence === null) return;
        const timeSpent = (Date.now() - startTime) / 1000;
        const isCorrect = selectedAnswer === correctIndex;
        // Show feedback
        setFeedback(isCorrect ? 'correct' : 'incorrect');
        // Calculate calibration feedback
        const wasOverconfident = confidence >= 4 && !isCorrect;
        const wasUnderconfident = confidence <= 2 && isCorrect;
        if (wasOverconfident) {
            setCalibrationFeedback('Tip: Your confidence was high but the answer was incorrect. Take more time to verify your understanding.');
        } else if (wasUnderconfident) {
            setCalibrationFeedback('You knew more than you thought. Trust your learning!');
        }
        // Audio feedback
        if (isCorrect) {
            const audio = new Audio('/Audio/voice/sage_master_success.mp3');
            audio.volume = 0.2;
            audio.play().catch(() => { });
        }
        // Delay for user to see result
        setTimeout(() => {
            onComplete(isCorrect, timeSpent);
        }, calibrationFeedback ? 2500 : 1500);
    };
    // Confidence rating labels
    const confidenceLabels = isScholarly ? [
        { value: 1, label: 'Guessing', emoji: '1' },
        { value: 2, label: 'Unsure', emoji: '2' },
        { value: 3, label: 'Somewhat', emoji: '3' },
        { value: 4, label: 'Confident', emoji: '4' },
        { value: 5, label: 'Certain', emoji: '5' }
    ] : [
        { value: 1, label: 'Guessing', emoji: '1' },
        { value: 2, label: 'Unsure', emoji: '2' },
        { value: 3, label: 'Somewhat', emoji: '3' },
        { value: 4, label: 'Confident', emoji: '4' },
        { value: 5, label: 'Certain', emoji: '5' }
    ];
    return (
        <motion.div
            className={styles.phaseCard}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
        >
            <div className={styles.phaseHeader}>
                <div className={styles.phaseIcon}>
                    <CheckCircle size={24} />
                </div>
                <div>
                    <h3 className={styles.phaseTitle}>Quick Verification</h3>
                    <p className={styles.phaseSubtitle}>Confirm your understanding</p>
                </div>
            </div>
            <div className={styles.phaseContent}>
                <p className={styles.verifyQuestion}>{question.question}</p>
                <div className={styles.optionsList}>
                    {question.options.map((option, idx) => {
                        // Determine style based on feedback state
                        let optionClass = styles.optionButton;
                        if (feedback) {
                            if (idx === correctIndex) optionClass += ` ${styles.correct}`;
                            else if (idx === selectedAnswer) optionClass += ` ${styles.incorrect}`;
                            else optionClass += ` ${styles.disabled}`;
                        } else if (selectedAnswer === idx) {
                            optionClass += ` ${styles.selected}`;
                        }
                        return (
                            <button
                                key={idx}
                                className={optionClass}
                                onClick={() => !feedback && setSelectedAnswer(idx)}
                                disabled={!!feedback}
                            >
                                <span className={styles.optionLetter}>
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                <span className={styles.optionText}>{option}</span>
                                {feedback && idx === correctIndex && <CheckCircle size={16} className={styles.resultIcon} />}
                            </button>
                        );
                    })}
                </div>
                {!feedback && !showConfidencePrompt && (
                    <button
                        className={styles.submitButton}
                        onClick={() => setShowConfidencePrompt(true)}
                        disabled={selectedAnswer === null}
                    >
                        <span>I'm ready to submit</span>
                        <ChevronRight size={20} />
                    </button>
                )}
                {/* Confidence Rating Prompt */}
                {showConfidencePrompt && !feedback && (
                    <motion.div
                        className={styles.confidencePrompt}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className={styles.confidenceHeader}>
                            <AlertCircle size={18} />
                            <span>How confident are you in your answer?</span>
                        </div>
                        <div className={styles.confidenceButtons}>
                            {confidenceLabels.map(({ value, label, emoji }) => (
                                <button
                                    key={value}
                                    className={`${styles.confidenceButton} ${confidence === value ? styles.confidenceSelected : ''}`}
                                    onClick={() => setConfidence(value)}
                                >
                                    <span className={styles.confidenceEmoji}>{emoji}</span>
                                    <span className={styles.confidenceLabel}>{label}</span>
                                </button>
                            ))}
                        </div>
                        <button
                            className={styles.submitButton}
                            onClick={handleSubmit}
                            disabled={confidence === null}
                        >
                            <span>Verify Answer</span>
                            <ChevronRight size={20} />
                        </button>
                    </motion.div>
                )}
                {feedback && (
                    <div className={styles.feedbackMessage}>
                        <span>{feedback === 'correct' ? ' Correct!' : ' Not quite...'}</span>
                        {calibrationFeedback && (
                            <p className={styles.calibrationFeedback}>{calibrationFeedback}</p>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function MicroLearningLoopController({
    concept,
    allConcepts,
    complexityScore,
    userVelocity = 1.0,
    subjectType,
    onLoopComplete,
    onSkip,
    onReturnToMap
}: MicroLearningLoopProps) {
    // 0. Store & Hooks
    const { recordInteraction, studySession } = useLearningStore();
    // 1. Core State
    // ARCHITECT: Smart Scaffold Selection
    // If user has high velocity/mastery, start with 'faded-example'. Else 'worked-example'.
    const [loopState, setLoopState] = useState<LoopPhase>(() => {
        if (userVelocity && userVelocity > 1.2) return 'faded-example';
        return 'worked-example';
    });
    const [loopStartTime] = useState(Date.now());
    const [keyPoints, setKeyPoints] = useState<string[]>([]);
    const [sessionContext, setSessionContext] = useState<{ intent?: string; prediction?: string }>({});
    const [testResult, setTestResult] = useState<TestPhaseResult | null>(null);
    const [totalTimeSpent, setTotalTimeSpent] = useState(0);
    // 3. Handlers
    const handleLoopCompleteInternal = (outcome: LoopOutcome) => {
        const timeSpent = (Date.now() - loopStartTime) / 1000;
        onLoopComplete(outcome, timeSpent);
    };
    const loopDuration = useMemo(() =>
        calculateLoopDuration(complexityScore, userVelocity),
        [complexityScore, userVelocity]
    );
    const adaptiveReason = useMemo(() => {
        const reasons: string[] = [];
        if (userVelocity > 1.2) {
            reasons.push('Scaffold reduced — your velocity is high');
        } else if (userVelocity < 0.8) {
            reasons.push('Full scaffold — building foundations');
        }
        if (concept.tier === 'trunk') {
            reasons.push('Trunk concept — prerequisite for others');
        } else if (concept.tier === 'leaf') {
            reasons.push('Leaf concept — specialized application');
        }
        return reasons.length > 0 ? reasons[0] : null;
    }, [userVelocity, concept.tier, loopState, subjectType]);
    // Extract key points from concept
    useEffect(() => {
        const points: string[] = [];
        // Priority 1: SHAPE Content (High value)
        if (concept.shape?.simpleCore) points.push(concept.shape.simpleCore);
        if (concept.shape?.eliminationLogic) points.push(concept.shape.eliminationLogic);
        // Priority 2: Standard fields
        if (concept.hookSentence) points.push(concept.hookSentence);
        if (concept.whyYouNeed) points.push(concept.whyYouNeed);
        if (concept.howToUse && concept.howToUse.length > 0) {
            points.push(...concept.howToUse.slice(0, 2));
        }
        if (concept.technicalDetails) points.push(concept.technicalDetails);
        // Filter duplicates and empty strings
        const uniquePoints = Array.from(new Set(points.filter(p => p && p.length > 5)));
        setKeyPoints(uniquePoints.slice(0, 7)); // Max 7 key points
        setSessionContext({
            intent: studySession?.primer?.reason,
            prediction: studySession?.predictions?.[concept.id]
        });
    }, [concept, studySession]);
    // Unified handler for Worked/Faded phases
    const handlePhaseComplete = useCallback((phase: LoopPhase, data: { timeSpent: number }) => {
        setTotalTimeSpent(prev => prev + data.timeSpent);
        // Transition logic
        if (phase === 'worked-example' || phase === 'faded-example') {
            setLoopState('test'); // Move to Blank Sheet Test
        }
    }, []);
    const handleTestComplete = useCallback((result: TestPhaseResult) => {
        setTestResult(result);
        setTotalTimeSpent(prev => prev + result.timeSpent);
        // If test score is very low, go straight to learn phase
        // Otherwise, go to learn phase anyway to reinforce
        setLoopState('learn');
    }, []);
    const handleLearnComplete = useCallback(() => {
        setLoopState('verify');
    }, []);
    const handleVerifyComplete = useCallback((correct: boolean, timeSpent: number) => {
        const finalTimeSpent = totalTimeSpent + timeSpent;
        setTotalTimeSpent(finalTimeSpent);
        recordInteraction(correct, timeSpent * 1000);
        const currentTestResult = testResult || { recalledPoints: 0, totalPoints: 0, confidence: 0, timeSpent: 0 };
        const outcome = determineOutcome(currentTestResult, { correct, timeSpent });
        handleLoopCompleteInternal(outcome);
    }, [testResult, totalTimeSpent, recordInteraction, concept, handleLoopCompleteInternal]);
    return (
        <div className={styles.container}>
            {/* Cognitive Phase Context */}
            <div className={styles.cognitivePhaseContext}>
                <span className={styles.cognitiveVerb}>Know</span>
                <span className={styles.cognitiveSeparator}>·</span>
                <span className={styles.cognitiveLabel}>Conceptual Phase</span>
            </div>
            {/* Phase indicator */}
            <div className={styles.phaseIndicator}>
                <div className={`${styles.phaseStep} ${loopState === 'worked-example' ? styles.active : ''} ${['test', 'learn', 'verify'].includes(loopState) ? styles.complete : ''}`}>
                    <Lightbulb size={18} />
                    <span>Real</span>
                </div>
                <div className={styles.phaseLine} />
                <div className={`${styles.phaseStep} ${loopState === 'test' ? styles.active : ''} ${['learn', 'verify'].includes(loopState) ? styles.complete : ''}`}>
                    <Brain size={18} />
                    <span>Test</span>
                </div>
                <div className={styles.phaseLine} />
                <div className={`${styles.phaseStep} ${loopState === 'learn' ? styles.active : ''} ${['verify'].includes(loopState) ? styles.complete : ''}`}>
                    <BookOpen size={18} />
                    <span>Encode</span>
                </div>
                <div className={styles.phaseLine} />
                <div className={`${styles.phaseStep} ${loopState === 'verify' ? styles.active : ''}`}>
                    <CheckCircle size={18} />
                    <span>Verify</span>
                </div>
            </div>
            {adaptiveReason && (
                <div className={styles.adaptiveHint}>
                    <Brain size={12} />
                    <span>{adaptiveReason}</span>
                    <span className={styles.adaptiveTiming}>~{Math.round(loopDuration / 60)}min loop</span>
                </div>
            )}
            {/* Main Content Area */}
            <div className={styles.contentArea}>
                <AnimatePresence mode="wait">
                    {loopState === 'worked-example' && (
                        <WorkedExamplePhase
                            key="worked-example"
                            concept={concept}
                            onComplete={(time) => handlePhaseComplete('worked-example', { timeSpent: time })}
                            sessionContext={sessionContext}
                        />
                    )}
                    {loopState === 'faded-example' && (
                        <FadedExamplePhase
                            key="faded-example"
                            concept={concept}
                            onComplete={(time) => handlePhaseComplete('faded-example', { timeSpent: time })}
                            sessionContext={sessionContext}
                        />
                    )}
                    {loopState === 'test' && (
                        <TestPhase
                            key="test"
                            concept={concept}
                            keyPoints={keyPoints}
                            timeLimit={Math.round(loopDuration * 0.4)}
                            onComplete={handleTestComplete}
                        />
                    )}
                    {loopState === 'learn' && (
                        <LearnPhase
                            key="learn"
                            concept={concept}
                            keyPoints={keyPoints}
                            onComplete={handleLearnComplete}
                        />
                    )}
                    {loopState === 'verify' && (
                        <VerifyPhase
                            key="verify"
                            concept={concept}
                            allConcepts={allConcepts}
                            keyPoints={keyPoints}
                            onComplete={handleVerifyComplete}
                        />
                    )}
                </AnimatePresence>
                {/* ARCHITECT ENHANCEMENT: Navigation Flexibility */}
                <div className={styles.navigationActions}>
                    <button
                        className={styles.skipButton}
                        onClick={onSkip}
                        title="Skip to next concept"
                    >
                        <RotateCcw size={16} />
                        Skip this concept
                    </button>
                    <button
                        className={styles.backToMapButton}
                        onClick={() => {
                            // Use provided callback, or fallback to skip if not available
                            if (onReturnToMap) {
                                onReturnToMap();
                            } else {
                                // Safe fallback: skip this concept instead of fragile history.back()
                                onSkip();
                            }
                        }}
                        title="Return to concept map to revise connections"
                    >
                        Return to Map
                    </button>
                </div>
            </div>
        </div>
    );
}
export default MicroLearningLoopController;
