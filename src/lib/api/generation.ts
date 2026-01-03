// Generation API service
// Replaces direct AWS SDK calls with backend API

import { apiClient } from './client';

interface StartGenerationRequest {
    subject: string;
    systemPrompt?: string;
    domain?: string;
}

interface StartGenerationResponse {
    jobId: string;
    status: 'queued';
}

interface GenerationStatus {
    id: string;
    userId: string;
    subject: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    content: string;
    createdAt: string;
    completedAt?: string;
    error?: string;
}

export const generationApi = {
    // Start a new generation job
    async start(request: StartGenerationRequest): Promise<StartGenerationResponse> {
        return apiClient.post<StartGenerationResponse>('/generation/start', request);
    },

    // Stream generation content
    async *stream(jobId: string) {
        yield* apiClient.stream(`/generation/stream/${jobId}`);
    },

    // Get generation status
    async getStatus(jobId: string): Promise<GenerationStatus> {
        return apiClient.get<GenerationStatus>(`/generation/${jobId}/status`);
    },

    // Cancel a generation
    async cancel(jobId: string): Promise<void> {
        await apiClient.post(`/generation/${jobId}/cancel`);
    },
};

export type { StartGenerationRequest, StartGenerationResponse, GenerationStatus };
