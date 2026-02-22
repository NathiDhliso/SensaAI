/**
 * Audit Repository - Data access layer for audit jobs and findings
 */

import { 
  PutCommand, 
  GetCommand, 
  QueryCommand, 
  UpdateCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, TABLES } from './dynamodb-client.js';
import {
  AuditJobRecord,
  AuditFindingRecord,
  AuditType,
  AuditStatus,
  AuditFilters,
  IssueType,
  Severity,
  OperationType,
  FindingStatus,
} from '../types/index.js';

// ============================================================================
// Audit Job Operations
// ============================================================================

export interface CreateAuditJobParams {
  subject: string;
  auditType: AuditType;
  priority: 'low' | 'medium' | 'high';
  triggeredBy: 'schedule' | 'curator' | 'system';
  curatorId?: string;
  conceptIds?: string[];
  examObjectives?: string[];
}

export async function createAuditJob(params: CreateAuditJobParams): Promise<AuditJobRecord> {
  const auditId = uuidv4();
  const now = new Date().toISOString();
  
  const record: AuditJobRecord = {
    pk: `AUDIT#${auditId}`,
    sk: 'METADATA',
    auditId,
    subject: params.subject,
    auditType: params.auditType,
    status: 'queued',
    priority: params.priority,
    triggeredBy: params.triggeredBy,
    curatorId: params.curatorId,
    conceptIds: params.conceptIds,
    examObjectives: params.examObjectives,
    startedAt: now,
    findingCount: 0,
    highSeverityCount: 0,
    gsi1pk: `SUBJECT#${params.subject}`,
    gsi1sk: now,
    createdAt: now,
    updatedAt: now,
    ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days
  };
  
  await docClient.send(new PutCommand({
    TableName: TABLES.AUDITS,
    Item: record,
  }));
  
  return record;
}

export async function getAuditJob(auditId: string): Promise<AuditJobRecord | null> {
  const result = await docClient.send(new GetCommand({
    TableName: TABLES.AUDITS,
    Key: {
      pk: `AUDIT#${auditId}`,
      sk: 'METADATA',
    },
  }));
  
  return result.Item as AuditJobRecord || null;
}

export async function updateAuditJobStatus(
  auditId: string,
  status: AuditStatus,
  additionalUpdates?: Partial<AuditJobRecord>
): Promise<void> {
  const now = new Date().toISOString();
  
  const updateExpression: string[] = ['#status = :status', '#updatedAt = :updatedAt'];
  const expressionAttributeNames: Record<string, string> = {
    '#status': 'status',
    '#updatedAt': 'updatedAt',
  };
  const expressionAttributeValues: Record<string, any> = {
    ':status': status,
    ':updatedAt': now,
  };
  
  if (status === 'completed') {
    updateExpression.push('#completedAt = :completedAt');
    expressionAttributeNames['#completedAt'] = 'completedAt';
    expressionAttributeValues[':completedAt'] = now;
  }
  
  if (additionalUpdates) {
    Object.entries(additionalUpdates).forEach(([key, value]) => {
      if (key !== 'pk' && key !== 'sk' && key !== 'status' && key !== 'updatedAt') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });
  }
  
  await docClient.send(new UpdateCommand({
    TableName: TABLES.AUDITS,
    Key: {
      pk: `AUDIT#${auditId}`,
      sk: 'METADATA',
    },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  }));
}

export async function listAuditsBySubject(
  subject: string,
  limit: number = 50
): Promise<AuditJobRecord[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.AUDITS,
    IndexName: 'GSI1',
    KeyConditionExpression: '#gsi1pk = :gsi1pk',
    ExpressionAttributeNames: {
      '#gsi1pk': 'gsi1pk',
    },
    ExpressionAttributeValues: {
      ':gsi1pk': `SUBJECT#${subject}`,
    },
    ScanIndexForward: false, // Most recent first
    Limit: limit,
  }));
  
  return (result.Items as AuditJobRecord[]) || [];
}

export async function checkOverlappingAudit(subject: string): Promise<boolean> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.AUDITS,
    IndexName: 'GSI1',
    KeyConditionExpression: '#gsi1pk = :gsi1pk',
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#gsi1pk': 'gsi1pk',
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':gsi1pk': `SUBJECT#${subject}`,
      ':status': 'running',
    },
    Limit: 1,
  }));
  
  return (result.Items?.length || 0) > 0;
}

// ============================================================================
// Audit Finding Operations
// ============================================================================

export interface CreateFindingParams {
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
}

