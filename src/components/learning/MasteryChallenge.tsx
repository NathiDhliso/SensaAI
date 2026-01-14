/**
 * MasteryChallenge Component — SENSA v2.0
 * 
 * Implements Step 5: Apply (Boss Battle + Flow Mode).
 * 
 * Modes:
 * - intro: Explains the challenge
 * - synthesis: Timed comprehensive scenario (10 min)
 * - flow-gate: Offer optional Flow Mode (if synthesis ≥ 70%)
 * - flow: Timed speed drills for fluency
 * - complete: Results and Q_f calculation
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    Clock,
    CheckCircle2,
    Zap,
    ArrowRight,
    SkipForward,
    Target,
    Timer
} from 'lucide-react';

import type { LearningConcept } from '@/lib/types/learning';
import type { MasteryChallengeResult } from '@/lib/types/sensa-flow.types';
import { UI_TIMINGS } from '@/constants/ui-constants';
import { DEFAULT_MASTERY_SCENARIO } from '@/constants/learning-content';
import { usePauseGlobalTimer } from '@/hooks';
import styles from './MasteryChallenge.module.css';

// ============================================================================ 
// Types
// ============================================================================

type ChallengeMode = 'intro' | 'synthesis' | 'flow-gate' | 'flow' | 'complete';

interface MasteryChallengeProps {
    concepts: LearningConcept[];
    onComplete: (result: MasteryChallengeResult) => void;
    onClose?: () => void; // Called when user clicks Continue after results
}

interface FlowDrill {
    id: string;
    conceptName: string;
    question: string;
    timeLimit: number; // seconds
}

// ============================================================================ 
// Constants
// ============================================================================

const FLOW_MODE_THRESHOLD = 0.7; // 70% synthesis score unlocks Flow Mode
const FLOW_DRILL_TIME = 15; // seconds per drill
const FLOW_DRILL_COUNT = 5;

// ============================================================================
// Helper Functions (Outside component)
// ============================================================================

function generateDrillQuestion(concept: LearningConcept): string {
    const templates = [
        `What is the primary purpose of ${concept.name}?`,
        `When would you use ${concept.name} vs an alternative?`,
        `What are the key prerequisites for ${concept.name}?`,
        `How does ${concept.name} fit in the overall architecture?`,
        `What's the first step to implement ${concept.name}?`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
}

// ============================================================================ 
// Component
// ============================================================================

export default function MasteryChallenge({
    concepts,
    onComplete,
    onClose
}: MasteryChallengeProps) {
    // Phase state
    const [mode, setMode] = useState<ChallengeMode>('intro');

    // Synthesis state
    const [synthesisTimeRemaining, setSynthesisTimeRemaining] = useState<number>(UI_TIMINGS.MASTERY_TIME_SECONDS);
    const [userResponse, setUserResponse] = useState('');
    const [synthesisScore, setSynthesisScore] = useState(0);

    // Flow Mode state
    const [flowDrills, setFlowDrills] = useState<FlowDrill[]>([]);
    const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
    const [drillTimeRemaining, setDrillTimeRemaining] = useState(FLOW_DRILL_TIME);
    const [drillAnswers, setDrillAnswers] = useState<string[]>([]);
    const [flowScore, setFlowScore] = useState(0);

    // Pause global focus session timer during challenge
    usePauseGlobalTimer();

    // ========================================================================
    // Score & Drill Logic (Declared before handlers)
    // ========================================================================

    const calculateSynthesisScore = useCallback((response: string, conceptList: LearningConcept[]): number => {
        if (!response || response.length < 50) return 0;

        let score = 0;
        const lengthScore = Math.min(response.length / 500, 0.4);
        score += lengthScore;

        const conceptsMentioned = conceptList.filter(c =>
            response.toLowerCase().includes(c.name.toLowerCase())
        ).length;
        const mentionScore = (conceptsMentioned / Math.min(conceptList.length, 5)) * 0.4;
        score += mentionScore;

        const hasStructure = response.includes('\n') || response.includes('1.') || response.includes('-');
        if (hasStructure) score += 0.2;

        return Math.min(score, 1);
    }, []);

    const calculateFlowScore = useCallback((ans: string[], drills: FlowDrill[]): number => {
        const answered = ans.filter(a => a.trim().length > 0).length;
        return answered / drills.length;
    }, []);

    const generateFlowDrills = useCallback((): FlowDrill[] => {
        return concepts.slice(0, FLOW_DRILL_COUNT).map((concept, idx) => ({
            id: `drill-${idx}`,
            conceptName: concept.name,
            question: generateDrillQuestion(concept),
            timeLimit: FLOW_DRILL_TIME
        }));
    }, [concepts]);

    // ========================================================================
    // Handlers
    // ========================================================================

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const completeChallenge = useCallback((synthesis: number, flowCompleted: boolean, flow: number) => {
        const Q_f = flowCompleted
            ? (synthesis * 0.6 + flow * 0.4) // Weighted: synthesis 60%, flow 40%
            : synthesis * 0.8; // Without flow, cap at 80% of synthesis

        setMode('complete');

        // Delay the callback slightly for animation
        setTimeout(() => {
            onComplete({
                passed: synthesis >= FLOW_MODE_THRESHOLD,
                synthesisScore: synthesis,
                flowModeCompleted: flowCompleted,
                Q_f
            });
        }, 500);
    }, [onComplete]);

    const handleSynthesisComplete = useCallback(() => {
        const score = calculateSynthesisScore(userResponse, concepts);
        setSynthesisScore(score);

        if (score >= FLOW_MODE_THRESHOLD) {
            setMode('flow-gate');
        } else {
            completeChallenge(score, false, 0);
        }
    }, [userResponse, concepts, calculateSynthesisScore, completeChallenge]);

    const handleDrillAnswer = useCallback((answer: string) => {
        setDrillAnswers(prev => {
            const newAnswers = [...prev, answer];

            if (currentDrillIndex < flowDrills.length - 1) {
                setCurrentDrillIndex(cur => cur + 1);
                setDrillTimeRemaining(FLOW_DRILL_TIME);
            } else {
                const score = calculateFlowScore(newAnswers, flowDrills);
                setFlowScore(score);
                completeChallenge(synthesisScore, true, score);
            }
            return newAnswers;
        });
    }, [currentDrillIndex, flowDrills, synthesisScore, calculateFlowScore, completeChallenge]);

    const handleDrillTimeout = useCallback(() => {
        handleDrillAnswer('');
    }, [handleDrillAnswer]);

    const handleStartChallenge = useCallback(() => {
        setMode('synthesis');
    }, []);

    const handleSynthesisSubmit = useCallback(() => {
        handleSynthesisComplete();
    }, [handleSynthesisComplete]);

    const handleAcceptFlowMode = useCallback(() => {
        const drills = generateFlowDrills();
        setFlowDrills(drills);
        setCurrentDrillIndex(0);
        setDrillTimeRemaining(FLOW_DRILL_TIME);
        setDrillAnswers([]);
        setMode('flow');
    }, [generateFlowDrills]);

    const handleSkipFlowMode = useCallback(() => {
        completeChallenge(synthesisScore, false, 0);
    }, [synthesisScore, completeChallenge]);

    // ========================================================================
    // Timer Effects
    // ========================================================================

    useEffect(() => {
        if (mode !== 'synthesis') return;

        const interval = setInterval(() => {
            setSynthesisTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    handleSynthesisComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [mode, handleSynthesisComplete]);

    useEffect(() => {
        if (mode !== 'flow') return;

        const interval = setInterval(() => {
            setDrillTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    handleDrillTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [mode, currentDrillIndex, handleDrillTimeout]);

    // ========================================================================
    // Scenario Generation
    // Present concepts in a NEW domain to challenge transfer learning
    // ========================================================================

    const CONTEXT_SWAP_DOMAINS = [
        { name: 'Restaurant Kitchen', icon: '👨‍🍳', frame: 'running a busy restaurant kitchen where' },
        { name: 'Sports Team', icon: '⚽', frame: 'coaching a championship sports team where' },
        { name: 'Music Production', icon: '🎵', frame: 'producing a hit album in a recording studio where' },
        { name: 'City Planning', icon: '🏙️', frame: 'designing a sustainable smart city where' },
        { name: 'Healthcare', icon: '🏥', frame: 'managing a hospital emergency room where' },
    ];

    // Select a random domain based on concept hash for consistency
    const domainHash = concepts.reduce((acc, c) => acc + c.name.charCodeAt(0), 0);
    const selectedDomain = CONTEXT_SWAP_DOMAINS[domainHash % CONTEXT_SWAP_DOMAINS.length];

    const conceptNames = concepts.slice(0, 3).map(c => c.name).join(', ');
    const scenario = concepts.length > 0
        ? `**🔄 Context-Swap Challenge**

You're ${selectedDomain.frame} the principles from your studies apply in surprising ways.

${selectedDomain.icon} **Scenario: ${selectedDomain.name}**

Take the concepts of ${conceptNames}${concepts.length > 3 ? ', and more' : ''} and explain how they would work in this ${selectedDomain.name.toLowerCase()} context.

**Requirements:**
1. 🔗 Describe how each concept translates to this new domain
2. ⚡ Explain the relationships—what's the "foundation" and what's the "keystone"?
3. ⚠️ What would "failure" look like if these principles were ignored?
4. 🎯 Give a concrete step-by-step example using terminology from BOTH domains

**Your Context-Swapped Response:**`
        : DEFAULT_MASTERY_SCENARIO;

    // ========================================================================
    // Render Functions
    // ========================================================================

    const renderIntro = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.introContainer}
        >
            <div className={styles.infoCard}>
                <h3>What to Expect</h3>
                <ul>
                    <li>A complex, real-world scenario requiring multiple concepts</li>
                    <li>10 minutes to craft your response (synthesis challenge)</li>
                    <li>Optional Flow Mode: Speed drills to prove fluency</li>
                    <li>Your Q_f (fluency score) affects final mastery</li>
                </ul>
            </div>

            <div className={styles.flowModePreview}>
                <Zap size={20} />
                <div>
                    <strong>Flow Mode Unlocks at 70%</strong>
                    <p>Score well on synthesis to access timed speed drills</p>
                </div>
            </div>

            <button
                className={styles.startButton}
                onClick={handleStartChallenge}
            >
                Begin Challenge
                <Trophy size={20} />
            </button>
        </motion.div>
    );

    const renderSynthesis = () => (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.challengeContainer}
        >
            <div className={styles.scenarioCard}>
                <pre>{scenario}</pre>
            </div>

            <textarea
                className={styles.textarea}
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                placeholder="Type your comprehensive response here..."
            />

            <div className={styles.synthesisFooter}>
                <span className={styles.wordCount}>
                    {userResponse.length} characters
                </span>
                <button
                    className={styles.submitButton}
                    onClick={handleSynthesisSubmit}
                    disabled={userResponse.length < 100}
                >
                    Submit Response
                    <CheckCircle2 size={16} />
                </button>
            </div>
        </motion.div>
    );

    const renderFlowGate = () => (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={styles.flowGateContainer}
        >
            <div className={styles.flowGateIcon}>
                <Zap size={48} />
            </div>

            <h2>Flow Mode Unlocked!</h2>
            <p className={styles.flowGateScore}>
                Synthesis Score: <strong>{Math.round(synthesisScore * 100)}%</strong>
            </p>

            <div className={styles.flowGateInfo}>
                <Target size={20} />
                <div>
                    <strong>Optional Speed Drills</strong>
                    <p>{FLOW_DRILL_COUNT} rapid-fire questions, {FLOW_DRILL_TIME}s each</p>
                    <p>Boost your Q_f fluency score by up to 40%</p>
                </div>
            </div>

            <div className={styles.flowGateActions}>
                <button className={styles.skipButton} onClick={handleSkipFlowMode}>
                    <SkipForward size={16} />
                    Skip Flow Mode
                </button>
                <button className={styles.acceptButton} onClick={handleAcceptFlowMode}>
                    <Zap size={16} />
                    Enter Flow Mode
                </button>
            </div>
        </motion.div>
    );

    const renderFlowMode = () => {
        const currentDrill = flowDrills[currentDrillIndex];
        if (!currentDrill) return null;

        return (
            <motion.div
                key={currentDrillIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className={styles.flowModeContainer}
            >
                <div className={styles.flowHeader}>
                    <div className={styles.flowProgress}>
                        <span>Drill {currentDrillIndex + 1} of {flowDrills.length}</span>
                        <div className={styles.flowProgressBar}>
                            <div
                                className={styles.flowProgressFill}
                                style={{ width: `${((currentDrillIndex + 1) / flowDrills.length) * 100}%` }}
                            />
                        </div>
                    </div>
                    <div className={`${styles.drillTimer} ${drillTimeRemaining < 5 ? styles.warning : ''}`}>
                        <Timer size={16} />
                        <span>{drillTimeRemaining}s</span>
                    </div>
                </div>

                <div className={styles.drillCard}>
                    <span className={styles.drillConcept}>{currentDrill.conceptName}</span>
                    <p className={styles.drillQuestion}>{currentDrill.question}</p>
                </div>

                <div className={styles.drillAnswerGrid}>
                    <button
                        className={styles.drillAnswer}
                        onClick={() => handleDrillAnswer('correct')}
                    >
                        I Know This
                        <CheckCircle2 size={16} />
                    </button>
                    <button
                        className={styles.drillAnswer}
                        onClick={() => handleDrillAnswer('partial')}
                    >
                        Partially
                    </button>
                    <button
                        className={styles.drillAnswer}
                        onClick={() => handleDrillAnswer('')}
                    >
                        Skip
                        <ArrowRight size={16} />
                    </button>
                </div>
            </motion.div>
        );
    };

    const renderComplete = () => {
        const passed = synthesisScore >= FLOW_MODE_THRESHOLD;
        const finalQf = flowScore > 0
            ? (synthesisScore * 0.6 + flowScore * 0.4)
            : synthesisScore * 0.8;

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={styles.completeContainer}
            >
                <div className={styles.celebrationCard}>
                    <Trophy
                        size={48}
                        className={`${styles.celebrationIcon} ${passed ? styles.passed : styles.failed}`}
                    />
                    <h2>{passed ? 'Challenge Complete!' : 'Keep Practicing!'}</h2>
                </div>

                <div className={styles.scoreBreakdown}>
                    <div className={styles.scoreRow}>
                        <span>Synthesis Score</span>
                        <span className={styles.scoreValue}>{Math.round(synthesisScore * 100)}%</span>
                    </div>
                    {flowScore > 0 && (
                        <div className={styles.scoreRow}>
                            <span>Flow Mode Score</span>
                            <span className={styles.scoreValue}>{Math.round(flowScore * 100)}%</span>
                        </div>
                    )}
                    <div className={`${styles.scoreRow} ${styles.finalScore}`}>
                        <span>Final Q_f (Fluency)</span>
                        <span className={styles.scoreValue}>{Math.round(finalQf * 100)}%</span>
                    </div>
                </div>

                <p className={styles.resultMessage}>
                    {passed
                        ? 'You\'ve demonstrated strong mastery of these concepts.'
                        : 'Review the concepts and try again when you\'re ready.'}
                </p>

                <button
                    className={styles.continueButton}
                    onClick={() => onClose?.()}
                >
                    <CheckCircle2 size={20} />
                    Continue
                </button>
            </motion.div>
        );
    };

    // ========================================================================
    // Main Render
    // ========================================================================

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.headerIcon}>
                        {mode === 'flow' || mode === 'flow-gate' ? <Zap size={24} /> : <Trophy size={24} />}
                    </div>
                    <div>
                        <h2 className={styles.title}>
                            {mode === 'intro' && 'Step 5: Apply'}
                            {mode === 'synthesis' && 'Synthesis Challenge'}
                            {mode === 'flow-gate' && 'Flow Mode Unlocked'}
                            {mode === 'flow' && 'Flow Mode: Speed Drills'}
                            {mode === 'complete' && 'Challenge Complete'}
                        </h2>
                        <p className={styles.subtitle}>
                            {mode === 'intro' && 'Prove your mastery with a comprehensive challenge'}
                            {mode === 'synthesis' && 'Apply everything you\'ve learned'}
                            {mode === 'flow-gate' && 'Optional speed drills for bonus fluency'}
                            {mode === 'flow' && 'Answer quickly to boost your Q_f'}
                            {mode === 'complete' && 'Your fluency score has been calculated'}
                        </p>
                    </div>
                </div>

                {mode === 'synthesis' && (
                    <div className={`${styles.timerBadge} ${synthesisTimeRemaining < 60 ? styles.warning : ''}`}>
                        <Clock size={16} />
                        <span className={`${styles.timerText} ${synthesisTimeRemaining < 60 ? styles.warning : ''}`}>
                            {formatTime(synthesisTimeRemaining)}
                        </span>
                    </div>
                )}
            </div>

            <div className={styles.content}>
                <AnimatePresence mode="wait">
                    {mode === 'intro' && renderIntro()}
                    {mode === 'synthesis' && renderSynthesis()}
                    {mode === 'flow-gate' && renderFlowGate()}
                    {mode === 'flow' && renderFlowMode()}
                    {mode === 'complete' && renderComplete()}
                </AnimatePresence>
            </div>
        </div>
    );
}
