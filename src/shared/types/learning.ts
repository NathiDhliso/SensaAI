
// ============================================================================
// Mnemonic & Dependency Types
// ============================================================================

export interface MnemonicContext {
  anchor: string;
  story: string;
  tier?: 'foundation' | 'keystone' | 'utility';
  parentName?: string;
  parentId?: string;
  dependsOn?: string[];
  imageUrl?: string;
}

export interface DependencyEdge {
  id: string;
  source: string;
  target: string;
  relationship: 'depends-on' | 'related-to' | 'requires' | 'extends' | 'enables' | 'contains';
  weight: number;
}

export interface DependencyMetrics {
  conceptId: string;
  conceptName: string;
  dependentCount: number;
  dependencyCount: number;
  totalConnections: number;
  calculatedTier: 'foundation' | 'keystone' | 'utility';
  centralityScore: number;
  clusterGroup: string;
}

export interface SubjectGraphNode {
  id: string;
  name: string;
  stageId: string;
  metrics: DependencyMetrics;
}

export interface SubjectGraphStats {
  totalNodes: number;
  totalEdges: number;
  foundationCount: number;
  keystoneCount: number;
  utilityCount: number;
  centralHub: string;
}

export interface SubjectGraph {
  subjectId: string;
  generatedAt: string;
  nodes: SubjectGraphNode[];
  edges: DependencyEdge[];
  stats: SubjectGraphStats;
}

// ============================================================================
// Lifecycle Types  
// ============================================================================

export interface ConceptLifecyclePhase {
  title: string;
  steps: string[];
}

export interface ConceptLifecycle {
  phase1: ConceptLifecyclePhase;
  phase2: ConceptLifecyclePhase;
  phase3: ConceptLifecyclePhase;
}

// ============================================================================
// Session Types
// ============================================================================

export interface SessionPrimer {
  reason: string;
  action: string;
  reward: string;
}

export type StudyGoal = 'learn-new' | 'review' | 'velocity' | 'explore';
export type SessionDuration = 15 | 30 | 45 | 60;

export interface SessionRecommendation {
  action: string;
  estimatedMinutes: number;
}

export type LifecyclePhaseKey = 'phase1' | 'phase2' | 'phase3';

export interface EnhancedCognitiveMetrics {
  currentLoad: number;
  consecutiveCorrect: number;
  consecutiveErrors: number;
  avgResponseTimeMs: number;
  phaseLoadBalance: { prepare: number, model: number, deliver: number };
  confusionDrillAccuracy: number;
  conceptRevisits: number;
  uninterruptedConceptStreak: number;
  averageConceptTime: number;
  flowStateMinutes: number;
}

export interface WorkedExample {
  problem: string;
  solution: string;
  steps: string[];
}

// ============================================================================
// Learning Concept Types
// ============================================================================

export interface ShapeContent {
  simpleCore?: string;
  highStakesExample?: string;
  analogicalModel?: string;
  patternRecognition?: {
    question: string;
    answer: string;
  };
  eliminationLogic?: string;
}

export interface LearningConcept {
  id: string;
  name: string;
  stageId: string;
  order: number;
  icon?: string;

  // ========== SENSA v2.0 TIER SYSTEM (REQUIRED) ==========
  /**
   * Top-level tier classification for progression control.
   * - foundation: Core concepts (outdegree ≥ 5)
   * - keystone: Connecting concepts (outdegree 2-4)
   * - utility: Polish/optimization (outdegree ≤ 1)
   */
  tier: 'foundation' | 'keystone' | 'utility';

  /**
   * Bloom's Taxonomy Level (Phase 2 Cognitive Model)
   */
  cognitiveLevel?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

  /**
   * The Lifecycle Phase this concept belongs to (Spatial Dimension).
   * - PREPARE: Foundation/Setup (Phase 1)
   * - MODEL: Core Action/Implementation (Phase 2)
   * - DELIVER: Verification/Output (Phase 3)
   */
  lifecyclePhase: 'PREPARE' | 'MODEL' | 'DELIVER';

  /**
   * Explanation of why this concept belongs to its tier.
   * Generated dynamically by the AI.
   */
  tierJustification?: string;

