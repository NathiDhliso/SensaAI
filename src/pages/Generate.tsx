import { useState, useEffect, useCallback, useRef } from 'react';
import { COLORS } from '@/constants/theme-colors';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

import { AgentCore } from '@/components/generation/AgentCore';
import { CognitiveStream } from '@/components/generation/CognitiveStream';

import { generateAlias } from '@/lib/utils/alias-generator';
import { conceptsApi } from '@/lib/api/concepts';
import { useGenerationStore } from '@/store/generation-store';
import { useAuthStore } from '@/store/auth-store';
import { generateWithBackend, uploadExamBlueprint } from '@/lib/generation/backend-generator';
import { parseAndLoadContent } from '@/lib/content-loader';
import { UI_TIMINGS } from '@/constants/ui-constants';
import styles from './Generate.module.css';

import type { PassStatus, Pass1Result, ValidationResult, LifecyclePhases, StreamedConceptPreview, GenerationResult } from '@/lib/types/generation';

// Local type for progress callback data
type ProgressData = {
  message?: string;
  partial?: string;
  progress?: number;
  content?: string;
  lifecycle?: LifecyclePhases;
  roleScope?: string;
  streamedConcepts?: StreamedConceptPreview[];
} & Partial<Pass1Result> & Partial<ValidationResult>;

