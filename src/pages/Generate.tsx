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
 * @module pages/Generate
 */

import { useEffect, useRef } from 'react';
import { COLORS } from '@/shared/constants/theme-colors';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

import { AgentCore } from '@/components/generation/AgentCore';
import { CognitiveStream } from '@/components/generation/CognitiveStream';

import { useGenerationStore } from '@/store/generation-store';
import { useAuthStore } from '@/store/auth-store';
import { useCollisionDetection } from '@/shared/hooks/useCollisionDetection';
import { useGenerationEngine } from '@/shared/hooks/useGenerationEngine';
import { useGenerationRecovery } from '@/shared/hooks/useGenerationRecovery';
import { SUBJECT_TYPE_META } from '@/shared/types/macro-workflow';
import styles from './Generate.module.css';

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

export default function Generate() {
  // Route params and navigation
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const context = searchParams.get('context');

  // Generation store state
  const {
    bedrockConfig,
    passes,
    error,
    isGenerating,
    streamedConcepts,
    expectedConceptCount,
    pendingFile,
    progress,
    subjectType,
    setError: _setError,
  } = useGenerationStore();

  // Refs
  const hasStartedRef = useRef(false);
  const slowNetworkToastShown = useRef(false);
  const verifyingStartTimeRef = useRef<number | null>(null);

  // Generation engine hook
  const {
    startGenerationProcess,
    handleRetry,
  } = useGenerationEngine();

  // Recovery hook - reconnects to active jobs after page refresh
  useGenerationRecovery();

  // Collision detection hook
  const {
    showOverwriteModal,
    handleOverwrite,
    handleCancelOverwrite,
    checkForDuplicates,
  } = useCollisionDetection({
    onNoDuplicate: () => {
      if (!subject) return;
      const decodedSubject = decodeURIComponent(subject);
      // Generation is unstoppable - just start it
      startGenerationProcess(decodedSubject, context);
    },
    onExistingFound: (resultId) => {
      navigate(`/study/${resultId}`);
    },
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initial load effect - check auth and start generation flow
  useEffect(() => {
    if (!subject) return;

    // Check authentication
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated && !bedrockConfig) {
      navigate('/login', { state: { from: `/generate/${subject}` } });
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
  }, [subject, bedrockConfig, navigate, checkForDuplicates]);

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
          <div className={styles.agentWrapper}>
            <AgentCore
              state={agentState}
              intensity={intensity}
              glitch={intensity === 100}
            />
          </div>

          {/* The Inner Monologue */}
          <div className={styles.cognitiveStreamContainer}>
            <CognitiveStream
              pass={currentPass}
              intensity={intensity}
              isGenerating={isGenerating}
              subject={subject ? decodeURIComponent(subject) : undefined}
              subjectType={subjectType}
            />
          </div>
        </div>

        {/* HUD: Data & Stats */}
        <div className={styles.hudContainer}>
          {/* Left: Grounding Context */}
          <div className={styles.sourcePanel}>
            <span className={styles.hudLabel}>Exam Blueprint</span>
            <span className={styles.sourceTitle}>
              {pendingFile ? pendingFile.name : 'Standard Parametric Knowledge'}
            </span>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', opacity: 0.6 }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  background: pendingFile ? COLORS.success : COLORS.warning,
                  borderRadius: '50%',
                }}
              />
              <span style={{ fontSize: '0.7rem' }}>
                {pendingFile ? 'OBJECTIVES_LOCKED' : 'UNGROUNDED_MODE'}
              </span>
            </div>
            <AnimatePresence>
              {subjectType && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    background: `${SUBJECT_TYPE_META[subjectType].color}15`,
                    border: `1px solid ${SUBJECT_TYPE_META[subjectType].color}40`,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{SUBJECT_TYPE_META[subjectType].icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.65rem',
                      color: SUBJECT_TYPE_META[subjectType].color,
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}>
                      {SUBJECT_TYPE_META[subjectType].label}
                    </span>
                    <span style={{
                      fontSize: '0.6rem',
                      color: 'var(--color-text-muted)',
                    }}>
                      {SUBJECT_TYPE_META[subjectType].description}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Center: System Progress */}
          <div className={styles.progressPanel}>
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.2rem',
              }}
            >
              <span className={styles.hudLabel}>Construct Integrity</span>
              <span className={styles.hudLabel}>{Math.round(progress)}%</span>
            </div>
            <div className={styles.progressLine}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          {/* Right: Output Stats */}
          <div className={styles.outputPanel}>
            <span className={styles.hudLabel}>Nodes Synthesized</span>
            <div className={styles.nodeCounter}>
              {streamedConcepts.length}{' '}
              <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                /{' '}
                {expectedConceptCount || (
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    CALCULATING...
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
              <span className={styles.conceptEmoji}>
                {streamedConcepts[streamedConcepts.length - 1].mnemonic?.anchor?.match(
                  /\p{Emoji}/u
                )?.[0] || '💠'}
              </span>
              {streamedConcepts[streamedConcepts.length - 1].name}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Overlay */}
      {error && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog} style={{ border: `1px solid ${COLORS.error}` }}>
            <h3 style={{ color: COLORS.error }}>Critical Logic Failure</h3>
            <p>{error}</p>
            <div className={styles.confirmActions}>
              <button onClick={() => navigate('/')} className={styles.secondaryButton}>
                Abort
              </button>
              <button
                onClick={() => handleRetry(decodedSubject)}
                className={styles.primaryButton}
                style={{ background: COLORS.error, borderColor: COLORS.error }}
              >
                Re-Initialize
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
