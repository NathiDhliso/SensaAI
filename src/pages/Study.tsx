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
import { usePersonalizationStore } from '@/store/personalization-store';
import type { StudyGoal, LearnerMood } from '@/shared/types/learning';
import { storageManager } from '@/features/content-storage';
import { conceptsApi } from '@/shared/api/concepts';
import { buildDocumentFromConcepts } from '@/shared/utils/content-builder';
import { parseAndLoadContent } from '@/shared/utils/content-loader';
import { getTimeUntilExpiry } from '@/features/learning-session/progress/session-tracker';
import { StudyLayout, type StudyTab } from '@/components/layout';
import CelebrationModal from '@/components/learning/feedback/CelebrationModal';
import CognitiveGauge from '@/components/learning/ui/CognitiveGauge';
import { SessionSummary } from '@/components/learning/session/SessionSummary';
import { LearningErrorBoundary } from '@/components/error/LearningErrorBoundary';
import { SessionStartModal, MOOD_GOAL_MAP, SessionScoutPreview } from '@/components/learning/session';
import { CoachMessage } from '@/features/ai-coach/components';
import { MetaphorToggle } from '@/features/personalization';
import { useStruggleDetector } from '@/shared/hooks/useStruggleDetector';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import { useCoachMessage } from '@/shared/hooks/useCoachMessage';
import { toast } from '@/shared/utils/toast';
import { getInterleavingAlgorithm } from '@/features/learning-session/algorithms/interleaving';
import { getZPDConcepts } from '@/features/learning-session/algorithms/concept-selection';
import HelpModal from '@/components/ui/HelpModal';
import NeuralResetBanner from '@/components/learning/feedback/NeuralResetModal';
import GymActivityLauncher, { type GymActivity } from '@/components/learning/gym/GymActivityLauncher';
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
 // Session configuration state
 const [showSessionConfig, setShowSessionConfig] = useState(false);
 const [showHelpModal, setShowHelpModal] = useState(false);
 // Track if user has seen session config before (skip for returning users)
 const [hasSeenSessionConfig, setHasSeenSessionConfig] = useState(() => {
 return localStorage.getItem('hasSeenSessionConfig') === 'true';
 });
 // Coach message hook with 30s cooldown
 const { currentMessage: coachMessage, showMessage: showCoachMessage } = useCoachMessage({
 autoDismissMs: 8000,
 useMoodAdjustment: true,
 cooldownMs: 30000, // 30 seconds between messages
 });
 const {
 getSession,
 currentSession,
 showCelebration,
 celebrationData,
 dismissCelebration,
 startSession,
 endSession,
 getConcepts
 } = useLearningStore();
 const { currentSubject, pass1Data } = useGenerationStore();
 const { isScholarly } = useVisualTheme();
 const session = getSession();
 const concepts = getConcepts();
 const [hydrationError, setHydrationError] = useState<string | null>(null);
 const [retryCount, setRetryCount] = useState(0);
 const MAX_RETRIES = 3;
 // Struggle detection with adjusted thresholds
 useStruggleDetector({
 idleThresholdSeconds: 90, // Increased from 45s - less aggressive
 errorThreshold: 3, // Increased from 2 - less sensitive
 backspaceThreshold: 40, // Increased from 30 - less sensitive
 onStruggleChange: (state) => {
 // Only show if confidence is high and user is genuinely struggling
 if (state.isStruggling && state.strugglingReason && state.confidence > 0.6) {
 // Show encouraging coach message (10s timeout for struggle messages)
 showCoachMessage('build', 'struggle', 10000);
 }
 }
 });
 // Hydration Effect: Load data from storage if store is empty or IDs mismatch
 useEffect(() => {
 const hydrateFromStorage = async () => {
 if (!subjectId) {
 setHydrationError('SESSION_ID_MISSING');
 return;
 }
 // Check if we already have the correct session loaded
 if (currentSession) {
 if (currentSession.id === subjectId || currentSession.subjectId === subjectId) {
 return;
 }
 }
 const navigationState = location.state as { freshGeneration?: boolean; community?: boolean; ownerId?: string } | null;
 if (navigationState?.freshGeneration && currentSession) {
 return;
 }
 // Need to hydrate from storage
 setIsHydrating(true);
 setHydrationError(null);
 try {
 let result = null;
 if (navigationState?.community && navigationState?.ownerId) {
 const publicData = await conceptsApi.getPublicContent(navigationState.ownerId, subjectId);
 const fullDocument = buildDocumentFromConcepts(publicData.subject, publicData.concepts);
 result = {
 id: publicData.jobId,
 subject: publicData.subject,
 generatedAt: new Date().toISOString(),
 fullDocument,
 pass1Data: {
 domain: publicData.subject,
 roleScope: 'General',
 lifecycle: { phase1: 'PREPARE', phase2: 'MODEL', phase3: 'DELIVER' },
 concepts: publicData.concepts.map((c: { name: string }) => c.name)
 },
 validation: {
 completeness: 90,
 lifecycleConsistency: 90,
 positiveFraming: 90,
 formatConsistency: 90
 },
 savedLocally: false,
 savedToCloud: true
 };
 } else {
 result = await storageManager.loadResult(subjectId);
 }
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
 const loadResult = parseAndLoadContent(result.fullDocument, subjectId);
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
 // Session expiry warning check
 useEffect(() => {
 if (!currentSession?.id) return;
 const checkExpiry = () => {
 const expiryInfo = getTimeUntilExpiry(currentSession.id);
 if (expiryInfo?.isWarning && !expiryInfo.isExpired) {
 toast.warning(`Session expires in ${expiryInfo.formattedTime}. Save your progress!`, {
 duration: 10000
 });
 } else if (expiryInfo?.isExpired) {
 toast.error('Session has expired. Please start a new session.', {
 duration: 10000
 });
 }
 };
 // Check on mount
 checkExpiry();
 // Check every 5 minutes
 const interval = setInterval(checkExpiry, 5 * 60 * 1000);
 return () => clearInterval(interval);
 }, [currentSession?.id]);
 // Handle session start (after user completes session configuration)
 const handleSessionStart = useCallback((goal: StudyGoal, duration: number, primer?: { reason: string; action: string; reward: string }) => {
 const { startStudySession, setMood } = useLearningStore.getState();
 // Mark that user has seen session config
 localStorage.setItem('hasSeenSessionConfig', 'true');
 setHasSeenSessionConfig(true);
 // Get current personalization settings
 const { practiceMode } = usePersonalizationStore.getState();
 const { getConcepts } = useLearningStore.getState();
 const concepts = getConcepts();
 // Calculate target number of concepts (approx 5 min per concept)
 const sessionSize = Math.max(3, Math.ceil(duration / 5));
 let targetConcepts: string[] = [];
 // Select concepts based on Practice Mode
 try {
 if (practiceMode === 'mixed') {
 const interleaver = getInterleavingAlgorithm();
 // Use existing concepts if already loaded
 targetConcepts = interleaver.getMixedPracticeSession(concepts, sessionSize).map(c => c.id);
 } else if (practiceMode === 'progressive') {
 const interleaver = getInterleavingAlgorithm();
 targetConcepts = interleaver.getProgressiveSession(concepts, sessionSize).concepts.map(c => c.id);
 } else {
 // Blocked mode: Use ZPD selection to find optimal next concepts
 // Note: Passing empty performance map for now - will be enhanced with real metrics later
 const zpdConcepts = getZPDConcepts(concepts, new Map(), { minConcepts: sessionSize });
 targetConcepts = zpdConcepts.map(r => r.concept.id);
 }
 } catch (err) {
 console.warn('Algorithm selection failed, falling back to sequential:', err);
 const completedIds = new Set(session?.progress?.completedConcepts || []);
 targetConcepts = concepts
 .filter(c => !completedIds.has(c.id))
 .slice(0, sessionSize)
 .map(c => c.id);
 }
 // Save preferences for next time
 localStorage.setItem('lastSessionGoal', goal);
 localStorage.setItem('lastSessionDuration', duration.toString());
 // Start the study session with selected parameters and concepts
 startStudySession(goal, duration, targetConcepts, primer);
 const { lastSessionMood } = usePersonalizationStore.getState();
 if (lastSessionMood) {
 const mappedMood = MOOD_GOAL_MAP[lastSessionMood]?.storeMood || 'good';
 setMood(mappedMood as LearnerMood);
 }
 // Close modal
 setShowSessionConfig(false);
 // Show coach intro message (mood-adjusted)
 showCoachMessage('prime', 'intro', 8000);
 // Navigate to learn tab
 setActiveTab('learn');
 }, [showCoachMessage, session, setActiveTab]);
 const handleTabChange = useCallback((tab: StudyTab) => {
 const { studySession } = useLearningStore.getState();
 const hasGymActivity = searchParams.get('activity');
 if (tab === 'learn') {
 if (!studySession && concepts.length === 0) {
 toast.warning('Please complete the overview first to understand the concepts');
 return;
 }
 if (!studySession && !hasGymActivity) {
 setShowSessionConfig(true);
 return;
 }
 }
 setActiveTab(tab);
 }, [concepts, searchParams]);
 useEffect(() => {
 const urlTab = searchParams.get('tab') as StudyTab;
 if (!urlTab) return;
 if (urlTab === 'learn') {
 const { studySession } = useLearningStore.getState();
 const hasGymActivity = searchParams.get('activity');
 if (hasGymActivity && concepts.length > 0) {
 setActiveTab('learn');
 return;
 }
 if (!studySession) {
 if (concepts.length > 0) {
 setShowSessionConfig(true);
 setActiveTab('overview');
 } else {
 setActiveTab('overview');
 navigate(`/study/${subjectId}?tab=overview`, { replace: true });
 toast.info('Loading content — please start a session first');
 }
 } else {
 setActiveTab('learn');
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
 <div className={styles.errorIcon}></div>
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
 Refresh Page
 </button>
 ) : (
 <>
 <button
 onClick={() => navigate('/')}
 className={styles.primaryButton}
 >
 {isScholarly ? errorInfo.action : ` ${errorInfo.action}`}
 </button>
 {retryCount >= MAX_RETRIES && (
 <button
 onClick={() => {
 setRetryCount(0);
 setHydrationError(null);
 }}
 className={styles.secondaryButton}
 >
 Try Again
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
 onComplete={() => {
 // Auto-start with defaults for returning users
 if (hasSeenSessionConfig) {
 // Use last session settings or sensible defaults
 const lastGoal = localStorage.getItem('lastSessionGoal') as StudyGoal || 'learn-new';
 const lastDuration = parseInt(localStorage.getItem('lastSessionDuration') || '30');
 handleSessionStart(lastGoal, lastDuration);
 } else {
 // First time users see the full modal
 setShowSessionConfig(true);
 }
 }}
 />
 </div>
 );
 case 'learn': {
 const activityParam = searchParams.get('activity') as GymActivity | null;
 const validActivities: GymActivity[] = ['concept-map', 'peer-review', 'mastery', 'pre-mortem'];
 if (activityParam && validActivities.includes(activityParam) && concepts.length > 0) {
 return (
 <GymActivityLauncher
 activity={activityParam}
 concepts={concepts}
 onBack={() => {
 navigate(`/launchpad/${subjectId}`);
 }}
 />
 );
 }
 return (
 <Suspense fallback={<div className={styles.loading}>Loading Velocity Engine...</div>}>
 <LearningErrorBoundary
 onRecover={() => {
  // Retry hydration by resetting error and incrementing retry count
  setHydrationError(null);
  setRetryCount(prev => prev + 1);
 }}
 onAbandon={() => {
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
 }
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
 <div className={styles.headerActions}>
 {useLearningStore.getState().studySession && (
 <button
 onClick={() => setShowSessionConfig(true)}
 title="Recalibrate session — change your energy level"
 className={styles.recalibrateButton}
 >
 Recalibrate
 </button>
 )}
 <button
 onClick={() => setShowHelpModal(true)}
 title="Help & Shortcuts"
 className={styles.helpButton}
 >
 {isScholarly ? '?' : ''}
 </button>
 <MetaphorToggle compact showSettings />
 <CognitiveGauge compact />
 </div>
 }
 >
 {renderTabContent()}
 </StudyLayout>
 {/* Coach Message Toast - Fixed Bottom Right */}
 {coachMessage && (
 <div className={styles.coachToast}>
 <CoachMessage
 message={coachMessage}
 compact
 />
 </div>
 )}
 {/* Session Configuration Modal - Shows when user clicks "Start Learning" */}
 {showSessionConfig && (
 <SessionStartModal
 subjectName={subjectName}
 totalConcepts={concepts.length}
 completedConcepts={session?.progress?.completedConcepts?.length || 0}
 onStart={handleSessionStart}
 onBack={() => setShowSessionConfig(false)}
 />
 )}
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
 {/* Neural Reset Banner - shows break suggestion */}
 <NeuralResetBanner />
 {/* Help Modal */}
 <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
 </>
 );
}

