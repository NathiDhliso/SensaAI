/**
 * Learning Types - Shared across backend
 * Re-export from frontend types for consistency
 */

export interface LearningConcept {
  id: string;
  name: string;
  stageId: string;
  order: number;
  icon?: string;
  tier: 'trunk' | 'branch' | 'leaf';
  parentName?: string;
  trunkDomain?: string;
  cognitiveLevel?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  lifecyclePhase: 'PREPARE' | 'MODEL' | 'DELIVER';
  dependencies: string[];
  outdegree: number;
  commonPitfalls?: string[];
  connections?: Array<{
    target: string;
    type: 'requires' | 'enables' | 'is-part-of' | 'is-type-of' | 'causes' | 'constrains';
  }>;
  hookSentence?: string;
  whyYouNeed?: string;
  howToUse?: string[];
  technicalDetails?: string;
  metaphor?: string;
  workedExample?: {
    problem: string;
    solution: string;
    steps: string[];
  };
  realWorldExample?: string;
  visualElement?: string;
  actionButtonText?: string;
  mnemonic?: any;
  lifecycle?: any;
  shape?: {
    simpleCore?: string;
    highStakesExample?: string;
    analogicalModel?: string;
    patternRecognition?: {
      question: string;
      answer: string;
    };
    eliminationLogic?: string;
  };
  prerequisites?: string[];
  keyPoints?: string[];
  perspectives?: any[];
  blueprintSteps?: any[];
}
