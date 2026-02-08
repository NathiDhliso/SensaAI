/**
 * Velocity Learning Page
 * 
 * Main entry point for the SensaAI Learning Velocity Engine.
 * Orchestrates the SENSA v2.0 5-Step Flow with Universal Learning Equation tracking.
 * I = min(h, G × Q_f × Q_M × Q_P)
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Brain, Home } from 'lucide-react';

import { useLearningStore } from '@/store/learning-store';
import { useLearningFlow } from '@/shared/hooks/useLearningFlow';
import { useSensaFlow } from '@/shared/hooks/useSensaFlow';
import { useFlowState } from '@/shared/hooks/useFlowState';
import { useStruggleDetector } from '@/shared/hooks/useStruggleDetector';
import { useCoachMessage } from '@/shared/hooks/useCoachMessage';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { loadSessionProgress, getProgressAge, cleanupExpiredProgress } from '@/features/learning-session/progress/session-tracker';
import { toast } from '@/shared/utils/toast';

import { MasteryDashboard } from '@/components/dashboard/MasteryDashboard';
import { BlueprintFormulaDashboard } from '@/components/dashboard/BlueprintFormulaDashboard';
import { EquationTracker } from '@/components/ui/EquationTracker';
import { FlowProgressBar } from '@/components/ui/FlowProgressBar';
import { ConceptProgressIndicator } from '@/components/ui/ConceptProgressIndicator';
import MomentumCheckpoint from '@/components/ui/MomentumCheckpoint';
import SessionTimeToast from '@/components/ui/SessionTimeToast';
import MicroLearningLoopController from '@/components/learning/MicroLearningLoopController';
import DiagnosticLaunchSystem from '@/components/learning/onboarding/DiagnosticLaunchSystem';
import VelocityLockInGate from '@/components/learning/session/VelocityLockInGate';
import { SessionScoutPreview } from '@/components/learning/session/SessionScoutPreview';
import ConceptMapBuilder from '@/components/learning/activities/ConceptMapBuilder';
import MasteryChallenge from '@/components/learning/activities/MasteryChallenge';
import SensaSynopticView from '@/components/learning/ui/SensaSynopticView';
import SkipReasonModal, { type SkipReasonData } from '@/components/learning/feedback/SkipReasonModal';
import PhaseNavigator from '@/components/learning/ui/PhaseNavigator';
import { LearningToolbar } from '@/components/learning/LearningToolbar';

import type {
    LearningConcept
} from '@/shared/types/learning';
import type { SensaAILearningConcept } from '@/features/content-generation/parsers/transformer';
import styles from './VelocityLearning.module.css';

export default function VelocityLearning() {
    // 0. Navigation
    const navigate = useNavigate();

    // 1. Core State & Actions
    const {
        currentSession,
        studySession,
        startDiagnostic,
        completeDiagnostic,
        startStudySession,
        completeConcept,
        setCurrentConcept,
        getNextConcept,
        startSession,
        markSessionMapBuilt,
        markSessionMapReconstructed,
        markSessionMastered,
        returnToMapBuilding,
        clearSession,
    } = useLearningStore();



    type DiagnosticResults = {
        knownConcepts: string[];
        knowledgeGaps: string[];
        confidenceScores: Record<string, number>;
        canSkipFoundation: boolean;
    };

    // 2. The State Machine Hook (legacy - used for phase detection)
    const {
        currentPhase,
        activeConcept,
    } = useLearningFlow();

    // 2b. SENSA v2.0 Flow State Machine
    const sensaFlow = useSensaFlow();

    // 2c. Flow State Detection (Momentum Checkpoints)
    const flowState = useFlowState();

    // 2d. Struggle Detection + Coach Messages
    const { showMessage: showCoachMessage } = useCoachMessage();
    useStruggleDetector({
        idleThresholdSeconds: 60,
        errorThreshold: 2,
        backspaceThreshold: 30,
        onStruggleChange: (state) => {
            if (state.isStruggling && state.confidence > 0.5 && currentPhase === 'LEARN') {
                showCoachMessage('build', 'struggle', 10000);
            }
        },
    });

    // 2e. Initialize G baseline from subject classification
    useEffect(() => {
        if (currentSession?.subjectType) {
            const confidence = currentSession.macroWorkflow?.classification?.confidence;
            sensaFlow.initializeFromClassification(currentSession.subjectType, confidence);
        }
    }, [currentSession?.subjectType]);

    // 3. Local UI State (MUST be declared before useEffects that reference them)
    const [lockedIn, setLockedIn] = useState(false);
    const [completedPhases, setCompletedPhases] = useState<Set<string>>(new Set());

    // ARCHITECT ENHANCEMENT: Skip Diagnostics
    const [showSkipModal, setShowSkipModal] = useState(false);
    const [pendingSkipConcept, setPendingSkipConcept] = useState<string | null>(null);
    const [showTimeToast, setShowTimeToast] = useState(false);
    const [showCheckpoint, setShowCheckpoint] = useState(false);
    const [timeToastDismissed, setTimeToastDismissed] = useState(false);

    // Sync SENSA flow state from persisted study session on mount/change
    useEffect(() => {
        if (studySession) {
            sensaFlow.syncFromStore(studySession);
        }
    }, [studySession, sensaFlow]);

    // Progress Recovery: Restore from localStorage on mount
    useEffect(() => {
        if (!currentSession) return;

        // Clean up expired progress on mount
        cleanupExpiredProgress();

        // Try to load saved progress
        const savedProgress = loadSessionProgress(currentSession.id);
        if (savedProgress) {
            const age = getProgressAge(currentSession.id);

            // Restore progress if it matches current session
            if (savedProgress.subjectId === currentSession.subjectId) {
                // Update store with saved progress
                const { updateSessionProgress, setCurrentConcept } = useLearningStore.getState();
                updateSessionProgress(savedProgress.progress);

                // Restore active concept if available
                if (savedProgress.activeConcept) {
                    setCurrentConcept(savedProgress.activeConcept);
                }

                // Show toast notification
                toast.success(`Resumed from where you left off (${age})`, { duration: 4000 });
            }
        }
    }, [currentSession?.id]); // Only run when session ID changes

    useEffect(() => {
        if (currentPhase === 'PRIME' && lockedIn) {
            const timer = setTimeout(() => {
                const goal = studySession?.goal ?? ('learn-new' as const);
                const duration = studySession?.targetDuration ?? 30;
                startStudySession(goal, duration, [currentSession!.concepts[0].id]);
            }, UI_TIMINGS.DELAY_SHORT);
            return () => clearTimeout(timer);
        }
    }, [currentPhase, lockedIn, startStudySession, currentSession]);

    // Momentum Checkpoint: Show time toast when goal exceeded
    useEffect(() => {
        if (flowState.timeGoalExceeded && !timeToastDismissed && !flowState.isInFlow) {
            setShowTimeToast(true);
        }
    }, [flowState.timeGoalExceeded, timeToastDismissed, flowState.isInFlow]);

    // 4. Effects
    // Initialize session timer
    useEffect(() => {
        if (currentSession && !currentSession.progress.sessionStartTime) {
            startSession();
        }
    }, [currentSession, startSession]);

    // Auto-start diagnostic if needed
    useEffect(() => {
        if (currentPhase === 'DIAGNOSE') {
            startDiagnostic();
        }
    }, [currentPhase, startDiagnostic]);

    const unmountRef = useRef({ currentSession, currentPhase, getNextConcept });
    useEffect(() => {
        unmountRef.current = { currentSession, currentPhase, getNextConcept };
    });

    useEffect(() => {
        return () => {
            const { currentSession: session, currentPhase: phase, getNextConcept: getNext } = unmountRef.current;
            if (!session) return;
            const { progress } = session;
            const nextConcept = getNext();
            try {
                import('@/features/learning-session/progress/session-tracker').then(({ flushSessionProgress }) => {
                    flushSessionProgress({
                        sessionId: session.id,
                        subjectId: session.subjectId,
                        progress,
                        currentPhase: phase || 'IDLE',
                        activeConcept: nextConcept,
                    });
                });
            } catch (_) { /* non-critical */ }
        };
    }, []);

    // 5. Handlers
    const handleLoopComplete = (outcome: 'mastered' | 'needs-learning' | 'needs-review', _timeSpent: number) => {
        if (!activeConcept) return;

        // "Sonic Boom" Effect for Mastery
        if (outcome === 'mastered') {
            try {
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance('Excellent! Concept mastered.');
                    utterance.rate = 1.1;
                    utterance.volume = 0.6;
                    window.speechSynthesis.speak(utterance);
                }
            } catch (_) { }
        }

        // Pass score and outcome to completeConcept for attempt tracking
        // Score is derived from outcome for now (can be enhanced later)
        const score = outcome === 'mastered' ? 1.0 : outcome === 'needs-review' ? 0.6 : 0.3;
        completeConcept(activeConcept.id, score, outcome);

        // Check if all concepts are now completed
        if (currentSession && studySession) {
            const completedCount = currentSession.progress.completedConcepts.length + 1; // +1 for the one we just completed
            const totalCount = currentSession.concepts.length;

            // If all concepts completed, mark map as reconstructed to trigger MASTER phase
            if (completedCount >= totalCount && !studySession.mapReconstructed) {
                console.log('[VelocityLearning] All concepts completed, transitioning to MASTER phase');
                markSessionMapReconstructed(true);
                // Update SENSA flow
                sensaFlow.completeStudy(1.0); // Full reconstruction score
            }
        }

        if (currentSession?.subjectType) {
            const progress = currentSession.progress;
            const metrics = currentSession.cognitiveMetrics;
            sensaFlow.updateTypeAwareMetrics({
                completedConcepts: progress.completedConcepts.length + 1,
                totalConcepts: currentSession.concepts.length,
                consecutiveCorrect: metrics.consecutiveCorrect,
                consecutiveErrors: metrics.consecutiveErrors,
                avgResponseTimeMs: metrics.avgResponseTimeMs,
                mapNodeCount: studySession?.conceptMap?.nodes?.length ?? 0,
                mapConnectionCount: studySession?.conceptMap?.connections?.length ?? 0,
                guessCount: Object.keys(studySession?.predictions ?? {}).length,
                cycleCompletions: progress.completedConcepts.length,
                blankSheetScore: score,
                quizAccuracy: score,
                timeSpentMs: progress.sessionStartTime ? Date.now() - progress.sessionStartTime : 0,
                targetDurationMs: (studySession?.targetDuration ?? 30) * 60000,
            });
        }
    };

    // ARCHITECT ENHANCEMENT: Diagnostic Skip with Reason Capture
    const handleSkipConcept = () => {
        // Get the current concept name before showing modal
        const currentConceptId = activeConcept?.id || '';
        setPendingSkipConcept(currentConceptId);
        setShowSkipModal(true);
    };

    const handleSkipReasonConfirm = (data: SkipReasonData) => {
        setShowSkipModal(false);

        if (data.reason === 'too-easy') {
            if (pendingSkipConcept) {
                completeConcept(pendingSkipConcept, 0.85, 'mastered');
            }
            toast.success('Marked as known — it may reappear in mastery challenges', { duration: 3000 });
            const nextId = getNextConcept();
            if (nextId) setCurrentConcept(nextId);
        } else if (data.reason === 'too-hard') {
            const foundationConcept = currentSession?.concepts.find(
                c => c.tier === 'foundation' && !currentSession.progress.completedConcepts.includes(c.id) && c.id !== pendingSkipConcept
            );
            if (foundationConcept) {
                setCurrentConcept(foundationConcept.id);
                toast.info(`Routing to prerequisite: ${foundationConcept.name}`, { duration: 4000 });
            } else {
                const nextId = getNextConcept();
                if (nextId) setCurrentConcept(nextId);
            }
        } else {
            const nextId = getNextConcept();
            if (nextId) setCurrentConcept(nextId);
        }

        setPendingSkipConcept(null);
    };

    const handleSkipReasonCancel = () => {
        setShowSkipModal(false);
        setPendingSkipConcept(null);
    };

    const handleDiagnosticComplete = (results: DiagnosticResults) => {
        completeDiagnostic(results);
    };

    // Navigation Handlers (Dead-End Fixes)
    const handleReturnToDashboard = () => {
        // Critical: Clear session state to prevent zombie sessions
        clearSession();
        navigate('/');
    };

    // Return to concept map from micro-learning loop (SENSA v2.0 flow)
    const handleReturnToMap = () => {
        // Transition back to 'note' phase (concept map building)
        // This allows user to revise connections if they realize misunderstanding
        returnToMapBuilding();
    };

    const handleGoToLibrary = () => {
        navigate('/');
    };

    // 6. Rendering Logic

    // Hydration grace period: Wait briefly for parent Study.tsx to hydrate before showing empty state
    const [isInitializing, setIsInitializing] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setIsInitializing(false), UI_TIMINGS.DELAY_SHORT);
        return () => clearTimeout(timer);
    }, []);

    // IDLE State or waiting for hydration
    if (currentPhase === 'IDLE' || !currentSession) {
        // During first 500ms, show loading instead of empty state
        if (isInitializing) {
            return (
                <div className={styles.container}>
                    <div className={styles.emptyState}>
                        <Brain size={48} className={styles.emptyIcon} style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                        <p>Loading session...</p>
                    </div>
                </div>
            );
        }
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <AlertCircle size={48} className={styles.emptyIcon} />
                    <h2>No Active Learning Session</h2>
                    <p>Please generate or load content from the Home screen to begin.</p>
                    <button
                        onClick={handleGoToLibrary}
                        className={styles.primaryButton}
                        aria-label="Go to library to generate or load content"
                    >
                        <Home size={20} />
                        Go to Library
                    </button>
                </div>
            </div>
        );
    }

    // GATE State: Lock In (Before Prime)
    // If we are in PRIME phase but local 'lockedIn' is false, show gate.
    // Note: Once session starts, 'PRIME' phase might stick around until 'primer' is set in store.
    // But store action startStudySession sets session active. useLearningFlow returns PRIME if !studySession.
    // So: switch(currentPhase) 'PRIME' -> check lockedIn.

    const cognitiveLoadLevel = useLearningStore.getState().getCognitiveLoadLevel();
    const cognitiveLoad = { low: 0.2, optimal: 0.5, high: 0.75, overload: 1.0 }[cognitiveLoadLevel];

    return (
        <div className={styles.container} style={{ '--cognitive-load': cognitiveLoad } as React.CSSProperties}>
            <main className={styles.content}>
                <div className={styles.mainArea}>

                    {/* Learning Toolbar - Stats, Quiz, Timer, Reset */}
                    {currentSession && (
                        <LearningToolbar />
                    )}

                    {/* Phase Navigator - Hidden in Explore Mode */}
                    {currentSession && studySession?.goal !== 'explore' && (
                        <PhaseNavigator
                            currentPhase={currentPhase}
                            completedPhases={Array.from(completedPhases) as any}
                        />
                    )}

                    {/* Explore Mode: Calming Header (replaces PhaseNavigator) */}
                    {studySession?.goal === 'explore' && (
                        <motion.div
                            className={styles.exploreHeader}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                        >
                            <span className={styles.exploreTagline}>Breathe. Browse. No pressure.</span>
                        </motion.div>
                    )}

                    {/* SENSA v2.0: Equation Tracker - Hide in Explore Mode */}
                    {studySession?.goal !== 'explore' && (
                        <>
                            {/* Concept Progress Indicator - Shows "Concept X of Y" */}
                            {currentSession && currentPhase === 'LEARN' && (
                                <ConceptProgressIndicator
                                    current={currentSession.progress.completedConcepts.length + 1}
                                    total={currentSession.concepts.length}
                                    compact={true}
                                />
                            )}

                            <EquationTracker
                                G={sensaFlow.G}
                                Q_P={sensaFlow.Q_P}
                                Q_M={sensaFlow.Q_M}
                                Q_f={sensaFlow.Q_f}
                                I={sensaFlow.I}
                                weakestVariable={sensaFlow.weakestVariable.variable}
                                compact={true}
                                currentPhase={sensaFlow.phase}
                                onSuggestBacktrack={() => {
                                    // Navigate back to Explore phase if Q_P is critically low
                                    sensaFlow.setPhase('explore');
                                }}
                            />

                            {/* SENSA v2.0: Flow Progress Bar with Sub-Progress */}
                            <FlowProgressBar
                                currentPhase={sensaFlow.phase}
                                completedPhases={sensaFlow.completedSteps}
                                compact={true}
                                subProgress={
                                    sensaFlow.phase === 'study' && currentSession
                                        ? currentSession.progress.completedConcepts.length / currentSession.concepts.length
                                        : 0
                                }
                            />

                            {currentSession?.subjectType && (
                                <BlueprintFormulaDashboard
                                    subjectType={sensaFlow.subjectType}
                                    G={sensaFlow.G}
                                    gBaseline={sensaFlow.gBaseline}
                                    Q_f={sensaFlow.Q_f}
                                    Q_M={sensaFlow.Q_M}
                                    Q_P={sensaFlow.Q_P}
                                    I={sensaFlow.I}
                                    phase={sensaFlow.phase}
                                    qLabels={sensaFlow.qLabels}
                                    typeAwareMetrics={sensaFlow.typeAwareMetrics}
                                    feedbackSignal={sensaFlow.feedbackSignal}
                                    recommendation={sensaFlow.recommendation}
                                    weakestVariable={sensaFlow.weakestVariable}
                                />
                            )}
                        </>
                    )}

                    {/* Main Content Switcher */}
                    <AnimatePresence mode="wait">
                        {renderPhaseContent()}
                    </AnimatePresence>
                </div>
            </main>

            <AnimatePresence>
                {showSkipModal && activeConcept && (
                    <SkipReasonModal
                        conceptName={activeConcept.name}
                        onConfirm={handleSkipReasonConfirm}
                        onCancel={handleSkipReasonCancel}
                    />
                )}
            </AnimatePresence>

            {/* Momentum Checkpoint System */}
            <AnimatePresence>
                {showTimeToast && (
                    <SessionTimeToast
                        targetMinutes={useLearningStore.getState().studySession?.targetDuration || 30}
                        onKeepGoing={() => {
                            setShowTimeToast(false);
                            setTimeToastDismissed(true);
                        }}
                        onTakeBreak={() => {
                            setShowTimeToast(false);
                            setTimeToastDismissed(true);
                            setShowCheckpoint(true);
                        }}
                        onDismiss={() => {
                            setShowTimeToast(false);
                            setTimeToastDismissed(true);
                        }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showCheckpoint && (
                    <MomentumCheckpoint
                        conceptsCompleted={useLearningStore.getState().studySession?.conceptsCompleted.length || 0}
                        timeSpentMinutes={Math.floor(flowState.sessionDurationMs / 60000)}
                        nextConcept={activeConcept || null}
                        streakCount={flowState.streakCount}
                        onContinue={() => {
                            setShowCheckpoint(false);
                        }}
                        onExit={() => {
                            setShowCheckpoint(false);
                            navigate(`/study/${currentSession?.id}?tab=overview`);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );

    function renderPhaseContent() {
        switch (currentPhase) {
            case 'PRIME':
                // Before showing the modal, we show the Gate if not locked in
                if (!lockedIn) {
                    return (
                        <motion.div key="gate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <VelocityLockInGate
                                subjectName={currentSession!.subject}
                                onConfirm={() => {
                                    setLockedIn(true);
                                    setCompletedPhases(prev => new Set(prev).add('PRIME'));
                                }}
                            />
                        </motion.div>
                    );
                }
                return null;

            case 'SCOUT':
            case 'PREVIEW':
                return (
                    <motion.div
                        key="scout-preview"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={styles.fullWidthContainer}
                    >
                        <SessionScoutPreview
                            concepts={currentSession!.concepts}
                            initialPhase={currentPhase === 'PREVIEW' ? 'sprint' : 'structure'}
                            onComplete={(guesses) => {
                                setCompletedPhases(prev => new Set(prev).add('SCOUT').add('PREVIEW'));
                                sensaFlow.completeExplore(guesses);
                            }}
                        />
                    </motion.div>
                );

            case 'BUILD':
                return (
                    <motion.div
                        key="map-builder"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={styles.fullWidthContainer}
                    >
                        <ConceptMapBuilder
                            concepts={currentSession!.concepts}
                            subjectName={currentSession!.subject}
                            onComplete={(data) => {
                                markSessionMapBuilt(data);
                                setCompletedPhases(prev => new Set(prev).add('BUILD'));
                                // SENSA v2.0: Update equation (Note phase)
                                sensaFlow.completeNote(data);
                            }}
                        />
                    </motion.div>
                );

            case 'DIAGNOSE':
                return (
                    <motion.div
                        key="diagnostic"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <DiagnosticLaunchSystem
                            concepts={currentSession!.concepts as unknown as SensaAILearningConcept[]}
                            domain={currentSession!.subject}
                            diagnosticReady={currentSession!.metadata?.diagnosticReady ?? false}
                            onStartLearning={() => {
                                startDiagnostic();
                                setCompletedPhases(prev => new Set(prev).add('DIAGNOSE'));
                            }}
                            onDiagnosticComplete={handleDiagnosticComplete}
                        />
                    </motion.div>
                );

            case 'LEARN':
                if (!activeConcept) return null; // Should not happen in LEARN state
                return (
                    <motion.div
                        key={`loop-${activeConcept.id}`}
                        layoutId="learning-focus-container"
                        className={styles.immersiveContainer}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                    >
                        <MicroLearningLoopController
                            key={activeConcept.id}
                            concept={activeConcept}
                            allConcepts={currentSession!.concepts}
                            complexityScore={(activeConcept as LearningConcept & { complexityScore?: number }).complexityScore || 5}
                            userVelocity={1.0}
                            subjectType={currentSession?.subjectType}
                            onLoopComplete={handleLoopComplete}
                            onSkip={handleSkipConcept}
                            onReturnToMap={handleReturnToMap}
                        />
                    </motion.div>
                );



            case 'MASTER':
                return (
                    <motion.div
                        key="mastery"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={styles.fullWidthContainer}
                    >
                        <MasteryChallenge
                            concepts={currentSession!.concepts}
                            onComplete={(passed) => {
                                markSessionMastered();
                                setCompletedPhases(prev => new Set(prev).add('MASTER'));
                                // SENSA v2.0: Update equation (Apply phase)
                                // passed boolean indicates overall success
                                sensaFlow.completeApply(
                                    passed ? 0.85 : 0.5, // synthesisScore
                                    passed, // flowModeCompleted
                                    passed ? 0.8 : 0.4 // Q_f estimate
                                );
                            }}
                        />
                    </motion.div>
                );

            case 'COMPLETE':
            default:
                // Check if user has actually completed any concepts
                const hasCompletedConcepts = (currentSession?.progress?.completedConcepts?.length ?? 0) > 0;
                const hasStartedSession = studySession !== null;

                // For explore mode (stressed users): Show calming browse experience
                if (studySession?.goal === 'explore') {
                    // Stressed Mode: Show "Sensa Synoptic View" (Mind Map)
                    return (
                        <SensaSynopticView
                            concepts={currentSession!.concepts}
                            subjectName={currentSession!.subject}
                        />
                    );
                }

                // Case 1: User hasn't started learning yet (no session, no completed concepts)
                if (!hasStartedSession && !hasCompletedConcepts) {
                    return (
                        <div className={styles.emptyState}>
                            <Brain size={48} className={styles.emptyIcon} />
                            <h2>Ready to Begin?</h2>
                            <p>Start your learning session to master {currentSession?.concepts.length || 0} concepts in {currentSession?.subject}.</p>
                            <div className={styles.buttonGroup}>
                                <button
                                    onClick={() => setLockedIn(true)}
                                    className={styles.primaryButton}
                                    aria-label="Start learning session"
                                >
                                    <Brain size={20} />
                                    Start Learning
                                </button>
                                <button
                                    onClick={handleReturnToDashboard}
                                    className={styles.secondaryButton}
                                    aria-label="Return to dashboard"
                                >
                                    <Home size={20} />
                                    Back to Dashboard
                                </button>
                            </div>
                        </div>
                    );
                }

                if (hasCompletedConcepts) {
                    return (
                        <MasteryDashboard
                            concepts={currentSession!.concepts}
                            completedConcepts={currentSession!.progress.completedConcepts}
                            subjectName={currentSession!.subject}
                            sessionStartTime={currentSession!.progress.sessionStartTime || Date.now()}
                            equation={{
                                G: sensaFlow.G,
                                Q_f: sensaFlow.Q_f,
                                Q_M: sensaFlow.Q_M,
                                Q_P: sensaFlow.Q_P,
                                I: sensaFlow.I,
                                phase: sensaFlow.phase,
                            }}
                            streakCount={flowState.streakCount}
                            onReturnHome={handleReturnToDashboard}
                            onReviewConcepts={() => navigate(`/study/${currentSession?.id}?tab=overview`)}
                        />
                    );
                }

                // Case 3: Fallback - All caught up (shouldn't normally reach here)
                return (
                    <div className={styles.emptyState}>
                        <Brain size={48} className={styles.emptyIcon} />
                        <h2>All Caught Up!</h2>
                        <p>You've completed all available concepts for now.</p>
                        <div className={styles.buttonGroup}>
                            <button
                                onClick={handleReturnToDashboard}
                                className={styles.primaryButton}
                                aria-label="Return to dashboard"
                            >
                                <Home size={20} />
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                );
        }
    }
}
