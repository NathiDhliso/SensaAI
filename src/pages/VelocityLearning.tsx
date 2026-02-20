import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Brain, Home, Map, Layers } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import { useLearningFlow } from '@/shared/hooks/useLearningFlow';
import { useSensaFlow } from '@/shared/hooks/useSensaFlow';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { toast } from '@/shared/utils/toast';
import { MasteryDashboard } from '@/components/dashboard/MasteryDashboard';
import { ULCPracticeController } from '@/components/learning/ULCPracticeController';
import ConceptMapBuilder from '@/components/learning/activities/ConceptMapBuilder';
import styles from './VelocityLearning.module.css';

type ActiveTab = 'map' | 'ulc';

export default function VelocityLearning() {
    const navigate = useNavigate();

    const {
        currentSession,
        studySession,
        completeConcept,
        clearSession,
        updateSessionEquation,
        startStudySession,
        updateSession,
    } = useLearningStore();

    const { currentPhase } = useLearningFlow();
    const sensaFlow = useSensaFlow();
    const [activeTab, setActiveTab] = useState<ActiveTab>('ulc');
    const [isInitializing, setIsInitializing] = useState(true);
    const [portalConcept, setPortalConcept] = useState<string | null>(null);
    const [focusConcept, setFocusConcept] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setIsInitializing(false), UI_TIMINGS.DELAY_SHORT);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (currentSession && !studySession) {
            startStudySession('learn-new', 30);
        }
    }, [currentSession?.id, studySession, startStudySession]);

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
            Q_c: sensaFlow.Q_c, Q_f: sensaFlow.Q_f, Q_p: sensaFlow.Q_p, I: sensaFlow.I,
        });
    }, [sensaFlow.h, sensaFlow.Q_k, sensaFlow.Q_r, sensaFlow.Q_c, sensaFlow.Q_f, sensaFlow.Q_p, sensaFlow.I, studySession, updateSessionEquation]);

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
                avgResponseTimeMs: cellMetrics.avgResponseTimeMs ?? metrics.avgResponseTimeMs,
            });
        }
    };

    const handleMapComplete = () => {
        if (!studySession) return;
        updateSession({
            phaseProgress: { ...studySession.phaseProgress, structureCompleted: true },
        });
        toast.success('Map built — switch to ULC to drill concepts', { duration: 2500 });
        setActiveTab('ulc');
    };

    const handleReturnToDashboard = () => { clearSession(); navigate('/'); };

    const handleExploreWhy = useCallback((conceptName: string) => {
        setPortalConcept(conceptName);
        setTimeout(() => {
            setFocusConcept(conceptName);
            setActiveTab('map');
            setPortalConcept(null);
        }, 900);
    }, []);

    const allComplete = useMemo(() => {
        if (!currentSession) return false;
        return currentSession.progress.completedConcepts.length >= currentSession.concepts.length;
    }, [currentSession]);

    if (currentPhase === 'IDLE' || !currentSession) {
        if (isInitializing) {
            return (
                <div className={styles.container}>
                    <div className={styles.emptyState}>
                        <Brain size={48} className={styles.emptyIcon} />
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
                    <button onClick={() => navigate('/')} className={styles.primaryButton}>
                        <Home size={20} />
                        Go to Library
                    </button>
                </div>
            </div>
        );
    }

    if (allComplete) {
        return (
            <div className={styles.container}>
                <MasteryDashboard
                    concepts={currentSession.concepts}
                    completedConcepts={currentSession.progress.completedConcepts}
                    subjectName={currentSession.subject}
                    sessionStartTime={currentSession.progress.sessionStartTime || Date.now()}
                    equation={{
                        h: sensaFlow.h, Q_k: sensaFlow.Q_k, Q_r: sensaFlow.Q_r,
                        Q_c: sensaFlow.Q_c, Q_f: sensaFlow.Q_f, Q_p: sensaFlow.Q_p, I: sensaFlow.I,
                    }}
                    streakCount={0}
                    onReturnHome={handleReturnToDashboard}
                    onReviewConcepts={() => {
                        const targetId = currentSession.subjectId || currentSession.id;
                        if (targetId) navigate(`/study/${targetId}?tab=overview`);
                    }}
                />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.floatingBar}>
                <button className={styles.homeBtn} onClick={handleReturnToDashboard} title="Return home">
                    <Home size={15} />
                </button>
                <button
                    className={styles.toggleBtn}
                    onClick={() => setActiveTab(activeTab === 'ulc' ? 'map' : 'ulc')}
                >
                    {activeTab === 'ulc' ? <><Map size={14} />Build Map — Why</> : <><Layers size={14} />ULC — How</>}
                </button>
            </div>

            <AnimatePresence>
                {portalConcept && (
                    <motion.div
                        key="portal"
                        className={styles.portalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <motion.div
                            className={styles.portalRing}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.05 }}
                        />
                        <motion.span
                            className={styles.portalLabel}
                            initial={{ scale: 0.4, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 1.6, opacity: 0, y: -30 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.1 }}
                        >
                            {portalConcept}
                        </motion.span>
                        <motion.p
                            className={styles.portalSub}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.25 }}
                        >
                            Building relationships...
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {activeTab === 'ulc' && (
                    <motion.div
                        key="ulc"
                        className={styles.tabContent}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.18 }}
                    >
                        <ULCPracticeController
                            concepts={currentSession.concepts}
                            completedConceptIds={currentSession.progress.completedConcepts}
                            subjectType={currentSession.subjectType}
                            onCellComplete={handleCellComplete}
                            onAllComplete={handleReturnToDashboard}
                            onExploreWhy={handleExploreWhy}
                        />
                    </motion.div>
                )}

                {activeTab === 'map' && (
                    <motion.div
                        key="map"
                        className={styles.tabContent}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        transition={{ duration: 0.18 }}
                    >
                        <ConceptMapBuilder
                            concepts={currentSession.concepts}
                            mode="free"
                            subjectName={currentSession.subject}
                            focusConcept={focusConcept ?? undefined}
                            onComplete={(data) => {
                                if (studySession) {
                                    useLearningStore.getState().markSessionMapBuilt(data);
                                }
                                handleMapComplete();
                            }}
                        />
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}
