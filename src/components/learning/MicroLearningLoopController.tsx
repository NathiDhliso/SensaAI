/**
 * MicroLearningLoopController
 * 
 * Orchestrates the test→learn→verify loop for the Learning Velocity Engine.
 * Implements adaptive timing based on concept complexity and user velocity history.
 * 
 * Requirements: 2.1, 2.6, 2.7
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain,
    BookOpen,
    CheckCircle2,
    Clock,
    RotateCcw,
    Zap,
    ChevronRight
} from 'lucide-react';
import type { LearningConcept } from '@/lib/types/learning';
import { useLearningStore } from '@/store/learning-store';
import { renderShapeOrIcon } from '@/components/ui/SensaShape';
import CognitiveGauge from './CognitiveGauge';
import styles from './MicroLearningLoopController.module.css';

// ============================================================================
// TYPES
// ============================================================================

export type LoopPhase = 'test' | 'learn' | 'verify';

export type LoopOutcome = 'mastered' | 'needs-learning' | 'needs-review';

export interface MicroLearningLoopProps {
    /** Current concept being learned */
    concept: LearningConcept;
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
    const baseTime = 60 + (complexityScore - 1) * (120 / 9);

    // Adjust for user velocity: faster learners get less time
    const velocityAdjusted = baseTime / userVelocity;

    // Clamp to 60-180 second range
    return Math.max(60, Math.min(180, Math.round(velocityAdjusted)));
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
    if (testScore >= 0.7 && verifyResult.correct && confidenceScore >= 0.6) {
        return 'mastered';
    }

    // Low test score = needs learning
    if (testScore < 0.4) {
        return 'needs-learning';
    }

    // Medium performance or wrong verify = needs review
    return 'needs-review';
}

// ============================================================================
// PHASE COMPONENTS
// ============================================================================

interface TestPhaseProps {
    concept: LearningConcept;
    keyPoints: string[];
    timeLimit: number;
    onComplete: (result: TestPhaseResult) => void;
}

/**
 * Test Phase: Blank sheet recall
 */
