/**
 * Smart Regeneration Hooks
 * React Query hooks for AI-powered regeneration recommendations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { regenerationApi } from '../api/clm-enhancements-client';

/** Get AI recommendation for regeneration strategy */
export function useRegenerationRecommendation(subject: string | undefined) {
  return useQuery({
    queryKey: ['clm', 'regeneration', 'recommend', subject],
    queryFn: () => regenerationApi.getRecommendation(subject!),
    enabled: !!subject,
    staleTime: 300_000, // 5 minutes
  });
}

/** Execute a regeneration strategy */
export function useExecuteRegeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subject,
      strategy,
      domains,
    }: {
      subject: string;
      strategy: string;
      domains?: string[];
    }) => regenerationApi.executeStrategy(subject, strategy, domains),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clm', 'regeneration', 'recommend', variables.subject] });
      queryClient.invalidateQueries({ queryKey: ['clm', 'health'] });
    },
  });
}

/** Poll regeneration status */
export function useRegenerationStatus(jobId: string | undefined) {
  return useQuery({
    queryKey: ['clm', 'regeneration', 'status', jobId],
    queryFn: () => regenerationApi.getRegenerationStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      return 5_000; // Poll every 5s while in progress
    },
  });
}