export async function createFinding(params: CreateFindingParams): Promise<AuditFindingRecord> {
  const findingId = uuidv4();
  const now = new Date().toISOString();
  
  const record: AuditFindingRecord = {
    pk: `AUDIT#${params.auditId}`,
    sk: `FINDING#${findingId}`,
    findingId,
    auditId: params.auditId,
    issueType: params.issueType,
    severity: params.severity,
    conceptId: params.conceptId,
    conceptName: params.conceptName,
    operation: params.operation,
    currentValue: params.currentValue,
    proposedValue: params.proposedValue,
    fieldPath: params.fieldPath,
    confidenceScore: params.confidenceScore,
    reasoning: params.reasoning,
    status: 'pending',
    gsi2pk: 'STATUS#pending',
    gsi2sk: `${params.severity}#${now}`,
    createdAt: now,
    updatedAt: now,
  };
  
  await docClient.send(new PutCommand({
    TableName: TABLES.AUDITS,
    Item: record,
  }));
  
  return record;
}

export async function batchCreateFindings(findings: CreateFindingParams[]): Promise<void> {
  // DynamoDB BatchWrite supports up to 25 items per request
  const batches: CreateFindingParams[][] = [];
  for (let i = 0; i < findings.length; i += 25) {
    batches.push(findings.slice(i, i + 25));
  }
  
  for (const batch of batches) {
    const now = new Date().toISOString();
    const putRequests = batch.map(params => {
      const findingId = uuidv4();
      const record: AuditFindingRecord = {
        pk: `AUDIT#${params.auditId}`,
        sk: `FINDING#${findingId}`,
        findingId,
        auditId: params.auditId,
        issueType: params.issueType,
        severity: params.severity,
        conceptId: params.conceptId,
        conceptName: params.conceptName,
        operation: params.operation,
        currentValue: params.currentValue,
        proposedValue: params.proposedValue,
        fieldPath: params.fieldPath,
        confidenceScore: params.confidenceScore,
        reasoning: params.reasoning,
        status: 'pending',
        gsi2pk: 'STATUS#pending',
        gsi2sk: `${params.severity}#${now}`,
        createdAt: now,
        updatedAt: now,
      };
      
      return {
        PutRequest: {
          Item: record,
        },
      };
    });
    
    await docClient.send(new BatchWriteCommand({
      RequestItems: {
        [TABLES.AUDITS]: putRequests,
      },
    }));
  }
}

export async function getFindingsForAudit(auditId: string): Promise<AuditFindingRecord[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.AUDITS,
    KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk)',
    ExpressionAttributeNames: {
      '#pk': 'pk',
      '#sk': 'sk',
    },
    ExpressionAttributeValues: {
      ':pk': `AUDIT#${auditId}`,
      ':sk': 'FINDING#',
    },
  }));
  
  return (result.Items as AuditFindingRecord[]) || [];
}

export async function updateFindingStatus(
  auditId: string,
  findingId: string,
  status: FindingStatus,
  userId?: string,
  reason?: string
): Promise<void> {
  const now = new Date().toISOString();
  
  const updateExpression: string[] = ['#status = :status', '#updatedAt = :updatedAt'];
  const expressionAttributeNames: Record<string, string> = {
    '#status': 'status',
    '#updatedAt': 'updatedAt',
  };
  const expressionAttributeValues: Record<string, any> = {
    ':status': status,
    ':updatedAt': now,
  };
  
  if (status === 'approved' && userId) {
    updateExpression.push('#approvedBy = :approvedBy', '#approvedAt = :approvedAt');
    expressionAttributeNames['#approvedBy'] = 'approvedBy';
    expressionAttributeNames['#approvedAt'] = 'approvedAt';
    expressionAttributeValues[':approvedBy'] = userId;
    expressionAttributeValues[':approvedAt'] = now;
  }
  
  if (status === 'rejected' && userId) {
    updateExpression.push('#rejectedBy = :rejectedBy');
    expressionAttributeNames['#rejectedBy'] = 'rejectedBy';
    expressionAttributeValues[':rejectedBy'] = userId;
    
    if (reason) {
      updateExpression.push('#rejectionReason = :rejectionReason');
      expressionAttributeNames['#rejectionReason'] = 'rejectionReason';
      expressionAttributeValues[':rejectionReason'] = reason;
    }
  }
  
  // Update GSI2 for status-based queries
  updateExpression.push('#gsi2pk = :gsi2pk');
  expressionAttributeNames['#gsi2pk'] = 'gsi2pk';
  expressionAttributeValues[':gsi2pk'] = `STATUS#${status}`;
  
  await docClient.send(new UpdateCommand({
    TableName: TABLES.AUDITS,
    Key: {
      pk: `AUDIT#${auditId}`,
      sk: `FINDING#${findingId}`,
    },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  }));
}

export async function listPendingFindings(limit: number = 100): Promise<AuditFindingRecord[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.AUDITS,
    IndexName: 'GSI2',
    KeyConditionExpression: '#gsi2pk = :gsi2pk',
    ExpressionAttributeNames: {
      '#gsi2pk': 'gsi2pk',
    },
    ExpressionAttributeValues: {
      ':gsi2pk': 'STATUS#pending',
    },
    ScanIndexForward: false, // High severity first
    Limit: limit,
  }));
  
  return (result.Items as AuditFindingRecord[]) || [];
}
