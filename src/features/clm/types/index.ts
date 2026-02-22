/**
 * CLM Frontend Types
 * Type definitions for the CLM curator dashboard
 */

// Re-export backend types that are needed in frontend
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

export interface AuditJobRecord {
  pk: string;
  sk: string;
  auditId: string;
  subject: string;
  auditType: AuditType;
  status: AuditStatus;
  priority: 'low' | 'medium' | 'high';
  conceptIds?: string[];
  examObjectives?: string[];
  triggeredBy: 'schedule' | 'curator' | 'system';
  curatorId?: string;
  startedAt: string;
  completedAt?: string;
  findingCount: number;
  highSeverityCount: number;
  s3ReportKey?: string;
  gsi1pk?: string;
  gsi1sk?: string;
  createdAt: string;
  updatedAt: string;
  ttl?: number;
}

export interface AuditFindingRecord {
  pk: string;
  sk: string;
  findingId: string;
  auditId: string;
  issueType: IssueType;
  severity: Severity;
  conceptId: string;
  conceptName: string;
  operation: OperationType;
  currentValue: any;
  proposedValue: any;
  fieldPath?: string;
  confidenceScore: number;
  reasoning: string;
  status: FindingStatus;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  approvedAt?: string;
  gsi2pk?: string;
  gsi2sk?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentVersionRecord {
  pk: string;
  sk: string;
  versionId: string;
  conceptId: string;
  versionNumber: number;
  content: any;
  schemaVersion: string;
  modelVersion: string;
  generationVersion: string;
  changeType: 'generation' | 'audit-fix' | 'manual-edit' | 'rollback';
  changeReason?: string;
  changedBy?: string;
  auditId?: string;
  findingId?: string;
  gsi1pk?: string;
  gsi1sk?: string;
  createdAt: string;
  ttl?: number;
}

export interface ChangeLogRecord {
  pk: string;
  sk: string;
  changeId: string;
  conceptId: string;
  conceptName: string;
  subject: string;
  operation: OperationType;
  fieldPath?: string;
  oldValue?: any;
  newValue?: any;
  auditId?: string;
  findingId?: string;
  changedBy: string;
  changeReason: string;
  previousVersionId: string;
  newVersionId: string;
  gsi1pk?: string;
  gsi1sk?: string;
  gsi2pk?: string;
  gsi2sk?: string;
  timestamp: string;
  ttl?: number;
}