export default function Generate() {
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const context = searchParams.get('context');

  const {
    bedrockConfig,
    passes,
    error,
    isGenerating,
    streamedConcepts,
    expectedConceptCount,
    startGeneration,
    completeGeneration,
    setError,
    addRecentSubject,
    canResumeFromCheckpoint,
    getCheckpointResumeData,
    clearCheckpoint,
    saveCheckpoint,
    updateGenerationProgress,
    addStreamedConcept,
    setConstructionPhase,
    setExpectedConceptCount,
  } = useGenerationStore();

  const [_showExitConfirm, _setShowExitConfirm] = useState(false);

  // Collision / Alias State
  const [_isCheckingCollision, setIsCheckingCollision] = useState(true);
  const [collisionJobId, setCollisionJobId] = useState<string | null>(null);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [_generatedAlias, setGeneratedAlias] = useState<string>('');

  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const hasStartedRef = useRef(false);
  const resultIdRef = useRef<string | null>(null);

  // Throttle ref for progress updates
  const lastProgressUpdateRef = useRef<number>(0);
  const PROGRESS_THROTTLE_MS = 250;

  // Shared callback function to handle progress updates
  const createProgressCallback = useCallback(() => {
    return (pass: number, status: PassStatus, data?: ProgressData) => {
      // Throttle frequent progress updates (but allow status changes through)
      const now = Date.now();
      if (status === 'in-progress' && data?.partial) {
        if (now - lastProgressUpdateRef.current < PROGRESS_THROTTLE_MS) {
          return; // Skip this update - too soon
        }
        lastProgressUpdateRef.current = now;
      }

      const update: {
        pass: number;
        status: PassStatus;
        activity?: string;
        progress?: number;
        pass1Data?: Pass1Result;
        pass2Content?: string;
        pass3Content?: string;
        validation?: ValidationResult;
      } = { pass, status };

      // Set activity message
      if (data?.message) {
        update.activity = data.message;
      } else if (data?.partial) {
        update.activity = 'Generating detailed content...';
      }

      // Set progress
      if (data?.progress !== undefined) {
        update.progress = data.progress;
      }

      // Handle pass-specific data
      if (pass === 1 && status === 'complete' && data && 'domain' in data && data.domain) {
        update.pass1Data = data as Pass1Result;
        if (data.concepts) {
          setExpectedConceptCount(data.concepts.length);
          setConstructionPhase('framing');
        }
      }

      if (pass === 2 && status === 'complete' && data?.content) {
        update.pass2Content = data.content;
      }

      // Handle streamed concepts for optimistic UI
      if (pass === 3 && data?.streamedConcepts && data.streamedConcepts.length > 0) {
        setConstructionPhase('detailing');
        // Add each new concept to the store
        for (const concept of data.streamedConcepts) {
          addStreamedConcept({
            id: `streamed-${concept.order}`,
            name: concept.name,
            order: concept.order,
            stageId: 'stage-1',
            mnemonic: concept.anchor ? { tier: 'foundation', anchor: concept.anchor, story: '' } : undefined,
            phase1: { hookSentence: '', microMetaphor: '', prerequisite: '', selection: [], execution: '' },
            phase2: [],
            phase3: { tool: '', metrics: [], thresholds: '' },
            criticalDistinctions: [],
            designBoundaries: [],
            examFocus: [],
          });
        }
      }

      if (pass === 3 && status === 'complete' && data?.content) {
        update.pass3Content = data.content;
      }

      if (pass === 4 && status === 'complete' && data) {
        update.validation = data as ValidationResult;
        setConstructionPhase('complete');
      }

      updateGenerationProgress(update);

      if (status === 'complete') {
        saveCheckpoint(pass);
      }
    };
  }, [updateGenerationProgress, saveCheckpoint, addStreamedConcept, setConstructionPhase, setExpectedConceptCount]);

  // Proceed with overwrite
  const handleOverwrite = async () => {
    if (collisionJobId) {
      // Optimistic delete - don't block UI too long, but ideally wait for success
      try {
        await conceptsApi.deleteJob(collisionJobId);
      } catch (_e) {
        console.warn("Failed to delete old job, continuing anyway");
      }
    }
    setShowOverwriteModal(false);
    if (subject) {
      startGenerationProcess(decodeURIComponent(subject));
    }
  };

  // Cancel overwrite -> go back
  const handleCancelOverwrite = () => {
    navigate('/');
  };

  // Start generation logic
  const startGenerationProcess = useCallback((decodedSubject: string, resumeData?: ReturnType<typeof getCheckpointResumeData>) => {
    // Generate new alias for this session
    const alias = generateAlias();
    setGeneratedAlias(alias);

    const controller = new AbortController();
    setAbortController(controller);
    abortControllerRef.current = controller;

    const progressCallback = createProgressCallback();
    const { currentFileContext, pendingFile, setPendingFile } = useGenerationStore.getState();
    let effectiveContext = context || '';

    const handleGenerationSuccess = async (result: GenerationResult) => {
      completeGeneration(result);
      clearCheckpoint();

      // Auto-save to storage
      const currentState = useGenerationStore.getState();
      const currentPass1 = currentState.pass1Data;
      const currentValidation = currentState.validation;

      if (currentPass1 && currentValidation) {
        const resultId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        resultIdRef.current = resultId;
        const savedResult = {
          id: resultId,
          subject: decodedSubject,
          alias: alias, // Save key alias
          generatedAt: new Date().toISOString(),
          fullDocument: result.fullDocument,
          pass1Data: {
            domain: currentPass1.domain,
            roleScope: currentPass1.roleScope,
            lifecycle: currentPass1.lifecycle,
            concepts: currentPass1.concepts,
          },
          validation: currentValidation,
          savedLocally: true,
        };

        const { storageManager } = await import('@/lib/storage');
        try {
          await storageManager.saveResult(savedResult);
          const loadResult = parseAndLoadContent(result.fullDocument, resultId);
          if (loadResult.success) {
            // Navigate to Dashboard instead of straight to Velocity Learning
            setTimeout(() => navigate(`/study/${resultId}`), UI_TIMINGS.DELAY_SHORT);
          } else {
            navigate(`/study/${resultId}`);
          }
        } catch (storageError) {
          console.error('[Generate] Storage save failed:', storageError);
          navigate(`/study/${resultId}`);
        }
      } else {
        navigate(`/study/${Date.now()}`);
      }
    };

    const handleGenerationError = (err: unknown) => {
      console.error('Generation error:', err);
      const message = err instanceof Error ? err.message : String(err);
      if (message === 'Generation cancelled by user') {
        navigate('/');
      } else {
        setError(message || 'Generation failed.');
      }
    };

    if (resumeData) {
      useGenerationStore.setState({
        ...resumeData.restoredState,
        currentSubject: decodedSubject,
        isGenerating: true,
        error: null,
      });

      generateWithBackend(decodedSubject, progressCallback, controller.signal, effectiveContext || undefined, resumeData.startFromPass)
        .then(handleGenerationSuccess)
        .catch(handleGenerationError);
      return;
    }

    if (pendingFile) {
      startGeneration(decodedSubject, context || undefined);
      addRecentSubject(decodedSubject);
      progressCallback(1, 'in-progress', { message: 'Uploading Blueprint to Secure Storage...', progress: 2 });
      uploadExamBlueprint(pendingFile).then(s3Url => {
        const blueprintContext = `[BLUEPRINT_ID]: ${s3Url}\n[FILENAME]: ${pendingFile.name}`;
        setPendingFile(null); // Clear pending file
        generateWithBackend(decodedSubject, progressCallback, controller.signal, blueprintContext)
          .then(handleGenerationSuccess)
          .catch(handleGenerationError);
      }).catch(handleGenerationError);
      return;
    }

    if (currentFileContext) {
      const fileHeader = `\n\n[VERIFIED_SOURCE_MATERIAL]:\nProcessing Mode: ${currentFileContext.mode}\nSource: ${currentFileContext.fileName}\n\n${currentFileContext.content}`;
      effectiveContext += fileHeader;
    }

    startGeneration(decodedSubject, effectiveContext || undefined);
    addRecentSubject(decodedSubject);

    generateWithBackend(decodedSubject, progressCallback, controller.signal, effectiveContext || undefined)
      .then(handleGenerationSuccess)
      .catch(handleGenerationError);
  }, [createProgressCallback, startGeneration, addRecentSubject, completeGeneration, clearCheckpoint, setError, navigate, context]);

  // Initial load effect
  useEffect(() => {
    if (!subject) return;

    // Check authentication
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated && !bedrockConfig) {
      navigate('/login', { state: { from: `/generate/${subject}` } });
      return;
    }

    if (hasStartedRef.current) return;

    const decodedSubject = decodeURIComponent(subject);

    // Initial Check for Duplicates
    const checkDuplicates = async () => {
      if (!subject) return;

      const user = useAuthStore.getState().user;

      if (!user) {
        setIsCheckingCollision(false);
        // If no user, can't check for duplicates, proceed with generation
        startGenerationProcess(decodedSubject);
        return;
      }

      try {
        const result = await conceptsApi.listJobs(user.id);

        // Smart collision detection using normalized subjects + fuzzy matching
        const { normalizeSubject, levenshtein } = await import('@/lib/utils/alias-generator');
        const normalizedInput = normalizeSubject(decodedSubject);

        const duplicate = result.jobs.find(j => {
          if (j.status !== 'completed') return false;
          const normalizedJob = normalizeSubject(j.subject);
          // Exact match after normalization?
          if (normalizedJob === normalizedInput) return true;
          // Fuzzy match (distance <= 2)?
          const dist = levenshtein(normalizedJob, normalizedInput);
          return dist <= 2;
        });

        if (duplicate) {
          setCollisionJobId(duplicate.jobId);
          setShowOverwriteModal(true);
        } else {
          // No duplicate, check for local existing or checkpoint
          checkForExistingAndCheckpoint();
        }
      } catch (err) {
        console.error("Failed to check duplicates:", err);
        // Fail open - just start
        checkForExistingAndCheckpoint();
      } finally {
        setIsCheckingCollision(false);
      }
    };

    const checkForExistingAndCheckpoint = async () => {
      try {
        const { storageManager } = await import('@/lib/storage');
        const existing = await storageManager.findLatestBySubject(decodedSubject);
        if (existing) {
          const shouldLoad = window.confirm(
            `Shared Intelligence Found! 🧠\n\n` +
            `We found an existing version of "${decodedSubject}" generated on ${new Date(existing.generatedAt).toLocaleDateString()}.\n\n` +
            `Would you like to load this shared knowledge instead of generating from scratch?`
          );
          if (shouldLoad) {
            navigate(`/study/${existing.id}`);
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to check shared intelligence:', e);
      }

      if (canResumeFromCheckpoint(decodedSubject)) {
        hasStartedRef.current = false; // Reset to allow resume dialog to show
        setShowResumeDialog(true);
      } else {
        startGenerationProcess(decodedSubject);
      }
    };

    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      checkDuplicates();
    }

  }, [subject, bedrockConfig, context, navigate, canResumeFromCheckpoint, startGenerationProcess]);


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

  const handleConfirmCancel = () => {
    setShowConfirmCancel(false);
    abortController?.abort();
    navigate('/');
  };

  const handleResumeFromCheckpoint = () => {
    if (!subject || !bedrockConfig) return;
    const decodedSubject = decodeURIComponent(subject);
    const resumeData = getCheckpointResumeData();
    if (!resumeData) return;
    setShowResumeDialog(false);
    hasStartedRef.current = true;
    startGenerationProcess(decodedSubject, resumeData);
  };

  const handleStartFresh = () => {
    clearCheckpoint();
    setShowResumeDialog(false);
    hasStartedRef.current = false;
    window.location.reload();
  };

  const handleRetry = () => {
    if (!subject) return;
    setError(null);
    hasStartedRef.current = false;
    const decodedSubject = decodeURIComponent(subject);
    startGenerationProcess(decodedSubject);
  };

  const handleCancelClick = () => {
    setShowConfirmCancel(true);
  };

  // Determine Agent Intensity based on Pass
  const getAgentIntensity = (): number => {
    if (!isGenerating) return 0;
    if (passes[1] === 'in-progress') return 40; // Scanning
    if (passes[2] === 'in-progress') return 60; // Thinking
    if (passes[3] === 'in-progress') return 80; // Writing
    if (passes[4] === 'in-progress') return 100; // Verifying (Max Glitch)
    return 20; // Idle/Complete
  };

  const getAgentState = (): 'idle' | 'scanning' | 'thinking' | 'writing' | 'verifying' | 'complete' => {
    if (!isGenerating) return 'idle';
    if (passes[1] === 'in-progress') return 'scanning';
    if (passes[2] === 'in-progress') return 'thinking';
    if (passes[3] === 'in-progress') return 'writing';
    if (passes[4] === 'in-progress') return 'verifying';
    if (passes[4] === 'complete') return 'complete';
    return 'idle';
  };

  const intensity = getAgentIntensity();
  const agentState = getAgentState();

  // Track current pass number for Cognitive Stream
  const currentPass = passes[1] === 'in-progress' ? 1 :
    passes[2] === 'in-progress' ? 2 :
      passes[3] === 'in-progress' ? 3 :
        passes[4] === 'in-progress' ? 4 : 0;

  return (
    <div className={styles.container}>

      {/* Cinematic Cockpit */}
      <div className={styles.cockpit}>

        {/* Top Left: Abort */}
        <button onClick={handleCancelClick} className={styles.abortButton}>
          <ArrowLeft size={14} /> Abort Link
        </button>

        {/* Center Stage: The Entity */}
        <div className={styles.centerStage}>
          <div className={styles.agentWrapper}>
            <AgentCore
              state={agentState}
              intensity={intensity}
              glitch={intensity === 100} // Max intensity = glitch
            />
          </div>

          {/* The Inner Monologue */}
          <div className={styles.cognitiveStreamContainer}>
            <CognitiveStream
              pass={currentPass}
              intensity={intensity}
              isGenerating={isGenerating}
            />
          </div>
        </div>

        {/* HUD: Data & Stats */}
        <div className={styles.hudContainer}>

          {/* Left: Source Data */}
          <div className={styles.sourcePanel}>
            <span className={styles.hudLabel}>Input Vector</span>
            <span className={styles.sourceTitle}>{decodeURIComponent(subject || 'Unknown Source')}</span>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', opacity: 0.6 }}>
              <div style={{ width: '8px', height: '8px', background: COLORS.success, borderRadius: '50%' }}></div>
              <span style={{ fontSize: '0.7rem' }}>SIGNAL_LOCKED</span>
            </div>
          </div>

          {/* Center: System Progress */}
          <div className={styles.progressPanel}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
              <span className={styles.hudLabel}>Construct Integrity</span>
              <span className={styles.hudLabel}>{Math.round(useGenerationStore.getState().progress)}%</span>
            </div>
            <div className={styles.progressLine}>
              <div className={styles.progressFill} style={{ width: `${useGenerationStore.getState().progress}%` }}></div>
            </div>
          </div>

          {/* Right: Output Stats */}
          <div className={styles.outputPanel}>
            <span className={styles.hudLabel}>Nodes Synthesized</span>
            <div className={styles.nodeCounter}>
              {streamedConcepts.length} <span style={{ fontSize: '0.9rem', opacity: 0.5 }}>/ {expectedConceptCount || (
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  CALCULATING...
                </motion.span>
              )}</span>
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
                {streamedConcepts[streamedConcepts.length - 1].mnemonic?.anchor?.match(/\p{Emoji}/u)?.[0] || '💠'}
              </span>
              {streamedConcepts[streamedConcepts.length - 1].name}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {showResumeDialog && (
        <div className={styles.confirmOverlay}>
          <div className={styles.resumeDialog}>
            <h2>Resume Cognitive Trace?</h2>
            <p>
              Found residual memory signature from{' '}
              {(() => {
                const checkpoint = useGenerationStore.getState().checkpoint;
                if (!checkpoint) return 'earlier';
                const age = Date.now() - checkpoint.timestamp;
                const minutes = Math.floor(age / 60000);
                return minutes < 1 ? 'just now' : `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
              })()}
            </p>
            <div className={styles.dialogActions}>
              <button onClick={handleResumeFromCheckpoint} className={styles.primaryButton}>
                Re-Integrate
              </button>
              <button onClick={handleStartFresh} className={styles.secondaryButton}>
                Purge & Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Cancel Dialog */}
      {showConfirmCancel && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog}>
            <h3>Disengage Neural Link?</h3>
            <p>Warning: Premature disconnection will result in concept fragmentation.</p>
            <div className={styles.confirmActions}>
              <button onClick={() => setShowConfirmCancel(false)} className={styles.secondaryButton}>
                Maintain Link
              </button>
              <button onClick={handleConfirmCancel} className={styles.cancelConfirmButton}>
                Disengage
              </button>
            </div>
          </div>
        </div>
      )}

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
              <button onClick={handleRetry} className={styles.primaryButton} style={{ background: COLORS.error, borderColor: COLORS.error }}>
                Re-Initialize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overwrite Confirmation Modal */}
      {showOverwriteModal && createPortal(
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
                You already have a generated results for <strong>{decodeURIComponent(subject || '')}</strong>.
              </p>
              <p>
                Generating again will <strong>permanently delete</strong> the previous version to keep your library clean.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={handleCancelOverwrite}
                className={styles.cancelButton}
              >
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
