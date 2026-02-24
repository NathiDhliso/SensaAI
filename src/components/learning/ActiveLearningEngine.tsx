import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Brain, Home, Map, Layers, BookOpen } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import { useLearningFlow } from '@/shared/hooks/useLearningFlow';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { toast } from '@/shared/utils/toast';
import { MasteryDashboard } from '@/components/dashboard/MasteryDashboard';
import { ULCPracticeController } from '@/components/learning/ULCPracticeController';
import ConceptMapBuilder from '@/components/learning/activities/ConceptMapBuilder';
import { DeepStructureDiscovery } from '@/components/learning/discovery/DeepStructureDiscovery';
import styles from './ActiveLearningEngine.module.css';

type ActiveTab = 'map' | 'ulc';

export default function ActiveLearningEngine() {
    const navigate = useNavigate();

    const {
        currentSession,
        studySession,
        clearSession,
        startStudySession,
        updateSession,
    } = useLearningStore();

    const { currentPhase } = useLearningFlow();
    const [activeTab, setActiveTab] = useState<ActiveTab>('ulc');
    const [isInitializing, setIsInitializing] = useState(true);
    const [showStructurePanel, setShowStructurePanel] = useState(false);
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

    const handleReturnToULC = useCallback(() => {
        setFocusConcept(null);
        setActiveTab('ulc');
    }, []);

    const allComplete = useMemo(() => {
        if (!currentSession) return false;
        return currentSession.progress.completedConcepts.length >= currentSession.concepts.length;
    }, [currentSession]);

    // Prefer fullClassification (includes deepStructure, lifecycleBlueprints).
    // Fall back to macroWorkflow.classification for legacy data.
    const classification = currentSession?.metadata?.fullClassification
        || currentSession?.metadata?.macroWorkflow?.classification
        || currentSession?.macroWorkflow?.classification;

    useEffect(() => {
        // If we hit PREVIEW, auto-advance
        if (currentPhase === 'PREVIEW') {
            updateSession({ previewed: true });
        }
    }, [currentPhase, updateSession]);

    const handleScoutComplete = useCallback(() => {
        updateSession({ scouted: true, previewed: true });
    }, [updateSession]);

    if (currentPhase === 'SCOUT' && currentSession) {
        return (
            <div className={styles.container}>
                <DeepStructureDiscovery
                    classification={classification}
                    subjectName={currentSession.subject}
                    onContinue={handleScoutComplete}
                />
            </div>
        );
    }

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
                    equation={studySession?.equation ?? undefined}
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
                    {activeTab === 'ulc'
                        ? <><Map size={14} />Build Map — Why<span className={styles.tabBadge}>{currentSession.progress.completedConcepts.length}/{currentSession.concepts.length}</span></>
                        : <><Layers size={14} />ULC — How</>}
                </button>
                <button
                    className={styles.actionBtn}
                    onClick={() => setShowStructurePanel(true)}
                    title="View Master Blueprint"
                >
                    <BookOpen size={14} /> Deep Structure
                </button>
            </div>

            {createPortal(
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
                </AnimatePresence>,
                document.body
            )}

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
                            onReturnToULC={handleReturnToULC}
                            subjectType={classification?.subjectType}
                            lifecycleBlueprints={classification?.lifecycleBlueprints}
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

            {createPortal(
                <AnimatePresence>
                    {showStructurePanel && (
                        <motion.div
                            className={styles.scoutOverlay}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <DeepStructureDiscovery
                                classification={classification}
                                subjectName={currentSession.subject}
                                onContinue={() => setShowStructurePanel(false)}
                                continueText="Return to Session"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
