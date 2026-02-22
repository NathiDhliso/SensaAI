import { apiClient } from './client';
import type { ParsedConcept } from '@/features/content-generation/parsers/types';
import type { PublicJobSummary } from '@/features/content-storage/types';
import { logger } from '@/shared/utils/logger';

export interface ConceptsQueryParams {
  userId: string;
  sessionId: string;
  tier?: 'trunk' | 'branch' | 'leaf';
  limit?: number;
  cursor?: string;
}
export interface ConceptsQueryResponse {
  concepts: ParsedConcept[];
  nextCursor: string | null;
  hasMore: boolean;
  count: number;
}
export interface GenerateConceptsRequest {
  subject: string;
  userId: string;
  sessionId?: string;
  context?: string;
  trunks?: string[];
}
export interface SuggestStructureRequest {
  subject: string;
  userId: string;
  context?: string;
}
export interface SuggestedDomain {
  name: string;
  weight: number;
  tasks: string[];
}
export interface SuggestStructureResponse {
  subject: string;
  subjectType: string;
  domains: SuggestedDomain[];
}
export interface GenerateConceptsResponse {
  jobId: string;
  sessionId: string;
  status: 'in_progress' | 'completed' | 'failed';
  conceptCount?: number;
  error?: string;
  subjectType?: import('@/shared/types/macro-workflow').SubjectType;
  macroWorkflow?: import('@/shared/types/macro-workflow').MacroWorkflowResult;
}
export interface JobStatus {
  jobId: string;
  userId: string;
  sessionId: string;
  subject: string;
  status: 'in_progress' | 'completed' | 'failed';
  conceptCount?: number;
  error?: string;
  classification?: {
    subjectType: import('@/shared/types/macro-workflow').SubjectType;
    classification: import('@/shared/types/macro-workflow').SubjectClassification;
    macroStructure: import('@/shared/types/macro-workflow').MacroStructure;
    connectiveTissue: import('@/shared/types/macro-workflow').ConnectiveTissue;
    lifecycle: { phase1: string; phase2: string; phase3: string };
  };
}
export interface JobSummary {
  jobId: string;
  userId?: string;
  sessionId: string;
  subject: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  conceptCount?: number;
  createdAt?: number;
  isPublic?: boolean;
}
export interface JobProgress {
  jobId: string;
  sessionId: string;
  subject: string;
  status: 'in_progress' | 'completed' | 'failed' | 'unknown';
  conceptCount: number;
  latestConcept: string;
  updatedAt: number;
  error?: string;
}
export interface LatestConceptsResponse {
  concepts: ParsedConcept[];
  count: number;
  lastOrder: number;
  totalCount: number;
  status: 'generating' | 'completed' | 'failed' | 'unknown';
}
export const conceptsApi = {
  /**
  * Query concepts with pagination and optional tier filtering
  * Used for lazy loading concepts on demand
  */
  async query(params: ConceptsQueryParams): Promise<ConceptsQueryResponse> {
    const queryParams = new URLSearchParams({
      userId: params.userId,
      sessionId: params.sessionId,
      ...(params.tier && { tier: params.tier }),
      ...(params.limit && { limit: params.limit.toString() }),
      ...(params.cursor && { cursor: params.cursor })
    });
    return apiClient.get<ConceptsQueryResponse>(`/concepts?${queryParams.toString()}`);
  },
  /**
  * Start async concept generation with Lambda
  * Generation happens server-side, concepts stored in DynamoDB
  */
  async generate(request: GenerateConceptsRequest): Promise<GenerateConceptsResponse> {
    const response = await apiClient.post<GenerateConceptsResponse>('/generate', request);
    return response;
  },
  async suggestStructure(request: SuggestStructureRequest): Promise<SuggestStructureResponse> {
    return apiClient.post<SuggestStructureResponse>('/generate', {
      ...request,
      action: 'suggest_structure',
    });
  },
  /**
  * Run classification only — generates deepStructure & lifecycleBlueprints
  * without re-running the full concept generation (~10s vs ~12min).
  * Optionally patches the result into an existing job record.
  */
  async classifyOnly(request: { subject: string; userId: string; jobId?: string; context?: string }): Promise<import('@/shared/types/macro-workflow').SubjectClassification> {
    return apiClient.post('/generate', {
      ...request,
      action: 'classify_only',
    });
  },
  /**
  * Surgically repair a specific concept
  */
  async repair(request: { subject: string; conceptName: string; issue: string; userId: string }): Promise<ParsedConcept> {
    return apiClient.post<ParsedConcept>('/concepts/repair', request);
  },

  /**
  * Update a concept's fields (curator editing)
  */
  async updateConcept(
    _userId: string,
    sessionId: string,
    conceptId: string,
    tier: string,
    updates: Partial<ParsedConcept>,
  ): Promise<{ status: string; concept: ParsedConcept }> {
    return apiClient.put<{ status: string; concept: ParsedConcept }>(
      `/concepts/${encodeURIComponent(sessionId)}/concept/${encodeURIComponent(conceptId)}`,
      { tier, ...updates },
    );
  },

  /**
  * Delete a subject and all its concepts
  */
  async deleteJob(sessionId: string, userId: string): Promise<boolean> {
    try {
      await apiClient.delete(`/concepts/${sessionId}?userId=${encodeURIComponent(userId)}`);
      return true;
    } catch (error) {
      logger.error('[ConceptsAPI] Failed to delete job:', error);
      return false;
    }
  },
  /**
  * List all generation jobs for a user
  */
  async listJobs(userId: string): Promise<{ jobs: JobSummary[] }> {
    return apiClient.get<{ jobs: JobSummary[] }>(`/concepts/jobs?userId=${userId}`);
  },
  /**
  * Check status of a generation job
  */
  async getJobStatus(jobId: string, userId?: string): Promise<JobStatus> {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const response = await apiClient.get<JobStatus>(`/concepts/jobs/${jobId}${query}`);
    return response;
  },
  /**
  * Get all concepts for a tier (convenience method)
  * Fetches all pages until hasMore is false
  */
  async getAllByTier(
    userId: string,
    sessionId: string,
    tier: 'trunk' | 'branch' | 'leaf',
  ): Promise<ParsedConcept[]> {
    const allConcepts: ParsedConcept[] = [];
    let cursor: string | null = null;
    do {
      const response = await this.query({
        userId,
        sessionId,
        tier,
        limit: 100,
        cursor: cursor ?? undefined
      });
      allConcepts.push(...response.concepts);
      cursor = response.nextCursor;
    } while (cursor);
    return allConcepts;
  },
  // =========================================================================
  // STREAMING GENERATION SUPPORT
  // =========================================================================
  /**
  * Get real-time progress of a streaming generation job.
  * Poll this during generation to show live concept count and status.
  */
  async getJobProgress(userId: string, jobId: string): Promise<JobProgress> {
    const queryParams = new URLSearchParams({
      action: 'get_job_progress',
      userId,
      jobId
    });
    return apiClient.get<JobProgress>(`/concepts?${queryParams.toString()}`);
  },
  /**
  * Get concepts added after a specific order number.
  * Use for incremental polling during streaming generation.
  * 
  * @param userId User ID
  * @param sessionId Session ID from generation
  * @param afterOrder Only return concepts with order > this value (start with 0)
  * @param limit Max concepts to return per poll
  */
  async getLatestConcepts(
    userId: string,
    sessionId: string,
    afterOrder: number = 0,
    limit: number = 10,
  ): Promise<LatestConceptsResponse> {
    const queryParams = new URLSearchParams({
      action: 'get_latest_concepts',
      userId,
      sessionId,
      afterOrder: afterOrder.toString(),
      limit: limit.toString()
    });
    return apiClient.get<LatestConceptsResponse>(`/concepts?${queryParams.toString()}`);
  },
  /**
  * Poll for new concepts during streaming generation.
  * Yields concepts as they become available.
  * 
  * @param userId User ID
  * @param sessionId Session ID
  * @param onConcept Callback for each new concept
  * @param onProgress Callback for progress updates
  * @param pollIntervalMs How often to poll (default 1000ms)
  * @param abortSignal Optional signal to cancel polling
  */
  async pollForConcepts(
    userId: string,
    sessionId: string,
    onConcept: (concept: ParsedConcept, index: number) => void,
    onProgress?: (count: number, total: number, status: string) => void,
    pollIntervalMs: number = 1000,
    abortSignal?: AbortSignal,
  ): Promise<{ finalCount: number; status: string }> {
    let lastOrder = 0;
    let totalSeen = 0;
    while (true) {
      if (abortSignal?.aborted) {
        return { finalCount: totalSeen, status: 'cancelled' };
      }
      try {
        const response = await this.getLatestConcepts(userId, sessionId, lastOrder, 20);
        // Process new concepts
        for (const concept of response.concepts) {
          totalSeen++;
          onConcept(concept, totalSeen);
        }
        // Update tracking
        if (response.lastOrder > lastOrder) {
          lastOrder = response.lastOrder;
        }
        // Report progress
        if (onProgress) {
          onProgress(totalSeen, response.totalCount, response.status);
        }
        // Check if generation is complete
        if (response.status === 'completed' || response.status === 'failed') {
          return { finalCount: totalSeen, status: response.status };
        }
        // Wait before next poll
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, pollIntervalMs);
          if (abortSignal) {
            abortSignal.addEventListener('abort', () => {
              clearTimeout(timeout);
              reject(new Error('Polling cancelled'));
            }, { once: true });
          }
        });
      } catch (error) {
        // On error, wait and retry (unless aborted)
        if (abortSignal?.aborted) {
          return { finalCount: totalSeen, status: 'cancelled' };
        }
        logger.warn('[ConceptsAPI] Polling error, retrying...', error);
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs * 2));
      }
    }
  },
  async togglePublic(userId: string, jobId: string, isPublic: boolean): Promise<{ jobId: string; isPublic: boolean }> {
    const queryParams = new URLSearchParams({
      action: 'toggle_public',
      userId,
      jobId,
      isPublic: String(isPublic),
    });
    return apiClient.get<{ jobId: string; isPublic: boolean }>(`/concepts?${queryParams.toString()}`);
  },
  async listPublic(): Promise<{ jobs: PublicJobSummary[] }> {
    const queryParams = new URLSearchParams({ action: 'list_public' });
    return apiClient.get<{ jobs: PublicJobSummary[] }>(`/concepts?${queryParams.toString()}`);
  },
  async getPublicContent(
    ownerId: string,
    jobId: string,
  ): Promise<{ jobId: string; subject: string; ownerId: string; conceptCount: number; concepts: ParsedConcept[]; classification?: unknown }> {
    const queryParams = new URLSearchParams({
      action: 'get_public_content',
      userId: ownerId,
      ownerId,
      jobId,
    });
    return apiClient.get(`/concepts?${queryParams.toString()}`);
  },

  /**
  * Get a presigned S3 URL for uploading a file
  */
  async getUploadUrl(fileName: string, contentType: string, fileSize?: number): Promise<{ url: string; key: string; bucket: string }> {
    return apiClient.post<{ url: string; key: string; bucket: string }>('/concepts/upload-url', {
      fileName,
      contentType,
      fileSize,
    });
  },
};
export type { ParsedConcept };
