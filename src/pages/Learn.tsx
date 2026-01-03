import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Map, Zap, HelpCircle, Timer } from 'lucide-react';
import {
  JourneyMap,
  ConceptCard,
  CelebrationModal,
  LearningToolbar,
  CognitiveGauge,
  NeuralResetBanner,
  UnifiedSessionBar,
  SessionSummary,
  LifecycleNavigator,
} from '@/components/learning';
import HelpModal from '@/components/ui/HelpModal';
import { useLearningStore } from '@/store/learning-store';
import { useFocusSessionStore } from '@/store/focus-session-store';
import { UI_TIMINGS } from '@/constants/ui-constants';
import styles from './Learn.module.css';

export default function Learn() {
  const navigate = useNavigate();
  const {
    progress,
    showCelebration,
    celebrationData,
    completeConcept,
    setCurrentConcept,
    dismissCelebration,
    startSession,
    endSession,
    getStages,
    getConcepts,
    hasCustomContent,
    customContent,
  } = useLearningStore();

  const { isSessionActive, recordConceptEnd, getFormattedTimeRemaining } = useFocusSessionStore();

  const stages = getStages();
  const concepts = getConcepts();
  const currentConcept = concepts.find(c => c.id === progress.currentConceptId);
  const hasContent = stages.length > 0 && concepts.length > 0;

  // Check if all concepts are complete (sprint ready)
  const allConceptsComplete = hasContent &&
    concepts.every(c => progress.completedConcepts.includes(c.id));
  const progressPercent = hasContent
    ? Math.round((progress.completedConcepts.length / concepts.length) * 100)
    : 0;

  const [showHelp, setShowHelp] = useState(false);
  const [showFocusToast, setShowFocusToast] = useState(false);
  const wasSessionActiveRef = useRef(isSessionActive);

  // Compute lifecycle phase progress from concepts
  const lifecycleProgress = useMemo(() => {
    if (!hasContent || concepts.length === 0) {
      return {
        labels: { phase1: 'PREPARE', phase2: 'MODEL', phase3: 'DELIVER' },
        progress: {
          phase1: { total: 0, completed: 0 },
          phase2: { total: 0, completed: 0 },
          phase3: { total: 0, completed: 0 },
        },
      };
    }

    // Get lifecycle labels from first concept (all concepts share same lifecycle)
    const firstWithLifecycle = concepts.find(c => c.lifecycle);
    const labels = firstWithLifecycle?.lifecycle
      ? {
          phase1: firstWithLifecycle.lifecycle.phase1.title || 'PREPARE',
          phase2: firstWithLifecycle.lifecycle.phase2.title || 'MODEL',
          phase3: firstWithLifecycle.lifecycle.phase3.title || 'DELIVER',
        }
      : { phase1: 'PREPARE', phase2: 'MODEL', phase3: 'DELIVER' };

    // For now, distribute concepts evenly across phases
    // TODO: Track per-phase completion when phase-specific learning is added
    const total = concepts.length;
    const completed = progress.completedConcepts.length;
    const perPhase = Math.ceil(total / 3);

    return {
      labels,
      progress: {
        phase1: {
          total: Math.min(perPhase, total),
          completed: Math.min(completed, perPhase),
        },
        phase2: {
          total: Math.min(perPhase, Math.max(0, total - perPhase)),
          completed: Math.max(0, Math.min(completed - perPhase, perPhase)),
        },
        phase3: {
          total: Math.max(0, total - perPhase * 2),
          completed: Math.max(0, completed - perPhase * 2),
        },
      },
    };
  }, [concepts, progress.completedConcepts, hasContent]);

  useEffect(() => {
    startSession();
    return () => endSession();
  }, [startSession, endSession]);

  // Show toast when focus session starts
  useEffect(() => {
    if (isSessionActive && !wasSessionActiveRef.current) {
      setShowFocusToast(true);
      const timer = setTimeout(() => setShowFocusToast(false), UI_TIMINGS.TOAST_MEDIUM);
      return () => clearTimeout(timer);
    }
    wasSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  const handleConceptComplete = () => {
    // Record concept completion in focus session if active
    if (isSessionActive && progress.currentConceptId) {
      recordConceptEnd(progress.currentConceptId, true);
    }
    completeConcept(progress.currentConceptId);
  };

  const handleNavigate = (conceptId: string) => {
    setCurrentConcept(conceptId);
  };

  const handleCelebrationContinue = () => {
    dismissCelebration();
  };

  const handleTakeBreak = () => {
    dismissCelebration();
    navigate('/');
  };

  return (
    <div className={styles.container}>
      {/* Unified Session Bar - appears when focus session is active */}
      <div className={styles.sessionBarContainer}>
        <UnifiedSessionBar />
      </div>

      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
        </button>
        <div className={styles.headerTitle}>
          <span className={styles.logoIcon}>🧠</span>
          <span className={styles.logoText}>
            {hasCustomContent() && customContent?.metadata
              ? customContent.metadata.domain
              : 'SensaAI'}
          </span>
        </div>
        <div className={styles.headerCenter}>
          <CognitiveGauge compact />
        </div>
        <LearningToolbar />
        <div className={styles.headerActions}>
          {/* Sprint always available when content is loaded */}
          {hasContent && (
            <button
              className={`${styles.sprintButton} ${progressPercent < 50 ? styles.sprintButtonEarly : ''}`}
              onClick={() => navigate('/sprint')}
              title={progressPercent < 50 ? 'Start Sprint (early access)' : 'Start Automaticity Sprint'}
            >
              <Zap size={18} />
              <span className={styles.sprintButtonText}>Sprint</span>
            </button>
          )}
          <button
            className={styles.palaceButton}
            onClick={() => navigate('/palace')}
            title="Open Memory Palace & Street View"
          >
            <Map size={18} />
          </button>
          <button
            className={styles.helpButton}
            onClick={() => setShowHelp(true)}
            title="Help & Tips"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </header>

      {/* Lifecycle Navigator - Always visible progress across phases */}
      {hasContent && (
        <LifecycleNavigator
          labels={lifecycleProgress.labels}
          progress={lifecycleProgress.progress}
          compact
        />
      )}

      <div className={styles.mainLayout}>
        <aside className={styles.scaffoldPanel}>
          <JourneyMap onConceptClick={handleNavigate} />
        </aside>

        <main className={styles.contentPanel}>
          {hasContent && currentConcept ? (
            <ConceptCard
              conceptId={currentConcept.id}
              onComplete={handleConceptComplete}
            />
          ) : (
            <div className={styles.emptyContent}>
              <div className={styles.emptyIcon}>📚</div>
              <h2 className={styles.emptyTitle}>No Content Loaded</h2>
              <p className={styles.emptyText}>
                Generate learning content to start your journey
              </p>
              <button
                className={styles.generateButton}
                onClick={() => navigate('/')}
              >
                Generate Content
              </button>
            </div>
          )}
        </main>
      </div>

      {showCelebration && celebrationData && (
        <CelebrationModal
          data={celebrationData}
          onContinue={handleCelebrationContinue}
          onTakeBreak={handleTakeBreak}
        />
      )}

      {/* Sprint Ready Banner */}
      {allConceptsComplete && (
        <div className={styles.sprintReadyBanner}>
          <div className={styles.sprintReadyContent}>
            <span className={styles.sprintReadyIcon}>🎯</span>
            <div className={styles.sprintReadyText}>
              <strong>You've mastered all concepts!</strong>
              <p>Ready to test your automaticity?</p>
            </div>
            <button
              className={styles.sprintReadyButton}
              onClick={() => navigate('/sprint')}
            >
              <Zap size={18} />
              Start Sprint
            </button>
          </div>
        </div>
      )}

      {/* Session Summary Modal - displays when focus session ends */}
      <SessionSummary />

      {/* Neural Reset Banner - suggests break when cognitive load is high */}
      <NeuralResetBanner />

      {/* Focus Session Started Toast */}
      {showFocusToast && (
        <div className={styles.focusToast}>
          <Timer size={20} className={styles.focusToastIcon} />
          <div className={styles.focusToastContent}>
            <strong>Focus session started!</strong>
            <span>{getFormattedTimeRemaining()} remaining</span>
          </div>
        </div>
      )}

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
