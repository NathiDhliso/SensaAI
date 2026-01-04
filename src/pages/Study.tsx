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
import { useNavigate } from 'react-router-dom';
import { useLearningStore } from '@/store/learning-store';
import { useGenerationStore } from '@/store/generation-store';
import { StudyLayout, type StudyTab } from '@/components/layout';
import {
  LifecycleNavigator,
  CelebrationModal,
  CognitiveGauge,
  NeuralResetBanner,
  SessionSummary,
} from '@/components/learning';
import { MindPalaceContainer } from '@/components/palace/FloorPlanView/MindPalaceContainer';
// Focus session is now merged into learning-store
import styles from './Study.module.css';

// Lazy load heavy components
const Sprint = lazy(() => import('./Sprint'));

// ═══════════════════════════════════════════════════════════════════════════
// TAB CONTENT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// TAB CONTENT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

interface OverviewTabProps {
  onStartLearning: (conceptId: string) => void;
  onStartSprint: () => void;
  session: any;
}

function OverviewTab({ onStartLearning, onStartSprint, session }: OverviewTabProps) {
  const {
    getConcepts,
    getStages,
    currentSession,
  } = useLearningStore();

  const { validation, results } = useGenerationStore();

  const concepts = getConcepts();
  const stages = getStages();
  const hasContent = concepts.length > 0;
  const progress = currentSession?.progress;

  // Find floor plan and graph from generation results for the current subject
  const currentResult = useMemo(() =>
    results.find(r => r.metadata.subject === session?.subject),
    [results, session?.subject]
  );

  const progressPercent = hasContent
    ? Math.round(((progress?.completedConcepts?.length ?? 0) / concepts.length) * 100)
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
    const completed = progress?.completedConcepts?.length ?? 0;
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
  }, [concepts, progress?.completedConcepts, hasContent]);

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
          <span className={styles.statValue}>{progress?.completedConcepts?.length ?? 0}</span>
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

      {/* GRAPH MAP - The "Macro" View */}
      <section className={styles.section} style={{ minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
        <h3 className={styles.sectionTitle}>Knowledge Map</h3>

        <div className={styles.graphContainer}>
          <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              Loading Map...
            </div>
          }>
            {/* 
                  Directly embed MindPalaceContainer in Graph Mode 
                  This provides the interactive graph we just built
                */}
            <MindPalaceContainer
              initialMode="graph"
              concepts={concepts}
              floorPlan={currentResult?.floorPlan}
              dependencyGraph={currentResult?.dependencyGraph}
              onConceptSelect={(id: string) => onStartLearning(id)}
              disableInternalCinematic={true}
            />
          </Suspense>
        </div>
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

// ═══════════════════════════════════════════════════════════════════════════
// MAIN STUDY PAGE
// ═══════════════════════════════════════════════════════════════════════════

// Import Velocity Engine components locally to avoid circular deps if any
import { MicroLearningLoopController } from '@/components/learning';
import { AnimatePresence, motion } from 'framer-motion';

export default function Study() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<StudyTab>('overview');
  const [learningConceptId, setLearningConceptId] = useState<string | null>(null);

  const {
    getSession,
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

  // Start learning session on mount
  useEffect(() => {
    startSession();
    return () => endSession();
  }, [startSession, endSession]);

  // Handle tab changes
  const handleTabChange = useCallback((tab: StudyTab) => {
    setActiveTab(tab);
    setLearningConceptId(null); // Exit learning mode on tab change
  }, []);

  // Navigate to unified learning view (The "Zoom")
  const handleStartLearning = useCallback((conceptId: string) => {
    setLearningConceptId(conceptId);
    // We stay in 'overview' tab but show the overlay, or we could switch tab.
    // Keeping 'overview' lets the graph stay mounted underneath for smoother exit.
  }, []);

  // Handle concept completion in Micro-Loop
  const handleLoopComplete = useCallback((outcome: string, _time: number) => {
    // Optional: Play a sound or mini-celebration
    // Then close the loop or go to next recommended concept
    if (outcome === 'mastered') {
      // Find next concept logic could go here
    }
    setLearningConceptId(null); // Zoom back out
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
  const subjectName = session?.subject || currentSubject || pass1Data?.domain || 'Study Session';

  // Get active concept object
  const activeConcept = useMemo(() =>
    concepts.find(c => c.id === learningConceptId),
    [concepts, learningConceptId]);

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            session={session}
            onStartLearning={handleStartLearning}
            onStartSprint={() => setActiveTab('sprint')}
          />
        );

      case 'learn':
        // Legacy list-based learning, kept for fallback/preference
        return <OverviewTab session={session} onStartLearning={handleStartLearning} onStartSprint={() => setActiveTab('sprint')} />; // Reusing overview for now as learn tab is redundant with graph

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
        showLifecycleNav={activeTab === 'overview'}
        headerActions={
          <CognitiveGauge compact />
        }
      >
        {renderTabContent()}
      </StudyLayout>

      {/* 
        SILVER BULLET: Cinematic Learning Bridge
        This overlay provides the "Zoom-to-Learn" experience.
        It sits on top of the Graph, creating a seamless transition.
      */}
      <AnimatePresence>
        {learningConceptId && activeConcept && (
          <motion.div
            key="learning-overlay"
            initial={{ opacity: 0, scale: 0.8, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, scale: 1, backdropFilter: 'blur(10px)' }}
            exit={{ opacity: 0, scale: 0.8, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 50, // Above everything including layout
              background: 'rgba(15, 23, 42, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem'
            }}
          >
            <div style={{ width: '100%', maxWidth: '1000px', height: '100%', maxHeight: '90vh', position: 'relative' }}>
              <button
                onClick={() => setLearningConceptId(null)}
                style={{
                  position: 'absolute',
                  top: '-3rem',
                  right: 0,
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 500
                }}
              >
                ✕ Close Interaction
              </button>

              <MicroLearningLoopController
                concept={activeConcept}
                complexityScore={5}
                onLoopComplete={handleLoopComplete}
                onSkip={() => setLearningConceptId(null)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
