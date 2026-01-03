export type ConceptStatus = 'locked' | 'available' | 'current' | 'completed';

export type StageStatus = 'locked' | 'available' | 'current' | 'completed';

export type LifecyclePhaseKey = 'phase1' | 'phase2' | 'phase3';

export interface LifecyclePhase {
  title: string;
  steps: string[];
}

export interface ConceptLifecycle {
  phase1: LifecyclePhase;
  phase2: LifecyclePhase;
  phase3: LifecyclePhase;
}

// ============================================================================
// PHASE 4: CONFUSION PREVENTION SYSTEM
// Enables targeted drilling to prevent common concept mix-ups
// ============================================================================

/**
 * Represents a common confusion between two concepts.
 * Used to trigger confusion drills at concept boundaries.
 * 
 * @see SILVER_BULLET_LEARNING_ARCHITECTURE.md Phase 4
 */
export interface ConfusionPair {
  /** Unique identifier */
  id: string;
  /** ID of the concept this is commonly confused with */
  relatedConceptId: string;
  /** Name of the related concept (for display) */
  relatedConceptName: string;
  /** Description of why students confuse these concepts */
  commonMistake: string;
  /** Clear explanation of the key difference */
  correctDifference: string;
  /** Memorable phrase to distinguish them */
  mnemonicDistinguisher: string;
  /** How critical is this confusion to address */
  priority: 'high' | 'medium' | 'low';
}

/**
 * Quiz question specifically for confusion drill.
 */
export interface ConfusionDrillQuestion {
  id: string;
  /** The question asking to distinguish concepts */
  question: string;
  /** Available options */
  options: string[];
  /** Index of correct option */
  correctIndex: number;
  /** Explanation shown after answering */
  explanation: string;
  /** Related confusion pair ID */
  confusionPairId: string;
}

/**
 * Mnemonic context for Memory Palace integration.
 * Enables spatial learning through tier-scaled visual anchors.
 */
export interface MnemonicContext {
  /** Concrete object + emoji (e.g., "Volcano 🌋") */
  anchor: string;
  /** Bizarre story linking anchor to concept function */
  story: string;
  /** Determines visual scale: Foundation=largest, Utility=smallest */
  tier: 'Foundation' | 'Keystone' | 'Utility';
  /** Generated image URL for "Foundation" concepts (Silver Bullet) */
  imageUrl?: string;
  /** Parent concept name (from LLM, pre-resolution) */
  parentName?: string;
  /** Resolved parent concept ID (set by parser) */
  parentId?: string;
  /** Concepts this one depends on (from LLM) */
  dependsOn?: string[];
}

/**
 * Metrics calculated from content generation dependency analysis.
 * The LOGIC layer - drives layout algorithm for Floor Plan.
 */
export interface DependencyMetrics {
  conceptId: string;
  conceptName: string;

  /** How many concepts depend on THIS (high = Foundation) */
  dependentCount: number;
  /** How many concepts THIS depends on */
  dependencyCount: number;
  /** Sum of dependentCount + dependencyCount */
  totalConnections: number;

  /** Auto-calculated tier based on dependentCount */
  calculatedTier: 'Foundation' | 'Keystone' | 'Utility';

  /** 0-1 hub importance score */
  centralityScore: number;
  /** Stage/lifecycle group ID */
  clusterGroup: string;
}

/**
 * Edge in the dependency graph
 */
export interface DependencyEdge {
  id: string;
  /** Source concept ID (the dependent) */
  source: string;
  /** Target concept ID (the dependency) */
  target: string;
  /** Relationship type */
  relationship: 'depends-on' | 'enables' | 'related-to';
  /** Connection strength 0-1 */
  weight: number;
}

/**
 * Full dependency graph for a subject.
 * Used for Floor Plan layout and Graph View visualization.
 */
export interface SubjectGraph {
  subjectId: string;
  generatedAt: string;

  nodes: Array<{
    id: string;
    name: string;
    stageId: string;
    metrics: DependencyMetrics;
  }>;

  edges: DependencyEdge[];

  /** Aggregated statistics */
  stats: {
    totalNodes: number;
    totalEdges: number;
    foundationCount: number;
    keystoneCount: number;
    utilityCount: number;
    /** Most connected concept ID */
    centralHub: string;
  };
}

export interface LearningConcept {
  id: string;
  stageId: string;
  order: number;
  name: string;
  icon: string;
  metaphor: string;
  hookSentence: string;
  whyYouNeed: string;
  realWorldExample: string;
  howToUse: string[];
  technicalDetails: string;
  prerequisites: string[];
  visualElement: string;
  actionButtonText: string;
  lifecycle?: ConceptLifecycle;
  logicalConnection?: string;
  /** Memory Palace mnemonic context */
  mnemonic?: MnemonicContext;
  /** Phase 4: Confusion pairs for drilling at concept boundaries */
  confusionPairs?: ConfusionPair[];
  /** Phase 4: Pre-generated confusion drill questions */
  confusionDrillQuestions?: ConfusionDrillQuestion[];
}

