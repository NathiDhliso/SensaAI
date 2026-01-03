/**
 * Parsed mnemonic context for Memory Palace
 */
export interface ParsedMnemonic {
  tier: 'Foundation' | 'Keystone' | 'Utility';
  anchor: string;      // e.g., "Volcano 🌋"
  story: string;       // Bizarre scene linking anchor to concept
  imageUrl?: string;   // Generated image URL (Silver Bullet)
  parentName?: string; // Parent concept name (pre-resolution)
  parentId?: string;   // Resolved parent ID
  dependsOn?: string[]; // Array of concept names this depends on
}

export interface ParsedConcept {
  id: string;
  name: string;
  order: number;
  stageId: string;
  logicalConnection?: string;
  phase1: {
    hookSentence: string;
    microMetaphor: string;
    prerequisite: string;
    selection: string[];
    execution: string;
  };
  phase2: string[];
  phase3: {
    tool: string;
    metrics: string[];
    thresholds: string;
  };
  // SHAPE micro-learning sections
  shape?: {
    simpleCore: string;
    highStakesExample: string;
    analogicalModel: string;
    patternRecognition: { question: string; answer: string };
    eliminationLogic: string;
  };
  // Memory Palace mnemonic context
  mnemonic?: ParsedMnemonic;
  criticalDistinctions: string[];
  designBoundaries: string[];
  examFocus: string[];
}

export interface ParsedStage {
  id: string;
  order: number;
  name: string;
  concepts: string[];
}

export interface ParsedDomainAnalysis {
  domain: string;
  professionalRole: string;
  lifecycle: {
    phase1: string;
    phase2: string;
    phase3: string;
  };
  sourceVerification: string;
  recentUpdates: string[];
  numericalLimits: string[];
  coreConceptsCount: number;
  conceptNames: string[];
}

export interface ParsedLearningPath {
  stages: {
    order: number;
    name: string;
    concepts: string[];
    conceptsWithDifficulty: { name: string; difficulty: 'foundational' | 'intermediate' | 'advanced' }[];
    difficultyProfile?: string;
    capabilitiesGained: string;
    narrativeBridge?: string;
  }[];
}

export interface ParsedAcronym {
  acronym: string;
  expansion: string;
  mnemonic: string;
}

export interface ParsedMentalAnchor {
  name: string;
  metaphor: string;
  mappings: { concept: string; metaphorElement: string }[];
  whyItHelps: string;
  acronym?: ParsedAcronym;
  binaryDecisionRule?: string;
}

export interface ParsedConfusionPair {
  id: string;
  conceptA: string;
  conceptB: string;
  distinctionKey: string;
  whenToUseA: string;
  whenToUseB: string;
}

export interface ParsedGeneratedContent {
  domainAnalysis: ParsedDomainAnalysis;
  concepts: ParsedConcept[];
  learningPath: ParsedLearningPath;
  mentalAnchors: ParsedMentalAnchor[];
  confusionPairs: ParsedConfusionPair[];
  rawContent: string;
}
