/**
 * CLM Analytics Hooks
 * React Query hooks for analytics and reporting
 */

import { useQuery } from '@tanstack/react-query';
import { clmApi } from '../api/clm-client';

export function useAnalytics(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['clm', 'analytics', startDate, endDate],
    queryFn: () => clmApi.getAnalytics(startDate, endDate),
    staleTime: 60_000, // 1 minute
    enabled: !!startDate && !!endDate,
  });
}

export function useRecentChanges(days: number = 7) {
  return useQuery({
    queryKey: ['clm', 'analytics', 'recent', days],
    queryFn: () => clmApi.getRecentChanges(days),
    staleTime: 30_000, // 30 seconds
  });
}
