/**
 * Learner Feedback Hooks
 * React Query hooks for learner performance analysis
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { learnerFeedbackApi } from '../api/clm-enhancements-client';

/** Get full learner feedback report for a subject */
export function useLearnerFeedback(subject: string | undefined) {
  return useQuery({
    queryKey: ['clm', 'feedback', subject],
    queryFn: () => learnerFeedbackApi.getFeedbackReport(subject!),
    enabled: !!subject,
    staleTime: 300_000,
  });
}

/** Get heatmap data for concept mastery visualization */
export function useMasteryHeatmap(subject: string | undefined) {
  return useQuery({
    queryKey: ['clm', 'feedback', 'heatmap', subject],
    queryFn: () => learnerFeedbackApi.getHeatmapData(subject!),
    enabled: !!subject,
    staleTime: 300_000,
  });
}

/** Generate AI clarification suggestions for problem concepts */
export function useGenerateClarifications() {
  return useMutation({
    mutationFn: ({
      subject,
      conceptIds,
    }: {
      subject: string;
      conceptIds: string[];
    }) => learnerFeedbackApi.generateClarifications(subject, conceptIds),
  });
}
