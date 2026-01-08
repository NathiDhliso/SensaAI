/**
 * Velocity Learning Page
 * 
 * Main entry point for the SensaAI Learning Velocity Engine.
 * Orchestrates the Silver Bullet Learning Cycle using the strict useLearningFlow state machine.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Brain } from 'lucide-react';

import { useLearningStore } from '@/store/learning-store';
import { useLearningFlow } from '@/hooks/useLearningFlow';

import VelocityDashboard from '@/components/learning/VelocityDashboard';
import MicroLearningLoopController from '@/components/learning/MicroLearningLoopController';
import DiagnosticLaunchSystem from '@/components/learning/DiagnosticLaunchSystem';
import SessionStartModal from '@/components/learning/SessionStartModal';
import VelocityLockInGate from '@/components/learning/VelocityLockInGate';
import { SessionScoutPreview } from '@/components/learning/SessionScoutPreview';
import ConceptMapBuilder from '@/components/learning/ConceptMapBuilder';
import MapReconstructionTest from '@/components/learning/MapReconstructionTest';
import MasteryChallenge from '@/components/learning/MasteryChallenge';

import type { SensaAILearningConcept } from '@/lib/content-adapter/transformer';
import styles from './VelocityLearning.module.css';

export default function VelocityLearning() {
    // 1. Core State & Actions
    const {
        currentSession,
        startDiagnostic,
        completeDiagnostic,
        startStudySession,
        completeConcept,
        setCurrentConcept,
        getNextConcept,
        startSession,
        setSessionPrimer,
        markSessionScouted,
        markSessionPreviewed,
        markSessionMapBuilt,
        markSessionMapReconstructed,
        markSessionMastered
    } = useLearningStore();

    // 2. The State Machine Hook
    const {
        currentPhase,
        activeConcept,
        showDashboard,
        showStartModal
    } = useLearningFlow();

    // 3. Local UI State
    const [lockedIn, setLockedIn] = useState(false);

    // 4. Effects
    // Initialize session timer
    useEffect(() => {
        if (currentSession && !currentSession.progress.sessionStartTime) {
            startSession();
        }
    }, [currentSession?.id, startSession]);

    // Auto-start diagnostic if needed
    useEffect(() => {
        if (currentPhase === 'DIAGNOSE') {
            startDiagnostic();
        }
    }, [currentPhase, startDiagnostic]);

    // 5. Handlers
    const handleStartSession = (goal: any, duration: number, primer?: { reason: string; action: string; reward: string }) => {
        startStudySession(goal, duration);
        if (primer) {
            setSessionPrimer(primer);
        }
        // Lock-in state is implied by session start, but we update local UI state to be sure
        setLockedIn(true);
    };

    const handleScoutComplete = () => {
        markSessionScouted();
        markSessionPreviewed();
    };

    const handleLoopComplete = (outcome: 'mastered' | 'needs-learning' | 'needs-review', _timeSpent: number) => {
        if (!activeConcept) return;

        // "Sonic Boom" Effect for Mastery
        if (outcome === 'mastered') {
            const audio = new Audio('/audio/voice/sage_master_success.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.warn('Audio play failed', e));
        }

        completeConcept(activeConcept.id);
        // Next concept is auto-selected by store logic usually, but let's be safe
        // useLearningFlow will recalculate activeConcept on next render
    };

    const handleSkipConcept = () => {
        const nextId = getNextConcept();
        if (nextId) setCurrentConcept(nextId);
    };

    const handleDiagnosticComplete = (results: any) => {
        completeDiagnostic(results);
    };

    // 6. Rendering Logic

    // Hydration grace period: Wait briefly for parent Study.tsx to hydrate before showing empty state
    const [isInitializing, setIsInitializing] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setIsInitializing(false), 500);
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

                    {/* Dashboard: Visible in Meta Phases */}
                    <AnimatePresence>
                        {showDashboard && (
                            <motion.div exit={{ opacity: 0, height: 0 }} className={styles.dashboardContainer}>
                                <VelocityDashboard
                                    sessionConceptsCompleted={currentSession.progress.conceptsLearnedToday}
                                    sessionStartTime={currentSession.progress.sessionStartTime ? new Date(currentSession.progress.sessionStartTime) : undefined}
                                    cognitiveLoad={cognitiveLoad}
                                    onActionSelect={() => { }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

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
                                onConfirm={() => setLockedIn(true)}
                            />
                        </motion.div>
                    );
                }
                // If locked in, the Modal is rendered outside this switch (portal/overlay style), 
                // but we can render a placeholder or the dashboard behind it.
                return <div key="prime-placeholder" />;

            case 'SCOUT':
            case 'PREVIEW':
                return (
                    <motion.div
                        key="scout"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className={styles.fullWidthContainer}
                    >
                        <SessionScoutPreview
                            concepts={currentSession!.concepts}
                            initialPhase={currentPhase === 'PREVIEW' ? 'preview' : 'scout'}
                            onComplete={handleScoutComplete}
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
                            onComplete={(data) => markSessionMapBuilt(data)}
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
                            onStartLearning={() => { startDiagnostic(); }}
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
                            concept={activeConcept}
                            allConcepts={currentSession!.concepts}
                            complexityScore={(activeConcept as any).complexityScore || 5}
                            userVelocity={1.0}
                            onLoopComplete={handleLoopComplete}
                            onSkip={handleSkipConcept}
                        />
                    </motion.div>
                );

            case 'RECONSTRUCT':
                return (
                    <motion.div
                        key="reconstruction"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={styles.fullWidthContainer}
                    >
                        <MapReconstructionTest
                            concepts={currentSession!.concepts}
                            originalMap={useLearningStore.getState().studySession?.conceptMap || null}
                            onComplete={(passed) => markSessionMapReconstructed(passed)}
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
                            onComplete={(_passed) => markSessionMastered()}
                        />
                    </motion.div>
                );

            case 'COMPLETE':
            default:
                return (
                    <div className={styles.emptyState}>
                        <Brain size={48} className={styles.emptyIcon} />
                        <h2>All Caught Up!</h2>
                        <p>You've completed all available concepts for now.</p>
                    </div>
                );
        }
    }
}