  /**
   * Array of concept IDs this concept depends on.
   * Foundation concepts typically have empty arrays.
   */
  dependencies: string[];

  /**
   * Count of concepts that depend on THIS concept.
   * Calculated from other concepts' dependencies arrays.
   */
  outdegree: number;

  /**
   * Common Pitfalls / Critical Distinguishements (Phase 2)
   */
  commonPitfalls?: string[];

  /**
   * AI-generated semantic connections to other concepts.
   * Types: requires, extends, enables, contains, related-to
   */
  connections?: Array<{
    target: string;
    type: 'requires' | 'extends' | 'enables' | 'contains' | 'related-to';
  }>;
  // ========== END SENSA v2.0 ==========

  // Core Content
  hookSentence?: string;
  whyYouNeed?: string;
  howToUse?: string[];
  technicalDetails?: string;
  metaphor?: string;
  workedExample?: WorkedExample;
  realWorldExample?: string;
  logicalConnection?: string;
  visualElement?: string;
  actionButtonText?: string;

  // Metadata
  mnemonic?: MnemonicContext;

  lifecycle?: ConceptLifecycle;

  // SHAPE Content (SensaAI Generated)
  shape?: ShapeContent;

  prerequisites?: string[];
  keyPoints?: string[];
}

// ============================================================================
// Learning Stage Types
// ============================================================================

export interface LearningStage {
  id: string;
  // Required core fields
  title: string;
  description: string;
  icon: string;
  celebrationTitle: string;
  celebrationMessage: string;
  // Extended fields for content generation
  order?: number;
  name?: string;
  metaphor?: string;
  metaphorDescription?: string;
  concepts?: string[];
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
  
  // Attempt tracking for infinite loop prevention
  conceptAttempts: Record<string, number>; // conceptId -> attempt count
  conceptScores: Record<string, number>; // conceptId -> last score
  conceptStatuses: Record<string, 'not-started' | 'in-progress' | 'needs-review' | 'mastered' | 'skipped'>;
  maxAttemptsPerConcept: number; // Default: 3
}

export interface CelebrationData {
  type: 'stage' | 'course';
  title: string;
  message: string;
  conceptsCompleted: string[];
  timeSpent?: number;
  badgeIcon: string;
}

export interface StudySession {
  id: string;
  subjectId: string;
  startedAt: string;
  endedAt?: string;

  goal: StudyGoal;
  targetConcepts: string[];
  targetPhases: LifecyclePhaseKey[];
  targetDuration: number;

  conceptsCompleted: string[];
  phasesCompleted: Record<string, LifecyclePhaseKey[]>;
  confusionDrillsCompleted: number;

  metrics: EnhancedCognitiveMetrics;
  breaksTaken: number;
  isActive: boolean;
  goalAchieved: boolean;

  // SENSA Phase 0: See
  primer: SessionPrimer | null;
  // SENSA Phase 1: Explore
  scouted: boolean;
  // SENSA Explore+
  previewed: boolean;
  // SENSA Phase 2: Note
  mapBuilt: boolean;
  conceptMap?: ConceptMapData | null;
  // SENSA Phase 3: Study
  mapReconstructed: boolean;
  // SENSA Phase 4: Apply
  mastered: boolean;
  // Step 3: The Guess (Priming) - User predictions per concept
  predictions: Record<string, string>;

  // ========== MOMENTUM CHECKPOINT SYSTEM ==========
  /** Number of times we've offered a checkpoint this session */
  checkpointOffers: number;
  /** Timestamp of last checkpoint offer (ISO string) */
  lastCheckpointAt: string | null;
  /** Whether user is currently detected in flow state */
  isInFlowState: boolean;
  /** Timestamp when time toast was shown (to prevent re-showing) */
  timeToastShownAt: string | null;
  
  // ========== AI COACH PERSONALIZATION ==========
  /** User's current mood for AI Coach response adjustment */
  mood?: 'pumped' | 'good' | 'okay' | 'struggling' | 'tired';
}

export interface ConceptMapData {
  nodes: { id: string; conceptId: string; conceptName: string; x: number; y: number }[];
  connections: { id: string; fromId: string; toId: string; label: string }[];
}