export interface LearningStage {
  id: string;
  order: number;
  name: string;
  metaphor: string;
  metaphorDescription: string;
  icon: string;
  concepts: string[];
  celebrationTitle: string;
  celebrationMessage: string;
  narrativeBridge?: string;
}

export interface UserProgress {
  currentStageId: string;
  currentConceptId: string;
  completedConcepts: string[];
  completedStages: string[];
  conceptsLearnedToday: number;
  lastSessionDate: string;
  totalTimeSpentMinutes: number;
  sessionStartTime: number | null;
}

export interface CelebrationData {
  type: 'concept' | 'stage' | 'course';
  title: string;
  message: string;
  conceptsCompleted?: string[];
  timeSpent?: number;
  badgeIcon?: string;
}

// ============================================================================
// PHASE 5: SINGLE-PAGE LEARNING EXPERIENCE
// Session-based model for unified learning flow
// ============================================================================

/**
 * Study session goal types.
 * Determines UI behavior and concept selection.
 */
export type StudyGoal = 'learn-new' | 'review' | 'sprint' | 'explore';

/**
 * Session duration presets in minutes.
 */
export type SessionDuration = 15 | 30 | 45 | 60 | 'custom';

/**
 * Enhanced cognitive metrics with lifecycle-specific tracking.
 * @see SILVER_BULLET_LEARNING_ARCHITECTURE.md Key Metrics
 */
export interface EnhancedCognitiveMetrics {
  /** Base cognitive load (0-100) */
  currentLoad: number;
  /** Consecutive correct answers */
  consecutiveCorrect: number;
  /** Consecutive errors */
  consecutiveErrors: number;
  /** Rolling average response time */
  avgResponseTimeMs: number;
  
  // ─── Lifecycle-Specific Tracking ─────────────────────────────────────
  /** Distribution of session time across lifecycle phases */
  phaseLoadBalance: {
    prepare: number;  // % of session in PREPARE
    model: number;    // % of session in MODEL
    deliver: number;  // % of session in DELIVER
  };
  
  // ─── Confusion Prevention ────────────────────────────────────────────
  /** Accuracy on confusion drills (0-100) */
  confusionDrillAccuracy: number;
  /** Number of times student went back to previous concepts */
  conceptRevisits: number;
  
  // ─── Flow State Indicators ───────────────────────────────────────────
  /** Consecutive concepts without interruption */
  uninterruptedConceptStreak: number;
  /** Average time per concept (seconds) */
  averageConceptTime: number;
  /** Minutes in optimal flow state */
  flowStateMinutes: number;
}

/**
 * Study Session - The unified learning experience model.
 * 
 * Replaces fragmented page navigation with a session-based approach.
 * @see SILVER_BULLET_LEARNING_ARCHITECTURE.md Phase 5
 */
export interface StudySession {
  /** Unique session ID */
  id: string;
  /** Subject/content identifier */
  subjectId: string;
  /** When session started */
  startedAt: string;
  /** When session ended (null if active) */
  endedAt?: string;
  
  // ─── Session Goals ───────────────────────────────────────────────────
  /** What the student wants to achieve */
  goal: StudyGoal;
  /** Target concepts for this session */
  targetConcepts: string[];
  /** Focus on specific lifecycle phases */
  targetPhases: LifecyclePhaseKey[];
  /** Planned session length in minutes */
  targetDuration: number;
  
  // ─── Progress Within Session ─────────────────────────────────────────
  /** Concepts completed during this session */
  conceptsCompleted: string[];
  /** Phases completed per concept */
  phasesCompleted: Record<string, LifecyclePhaseKey[]>;
  /** Confusion drills passed */
  confusionDrillsCompleted: number;
  
  // ─── Cognitive State ─────────────────────────────────────────────────
  /** Enhanced metrics for this session */
  metrics: EnhancedCognitiveMetrics;
  /** Number of breaks taken */
  breaksTaken: number;
  
  // ─── Session Status ──────────────────────────────────────────────────
  /** Whether session is active */
  isActive: boolean;
  /** Whether student achieved their goal */
  goalAchieved: boolean;
}

/**
 * Recommended action shown at session start.
 */
export interface SessionRecommendation {
  /** Action description */
  action: string;
  /** Estimated duration */
  estimatedMinutes: number;
  /** Why this is recommended */
  reason: string;
  /** Target concepts */
  conceptIds: string[];
}
