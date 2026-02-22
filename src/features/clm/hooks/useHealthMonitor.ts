/**
 * Generation Health Monitor Hooks
 * React Query hooks for monitoring generation health
 */

import { useQuery } from '@tanstack/react-query';
import { healthMonitorApi } from '../api/clm-enhancements-client';

/** Fetch health report for a specific subject generation */
export function useGenerationHealth(subject: string | undefined) {
  return useQuery({
    queryKey: ['clm', 'health', 'generation', subject],
    queryFn: () => healthMonitorApi.getHealthReport(subject!),
    enabled: !!subject,
    staleTime: 60_000,
    refetchInterval: 30_000, // Poll every 30s for near-realtime health
  });
}

/** Fetch recent health reports across all subjects */
export function useRecentHealthReports(limit: number = 10) {
  return useQuery({
    queryKey: ['clm', 'health', 'recent', limit],
    queryFn: () => healthMonitorApi.getRecentHealthReports(limit),
    staleTime: 60_000,
  });
}

/** Fetch aggregate health across all subjects */
export function useAggregateHealth() {
  return useQuery({
    queryKey: ['clm', 'health', 'aggregate'],
    queryFn: () => healthMonitorApi.getAggregateHealth(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
