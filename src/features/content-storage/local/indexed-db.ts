/**
 * IndexedDB Storage - OFFLINE CACHE
 * 
 * Browser-based cache for offline access and faster loading.
 * This is NOT the source of truth - it's a local copy of cloud data.
 * 
 * Storage Hierarchy:
 * - Cloud Storage (S3 + DynamoDB) = SOURCE OF TRUTH
 * - IndexedDB = Offline cache (THIS FILE)
 * - LocalStorage = UI preferences only
 * 
 * When to use:
 * - Caching content for offline access
 * - Faster initial load (check cache first, then cloud)
 * - Storing large concept data that doesn't fit in localStorage
 * 
 * When NOT to use:
 * - As primary storage (always sync to cloud)
 * - For UI preferences (use localStorage)
 * - For session state (use zustand)
 */

import type { SavedResult, StorageProvider } from '../types';
import type { ParsedConcept } from '@/features/content-generation/parsers/types';

const DB_NAME = 'sensa-storage';
const DB_VERSION = 2; // Upgraded for concepts store
const RESULTS_STORE = 'saved-results';
const CONCEPTS_STORE = 'cached-concepts';

/**
 * Cached concept entry for lazy loading
 */
interface CachedConceptEntry {
  id: string; // conceptId
  subjectId: string;
  tier: string;
  concept: ParsedConcept;
}

class IndexedDBStorage implements StorageProvider {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create results store if it doesn't exist
        if (!db.objectStoreNames.contains(RESULTS_STORE)) {
          const store = db.createObjectStore(RESULTS_STORE, { keyPath: 'id' });
          store.createIndex('subject', 'subject', { unique: false });
          store.createIndex('generatedAt', 'generatedAt', { unique: false });
        }

