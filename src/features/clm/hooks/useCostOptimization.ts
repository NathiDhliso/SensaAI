/**
 * Cost Optimization Hooks
 * React Query hooks for cost tracking and optimization
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costApi } from '../api/clm-enhancements-client';

/** Get cost report for a date range */
export function useCostReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['clm', 'costs', startDate, endDate],
    queryFn: () => costApi.getCostReport(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 300_000, // 5 minutes
  });
}

/** Get cost optimization suggestions */
export function useCostOptimizations() {
  return useQuery({
    queryKey: ['clm', 'costs', 'optimizations'],
    queryFn: () => costApi.getOptimizations(),
    staleTime: 600_000, // 10 minutes
  });
}

/** Get cost per learner metrics */
export function useCostPerLearner(subject?: string) {
  return useQuery({
    queryKey: ['clm', 'costs', 'per-learner', subject],
    queryFn: () => costApi.getCostPerLearner(subject),
    staleTime: 300_000,
  });
}

/** Set cost alert thresholds */
export function useSetCostAlerts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (thresholds: Record<string, number>) => costApi.setAlertThresholds(thresholds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clm', 'costs'] });
    },
  });
}
