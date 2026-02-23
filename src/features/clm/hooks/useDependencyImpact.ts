/**
 * Dependency Impact Hooks
 * React Query hooks for concept dependency analysis
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { dependencyApi } from '../api/clm-enhancements-client';

/** Get dependency graph for a subject */
export function useDependencyGraph(subject: string | undefined, sessionId?: string) {
  return useQuery({
    queryKey: ['clm', 'dependencies', 'graph', subject, sessionId],
    queryFn: () => dependencyApi.getDependencyGraph(subject!, sessionId),
    enabled: !!subject,
    staleTime: 300_000,
  });
}

/** Analyze impact of changing a concept */
export function useImpactAnalysis(conceptId: string | undefined, changeType: 'modify' | 'delete' | 'restructure') {
  return useQuery({
    queryKey: ['clm', 'dependencies', 'impact', conceptId, changeType],
    queryFn: () => dependencyApi.analyzeImpact(conceptId!, changeType),
    enabled: !!conceptId,
    staleTime: 60_000,
  });
}

/** Run safety check before applying changes */
export function useSafetyCheck() {
  return useMutation({
    mutationFn: ({
      conceptIds,
      changeType,
    }: {
      conceptIds: string[];
      changeType: 'modify' | 'delete' | 'restructure';
    }) => dependencyApi.safetyCheck(conceptIds, changeType),
  });
}

/** Apply auto-fix for broken connections */
export function useApplyAutoFix() {
  return useMutation({
    mutationFn: (fixId: string) => dependencyApi.applyAutoFix(fixId),
  });
}
