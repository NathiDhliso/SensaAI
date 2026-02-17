/**
 * User Data API Client
 * 
 * Persists user learning data (spacing reviews, objectives, stats, preferences)
 * to DynamoDB via the backend /concepts/userdata endpoints.
 */
import { apiClient } from './client';

export interface UserDataItem {
    userId: string;
    dataKey: string;
    data: unknown;
    updatedAt: number;
}

export interface UserDataResponse {
    items: UserDataItem[];
    count: number;
}

export const userdataApi = {
    /**
     * Get all user data items, optionally filtered by dataKey prefix.
     * e.g. prefix='REVIEW#' returns all spacing reviews
     */
    async getAll(userId: string, prefix?: string): Promise<UserDataResponse> {
        const params = new URLSearchParams({ userId });
        if (prefix) params.set('prefix', prefix);
        return apiClient.get<UserDataResponse>(`/concepts/userdata?${params.toString()}`);
    },

    /**
     * Upsert a single user data item.
     */
    async put(userId: string, dataKey: string, data: unknown): Promise<void> {
        await apiClient.put('/concepts/userdata', { userId, dataKey, data });
    },

    /**
     * Batch upsert multiple user data items.
     * Handles chunking server-side for batches > 25 items.
     */
    async batchPut(userId: string, items: { dataKey: string; data: unknown }[]): Promise<void> {
        if (items.length === 0) return;
        await apiClient.post('/concepts/userdata/batch', { userId, items });
    },
};
