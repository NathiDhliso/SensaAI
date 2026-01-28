/**
 * Study Command Center - Unified Learning Page
 * 
 * Phase 2.1: Consolidates Results, Learn, Palace, and Sprint into a single
 * tab-based interface under /study/:subjectId.
 * 
 * This is the "Silver Bullet" page that addresses:
 * - Cognitive overload from multiple page transitions
 * - Lost context when switching between routes
 * - Inconsistent navigation patterns
 * 
 * @see SILVER_BULLET_LEARNING_ARCHITECTURE.md
 */

import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useLearningStore } from '@/store/learning-store';
import { useGenerationStore } from '@/store/generation-store';
import { storageManager } from '@/lib/storage';
import { parseAndLoadContent } from '@/lib/content-loader';
import { StudyLayout, type StudyTab } from '@/components/layout';
import {
  CelebrationModal,
  CognitiveGauge,
  NeuralResetBanner,
  SessionSummary,
} from '@/components/learning';
import { LearningErrorBoundary } from '@/components/error/LearningErrorBoundary';
import { SessionScoutPreview } from '@/components/learning/SessionScoutPreview';
import { toast } from '@/lib/utils/toast';
import styles from './Study.module.css';

// Lazy load heavy components
const VelocityLearning = lazy(() => import('./VelocityLearning'));

