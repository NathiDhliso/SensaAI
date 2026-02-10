/**
 * useGenerationRecovery Hook
 * 
 * Recovers from page refreshes during generation.
 * Checks for active backend jobs and resumes polling/progress updates.
 * 
 * @module hooks/useGenerationRecovery
 */
import { useEffect, useRef } from 'react';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { useNavigate } from 'react-router-dom';
import { useGenerationStore } from '@/store/generation-store';
import { conceptsApi } from '@/shared/api';
import { parseAndLoadContent } from '@/shared/utils/content-loader';
/**
 * Hook to recover from page refresh during active generation
 */
export function useGenerationRecovery() {
 const navigate = useNavigate();
 const hasRecoveredRef = useRef(false);
 useEffect(() => {
 // Expose global function to manually clear stuck jobs (for debugging)
 if (typeof window !== 'undefined') {
 (window as unknown as Record<string, unknown>).clearStuckJob = () => {
 const { clearActiveJob } = useGenerationStore.getState();
 clearActiveJob();
 window.location.href = '/';
 };
 }
 // Only run once on mount
 if (hasRecoveredRef.current) return;
 hasRecoveredRef.current = true;
 const { 
 hasActiveJob, 
 getActiveJob, 
 clearActiveJob,
 updateGenerationProgress,
 completeGeneration,
 setError
 } = useGenerationStore.getState();
 // Check if there's an active job to recover
 if (!hasActiveJob()) {
 return;
 }
 const activeJob = getActiveJob();
 if (!activeJob) return;
 // Check if job is too old (> 30 minutes = likely failed/stale)
 const jobAge = Date.now() - activeJob.startedAt;
 const maxJobAge = 30 * 60 * 1000; // 30 minutes
 if (jobAge > maxJobAge) {
 console.warn('[Recovery] Job is too old, clearing stale job:', { 
 jobId: activeJob.jobId, 
 ageMinutes: Math.floor(jobAge / 60000) 
 });
 clearActiveJob();
 return;
 }
 // Set initial state to show we're recovering
 updateGenerationProgress({
 pass: 2,
 status: 'in-progress',
 activity: 'Reconnecting to generation in progress...',
 progress: 10
 });
 // Start polling the backend
 const pollForCompletion = async () => {
 let pollInterval = 2000;
 const maxPollInterval = 10000;
 const maxPollTime = 15 * 60 * 1000; // 15 minutes max
 const startTime = Date.now();
 let consecutiveErrors = 0;
 const maxConsecutiveErrors = 5;
 while (true) {
 // Check if we've exceeded max poll time
 if (Date.now() - startTime > maxPollTime) {
 console.error('[Recovery] Polling timeout exceeded');
 setError('Unable to reconnect to generation. It may still be running on the server.');
 clearActiveJob();
 return;
 }
 try {
 const status = await conceptsApi.getJobStatus(activeJob.jobId, activeJob.userId);
 // Reset error counter on successful poll
 consecutiveErrors = 0;
 if (status.status === 'completed') {
 updateGenerationProgress({
 pass: 3,
 status: 'in-progress',
 activity: 'Loading generated concepts...',
 progress: 60
 });
 // Fetch all concepts
 const [rootConcepts, trunkConcepts, leafConcepts] = await Promise.all([
 conceptsApi.getAllByTier(activeJob.userId, activeJob.sessionId, 'root'),
 conceptsApi.getAllByTier(activeJob.userId, activeJob.sessionId, 'trunk'),
 conceptsApi.getAllByTier(activeJob.userId, activeJob.sessionId, 'leaf')
 ]);
 const allConcepts = [
 ...(rootConcepts || []),
 ...(trunkConcepts || []),
 ...(leafConcepts || [])
 ];
 allConcepts.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
 // Build full document
 const fullDocument = allConcepts
 .map(c => `# ${c.name}\n\n${(c as unknown as Record<string, string>).explanation || ''}\n\n`)
 .join('\n');
 // TODO: Fix type mismatch - result needs proper GenerationResult structure
 completeGeneration({
 fullDocument,
 sessionId: activeJob.sessionId,
 tier: 'root' as const,
 conceptCount: allConcepts.length
 } as unknown as Parameters<typeof completeGeneration>[0]);
 clearActiveJob();
 // Save and navigate
 const resultId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
 const savedResult = {
 id: resultId,
 subject: activeJob.subject,
 alias: `recovered-${activeJob.jobId}`,
 generatedAt: new Date().toISOString(),
 fullDocument,
 pass1Data: {
 domain: 'unknown',
 roleScope: 'unknown',
 lifecycle: 'FUNDAMENTALS' as const,
 concepts: allConcepts.map(c => c.name)
 },
 validation: {
 hasDocLinks: false,
 officialDocsCount: 0,
 completeness: allConcepts.length > 0 ? 100 : 0
 },
 savedLocally: true
 };
 // TODO: Fix type mismatch - savedResult needs proper SavedResult structure
 const { storageManager } = await import('@/features/content-storage');
 await storageManager.saveResult(savedResult as unknown as import('@/features/content-storage/types').SavedResult);
 parseAndLoadContent(fullDocument, resultId);
 setTimeout(() => navigate(`/study/${resultId}`, { replace: true }), 500);
 return;
 }
 if (status.status === 'failed') {
 console.error('[Recovery] Job failed:', status.error);
 setError(status.error || 'Generation failed');
 clearActiveJob();
 return;
 }
 // Still processing - update progress
 updateGenerationProgress({
 pass: 2,
 status: 'in-progress',
 activity: 'AI generation in progress...',
 progress: Math.min(50, 10 + Math.floor((Date.now() - startTime) / 6000))
 });
 // Reset interval on success
 pollInterval = 2000;
 } catch (err) {
 consecutiveErrors++;
 console.error('[Recovery] Polling error:', { 
 error: err, 
 consecutiveErrors, 
 maxConsecutiveErrors 
 });
 const errorMessage = err instanceof Error ? err.message : String(err);
 // Check for auth errors
 if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
 console.error('[Recovery] Auth failed during recovery');
 setError('Session expired. Please log in again.');
 clearActiveJob();
 setTimeout(() => navigate('/login'), UI_TIMINGS.AUTH_REDIRECT);
 return;
 }
 // Check for job not found (404) - job never existed
 if (errorMessage.includes('404') || errorMessage.includes('not found')) {
 console.error('[Recovery] Job not found on backend - likely never started');
 setError('Generation job not found. The previous session may have failed to start.');
 clearActiveJob();
 setTimeout(() => navigate('/'), UI_TIMINGS.RECOVERY_REDIRECT);
 return;
 }
 // If too many consecutive errors, give up
 if (consecutiveErrors >= maxConsecutiveErrors) {
 console.error('[Recovery] Too many consecutive errors, giving up');
 setError('Unable to connect to generation job. Please try starting a new generation.');
 clearActiveJob();
 setTimeout(() => navigate('/'), UI_TIMINGS.RECOVERY_REDIRECT);
 return;
 }
 // Exponential backoff
 console.warn('[Recovery] Polling error, backing off:', { pollInterval, error: err });
 pollInterval = Math.min(maxPollInterval, pollInterval * 1.5);
 }
 await new Promise(resolve => setTimeout(resolve, pollInterval));
 }
 };
 // Start polling (don't await - let it run in background)
 pollForCompletion().catch(err => {
 console.error('[Recovery] Fatal error during recovery:', err);
 setError('Failed to recover generation. Please try again.');
 clearActiveJob();
 });
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []); // Only run on mount
}
