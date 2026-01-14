// Concepts API - Paginated access to learning concepts stored in DynamoDB
// Uses Lambda backend for queries instead of loading all concepts into memory

import { apiClient } from './client';
import type { ParsedConcept } from '@/lib/content-adapter/types';

// API types matching Lambda response
export interface ConceptsQueryParams {
    userId: string;
    sessionId: string;
    tier?: 'foundation' | 'keystone' | 'utility';
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
}

export interface GenerateConceptsResponse {
    jobId: string;
    sessionId: string;
    status: 'in_progress' | 'completed' | 'failed';
    conceptCount?: number;
    error?: string;
}

export interface JobStatus {
    jobId: string;
    userId: string;
    sessionId: string;
    subject: string;
    status: 'in_progress' | 'completed' | 'failed';
    conceptCount?: number;
    error?: string;
}

export interface JobSummary {
    jobId: string;
    userId?: string;
    sessionId: string;
    subject: string;
    status: 'queued' | 'in_progress' | 'completed' | 'failed';
    conceptCount?: number;
    createdAt?: number;
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
            ...(params.cursor && { cursor: params.cursor }),
        });

        return apiClient.get<ConceptsQueryResponse>(`/concepts?${queryParams.toString()}`);
    },

    /**
     * Start async concept generation with Lambda
     * Generation happens server-side, concepts stored in DynamoDB
     */
    async generate(request: GenerateConceptsRequest): Promise<GenerateConceptsResponse> {
        console.log('[ConceptsAPI] generate() called:', request);
        const response = await apiClient.post<GenerateConceptsResponse>('/concepts/generate', request);
        console.log('[ConceptsAPI] generate() response:', response);
        return response;
    },

    /**
     * Surgically repair a specific concept
     */
    async repair(request: { subject: string; conceptName: string; issue: string; userId: string }): Promise<ParsedConcept> {
        console.log('[ConceptsAPI] repair() called:', request);
        return apiClient.post<ParsedConcept>('/concepts/generate', {
            ...request,
            action: 'repair'
        });
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
    async getJobStatus(jobId: string): Promise<JobStatus> {
        console.log('[ConceptsAPI] getJobStatus() called for jobId:', jobId);
        const response = await apiClient.get<JobStatus>(`/concepts/jobs/${jobId}`);
        console.log('[ConceptsAPI] getJobStatus() response:', response);
        return response;
    },

    /**
     * Get all concepts for a tier (convenience method)
     * Fetches all pages until hasMore is false
     */
    async getAllByTier(
        userId: string,
        sessionId: string,
        tier: 'foundation' | 'keystone' | 'utility',
    ): Promise<ParsedConcept[]> {
        const allConcepts: ParsedConcept[] = [];
        let cursor: string | null = null;

        do {
            const response = await this.query({
                userId,
                sessionId,
                tier,
                limit: 100,
                cursor: cursor ?? undefined,
            });

            allConcepts.push(...response.concepts);
            cursor = response.nextCursor;
        } while (cursor);

        return allConcepts;
    },
};

export type { ParsedConcept };
