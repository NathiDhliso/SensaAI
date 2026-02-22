/**
 * Version Control Service
 * 
 * Manages content versioning with snapshot creation, history tracking, and rollback.
 * Ensures all changes are tracked and reversible.
 */

import {
  createVersion,
  getVersion,
  getLatestVersion,
  getVersionHistory,
  rollbackToVersion,
  CreateVersionParams,
} from '../data/version-repository.js';
import { logChange, LogChangeParams } from '../data/changelog-repository.js';
import { ContentVersionRecord } from '../types/index.js';
import { LearningConcept } from '../../../shared/types/learning.js';

// ============================================================================
// Version Control Operations
// ============================================================================

/**
 * Create a version snapshot before modifying content
 * Property 29: Version Creation Before Modification
 */
export async function snapshotBeforeChange(
  concept: LearningConcept,
  changeContext: {
    changeType: 'generation' | 'audit-fix' | 'manual-edit' | 'rollback';
    changeReason?: string;
    changedBy?: string;
    auditId?: string;
    findingId?: string;
  }
): Promise<ContentVersionRecord> {
  const version = await createVersion({
    conceptId: concept.id,
    content: concept,
    schemaVersion: '2.0', // Current schema version
    modelVersion: 'claude-sonnet-4.5', // Default model
    generationVersion: '1.0',
    ...changeContext,
  });
  
  return version;
}

/**
 * Get complete version history for a concept
 * Property 31: Version History Completeness
 */
export async function getConceptVersionHistory(
  conceptId: string,
  limit?: number
): Promise<ContentVersionRecord[]> {
  const versions = await getVersionHistory(conceptId, limit);
  
  // Ensure versions are ordered by timestamp descending (most recent first)
  versions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  
  return versions;
}

/**
 * Get a specific version by concept ID and timestamp
 */
export async function getConceptVersion(
  conceptId: string,
  timestamp: string
): Promise<ContentVersionRecord | null> {
  return getVersion(conceptId, timestamp);
}

/**
 * Get the most recent version of a concept
 */
export async function getCurrentVersion(
  conceptId: string
): Promise<ContentVersionRecord | null> {
  return getLatestVersion(conceptId);
}

/**
 * Rollback a concept to a previous version
 * Property 32: Rollback Restoration Accuracy
 */
export async function rollbackConcept(
  conceptId: string,
  targetVersionTimestamp: string,
  curatorId: string,
  reason: string,
  subject: string
): Promise<{
  version: ContentVersionRecord;
  changeLog: any;
}> {
  // Get the target version to rollback to
  const targetVersion = await getVersion(conceptId, targetVersionTimestamp);
  if (!targetVersion) {
    throw new Error(`Target version not found: ${conceptId} at ${targetVersionTimestamp}`);
  }
  
  // Get the current version (before rollback)
  const currentVersion = await getLatestVersion(conceptId);
  if (!currentVersion) {
    throw new Error(`No current version found for concept: ${conceptId}`);
  }
  
  // Create new version with rolled-back content
  const rollbackVersion = await rollbackToVersion(
    conceptId,
    targetVersionTimestamp,
    curatorId,
    reason
  );
  
  // Log the rollback in changelog
  const changeLogEntry = await logChange({
    conceptId,
    conceptName: targetVersion.content.name,
    subject,
    operation: 'UPDATE', // Rollback is technically an update
    oldValue: currentVersion.content,
    newValue: targetVersion.content,
    changedBy: curatorId,
    changeReason: `Rollback to version ${targetVersion.versionNumber}: ${reason}`,
    previousVersionId: currentVersion.versionId,
    newVersionId: rollbackVersion.versionId,
  });
  
  return {
    version: rollbackVersion,
    changeLog: changeLogEntry,
  };
}

/**
 * Compare two versions and generate a diff
 */
export interface VersionDiff {
  conceptId: string;
  fromVersion: number;
  toVersion: number;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
    changeType: 'added' | 'removed' | 'modified';
  }[];
}

export async function compareVersions(
  conceptId: string,
  fromTimestamp: string,
  toTimestamp: string
): Promise<VersionDiff> {
  const fromVersion = await getVersion(conceptId, fromTimestamp);
  const toVersion = await getVersion(conceptId, toTimestamp);
  
  if (!fromVersion || !toVersion) {
    throw new Error('One or both versions not found');
  }
  
  const changes: VersionDiff['changes'] = [];
  
  // Simple field-by-field comparison
  const allFields = new Set([
    ...Object.keys(fromVersion.content),
    ...Object.keys(toVersion.content),
  ]);
  
  allFields.forEach(field => {
    const oldValue = (fromVersion.content as any)[field];
    const newValue = (toVersion.content as any)[field];
    
    if (oldValue === undefined && newValue !== undefined) {
      changes.push({ field, oldValue, newValue, changeType: 'added' });
    } else if (oldValue !== undefined && newValue === undefined) {
      changes.push({ field, oldValue, newValue, changeType: 'removed' });
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({ field, oldValue, newValue, changeType: 'modified' });
    }
  });
  
  return {
    conceptId,
    fromVersion: fromVersion.versionNumber,
    toVersion: toVersion.versionNumber,
    changes,
  };
}

/**
 * Validate version retention policy (30 days minimum)
 * Property 33: Version Retention Duration
 */
export function validateVersionRetention(version: ContentVersionRecord): boolean {
  if (!version.ttl) {
    return true; // No TTL means permanent retention
  }
  
  const now = Math.floor(Date.now() / 1000);
  const createdAtSeconds = Math.floor(new Date(version.createdAt).getTime() / 1000);
  const retentionSeconds = version.ttl - createdAtSeconds;
  const thirtyDaysSeconds = 30 * 24 * 60 * 60;
  
  return retentionSeconds >= thirtyDaysSeconds;
}

/**
 * Get version statistics for analytics
 */
export interface VersionStats {
  totalVersions: number;
  versionsByChangeType: Record<string, number>;
  averageVersionsPerConcept: number;
  oldestVersion: string;
  newestVersion: string;
}

export async function getVersionStats(conceptIds: string[]): Promise<VersionStats> {
  const allVersions: ContentVersionRecord[] = [];
  
  for (const conceptId of conceptIds) {
    const versions = await getVersionHistory(conceptId);
    allVersions.push(...versions);
  }
  
  const versionsByChangeType: Record<string, number> = {};
  allVersions.forEach(v => {
    versionsByChangeType[v.changeType] = (versionsByChangeType[v.changeType] || 0) + 1;
  });
  
  const timestamps = allVersions.map(v => v.createdAt).sort();
  
  return {
    totalVersions: allVersions.length,
    versionsByChangeType,
    averageVersionsPerConcept: allVersions.length / conceptIds.length,
    oldestVersion: timestamps[0] || '',
    newestVersion: timestamps[timestamps.length - 1] || '',
  };
}
