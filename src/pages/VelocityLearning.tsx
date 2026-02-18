/**
 * Velocity Learning Page
 *
 * Main entry point for the SensaAI Learning Velocity Engine.
 * Orchestrates the SENSA v2.0 5-Step Flow with Universal Learning Equation tracking.
 * I = min(h, Q_k × Q_r × Q_c × Q_f × Q_p)
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Brain, Home } from 'lucide-react';
import { useSensaFlow } from '@/shared/hooks/useSensaFlow';
import { useLearningStore } from '@/store/learning-store';
import { useLearningFlow } from '@/shared/hooks/useLearningFlow';
import { useFlowState } from '@/shared/hooks/useFlowState';
import { useStruggleDetector } from '@/shared/hooks/useStruggleDetector';
import { useCoachMessage } from '@/shared/hooks/useCoachMessage';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { loadSessionProgress, getProgressAge, cleanupExpiredProgress } from '@/features/learning-session/progress/session-tracker';
import { toast } from '@/shared/utils/toast';
import { MasteryDashboard } from '@/components/dashboard/MasteryDashboard';
import { BlueprintFormulaDashboard } from '@/components/dashboard/BlueprintFormulaDashboard';
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
import OverviewMapView from '@/components/learning/overview/OverviewMapView';
import SkipReasonModal, { type SkipReasonData } from '@/components/learning/feedback/SkipReasonModal';
import PhaseNavigator from '@/components/learning/ui/PhaseNavigator';
import { LearningToolbar } from '@/components/learning/LearningToolbar';
import type { LearningConcept } from '@/shared/types/learning';
import type { SensaAILearningConcept } from '@/features/content-generation/parsers/transformer';
import CoachInterventionBanner, { type InterventionType } from '@/components/learning/ui/CoachInterventionBanner';
import ReviewContextPanel, { type ReviewContext } from '@/components/learning/ui/ReviewContextPanel';
import { getSpacingEngine } from '@/features/learning-session/algorithms/spacing-engine';
import { detectULC } from '@/features/content-generation/parsers/ulc-detector';
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
        markSessionMastered,
        returnToMapBuilding,
        clearSession,
        updateSessionEquation
    } = useLearningStore();

    type DiagnosticResults = {
        knownConcepts: string[];
        knowledgeGaps: string[];
        confidenceScores: Record<string, number>;
        canSkipTrunk: boolean;
    };

    // 2. The State Machine Hook (legacy - used for phase detection)
    const {
        currentPhase,
        completedPhases,
        activeConcept
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
                // Trigger intervention if struggle persists
                if (Math.random() > 0.7) setIntervention('low_verify');
            }
        }
    });

    // Initialize Subject Type & Mood
    const { initializeSubjectType, initializeH } = sensaFlow;
    useEffect(() => {
        if (currentSession?.subjectType) {
            initializeSubjectType(currentSession.subjectType);
        }
        if (studySession?.mood) {
            initializeH(studySession.mood);
        }
    }, [currentSession?.subjectType, studySession?.mood, initializeSubjectType, initializeH]);

    const selectionReason = useMemo(() => {
        if (!activeConcept || !currentSession) return null;
        const completed = currentSession.progress.completedConcepts;
        const tier = activeConcept.tier;

        if (tier === 'trunk' && completed.length < 3) return 'Building foundations first';
        if (tier === 'leaf') return 'Applying knowledge — leaf concept';

        const lastCompleted = completed[completed.length - 1];
        if (lastCompleted) {
            const lastConcept = currentSession.concepts.find(c => c.id === lastCompleted);
            if (lastConcept && lastConcept.tier !== tier) return `Interleaved from ${lastConcept.tier} ${tier}`;
        }

        if (tier === 'trunk') return 'Core concept — connecting ideas';
        return null;
    }, [activeConcept, currentSession]);

    // 3. Local UI State
    const [lockedIn, setLockedIn] = useState(() => {
        return localStorage.getItem('hasLockedIn') === 'true';
    });

    // ARCHITECT ENHANCEMENT: Skip Diagnostics
    const [showSkipModal, setShowSkipModal] = useState(false);
    const [pendingSkipConcept, setPendingSkipConcept] = useState<string | null>(null);
    const [showTimeToast, setShowTimeToast] = useState(false);
    const [showCheckpoint, setShowCheckpoint] = useState(false);
    const [timeToastDismissed, setTimeToastDismissed] = useState(false);

    // ENHANCEMENT D: Coach Intervention State
    const [intervention, setIntervention] = useState<InterventionType | null>(null);

    // ENHANCEMENT A: ReviewContext State
    const [reviewContext, setReviewContext] = useState<ReviewContext | null>(null);

    const [showHealthPanel, setShowHealthPanel] = useState(false);

    const syncingFromStoreRef = useRef(false);

    useEffect(() => {
        if (studySession) {
            syncingFromStoreRef.current = true;
            sensaFlow.syncFromStore(studySession);
            requestAnimationFrame(() => { syncingFromStoreRef.current = false; });
        }
    }, [studySession]);

    useEffect(() => {
        if (!studySession) return;
        if (syncingFromStoreRef.current) return;
        if (sensaFlow.Q_k === 0 && sensaFlow.Q_r === 0 && sensaFlow.Q_c === 0 && sensaFlow.Q_f === 0 && sensaFlow.Q_p === 0) return;

        const current = studySession.equation;
        if (
            current &&
            current.h === sensaFlow.h &&
            current.Q_k === sensaFlow.Q_k &&
            current.Q_r === sensaFlow.Q_r &&
            current.Q_c === sensaFlow.Q_c &&
            current.Q_f === sensaFlow.Q_f &&
            current.Q_p === sensaFlow.Q_p &&
            current.I === sensaFlow.I
        ) return;

        updateSessionEquation({
            h: sensaFlow.h,
            Q_k: sensaFlow.Q_k,
            Q_r: sensaFlow.Q_r,
            Q_c: sensaFlow.Q_c,
            Q_f: sensaFlow.Q_f,
            Q_p: sensaFlow.Q_p,
            I: sensaFlow.I
        });
    }, [sensaFlow.h, sensaFlow.Q_k, sensaFlow.Q_r, sensaFlow.Q_c, sensaFlow.Q_f, sensaFlow.Q_p, sensaFlow.I, studySession, updateSessionEquation]);

    const progressRestoredRef = useRef(false);
    useEffect(() => {
        if (!currentSession || progressRestoredRef.current) return;
        progressRestoredRef.current = true;
        cleanupExpiredProgress();
        const savedProgress = loadSessionProgress(currentSession.id);
        if (savedProgress) {
            const age = getProgressAge(currentSession.id);
            if (savedProgress.subjectId === currentSession.subjectId) {
                const { updateSessionProgress, setCurrentConcept } = useLearningStore.getState();
                updateSessionProgress(savedProgress.progress);
                if (savedProgress.activeConcept) {
                    setCurrentConcept(savedProgress.activeConcept);
                }
                toast.success(`Resumed from where you left off (${age})`, { duration: 4000 });
            }
        }
    }, [currentSession?.id]);

    useEffect(() => {
        if (currentPhase === 'PRIME' && lockedIn) {
            localStorage.setItem('hasLockedIn', 'true');
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

    // Initialize session timer
    useEffect(() => {
        if (currentSession && !currentSession.progress.sessionStartTime) {
            startSession();
        }
    }, [currentSession, startSession]);

    // Update Review Context when active concept changes
    useEffect(() => {
        if (activeConcept) {
            const spacing = getSpacingEngine();
            const review = spacing.getReview(activeConcept.id);
            if (review) {
                setReviewContext({
                    lastReviewDate: review.lastReviewDate,
                    decayStatus: spacing.getDecayStatus(activeConcept.id),
                    previousResponse: undefined,
                    failedQuestion: undefined
                });
            } else {
                setReviewContext({ decayStatus: 'fresh' });
            }
        } else {
            setReviewContext(null);
        }
    }, [activeConcept]);

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
                        activeConcept: nextConcept
                    });
                });
            } catch (_) { /* non-critical */ }
        };
    }, []);

    // 5. Handlers
    const handleLoopComplete = (outcome: 'mastered' | 'needs-learning' | 'needs-review', _timeSpent: number) => {
        if (!activeConcept) return;

        const score = outcome === 'mastered' ? 1.0 : outcome === 'needs-review' ? 0.6 : 0.3;
        completeConcept(activeConcept.id, score, outcome);

        setTimeout(() => {
            const { lastSpacingUpdate } = useLearningStore.getState();
            if (lastSpacingUpdate) {
                const qualityLabels: Record<number, string> = { 5: 'Perfect', 4: 'Good', 3: 'Okay', 2: 'Weak', 1: 'Missed', 0: 'Blank' };
                const label = qualityLabels[lastSpacingUpdate.quality] || 'Recorded';
                toast.info(
                    `${label} recall next review in ${lastSpacingUpdate.intervalDays}d`,
                    { duration: 3500 }
                );
            }
        }, 500);

        if (currentSession?.subjectType) {
            const progress = currentSession.progress;
            const metrics = currentSession.cognitiveMetrics;

            // Process signals for 5 learner variables
            sensaFlow.updateLearnerMetrics({
                completedConcepts: progress.completedConcepts.length + 1,
                totalConcepts: currentSession.concepts.length,

                // Q_p signals
                consecutiveCorrect: metrics.consecutiveCorrect,
                consecutiveErrors: metrics.consecutiveErrors,
                timeSpentMs: progress.sessionStartTime ? Date.now() - progress.sessionStartTime : 0,
                targetDurationMs: (studySession?.targetDuration ?? 30) * 60000,
                cycleCompletions: progress.completedConcepts.length,

                // Q_r signals
                blankSheetScore: score,
                quizAccuracy: score,

                // Q_c signals
                mapNodeCount: studySession?.conceptMap?.nodes?.length ?? 0,
                mapConnectionCount: studySession?.conceptMap?.connections?.length ?? 0,

                // Q_k signals
                guessCount: Object.keys(studySession?.predictions ?? {}).length,

                // Q_f signals
                avgResponseTimeMs: metrics.avgResponseTimeMs
            });
        }
    };

    // ARCHITECT ENHANCEMENT: Diagnostic Skip with Reason Capture
    const handleSkipConcept = () => {
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
            const trunkConcept = currentSession?.concepts.find(
                c => c.tier === 'trunk' && !currentSession.progress.completedConcepts.includes(c.id) && c.id !== pendingSkipConcept
            );
            if (trunkConcept) {
                setCurrentConcept(trunkConcept.id);
                toast.info(`Routing to prerequisite: ${trunkConcept.name}`, { duration: 4000 });
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

    const handleReturnToDashboard = () => {
        clearSession();
        navigate('/');
    };

    const handleReturnToMap = () => {
        returnToMapBuilding();
    };

    const handleGoToLibrary = () => {
        navigate('/');
    };

    // 6. Rendering Logic
    const [isInitializing, setIsInitializing] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setIsInitializing(false), UI_TIMINGS.DELAY_SHORT);
        return () => clearTimeout(timer);
    }, []);

    if (currentPhase === 'IDLE' || !currentSession) {
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

    const cognitiveLoadLevel = useLearningStore.getState().getCognitiveLoadLevel();
    const cognitiveLoad = { low: 0.2, optimal: 0.5, high: 0.75, overload: 1.0 }[cognitiveLoadLevel];

    return (
        <div className={styles.container} style={{ '--cognitive-load': cognitiveLoad } as React.CSSProperties}>
            <main className={styles.content}>
                <div className={styles.mainArea}>
                    {/* Learning Toolbar */}
                    {currentSession && (
                        <LearningToolbar
                            healthPercent={Math.round(sensaFlow.I * 100)}
                            isHealthOpen={showHealthPanel}
                            onToggleHealth={() => setShowHealthPanel(prev => !prev)}
                        />
                    )}

                    {/* Phase Navigator */}
                    {currentSession && studySession?.goal !== 'explore' && (
                        <PhaseNavigator
                            currentPhase={currentPhase}
                            completedPhases={completedPhases}
                        />
                    )}

                    {/* Explore Mode Header */}
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

                    {/* Learning Health Panel (collapsible from toolbar) */}
                    {studySession?.goal !== 'explore' && (
                        <>
                            {currentSession && currentPhase === 'LEARN' && (
                                <ConceptProgressIndicator
                                    current={currentSession.progress.completedConcepts.length + 1}
                                    total={currentSession.concepts.length}
                                    compact={true}
                                    selectionReason={selectionReason}
                                />
                            )}

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

            <AnimatePresence>
                {showHealthPanel && (
                    <motion.div
                        className={styles.healthModalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setShowHealthPanel(false)}
                    >
                        <motion.div
                            className={styles.healthModalContent}
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <BlueprintFormulaDashboard
                                subjectType={sensaFlow.subjectType}
                                h={sensaFlow.h}
                                I={sensaFlow.I}
                                phase={sensaFlow.phase}
                                metrics={{
                                    Q_k: sensaFlow.Q_k,
                                    Q_r: sensaFlow.Q_r,
                                    Q_c: sensaFlow.Q_c,
                                    Q_f: sensaFlow.Q_f,
                                    Q_p: sensaFlow.Q_p,
                                    labels: sensaFlow.qLabels
                                }}
                                weakestVariable={sensaFlow.weakestVariable}
                                recommendation={sensaFlow.recommendation}
                                feedbackSignal={sensaFlow.feedbackSignal}
                                subjectName={currentSession?.subject}
                                conceptsCompleted={currentSession?.progress?.completedConcepts?.length ?? 0}
                                conceptsTotal={currentSession?.concepts?.length ?? 0}
                                onClose={() => setShowHealthPanel(false)}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    function renderPhaseContent() {
        switch (currentPhase) {
            case 'PRIME':
                if (!lockedIn) {
                    return (
                        <motion.div key="gate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <VelocityLockInGate
                                subjectName={currentSession!.subject}
                                onConfirm={() => {
                                    setLockedIn(true);
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
                                sensaFlow.completeExplore(guesses);
                                sensaFlow.updateLearnerMetrics({
                                    completedConcepts: currentSession!.progress.completedConcepts.length,
                                    totalConcepts: currentSession!.concepts.length,
                                    consecutiveCorrect: 0,
                                    consecutiveErrors: 0,
                                    timeSpentMs: currentSession!.progress.sessionStartTime ? Date.now() - currentSession!.progress.sessionStartTime : 0,
                                    targetDurationMs: (studySession?.targetDuration ?? 30) * 60000,
                                    cycleCompletions: 0,
                                    blankSheetScore: 0,
                                    quizAccuracy: 0,
                                    mapNodeCount: 0,
                                    mapConnectionCount: 0,
                                    guessCount: guesses.size,
                                    avgResponseTimeMs: 0
                                });
                            }}
                        />
                    </motion.div>
                );
            case 'OVERVIEW_MAP':
                return (
                    <motion.div
                        key="overview-map"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={styles.fullWidthContainer}
                    >
                        <OverviewMapView
                            concepts={currentSession!.concepts}
                            ulcPattern={detectULC(currentSession!.concepts as any)}
                            onComplete={() => {
                                const { markOverviewViewed } = useLearningStore.getState();
                                markOverviewViewed();
                                toast.success('Overview complete — ready to start learning!', { duration: 3000 });
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
                            initialData={studySession?.conceptMap || null}
                            onComplete={(data) => {
                                markSessionMapBuilt(data);
                                sensaFlow.completeNote(data);
                                sensaFlow.updateLearnerMetrics({
                                    completedConcepts: currentSession!.progress.completedConcepts.length,
                                    totalConcepts: currentSession!.concepts.length,
                                    consecutiveCorrect: 0,
                                    consecutiveErrors: 0,
                                    timeSpentMs: currentSession!.progress.sessionStartTime ? Date.now() - currentSession!.progress.sessionStartTime : 0,
                                    targetDurationMs: (studySession?.targetDuration ?? 30) * 60000,
                                    cycleCompletions: 0,
                                    blankSheetScore: 0,
                                    quizAccuracy: 0,
                                    mapNodeCount: data.nodes.length,
                                    mapConnectionCount: data.connections.length,
                                    guessCount: Object.keys(studySession?.predictions ?? {}).length,
                                    avgResponseTimeMs: 0
                                });
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
                                completeDiagnostic({
                                    knownConcepts: [],
                                    knowledgeGaps: [],
                                    confidenceScores: {},
                                    canSkipTrunk: false
                                });
                            }}
                            onDiagnosticComplete={handleDiagnosticComplete}
                        />
                    </motion.div>
                );
            case 'LEARN':
                if (!activeConcept) return null;
                return (
                    <motion.div
                        key={`loop-${activeConcept.id}`}
                        layoutId="learning-focus-container"
                        className={styles.immersiveContainer}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                    >
                        {intervention && (
                            <div className={styles.interventionWrapper}>
                                <CoachInterventionBanner
                                    type={intervention}
                                    onPrimary={() => {
                                        setIntervention(null);
                                    }}
                                    onSecondary={() => setIntervention(null)}
                                    onDismiss={() => setIntervention(null)}
                                />
                            </div>
                        )}

                        {reviewContext && (reviewContext.lastReviewDate || reviewContext.decayStatus !== 'fresh') && (
                            <div className={styles.contextPanelWrapper}>
                                <ReviewContextPanel
                                    conceptName={activeConcept.name}
                                    context={reviewContext}
                                />

                            </div>
                        )}

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
                                sensaFlow.completeApply(
                                    passed ? 0.85 : 0.5,
                                    passed,
                                    passed ? 0.8 : 0.4
                                );
                            }}
                        />
                    </motion.div>
                );
            case 'COMPLETE':
            default:
                const hasCompletedConcepts = (currentSession?.progress?.completedConcepts?.length ?? 0) > 0;
                const hasStartedSession = studySession !== null;
                if (studySession?.goal === 'explore') {
                    return (
                        <SensaSynopticView
                            concepts={currentSession!.concepts}
                            subjectName={currentSession!.subject}
                        />
                    );
                }
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
                                h: sensaFlow.h,
                                Q_k: sensaFlow.Q_k,
                                Q_r: sensaFlow.Q_r,
                                Q_c: sensaFlow.Q_c,
                                Q_f: sensaFlow.Q_f,
                                Q_p: sensaFlow.Q_p,
                                I: sensaFlow.I
                            }}
                            streakCount={flowState.streakCount}
                            onReturnHome={handleReturnToDashboard}
                            onReviewConcepts={() => {
                                const targetId = currentSession?.subjectId || currentSession?.id;
                                if (targetId) {
                                    navigate(`/study/${targetId}?tab=overview`);
                                }
                            }}
                        />
                    );
                }
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
