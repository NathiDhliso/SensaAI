/**
 * Comparative Analysis Hooks
 * React Query hooks for version comparison and regression detection
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { comparativeApi } from '../api/clm-enhancements-client';

/** Compare latest versions of a subject */
export function useLatestComparison(subject: string | undefined) {
  return useQuery({
    queryKey: ['clm', 'compare', 'latest', subject],
    queryFn: () => comparativeApi.compareLatestVersions(subject!),
    enabled: !!subject,
    staleTime: 120_000,
  });
}

/** Compare two specific versions */
export function useVersionComparison(
  subject: string | undefined,
  currentVersionId: string | undefined,
  previousVersionId: string | undefined
) {
  return useQuery({
    queryKey: ['clm', 'compare', subject, currentVersionId, previousVersionId],
    queryFn: () => comparativeApi.compareVersions(subject!, currentVersionId!, previousVersionId!),
    enabled: !!subject && !!currentVersionId && !!previousVersionId,
    staleTime: 300_000, // 5 minutes — comparison is stable
  });
}

/** Fetch comparison history for a subject */
export function useComparisonHistory(subject: string | undefined, limit: number = 10) {
  return useQuery({
    queryKey: ['clm', 'compare', 'history', subject, limit],
    queryFn: () => comparativeApi.getComparisonHistory(subject!, limit),
    enabled: !!subject,
    staleTime: 120_000,
  });
}

/** Trigger a manual version comparison */
export function useTriggerComparison() {
  return useMutation({
    mutationFn: ({
      subject,
      currentVersionId,
      previousVersionId,
    }: {
      subject: string;
      currentVersionId: string;
      previousVersionId: string;
    }) => comparativeApi.compareVersions(subject, currentVersionId, previousVersionId),
  });
}
