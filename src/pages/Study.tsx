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

import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLearningStore } from '@/store/learning-store';
import { useGenerationStore } from '@/store/generation-store';
import { StudyLayout, type StudyTab } from '@/components/layout';
import { 
  ConceptChunks,
  LifecycleNavigator,
  JourneyMap,
  ConceptCard,
  CelebrationModal,
  CognitiveGauge,
  NeuralResetBanner,
  SessionSummary,
} from '@/components/learning';
import { useFocusSessionStore } from '@/store/focus-session-store';
import styles from './Study.module.css';

// Lazy load heavy components
const Palace = lazy(() => import('./Palace'));
const Sprint = lazy(() => import('./Sprint'));

// ═══════════════════════════════════════════════════════════════════════════
// TAB CONTENT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

interface OverviewTabProps {
  onStartLearning: (conceptId?: string) => void;
  onStartSprint: () => void;
}

function OverviewTab({ onStartLearning, onStartSprint }: OverviewTabProps) {
  const { 
    getConcepts, 
    getStages, 
    progress,
    hasCustomContent,
  } = useLearningStore();
  
  const { pass1Data, validation } = useGenerationStore();
  
  const concepts = getConcepts();
  const stages = getStages();
  const hasContent = concepts.length > 0;
  
  const progressPercent = hasContent
    ? Math.round((progress.completedConcepts.length / concepts.length) * 100)
    : 0;
  
  // Lifecycle progress calculation
  const lifecycleProgress = useMemo(() => {
    if (!hasContent) {
      return {
        phase1: { total: 0, completed: 0 },
        phase2: { total: 0, completed: 0 },
        phase3: { total: 0, completed: 0 },
      };
    }
    
    const total = concepts.length;
    const completed = progress.completedConcepts.length;
    const perPhase = Math.ceil(total / 3);
    
    return {
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
    };
  }, [concepts, progress.completedConcepts, hasContent]);

  if (!hasContent) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📚</div>
        <h2>No Content Loaded</h2>
        <p>Generate learning content to start your journey</p>
      </div>
    );
  }

  return (
    <div className={styles.overviewTab}>
      {/* Quick Stats Row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{concepts.length}</span>
          <span className={styles.statLabel}>Concepts</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{progress.completedConcepts.length}</span>
          <span className={styles.statLabel}>Mastered</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{progressPercent}%</span>
          <span className={styles.statLabel}>Progress</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stages.length}</span>
          <span className={styles.statLabel}>Stages</span>
        </div>
      </div>

      {/* Lifecycle Progress */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Learning Phases</h3>
        <LifecycleNavigator
          labels={{ phase1: 'PREPARE', phase2: 'MODEL', phase3: 'DELIVER' }}
          progress={lifecycleProgress}
        />
      </section>

      {/* Concept Chunks - Miller's Law Grouping */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Concepts by Priority</h3>
        <ConceptChunks
          concepts={concepts}
          completedIds={progress.completedConcepts}
          onConceptClick={(id) => onStartLearning(id)}
          onStartTier={(tier) => {
            const tierConcepts = concepts.filter(c => c.mnemonic?.tier === tier);
            if (tierConcepts.length > 0) {
              onStartLearning(tierConcepts[0].id);
            }
          }}
        />
      </section>

      {/* Quality Metrics (from validation) */}
      {validation && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Content Quality</h3>
          <div className={styles.metricsGrid}>
            <div className={`${styles.metricItem} ${validation.lifecycleConsistency >= 80 ? styles.metricGood : styles.metricWarning}`}>
              <span className={styles.metricLabel}>Lifecycle</span>
              <span className={styles.metricValue}>{validation.lifecycleConsistency}%</span>
            </div>
            <div className={`${styles.metricItem} ${validation.positiveFraming >= 80 ? styles.metricGood : styles.metricWarning}`}>
              <span className={styles.metricLabel}>Framing</span>
              <span className={styles.metricValue}>{validation.positiveFraming}%</span>
            </div>
            <div className={`${styles.metricItem} ${validation.formatConsistency >= 80 ? styles.metricGood : styles.metricWarning}`}>
              <span className={styles.metricLabel}>Format</span>
              <span className={styles.metricValue}>{validation.formatConsistency}%</span>
            </div>
          </div>
        </section>
      )}

      {/* Sprint Readiness */}
      {progressPercent >= 50 && (
        <div className={styles.sprintPrompt}>
          <div className={styles.sprintPromptContent}>
            <span className={styles.sprintPromptIcon}>⚡</span>
            <div>
              <strong>Ready for a Sprint?</strong>
              <p>Test your automaticity with timed questions</p>
            </div>
          </div>
          <button className={styles.sprintPromptButton} onClick={onStartSprint}>
            Start Sprint
          </button>
        </div>
      )}
    </div>
  );
}

