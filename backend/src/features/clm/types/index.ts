/**
 * Content Lifecycle Management (CLM) System Types
 * 
 * Type definitions for the CLM system that enables surgical content updates
 * through AI-powered audits and curator approval workflows.
 */

import { LearningConcept } from '../../../shared/types/learning.js';

// ============================================================================
// Enums and Constants
// ============================================================================

export type AuditType = 'schema' | 'content' | 'coverage' | 'quality';
export type AuditStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type IssueType = 
  | 'missing-field'
  | 'invalid-field'
  | 'deprecated-field'
  | 'hallucination'
  | 'outdated-content'
  | 'template-content'
  | 'weak-connection'
  | 'coverage-gap'
  | 'validation-error';

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type OperationType = 'INSERT' | 'UPDATE' | 'DELETE' | 'RELINK' | 'ENRICH';
export type FindingStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'failed';

// ============================================================================
// Exam Objective Types
// ============================================================================

export interface ExamObjective {
  id: string;
  code: string; // e.g., "AZ-104.1.1"
  title: string;
  description: string;
  weight: number; // percentage
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  keywords: string[];
}

// ============================================================================
// Proposed Change Types
// ============================================================================

export interface ProposedChange {
  operation: OperationType;
  conceptId: string;
  fieldPath?: string;
  currentValue: any;
  proposedValue: any;
  reasoning: string;
}

// ============================================================================
// DynamoDB Record Types
// ============================================================================

export interface AuditJobRecord {
  // Primary Key
  pk: string; // "AUDIT#{auditId}"
  sk: string; // "METADATA"
  
  // Audit metadata
  auditId: string;
  subject: string;
  auditType: AuditType;
  status: AuditStatus;
  priority: 'low' | 'medium' | 'high';
  
  // Scope
  conceptIds?: string[];
  examObjectives?: string[];
  
  // Execution
  triggeredBy: 'schedule' | 'curator' | 'system';
  curatorId?: string;
  startedAt: string;
  completedAt?: string;
  
  // Results
  findingCount: number;
  highSeverityCount: number;
  s3ReportKey?: string;
  
  // GSI fields
  gsi1pk?: string; // "SUBJECT#{subject}"
  gsi1sk?: string; // createdAt
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  ttl?: number; // Auto-delete after 90 days
}

export interface AuditFindingRecord {
  // Primary Key
  pk: string; // "AUDIT#{auditId}"
  sk: string; // "FINDING#{findingId}"
  
  // Finding metadata
  findingId: string;
  auditId: string;
  
  // Issue details
  issueType: IssueType;
  severity: Severity;
  conceptId: string;
  conceptName: string;
  
  // Proposed fix
  operation: OperationType;
  currentValue: any;
  proposedValue: any;
  fieldPath?: string; // e.g., "shape.simpleCore"
  
  // AI analysis
  confidenceScore: number; // 0-100
  reasoning: string;
  
  // Approval workflow
  status: FindingStatus;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  approvedAt?: string;
  
  // GSI fields
  gsi2pk?: string; // "STATUS#{status}"
  gsi2sk?: string; // "severity#createdAt"
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface ContentVersionRecord {
  // Primary Key
  pk: string; // "CONCEPT#{conceptId}"
  sk: string; // "VERSION#{timestamp}"
  
  // Version metadata
  versionId: string;
  conceptId: string;
  versionNumber: number;
  
  // Content snapshot
  content: LearningConcept;
  
  // Version tracking
  schemaVersion: string;
  modelVersion: string; // e.g., "claude-opus-4.5"
  generationVersion: string;
  
  // Change context
  changeType: 'generation' | 'audit-fix' | 'manual-edit' | 'rollback';
  changeReason?: string;
  changedBy?: string;
  auditId?: string;
  findingId?: string;
  
  // GSI fields
  gsi1pk?: string; // "CONCEPT#{conceptId}"
  gsi1sk?: string; // timestamp
  
  // Timestamps
  createdAt: string;
  ttl?: number; // Auto-delete after 30 days
}

export interface ChangeLogRecord {
  // Primary Key
  pk: string; // "CHANGELOG#{date}" (YYYY-MM-DD)
  sk: string; // "{timestamp}#{conceptId}"
  
