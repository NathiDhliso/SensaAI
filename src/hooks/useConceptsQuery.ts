/**
 * useConceptsQuery - Paginated concept fetching with React Query
 *
 * This hook provides lazy-loaded access to concepts from the DynamoDB backend.
 * It uses infinite scroll pattern with automatic IndexedDB caching for offline access.
 *
 * Usage:
 * ```tsx
 * const { concepts, isLoading, hasMore, fetchMore } = useConceptsQuery({
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   tier: 'foundation',
 * });
 * ```
 */

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conceptsApi, type ConceptsQueryParams } from '@/lib/api';
import type { ParsedConcept } from '@/lib/content-adapter/types';
import { IndexedDBStorage } from '@/lib/storage/indexed-db-storage';

// Query keys for cache invalidation
export const conceptsQueryKeys = {
    all: ['concepts'] as const,
    session: (userId: string, sessionId: string) =>
        [...conceptsQueryKeys.all, userId, sessionId] as const,
    tier: (userId: string, sessionId: string, tier: string) =>
        [...conceptsQueryKeys.session(userId, sessionId), tier] as const,
    jobs: ['concept-jobs'] as const,
    job: (jobId: string) => [...conceptsQueryKeys.jobs, jobId] as const,
};

interface UseConceptsQueryOptions {
    userId: string;
    sessionId: string;
    tier?: 'foundation' | 'keystone' | 'utility';
    pageSize?: number;
    enabled?: boolean;
}

interface UseConceptsQueryResult {
    /** Flattened array of all loaded concepts */
    concepts: ParsedConcept[];
    /** Loading state for initial fetch */
    isLoading: boolean;
    /** Loading state for fetching next page */
    isFetchingNextPage: boolean;
    /** Error if query failed */
    error: Error | null;
    /** Whether more pages are available */
    hasMore: boolean;
    /** Function to fetch next page */
    fetchMore: () => void;
    /** Total count of loaded concepts */
    totalLoaded: number;
    /** Refetch all data */
    refetch: () => void;
}

/**
 * Hook for paginated concept fetching with infinite scroll
 */
export function useConceptsQuery(options: UseConceptsQueryOptions): UseConceptsQueryResult {
    const { userId, sessionId, tier, pageSize = 25, enabled = true } = options;

    const queryKey = tier
        ? conceptsQueryKeys.tier(userId, sessionId, tier)
        : conceptsQueryKeys.session(userId, sessionId);

    const {
        data,
        isLoading,
        isFetchingNextPage,
        error,
        hasNextPage,
        fetchNextPage,
        refetch,
    } = useInfiniteQuery({
        queryKey,
        queryFn: async ({ pageParam }) => {
            const response = await conceptsApi.query({
                userId,
                sessionId,
                tier,
                limit: pageSize,
                cursor: pageParam,
            });

            // Cache to IndexedDB for offline access
            const storage = new IndexedDBStorage();
            if (response.concepts.length > 0) {
                await storage.saveConcepts(sessionId, response.concepts);
            }

            return response;
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    });

    // Flatten all pages into single array
    const concepts = data?.pages.flatMap((page) => page.concepts) ?? [];
    const totalLoaded = concepts.length;

    return {
        concepts,
        isLoading,
        isFetchingNextPage,
        error: error as Error | null,
        hasMore: hasNextPage ?? false,
        fetchMore: fetchNextPage,
        totalLoaded,
        refetch,
    };
}

/**
 * Hook to fetch all concepts for a specific tier (non-paginated)
 * Useful when you need all concepts upfront (e.g., for visualizations)
 */
export function useAllConceptsByTier(
    userId: string,
    sessionId: string,
    tier: 'foundation' | 'keystone' | 'utility',
    enabled = true,
) {
    return useQuery({
        queryKey: [...conceptsQueryKeys.tier(userId, sessionId, tier), 'all'],
        queryFn: async () => {
            // Try IndexedDB first
            const storage = new IndexedDBStorage();
            const cached = await storage.loadConceptsByTier(sessionId, tier);
            if (cached.length > 0) {
                return cached;
            }

            // Fetch from API
            return conceptsApi.getAllByTier(userId, sessionId, tier);
        },
        enabled,
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}

interface UseGenerateConceptsOptions {
    onSuccess?: (sessionId: string, conceptCount: number) => void;
    onError?: (error: Error) => void;
}

/**
 * Hook to trigger async concept generation
 */
export function useGenerateConcepts(options: UseGenerateConceptsOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: conceptsApi.generate,
        onSuccess: (data) => {
            // Invalidate queries to refetch with new concepts
            queryClient.invalidateQueries({ queryKey: conceptsQueryKeys.all });
            options.onSuccess?.(data.sessionId, data.conceptCount ?? 0);
        },
        onError: (error: Error) => {
            options.onError?.(error);
        },
    });
}

/**
 * Hook to poll generation job status
 */
export function useJobStatus(jobId: string | null, options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: conceptsQueryKeys.job(jobId ?? ''),
        queryFn: () => conceptsApi.getJobStatus(jobId!),
        enabled: !!jobId && (options.enabled ?? true),
        refetchInterval: (query) => {
            // Poll every 2 seconds until completed
            const data = query.state.data;
            if (data?.status === 'completed' || data?.status === 'failed') {
                return false; // Stop polling
            }
            return 2000;
        },
    });
}

/**
 * Hook to load concepts from IndexedDB (offline-first)
 */
export function useCachedConcepts(sessionId: string, tier?: string) {
    return useQuery({
        queryKey: ['cached-concepts', sessionId, tier],
        queryFn: async () => {
            const storage = new IndexedDBStorage();
            if (tier) {
                return storage.loadConceptsByTier(sessionId, tier);
            }
            // Load all tiers
            const foundation = await storage.loadConceptsByTier(sessionId, 'foundation');
            const keystone = await storage.loadConceptsByTier(sessionId, 'keystone');
            const utility = await storage.loadConceptsByTier(sessionId, 'utility');
            return [...foundation, ...keystone, ...utility];
        },
        staleTime: Infinity, // Cached data doesn't go stale
    });
}
