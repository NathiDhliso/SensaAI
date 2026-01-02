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
    this.useCloud = false;
    
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

      console.log(`Migrating ${legacyResults.length} results from localStorage to IndexedDB...`);

      // Migrate each result to IndexedDB
      for (const result of legacyResults) {
        await this.primaryProvider.saveResult(result);
      }

      // Mark migration complete but keep localStorage data as backup
      localStorage.setItem(MIGRATION_FLAG, 'true');
      this.migrationComplete = true;
      console.log('Migration complete!');
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

    if (this.useCloud) {
      await this.cloudProvider.deleteResult(id);
    }

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
            console.log('Recovering results from localStorage backup...');
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

      [...results, ...cloudResults].forEach(result => {
        mergedMap.set(result.id, result);
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
}

export const storageManager = new StorageManager();
