/**
 * A/B Testing Hooks
 * React Query hooks for content variant testing
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { abTestingApi } from '../api/clm-enhancements-client';
import type { ABTest } from '../types/enhancements';

/** List all A/B tests with optional status filter */
export function useABTests(status?: string) {
  return useQuery({
    queryKey: ['clm', 'ab-tests', status],
    queryFn: () => abTestingApi.listTests(status),
    staleTime: 30_000,
  });
}

/** Get A/B test details */
export function useABTestDetail(testId: string | undefined) {
  return useQuery({
    queryKey: ['clm', 'ab-tests', testId],
    queryFn: () => abTestingApi.getTest(testId!),
    enabled: !!testId,
    staleTime: 15_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'running') return 30_000; // Poll running tests
      return false;
    },
  });
}

/** Create a new A/B test */
export function useCreateABTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (test: Omit<ABTest, 'testId' | 'status' | 'createdAt' | 'results' | 'currentSampleSize'>) =>
      abTestingApi.createTest(test),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clm', 'ab-tests'] });
    },
  });
}

/** Start an A/B test */
export function useStartABTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (testId: string) => abTestingApi.startTest(testId),
    onSuccess: (_, testId) => {
      queryClient.invalidateQueries({ queryKey: ['clm', 'ab-tests', testId] });
      queryClient.invalidateQueries({ queryKey: ['clm', 'ab-tests'] });
    },
  });
}

/** Pause an A/B test */
export function usePauseABTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (testId: string) => abTestingApi.pauseTest(testId),
    onSuccess: (_, testId) => {
      queryClient.invalidateQueries({ queryKey: ['clm', 'ab-tests', testId] });
    },
  });
}

/** Complete an A/B test */
export function useCompleteABTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (testId: string) => abTestingApi.completeTest(testId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clm', 'ab-tests'] });
    },
  });
}