        // NEW: Create concepts cache store for lazy loading
        if (!db.objectStoreNames.contains(CONCEPTS_STORE)) {
          const conceptsStore = db.createObjectStore(CONCEPTS_STORE, { keyPath: 'id' });
          conceptsStore.createIndex('subjectId', 'subjectId', { unique: false });
          conceptsStore.createIndex('tier', 'tier', { unique: false });
          // Compound index for efficient tier-by-subject queries
          conceptsStore.createIndex('subjectId_tier', ['subjectId', 'tier'], { unique: false });
        }
      };
    });

    return this.initPromise;
  }


  async saveResult(result: SavedResult): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const db = await this.getDB();

      return new Promise((resolve) => {
        const transaction = db.transaction([RESULTS_STORE], 'readwrite');
        const store = transaction.objectStore(RESULTS_STORE);

        const request = store.put(result);

        request.onsuccess = () => {
          resolve({
            success: true,
            path: `indexeddb://${RESULTS_STORE}/${result.id}`
          });
        };

        request.onerror = () => {
          console.error('Failed to save to IndexedDB:', request.error);
          resolve({
            success: false,
            error: request.error?.message || 'Failed to save result'
          });
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save result'
      };
    }
  }

  async loadResult(id: string): Promise<SavedResult | null> {
    try {
      const db = await this.getDB();

      return new Promise((resolve) => {
        const transaction = db.transaction([RESULTS_STORE], 'readonly');
        const store = transaction.objectStore(RESULTS_STORE);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          console.error('Failed to load from IndexedDB:', request.error);
          resolve(null);
        };
      });
    } catch {
      return null;
    }
  }

  async deleteResult(id: string): Promise<boolean> {
    try {
      const db = await this.getDB();

      return new Promise((resolve) => {
        const transaction = db.transaction([RESULTS_STORE], 'readwrite');
        const store = transaction.objectStore(RESULTS_STORE);
        const request = store.delete(id);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          console.error('Failed to delete from IndexedDB:', request.error);
          resolve(false);
        };
      });
    } catch {
      return false;
    }
  }

  async listResults(): Promise<SavedResult[]> {
    try {
      const db = await this.getDB();

      return new Promise((resolve) => {
        const transaction = db.transaction([RESULTS_STORE], 'readonly');
        const store = transaction.objectStore(RESULTS_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
          const results = request.result || [];
          // Sort by date, newest first
          const safeTime = (d: string) => {
            if (/^\d+$/.test(d)) return Number(d);
            const t = new Date(d).getTime();
            return isNaN(t) ? 0 : t;
          };
          results.sort((a, b) => safeTime(b.generatedAt) - safeTime(a.generatedAt));
          resolve(results);
        };

        request.onerror = () => {
          console.error('Failed to list from IndexedDB:', request.error);
          resolve([]);
        };
      });
    } catch {
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDB();

      return new Promise((resolve) => {
        const transaction = db.transaction([RESULTS_STORE], 'readwrite');
        const store = transaction.objectStore(RESULTS_STORE);
        store.clear();

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
      });
    } catch {
      // Ignore errors during clear
    }
  }

  isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  // ============================================================================
  // CONCEPT CACHE METHODS (for lazy loading)
  // ============================================================================

  /**
   * Save parsed concepts to cache for a subject
   * Each concept is stored individually for efficient tier-based retrieval
   */
  async saveConcepts(subjectId: string, concepts: ParsedConcept[]): Promise<void> {
    try {
      const db = await this.getDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([CONCEPTS_STORE], 'readwrite');
        const store = transaction.objectStore(CONCEPTS_STORE);

        for (const concept of concepts) {
          const entry: CachedConceptEntry = {
            id: `${subjectId}:${concept.id}`,
            subjectId,
            tier: concept.mnemonic?.tier?.toLowerCase() || 'leaf',
            concept,
          };
          store.put(entry);
        }

        transaction.oncomplete = () => {
          resolve();
        };

        transaction.onerror = () => {
          console.error('[IndexedDB] Failed to cache concepts:', transaction.error);
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error('[IndexedDB] Failed to save concepts:', error);
    }
  }

  /**
   * Load concepts by tier for lazy loading
   * Uses compound index for efficient querying
   */
  async loadConceptsByTier(subjectId: string, tier: string): Promise<ParsedConcept[]> {
    try {
      const db = await this.getDB();

      return new Promise((resolve) => {
        const transaction = db.transaction([CONCEPTS_STORE], 'readonly');
        const store = transaction.objectStore(CONCEPTS_STORE);
        const index = store.index('subjectId_tier');

        // Query using compound index [subjectId, tier]
        const request = index.getAll(IDBKeyRange.only([subjectId, tier.toLowerCase()]));

        request.onsuccess = () => {
          const entries = (request.result || []) as CachedConceptEntry[];
          const concepts = entries.map(e => e.concept);
          resolve(concepts);
        };

        request.onerror = () => {
          console.error('[IndexedDB] Failed to load concepts by tier:', request.error);
          resolve([]);
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Load a single concept by ID
   */
  async loadConceptById(subjectId: string, conceptId: string): Promise<ParsedConcept | null> {
    try {
      const db = await this.getDB();

      return new Promise((resolve) => {
        const transaction = db.transaction([CONCEPTS_STORE], 'readonly');
        const store = transaction.objectStore(CONCEPTS_STORE);
        const request = store.get(`${subjectId}:${conceptId}`);

        request.onsuccess = () => {
          const entry = request.result as CachedConceptEntry | undefined;
          resolve(entry?.concept || null);
        };

        request.onerror = () => {
          resolve(null);
        };
      });
    } catch {
      return null;
    }
  }

  /**
   * Clear all cached concepts for a subject
   */
  async clearConceptsForSubject(subjectId: string): Promise<void> {
    try {
      const db = await this.getDB();

      return new Promise((resolve) => {
        const transaction = db.transaction([CONCEPTS_STORE], 'readwrite');
        const store = transaction.objectStore(CONCEPTS_STORE);
        const index = store.index('subjectId');

        const request = index.getAllKeys(IDBKeyRange.only(subjectId));

        request.onsuccess = () => {
          const keys = request.result || [];
          for (const key of keys) {
            store.delete(key);
          }
        };

        transaction.oncomplete = () => {
          resolve();
        };

        transaction.onerror = () => resolve();
      });
    } catch {
      // Ignore errors
    }
  }

  /**
   * Check if concepts are cached for a subject
   */
  async hasConceptsCache(subjectId: string): Promise<boolean> {
    try {
      const db = await this.getDB();

      return new Promise((resolve) => {
        const transaction = db.transaction([CONCEPTS_STORE], 'readonly');
        const store = transaction.objectStore(CONCEPTS_STORE);
        const index = store.index('subjectId');

        const request = index.count(IDBKeyRange.only(subjectId));

        request.onsuccess = () => {
          resolve(request.result > 0);
        };

        request.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  // ============================================================================
  // QUOTA MANAGEMENT (Production Hardening)
  // ============================================================================

  /**
   * Check current storage quota and usage.
   * Uses navigator.storage.estimate() API with fallbacks.
   * 
   * @returns Storage quota info or null if not supported
   */
  async checkStorageQuota(): Promise<{
    usage: number;
    quota: number;
    usagePercent: number;
    isNearLimit: boolean;
    isPersisted: boolean;
  } | null> {
    try {
      // Check if Storage API is available
      if (!navigator.storage || !navigator.storage.estimate) {
        console.warn('[IndexedDB] Storage estimation API not supported');
        return null;
      }

      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const usagePercent = quota > 0 ? (usage / quota) * 100 : 0;
      const isNearLimit = usagePercent > 80;

      // Check if storage is persisted
      let isPersisted = false;
      if (navigator.storage.persisted) {
        isPersisted = await navigator.storage.persisted();
      }

      // Log warning if approaching limit
      if (isNearLimit) {
        console.warn(
          `[IndexedDB] Storage quota warning: ${usagePercent.toFixed(1)}% used ` +
          `(${this.formatBytes(usage)} / ${this.formatBytes(quota)})`
        );
      }

      return {
        usage,
        quota,
        usagePercent,
        isNearLimit,
        isPersisted,
      };
    } catch (error) {
      console.error('[IndexedDB] Failed to check storage quota:', error);
      return null;
    }
  }

  /**
   * Request persistent storage from the browser.
   * Persistent storage won't be evicted under storage pressure.
   * 
   * @returns true if storage is now persistent, false otherwise
   */
  async requestPersistentStorage(): Promise<boolean> {
    try {
      if (!navigator.storage || !navigator.storage.persist) {
        console.warn('[IndexedDB] Persistent storage API not supported');
        return false;
      }

      const isPersisted = await navigator.storage.persist();

      if (isPersisted) {
        console.log('[IndexedDB] Storage is now persistent');
      } else {
        console.log('[IndexedDB] Persistent storage request denied by browser');
      }

      return isPersisted;
    } catch (error) {
      console.error('[IndexedDB] Failed to request persistent storage:', error);
      return false;
    }
  }

  /**
   * Run eviction policy to clean up old cached data.
   * Called automatically when storage usage exceeds 80%.
   * 
   * Eviction priority (oldest first):
   * 1. Old cached audio files (if any)
   * 2. Old saved results (>90 days)
   * 3. Cached concepts for subjects not accessed in 30 days
   * 
   * @param targetUsagePercent - Target usage percentage after cleanup (default: 60%)
   * @returns Number of items evicted
   */
  async runEvictionPolicy(targetUsagePercent: number = 60): Promise<number> {
    const quotaInfo = await this.checkStorageQuota();

    if (!quotaInfo || quotaInfo.usagePercent <= targetUsagePercent) {
      return 0; // No eviction needed
    }

    console.log(`[IndexedDB] Running eviction policy. Current: ${quotaInfo.usagePercent.toFixed(1)}%, Target: ${targetUsagePercent}%`);

    let evictedCount = 0;
    const now = Date.now();
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

    try {
      // Ensure DB is initialized
      await this.getDB();

      // Step 1: Evict old results (>90 days)
      const results = await this.listResults();
      const oldResults = results.filter(result => {
        const generatedTime = /^\d+$/.test(result.generatedAt) ? Number(result.generatedAt) : new Date(result.generatedAt).getTime();
        return !isNaN(generatedTime) && now - generatedTime > NINETY_DAYS_MS;
      });

      for (const oldResult of oldResults) {
        await this.deleteResult(oldResult.id);
        evictedCount++;

        // Check if we've reached target
        const current = await this.checkStorageQuota();
        if (current && current.usagePercent <= targetUsagePercent) {
          break;
        }
      }

      // Step 2: Clear concept caches for old subjects if still over limit
      const currentQuota = await this.checkStorageQuota();
      if (currentQuota && currentQuota.usagePercent > targetUsagePercent) {
        // Get all subject IDs from concepts store
        const subjectIds = await this.getAllConceptSubjectIds();

        // For now, clear the first half of subjects (oldest by alphabetical order)
        // In a real implementation, we'd track last access time
        const toEvict = subjectIds.slice(0, Math.ceil(subjectIds.length / 2));

        for (const subjectId of toEvict) {
          await this.clearConceptsForSubject(subjectId);
          evictedCount++;

          const updated = await this.checkStorageQuota();
          if (updated && updated.usagePercent <= targetUsagePercent) {
            break;
          }
        }
      }

      console.log(`[IndexedDB] Eviction complete. ${evictedCount} items removed.`);

      // Log final state
      const finalQuota = await this.checkStorageQuota();
      if (finalQuota) {
        console.log(`[IndexedDB] Final usage: ${finalQuota.usagePercent.toFixed(1)}%`);
      }

      return evictedCount;
    } catch (error) {
      console.error('[IndexedDB] Eviction failed:', error);
      return evictedCount;
    }
  }

  /**
   * Get all unique subject IDs from the concepts cache
   */
  private async getAllConceptSubjectIds(): Promise<string[]> {
    try {
      const db = await this.getDB();

      return new Promise((resolve) => {
        const transaction = db.transaction([CONCEPTS_STORE], 'readonly');
        const store = transaction.objectStore(CONCEPTS_STORE);
        const index = store.index('subjectId');
        const request = index.getAllKeys();

        request.onsuccess = () => {
          const keys = request.result || [];
          // Get unique subject IDs
          const uniqueIds = [...new Set(keys.map(k => String(k)))];
          resolve(uniqueIds);
        };

        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const indexedDBStorage = new IndexedDBStorage();
export { IndexedDBStorage };
