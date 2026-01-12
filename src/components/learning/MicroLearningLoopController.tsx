/**
 * MicroLearningLoopController
 * 
 * Orchestrates the test→learn→verify loop for the Learning Velocity Engine.
 * Implements adaptive timing based on concept complexity and user velocity history.
 * 
 * Requirements: 2.1, 2.6, 2.7
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain,
    BookOpen,
    CheckCircle2,
    RotateCcw,
    ChevronRight,
    Lightbulb
} from 'lucide-react';
import type { LearningConcept } from '@/lib/types/learning';
import { useLearningStore } from '@/store/learning-store';
import { renderShapeOrIcon } from '@/components/ui/SensaShape';
import { VELOCITY_CONFIG } from '@/constants/ui-constants';
import { isRealContent } from '@/lib/validation/content-quality';

import BlankSheetTest from './BlankSheetTest';
import ConfusionDrill from './ConfusionDrill';
import { findConfusionPairs, generateConfusionQuestions } from '@/lib/generation/confusion-generator';
import type { ConfusionDrillResult, ConfusionPair } from '@/lib/generation/confusion-generator';
import styles from './MicroLearningLoopController.module.css';

// ============================================================================
// TYPES
// ============================================================================

export type LoopPhase = 'worked-example' | 'test' | 'learn' | 'verify' | 'confusion';

export type LoopOutcome = 'mastered' | 'needs-learning' | 'needs-review';

export interface MicroLearningLoopProps {
    /** Current concept being learned */
    concept: LearningConcept;
    /** All concepts for confusion detection */
    allConcepts?: LearningConcept[];
    /** Complexity score (1-10) for adaptive timing */
    complexityScore: number;
    /** User's historical velocity for this type of concept */
    userVelocity?: number;
    /** Callback when loop completes */
    onLoopComplete: (outcome: LoopOutcome, timeSpent: number) => void;
    /** Callback to skip to next concept */
    onSkip: () => void;
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
    const baseTime = VELOCITY_CONFIG.LOOP.BASE_TIME_SECONDS + (complexityScore - 1) * VELOCITY_CONFIG.LOOP.TIME_STEP_PER_COMPLEXITY;

    // Adjust for user velocity: faster learners get less time
    const velocityAdjusted = baseTime / userVelocity;

    // Clamp to 60-180 second range
    return Math.max(VELOCITY_CONFIG.LOOP.MIN_TIME_SECONDS, Math.min(VELOCITY_CONFIG.LOOP.MAX_TIME_SECONDS, Math.round(velocityAdjusted)));
}

/**
 * Determine loop outcome based on test and verify phases
 */
