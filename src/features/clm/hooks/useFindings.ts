/**
 * CLM Finding Hooks
 * React Query hooks for finding management
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clmApi, type ApproveRejectRequest, type ExecuteFindingsRequest } from '../api/clm-client';

export function useApproveFindings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ApproveRejectRequest) => clmApi.approveFindings(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clm', 'audit', variables.auditId] });
      queryClient.invalidateQueries({ queryKey: ['clm', 'audits'] });
      queryClient.invalidateQueries({ queryKey: ['clm', 'findings', 'pending'] });
    },
  });
}

export function useRejectFindings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ApproveRejectRequest) => clmApi.rejectFindings(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clm', 'audit', variables.auditId] });
      queryClient.invalidateQueries({ queryKey: ['clm', 'audits'] });
      queryClient.invalidateQueries({ queryKey: ['clm', 'findings', 'pending'] });
    },
  });
}

export function useExecuteFindings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ExecuteFindingsRequest) => clmApi.executeFindings(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clm', 'audit', variables.auditId] });
      queryClient.invalidateQueries({ queryKey: ['clm', 'audits'] });
      queryClient.invalidateQueries({ queryKey: ['clm', 'findings', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['clm', 'analytics'] });
    },
  });
}
