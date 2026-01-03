import type { FloorPlanLayout } from '@/lib/generation/floor-plan-generator';
import type { SubjectGraph } from '@/lib/types/learning';

export type LifecyclePhases = {
  phase1: string;
  phase2: string;
  phase3: string;
};

export type DynamicLifecycle = {
  phase1: string;
  phase2: string;
  phase3: string;
  roleScope: string;
  domain: string;
  justification: string;
  excludedActions: string[];
  phase1Description: string;
  phase2Description: string;
  phase3Description: string;
};

export type Pass1Result = {
  domain: string;
  lifecycle: LifecyclePhases;
  roleScope: string;
  excludedActions: string[];
  concepts: string[];
  numericalLimits: string[];
  recentUpdates: string[];
  sourceVerification: string;
  lifecycleJustification?: string;
};

export type PassStatus = 'queued' | 'in-progress' | 'complete' | 'fixing';

export type ValidationResult = {
  valid: boolean;
  conceptCount: { expected: number; found: number };
  lifecycleConsistency: number;
  positiveFraming: number;
  formatConsistency: number;
  completeness: number;
  issues: Array<string | {
    section: string;
    problem: string;
    severity: 'critical' | 'minor';
    fix: string;
  }>;
  violations: {
    outOfScope: string[];
    negativeFraming: string[];
    genericContent?: string[];
  };
  fixes: Record<string, string>;
};

export type GenerationResult = {
  pass1: Pass1Result;
  pass2: string;
  pass3: string;
  validation: ValidationResult;
  fullDocument: string;
  floorPlan?: FloorPlanLayout;
  dependencyGraph?: SubjectGraph;
  metadata: {
    subject: string;
    generatedAt: string;
    qualityMetrics: {
      lifecycleConsistency: number;
      positiveFraming: number;
      formatConsistency: number;
      completeness: number;
    };
  };
};

export type ProgressCallback = (
  pass: number,
  status: PassStatus,
  data?: {
    message?: string;
    partial?: string;
    progress?: number;
    content?: string;
    lifecycle?: LifecyclePhases;
    roleScope?: string;
  } & Partial<Pass1Result> & Partial<ValidationResult>
) => void;
