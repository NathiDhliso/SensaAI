/**
 * Version Repository - Data access layer for content versioning
 */

import { 
  PutCommand, 
  GetCommand, 
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, TABLES } from './dynamodb-client.js';
import { ContentVersionRecord } from '../types/index.js';
import { LearningConcept } from '../../../shared/types/learning.js';

// ============================================================================
// Version Operations
// ============================================================================

export interface CreateVersionParams {
  conceptId: string;
  content: LearningConcept;
  schemaVersion: string;
  modelVersion: string;
  generationVersion: string;
  changeType: 'generation' | 'audit-fix' | 'manual-edit' | 'rollback';
  changeReason?: string;
  changedBy?: string;
  auditId?: string;
  findingId?: string;
}

export async function createVersion(params: CreateVersionParams): Promise<ContentVersionRecord> {
  const versionId = uuidv4();
  const timestamp = new Date().toISOString();
  
  // Get the latest version number for this concept
  const existingVersions = await getVersionHistory(params.conceptId, 1);
  const versionNumber = existingVersions.length > 0 
    ? existingVersions[0].versionNumber + 1 
    : 1;
  
  const record: ContentVersionRecord = {
    pk: `CONCEPT#${params.conceptId}`,
    sk: `VERSION#${timestamp}`,
    versionId,
    conceptId: params.conceptId,
    versionNumber,
    content: params.content,
    schemaVersion: params.schemaVersion,
    modelVersion: params.modelVersion,
    generationVersion: params.generationVersion,
    changeType: params.changeType,
    changeReason: params.changeReason,
    changedBy: params.changedBy,
    auditId: params.auditId,
    findingId: params.findingId,
    gsi1pk: `CONCEPT#${params.conceptId}`,
    gsi1sk: timestamp,
    createdAt: timestamp,
    ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
  };
  
  await docClient.send(new PutCommand({
    TableName: TABLES.VERSIONS,
    Item: record,
  }));
  
  return record;
}

export async function getVersion(
  conceptId: string,
  timestamp: string
): Promise<ContentVersionRecord | null> {
  const result = await docClient.send(new GetCommand({
    TableName: TABLES.VERSIONS,
    Key: {
      pk: `CONCEPT#${conceptId}`,
      sk: `VERSION#${timestamp}`,
    },
  }));
  
  return result.Item as ContentVersionRecord || null;
}

export async function getVersionById(versionId: string): Promise<ContentVersionRecord | null> {
  // Note: This requires scanning or maintaining a GSI by versionId
  // For now, we'll use the conceptId + timestamp approach
  // In production, consider adding a GSI on versionId
  throw new Error('getVersionById requires GSI implementation - use getVersion with conceptId and timestamp');
}

export async function getLatestVersion(conceptId: string): Promise<ContentVersionRecord | null> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.VERSIONS,
    KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk)',
    ExpressionAttributeNames: {
      '#pk': 'pk',
      '#sk': 'sk',
    },
    ExpressionAttributeValues: {
      ':pk': `CONCEPT#${conceptId}`,
      ':sk': 'VERSION#',
    },
    ScanIndexForward: false, // Most recent first
    Limit: 1,
  }));
  
  return result.Items?.[0] as ContentVersionRecord || null;
}

export async function getVersionHistory(
  conceptId: string,
  limit: number = 50
): Promise<ContentVersionRecord[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.VERSIONS,
    KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk)',
    ExpressionAttributeNames: {
      '#pk': 'pk',
      '#sk': 'sk',
    },
    ExpressionAttributeValues: {
      ':pk': `CONCEPT#${conceptId}`,
      ':sk': 'VERSION#',
    },
    ScanIndexForward: false, // Most recent first
    Limit: limit,
  }));
  
  return (result.Items as ContentVersionRecord[]) || [];
}

export async function rollbackToVersion(
  conceptId: string,
  targetVersionTimestamp: string,
  curatorId: string,
  reason: string
): Promise<ContentVersionRecord> {
  // Get the target version
  const targetVersion = await getVersion(conceptId, targetVersionTimestamp);
  if (!targetVersion) {
    throw new Error(`Version not found: ${conceptId} at ${targetVersionTimestamp}`);
  }
  
  // Create a new version with the rolled-back content
  const rollbackVersion = await createVersion({
    conceptId,
    content: targetVersion.content,
    schemaVersion: targetVersion.schemaVersion,
    modelVersion: targetVersion.modelVersion,
    generationVersion: targetVersion.generationVersion,
    changeType: 'rollback',
    changeReason: `Rollback to version ${targetVersion.versionNumber}: ${reason}`,
    changedBy: curatorId,
  });
  
  return rollbackVersion;
}

/**
 * Get all versions created within a date range (for analytics)
 */
export async function getVersionsByDateRange(
  startDate: string,
  endDate: string,
  limit: number = 1000
): Promise<ContentVersionRecord[]> {
  // This would require a GSI on createdAt for efficient querying
  // For now, this is a placeholder
  throw new Error('getVersionsByDateRange requires GSI implementation on createdAt');
}
