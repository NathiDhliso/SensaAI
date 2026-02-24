/**
 * CLM API Client
 * API client for Content Lifecycle Management curator dashboard
 */

import { apiClient } from '../../../shared/api/client';
import { logger } from '@/shared/utils/logger';
import type {
  AuditJobRecord,
  AuditFindingRecord,
  ContentVersionRecord,
  ChangeLogRecord,
  AuditType,
  AuditStatus,
} from '../types';

const BASE_PATH = '/curator';

// ============================================================================
// Audit Result Cache (localStorage-backed, TTL from Guardian config)
// ============================================================================

const AUDIT_CACHE_KEY = 'clm-audit-cache';

interface AuditCacheEntry {
  key: string;
  result: unknown;
  timestamp: number;
}

function getAuditCacheTtlMs(): number {
  try {
    const raw = localStorage.getItem('clm-guardian-config');
    if (raw) {
      const cfg = JSON.parse(raw);
      if (typeof cfg.auditCacheTtlMs === 'number') return cfg.auditCacheTtlMs;
    }
  } catch (e) { logger.warn('[CLM] Failed to read audit cache config from localStorage', e); }
  return 24 * 60 * 60 * 1000; // 24 hours default
}

function loadAuditCache(): AuditCacheEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_CACHE_KEY);
    if (raw) return JSON.parse(raw) as AuditCacheEntry[];
  } catch (e) { logger.warn('[CLM] Failed to parse audit cache from localStorage', e); }
  return [];
}

function saveAuditCache(entries: AuditCacheEntry[]): void {
  // Evict expired entries before saving, keep max 50
  const ttl = getAuditCacheTtlMs();
  const now = Date.now();
  const valid = entries.filter(e => now - e.timestamp < ttl).slice(0, 50);
  localStorage.setItem(AUDIT_CACHE_KEY, JSON.stringify(valid));
}

function buildAuditCacheKey(subject: string, auditTypes: AuditType[]): string {
  return `${subject.toLowerCase().trim()}::${[...auditTypes].sort().join(',')}`;
}

function getCachedAuditResult(subject: string, auditTypes: AuditType[]): unknown | null {
  const ttl = getAuditCacheTtlMs();
  if (ttl <= 0) return null; // caching disabled

  const key = buildAuditCacheKey(subject, auditTypes);
  const entries = loadAuditCache();
  const now = Date.now();
  const entry = entries.find(e => e.key === key && now - e.timestamp < ttl);
  return entry ? entry.result : null;
}

function setCachedAuditResult(subject: string, auditTypes: AuditType[], result: unknown): void {
  const ttl = getAuditCacheTtlMs();
  if (ttl <= 0) return; // caching disabled

  const key = buildAuditCacheKey(subject, auditTypes);
  const entries = loadAuditCache().filter(e => e.key !== key); // dedup
  entries.unshift({ key, result, timestamp: Date.now() });
  saveAuditCache(entries);
}

