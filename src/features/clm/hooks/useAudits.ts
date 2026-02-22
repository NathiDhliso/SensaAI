/**
 * CLM Audit Hooks
 * React Query hooks for audit management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clmApi, type AuditFilters, type TriggerAuditRequest } from '../api/clm-client';

export function useAudits(filters: AuditFilters) {
  return useQuery({
    queryKey: ['clm', 'audits', filters],
    queryFn: () => clmApi.listAudits(filters),
    staleTime: 30_000, // 30 seconds
  });
}

export function useAuditDetail(auditId: string | undefined) {
  return useQuery({
    queryKey: ['clm', 'audit', auditId],
    queryFn: () => clmApi.getAuditDetail(auditId!),
    enabled: !!auditId,
    staleTime: 10_000, // 10 seconds
  });
}

export function useTriggerAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: TriggerAuditRequest) => clmApi.triggerAudit(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clm', 'audits'] });
    },
  });
}

export function usePendingFindings(limit?: number) {
  return useQuery({
    queryKey: ['clm', 'findings', 'pending', limit],
    queryFn: () => clmApi.getPendingFindings(limit),
    staleTime: 30_000,
  });
}
