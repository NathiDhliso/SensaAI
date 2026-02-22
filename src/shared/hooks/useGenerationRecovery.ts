/**
 * useGenerationRecovery Hook
 * 
 * Recovers from page refreshes / browser closes during generation.
 * 
 * Recovery strategy (two-layer):
 *   1. Check localStorage for an active job saved by the generation flow.
 *   2. If nothing in localStorage, ask the backend for any in_progress job
 *      belonging to the authenticated user (covers cache-cleared scenarios).
 * 
 * The backend is authoritative — it auto-marks stale jobs (>20 min) as failed,
 * so the frontend never polls indefinitely.
 * 
 * @module hooks/useGenerationRecovery
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/shared/utils/logger';
import { useGenerationStore } from '@/store/generation-store';
import { conceptsApi } from '@/shared/api';
import { getErrorMessage, isAuthError } from '@/shared/api/client';
import { parseAndLoadContent } from '@/shared/utils/content-loader';
import type { PassStatus, GenerationResult } from '@/shared/types/generation';

/**
 * Hook to recover from page refresh / browser close during active generation
 */
export function useGenerationRecovery() {
 const navigate = useNavigate();
 const hasRecoveredRef = useRef(false);
 const isDevEnvironment = import.meta.env.DEV || import.meta.env.MODE === 'development';
 const maxRecoveryPollDurationMs = (isDevEnvironment ? 45 : 15) * 60 * 1000;

 useEffect(() => {
 // Expose global function to manually clear stuck jobs (for debugging)
 if (typeof window !== 'undefined') {
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 (window as any).clearStuckJob = () => {
 const { clearActiveJob } = useGenerationStore.getState();
 clearActiveJob();
 logger.debug('[Recovery] Manually cleared stuck job');
 window.location.href = '/';
 };
 }

 // Only run once on mount
 if (hasRecoveredRef.current) return;
 hasRecoveredRef.current = true;

 const recover = async () => {
 const {
 hasActiveJob,
 getActiveJob,
 setActiveJob,
 clearActiveJob,
 updateGenerationProgress,
 completeGeneration,
 setError
 } = useGenerationStore.getState();

 // --- Layer 1: Check localStorage for a persisted active job ---
 let activeJob = hasActiveJob() ? getActiveJob() : null;

 // --- Layer 2: If nothing local, ask the backend ---
 if (!activeJob) {
 try {
 const { activeJob: serverJob } = await conceptsApi.getActiveJob();
 if (serverJob && serverJob.status === 'in_progress') {
 logger.debug('[Recovery] No local job, but backend has active job:', serverJob);
 activeJob = {
  jobId: serverJob.jobId,
  sessionId: serverJob.sessionId,
  userId: '', // will be filled by auth context
  subject: serverJob.subject,
  startedAt: (serverJob.createdAt || 0) * 1000,
  status: 'processing',
 };
 // Persist it so subsequent refreshes don't need server round-trip
 setActiveJob(activeJob);
 } else if (serverJob && serverJob.status === 'failed') {
 logger.warn('[Recovery] Backend reports job failed:', serverJob.error);
 setError(serverJob.error || 'Generation failed on the server.');
 clearActiveJob();
 return;
 }
 } catch {
 // Backend unreachable — can't recover without local state
 logger.debug('[Recovery] Backend unreachable, no local job — nothing to recover');
 }
 }

 if (!activeJob) return;

 // --- Verify the job is still alive on the backend before polling ---
 try {
 const verified = await conceptsApi.getJobStatus(activeJob.jobId, activeJob.userId || undefined);
 if (verified.status === 'completed') {
 logger.debug('[Recovery] Job already completed on backend, loading results');
 await _loadCompletedJob(activeJob, verified, updateGenerationProgress, completeGeneration, clearActiveJob, navigate);
 return;
 }
 if (verified.status === 'failed') {
 logger.warn('[Recovery] Job already failed on backend:', verified.error);
 setError(verified.error || 'Generation failed');
 clearActiveJob();
 return;
 }
 } catch (err) {
 // 404 = job doesn't exist
 const msg = getErrorMessage(err, '');
 if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
 logger.warn('[Recovery] Job not found on backend — clearing local state');
 setError('Generation job not found. It may have expired.');
 clearActiveJob();
 return;
 }
 // Other error — proceed to poll anyway, backend may be temporarily down
 logger.warn('[Recovery] Could not verify job, proceeding to poll:', err);
 }

 logger.debug('[Recovery] Resuming polling for job:', activeJob.jobId);

 // Show recovery UI
 updateGenerationProgress({
 pass: 2,
 status: 'in-progress',
 activity: 'Reconnecting to generation in progress...',
 progress: 10
 });

 // --- Poll until completion ---
 await _pollUntilDone(
 activeJob,
 maxRecoveryPollDurationMs,
 updateGenerationProgress,
 completeGeneration,
 setError,
 clearActiveJob,
 navigate,
 );
 };

 recover().catch(err => {
 logger.error('[Recovery] Fatal error:', err);
 const { setError, clearActiveJob } = useGenerationStore.getState();
 setError('Failed to recover generation. Please try again.');
 clearActiveJob();
 });
 }, []); // Only run on mount
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Poll the backend for job completion / failure. */
async function _pollUntilDone(
 activeJob: { jobId: string; sessionId: string; userId: string; subject: string; context?: string | null; startedAt: number; status: string },
 maxDurationMs: number,
 updateGenerationProgress: (u: { pass?: number; status?: PassStatus; activity?: string; progress?: number }) => void,
 completeGeneration: (r: GenerationResult) => void,
 setError: (e: string | null) => void,
 clearActiveJob: () => void,
 navigate: (path: string, opts?: { replace?: boolean }) => void,
) {
 let pollInterval = 2000;
 const maxPollInterval = 10000;
 const startTime = Date.now();
 let consecutiveErrors = 0;
 const maxConsecutiveErrors = 10; // generous — network blips shouldn't kill recovery

 while (true) {
 if (Date.now() - startTime > maxDurationMs) {
 logger.error('[Recovery] Polling timeout exceeded');
 setError('Generation is still running on the server but took too long. It will complete in the background — check back shortly.');
 clearActiveJob();
 return;
 }

 try {
 const status = await conceptsApi.getJobStatus(activeJob.jobId, activeJob.userId || undefined);
 consecutiveErrors = 0;

 if (status.status === 'completed') {
 await _loadCompletedJob(activeJob, status, updateGenerationProgress, completeGeneration, clearActiveJob, navigate);
 return;
 }

 if (status.status === 'failed') {
 logger.error('[Recovery] Job failed:', status.error);
 setError(status.error || 'Generation failed');
 clearActiveJob();
 return;
 }

 // Still in_progress
 const elapsed = Date.now() - startTime;
 updateGenerationProgress({
 pass: 2,
 status: 'in-progress',
 activity: status.conceptCount
  ? `AI generation in progress — ${status.conceptCount} concepts so far...`
  : 'AI generation in progress...',
 progress: Math.min(55, 10 + Math.floor(elapsed / 6000))
 });

 pollInterval = 2000; // reset on success
 } catch (err) {
 consecutiveErrors++;
 const errorMessage = getErrorMessage(err, 'Recovery polling failed');

 if (isAuthError(err)) {
 setError('Session expired. Please log in again.');
 clearActiveJob();
 setTimeout(() => navigate('/login'), 1000);
 return;
 }

 if (errorMessage.includes('404') || errorMessage.toLowerCase().includes('not found')) {
 setError('Generation job not found. The previous session may have failed to start.');
 clearActiveJob();
 setTimeout(() => navigate('/'), 2000);
 return;
 }

 if (consecutiveErrors >= maxConsecutiveErrors) {
 setError('Lost connection to the generation server. The job is still running — please refresh the page to reconnect.');
 clearActiveJob();
 return;
 }

 // Exponential backoff
 pollInterval = Math.min(maxPollInterval, pollInterval * 1.5);
 logger.warn('[Recovery] Polling error, backing off:', { pollInterval, consecutiveErrors });
 }

 await new Promise(resolve => setTimeout(resolve, pollInterval));
 }
}

