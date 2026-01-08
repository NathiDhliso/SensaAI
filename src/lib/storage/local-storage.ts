import type { SavedResult, StorageProvider } from './types';
import { STORAGE_KEYS } from '@/constants/storage-keys';

export class LocalFileStorage implements StorageProvider {
  private readonly STORAGE_KEY = STORAGE_KEYS.SAVED_RESULTS;

  async saveResult(result: SavedResult): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const existingResults = await this.listResults();
      const updatedResults = [result, ...existingResults.filter(r => r.id !== result.id)];

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedResults));

      // NOTE: Removed auto-download behavior - files are now downloaded only when user explicitly clicks download

      return {
        success: true,
        path: `localStorage://${this.STORAGE_KEY}/${result.id}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save result'
      };
    }
  }

  async loadResult(id: string): Promise<SavedResult | null> {
    try {
      const results = await this.listResults();
      return results.find(r => r.id === id) || null;
    } catch {
      return null;
    }
  }

  async deleteResult(id: string): Promise<boolean> {
    try {
      const results = await this.listResults();
      const filtered = results.filter(r => r.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  }

  async listResults(): Promise<SavedResult[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Download result as JSON file - called explicitly by user
   */
  downloadAsJSON(result: SavedResult): void {
    const dataStr = JSON.stringify(result, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.subject.replace(/[^a-z0-9]/gi, '_')}_${result.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

}

export const localFileStorage = new LocalFileStorage();
