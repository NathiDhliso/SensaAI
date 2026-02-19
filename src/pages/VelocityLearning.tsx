/**
 * Velocity Learning Page
 *
 * Core learning loop: STRUCTURE (Concept Map) → ULC_MASTERY (ULC Matrix)
 * Blueprint Formula monitoring: I = min(h, Q_k × Q_r × Q_c × Q_f × Q_p)
 */
import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
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
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { loadSessionProgress, getProgressAge, cleanupExpiredProgress } from '@/features/learning-session/progress/session-tracker';
import { detectULC, detectVerbJump } from '@/features/content-generation/parsers/ulc-detector';
import { toast } from '@/shared/utils/toast';
import { MasteryDashboard } from '@/components/dashboard/MasteryDashboard';
import { BlueprintFormulaDashboard } from '@/components/dashboard/BlueprintFormulaDashboard';
import { FlowProgressBar } from '@/components/ui/FlowProgressBar';
import { ConceptProgressIndicator } from '@/components/ui/ConceptProgressIndicator';
import MomentumCheckpoint from '@/components/ui/MomentumCheckpoint';
import SessionTimeToast from '@/components/ui/SessionTimeToast';
import { ULCPracticeController } from '@/components/learning/ULCPracticeController';
import { LearningToolbar } from '@/components/learning/LearningToolbar';
import CoachInterventionBanner, { type InterventionType } from '@/components/learning/ui/CoachInterventionBanner';
import styles from './VelocityLearning.module.css';

const AnnotatableMap = lazy(() =>
  import('@/features/unified-flow/components/structure/AnnotatableMap').then(m => ({ default: m.AnnotatableMap }))
);
const GuidedMapBuilder = lazy(() =>
  import('@/features/unified-flow/components/structure/GuidedMapBuilder').then(m => ({ default: m.GuidedMapBuilder }))
);
const FullMapBuilder = lazy(() =>
  import('@/features/unified-flow/components/structure/FullMapBuilder').then(m => ({ default: m.FullMapBuilder }))
);

