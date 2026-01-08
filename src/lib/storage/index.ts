export * from './types';
export { CloudStorage, cloudStorage } from './cloud-storage';
export { importFromFile, createFileInput } from './import';
export type { ImportResult } from './import';

import { cloudStorage } from './cloud-storage';
import type { SavedResult } from './types';

/**
 * StorageManager - Cloud Only Implementation
 * 
 * "Silver Bullet" Architecture:
 * - No local state management
 * - No manual synchronization
 * - Direct pass-through to CloudStorage
 * - Relies entirely on Environment Variables (Sensa Creds)
 */
export class StorageManager {

  constructor() {
    // No initialization needed for cloud-only
    // CloudStorage self-initializes from env vars
  }

  isCloudEnabled(): boolean {
    return cloudStorage.isConfigured();
  }

  async saveResult(result: SavedResult): Promise<{ success: boolean; path?: string; error?: string }> {
    // Force flags for consistency
    const cloudResult = {
      ...result,
      savedLocally: false, // Deprecated concept
      savedToCloud: true,
    };

    return await cloudStorage.saveResult(cloudResult);
  }

  async loadResult(id: string): Promise<SavedResult | null> {
    return await cloudStorage.loadResult(id);
  }

  async findLatestBySubject(subject: string): Promise<SavedResult | null> {
    return await cloudStorage.findLatestBySubject(subject);
  }

  async deleteResult(id: string): Promise<boolean> {
    return await cloudStorage.deleteResult(id);
  }

  async listResults(): Promise<SavedResult[]> {
    const results = await cloudStorage.listResults();
    // Sort by date descending by default
    return results.sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  }
}

export const storageManager = new StorageManager();
