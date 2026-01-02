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
  /** Parent concept name (from LLM, pre-resolution) */
  parentName?: string;
  /** Resolved parent concept ID (set by parser) */
  parentId?: string;
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
