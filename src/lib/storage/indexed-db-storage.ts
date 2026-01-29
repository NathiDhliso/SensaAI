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

import type { SavedResult, StorageProvider } from './types';
import type { ParsedConcept } from '../content-adapter/types';

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
          results.sort((a, b) =>
            new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
          );
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
            tier: concept.mnemonic?.tier?.toLowerCase() || 'utility',
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
}

export const indexedDBStorage = new IndexedDBStorage();
export { IndexedDBStorage };
