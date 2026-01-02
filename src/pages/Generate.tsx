import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Loader2, ArrowLeft, AlertTriangle, RefreshCw } from 'lucide-react';
import { generateChartIteratively } from '@/lib/generation/multi-pass-generator';
import { useGenerationStore } from '@/store/generation-store';
import { PASS_NAMES } from '@/constants/ui-constants';
import type { PassStatus, Pass1Result, ValidationResult } from '@/lib/types';
import styles from './Generate.module.css';

type ProgressData = {
  message?: string;
  partial?: string;
  progress?: number;
  content?: string;
  domain?: string;
} & Partial<Pass1Result> & Partial<ValidationResult>;

export default function Generate() {
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const {
    bedrockConfig,
    passes,
    currentActivity,
    progress,
    pass1Data,
    error,
    isGenerating,
    startGeneration,
    completeGeneration,
    setError,
    addRecentSubject,
    canResumeFromCheckpoint,
    getCheckpointResumeData,
    clearCheckpoint,
    saveCheckpoint,
    updateGenerationProgress,
  } = useGenerationStore();

  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const hasStartedRef = useRef(false);
  const resultIdRef = useRef<string | null>(null);


  // Shared callback function to handle progress updates
  const createProgressCallback = useCallback(() => {
    return (pass: number, status: PassStatus, data?: ProgressData) => {
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
      }

      if (pass === 2 && status === 'complete' && data?.content) {
        update.pass2Content = data.content;
      }

      if (pass === 3 && status === 'complete' && data?.content) {
        update.pass3Content = data.content;
      }

      if (pass === 4 && status === 'complete' && data) {
        update.validation = data as ValidationResult;
      }

      // Single atomic update
      updateGenerationProgress(update);

      // Save checkpoint on pass completion
      if (status === 'complete') {
        saveCheckpoint(pass);
      }
    };
  }, [updateGenerationProgress, saveCheckpoint]);

  // Start generation
  const startGenerationProcess = useCallback((decodedSubject: string, resumeData?: ReturnType<typeof getCheckpointResumeData>) => {
    const controller = new AbortController();
    setAbortController(controller);

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
      startGeneration(decodedSubject);
      addRecentSubject(decodedSubject);
    }

    const progressCallback = createProgressCallback();

    generateChartIteratively(decodedSubject, bedrockConfig!, progressCallback, controller.signal)
      .then(async (result) => {
        completeGeneration(result);
        clearCheckpoint();

        // Auto-save to storage so Results page can always retrieve it
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
          // Navigate directly to results - no diagnostic blocking
          navigate(`/results/${resultId}`);
        } else {
          // Fallback if validation/pass1Data not available
          navigate(`/results/${Date.now()}`);
        }
      })
      .catch((err) => {
        if (err.message === 'Generation cancelled by user') {
          navigate('/');
        } else {
          // Show error on the page instead of silent navigation
          setError(err.message || 'Generation failed. Please check your AWS credentials and try again.');
        }
      });
  }, [bedrockConfig, createProgressCallback, startGeneration, addRecentSubject, completeGeneration, clearCheckpoint, setError, navigate]);

  useEffect(() => {
    if (!subject || !bedrockConfig || hasStartedRef.current) return;

    const decodedSubject = decodeURIComponent(subject);

    if (canResumeFromCheckpoint(decodedSubject)) {
      setShowResumeDialog(true);
      return;
    }

    hasStartedRef.current = true;
    startGenerationProcess(decodedSubject);

    return () => {
      abortController?.abort();
    };
  }, [subject, bedrockConfig, canResumeFromCheckpoint, startGenerationProcess, abortController]);

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
                  <span className={styles.activityLabel}>Currently Processing</span>
                  <span className={styles.activityPhase}>
                    {passes[3] === 'in-progress' ? 'Content Generation' :
                      passes[4] === 'in-progress' ? 'Quality Validation' :
                        passes[2] === 'in-progress' ? 'Dependency Mapping' :
                          passes[1] === 'in-progress' ? 'Domain Analysis' : 'Processing'}
                  </span>
                </div>
              </div>

              <div className={styles.activityDetails}>
                <p className={styles.activityText}>{currentActivity}</p>
                {pass1Data && passes[3] === 'in-progress' && (
                  <p className={styles.conceptCount}>
                    Generating {pass1Data.concepts.length} concepts with full detail
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
                      📚 Concepts Detected
                    </div>
                    <div className={styles.previewBadge}>
                      <span></span> Live
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

                  <div className={styles.conceptsGrid}>
                    {pass1Data.concepts.slice(0, 12).map((concept, idx) => (
                      <div 
                        key={idx} 
                        className={`${styles.conceptChip} ${passes[3] === 'in-progress' && idx === pass1Data.concepts.length - 1 ? styles.generating : ''}`}
                      >
                        <span className={styles.conceptIcon}>💡</span>
                        <span className={styles.conceptName}>{concept}</span>
                      </div>
                    ))}
                    {pass1Data.concepts.length > 12 && (
                      <div className={styles.conceptChip}>
                        <span className={styles.conceptName}>+{pass1Data.concepts.length - 12} more</span>
                      </div>
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
