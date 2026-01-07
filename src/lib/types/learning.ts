
// ============================================================================
// Mnemonic & Dependency Types
// ============================================================================

export interface MnemonicContext {
  anchor: string;
  story: string;
  tier: 'Foundation' | 'Keystone' | 'Utility';
  parentName?: string;
  parentId?: string;
  dependsOn?: string[];
  imageUrl?: string;
}

export interface DependencyEdge {
  id: string;
  source: string;
  target: string;
  relationship: 'depends-on' | 'related-to';
  weight: number;
}

export interface DependencyMetrics {
  conceptId: string;
  conceptName: string;
  dependentCount: number;
  dependencyCount: number;
  totalConnections: number;
  calculatedTier: 'Foundation' | 'Keystone' | 'Utility';
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

export type StudyGoal = 'learn-new' | 'review' | 'explore';
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

export interface LearningConcept {
  id: string;
  name: string;
  stageId: string;
  order: number;
  icon?: string;

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
}

export interface ConceptMapData {
  nodes: { id: string; conceptId: string; x: number; y: number }[];
  connections: { id: string; fromId: string; toId: string; label: string }[];
}
