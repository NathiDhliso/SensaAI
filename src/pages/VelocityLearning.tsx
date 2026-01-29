/**
 * Velocity Learning Page
 * 
 * Main entry point for the SensaAI Learning Velocity Engine.
 * Orchestrates the SENSA v2.0 5-Step Flow with Universal Learning Equation tracking.
 * I = min(h, G × Q_f × Q_M × Q_P)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Brain, Home, BookOpen } from 'lucide-react';

import { useLearningStore } from '@/store/learning-store';
import { useLearningFlow } from '@/shared/hooks/useLearningFlow';
import { useSensaFlow } from '@/shared/hooks/useSensaFlow';
import { useFlowState } from '@/shared/hooks/useFlowState';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { loadSessionProgress, getProgressAge, cleanupExpiredProgress } from '@/features/learning-session/progress/session-tracker';
import { toast } from '@/shared/utils/toast';

// SENSA v2.0: MasteryDashboard will be used in COMPLETE phase - future implementation
// import { MasteryDashboard } from '@/components/dashboard/MasteryDashboard';
import { EquationTracker } from '@/components/ui/EquationTracker';
import { FlowProgressBar } from '@/components/ui/FlowProgressBar';
import { ConceptProgressIndicator } from '@/components/ui/ConceptProgressIndicator';
import MomentumCheckpoint from '@/components/ui/MomentumCheckpoint';
import SessionTimeToast from '@/components/ui/SessionTimeToast';
import MicroLearningLoopController from '@/components/learning/MicroLearningLoopController';
import DiagnosticLaunchSystem from '@/components/learning/onboarding/DiagnosticLaunchSystem';
import SessionStartModal from '@/components/learning/session/SessionStartModal';
import VelocityLockInGate from '@/components/learning/session/VelocityLockInGate';
// SessionScoutPreview - reserved for future SCOUT phase implementation
import ConceptMapBuilder from '@/components/learning/activities/ConceptMapBuilder';
import MasteryChallenge from '@/components/learning/activities/MasteryChallenge';
import SensaSynopticView from '@/components/learning/ui/SensaSynopticView';
import SkipReasonModal, { type SkipReasonData } from '@/components/learning/feedback/SkipReasonModal';
import PhaseNavigator from '@/components/learning/ui/PhaseNavigator';

import type {
    StudyGoal,
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
        // markSessionScouted - reserved for future SCOUT phase
        // markSessionPreviewed - reserved for future PREVIEW phase
        markSessionMapBuilt,
        markSessionMapReconstructed,
        markSessionMastered,
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
        showStartModal
    } = useLearningFlow();

    // 2b. SENSA v2.0 Flow State Machine
    const sensaFlow = useSensaFlow();

    // 2c. Flow State Detection (Momentum Checkpoints)
    const flowState = useFlowState();

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
            console.log('[VelocityLearning] Found saved progress:', age);

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

    // Auto-transition from PRIME to BUILD after lock-in
    useEffect(() => {
        if (currentPhase === 'PRIME' && lockedIn) {
            // Small delay to allow lock-in animation to complete
            const timer = setTimeout(() => {
                // Skip SCOUT/PREVIEW phase since user already did Overview tab
                // Go directly to BUILD phase - use stored goal/duration or defaults
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

    // Cleanup: Save final progress on unmount
    useEffect(() => {
        return () => {
            // Save progress one last time when component unmounts
            if (currentSession) {
                const { progress } = currentSession;
                const nextConcept = getNextConcept();

                try {
                    import('@/features/learning-session/progress/session-tracker').then(({ saveSessionProgress: saveProgress }) => {
                        saveProgress({
                            sessionId: currentSession.id,
                            subjectId: currentSession.subjectId,
                            progress,
                            currentPhase: currentPhase || 'IDLE',
                            activeConcept: nextConcept,
                        });
                        console.log('[VelocityLearning] Saved progress on unmount');
                    });
                } catch (error) {
                    console.error('[VelocityLearning] Failed to save progress on unmount:', error);
                }
            }
        };
    }, [currentSession, currentPhase, getNextConcept]);

    // 5. Handlers
    const handleStartSession = (goal: StudyGoal, duration: number, primer?: { reason: string; action: string; reward: string }) => {
        // Pass primer atomically to ensure correct initial phase state (avoids PRIME phase sticking)
        startStudySession(goal, duration, [], primer || null);

        // Lock-in state is implied by session start, but we update local UI state to be sure
        setLockedIn(true);
    };

    // Scout phase handler - reserved for future implementation
    // Uses markSessionScouted() and markSessionPreviewed() when needed

    const handleLoopComplete = (outcome: 'mastered' | 'needs-learning' | 'needs-review', _timeSpent: number) => {
        if (!activeConcept) return;

        // "Sonic Boom" Effect for Mastery
        if (outcome === 'mastered') {
            // Use AudioService singleton instead of creating new Audio instances
            import('@/shared/services/AudioService').then(({ AudioService }) => {
                AudioService.play('mastery', '/audio/voice/sage_master_success.mp3');
            });
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
        
        // Next concept is auto-selected by store logic usually, but let's be safe
        // useLearningFlow will recalculate activeConcept on next render
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

        // Adaptive routing based on skip reason
        if (data.reason === 'too-hard') {
            // TODO: Route to prerequisite check
            // For now, just advance to next concept
            const nextId = getNextConcept();
            if (nextId) setCurrentConcept(nextId);
        } else if (data.reason === 'too-easy') {
            // TODO: Route to high-stakes verification
            // For now, mark as mastered and advance
            if (pendingSkipConcept) {
                completeConcept(pendingSkipConcept, 1.0, 'mastered');
            }
            const nextId = getNextConcept();
            if (nextId) setCurrentConcept(nextId);
        } else {
            // Default: Just skip to next
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

    const cognitiveLoad = 0.4; // TODO: Connect to real store metric

    return (
        <div className={styles.container} style={{ '--cognitive-load': cognitiveLoad } as React.CSSProperties}>
            <main className={styles.content}>
                <div className={styles.mainArea}>

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
                                    // Calculate sub-progress during STUDY phase (micro-learning loop)
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

            {/* Modals */}
            <AnimatePresence>
                {showStartModal && lockedIn && (
                    <SessionStartModal
                        subjectName={currentSession.subject}
                        totalConcepts={currentSession.concepts.length}
                        completedConcepts={currentSession.progress.completedConcepts.length}
                        onStart={handleStartSession}
                    />
                )}

                {/* ARCHITECT ENHANCEMENT: Skip Reason Modal */}
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
                            // TODO: Navigate to recap screen
                            setShowCheckpoint(false);
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
                // If locked in, automatically transition to BUILD phase
                // (Skip SCOUT/PREVIEW since user already did Overview tab)
                return null; // Will auto-advance to BUILD

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
                            onLoopComplete={handleLoopComplete}
                            onSkip={handleSkipConcept}
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

                // Case 2: User has completed concepts - show completion summary
                if (hasCompletedConcepts) {
                    const completedCount = currentSession?.progress?.completedConcepts?.length || 0;
                    const totalCount = currentSession?.concepts.length || 0;
                    const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                    return (
                        <div className={styles.emptyState}>
                            <Brain size={48} className={styles.emptyIcon} style={{ color: 'var(--color-success, #10b981)' }} />
                            <h2>Session Complete! 🎉</h2>
                            <p>You've mastered {completedCount} of {totalCount} concepts ({completionPercentage}%)</p>
                            <div className={styles.sessionStats}>
                                <div className={styles.stat}>
                                    <span className={styles.statLabel}>Time Spent</span>
                                    <span className={styles.statValue}>
                                        {Math.floor((Date.now() - (currentSession?.progress?.sessionStartTime || Date.now())) / 60000)} min
                                    </span>
                                </div>
                                <div className={styles.stat}>
                                    <span className={styles.statLabel}>Concepts Mastered</span>
                                    <span className={styles.statValue}>{completedCount}</span>
                                </div>
                            </div>
                            <div className={styles.buttonGroup}>
                                <button
                                    onClick={handleReturnToDashboard}
                                    className={styles.primaryButton}
                                    aria-label="Return to dashboard"
                                >
                                    <Home size={20} />
                                    Return to Dashboard
                                </button>
                                <button
                                    onClick={() => {
                                        // Reset to overview to review concepts
                                        navigate(`/study/${currentSession?.id}?tab=overview`);
                                    }}
                                    className={styles.secondaryButton}
                                    aria-label="Review concepts"
                                >
                                    <BookOpen size={20} />
                                    Review Concepts
                                </button>
                            </div>
                        </div>
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
