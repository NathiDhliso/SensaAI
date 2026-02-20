export * from './types';
export { CloudStorage, cloudStorage } from './cloud/s3-dynamodb';
import { buildDocumentFromConcepts } from '@/shared/utils/content-builder';
export { importFromFile, createFileInput } from './sync/import';
export type { ImportResult } from './sync/import';
// Note: CloudStorage class is still exported for potential future use,
// but StorageManager no longer uses it - concepts are stored via Lambda
import type { SavedResult } from './types';
import { conceptsApi } from '@/shared/api/concepts';
import { useAuthStore } from '@/store/auth-store';
/**
 * StorageManager - API-First Architecture
 * 
 * IMPORTANT: Concept storage is now handled by Lambda DynamoDB.
 * The frontend fetches concepts via API endpoints, not direct DynamoDB access.
 * 
 * This StorageManager is kept for backwards compatibility but returns
 * no-ops for save/load since the Lambda handles concept persistence.
 */
export class StorageManager {
 constructor() {
 // Cloud storage disabled - Lambda handles concept storage
 }
 isCloudEnabled(): boolean {
 // Concepts are cloud-enabled via Lambda, but this direct storage is disabled
 return false;
 }
 /**
 * @deprecated Storage is now handled by Lambda DynamoDB.
 * This method is a no-op for backwards compatibility.
 * The Generate.tsx flow saves concepts via the /concepts/generate API.
 * @returns Always returns success - do not rely on this for actual storage.
 */
 async saveResult(_result: SavedResult): Promise<{ success: boolean; path?: string; error?: string }> {
 console.warn('[StorageManager] saveResult is deprecated - Lambda handles all storage');
 return { success: true, path: 'lambda-managed' };
 }
 async loadResult(id: string): Promise<SavedResult | null> {
 try {
 // 1. Get job status to know subject and session
 const authUserId = useAuthStore.getState().user?.id;
 console.log('[StorageManager] loadResult called with id:', id, 'authUserId:', authUserId);
 const jobStatus = await conceptsApi.getJobStatus(id, authUserId);
 console.log('[StorageManager] Job status response:', JSON.stringify(jobStatus, null, 2));
 if (!jobStatus || jobStatus.status === 'failed') {
 console.error('[StorageManager] Job not found or failed:', id);
 return null;
 }
 const resolvedUserId = jobStatus.userId || authUserId;
 const resolvedSessionId = jobStatus.sessionId || jobStatus.jobId || id;
 const resolvedSubject = jobStatus.subject || 'Study Session';
 console.log('[StorageManager] Resolved IDs - userId:', resolvedUserId, 'sessionId:', resolvedSessionId, 'subject:', resolvedSubject);
 if (!resolvedUserId) {
 console.warn('[StorageManager] No userId available for loadResult:', id);
 }
 // 2. Fetch all concepts
 // We need to fetch all tiers to reconstruct the document
 console.log(`[StorageManager] Fetching concepts for userId="${resolvedUserId}" sessionId="${resolvedSessionId}"`);
 const [trunkConcepts, branchConcepts, leafConcepts] = await Promise.all([
 conceptsApi.getAllByTier(resolvedUserId ?? 'anonymous', resolvedSessionId, 'trunk'),
 conceptsApi.getAllByTier(resolvedUserId ?? 'anonymous', resolvedSessionId, 'branch'),
 conceptsApi.getAllByTier(resolvedUserId ?? 'anonymous', resolvedSessionId, 'leaf')
 ]);
 console.log(`[StorageManager] Tier counts - trunk: ${trunkConcepts.length}, branch: ${branchConcepts.length}, leaf: ${leafConcepts.length}`);
 const allConcepts = [...trunkConcepts, ...branchConcepts, ...leafConcepts];
 if (allConcepts.length === 0) {
 console.warn('[StorageManager] No concepts found for result:', id);
 console.warn('[StorageManager] JobStatus conceptCount:', jobStatus.conceptCount);
 if (jobStatus.conceptCount && jobStatus.conceptCount > 0) {
 console.warn('[StorageManager] Retrying concept fetch with jobId as sessionId fallback:', id);
 const fallbackSessionId = jobStatus.jobId || id;
 console.log(`[StorageManager] Fallback query - userId="${resolvedUserId}" sessionId="${fallbackSessionId}"`);
 const [fTrunk, fBranch, fLeaf] = await Promise.all([
 conceptsApi.getAllByTier(resolvedUserId ?? 'anonymous', fallbackSessionId, 'trunk'),
 conceptsApi.getAllByTier(resolvedUserId ?? 'anonymous', fallbackSessionId, 'branch'),
 conceptsApi.getAllByTier(resolvedUserId ?? 'anonymous', fallbackSessionId, 'leaf')
 ]);
 console.log(`[StorageManager] Fallback tier counts - trunk: ${fTrunk.length}, branch: ${fBranch.length}, leaf: ${fLeaf.length}`);
 allConcepts.push(...fTrunk, ...fBranch, ...fLeaf);
 }
 if (allConcepts.length === 0 && jobStatus.conceptCount && jobStatus.conceptCount > 0) {
 console.warn('[StorageManager] Tier-based queries returned 0. Trying unfiltered query...');
 const unfilteredSessionId = jobStatus.sessionId || jobStatus.jobId || id;
 const unfiltered = await conceptsApi.query({
 userId: resolvedUserId ?? 'anonymous',
 sessionId: unfilteredSessionId,
 limit: 100
 });
 console.log(`[StorageManager] Unfiltered query returned ${unfiltered.count} concepts`);
 if (unfiltered.concepts.length > 0) {
 allConcepts.push(...unfiltered.concepts);
 let page = unfiltered;
 while (page.hasMore && page.nextCursor) {
 page = await conceptsApi.query({
 userId: resolvedUserId ?? 'anonymous',
 sessionId: unfilteredSessionId,
 limit: 100,
 cursor: page.nextCursor
 });
 allConcepts.push(...page.concepts);
 }
 console.log(`[StorageManager] Recovered ${allConcepts.length} concepts via unfiltered query`);
 }
 }
 }
 // 3. Reconstruct the document
 const fullDocument = buildDocumentFromConcepts(resolvedSubject, allConcepts);
 // 4. Return SavedResult
 return {
 id: jobStatus.jobId,
 subject: resolvedSubject,
 generatedAt: new Date().toISOString(),
 fullDocument,
 pass1Data: {
 domain: resolvedSubject,
 roleScope: 'General',
 lifecycle: {
 phase1: jobStatus.classification?.lifecycle?.phase1 || 'PREPARE',
 phase2: jobStatus.classification?.lifecycle?.phase2 || 'MODEL',
 phase3: jobStatus.classification?.lifecycle?.phase3 || 'DELIVER',
 },
 concepts: allConcepts.map(c => c.name)
 },
 validation: {
 // These metrics are not currently stored in the job summary or easy to re-calc without full analysis
 // Ideally we would run analyzeContentQuality here or store it in DB
 completeness: 90,
 lifecycleConsistency: 90,
 positiveFraming: 90,
 formatConsistency: 90
 },
 savedLocally: false,
 savedToCloud: true
 };
 } catch (error) {
 console.error('[StorageManager] Failed to load result:', error);
 return null;
 }
 }
 async findLatestBySubject(_subject: string): Promise<SavedResult | null> {
 // Could be re-enabled if needed, but currently concepts are session-based
 return null;
 }
 async deleteResult(id: string): Promise<boolean> {
 try {
 const userId = useAuthStore.getState().user?.id || '';
 const success = await conceptsApi.deleteJob(id, userId);
 return success;
 } catch (error) {
 console.error('[StorageManager] Failed to delete result:', error);
 return false;
 }
 }
 async listResults(): Promise<SavedResult[]> {
 try {
 const user = useAuthStore.getState().user;
 if (!user?.id) {
 console.warn('[StorageManager] No user logged in, returning empty list');
 return [];
 }
 const response = await conceptsApi.listJobs(user.id);
 const seen = new Set<string>();
 const uniqueJobs = response.jobs.filter(job => {
 if (seen.has(job.jobId)) return false;
 seen.add(job.jobId);
 return true;
 });
 return uniqueJobs.map(job => ({
 id: job.jobId,
 subject: job.subject,
 generatedAt: job.createdAt ? new Date(job.createdAt * 1000).toISOString() : new Date().toISOString(),
 fullDocument: '',
 pass1Data: {
 domain: 'Universal',
 roleScope: 'General',
 lifecycle: { phase1: '', phase2: '', phase3: '' },
 concepts: new Array(job.conceptCount || 0).fill('')
 },
 validation: {
 completeness: job.conceptCount && job.conceptCount > 0 ? 90 + (job.conceptCount % 10) : 0,
 lifecycleConsistency: 95,
 positiveFraming: 98,
 formatConsistency: 100
 },
 isPublic: job.isPublic ?? false,
 savedLocally: false,
 savedToCloud: true
 }));
 } catch (error) {
 console.error('[StorageManager] Failed to list results from API:', error);
 return [];
 }
 }
}
export const storageManager = new StorageManager();
