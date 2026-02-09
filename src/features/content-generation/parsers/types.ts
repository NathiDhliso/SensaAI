/**
 * Parsed mnemonic context for Memory Palace
 */
export interface ParsedMnemonic {
  tier?: 'root' | 'trunk' | 'leaf';
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
  tier?: 'root' | 'trunk' | 'leaf';
  tierJustification?: string; // Explain WHY it fits this tier
  stageId: string;
  logicalConnection?: string;
  // NEW: Direct UI consumption fields
  whyYouNeed?: string; // Why professionals need this concept
  cognitiveLevel?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'; // Phase 2
  commonPitfalls?: string[]; // Phase 2
  technicalDetails?: string; // Advanced technical insight
  workedExample?: {
    problem: string;
    solution: string;
    steps: string[];
  };
  keyPoints?: string[]; // Key points for recall
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
  // SHAPE micro-learning sections (normalized field names)
  shape?: {
    simpleCore?: string;
    simple?: string; // Legacy fallback
    highStakesExample?: string;
    highStakes?: string; // Legacy fallback
    analogicalModel?: string;
    analogy?: string; // Legacy fallback
    patternRecognition?: { question: string; answer: string };
    pattern?: { question: string; answer: string }; // Legacy fallback
    eliminationLogic?: string;
    elimination?: string; // Legacy fallback
  };
  // Memory Palace mnemonic context
  mnemonic?: ParsedMnemonic;
  criticalDistinctions: string[];
  designBoundaries: string[];
  examFocus: string[];
  // NEW: Explicit dependency declaration (Sensa v2.0)
  dependsOn?: string[];
  strictConnections?: {
    target: string;
    type: 'requires' | 'enables' | 'is-part-of' | 'is-type-of' | 'causes' | 'constrains';
  }[];
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
  subjectType?: import('@/shared/types/macro-workflow').SubjectType;
  classification?: import('@/shared/types/macro-workflow').SubjectClassification;
  macroStructure?: import('@/shared/types/macro-workflow').MacroStructure;
  connectiveTissue?: import('@/shared/types/macro-workflow').ConnectiveTissue;
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
