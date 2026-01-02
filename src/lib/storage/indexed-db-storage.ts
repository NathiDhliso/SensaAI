import type { SavedResult, StorageProvider } from './types';

const DB_NAME = 'sensa-storage';
const DB_VERSION = 1;
const RESULTS_STORE = 'saved-results';

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
}

export const indexedDBStorage = new IndexedDBStorage();
export { IndexedDBStorage };