export default function Study() {
  const navigate = useNavigate();
  const location = useLocation();
  const { subjectId } = useParams<{ subjectId: string }>();
  const [searchParams] = useSearchParams();

  // Initialize tab from URL query param or default to overview
  const initialTab = (searchParams.get('tab') as StudyTab) || 'overview';
  const [activeTab, setActiveTab] = useState<StudyTab>(initialTab);
  const [isHydrating, setIsHydrating] = useState(false);

  const {
    getSession,
    currentSession,
    showCelebration,
    celebrationData,
    dismissCelebration,
    startSession,
    endSession,
    getConcepts,
  } = useLearningStore();

  const { currentSubject, pass1Data } = useGenerationStore();

  const session = getSession();
  const concepts = getConcepts();

  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Hydration Effect: Load data from storage if store is empty or IDs mismatch
  useEffect(() => {
    const hydrateFromStorage = async () => {
      if (!subjectId) {
        setHydrationError('SESSION_ID_MISSING');
        return;
      }

      // Check if we already have the correct session loaded
      if (currentSession?.id === subjectId || currentSession?.subjectId === subjectId) {
        console.log('[Study] Session already loaded, skipping hydration');
        return;
      }

      // Check if this is a fresh generation (content already parsed and loaded)
      const navigationState = location.state as { freshGeneration?: boolean } | null;
      if (navigationState?.freshGeneration && currentSession) {
        console.log('[Study] Fresh generation detected, content already loaded');
        return;
      }

      // Need to hydrate from storage
      setIsHydrating(true);
      setHydrationError(null);
      
      try {
        // Attempt 1: Load from storage using the ID directly
        let result = await storageManager.loadResult(subjectId);

        // Attempt 2: Check if it's an active job (generation in progress)
        if (!result) {
          const { hasActiveJob, getActiveJob } = useGenerationStore.getState();
          if (hasActiveJob()) {
            const activeJob = getActiveJob();
            if (activeJob?.sessionId === subjectId || activeJob?.jobId === subjectId) {
              console.log('[Study] Found active generation job, waiting...');
              setHydrationError('GENERATION_IN_PROGRESS');
              return;
            }
          }
        }

        if (!result) {
          console.error('[Study] Failed to load result from storage - result is null');
          setHydrationError('SESSION_NOT_FOUND');
          return;
        }

        if (!result.fullDocument) {
          console.error('[Study] Failed to load result from storage - no fullDocument');
          setHydrationError('EMPTY_CONTENT');
          return;
        }

        // Validate content structure before parsing
        try {
          const parsed = JSON.parse(result.fullDocument);
          if (!parsed.concepts || !Array.isArray(parsed.concepts)) {
            console.error('[Study] Invalid content structure - no concepts array');
            setHydrationError('INVALID_CONTENT');
            return;
          }
        } catch (parseError) {
          console.error('[Study] Content is not valid JSON:', parseError);
          setHydrationError('CORRUPTED_CONTENT');
          return;
        }

        // Pass fallback concepts from pass1Data to ensure full coverage
        const fallbackConcepts = result.pass1Data?.concepts || [];
        const loadResult = parseAndLoadContent(result.fullDocument, subjectId, fallbackConcepts);

        if (!loadResult.success) {
          console.error('[Study] Failed to hydrate session:', loadResult.error);
          setHydrationError(`PARSE_ERROR: ${loadResult.error}`);
          
          // Retry logic for transient errors
          if (retryCount < MAX_RETRIES) {
            console.log(`[Study] Retrying hydration (${retryCount + 1}/${MAX_RETRIES})...`);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              setIsHydrating(false);
            }, 1000 * (retryCount + 1)); // Exponential backoff
            return;
          }
        } else {
          // Success - reset retry count
          setRetryCount(0);
        }
      } catch (error) {
        console.error('[Study] Failed to load from storage:', error);
        
        // Retry logic for network/storage errors
        if (retryCount < MAX_RETRIES) {
          console.log(`[Study] Retrying after error (${retryCount + 1}/${MAX_RETRIES})...`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            setIsHydrating(false);
          }, 1000 * (retryCount + 1)); // Exponential backoff
          return;
        }
        
        setHydrationError('UNKNOWN_ERROR');
      } finally {
        setIsHydrating(false);
      }
    };

    hydrateFromStorage();
  }, [subjectId, currentSession?.id, currentSession?.subjectId, retryCount]);

  // Start learning session on mount
  useEffect(() => {
    startSession();
    return () => endSession();
  }, [startSession, endSession]);

  // Handle tab changes with prerequisite validation
  const handleTabChange = useCallback((tab: StudyTab) => {
    const { studySession } = useLearningStore.getState();
    
    // Validate prerequisites before allowing tab navigation
    if (tab === 'learn') {
      // Check if overview/scouting is complete
      if (!studySession?.scouted && concepts.length === 0) {
        toast.warning('Please complete the overview first to understand the concepts');
        return;
      }
      
      // Check if study session has started
      if (!studySession) {
        toast.info('Start a learning session from the overview tab first');
        setActiveTab('overview');
        return;
      }
    }
    
    setActiveTab(tab);
  }, [concepts]);

  // URL guard: Validate tab from URL params
  useEffect(() => {
    const urlTab = searchParams.get('tab') as StudyTab;
    if (!urlTab) return;

    // Validate URL tab against prerequisites
    if (urlTab === 'learn') {
      const { studySession } = useLearningStore.getState();
      if (!studySession?.scouted && concepts.length === 0) {
        console.log('[Study] Invalid direct navigation to learn tab, redirecting to overview');
        setActiveTab('overview');
        navigate(`/study/${subjectId}?tab=overview`, { replace: true });
        toast.info('Start from the overview to begin learning');
      }
    }
  }, [searchParams, concepts, subjectId, navigate]);

  // Handle celebration modal
  const handleCelebrationContinue = useCallback(() => {
    dismissCelebration();
  }, [dismissCelebration]);

  const handleTakeBreak = useCallback(() => {
    dismissCelebration();
    navigate('/');
  }, [dismissCelebration, navigate]);

  // Determine subject name for header
  const subjectName = session?.subject || currentSubject || pass1Data?.domain || 'Study Session';

  // Render active tab content
  const renderTabContent = () => {
    // Show loading spinner while hydrating
    if (isHydrating) {
      return (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading session{retryCount > 0 ? ` (attempt ${retryCount + 1}/${MAX_RETRIES + 1})` : ''}...</p>
        </div>
      );
    }

    // Show error state if hydration failed
    if (hydrationError) {
      const errorMessages: Record<string, { title: string; message: string; action: string }> = {
        SESSION_NOT_FOUND: {
          title: 'Session Not Found',
          message: 'This study session doesn\'t exist or has expired. It may have been deleted or the link is incorrect.',
          action: 'Go to Dashboard'
        },
        EMPTY_CONTENT: {
          title: 'Empty Content',
          message: 'This session has no content. Try regenerating this subject from the dashboard.',
          action: 'Go to Dashboard'
        },
        INVALID_CONTENT: {
          title: 'Invalid Content',
          message: 'The session content is malformed. This may be due to a generation error.',
          action: 'Go to Dashboard'
        },
        CORRUPTED_CONTENT: {
          title: 'Corrupted Content',
          message: 'The session data is corrupted and cannot be loaded. Try regenerating this subject.',
          action: 'Go to Dashboard'
        },
        GENERATION_IN_PROGRESS: {
          title: 'Generation In Progress',
          message: 'This content is still being generated. Please wait a moment and refresh the page.',
          action: 'Refresh Page'
        },
        SESSION_ID_MISSING: {
          title: 'Invalid URL',
          message: 'No session ID was provided in the URL. Please navigate from the dashboard.',
          action: 'Go to Dashboard'
        },
        UNKNOWN_ERROR: {
          title: 'Something Went Wrong',
          message: 'An unexpected error occurred while loading the session. Please try again.',
          action: 'Go to Dashboard'
        }
      };

      const errorInfo = errorMessages[hydrationError] || errorMessages.UNKNOWN_ERROR;
      const isParseError = hydrationError.startsWith('PARSE_ERROR:');
      
      if (isParseError) {
        errorInfo.title = 'Parse Error';
        errorInfo.message = hydrationError.replace('PARSE_ERROR: ', '');
      }

      return (
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2 className={styles.errorTitle}>{errorInfo.title}</h2>
          <p className={styles.errorMessage}>{errorInfo.message}</p>
          
          {retryCount > 0 && retryCount < MAX_RETRIES && (
            <p className={styles.retryInfo}>
              Retried {retryCount} time{retryCount > 1 ? 's' : ''}. Retrying...
            </p>
          )}
          
          <div className={styles.errorActions}>
            {hydrationError === 'GENERATION_IN_PROGRESS' ? (
              <button
                onClick={() => window.location.reload()}
                className={styles.primaryButton}
              >
                🔄 Refresh Page
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/')}
                  className={styles.primaryButton}
                >
                  🏠 {errorInfo.action}
                </button>
                {retryCount >= MAX_RETRIES && (
                  <button
                    onClick={() => {
                      setRetryCount(0);
                      setHydrationError(null);
                    }}
                    className={styles.secondaryButton}
                  >
                    🔄 Try Again
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <div style={{ height: '100%', minHeight: '600px' }}>
            <SessionScoutPreview
              concepts={concepts}
              initialPhase="scout"
              onComplete={() => setActiveTab('learn')}
            />
          </div>
        );

      case 'learn':
        return (
          <Suspense fallback={<div className={styles.loading}>Loading Velocity Engine...</div>}>
            <LearningErrorBoundary
              onRecover={() => {
                // Attempt to recover by reloading the session
              }}
              onAbandon={() => {
                // Clear corrupted state and navigate to dashboard
                useLearningStore.getState().clearSession();
                navigate('/');
              }}
            >
              <div style={{ height: '100%', minHeight: '600px' }}>
                <VelocityLearning />
              </div>
            </LearningErrorBoundary>
          </Suspense>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <StudyLayout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        subjectName={subjectName}
        headerActions={
          <CognitiveGauge compact />
        }
      >
        {renderTabContent()}
      </StudyLayout>

      {/* Celebration Modal */}
      {showCelebration && celebrationData && (
        <CelebrationModal
          data={celebrationData}
          onContinue={handleCelebrationContinue}
          onTakeBreak={handleTakeBreak}
        />
      )}

      {/* Session Summary Modal */}
      <SessionSummary />

      {/* Neural Reset Banner */}
      <NeuralResetBanner />
    </>
  );
}