function determineOutcome(
    testResult: TestPhaseResult,
    verifyResult: { correct: boolean; timeSpent: number }
): LoopOutcome {
    const testScore = testResult.recalledPoints / testResult.totalPoints;
    const confidenceScore = testResult.confidence / 5;

    // High test score + correct verify = mastered
    if (testScore >= VELOCITY_CONFIG.SCORING.MASTERY_THRESHOLD && verifyResult.correct && confidenceScore >= VELOCITY_CONFIG.SCORING.CONFIDENCE_THRESHOLD) {
        return 'mastered';
    }

    // Low test score = needs learning
    if (testScore < VELOCITY_CONFIG.SCORING.NEEDS_LEARNING_THRESHOLD) {
        return 'needs-learning';
    }

    // Medium performance or wrong verify = needs review
    return 'needs-review';
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
    const [startTime] = useState(Date.now());

    // Synthesize problem/solution - STRICT MODE: flag missing content
    const example = useMemo(() => {
        // Priority: Use explicit workedExample if provided
        if (concept.workedExample) return { ...concept.workedExample, hasError: false };

        // Build scenario from available content
        const contextText = concept.shape?.highStakesExample ||
            concept.hookSentence ||
            concept.whyYouNeed;

        // Use shape.analogicalModel or shape.simpleCore for solution approach
        const approachText = concept.shape?.analogicalModel ||
            concept.shape?.simpleCore ||
            concept.metaphor;

        // Check if we have REAL content (not placeholders)
        const hasRealContext = isRealContent(contextText, concept.name);
        const hasRealApproach = isRealContent(approachText, concept.name);
        const hasRealSteps = (concept.howToUse && concept.howToUse.length > 0) ||
            (concept.keyPoints && concept.keyPoints.length > 0);

        return {
            problem: hasRealContext
                ? `Scenario: ${contextText}`
                : null, // Flag as missing
            solution: hasRealApproach
                ? `Approach: ${approachText}`
                : null, // Flag as missing
            steps: hasRealSteps
                ? (concept.howToUse && concept.howToUse.length > 0 ? concept.howToUse : concept.keyPoints!)
                : [], // Empty = error
            hasError: !hasRealContext || !hasRealApproach || !hasRealSteps
        };
    }, [concept]);

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
                    <h3 className={styles.phaseTitle}>Make It Real</h3>
                    <p className={styles.phaseSubtitle}>Worked Example</p>
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
function TestPhase({ concept, keyPoints, timeLimit: _timeLimit, onComplete }: TestPhaseProps) {
    const handleComplete = useCallback((result: any) => {
        // Map BlankSheetResult to TestPhaseResult
        onComplete({
            recalledPoints: result.score / 100 * keyPoints.length, // approximation
            totalPoints: keyPoints.length,
            confidence: result.scoringConfidence * 5,
            timeSpent: result.metrics.totalTime,
        });
    }, [keyPoints.length, onComplete]);

    const handleSkip = useCallback(() => {
        onComplete({
            recalledPoints: 0,
            totalPoints: keyPoints.length,
            confidence: 0,
            timeSpent: 0
        });
    }, [keyPoints.length, onComplete]);

    return (
        <BlankSheetTest
            concept={concept}
            keyPoints={keyPoints}
            onComplete={handleComplete}
            onSkip={handleSkip}
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
                    <h3 className={styles.phaseTitle}>Learn & Absorb</h3>
                    <p className={styles.phaseSubtitle}>Study the key points for {concept.name}</p>
                </div>
            </div>

            <div className={styles.phaseContent}>
                {/* Concept Overview */}
                <div className={styles.conceptHighlight}>
                    <div className={styles.conceptIcon}>
                        {renderShapeOrIcon(concept.icon, 'lg')}
                    </div>
                    <div>
                        <h4>{concept.name}</h4>
                        <p className={styles.hookSentence}>{concept.hookSentence}</p>
                    </div>
                </div>

                {/* Mental Model */}
                {concept.metaphor && (
                    <div className={styles.metaphor}>
                        <em>Think of it as:</em> {concept.metaphor}
                    </div>
                )}

                {/* Section 1: Architecture (What Goes Where) */}
                {architecture.length > 0 && (
                    <div className={styles.learningSection}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionNumber}>1</span>
                            <div>
                                <h5 className={styles.sectionTitle}>The Architecture</h5>
                                <span className={styles.sectionSubtitle}>What Goes Where</span>
                            </div>
                        </div>
                        <ul className={styles.sectionList}>
                            {architecture.map((point, idx) => (
                                <li key={idx}>{point}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Section 2: Execution (How-To) */}
                {execution.length > 0 && (
                    <div className={styles.learningSection}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionNumber}>2</span>
                            <div>
                                <h5 className={styles.sectionTitle}>The Execution</h5>
                                <span className={styles.sectionSubtitle}>How To Do It</span>
                            </div>
                        </div>
                        <ol className={styles.executionList}>
                            {execution.map((step, idx) => (
                                <li key={idx}>{step}</li>
                            ))}
                        </ol>
                    </div>
                )}

                {/* Section 3: System Physics (Immutable Laws) */}
                {systemPhysics.length > 0 && (
                    <div className={styles.learningSection}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionNumber}>3</span>
                            <div>
                                <h5 className={styles.sectionTitle}>The System Physics</h5>
                                <span className={styles.sectionSubtitle}>Immutable Laws</span>
                            </div>
                        </div>
                        <ul className={styles.systemPhysicsList}>
                            {systemPhysics.map((rule, idx) => (
                                <li key={idx}>{rule}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Technical Details - hide if generic */}
                {concept.technicalDetails &&
                    !concept.technicalDetails.includes('is a core concept') &&
                    concept.technicalDetails.trim() !== '' && (
                        <div className={styles.technicalDetails}>
                            <h5>Technical Details</h5>
                            <p>{concept.technicalDetails}</p>
                        </div>
                    )}

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
function VerifyPhase({ concept, allConcepts, keyPoints, onComplete }: VerifyPhaseProps) {
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [startTime] = useState(Date.now());

    // Generate a smart verification question
    const question = useMemo(() => {
        // 1. Precise Pattern Recognition (The "Golden Question")
        if (concept.shape?.patternRecognition?.question && concept.shape?.patternRecognition?.answer) {
            const correctAnswer = concept.shape.patternRecognition.answer;

            // Generate distractors from other concepts
            const otherConcepts = allConcepts?.filter(c => c.id !== concept.id) || [];
            const distractors: string[] = [];

            if (otherConcepts.length >= 3) {
                const shuffled = [...otherConcepts].sort(() => Math.random() - 0.5);
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
                options: [correctAnswer, ...distractors.slice(0, 3)].sort(() => Math.random() - 0.5),
            };
        }

        // 2. Fallback: Generate from key points
        const randomPoint = keyPoints[Math.floor(Math.random() * keyPoints.length)];

        // Smart Distractors: Pick key points from OTHER concepts to make real-looking options
        const otherConcepts = allConcepts?.filter(c => c.id !== concept.id) || [];
        const distractors: string[] = [];

        // Try to get 3 distractors from other concepts
        if (otherConcepts.length >= 3) {
            // Shuffle other concepts
            const shuffled = [...otherConcepts].sort(() => Math.random() - 0.5);

            for (let i = 0; i < 3; i++) {
                const c = shuffled[i];
                // Try to get a hook sentence or a key point
                const distractorText = c.hookSentence || (c.howToUse && c.howToUse[0]) || `Related to ${c.name}`;
                distractors.push(distractorText);
            }
        } else {
            // Fallback to generic distractors if not enough concepts
            distractors.push(
                `The process of reversing ${concept.name}`,
                `An alternative to ${concept.name}`,
                `A deprecated version of ${concept.name}`
            );
        }

        // Ensure we have 3 distractors (fill with generic if needed/mixed)
        while (distractors.length < 3) {
            distractors.push(`An unrelated concept in ${concept.name}`);
        }

        return {
            question: `Which of the following applies to "${concept.name}"?`,
            correct: randomPoint,
            options: [
                randomPoint,
                ...distractors.slice(0, 3)
            ].sort(() => Math.random() - 0.5),
        };
    }, [concept, keyPoints, allConcepts]);

    const correctIndex = question.options.indexOf(question.correct);

    const handleSubmit = () => {
        if (selectedAnswer === null) return;

        const timeSpent = (Date.now() - startTime) / 1000;
        const isCorrect = selectedAnswer === correctIndex;

        // Show feedback
        setFeedback(isCorrect ? 'correct' : 'incorrect');

        // Audio feedback
        if (isCorrect) {
            const audio = new Audio('/audio/voice/sage_master_success.mp3'); // Reuse existing sound or generic beep
            audio.volume = 0.2;
            audio.play().catch(() => { });
        }

        // Delay for user to see result
        setTimeout(() => {
            onComplete(isCorrect, timeSpent);
        }, 1500);
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
                    <CheckCircle2 size={24} />
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
                                {feedback && idx === correctIndex && <CheckCircle2 size={16} className={styles.resultIcon} />}
                            </button>
                        );
                    })}
                </div>

                {!feedback && (
                    <button
                        className={styles.submitButton}
                        onClick={handleSubmit}
                        disabled={selectedAnswer === null}
                    >
                        <span>Verify Answer</span>
                        <ChevronRight size={20} />
                    </button>
                )}
                {feedback && (
                    <div className={styles.feedbackMessage}>
                        {feedback === 'correct' ? 'Correct!' : 'Not quite...'}
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
    onLoopComplete,
    onSkip,
}: MicroLearningLoopProps) {
    // Phase 2.5: Start with worked example (Make It Real) -> Phase 3: Test (Blank Sheet)
    const [phase, setPhase] = useState<LoopPhase>('worked-example');
    const [testResult, setTestResult] = useState<TestPhaseResult | null>(null);
    const [totalTimeSpent, setTotalTimeSpent] = useState(0);

    const { recordInteraction, studySession } = useLearningStore();

    // State for Confusion Drill Queue
    const [confusionQueue, setConfusionQueue] = useState<ConfusionPair[]>([]);
    const [currentDrillIndex, setCurrentDrillIndex] = useState(0);

    // Calculate adaptive loop duration based on concept complexity and user velocity
    const loopDuration = useMemo(() =>
        calculateLoopDuration(complexityScore, userVelocity),
        [complexityScore, userVelocity]
    );

    // Extract key points from concept
    const keyPoints = useMemo(() => {
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

        return uniquePoints.slice(0, 7); // Max 7 key points
    }, [concept]);

    // Check if confusion prevention is needed
    const hasConfusionPairs = useMemo(() => {
        if (!allConcepts) return false;
        const pairs = findConfusionPairs(concept, allConcepts);
        return pairs.length > 0;
    }, [concept, allConcepts]);

    const handleWorkedExampleComplete = useCallback((timeSpent: number) => {
        setTotalTimeSpent(prev => prev + timeSpent);
        // After Worked Example (Make It Real), go to Test (Blank Sheet / Keep It Strong)
        setPhase('test');
    }, []);

    const handleTestComplete = useCallback((result: TestPhaseResult) => {
        setTestResult(result);
        setTotalTimeSpent(prev => prev + result.timeSpent);

        // If test score is very low, go straight to learn phase
        // Otherwise, go to learn phase anyway to reinforce
        setPhase('learn');
    }, []);

    const handleLearnComplete = useCallback(() => {
        setPhase('verify');
    }, []);

    const [verifyResultData, setVerifyResultData] = useState<{ correct: boolean, timeSpent: number } | null>(null);

    const handleVerifyComplete = useCallback((correct: boolean, timeSpent: number) => {
        const finalTimeSpent = totalTimeSpent + timeSpent;
        setTotalTimeSpent(finalTimeSpent);
        setVerifyResultData({ correct, timeSpent });

        // Record the interaction for cognitive metrics
        recordInteraction(correct, timeSpent * 1000);

        // Fallback: If testResult is missing (e.g. lost during HMR or dev), simulate one
        const currentTestResult = testResult || {
            recalledPoints: correct ? 10 : 5,
            totalPoints: 10,
            confidence: 5,
            timeSpent: 0
        };

        const outcome = determineOutcome(currentTestResult, { correct, timeSpent });

        // If mastered AND has potential confusion pairs, go to confusion phase
        // This ensures we only clarify confusion for concepts the user is starting to get right
        if (hasConfusionPairs && phase !== 'confusion') {
            const pairs = findConfusionPairs(concept, allConcepts || []);
            if (pairs.length > 0) {
                setConfusionQueue(pairs);
                setCurrentDrillIndex(0);
                setPhase('confusion');
                return;
            }
        }

        onLoopComplete(outcome, finalTimeSpent);
    }, [testResult, totalTimeSpent, onLoopComplete, recordInteraction, hasConfusionPairs, phase]);

    return (
        <div className={styles.container}>
            {/* Phase indicator */}
            <div className={styles.phaseIndicator}>
                <div className={`${styles.phaseStep} ${phase === 'worked-example' ? styles.active : ''} ${['test', 'learn', 'verify', 'confusion'].includes(phase) ? styles.complete : ''}`}>
                    <Lightbulb size={18} />
                    <span>Real</span>
                </div>
                <div className={styles.phaseLine} />
                <div className={`${styles.phaseStep} ${phase === 'test' ? styles.active : ''} ${['learn', 'verify', 'confusion'].includes(phase) ? styles.complete : ''}`}>
                    <Brain size={18} />
                    <span>Test</span>
                </div>
                <div className={styles.phaseLine} />
                <div className={`${styles.phaseStep} ${phase === 'learn' ? styles.active : ''} ${['verify', 'confusion'].includes(phase) ? styles.complete : ''}`}>
                    <BookOpen size={18} />
                    <span>Learn</span>
                </div>
                <div className={styles.phaseLine} />
                <div className={`${styles.phaseStep} ${phase === 'verify' ? styles.active : ''}`}>
                    <CheckCircle2 size={18} />
                    <span>Verify</span>
                </div>
            </div>



            {/* Phase content */}
            {/* Main Content Area */}
            <div className={styles.contentArea}>
                <AnimatePresence mode="wait">
                    {phase === 'worked-example' && (
                        <WorkedExamplePhase
                            key="worked-example"
                            concept={concept}
                            onComplete={handleWorkedExampleComplete}
                            sessionContext={{
                                intent: studySession?.primer?.reason,
                                prediction: studySession?.predictions?.[concept.id]
                            }}
                        />
                    )}
                    {phase === 'test' && (
                        <TestPhase
                            key="test"
                            concept={concept}
                            keyPoints={keyPoints}
                            timeLimit={Math.round(loopDuration * 0.4)}
                            onComplete={handleTestComplete}
                        />
                    )}
                    {phase === 'learn' && (
                        <LearnPhase
                            key="learn"
                            concept={concept}
                            keyPoints={keyPoints}
                            onComplete={handleLearnComplete}
                        />
                    )}
                    {phase === 'verify' && (
                        <VerifyPhase
                            key="verify"
                            concept={concept}
                            allConcepts={allConcepts}
                            keyPoints={keyPoints}
                            onComplete={handleVerifyComplete}
                        />
                    )}
                    {phase === 'confusion' && confusionQueue.length > 0 && currentDrillIndex < confusionQueue.length && (
                        <ConfusionDrill
                            key={`drill-${confusionQueue[currentDrillIndex].concept2.id}`}
                            pair={confusionQueue[currentDrillIndex]}
                            questions={generateConfusionQuestions(confusionQueue[currentDrillIndex])}
                            onComplete={(res: ConfusionDrillResult) => {
                                // Accumulate time
                                const newTime = totalTimeSpent + res.timeSpent;
                                setTotalTimeSpent(newTime);

                                // Advance to next drill or finish
                                if (currentDrillIndex < confusionQueue.length - 1) {
                                    setCurrentDrillIndex(prev => prev + 1);
                                } else {
                                    // All drills done
                                    const outcome = testResult && verifyResultData
                                        ? determineOutcome(testResult, verifyResultData)
                                        : 'mastered';
                                    onLoopComplete(outcome, newTime);
                                }
                            }}
                            onClose={() => {
                                // Allow early exit
                                const outcome = testResult && verifyResultData
                                    ? determineOutcome(testResult, verifyResultData)
                                    : 'mastered';
                                onLoopComplete(outcome, totalTimeSpent);
                            }}
                        />
                    )}
                </AnimatePresence>

                {/* Skip button - positioned at bottom of content */}
                <button className={styles.skipButton} onClick={onSkip}>
                    <RotateCcw size={16} />
                    Skip this concept
                </button>
            </div>
        </div>
    );
}

export default MicroLearningLoopController;
