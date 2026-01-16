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


// ... (existing imports)


import styles from './Study.module.css';

// Lazy load heavy components

const VelocityLearning = lazy(() => import('./VelocityLearning'));

// ═══════════════════════════════════════════════════════════════════════════
// TAB CONTENT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// TAB CONTENT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════





// ═══════════════════════════════════════════════════════════════════════════
// MAIN STUDY PAGE
// ═══════════════════════════════════════════════════════════════════════════

// Import Velocity Engine components locally to avoid circular deps if any
import { SessionScoutPreview } from '@/components/learning/SessionScoutPreview';
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
          // Pass fallback concepts from pass1Data to ensure full coverage
          const fallbackConcepts = result.pass1Data?.concepts || [];
          const loadResult = parseAndLoadContent(result.fullDocument, subjectId, fallbackConcepts);

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
          <div style={{ height: '100%', minHeight: '600px' }}>
            <SessionScoutPreview
              concepts={concepts}
              initialPhase="scout"
              onComplete={() => setActiveTab('learn')}
            />
          </div>
        );

      case 'learn':
        // Silver Bullet: VelocityLearning replaces legacy list view
        return (
          <Suspense fallback={<div className={styles.loading}>Loading Velocity Engine...</div>}>
            <LearningErrorBoundary
              onRecover={() => {
                // Attempt to recover by reloading the session
                console.log('[ErrorBoundary] Attempting session recovery');
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
            className={styles.overlayModal}
          >
            <div className={styles.overlayContainer}>
              <button
                onClick={() => setLearningConceptId(null)}
                className={styles.overlayCloseButton}
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
