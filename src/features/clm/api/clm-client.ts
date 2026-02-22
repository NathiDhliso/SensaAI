/**
 * CLM API Client
 * API client for Content Lifecycle Management curator dashboard
 */

import { apiClient } from '../../../shared/api/client';
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
   * Trigger on-demand audit
   */
  async triggerAudit(request: TriggerAuditRequest): Promise<any> {
    return apiClient.post(`${BASE_PATH}/audits/trigger`, request);
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
   * Execute approved findings
   */
  async executeFindings(request: ExecuteFindingsRequest): Promise<ExecuteFindingsResponse> {
    return apiClient.post(`${BASE_PATH}/findings/execute`, request);
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
   * Rollback concept to previous version
   */
  async rollbackVersion(request: RollbackRequest): Promise<RollbackResponse> {
    return apiClient.post(`${BASE_PATH}/versions/rollback`, request);
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