interface LearnTabProps {
  onComplete: () => void;
}

function LearnTab({ onComplete }: LearnTabProps) {
  const {
    progress,
    completeConcept,
    setCurrentConcept,
    getConcepts,
    getStages,
  } = useLearningStore();
  
  const { isSessionActive, recordConceptEnd } = useFocusSessionStore();
  
  const concepts = getConcepts();
  const stages = getStages();
  const currentConcept = concepts.find(c => c.id === progress.currentConceptId);
  const hasContent = stages.length > 0 && concepts.length > 0;

  const handleConceptComplete = useCallback(() => {
    if (isSessionActive && progress.currentConceptId) {
      recordConceptEnd(progress.currentConceptId, true);
    }
    completeConcept(progress.currentConceptId);
    onComplete();
  }, [isSessionActive, progress.currentConceptId, recordConceptEnd, completeConcept, onComplete]);

  const handleNavigate = useCallback((conceptId: string) => {
    setCurrentConcept(conceptId);
  }, [setCurrentConcept]);

  if (!hasContent) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📚</div>
        <h2>No Content Loaded</h2>
        <p>Generate learning content to start your journey</p>
      </div>
    );
  }

  return (
    <div className={styles.learnTab}>
      <aside className={styles.journeyPanel}>
        <JourneyMap onConceptClick={handleNavigate} />
      </aside>
      
      <main className={styles.conceptPanel}>
        {currentConcept ? (
          <ConceptCard
            conceptId={currentConcept.id}
            onComplete={handleConceptComplete}
          />
        ) : (
          <div className={styles.selectPrompt}>
            <p>Select a concept from the journey map to begin</p>
          </div>
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN STUDY PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function Study() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<StudyTab>('overview');
  
  const {
    getSession,
    getConcepts,
    hasCustomContent,
    showCelebration,
    celebrationData,
    dismissCelebration,
    startSession,
    endSession,
    loadSession,
  } = useLearningStore();
  
  const { currentSubject, pass1Data } = useGenerationStore();
  
  const session = getSession();
  const concepts = getConcepts();
  const hasContent = hasCustomContent() && concepts.length > 0;
  
  // Start learning session on mount
  useEffect(() => {
    startSession();
    return () => endSession();
  }, [startSession, endSession]);

  // Handle tab changes
  const handleTabChange = useCallback((tab: StudyTab) => {
    setActiveTab(tab);
  }, []);

  // Navigate to learn tab with specific concept
  const handleStartLearning = useCallback((conceptId?: string) => {
    if (conceptId) {
      useLearningStore.getState().setCurrentConcept(conceptId);
    }
    setActiveTab('learn');
  }, []);

  // Navigate to sprint tab
  const handleStartSprint = useCallback(() => {
    setActiveTab('sprint');
  }, []);

  // Handle concept completion
  const handleConceptComplete = useCallback(() => {
    // Could show a micro-celebration or update UI
  }, []);

  // Handle celebration modal
  const handleCelebrationContinue = useCallback(() => {
    dismissCelebration();
  }, [dismissCelebration]);

  const handleTakeBreak = useCallback(() => {
    dismissCelebration();
    navigate('/');
  }, [dismissCelebration, navigate]);

  // Determine subject name for header
  const subjectName = session?.subject || currentSubject || pass1Data?.domainAnalysis?.domain || 'Study Session';

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            onStartLearning={handleStartLearning}
            onStartSprint={handleStartSprint}
          />
        );
      
      case 'learn':
        return <LearnTab onComplete={handleConceptComplete} />;
      
      case 'palace':
        return (
          <Suspense fallback={<div className={styles.loading}>Loading Palace...</div>}>
            <div className={styles.embeddedPage}>
              <Palace />
            </div>
          </Suspense>
        );
      
      case 'sprint':
        return (
          <Suspense fallback={<div className={styles.loading}>Loading Sprint...</div>}>
            <div className={styles.embeddedPage}>
              <Sprint />
            </div>
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
        showLifecycleNav={activeTab === 'overview' || activeTab === 'learn'}
        headerActions={
          activeTab === 'learn' ? <CognitiveGauge compact /> : undefined
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
