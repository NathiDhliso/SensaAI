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
import { usePhaseAdapter } from '@/shared/hooks/usePhaseAdapter';
import { getComponent, shouldUseUnifiedFlow } from '@/features/unified-flow/utils/component-loader';
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
import PhaseNavigator from '@/components/learning/ui/PhaseNavigator';
import { LearningToolbar } from '@/components/learning/LearningToolbar';
import type { LearningConcept } from '@/shared/types/learning';
import CoachInterventionBanner, { type InterventionType } from '@/components/learning/ui/CoachInterventionBanner';
import ReviewContextPanel, { type ReviewContext } from '@/components/learning/ui/ReviewContextPanel';
import { Suspense } from 'react';
import styles from './VelocityLearning.module.css';

export default function VelocityLearning() {
    // 0. Navigation
    const navigate = useNavigate();

    // 1. Core State & Actions
    const {
        currentSession,
        studySession,
        completeConcept,
        setCurrentConcept,
        getNextConcept,
        clearSession,
        updateSessionEquation
    } = useLearningStore();

    // 2. The State Machine Hook
    const {
        currentPhase,
        completedPhases,
        activeConcept,
        unifiedPhase
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
    const [showTimeToast, setShowTimeToast] = useState(false);
    const [showCheckpoint, setShowCheckpoint] = useState(false);

    // ENHANCEMENT D: Coach Intervention State
    const [intervention, setIntervention] = useState<InterventionType | null>(null);

    // ENHANCEMENT A: ReviewContext State
    const [reviewContext] = useState<ReviewContext | null>(null);

    const [showHealthPanel, setShowHealthPanel] = useState(false);

    // Sync equation to store
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

    const handleReturnToDashboard = () => {
        clearSession();
        navigate('/');
    };

    const handleGoToLibrary = () => {
        navigate('/');
    };

    // ============================================================================
    // UNIFIED FLOW INTEGRATION
    // ============================================================================
    
    // Get phase adapter for current unified phase and mood
    const currentMood = studySession?.mood || 'okay';
    const phaseAdapter = usePhaseAdapter(unifiedPhase, currentMood);
    
    // Handler for unified flow phase completion
    const handleUnifiedPhaseComplete = () => {
        if (!phaseAdapter || !studySession) return;
        
        const updates = phaseAdapter.completionHandler(studySession);
        const { updateSession } = useLearningStore.getState();
        updateSession(updates);
        
        // Show success toast
        const phaseNames = {
            'ORIENT': 'Schema Priming',
            'STRUCTURE': 'Structure Building',
            'ENCODE': 'Learning',
            'VERIFY': 'Verification'
        };
        const phaseName = phaseNames[phaseAdapter.phase as keyof typeof phaseNames];
        if (phaseName) {
            toast.success(`${phaseName} complete!`, { duration: 2000 });
        }
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
                {showTimeToast && (
                    <SessionTimeToast
                        targetMinutes={useLearningStore.getState().studySession?.targetDuration || 30}
                        onKeepGoing={() => {
                            setShowTimeToast(false);
                        }}
                        onTakeBreak={() => {
                            setShowTimeToast(false);
                            setShowCheckpoint(true);
                        }}
                        onDismiss={() => {
                            setShowTimeToast(false);
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
        // ========================================================================
        // UNIFIED FLOW ONLY - No Legacy Fallback
        // ========================================================================
        
        // Check if we should use unified flow for current phase
        if (shouldUseUnifiedFlow(unifiedPhase) && phaseAdapter && currentSession && studySession) {
            const Component = getComponent(phaseAdapter.componentName);
            
            if (Component) {
                return (
                    <motion.div
                        key={`unified-${unifiedPhase}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={styles.fullWidthContainer}
                    >
                        <Suspense fallback={
                            <div className={styles.emptyState}>
                                <Brain size={48} className={styles.emptyIcon} style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                                <p>Loading {unifiedPhase.toLowerCase()} phase...</p>
                            </div>
                        }>
                            <Component
                                concepts={currentSession.concepts}
                                session={studySession}
                                onComplete={handleUnifiedPhaseComplete}
                            />
                        </Suspense>
                    </motion.div>
                );
            }
        }
        
        // ========================================================================
        // ENCODE Phase - Use MicroLearningLoop (kept for now)
        // ========================================================================
        
        if (unifiedPhase === 'ENCODE' && activeConcept) {
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
                        onSkip={() => {
                            const nextId = getNextConcept();
                            if (nextId) setCurrentConcept(nextId);
                        }}
                        onReturnToMap={() => {
                            // Return to structure phase
                            const { updateSession } = useLearningStore.getState();
                            if (studySession) {
                                updateSession({
                                    ...studySession,
                                    phaseProgress: {
                                        ...studySession.phaseProgress,
                                        structureCompleted: false
                                    }
                                });
                            }
                        }}
                    />
                </motion.div>
            );
        }
        
        // ========================================================================
        // COMPLETE Phase - Show Dashboard
        // ========================================================================
        
        if (unifiedPhase === 'COMPLETE') {
            const hasCompletedConcepts = (currentSession?.progress?.completedConcepts?.length ?? 0) > 0;
            
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
        
        // ========================================================================
        // Fallback - Should not reach here if unified flow is properly configured
        // ========================================================================
        
        return (
            <div className={styles.emptyState}>
                <AlertCircle size={48} className={styles.emptyIcon} />
                <h2>Phase Not Configured</h2>
                <p>Current phase: {unifiedPhase}</p>
                <p>Please check unified flow configuration.</p>
                <button
                    onClick={handleReturnToDashboard}
                    className={styles.primaryButton}
                >
                    <Home size={20} />
                    Return to Dashboard
                </button>
            </div>
        );
    }
}