function TestPhase({ concept, keyPoints, timeLimit, onComplete }: TestPhaseProps) {
    const [recalledText, setRecalledText] = useState('');
    const [confidence, setConfidence] = useState(3);
    const [timeRemaining, setTimeRemaining] = useState(timeLimit);
    const [startTime] = useState(Date.now());

    // Timer countdown
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = useCallback(() => {
        const timeSpent = (Date.now() - startTime) / 1000;

        // Simple keyword matching for recalled points
        const recalledWords = recalledText.toLowerCase().split(/\s+/);
        let matchedPoints = 0;

        for (const point of keyPoints) {
            const pointWords = point.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const matches = pointWords.filter(pw => recalledWords.some(rw => rw.includes(pw)));
            if (matches.length >= pointWords.length * 0.3) {
                matchedPoints++;
            }
        }

        onComplete({
            recalledPoints: matchedPoints,
            totalPoints: keyPoints.length,
            confidence,
            timeSpent,
        });
    }, [recalledText, keyPoints, confidence, startTime, onComplete]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                    <Brain size={24} />
                </div>
                <div>
                    <h3 className={styles.phaseTitle}>Test Your Recall</h3>
                    <p className={styles.phaseSubtitle}>Write what you remember about {concept.name}</p>
                </div>
                <div className={`${styles.timer} ${timeRemaining < 30 ? styles.timerWarning : ''}`}>
                    <Clock size={16} />
                    <span>{formatTime(timeRemaining)}</span>
                </div>
            </div>

            <div className={styles.phaseContent}>
                <textarea
                    className={styles.recallInput}
                    value={recalledText}
                    onChange={(e) => setRecalledText(e.target.value)}
                    placeholder="Write everything you remember about this concept..."
                    rows={6}
                    autoFocus
                />

                <div className={styles.confidenceSection}>
                    <label>How confident are you?</label>
                    <div className={styles.confidenceButtons}>
                        {[1, 2, 3, 4, 5].map((level) => (
                            <button
                                key={level}
                                className={`${styles.confidenceBtn} ${confidence === level ? styles.active : ''}`}
                                onClick={() => setConfidence(level)}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

                <button className={styles.submitButton} onClick={handleSubmit}>
                    <span>Submit & Continue</span>
                    <ChevronRight size={20} />
                </button>
            </div>
        </motion.div>
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

                {/* Technical Details */}
                {concept.technicalDetails && (
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
    keyPoints: string[];
    onComplete: (correct: boolean, timeSpent: number) => void;
}

/**
 * Verify Phase: Quick check question
 */
function VerifyPhase({ concept, keyPoints, onComplete }: VerifyPhaseProps) {
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [startTime] = useState(Date.now());

    // Generate a simple verification question
    const question = useMemo(() => {
        const randomPoint = keyPoints[Math.floor(Math.random() * keyPoints.length)];
        return {
            question: `Which statement best describes a key aspect of ${concept.name}?`,
            correct: randomPoint,
            options: [
                randomPoint,
                `The process of reversing ${concept.name}`,
                `An alternative to ${concept.name}`,
                `A deprecated version of ${concept.name}`,
            ].sort(() => Math.random() - 0.5),
        };
    }, [concept.name, keyPoints]);

    const correctIndex = question.options.indexOf(question.correct);

    const handleSubmit = () => {
        const timeSpent = (Date.now() - startTime) / 1000;
        const isCorrect = selectedAnswer === correctIndex;
        onComplete(isCorrect, timeSpent);
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
                    {question.options.map((option, idx) => (
                        <button
                            key={idx}
                            className={`${styles.optionButton} ${selectedAnswer === idx ? styles.selected : ''}`}
                            onClick={() => setSelectedAnswer(idx)}
                        >
                            <span className={styles.optionLetter}>
                                {String.fromCharCode(65 + idx)}
                            </span>
                            <span className={styles.optionText}>{option}</span>
                        </button>
                    ))}
                </div>

                <button
                    className={styles.submitButton}
                    onClick={handleSubmit}
                    disabled={selectedAnswer === null}
                >
                    <span>Verify Answer</span>
                    <ChevronRight size={20} />
                </button>
            </div>
        </motion.div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MicroLearningLoopController({
    concept,
    complexityScore,
    userVelocity = 1.0,
    onLoopComplete,
    onSkip,
}: MicroLearningLoopProps) {
    const [phase, setPhase] = useState<LoopPhase>('test');
    const [testResult, setTestResult] = useState<TestPhaseResult | null>(null);
    const [totalTimeSpent, setTotalTimeSpent] = useState(0);

    const { recordInteraction } = useLearningStore();

    // Calculate adaptive timing
    const loopDuration = useMemo(() =>
        calculateLoopDuration(complexityScore, userVelocity),
        [complexityScore, userVelocity]
    );

    // Extract key points from concept
    const keyPoints = useMemo(() => {
        const points: string[] = [];
        if (concept.hookSentence) points.push(concept.hookSentence);
        if (concept.whyYouNeed) points.push(concept.whyYouNeed);
        if (concept.howToUse && concept.howToUse.length > 0) {
            points.push(...concept.howToUse.slice(0, 2));
        }
        if (concept.technicalDetails) points.push(concept.technicalDetails);
        return points.slice(0, 5); // Max 5 key points
    }, [concept]);

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

    const handleVerifyComplete = useCallback((correct: boolean, timeSpent: number) => {
        const finalTimeSpent = totalTimeSpent + timeSpent;
        setTotalTimeSpent(finalTimeSpent);

        // Record the interaction for cognitive metrics
        recordInteraction(correct, timeSpent * 1000);

        if (testResult) {
            const outcome = determineOutcome(testResult, { correct, timeSpent });
            onLoopComplete(outcome, finalTimeSpent);
        }
    }, [testResult, totalTimeSpent, onLoopComplete, recordInteraction]);

    return (
        <div className={styles.container}>
            {/* Phase indicator */}
            <div className={styles.phaseIndicator}>
                <div className={`${styles.phaseStep} ${phase === 'test' ? styles.active : ''} ${testResult ? styles.complete : ''}`}>
                    <Brain size={18} />
                    <span>Test</span>
                </div>
                <div className={styles.phaseLine} />
                <div className={`${styles.phaseStep} ${phase === 'learn' ? styles.active : ''} ${phase === 'verify' ? styles.complete : ''}`}>
                    <BookOpen size={18} />
                    <span>Learn</span>
                </div>
                <div className={styles.phaseLine} />
                <div className={`${styles.phaseStep} ${phase === 'verify' ? styles.active : ''}`}>
                    <CheckCircle2 size={18} />
                    <span>Verify</span>
                </div>
            </div>

            {/* Loop timing info and Cognitive Gauge */}
            <div className={styles.loopInfo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={16} />
                    <span>Target: {Math.round(loopDuration / 60)}min loop</span>
                </div>
                <span className={styles.separator}>•</span>
                <span>Complexity: {complexityScore}/10</span>
                <span className={styles.separator}>•</span>
                {/* Embedded Cognitive Gauge - Active monitoring during learning */}
                <CognitiveGauge compact />
            </div>

            {/* Phase content */}
            <AnimatePresence mode="wait">
                {phase === 'test' && (
                    <TestPhase
                        key="test"
                        concept={concept}
                        keyPoints={keyPoints}
                        timeLimit={Math.round(loopDuration * 0.4)} // 40% of loop for test
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
                        keyPoints={keyPoints}
                        onComplete={handleVerifyComplete}
                    />
                )}
            </AnimatePresence>

            {/* Skip button */}
            <button className={styles.skipButton} onClick={onSkip}>
                <RotateCcw size={16} />
                Skip this concept
            </button>
        </div>
    );
}

export default MicroLearningLoopController;
