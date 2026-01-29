/**
 * Generation Types
 * 
 * Types related to multi-pass content generation, validation,
 * and the lifecycle learning framework.
 */


import type { SubjectGraph } from './learning';

// ═══════════════════════════════════════════════════════════════════════════
// LIFECYCLE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Static lifecycle phase labels
 */
export type LifecyclePhases = {
  phase1: string;
  phase2: string;
  phase3: string;
};

// ═══════════════════════════════════════════════════════════════════════════
// PASS RESULTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result from Pass 1: Domain analysis and lifecycle extraction
 */
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

/**
 * Status of each generation pass
 */
export type PassStatus = 'queued' | 'in-progress' | 'complete' | 'fixing';

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validation result with quality metrics and identified issues
 */
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

// ═══════════════════════════════════════════════════════════════════════════
// GENERATION RESULTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Complete generation result with all passes and metadata
 */
export type GenerationResult = {
  pass1: Pass1Result;
  pass2: string;
  pass3: string;
  validation: ValidationResult;
  fullDocument: string;
  jobId: string; // Backend job ID (source of truth)
  sessionId: string; // DynamoDB session ID

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

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS TRACKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Partial concept data for optimistic UI rendering
 */
export type StreamedConceptPreview = {
  order: number;
  name: string;
  anchor?: string;
};

/**
 * Callback for tracking generation progress
 */
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
    streamedConcepts?: StreamedConceptPreview[];
  } & Partial<Pass1Result> & Partial<ValidationResult>
) => void;
