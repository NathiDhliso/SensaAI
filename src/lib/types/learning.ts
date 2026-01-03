export type ConceptStatus = 'locked' | 'available' | 'current' | 'completed';

export type StageStatus = 'locked' | 'available' | 'current' | 'completed';

export interface LifecyclePhase {
  title: string;
  steps: string[];
}

export interface ConceptLifecycle {
  phase1: LifecyclePhase;
  phase2: LifecyclePhase;
  phase3: LifecyclePhase;
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
