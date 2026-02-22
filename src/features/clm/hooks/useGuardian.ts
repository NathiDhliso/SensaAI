/**
 * AI JSON Edit Guardian Hooks
 * React Query hooks for AI-powered edit validation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guardianApi } from '../api/clm-enhancements-client';
import type { GuardianConfig } from '../types/enhancements';

/** Validate a JSON edit before saving */
export function useValidateEdit() {
  return useMutation({
    mutationFn: ({
      conceptId,
      fieldPath,
      originalValue,
      proposedValue,
    }: {
      conceptId: string;
      fieldPath: string;
      originalValue: unknown;
      proposedValue: unknown;
    }) => guardianApi.validateEdit(conceptId, fieldPath, originalValue, proposedValue),
  });
}

/** Get guardian configuration */
export function useGuardianConfig() {
  return useQuery({
    queryKey: ['clm', 'guardian', 'config'],
    queryFn: () => guardianApi.getConfig(),
    staleTime: 600_000, // 10 minutes
  });
}

/** Update guardian configuration */
export function useUpdateGuardianConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: Partial<GuardianConfig>) => guardianApi.updateConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clm', 'guardian', 'config'] });
    },
  });
}

/** Get validation history */
export function useValidationHistory(limit: number = 20) {
  return useQuery({
    queryKey: ['clm', 'guardian', 'history', limit],
    queryFn: () => guardianApi.getValidationHistory(limit),
    staleTime: 30_000,
  });
}

/** Override a guardian decision */
export function useOverrideGuardian() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      editId,
      overrideReason,
    }: {
      editId: string;
      overrideReason: string;
    }) => guardianApi.overrideDecision(editId, overrideReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clm', 'guardian', 'history'] });
    },
  });
}
