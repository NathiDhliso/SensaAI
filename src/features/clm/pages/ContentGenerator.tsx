/**
 * Generate Page - Content Generation UI
 * 
 * This page displays the AI generation process with:
 * - AgentCore animation showing generation state
 * - CognitiveStream for progress feedback
 * - HUD displaying stats and progress
 * - Modals for collision detection and cancellation
 * 
 * Logic has been extracted to:
 * - useCollisionDetection: Duplicate subject handling
 * - useGenerationEngine: Generation orchestration
 * 
 * @module pages/ContentGenerator
 */
import { useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { AgentCore } from '@/components/generation/AgentCore';
import { CognitiveStream } from '@/components/generation/CognitiveStream';
import { useGenerationStore } from '@/store/generation-store';
import { useAuthStore } from '@/store/auth-store';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import { useCollisionDetection } from '@/shared/hooks/useCollisionDetection';
import { useGenerationEngine } from '@/shared/hooks/useGenerationEngine';
import { useGenerationRecovery } from '@/shared/hooks/useGenerationRecovery';
import { isGenerationAllowed } from '@/shared/constants/generator-allowlist';
import { SUBJECT_TYPE_META } from '@/shared/types/macro-workflow';
import styles from './ContentGenerator.module.css';
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
type AgentState = 'idle' | 'scanning' | 'thinking' | 'writing' | 'verifying' | 'complete';
/**
 * Calculate agent animation intensity based on current pass
 */
function getAgentIntensity(passes: Record<number, string>, isGenerating: boolean): number {
    if (!isGenerating) return 0;
    if (passes[1] === 'in-progress') return 40; // Scanning
    if (passes[2] === 'in-progress') return 60; // Thinking
    if (passes[3] === 'in-progress') return 80; // Writing
    if (passes[4] === 'in-progress') return 100; // Verifying (Max Glitch)
    return 20; // Idle/Complete
}
/**
 * Determine agent visual state based on current pass
 */
function getAgentState(passes: Record<number, string>, isGenerating: boolean): AgentState {
    if (!isGenerating) return 'idle';
    if (passes[1] === 'in-progress') return 'scanning';
    if (passes[2] === 'in-progress') return 'thinking';
    if (passes[3] === 'in-progress') return 'writing';
    if (passes[4] === 'in-progress') return 'verifying';
    if (passes[4] === 'complete') return 'complete';
    return 'idle';
}
/**
 * Get current pass number for cognitive stream
 */
function getCurrentPass(passes: Record<number, string>): number {
    if (passes[1] === 'in-progress') return 1;
    if (passes[2] === 'in-progress') return 2;
    if (passes[3] === 'in-progress') return 3;
    if (passes[4] === 'in-progress') return 4;
    return 0;
}
// ============================================================================
// COMPONENT
// ============================================================================
export default function ContentGenerator() {
    // Route params and navigation
    const { subject } = useParams<{ subject: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = location.state as { context?: string; trunks?: string[] } | null;
    const context = locationState?.context ?? null;
    const trunks = locationState?.trunks;
    // Generation store state
    const {
        passes,
        error,
        isGenerating,
        streamedConcepts,
        expectedConceptCount,
        pendingFile,
        progress,
        currentActivity,
        subjectType,
        setError: _setError
    } = useGenerationStore();
    const displayProgress = (() => {
        if (!isGenerating && passes[4] === 'complete') return 100;
        const passFloors: Record<number, number> = { 1: 3, 2: 15, 3: 60, 4: 90 };
        const passMax: Record<number, number>    = { 1: 14, 2: 59, 3: 89, 4: 99 };
        for (let p = 4; p >= 1; p--) {
            if (passes[p] === 'complete') {
                return passMax[p];
            }
            if (passes[p] === 'in-progress') {
                const floor = passFloors[p];
                const max = passMax[p];
                return Math.max(floor, Math.min(progress, max));
            }
        }
        return Math.min(progress, 9);
    })();
    const { isScholarly } = useVisualTheme();
    // Refs
    const hasStartedRef = useRef(false);
    const slowNetworkToastShown = useRef(false);
    const verifyingStartTimeRef = useRef<number | null>(null);
    // Generation engine hook
    const {
        startGenerationProcess,
        handleRetry
    } = useGenerationEngine();
    // Recovery hook - reconnects to active jobs after page refresh
    useGenerationRecovery();
    // Collision detection hook
    const {
        showOverwriteModal,
        handleOverwrite,
        handleCancelOverwrite,
        checkForDuplicates,
        isCheckingCollision
    } = useCollisionDetection({
        onNoDuplicate: () => {
            if (!subject) return;
            const decodedSubject = decodeURIComponent(subject);
            // Generation is unstoppable - just start it
            startGenerationProcess(decodedSubject, context, trunks);
        },
        onExistingFound: (resultId) => {
            navigate(`/study/${resultId}`);
        }
    });
    // ============================================================================
    // EFFECTS
    // ============================================================================
    // Initial load effect - check auth and start generation flow
    useEffect(() => {
        if (!subject) return;
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
            navigate('/login', { state: { from: `/generate/${subject}` } });
            return;
        }
        if (!isGenerationAllowed()) {
            navigate('/');
            return;
        }
        // If generation is already in progress, don't show dialogs - just display progress
        const { isGenerating: currentlyGenerating } = useGenerationStore.getState();
        if (currentlyGenerating) {
            hasStartedRef.current = true;
            return;
        }
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;
        const decodedSubject = decodeURIComponent(subject);
        checkForDuplicates(decodedSubject);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subject, navigate]);
    // Beforeunload warning
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isGenerating) {
                e.preventDefault();
                e.returnValue = 'Generation in progress. Are you sure you want to leave?';
                return e.returnValue;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isGenerating]);
    // Stuck-state detection: if page is idle with no error after timeout, show error
    // Accounts for collision detection (10s + 5s) plus Lambda cold starts
    useEffect(() => {
        if (isGenerating || error || isCheckingCollision || showOverwriteModal) return;

        const timeout = setTimeout(() => {
            const currentState = useGenerationStore.getState();
            if (!currentState.isGenerating && !currentState.error) {
                _setError(
                    'Unable to connect to the generation server. ' +
                    'This usually means the server is temporarily unavailable. ' +
                    'Please check your connection and try again.'
                );
            }
        }, 30000);

        return () => clearTimeout(timeout);
    }, [isGenerating, error, isCheckingCollision, showOverwriteModal, _setError]);

    // Slow network detection for link validation phase
    useEffect(() => {
        if (passes[4] === 'in-progress' && !verifyingStartTimeRef.current) {
            verifyingStartTimeRef.current = Date.now();
            slowNetworkToastShown.current = false;
        }
        if (passes[4] !== 'in-progress') {
            verifyingStartTimeRef.current = null;
        }
    }, [passes]);
    useEffect(() => {
        if (!verifyingStartTimeRef.current || slowNetworkToastShown.current) return;
        const timeout = setTimeout(() => {
            if (!slowNetworkToastShown.current) {
                slowNetworkToastShown.current = true;
            }
        }, 10000);
        return () => clearTimeout(timeout);
    }, [passes]);
    // ============================================================================
    // COMPUTED VALUES
    // ============================================================================
    const intensity = getAgentIntensity(passes, isGenerating);
    const agentState = getAgentState(passes, isGenerating);
    const currentPass = getCurrentPass(passes);
    const decodedSubject = subject ? decodeURIComponent(subject) : '';
    // ============================================================================
    // RENDER
    // ============================================================================
    return (
        <div className={styles.container}>
            {/* Cinematic Cockpit */}
            <div className={styles.cockpit}>
                {/* Top Left: Navigate Home (generation continues in background) */}
                <button onClick={() => navigate('/')} className={styles.abortButton}>
                    <ArrowLeft size={14} /> Hide Generation
                </button>
                {/* Center Stage: The Entity */}
                <div className={styles.centerStage}>
                    <AgentCore
                        state={agentState}
                        intensity={intensity}
                        glitch={intensity === 100}
                    />
                    <CognitiveStream
                        pass={currentPass}
                        intensity={intensity}
                        isGenerating={isGenerating}
                        isInitializing={isCheckingCollision && !isGenerating && !error}
                        subject={subject ? decodeURIComponent(subject) : undefined}
                        subjectType={subjectType}
                    />
                </div>
                {/* HUD: Data & Stats */}
                <div className={styles.hudContainer}>
                    {/* Left: Grounding Context */}
                    <div className={styles.sourcePanel}>
                        <span className={styles.hudLabel}>Exam Blueprint</span>
                        <span className={styles.sourceTitle}>
                            {pendingFile ? pendingFile.name : context ? 'Pasted Exam Objectives' : 'Standard Parametric Knowledge'}
                        </span>
                        <div className={styles.sourceBadge}>
                            <div className={`${styles.sourceDot} ${(pendingFile || context) ? styles.sourceDotActive : styles.sourceDotInactive}`} />
                            {(pendingFile || context) ? 'OBJECTIVES_LOCKED' : 'UNGROUNDED_MODE'}
                        </div>
                        <AnimatePresence>
                            {subjectType && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className={styles.subjectTypeBadge}
                                    style={{
                                        background: `${SUBJECT_TYPE_META[subjectType].color}12`,
                                        border: `1px solid ${SUBJECT_TYPE_META[subjectType].color}35`,
                                    }}
                                >
                                    <span className={styles.subjectTypeIcon}>{SUBJECT_TYPE_META[subjectType].icon}</span>
                                    <div className={styles.subjectTypeContent}>
                                        <span className={styles.subjectTypeLabel} style={{ color: SUBJECT_TYPE_META[subjectType].color }}>
                                            {SUBJECT_TYPE_META[subjectType].label}
                                        </span>
                                        <span className={styles.subjectTypeDesc}>
                                            {SUBJECT_TYPE_META[subjectType].description}
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    {/* Center: System Progress */}
                    <div className={styles.progressPanel}>
                        <div className={styles.progressHeader}>
                            <span className={styles.progressTitle}>Construct Integrity</span>
                            <span className={styles.progressPercent}>{Math.round(displayProgress)}%</span>
                        </div>
                        <div className={styles.progressTrack}>
                            <div className={styles.progressFill} style={{ width: `${displayProgress}%` }} />
                        </div>
                        <span className={styles.progressActivity}>{currentActivity}</span>
                    </div>
                    {/* Right: Output Stats */}
                    <div className={styles.outputPanel}>
                        <span className={styles.hudLabel}>Nodes Synthesized</span>
                        <div className={styles.nodeCounter}>
                            {streamedConcepts.length}
                            <span className={styles.nodeCounterSub}>
                                {' '}/ {expectedConceptCount || (
                                    <motion.span
                                        animate={{ opacity: [0.4, 1, 0.4] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        —
                                    </motion.span>
                                )}
                            </span>
                        </div>
                        <span className={styles.nodeLabel}>Knowledge Graph Density</span>
                    </div>
                </div>
                {/* Pop-up for latest concept */}
                <AnimatePresence>
                    {streamedConcepts.length > 0 && isGenerating && (
                        <motion.div
                            key={streamedConcepts[streamedConcepts.length - 1].id}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className={styles.latestConcept}
                        >
                            {!isScholarly && (
                                <span className={styles.conceptEmoji}>
                                    {streamedConcepts[streamedConcepts.length - 1].mnemonic?.anchor?.match(
                                        /\p{Emoji}/u
                                    )?.[0] || ''}
                                </span>
                            )}
                            {streamedConcepts[streamedConcepts.length - 1].name}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {/* Error Overlay */}
            {error && (
                <div className={styles.confirmOverlay}>
                    <div className={styles.confirmDialog} style={{ borderColor: 'var(--color-error)' }}>
                        <AlertCircle size={32} style={{ color: 'var(--color-error)', marginBottom: '0.5rem' }} />
                        <h3 style={{ color: 'var(--color-error)' }}>Generation Failed</h3>
                        <p>{error}</p>
                        <div className={styles.confirmActions}>
                            <button onClick={() => navigate('/')} className={styles.secondaryButton}>
                                Back to Home
                            </button>
                            <button
                                onClick={() => handleRetry(decodedSubject)}
                                className={styles.primaryButton}
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Overwrite Confirmation Modal */}
            {showOverwriteModal &&
                createPortal(
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={styles.modalOverlay}
                    >
                        <div className={styles.modalContent} style={{ borderColor: 'var(--color-warning)' }}>
                            <div className={styles.modalHeader}>
                                <AlertCircle size={24} color="var(--color-warning)" />
                                <h3>Duplicate Subject Detected</h3>
                            </div>
                            <div className={styles.modalBody}>
                                <p>
                                    You already have generated results for <strong>{decodedSubject}</strong>.
                                </p>
                                <p>
                                    Generating again will <strong>permanently delete</strong> the previous version
                                    to keep your library clean.
                                </p>
                            </div>
                            <div className={styles.modalActions}>
                                <button onClick={handleCancelOverwrite} className={styles.cancelButton}>
                                    Cancel
                                </button>
                                <button
                                    onClick={handleOverwrite}
                                    className={styles.dangerButton}
                                    style={{ backgroundColor: 'var(--color-warning)', color: 'black' }}
                                >
                                    <Trash2 size={16} />
                                    Overwrite & Start
                                </button>
                            </div>
                        </div>
                    </motion.div>,
                    document.body
                )}
        </div>
    );
}