  // Change metadata
  changeId: string;
  conceptId: string;
  conceptName: string;
  subject: string;
  
  // Change details
  operation: OperationType;
  fieldPath?: string;
  oldValue?: any;
  newValue?: any;
  
  // Context
  auditId?: string;
  findingId?: string;
  changedBy: string;
  changeReason: string;
  
  // Version tracking
  previousVersionId: string;
  newVersionId: string;
  
  // GSI fields
  gsi1pk?: string; // "CONCEPT#{conceptId}"
  gsi1sk?: string; // timestamp
  gsi2pk?: string; // "CURATOR#{curatorId}"
  gsi2sk?: string; // timestamp
  
  // Timestamps
  timestamp: string;
  ttl?: number; // Auto-delete after 90 days
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AuditQueueItem {
  id: string;
  subject: string;
  auditType: AuditType;
  status: AuditStatus;
  findingCount: number;
  highSeverityCount: number;
  createdAt: string;
  estimatedReviewMinutes: number;
}

export interface AuditFilters {
  subject?: string;
  auditType?: AuditType[];
  severity?: Severity[];
  status?: AuditStatus[];
  dateRange?: { start: Date; end: Date };
}

export interface CoverageMatrix {
  objectives: {
    id: string;
    name: string;
    weight: number;
    coveredBy: string[]; // concept IDs
    coverageDepth: 'none' | 'shallow' | 'adequate' | 'comprehensive';
  }[];
}

export interface AutoApprovalConfig {
  enabled: boolean;
  thresholds: {
    schema: number; // confidence score 0-100
    content: number;
    coverage: number;
    quality: number;
  };
  severityLimits: {
    autoApprove: Severity[]; // e.g., ['low']
    requireCurator: Severity[]; // e.g., ['medium']
    requireExpert: Severity[]; // e.g., ['high', 'critical']
  };
}

// ============================================================================
// Lambda Event/Response Types
// ============================================================================

export interface AuditOrchestratorEvent {
  action: 'schedule' | 'trigger' | 'status';
  auditId?: string;
  config?: AuditConfig;
}

export interface AuditConfig {
  subject: string;
  auditTypes: AuditType[];
  scope?: AuditScope;
  priority: 'low' | 'medium' | 'high';
}

export interface AuditScope {
  conceptIds?: string[];
  examObjectives?: string[];
}

export interface AuditOrchestratorResponse {
  auditId: string;
  status: AuditStatus;
  progress?: {
    completed: number;
    total: number;
    currentPhase: string;
  };
}

export interface SchemaAuditorEvent {
  auditId: string;
  subject: string;
  conceptIds: string[];
  schemaVersion: string;
}

export interface SchemaAuditorResponse {
  findings: AuditFindingRecord[];
  summary: {
    totalConcepts: number;
    compliantConcepts: number;
    issuesFound: number;
  };
}

export interface ContentAuditorEvent {
  auditId: string;
  subject: string;
  conceptIds: string[];
  examObjectives: ExamObjective[];
}

export interface ContentAuditorResponse {
  findings: AuditFindingRecord[];
  summary: {
    totalConcepts: number;
    hallucinationsDetected: number;
    outdatedContent: number;
    qualityScore: number;
  };
}

export interface CoverageAuditorEvent {
  auditId: string;
  subject: string;
  examObjectives: ExamObjective[];
  existingConcepts: LearningConcept[];
}

export interface CoverageAuditorResponse {
  findings: AuditFindingRecord[];
  coverageMatrix: CoverageMatrix;
  summary: {
    totalObjectives: number;
    coveredObjectives: number;
    coveragePercentage: number;
    gapsIdentified: number;
  };
}

export interface UpdateExecutorEvent {
  executionJobId: string;
  approvedFindings: string[];
  curatorId: string;
}

export interface UpdateExecutorResponse {
  success: boolean;
  applied: string[];
  failed: { findingId: string; error: string }[];
  versionsCreated: string[];
}
