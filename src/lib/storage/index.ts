export * from './types';
export { LocalFileStorage, localFileStorage } from './local-storage';
export { CloudStorage, cloudStorage } from './cloud-storage';
export { IndexedDBStorage, indexedDBStorage } from './indexed-db-storage';
export { importFromFile, createFileInput } from './import';
export type { ImportResult } from './import';

import { localFileStorage } from './local-storage';
import { cloudStorage } from './cloud-storage';
import { indexedDBStorage } from './indexed-db-storage';
import type { SavedResult, StorageProvider } from './types';

const LEGACY_STORAGE_KEY = 'sensa-saved-results';
const MIGRATION_FLAG = 'sensa-indexeddb-migrated';

export class StorageManager {
  private primaryProvider: StorageProvider;
  private cloudProvider: StorageProvider;
  private useCloud: boolean;
  private migrationComplete: boolean = false;

  constructor() {
    // Use IndexedDB as primary, localStorage as fallback via direct access
    if (indexedDBStorage.isSupported()) {
      this.primaryProvider = indexedDBStorage;
    } else {
      this.primaryProvider = localFileStorage;
    }
    this.cloudProvider = cloudStorage;
    // Auto-enable cloud if configured (keys present)
    this.useCloud = cloudStorage.isConfigured();

    // Run migration on construction
    this.migrateFromLocalStorage();
  }

