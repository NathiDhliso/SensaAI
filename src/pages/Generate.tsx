import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, Circle, Loader2, ArrowLeft, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useGenerationStore } from '@/store/generation-store';
import { useAuthStore } from '@/store/auth-store';
import { generateWithBackend } from '@/lib/generation/backend-generator';
import { parseAndLoadContent } from '@/lib/content-loader';
import { PASS_NAMES, GENERATION_MESSAGES } from '@/constants/ui-constants';
import styles from './Generate.module.css';

import type { PassStatus, Pass1Result, ValidationResult, GenerationResult, ProgressData } from '@/lib/types/generation';
export default function Generate() {
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const location = useLocation(); // [NEW] Get location
  const searchParams = new URLSearchParams(location.search);
  const context = searchParams.get('context'); // [NEW] Parse context

  const {
    // ...
    bedrockConfig,
    passes,
    currentActivity,
    progress,
    pass1Data,
    error,
    isGenerating,
    streamedConcepts,
    constructionPhase,
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

  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [whimsicalMessage, setWhimsicalMessage] = useState('');
  const hasStartedRef = useRef(false);
  const resultIdRef = useRef<string | null>(null);
  const messageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track which pass is currently in progress for message cycling
  const currentInProgressPass = passes[1] === 'in-progress' ? 1
    : passes[2] === 'in-progress' ? 2
      : passes[3] === 'in-progress' ? 3
        : passes[4] === 'in-progress' ? 4
          : 0;

  // Cycle through whimsical messages based on current pass
  useEffect(() => {
    if (!isGenerating) {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
        messageIntervalRef.current = null;
      }
      return;
    }

    const getCurrentPassMessages = () => {
      if (currentInProgressPass === 1) return GENERATION_MESSAGES.pass1;
      if (currentInProgressPass === 2) return GENERATION_MESSAGES.pass2;
      if (currentInProgressPass === 3) return GENERATION_MESSAGES.pass3;
      if (currentInProgressPass === 4) return GENERATION_MESSAGES.pass4;
      return GENERATION_MESSAGES.pass3; // Default to pass3 messages
    };

    const messages = getCurrentPassMessages();
    let messageIndex = 0;
    setWhimsicalMessage(messages[0]);

    messageIntervalRef.current = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setWhimsicalMessage(messages[messageIndex]);
    }, 3500);

    return () => {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
        messageIntervalRef.current = null;
      }
    };
  }, [isGenerating, currentInProgressPass]);


  // Throttle ref for progress updates
  const lastProgressUpdateRef = useRef<number>(0);
  const PROGRESS_THROTTLE_MS = 100;

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
        // Set expected concept count for optimistic UI
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
            mnemonic: concept.anchor ? { tier: 'Foundation', anchor: concept.anchor, story: '' } : undefined,
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

      // Single atomic update
      updateGenerationProgress(update);

      // Save checkpoint on pass completion
      if (status === 'complete') {
        saveCheckpoint(pass);
      }
    };
  }, [updateGenerationProgress, saveCheckpoint, addStreamedConcept, setConstructionPhase, setExpectedConceptCount]);

  // Start generation
  const startGenerationProcess = useCallback((decodedSubject: string, resumeData?: ReturnType<typeof getCheckpointResumeData>) => {
    const controller = new AbortController();
    setAbortController(controller);
    abortControllerRef.current = controller;

    if (resumeData) {
      // Resume from checkpoint
      useGenerationStore.setState({
        ...resumeData.restoredState,
        currentSubject: decodedSubject,
        isGenerating: true,
        error: null,
      });
    } else {
      // Fresh start
      startGeneration(decodedSubject, context || undefined);
      addRecentSubject(decodedSubject);
    }

    const progressCallback = createProgressCallback();

    generateWithBackend(decodedSubject, progressCallback, controller.signal, context || undefined)
      .then(async (result) => {
        completeGeneration(result);
        clearCheckpoint();

        // Auto-save to storage so Study page can always retrieve it
        const { pass1Data, validation } = useGenerationStore.getState();
        if (pass1Data && validation) {
          const resultId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          resultIdRef.current = resultId;
          const savedResult = {
            id: resultId,
            subject: decodedSubject,
            generatedAt: new Date().toISOString(),
            fullDocument: result.fullDocument,
            pass1Data: {
              domain: pass1Data.domain,
              roleScope: pass1Data.roleScope,
              lifecycle: pass1Data.lifecycle,
              concepts: pass1Data.concepts,
            },
            validation: {
              lifecycleConsistency: validation.lifecycleConsistency,
              positiveFraming: validation.positiveFraming,
              formatConsistency: validation.formatConsistency,
              completeness: validation.completeness,
            },
            savedLocally: true,
          };

          // Import and use storageManager
          const { storageManager } = await import('@/lib/storage');
          await storageManager.saveResult(savedResult);

          // Silver Bullet: Hydrate learning store and go straight to Study
          const loadResult = parseAndLoadContent(result.fullDocument, resultId);
          if (loadResult.success) {
            navigate(`/study/${resultId}?tab=learn`);
          } else {
            // Fallback to results if loading fails
            console.warn('Failed to load content into learning store:', loadResult.error);
            navigate(`/results/${resultId}`);
          }
        } else {
          // Fallback if validation/pass1Data not available
          navigate(`/results/${Date.now()}`);
        }
      })
      .catch((err) => {
        console.error('Generation error:', err);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        if (err.message === 'Generation cancelled by user') {
          navigate('/');
        } else {
          // Show error on the page instead of silent navigation
          setError(err.message || 'Generation failed. Please check your AWS credentials and try again.');
        }
      });
  }, [bedrockConfig, createProgressCallback, startGeneration, addRecentSubject, completeGeneration, clearCheckpoint, setError, navigate]);

  useEffect(() => {
    if (!subject) {
      return;
    }

    // Check authentication
    const { isAuthenticated } = useAuthStore.getState();

    // If not authenticated (and no env config fallback), redirect to login
    if (!isAuthenticated && !bedrockConfig) {
      navigate('/login', { state: { from: `/generate/${subject}` } });
      return;
    }

    if (hasStartedRef.current) {
      return;
    }

    const decodedSubject = decodeURIComponent(subject);

    // Check for shared/existing intelligence before starting
    if (!hasStartedRef.current && !canResumeFromCheckpoint(decodedSubject)) {
      const checkForExisting = async () => {
        try {
          const { storageManager } = await import('@/lib/storage');
          const existing = await storageManager.findLatestBySubject(decodedSubject);

          if (existing) {
            // Found a match! Ask user what to do
            const shouldLoad = window.confirm(
              `Shared Intelligence Found! 🧠\n\n` +
              `We found an existing version of "${decodedSubject}" generated on ${new Date(existing.generatedAt).toLocaleDateString()}.\n\n` +
              `Would you like to load this shared knowledge instead of generating from scratch?`
            );

            if (shouldLoad) {
              navigate(`/results/${existing.id}`);
              return;
            }
          }
        } catch (e) {
          console.warn('Failed to check shared intelligence:', e);
        }

        // Proceed with generation if no match or user chose to generate new
        if (canResumeFromCheckpoint(decodedSubject)) {
          setShowResumeDialog(true);
        } else {
          hasStartedRef.current = true;
          startGenerationProcess(decodedSubject);
        }
      };

      checkForExisting();
      return;
    }

    if (canResumeFromCheckpoint(decodedSubject)) {
      setShowResumeDialog(true);
      return;
    }

    hasStartedRef.current = true;
    startGenerationProcess(decodedSubject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, bedrockConfig, context]);

  // Don't abort on unmount - only abort when user explicitly cancels
  // React Strict Mode and HMR cause re-mounts that would incorrectly abort

  // Warn user before leaving during active generation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGenerating) {
        e.preventDefault();
        // Most browsers ignore custom messages, but we set one anyway
        e.returnValue = 'Generation in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isGenerating]);

  // Handle cancel with confirmation
  const handleCancelClick = () => {
    if (isGenerating && passes[1] === 'complete') {
      // If we have some progress, confirm before canceling
      setShowConfirmCancel(true);
    } else {
      abortController?.abort();
      navigate('/');
    }
  };

  const handleConfirmCancel = () => {
    setShowConfirmCancel(false);
    abortController?.abort();
    navigate('/');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className={styles.iconComplete} />;
      case 'in-progress':
      case 'fixing':
        return <Loader2 className={styles.iconProgress} />;
      default:
        return <Circle className={styles.iconQueued} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'in-progress':
        return 'In Progress';
      case 'fixing':
        return 'Auto-fixing';
      default:
        return 'Queued';
    }
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

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <button onClick={() => navigate('/')} className={styles.backButton}>
          <ArrowLeft className={styles.backIcon} />
          Back to Home
        </button>

        {showResumeDialog && (
          <div className={styles.resumeDialog}>
            <h2>Resume Previous Generation?</h2>
            <p>
              Found an incomplete generation for this subject from{' '}
              {(() => {
                const checkpoint = useGenerationStore.getState().checkpoint;
                if (!checkpoint) return 'earlier';
                const age = Date.now() - checkpoint.timestamp;
                const minutes = Math.floor(age / 60000);
                return minutes < 1 ? 'just now' : `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
              })()}
            </p>
            <p>
              Progress saved: Pass {(getCheckpointResumeData()?.startFromPass ?? 1) - 1} complete
            </p>
            <div className={styles.dialogActions}>
              <button onClick={handleResumeFromCheckpoint} className={styles.primaryButton}>
                Resume Generation
              </button>
              <button onClick={handleStartFresh} className={styles.secondaryButton}>
                Start Fresh
              </button>
            </div>
          </div>
        )}

        <div className={styles.card}>
          <h1 className={styles.title}>
            Generating: {decodeURIComponent(subject || '')}
          </h1>

          {pass1Data && (
            <div className={styles.metadata}>
              <span>
                Role: <strong>{pass1Data.roleScope}</strong>
              </span>
              <span className={styles.separator}>•</span>
              <span>
                Lifecycle:{' '}
                <strong>
                  {pass1Data.lifecycle.phase1} → {pass1Data.lifecycle.phase2} →{' '}
                  {pass1Data.lifecycle.phase3}
                </strong>
              </span>
            </div>
          )}

          {error && (
            <div className={styles.errorBox}>
              <div className={styles.errorHeader}>
                <AlertTriangle className={styles.errorIcon} />
                <span className={styles.errorTitle}>Generation Failed</span>
              </div>
              <p className={styles.errorMessage}>{error}</p>
              <div className={styles.errorActions}>
                <button onClick={handleRetry} className={styles.retryButton}>
                  <RefreshCw size={16} />
                  Retry
                </button>
                <button onClick={() => navigate('/')} className={styles.homeButton}>
                  Go Home
                </button>
              </div>
            </div>
          )}

          <div className={styles.passList}>
            {[1, 2, 3, 4].map((pass) => {
              const status = passes[pass];
              return (
                <div key={pass} className={styles.passItem}>
                  {getStatusIcon(status)}
                  <span
                    className={
                      status === 'complete' ? styles.passTextComplete : styles.passText
                    }
                  >
                    Pass {pass}: {PASS_NAMES[pass - 1]}
                  </span>
                  <span
                    className={
                      status === 'complete'
                        ? styles.statusComplete
                        : status === 'in-progress' || status === 'fixing'
                          ? styles.statusProgress
                          : styles.statusQueued
                    }
                  >
                    {getStatusLabel(status)}
                  </span>
                </div>
              );
            })}
          </div>

          {isGenerating && (
            <div className={styles.activityBox}>
              <div className={styles.activityHeader}>
                <div className={styles.pulseRing}>
                  <Loader2 className={styles.activityIcon} />
                </div>
                <div className={styles.activityInfo}>
                  <span className={styles.activityLabel}>Building Your Memory Palace</span>
                  <span className={styles.activityPhase}>
                    {passes[3] === 'in-progress' ? '🏰 Constructing Scenes' :
                      passes[4] === 'in-progress' ? '✨ Final Polish' :
                        passes[2] === 'in-progress' ? '🔗 Weaving Connections' :
                          passes[1] === 'in-progress' ? '🔍 Exploring Domain' : 'Processing'}
                  </span>
                </div>
              </div>

              <div className={styles.activityDetails}>
                {/* Whimsical message display */}
                <p className={styles.whimsicalMessage}>{whimsicalMessage}</p>
                <p className={styles.activityText}>{currentActivity}</p>
                {pass1Data && passes[3] === 'in-progress' && (
                  <p className={styles.conceptCount}>
                    Placing {pass1Data.concepts.length} surreal anchors across the landscape
                  </p>
                )}
              </div>

              <div className={styles.progressSection}>
                <div className={styles.progressHeader}>
                  <span className={styles.progressLabel}>Overall Progress</span>
                  <span className={styles.progressPercent}>{Math.round(progress)}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                  />
                  <div
                    className={styles.progressGlow}
                    style={{ left: `${progress}%` }}
                  />
                </div>
                <div className={styles.progressStats}>
                  <span>Estimated time: {progress < 30 ? '3-4 min' : progress < 70 ? '1-2 min' : '< 1 min'}</span>
                  {pass1Data && (
                    <span>{pass1Data.concepts.length} concepts • {pass1Data.domain}</span>
                  )}
                </div>
              </div>

              {pass1Data && pass1Data.concepts.length > 0 && (
                <div className={styles.livePreview}>
                  <div className={styles.previewHeader}>
                    <div className={styles.previewTitle}>
                      🏰 {constructionPhase === 'complete' ? 'Memory Palace Complete!' : 'Building Your Memory Palace'}
                    </div>
                    <div className={styles.previewBadge}>
                      <span></span> {constructionPhase === 'complete' ? 'Done' : 'Live'}
                    </div>
                  </div>

                  {pass1Data.lifecycle && (
                    <div className={styles.lifecyclePreview}>
                      <span className={styles.lifecyclePhase}>📋 {pass1Data.lifecycle.phase1}</span>
                      <span className={styles.lifecycleArrow}>→</span>
                      <span className={styles.lifecyclePhase}>⚙️ {pass1Data.lifecycle.phase2}</span>
                      <span className={styles.lifecycleArrow}>→</span>
                      <span className={styles.lifecyclePhase}>📊 {pass1Data.lifecycle.phase3}</span>
                    </div>
                  )}

                  {/* Construction Progress Indicator */}
                  {constructionPhase !== 'idle' && (
                    <div className={styles.constructionStatus}>
                      <span className={styles.constructionPhase}>
                        {constructionPhase === 'foundation' && '🔍 Analyzing domain...'}
                        {constructionPhase === 'framing' && '🏗️ Framing structure...'}
                        {constructionPhase === 'detailing' && `🎨 Placing anchors (${streamedConcepts.length}/${expectedConceptCount})...`}
                        {constructionPhase === 'complete' && '✨ Palace complete!'}
                      </span>
                    </div>
                  )}

                  {/* Animated Concept Grid */}
                  <div className={styles.conceptsGrid}>
                    <AnimatePresence mode="popLayout">
                      {/* Show streamed concepts with emoji anchors */}
                      {streamedConcepts.slice(0, 12).map((concept, idx) => {
                        // Extract emoji from anchor string
                        const emojiMatch = concept.mnemonic?.anchor?.match(/\p{Emoji}/u);
                        const emoji = emojiMatch ? emojiMatch[0] : '🎭';

                        return (
                          <motion.div
                            key={concept.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              type: 'spring',
                              stiffness: 300,
                              damping: 20,
                              delay: idx * 0.05
                            }}
                            className={`${styles.conceptChip} ${styles.streamedConcept}`}
                          >
                            <span className={styles.conceptIcon}>{emoji}</span>
                            <span className={styles.conceptName}>{concept.name}</span>
                          </motion.div>
                        );
                      })}

                      {/* Show remaining concepts as placeholder outlines if we haven't streamed them yet */}
                      {streamedConcepts.length < Math.min(12, pass1Data.concepts.length) &&
                        pass1Data.concepts.slice(streamedConcepts.length, 12).map((concept, idx) => (
                          <div
                            key={`placeholder-${idx}`}
                            className={`${styles.conceptChip} ${styles.conceptPlaceholder}`}
                          >
                            <span className={styles.conceptIcon}>⏳</span>
                            <span className={styles.conceptName}>{concept}</span>
                          </div>
                        ))}
                    </AnimatePresence>

                    {pass1Data.concepts.length > 12 && (
                      <motion.div
                        className={styles.conceptChip}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <span className={styles.conceptName}>
                          +{pass1Data.concepts.length - 12} more anchors
                        </span>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={styles.actions}>
            <button
              onClick={handleCancelClick}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Confirm Cancel Dialog */}
        {showConfirmCancel && (
          <div className={styles.confirmOverlay}>
            <div className={styles.confirmDialog}>
              <h3>Cancel Generation?</h3>
              <p>You have partial progress. Are you sure you want to cancel?</p>
              <div className={styles.confirmActions}>
                <button onClick={() => setShowConfirmCancel(false)} className={styles.secondaryButton}>
                  Continue Generation
                </button>
                <button onClick={handleConfirmCancel} className={styles.cancelConfirmButton}>
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