/** Fetch completed concepts and navigate to study view. */
async function _loadCompletedJob(
 activeJob: { jobId: string; sessionId: string; userId: string; subject: string },
 _status: { conceptCount?: number },
 updateGenerationProgress: (u: { pass?: number; status?: PassStatus; activity?: string; progress?: number }) => void,
 completeGeneration: (r: GenerationResult) => void,
 clearActiveJob: () => void,
 navigate: (path: string, opts?: { replace?: boolean }) => void,
) {
 updateGenerationProgress({
 pass: 3,
 status: 'in-progress',
 activity: 'Loading generated concepts...',
 progress: 60
 });

 const [trunkConcepts, branchConcepts, leafConcepts] = await Promise.all([
 conceptsApi.getAllByTier(activeJob.userId, activeJob.sessionId, 'trunk'),
 conceptsApi.getAllByTier(activeJob.userId, activeJob.sessionId, 'branch'),
 conceptsApi.getAllByTier(activeJob.userId, activeJob.sessionId, 'leaf')
 ]);

 const allConcepts = [
 ...(trunkConcepts || []),
 ...(branchConcepts || []),
 ...(leafConcepts || [])
 ];
 allConcepts.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

 const fullDocument = allConcepts
 .map(c => `# ${c.name}\n\n${(c as unknown as Record<string, unknown>).explanation || ''}\n\n`)
 .join('\n');

 // Recovery builds a minimal result — cast to satisfy the store action
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 completeGeneration({
 fullDocument,
 sessionId: activeJob.sessionId,
 conceptCount: allConcepts.length
 } as any);
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

 const { storageManager } = await import('@/features/content-storage');
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 await storageManager.saveResult(savedResult as any);
 parseAndLoadContent(fullDocument, resultId);

 setTimeout(() => navigate(`/study/${resultId}`, { replace: true }), 500);
}