  private async migrateFromLocalStorage(): Promise<void> {
    // Check if migration already done
    if (localStorage.getItem(MIGRATION_FLAG) === 'true') {
      this.migrationComplete = true;
      return;
    }

    try {
      // Check for existing localStorage data
      const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(MIGRATION_FLAG, 'true');
        this.migrationComplete = true;
        return;
      }

      const legacyResults: SavedResult[] = JSON.parse(stored);
      if (!Array.isArray(legacyResults) || legacyResults.length === 0) {
        localStorage.setItem(MIGRATION_FLAG, 'true');
        this.migrationComplete = true;
        return;
      }



      // Migrate each result to IndexedDB
      for (const result of legacyResults) {
        await this.primaryProvider.saveResult(result);
      }

      // Mark migration complete but keep localStorage data as backup
      localStorage.setItem(MIGRATION_FLAG, 'true');
      this.migrationComplete = true;

    } catch (error) {
      console.error('Migration failed:', error);
      // Don't set migration flag so it tries again next time
    }
  }

  setCloudEnabled(enabled: boolean): void {
    this.useCloud = enabled && cloudStorage.isConfigured();
  }

  async saveResult(result: SavedResult): Promise<{ success: boolean; path?: string; error?: string }> {
    // Ensure result has savedLocally flag
    const resultWithFlags = {
      ...result,
      savedLocally: true,
    };

    // Save to primary storage (IndexedDB)
    const primaryResult = await this.primaryProvider.saveResult(resultWithFlags);

    // Also save to localStorage as backup (without auto-download)
    try {
      const existing = localStorage.getItem(LEGACY_STORAGE_KEY);
      const existingResults: SavedResult[] = existing ? JSON.parse(existing) : [];
      const updatedResults = [resultWithFlags, ...existingResults.filter(r => r.id !== result.id)];
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(updatedResults));
    } catch (error) {
      console.warn('Failed to save backup to localStorage:', error);
    }

    if (this.useCloud) {
      const cloudResult = await this.cloudProvider.saveResult({
        ...resultWithFlags,
        savedToCloud: true,
      });

      if (cloudResult.success) {
        resultWithFlags.cloudUrl = cloudResult.path;
        await this.primaryProvider.saveResult(resultWithFlags);
      }
    }

    return primaryResult;
  }

  async loadResult(id: string): Promise<SavedResult | null> {
    // Try primary storage first
    let result = await this.primaryProvider.loadResult(id);

    // Try fallback localStorage if not found
    if (!result) {
      try {
        const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (stored) {
          const results: SavedResult[] = JSON.parse(stored);
          result = results.find(r => r.id === id) || null;

          // If found in fallback, save to primary
          if (result) {
            await this.primaryProvider.saveResult(result);
          }
        }
      } catch {
        // Ignore localStorage errors
      }
    }

    // Try cloud if still not found
    if (!result && this.useCloud) {
      result = await this.cloudProvider.loadResult(id);
      if (result) {
        await this.primaryProvider.saveResult(result);
      }
    }

    return result;
  }

  async findLatestBySubject(subject: string): Promise<SavedResult | null> {
    if (this.useCloud && this.cloudProvider.findLatestBySubject) {
      return await this.cloudProvider.findLatestBySubject(subject);
    }

    // Check local storage fallback
    const results = await this.listResults();
    const match = results
      .filter(r => r.subject === subject)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];

    return match || null;
  }

  async deleteResult(id: string): Promise<boolean> {
    // Delete from primary storage
    const primaryDeleted = await this.primaryProvider.deleteResult(id);

    // Also delete from localStorage backup
    try {
      const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored) {
        const results: SavedResult[] = JSON.parse(stored);
        const filtered = results.filter(r => r.id !== id);
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch {
      // Ignore localStorage errors
    }

    // Cloud deletion is restricted to admin/manual operations only
    // User local deletion should NOT remove from cloud
    // if (this.useCloud) {
    //   await this.cloudProvider.deleteResult(id);
    // }

    return primaryDeleted;
  }

  async listResults(): Promise<SavedResult[]> {
    // Get from primary storage
    let results = await this.primaryProvider.listResults();

    // If empty, try to recover from localStorage
    if (results.length === 0) {
      try {
        const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (stored) {
          const localResults: SavedResult[] = JSON.parse(stored);
          if (localResults.length > 0) {

            // Restore to primary storage
            for (const result of localResults) {
              await this.primaryProvider.saveResult(result);
            }
            results = localResults;
          }
        }
      } catch {
        // Ignore localStorage errors
      }
    }

    if (this.useCloud) {
      const cloudResults = await this.cloudProvider.listResults();
      const mergedMap = new Map<string, SavedResult>();

      // 1. Add all local results first
      results.forEach(result => {
        mergedMap.set(result.id, { ...result, savedLocally: true });
      });

      // 2. Merge cloud results
      cloudResults.forEach(cloudResult => {
        const existing = mergedMap.get(cloudResult.id);
        if (existing) {
          // If it exists locally, keep local version but ensure savedToCloud is true
          // (Local version is usually more up-to-date for things like last viewed, etc.)
          mergedMap.set(cloudResult.id, { ...existing, savedToCloud: true });
        } else {
          // If it's only in cloud, it is NOT saved locally
          // We must explicitly set savedLocally to false because the cloud object 
          // might have a stale "savedLocally: true" from when it was originally uploaded
          mergedMap.set(cloudResult.id, { ...cloudResult, savedLocally: false, savedToCloud: true });
        }
      });

      return Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
      );
    }

    return results;
  }

  isCloudEnabled(): boolean {
    return this.useCloud;
  }

  isMigrationComplete(): boolean {
    return this.migrationComplete;
  }
  async syncToCloud(id: string): Promise<boolean> {
    if (!this.useCloud) return false;

    const result = await this.primaryProvider.loadResult(id);
    if (!result) return false;

    try {
      const cloudResult = await this.cloudProvider.saveResult({
        ...result,
        savedToCloud: true,
      });

      if (cloudResult.success) {
        const updatedResult = {
          ...result,
          savedToCloud: true,
          cloudUrl: cloudResult.path
        };
        await this.primaryProvider.saveResult(updatedResult);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Manual sync failed:', error);
      return false;
    }
  }

  async syncAllPendingItems(): Promise<number> {
    if (!this.useCloud) return 0;

    const results = await this.primaryProvider.listResults();
    const pending = results.filter(r => !r.savedToCloud);

    if (pending.length === 0) return 0;

    let syncedCount = 0;


    for (const result of pending) {
      try {
        const success = await this.syncToCloud(result.id);
        if (success) syncedCount++;
      } catch (err) {
        console.error(`Failed to auto-sync result ${result.id}`, err);
      }
    }

    return syncedCount;
  }

  async removeFromCloud(id: string): Promise<boolean> {
    if (!this.useCloud) return false;

    try {
      // 1. Delete from cloud provider
      const success = await this.cloudProvider.deleteResult(id);

      if (success) {
        // 2. Update local record to reflect un-sync
        const result = await this.primaryProvider.loadResult(id);
        if (result) {
          const updatedResult = {
            ...result,
            savedToCloud: false,
            cloudUrl: undefined
          };
          await this.primaryProvider.saveResult(updatedResult);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Remove from cloud failed:', error);
      return false;
    }
  }
}

export const storageManager = new StorageManager();
