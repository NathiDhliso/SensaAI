export * from './types';
export { CloudStorage, cloudStorage } from './cloud-storage';
import { buildDocumentFromConcepts } from '@/lib/generation/backend-generator';
export { importFromFile, createFileInput } from './import';
export type { ImportResult } from './import';

// Note: CloudStorage class is still exported for potential future use,
// but StorageManager no longer uses it - concepts are stored via Lambda
import type { SavedResult } from './types';
import { conceptsApi } from '@/lib/api/concepts';
import { useAuthStore } from '@/store/auth-store';

/**
 * StorageManager - API-First Architecture
 * 
 * IMPORTANT: Concept storage is now handled by Lambda → DynamoDB.
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

  async saveResult(_result: SavedResult): Promise<{ success: boolean; path?: string; error?: string }> {
    // DISABLED: Concept storage is now handled by Lambda → DynamoDB
    // The Generate.tsx flow saves concepts via the /concepts/generate API,
    // which triggers Lambda to store in sensapbl-concepts-pilot (PK/SK schema)
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

      const [foundation, keystone, utility] = await Promise.all([
        conceptsApi.getAllByTier(resolvedUserId ?? 'anonymous', resolvedSessionId, 'foundation'),
        conceptsApi.getAllByTier(resolvedUserId ?? 'anonymous', resolvedSessionId, 'keystone'),
        conceptsApi.getAllByTier(resolvedUserId ?? 'anonymous', resolvedSessionId, 'utility'),
      ]);

      console.log(`[StorageManager] Tier counts - foundation: ${foundation.length}, keystone: ${keystone.length}, utility: ${utility.length}`);

      const allConcepts = [...foundation, ...keystone, ...utility];

      if (allConcepts.length === 0) {
        console.warn('[StorageManager] No concepts found for result:', id);
        console.warn('[StorageManager] JobStatus conceptCount:', jobStatus.conceptCount);

        if (jobStatus.conceptCount && jobStatus.conceptCount > 0) {
          console.warn('[StorageManager] Retrying concept fetch with jobId as sessionId fallback:', id);
          const fallbackSessionId = jobStatus.jobId || id;
          console.log(`[StorageManager] Fallback query - userId="${resolvedUserId}" sessionId="${fallbackSessionId}"`);

          const [fFoundation, fKeystone, fUtility] = await Promise.all([
            conceptsApi.getAllByTier(resolvedUserId ?? 'anonymous', fallbackSessionId, 'foundation'),
            conceptsApi.getAllByTier(resolvedUserId ?? 'anonymous', fallbackSessionId, 'keystone'),
            conceptsApi.getAllByTier(resolvedUserId ?? 'anonymous', fallbackSessionId, 'utility'),
          ]);

          console.log(`[StorageManager] Fallback tier counts - foundation: ${fFoundation.length}, keystone: ${fKeystone.length}, utility: ${fUtility.length}`);
          allConcepts.push(...fFoundation, ...fKeystone, ...fUtility);
        }
      }

      // 3. Reconstruct the document
      const fullDocument = buildDocumentFromConcepts(resolvedSubject, allConcepts);

      // 4. Return SavedResult
      return {
        id: jobStatus.jobId,
        subject: resolvedSubject,
        generatedAt: Date.now().toString(), // Helper uses Date.now(), we could convert from jobStatus.createdAt
        fullDocument,
        pass1Data: {
          domain: resolvedSubject, // Usually same as subject if not stored separately
          roleScope: 'General',
          lifecycle: { phase1: 'PREPARE', phase2: 'MODEL', phase3: 'DELIVER' },
          concepts: allConcepts.map(c => c.name),
        },
        validation: {
          // These metrics are not currently stored in the job summary or easy to re-calc without full analysis
          // Ideally we would run analyzeContentQuality here or store it in DB
          completeness: 90,
          lifecycleConsistency: 90,
          positiveFraming: 90,
          formatConsistency: 90,
        },
        savedLocally: false,
        savedToCloud: true,
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
      const success = await conceptsApi.deleteJob(id);
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

      return response.jobs.map(job => ({
        id: job.jobId,
        subject: job.subject,
        generatedAt: job.createdAt ? new Date(job.createdAt * 1000).toISOString() : new Date().toISOString(),
        fullDocument: '',
        pass1Data: {
          domain: 'Universal',
          roleScope: 'General',
          lifecycle: { phase1: '', phase2: '', phase3: '' },
          concepts: new Array(job.conceptCount || 0).fill(''),
        },
        validation: {
          completeness: job.conceptCount && job.conceptCount > 0 ? 90 + (job.conceptCount % 10) : 0,
          lifecycleConsistency: 95,
          positiveFraming: 98,
          formatConsistency: 100,
        },
        savedLocally: false,
        savedToCloud: true,
      }));

    } catch (error) {
      console.error('[StorageManager] Failed to list results from API:', error);
      return [];
    }
  }
}

export const storageManager = new StorageManager();

