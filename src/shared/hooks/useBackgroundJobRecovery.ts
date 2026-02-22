/**
 * useBackgroundJobRecovery Hook
 * 
 * Checks for active generation jobs that may have been running in the background
 * (e.g., if user closed the tab during generation) and allows resuming them.
 * 
 * @module hooks/useBackgroundJobRecovery
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGenerationStore } from '@/store/generation-store';
import { conceptsApi } from '@/shared/api';
import { logger } from '@/shared/utils/logger';
interface BackgroundJobStatus {
 hasActiveJob: boolean;
 job: ReturnType<typeof useGenerationStore.getState>['activeJob'];
 isChecking: boolean;
 isCompleted: boolean;
 error: string | null;
}
/**
 * Hook for recovering from background generation jobs
 * 
 * Checks localStorage for any active jobs and provides functions to:
 * - Check job status on the server
 * - Resume/complete a job that finished while user was away
 * - Dismiss/clear stale jobs
 */
export function useBackgroundJobRecovery() {
 const navigate = useNavigate();
 const { activeJob, clearActiveJob, updateActiveJobStatus, hasActiveJob } = useGenerationStore();
 const [status, setStatus] = useState<BackgroundJobStatus>(() => ({
 hasActiveJob: hasActiveJob(),
 job: activeJob,
 isChecking: false,
 isCompleted: false,
 error: null
 }));
 // Update status when activeJob changes (e.g., after store rehydrates)
 useEffect(() => {
 const jobActive = hasActiveJob();
 if (jobActive !== status.hasActiveJob || activeJob !== status.job) {
 // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing with external store state
 setStatus(prev => ({
 ...prev,
 hasActiveJob: jobActive,
 job: activeJob
 }));
 }
 }, [activeJob, hasActiveJob, status.hasActiveJob, status.job]);
 /**
 * Check the status of the active job on the server
 */
 const checkJobStatus = useCallback(async () => {
 if (!activeJob) return;
 setStatus(prev => ({ ...prev, isChecking: true, error: null }));
 try {
 const serverStatus = await conceptsApi.getJobStatus(activeJob.jobId, activeJob.userId);
 if (serverStatus.status === 'completed') {
 updateActiveJobStatus('completed');
 setStatus(prev => ({
 ...prev,
 isChecking: false,
 isCompleted: true
 }));
 } else if (serverStatus.status === 'failed') {
 updateActiveJobStatus('failed');
 setStatus(prev => ({
 ...prev,
 isChecking: false,
 error: serverStatus.error || 'Generation failed on server'
 }));
 } else {
 // Still processing
 setStatus(prev => ({
 ...prev,
 isChecking: false
 }));
 }
 } catch (err) {
 logger.error('[BackgroundJobRecovery] Failed to check job status:', err);
 setStatus(prev => ({
 ...prev,
 isChecking: false,
 error: 'Failed to check job status. The job may have expired.'
 }));
 }
 }, [activeJob, updateActiveJobStatus]);
 /**
 * Navigate to view the completed results
 */
 const viewCompletedResults = useCallback(() => {
 if (!activeJob) return;
 // Navigate to the study page for this subject
 // The results should be in DynamoDB, accessible via the session
 navigate(`/study/${encodeURIComponent(activeJob.subject)}`);
 clearActiveJob();
 }, [activeJob, navigate, clearActiveJob]);
 /**
 * Dismiss/clear the active job without viewing results
 */
 const dismissJob = useCallback(() => {
 clearActiveJob();
 setStatus({
 hasActiveJob: false,
 job: null,
 isChecking: false,
 isCompleted: false,
 error: null
 });
 }, [clearActiveJob]);
 /**
 * Resume generation if it was interrupted mid-process
 * (Navigates back to the generate page)
 */
 const resumeGeneration = useCallback(() => {
 if (!activeJob) return;
 navigate(`/generate/${encodeURIComponent(activeJob.subject)}`);
 }, [activeJob, navigate]);
 return {
 ...status,
 checkJobStatus,
 viewCompletedResults,
 dismissJob,
 resumeGeneration
 };
}