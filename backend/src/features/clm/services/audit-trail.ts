/**
 * Audit Trail Service
 * 
 * Manages the complete audit trail of all content modifications.
 * Ensures every change is logged with full context for compliance and debugging.
 */

import {
  logChange,
  getChangesByDate,
  getChangesByConcept,
  getChangesByCurator,
  getChangesByDateRange,
  getChangeStats,
  LogChangeParams,
  ChangeStats,
} from '../data/changelog-repository.js';
import { ChangeLogRecord, OperationType } from '../types/index.js';

// ============================================================================
// Audit Trail Operations
// ============================================================================

/**
 * Log a content change with full context
 * Property 30: Change Log Completeness
 */
export async function recordChange(params: LogChangeParams): Promise<ChangeLogRecord> {
  // Validate required fields
  if (!params.conceptId || !params.changedBy || !params.changeReason) {
    throw new Error('Missing required fields for change log: conceptId, changedBy, changeReason');
  }
  
  if (!params.previousVersionId || !params.newVersionId) {
    throw new Error('Missing version tracking: previousVersionId and newVersionId required');
  }
  
  const changeLog = await logChange(params);
  
  return changeLog;
}

/**
 * Get all changes for a specific date
 */
export async function getChangesForDate(date: string): Promise<ChangeLogRecord[]> {
  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
  
  return getChangesByDate(date);
}

/**
 * Get change history for a specific concept
 */
export async function getConceptChangeHistory(
  conceptId: string,
  limit?: number
): Promise<ChangeLogRecord[]> {
  return getChangesByConcept(conceptId, limit);
}

/**
 * Get all changes made by a specific curator
 */
export async function getCuratorActivity(
  curatorId: string,
  limit?: number
): Promise<ChangeLogRecord[]> {
  return getChangesByCurator(curatorId, limit);
}

/**
 * Get changes within a date range
 */
export async function getChangesInRange(
  startDate: string,
  endDate: string
): Promise<ChangeLogRecord[]> {
  // Validate date formats
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
  
  // Validate date order
  if (new Date(startDate) > new Date(endDate)) {
    throw new Error('Start date must be before or equal to end date');
  }
  
  return getChangesByDateRange(startDate, endDate);
}

/**
 * Get change statistics for analytics dashboard
 */
export async function getChangeAnalytics(
  startDate: string,
  endDate: string
): Promise<ChangeStats> {
  return getChangeStats(startDate, endDate);
}

/**
 * Get recent changes across all concepts (for activity feed)
 */
export async function getRecentChanges(days: number = 7): Promise<ChangeLogRecord[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];
  
  return getChangesByDateRange(start, end);
}

/**
 * Get changes by operation type
 */
export async function getChangesByOperation(
  operation: OperationType,
  startDate: string,
  endDate: string
): Promise<ChangeLogRecord[]> {
  const allChanges = await getChangesByDateRange(startDate, endDate);
  return allChanges.filter(change => change.operation === operation);
}

/**
 * Get changes related to a specific audit
 */
export async function getAuditChanges(auditId: string): Promise<ChangeLogRecord[]> {
  // This requires querying across dates, so we'll need to scan or use a GSI
  // For now, get recent changes and filter
  const recentChanges = await getRecentChanges(90); // Last 90 days
  return recentChanges.filter(change => change.auditId === auditId);
}

/**
 * Generate audit trail report for compliance
 */
export interface AuditTrailReport {
  period: { start: string; end: string };
  totalChanges: number;
  changesByType: Record<OperationType, number>;
  topCurators: { curatorId: string; changeCount: number }[];
  topConcepts: { conceptId: string; conceptName: string; changeCount: number }[];
  dailyActivity: { date: string; changes: number }[];
}

export async function generateAuditTrailReport(
  startDate: string,
  endDate: string
): Promise<AuditTrailReport> {
  const changes = await getChangesByDateRange(startDate, endDate);
  const stats = await getChangeStats(startDate, endDate);
  
  // Calculate top curators
  const curatorCounts = Object.entries(stats.changesByCurator)
    .map(([curatorId, changeCount]) => ({ curatorId, changeCount }))
    .sort((a, b) => b.changeCount - a.changeCount)
    .slice(0, 10);
  
  // Calculate top concepts
  const conceptCounts: Record<string, { name: string; count: number }> = {};
  changes.forEach(change => {
    if (!conceptCounts[change.conceptId]) {
      conceptCounts[change.conceptId] = { name: change.conceptName, count: 0 };
    }
    conceptCounts[change.conceptId].count++;
  });
  
  const topConcepts = Object.entries(conceptCounts)
    .map(([conceptId, data]) => ({
      conceptId,
      conceptName: data.name,
      changeCount: data.count,
    }))
    .sort((a, b) => b.changeCount - a.changeCount)
    .slice(0, 10);
  
  // Daily activity
  const dailyActivity = Object.entries(stats.changesPerDay)
    .map(([date, changes]) => ({ date, changes }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  return {
    period: { start: startDate, end: endDate },
    totalChanges: stats.totalChanges,
    changesByType: stats.changesByOperation,
    topCurators: curatorCounts,
    topConcepts,
    dailyActivity,
  };
}

/**
 * Validate change log entry completeness
 */
export function validateChangeLogEntry(entry: ChangeLogRecord): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!entry.conceptId) errors.push('Missing conceptId');
  if (!entry.changedBy) errors.push('Missing changedBy');
  if (!entry.changeReason) errors.push('Missing changeReason');
  if (!entry.previousVersionId) errors.push('Missing previousVersionId');
  if (!entry.newVersionId) errors.push('Missing newVersionId');
  if (!entry.timestamp) errors.push('Missing timestamp');
  if (!entry.operation) errors.push('Missing operation');
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
