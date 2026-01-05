
export interface SessionPrimer {
  reason: string;
  action: string;
  reward: string;
}

export type StudyGoal = 'learn-new' | 'review' | 'sprint' | 'explore';
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

  // Metadata
  mnemonic?: {
    tier: 'Foundation' | 'Keystone' | 'Utility';
    parentId?: string;
    dependsOn?: string[];
  };

  lifecycle?: {
    phase1: { title: string; steps: string[] };
    phase2: { title: string; steps: string[] };
    phase3: { title: string; steps: string[] };
  };

  prerequisites?: string[];
}

export interface LearningStage {
  id: string;
  title: string;
  description: string;
  icon: string;
  celebrationTitle: string;
  celebrationMessage: string;
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

  // Phase 0: Prime
  primer: SessionPrimer | null;
  // Phase 1: Scout
  scouted: boolean;
  // Phase 1.5: Preview
  previewed: boolean;
}
