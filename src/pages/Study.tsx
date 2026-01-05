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
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLearningStore } from '@/store/learning-store';
import { useGenerationStore } from '@/store/generation-store';
import { usePalaceStore } from '@/store/palace-store';
import { storageManager } from '@/lib/storage';
import { parseAndLoadContent } from '@/lib/content-loader';
import { StudyLayout, type StudyTab } from '@/components/layout';
import {
  CelebrationModal,
  CognitiveGauge,
  NeuralResetBanner,
  SessionSummary,
} from '@/components/learning';
import { MindPalaceContainer } from '@/components/palace/FloorPlanView/MindPalaceContainer';
import ExteriorView from '@/components/palace/ExteriorView/ExteriorView';

// ... (existing imports)


import styles from './Study.module.css';

// Lazy load heavy components
const Sprint = lazy(() => import('./Sprint'));
const VelocityLearning = lazy(() => import('./VelocityLearning'));

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
  navigate: ReturnType<typeof useNavigate>;
}

function OverviewTab({ onStartLearning, onStartSprint, session, navigate }: OverviewTabProps) {
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


      {/* GRAPH MAP - The "Macro" View */}
      <section className={styles.section} style={{ minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
        <h3 className={styles.sectionTitle}>Knowledge Map</h3>

        <div className={styles.knowledgeMapContainer}>
          {!currentResult?.dependencyGraph && !currentResult?.floorPlan ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🗺️</div>
              <h2>No Knowledge Map Available</h2>
              <p>Create a Memory Palace to visualize your learning journey</p>
              <button
                className={styles.primaryButton}
                onClick={() => navigate('/')}
              >
                Go to Home
              </button>
            </div>
          ) : (
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
          )}
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
  const { subjectId } = useParams<{ subjectId: string }>();
  const [searchParams] = useSearchParams();

  // Initialize tab from URL query param or default to overview
  const initialTab = (searchParams.get('tab') as StudyTab) || 'overview';
  const [activeTab, setActiveTab] = useState<StudyTab>(initialTab);
  const [learningConceptId, setLearningConceptId] = useState<string | null>(null);
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

  // Hydration Effect: Load data from storage if store is empty or IDs mismatch
  useEffect(() => {
    const hydrateFromStorage = async () => {
      if (!subjectId) return;

      // Check if we already have the correct session loaded
      if (currentSession?.id === subjectId || currentSession?.subjectId === subjectId) {
        return;
      }

      // Need to hydrate from storage
      setIsHydrating(true);
      try {
        const result = await storageManager.loadResult(subjectId);
        if (result?.fullDocument) {
          const loadResult = parseAndLoadContent(result.fullDocument, subjectId);
          if (!loadResult.success) {
            console.error('Failed to hydrate session:', loadResult.error);
          }
        }
      } catch (error) {
        console.error('Failed to load from storage:', error);
      } finally {
        setIsHydrating(false);
      }
    };

    hydrateFromStorage();
  }, [subjectId, currentSession?.id, currentSession?.subjectId]);

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
    // Show loading spinner while hydrating
    if (isHydrating) {
      return (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading session...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            session={session}
            onStartLearning={handleStartLearning}
            onStartSprint={() => setActiveTab('sprint')}
            navigate={navigate}
          />
        );

      case 'learn':
        // Silver Bullet: VelocityLearning replaces legacy list view
        return (
          <Suspense fallback={<div className={styles.loading}>Loading Velocity Engine...</div>}>
            <div style={{ height: '100%', minHeight: '600px' }}>
              <VelocityLearning />
            </div>
          </Suspense>
        );

      case 'palace': {
        // Check if a Memory Palace exists
        const palaceState = usePalaceStore.getState();

        if (!palaceState.currentPalace) {
          return (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🏰</div>
              <h2>No Memory Palace Created</h2>
              <p>Create a Memory Palace to visualize your learning journey with spatial mnemonics.</p>
              <button
                className={styles.primaryButton}
                onClick={() => navigate('/results')}
              >
                Go to Home
              </button>
            </div>
          );
        }

        return (
          <div style={{ height: '100%', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
            <MindPalaceContainer
              concepts={concepts}
              initialMode="exterior"
              exteriorView={<ExteriorView />}
            />
          </div>
        );
      }

      case 'reference':
        // New Reference tab: shows raw fullDocument
        return (
          <div className={styles.referenceTab}>
            <h3 className={styles.referenceTitle}>Source Document</h3>
            <pre className={styles.referenceContent}>
              {currentSession?.metadata?.fullDocument || 'No document content available.'}
            </pre>
          </div>
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
              background: 'var(--overlay-black-60)',
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
