/**
 * Velocity Learning Page
 * 
 * Main entry point for the SensaAI Learning Velocity Engine.
 * Orchestrates:
 * 1. Session Start (if none active)
 * 2. Diagnostic Assessment (if foundation gaps exist)
 * 3. Micro-Learning Loops (Test -> Learn -> Verify)
 * 4. Velocity Dashboard (Real-time metrics)
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain,
    Rocket,
    AlertCircle
} from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import VelocityDashboard from '@/components/learning/VelocityDashboard';
import MicroLearningLoopController from '@/components/learning/MicroLearningLoopController';
import DiagnosticLaunchSystem from '@/components/learning/DiagnosticLaunchSystem';
import SessionStartModal from '@/components/learning/SessionStartModal';
import type { SensaAILearningConcept } from '@/lib/content-adapter/transformer';
import { SessionScoutPreview } from '@/components/learning/SessionScoutPreview';
import ConceptMapBuilder from '@/components/learning/ConceptMapBuilder';
import MapReconstructionTest from '@/components/learning/MapReconstructionTest';
import MasteryChallenge from '@/components/learning/MasteryChallenge';
import styles from './VelocityLearning.module.css';

import { COLORS } from '@/constants/theme-colors';

export default function VelocityLearning() {
    const {
        currentSession,
        studySession,
        diagnosticSession,
        startDiagnostic,
        completeDiagnostic,
        startStudySession,
        completeConcept,
        setCurrentConcept,
        getNextConcept,
        startSession, // Initializes session timer
        setSessionPrimer,
        markSessionScouted,
        markSessionPreviewed
    } = useLearningStore();

    const [showStartModal, setShowStartModal] = useState(false);

    // Initialize session timer on mount if session exists and not started
    useEffect(() => {
        if (currentSession && !currentSession.progress.sessionStartTime) {
            startSession();
        }
    }, [currentSession?.id, startSession]); // Depend on ID instead of object

    // Derived state: Active Concept
    const activeConcept = useMemo(() => {
        if (!currentSession) return null;
        return currentSession.concepts.find(c => c.id === currentSession.progress.currentConceptId) || currentSession.concepts[0];
    }, [currentSession]);

    // Derived state: Should show Scout/Preview?
    // Show if: Active Session AND Learn New Goal AND (Not Scouted OR Not Previewed)
    const shouldShowScout = useMemo(() => {
        if (!studySession?.isActive) return false;
        if (studySession.goal !== 'learn-new') return false;
        return !studySession.scouted || !studySession.previewed;
    }, [studySession]);

    // Derived state: Should show Concept Map Builder?
    // Show if: Active Session AND Scouted AND Not MapBuilt
    const shouldShowConceptMapBuilder = useMemo(() => {
        if (!studySession?.isActive) return false;
        return studySession.scouted && !studySession.mapBuilt;
    }, [studySession]);

    // Derived state: Is Diagnostic Needed?
    // Diagnostic-First Rule: Show diagnostic if:
    // 1. An explicit diagnostic session exists and is incomplete, OR
    // 2. Fresh session (no completed concepts) AND content has enough foundation concepts (>= 5)
    // AND we are NOT in Scout mode (Scout comes before Diagnostic)
    // AND we are NOT in Concept Map Builder mode (Map Builder comes before Diagnostic)
    const showDiagnostic = useMemo(() => {
        if (!currentSession) return false;
        if (shouldShowScout) return false; // prioritizing Scout
        if (shouldShowConceptMapBuilder) return false; // prioritizing Concept Map Builder

        // If we have an active diagnostic session that isn't complete
        if (diagnosticSession && !diagnosticSession.isComplete) return true;

        // Check for fresh session (no completed concepts)
        const isFreshSession = currentSession.progress.completedConcepts.length === 0;

        // Check for enough foundation concepts (>= 5) to support a diagnostic
        const foundationConceptCount = currentSession.metadata?.foundationConcepts ?? 0;
        const hasEnoughFoundation = foundationConceptCount >= 5;

        // Auto-trigger diagnostic for fresh sessions with sufficient foundation concepts
        return isFreshSession && hasEnoughFoundation;
    }, [currentSession, diagnosticSession, shouldShowScout]);

    // Effect: Auto-trigger diagnostic on mount when conditions are met
    useEffect(() => {
        if (showDiagnostic && !diagnosticSession) {
            startDiagnostic();
        }
    }, [showDiagnostic, diagnosticSession, startDiagnostic]);

    // Effect: Enforce Phase 0 (Prime) if missing
    useEffect(() => {
        // Show modal if: 1) No study session exists, OR 2) Active session without primer
        if (currentSession && (!studySession || (studySession.isActive && !studySession.primer)) && !showStartModal) {
            setShowStartModal(true);
        }
    }, [currentSession, studySession?.isActive, studySession?.primer, showStartModal]);

    // Handlers
    const handleStartSession = (goal: any, duration: number, primer?: { reason: string; action: string; reward: string }) => {
        startStudySession(goal, duration);
        if (primer) {
            setSessionPrimer(primer);
        }
        setShowStartModal(false);
    };

    const handleScoutComplete = () => {
        markSessionScouted();
        markSessionPreviewed();
    };

    const handleLoopComplete = (_outcome: 'mastered' | 'needs-learning' | 'needs-review', _timeSpent: number) => {
        if (!activeConcept) return;

        // 1. Mark concept as complete
        completeConcept(activeConcept.id);

        // 2. Advance to next concept (handled by completeConcept logic)
        // Note: completeConcept automatically sets next concept ID in store
    };

    const handleSkipConcept = () => {
        const nextId = getNextConcept();
        if (nextId) {
            setCurrentConcept(nextId);
        }
    };

    const handleDiagnosticComplete = (results: any) => {
        completeDiagnostic(results);
        // After diagnostic, we might want to jump to a specific concept based on gaps
        // For now, let the store logic handle standard flow
    };

    // 1. Empty State - No Content Loaded
    if (!currentSession) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <AlertCircle size={48} className={styles.emptyIcon} />
                    <h2>No Active Learning Session</h2>
                    <p>Please generate or load content from the Home screen to begin.</p>
                    {/* Ideally a button to go Home, but for now simple message */}
                </div>
            </div>
        );
    }

    // 2. Active Learning Interface
    return (
        <div className={styles.container}>
            {/* Header with Dashboard */}
            <header className={styles.header}>
                <div className={styles.title}>
                    <Rocket size={24} color={COLORS.info} />
                    <span>Velocity Learning</span>
                </div>
                {/* Dashboard integrated in header or just below */}
            </header>

            <main className={styles.content}>
                <div className={styles.mainArea}>
                    {/* Velocity Dashboard */}
                    <VelocityDashboard
                        sessionConceptsCompleted={currentSession.progress.conceptsLearnedToday}
                        sessionStartTime={currentSession.progress.sessionStartTime ? new Date(currentSession.progress.sessionStartTime) : undefined}
                        // Simple mapping or fetch real cognitive load
                        cognitiveLoad={0.4}
                        onActionSelect={(action) => console.log('Action selected:', action)}
                    />

                    <AnimatePresence mode="wait">
                        {/* Mode 0: Scout & Preview */}
                        {shouldShowScout ? (
                            <motion.div
                                key="scout"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                className={styles.fullWidthContainer}
                            >
                                <SessionScoutPreview
                                    concepts={currentSession.concepts}
                                    initialPhase={studySession?.scouted ? 'preview' : 'scout'}
                                    onComplete={handleScoutComplete}
                                />
                            </motion.div>
                        ) : shouldShowConceptMapBuilder ? (
                            <motion.div
                                key="map-builder"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={styles.fullWidthContainer}
                            >
                                <ConceptMapBuilder
                                    concepts={currentSession.concepts}
                                    onComplete={(data) => useLearningStore.getState().markSessionMapBuilt(data)}
                                />
                            </motion.div>
                        ) : showDiagnostic ? (
                            <motion.div
                                key="diagnostic"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <DiagnosticLaunchSystem
                                    concepts={currentSession.concepts as unknown as SensaAILearningConcept[]}
                                    domain={currentSession.subject}
                                    diagnosticReady={currentSession.metadata?.diagnosticReady ?? false}
                                    onStartLearning={() => { startDiagnostic(); }}
                                    onDiagnosticComplete={handleDiagnosticComplete}
                                />
                            </motion.div>
                        ) : (
                            /* Mode 2: Micro-Learning Loop */
                            // All concepts completed? Check if Phase 3 (Reconstruction) is needed
                            // Only show if Prime phase is complete
                            activeConcept && studySession?.primer ? (
                                <motion.div
                                    key={`loop-${activeConcept.id}`}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <MicroLearningLoopController
                                        concept={activeConcept}
                                        allConcepts={currentSession.concepts}
                                        // Use SensaAI metadata if available, else default
                                        complexityScore={(activeConcept as any).complexityScore || 5}
                                        userVelocity={1.0} // TODO: Get from store
                                        onLoopComplete={handleLoopComplete}
                                        onSkip={handleSkipConcept}
                                    />
                                </motion.div>
                            ) : (
                                studySession && !studySession.mapReconstructed && studySession.mapBuilt ? (
                                    <motion.div
                                        key="reconstruction"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={styles.fullWidthContainer}
                                    >
                                        <MapReconstructionTest
                                            concepts={currentSession.concepts}
                                            originalMap={studySession?.conceptMap || null}
                                            onComplete={(passed) => useLearningStore.getState().markSessionMapReconstructed(passed)}
                                        />
                                    </motion.div>
                                ) : studySession && studySession.mapReconstructed && !studySession.mastered ? (
                                    <motion.div
                                        key="mastery"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={styles.fullWidthContainer}
                                    >
                                        <MasteryChallenge
                                            concepts={currentSession.concepts}
                                            onComplete={(_passed) => useLearningStore.getState().markSessionMastered()}
                                        />
                                    </motion.div>
                                ) : (
                                    <div className={styles.emptyState}>
                                        <Brain size={48} className={styles.emptyIcon} />
                                        <h2>All Caught Up!</h2>
                                        <p>You've completed all available concepts for now.</p>
                                    </div>
                                )
                            )
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Start Modal */}
            <AnimatePresence>
                {showStartModal && (
                    <SessionStartModal
                        subjectName={currentSession.subject}
                        totalConcepts={currentSession.concepts.length}
                        completedConcepts={currentSession.progress.completedConcepts.length}
                        onStart={handleStartSession}
                        onClose={() => setShowStartModal(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