/** Invalidate cached audit results for a subject (call after regeneration or edits) */
export function invalidateAuditCache(subject?: string): void {
  if (!subject) {
    localStorage.removeItem(AUDIT_CACHE_KEY);
    return;
  }
  const prefix = subject.toLowerCase().trim() + '::';
  const entries = loadAuditCache().filter(e => !e.key.startsWith(prefix));
  saveAuditCache(entries);
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface AuditFilters {
  subject?: string;
  status?: AuditStatus;
  limit?: number;
  page?: number;
}

export interface AuditsResponse {
  audits: AuditJobRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditDetailResponse {
  audit: AuditJobRecord;
  findings: AuditFindingRecord[];
}

export interface TriggerAuditRequest {
  subject: string;
  auditTypes: AuditType[];
  priority?: 'low' | 'medium' | 'high';
  conceptIds?: string[];
  examObjectives?: any[];
  /** Skip cache and force a fresh audit run */
  force?: boolean;
}

export interface ApproveRejectRequest {
  findingIds: string[];
  auditId: string;
  notes?: string;
  reason?: string;
}

export interface ApproveRejectResponse {
  approved?: string[];
  rejected?: string[];
  failed: Array<{ findingId: string; error: string }>;
}

export interface ExecuteFindingsRequest {
  findingIds: string[];
  auditId: string;
}

export interface ExecuteFindingsResponse {
  success: boolean;
  applied: string[];
  failed: Array<{ findingId: string; error: string }>;
  versionsCreated: string[];
}

export interface VersionHistoryResponse {
  conceptId: string;
  versions: ContentVersionRecord[];
  total: number;
}

export interface RollbackRequest {
  conceptId: string;
  targetVersionTimestamp: string;
  reason: string;
  subject: string;
}

export interface RollbackResponse {
  version: ContentVersionRecord;
  changeLog: ChangeLogRecord;
}

export interface AnalyticsResponse {
  totalChanges: number;
  changesByOperation: Record<string, number>;
  changesByCurator: Record<string, number>;
  changesPerDay: Record<string, number>;
}

export interface RecentChangesResponse {
  changes: ChangeLogRecord[];
  total: number;
}

// ============================================================================
// API Functions
// ============================================================================

export const clmApi = {
  /**
   * List audits with filtering and pagination
   */
  async listAudits(filters: AuditFilters): Promise<AuditsResponse> {
    const params = new URLSearchParams();
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.page) params.append('page', filters.page.toString());

    return apiClient.get(`${BASE_PATH}/audits?${params}`);
  },

  /**
   * Get audit details with findings
   */
  async getAuditDetail(auditId: string): Promise<AuditDetailResponse> {
    return apiClient.get(`${BASE_PATH}/audits/${auditId}`);
  },

  /**
   * Trigger on-demand audit (with 24h cache to avoid redundant AI calls).
   * Cache is keyed by subject + auditTypes. Invalidated on regeneration or manual edit.
   * Returns { _cached: true, _cachedAt } when serving from cache so UI can distinguish.
   */
  async triggerAudit(request: TriggerAuditRequest): Promise<any> {
    if (!request.force) {
      const cached = getCachedAuditResult(request.subject, request.auditTypes);
      if (cached) {
        // Let the caller know this was a cache hit
        const entry = loadAuditCache().find(
          (e) => e.key === buildAuditCacheKey(request.subject, request.auditTypes)
        );
        return { ...cached as Record<string, unknown>, _cached: true, _cachedAt: entry?.timestamp };
      }
    }

    // Strip client-only field before sending to backend
    const { force: _, ...payload } = request;
    const result = await apiClient.post(`${BASE_PATH}/audits/trigger`, payload);
    setCachedAuditResult(request.subject, request.auditTypes, result);
    return result;
  },

  /**
   * Approve findings
   */
  async approveFindings(request: ApproveRejectRequest): Promise<ApproveRejectResponse> {
    return apiClient.post(`${BASE_PATH}/findings/approve`, request);
  },

  /**
   * Reject findings
   */
  async rejectFindings(request: ApproveRejectRequest): Promise<ApproveRejectResponse> {
    return apiClient.post(`${BASE_PATH}/findings/reject`, request);
  },

  /**
   * Execute approved findings (invalidates audit cache since concepts change)
   */
  async executeFindings(request: ExecuteFindingsRequest): Promise<ExecuteFindingsResponse> {
    const result = await apiClient.post<ExecuteFindingsResponse>(`${BASE_PATH}/findings/execute`, request);
    // Concepts were modified — cached audit results are now stale
    invalidateAuditCache();
    return result;
  },

  /**
   * Get pending findings across all audits
   */
  async getPendingFindings(limit: number = 100): Promise<{ findings: AuditFindingRecord[]; total: number }> {
    return apiClient.get(`${BASE_PATH}/findings/pending?limit=${limit}`);
  },

  /**
   * Get version history for a concept
   */
  async getVersionHistory(conceptId: string, limit: number = 50): Promise<VersionHistoryResponse> {
    return apiClient.get(`${BASE_PATH}/versions/${conceptId}?limit=${limit}`);
  },

  /**
   * Rollback concept to previous version (invalidates audit cache for that subject)
   */
  async rollbackVersion(request: RollbackRequest): Promise<RollbackResponse> {
    const result = await apiClient.post<RollbackResponse>(`${BASE_PATH}/versions/rollback`, request);
    invalidateAuditCache(request.subject);
    return result;
  },

  /**
   * Get analytics for date range
   */
  async getAnalytics(startDate: string, endDate: string): Promise<AnalyticsResponse> {
    return apiClient.get(`${BASE_PATH}/analytics?startDate=${startDate}&endDate=${endDate}`);
  },

  /**
   * Get recent changes
   */
  async getRecentChanges(days: number = 7): Promise<RecentChangesResponse> {
    return apiClient.get(`${BASE_PATH}/analytics/recent?days=${days}`);
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; service: string; timestamp: string }> {
    return apiClient.get(`${BASE_PATH}/health`);
  },
};
