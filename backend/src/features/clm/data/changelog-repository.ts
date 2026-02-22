/**
 * ChangeLog Repository - Data access layer for audit trail
 */

import { 
  PutCommand, 
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, TABLES } from './dynamodb-client.js';
import { ChangeLogRecord, OperationType } from '../types/index.js';

// ============================================================================
// ChangeLog Operations
// ============================================================================

export interface LogChangeParams {
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
}

export async function logChange(params: LogChangeParams): Promise<ChangeLogRecord> {
  const changeId = uuidv4();
  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0]; // YYYY-MM-DD
  
  const record: ChangeLogRecord = {
    pk: `CHANGELOG#${date}`,
    sk: `${timestamp}#${params.conceptId}`,
    changeId,
    conceptId: params.conceptId,
    conceptName: params.conceptName,
    subject: params.subject,
    operation: params.operation,
    fieldPath: params.fieldPath,
    oldValue: params.oldValue,
    newValue: params.newValue,
    auditId: params.auditId,
    findingId: params.findingId,
    changedBy: params.changedBy,
    changeReason: params.changeReason,
    previousVersionId: params.previousVersionId,
    newVersionId: params.newVersionId,
    gsi1pk: `CONCEPT#${params.conceptId}`,
    gsi1sk: timestamp,
    gsi2pk: `CURATOR#${params.changedBy}`,
    gsi2sk: timestamp,
    timestamp,
    ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days
  };
  
  await docClient.send(new PutCommand({
    TableName: TABLES.CHANGELOG,
    Item: record,
  }));
  
  return record;
}

export async function getChangesByDate(
  date: string,
  limit: number = 100
): Promise<ChangeLogRecord[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.CHANGELOG,
    KeyConditionExpression: '#pk = :pk',
    ExpressionAttributeNames: {
      '#pk': 'pk',
    },
    ExpressionAttributeValues: {
      ':pk': `CHANGELOG#${date}`,
    },
    ScanIndexForward: false, // Most recent first
    Limit: limit,
  }));
  
  return (result.Items as ChangeLogRecord[]) || [];
}

export async function getChangesByConcept(
  conceptId: string,
  limit: number = 50
): Promise<ChangeLogRecord[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.CHANGELOG,
    IndexName: 'GSI1',
    KeyConditionExpression: '#gsi1pk = :gsi1pk',
    ExpressionAttributeNames: {
      '#gsi1pk': 'gsi1pk',
    },
    ExpressionAttributeValues: {
      ':gsi1pk': `CONCEPT#${conceptId}`,
    },
    ScanIndexForward: false, // Most recent first
    Limit: limit,
  }));
  
  return (result.Items as ChangeLogRecord[]) || [];
}

export async function getChangesByCurator(
  curatorId: string,
  limit: number = 100
): Promise<ChangeLogRecord[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.CHANGELOG,
    IndexName: 'GSI2',
    KeyConditionExpression: '#gsi2pk = :gsi2pk',
    ExpressionAttributeNames: {
      '#gsi2pk': 'gsi2pk',
    },
    ExpressionAttributeValues: {
      ':gsi2pk': `CURATOR#${curatorId}`,
    },
    ScanIndexForward: false, // Most recent first
    Limit: limit,
  }));
  
  return (result.Items as ChangeLogRecord[]) || [];
}

export async function getChangesByDateRange(
  startDate: string,
  endDate: string
): Promise<ChangeLogRecord[]> {
  // Generate all dates in range
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  
  // Query each date (could be optimized with parallel queries)
  const allChanges: ChangeLogRecord[] = [];
  for (const date of dates) {
    const changes = await getChangesByDate(date);
    allChanges.push(...changes);
  }
  
  // Sort by timestamp descending
  allChanges.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  
  return allChanges;
}

/**
 * Get change statistics for analytics
 */
export interface ChangeStats {
  totalChanges: number;
  changesByOperation: Record<OperationType, number>;
  changesByCurator: Record<string, number>;
  changesPerDay: Record<string, number>;
}

export async function getChangeStats(
  startDate: string,
  endDate: string
): Promise<ChangeStats> {
  const changes = await getChangesByDateRange(startDate, endDate);
  
  const stats: ChangeStats = {
    totalChanges: changes.length,
    changesByOperation: {
      INSERT: 0,
      UPDATE: 0,
      DELETE: 0,
      RELINK: 0,
      ENRICH: 0,
    },
    changesByCurator: {},
    changesPerDay: {},
  };
  
  changes.forEach(change => {
    // Count by operation
    stats.changesByOperation[change.operation]++;
    
    // Count by curator
    stats.changesByCurator[change.changedBy] = 
      (stats.changesByCurator[change.changedBy] || 0) + 1;
    
    // Count by day
    const day = change.timestamp.split('T')[0];
    stats.changesPerDay[day] = (stats.changesPerDay[day] || 0) + 1;
  });
  
  return stats;
}