export default function VelocityLearning() {
    const navigate = useNavigate();

    const {
        currentSession,
        studySession,
        completeConcept,
        clearSession,
        updateSessionEquation
    } = useLearningStore();

    const { currentPhase, activeConcept, unifiedPhase } = useLearningFlow();
    const sensaFlow = useSensaFlow();
    const flowState = useFlowState();
    const { showMessage: showCoachMessage } = useCoachMessage();
    const currentMood = studySession?.mood || 'okay';
    const phaseAdapter = usePhaseAdapter(unifiedPhase, currentMood);

    const ulcPattern = useMemo(
        () => currentSession ? detectULC(currentSession.concepts) : null,
        [currentSession]
    );

    const [showTimeToast, setShowTimeToast] = useState(false);
    const [showCheckpoint, setShowCheckpoint] = useState(false);
    const [intervention, setIntervention] = useState<InterventionType | null>(null);
    const [showHealthPanel, setShowHealthPanel] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsInitializing(false), UI_TIMINGS.DELAY_SHORT);
        return () => clearTimeout(timer);
    }, []);

    useStruggleDetector({
        idleThresholdSeconds: 60,
        errorThreshold: 2,
        backspaceThreshold: 30,
        onStruggleChange: (state) => {
            if (!state.isStruggling || state.confidence <= 0.5) return;
            if (unifiedPhase === 'ULC_MASTERY') {
                const completedIds = currentSession?.progress.completedConcepts ?? [];
                const isVerbJump = ulcPattern?.detected
                    ? detectVerbJump(completedIds, ulcPattern)
                    : false;
                showCoachMessage('build', 'struggle', 10000);
                setIntervention(isVerbJump ? 'skip_streak' : 'low_verify');
            }
        }
    });

    const { initializeSubjectType, initializeH } = sensaFlow;
    useEffect(() => {
        if (currentSession?.subjectType) initializeSubjectType(currentSession.subjectType);
        if (studySession?.mood) initializeH(studySession.mood);
    }, [currentSession?.subjectType, studySession?.mood, initializeSubjectType, initializeH]);

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
            h: sensaFlow.h, Q_k: sensaFlow.Q_k, Q_r: sensaFlow.Q_r,
            Q_c: sensaFlow.Q_c, Q_f: sensaFlow.Q_f, Q_p: sensaFlow.Q_p, I: sensaFlow.I
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
                if (savedProgress.activeConcept) setCurrentConcept(savedProgress.activeConcept);
                toast.success(`Resumed from where you left off (${age})`, { duration: 4000 });
            }
        }
    }, [currentSession?.id]);

    const handleCellComplete = (
        conceptId: string,
        outcome: 'mastered' | 'needs-learning' | 'needs-review',
        cellMetrics: Partial<{ quizAccuracy: number; blankSheetScore: number; timeSpentMs: number; avgResponseTimeMs: number; mapNodeCount: number; mapConnectionCount: number }>
    ) => {
        const score = outcome === 'mastered' ? 1.0 : outcome === 'needs-review' ? 0.6 : 0.3;
        completeConcept(conceptId, score, outcome);
        setTimeout(() => {
            const { lastSpacingUpdate } = useLearningStore.getState();
            if (lastSpacingUpdate) {
                const qualityLabels: Record<number, string> = { 5: 'Perfect', 4: 'Good', 3: 'Okay', 2: 'Weak', 1: 'Missed', 0: 'Blank' };
                const label = qualityLabels[lastSpacingUpdate.quality] || 'Recorded';
                toast.info(`${label} recall — next review in ${lastSpacingUpdate.intervalDays}d`, { duration: 3500 });
            }
        }, 500);
        if (currentSession?.subjectType) {
            const progress = currentSession.progress;
            const metrics = currentSession.cognitiveMetrics;
            sensaFlow.updateLearnerMetrics({
                completedConcepts: progress.completedConcepts.length + 1,
                totalConcepts: currentSession.concepts.length,
                consecutiveCorrect: metrics.consecutiveCorrect,
                consecutiveErrors: metrics.consecutiveErrors,
                timeSpentMs: cellMetrics.timeSpentMs ?? (progress.sessionStartTime ? Date.now() - progress.sessionStartTime : 0),
                targetDurationMs: (studySession?.targetDuration ?? 30) * 60000,
                cycleCompletions: progress.completedConcepts.length,
                blankSheetScore: cellMetrics.blankSheetScore ?? score,
                quizAccuracy: cellMetrics.quizAccuracy ?? score,
                mapNodeCount: cellMetrics.mapNodeCount ?? studySession?.conceptMap?.nodes?.length ?? 0,
                mapConnectionCount: cellMetrics.mapConnectionCount ?? studySession?.conceptMap?.connections?.length ?? 0,
                guessCount: Object.keys(studySession?.predictions ?? {}).length,
                avgResponseTimeMs: cellMetrics.avgResponseTimeMs ?? metrics.avgResponseTimeMs
            });
        }
    };

    const handleStructureComplete = () => {
        if (!phaseAdapter || !studySession) return;
        const updates = phaseAdapter.completionHandler(studySession);
        const { updateSession } = useLearningStore.getState();
        updateSession(updates);
        toast.success('Concept Map complete — entering ULC Mastery!', { duration: 2000 });
    };

    const handleReturnToDashboard = () => { clearSession(); navigate('/'); };
    const handleGoToLibrary = () => navigate('/');

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
                    <button onClick={handleGoToLibrary} className={styles.primaryButton} aria-label="Go to library to generate or load content">
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
                    <LearningToolbar
                        healthPercent={Math.round(sensaFlow.I * 100)}
                        isHealthOpen={showHealthPanel}
                        onToggleHealth={() => setShowHealthPanel(prev => !prev)}
                    />

                    <FlowProgressBar
                        currentPhase={sensaFlow.phase}
                        completedPhases={sensaFlow.completedSteps}
                        compact={true}
                        subProgress={
                            unifiedPhase === 'ULC_MASTERY' && currentSession
                                ? currentSession.progress.completedConcepts.length / currentSession.concepts.length
                                : 0
                        }
                    />

                    <ConceptProgressIndicator
                        current={currentSession.progress.completedConcepts.length}
                        total={currentSession.concepts.length}
                        compact={true}
                    />

                    <AnimatePresence mode="wait">
                        {unifiedPhase === 'STRUCTURE' && studySession && (
                            <motion.div
                                key="structure"
                                className={styles.fullWidthContainer}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <Suspense fallback={
                                    <div className={styles.emptyState}>
                                        <Brain size={48} className={styles.emptyIcon} style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                                        <p>Loading concept map...</p>
                                    </div>
                                }>
                                    {currentMood === 'tired'
                                        ? <AnnotatableMap concepts={currentSession.concepts} session={studySession} onComplete={handleStructureComplete} />
                                        : currentMood === 'pumped' || currentMood === 'good'
                                            ? <FullMapBuilder concepts={currentSession.concepts} session={studySession} onComplete={handleStructureComplete} />
                                            : <GuidedMapBuilder concepts={currentSession.concepts} session={studySession} onComplete={handleStructureComplete} />
                                    }
                                </Suspense>
                            </motion.div>
                        )}

                        {unifiedPhase === 'ULC_MASTERY' && (
                            <motion.div
                                key="ulc-mastery"
                                className={styles.fullWidthContainer}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                {intervention && (
                                    <div className={styles.interventionWrapper}>
                                        <CoachInterventionBanner
                                            type={intervention}
                                            onPrimary={() => setIntervention(null)}
                                            onSecondary={() => setIntervention(null)}
                                            onDismiss={() => setIntervention(null)}
                                        />
                                    </div>
                                )}
                                <ULCPracticeController
                                    concepts={currentSession.concepts}
                                    completedConceptIds={currentSession.progress.completedConcepts}
                                    subjectType={currentSession.subjectType}
                                    onCellComplete={handleCellComplete}
                                    onAllComplete={handleReturnToDashboard}
                                />
                            </motion.div>
                        )}

                        {unifiedPhase === 'COMPLETE' && (
                            <motion.div
                                key="complete"
                                className={styles.fullWidthContainer}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                {(currentSession.progress.completedConcepts.length > 0) ? (
                                    <MasteryDashboard
                                        concepts={currentSession.concepts}
                                        completedConcepts={currentSession.progress.completedConcepts}
                                        subjectName={currentSession.subject}
                                        sessionStartTime={currentSession.progress.sessionStartTime || Date.now()}
                                        equation={{ h: sensaFlow.h, Q_k: sensaFlow.Q_k, Q_r: sensaFlow.Q_r, Q_c: sensaFlow.Q_c, Q_f: sensaFlow.Q_f, Q_p: sensaFlow.Q_p, I: sensaFlow.I }}
                                        streakCount={flowState.streakCount}
                                        onReturnHome={handleReturnToDashboard}
                                        onReviewConcepts={() => {
                                            const targetId = currentSession.subjectId || currentSession.id;
                                            if (targetId) navigate(`/study/${targetId}?tab=overview`);
                                        }}
                                    />
                                ) : (
                                    <div className={styles.emptyState}>
                                        <Brain size={48} className={styles.emptyIcon} />
                                        <h2>All Caught Up!</h2>
                                        <p>You've completed all available concepts for now.</p>
                                        <div className={styles.buttonGroup}>
                                            <button onClick={handleReturnToDashboard} className={styles.primaryButton} aria-label="Return to dashboard">
                                                <Home size={20} />
                                                Return to Dashboard
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            <AnimatePresence>
                {showTimeToast && (
                    <SessionTimeToast
                        targetMinutes={useLearningStore.getState().studySession?.targetDuration || 30}
                        onKeepGoing={() => setShowTimeToast(false)}
                        onTakeBreak={() => { setShowTimeToast(false); setShowCheckpoint(true); }}
                        onDismiss={() => setShowTimeToast(false)}
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
                        onContinue={() => setShowCheckpoint(false)}
                        onExit={() => { setShowCheckpoint(false); navigate(`/study/${currentSession.id}?tab=overview`); }}
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
                                metrics={{ Q_k: sensaFlow.Q_k, Q_r: sensaFlow.Q_r, Q_c: sensaFlow.Q_c, Q_f: sensaFlow.Q_f, Q_p: sensaFlow.Q_p, labels: sensaFlow.qLabels }}
                                weakestVariable={sensaFlow.weakestVariable}
                                recommendation={sensaFlow.recommendation}
                                feedbackSignal={sensaFlow.feedbackSignal}
                                subjectName={currentSession.subject}
                                conceptsCompleted={currentSession.progress.completedConcepts.length}
                                conceptsTotal={currentSession.concepts.length}
                                onClose={() => setShowHealthPanel(false)}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
