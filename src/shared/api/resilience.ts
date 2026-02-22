/**
 * API Resilience Utilities
 * 
 * Provides retry logic, exponential backoff, and offline detection
 * for robust API interactions.
 */
import { logger } from '@/shared/utils/logger';
interface RetryConfig {
 maxRetries?: number;
 initialDelayMs?: number;
 maxDelayMs?: number;
 backoffMultiplier?: number;
}
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
 maxRetries: 3,
 initialDelayMs: 1000,
 maxDelayMs: 10000,
 backoffMultiplier: 2
};
/**
 * Sleep utility for delays
 */
const sleep = (ms: number): Promise<void> =>
 new Promise(resolve => setTimeout(resolve, ms));
/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attempt: number, config: Required<RetryConfig>): number {
 const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
 return Math.min(delay, config.maxDelayMs);
}
/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
 fn: () => Promise<T>,
 config: RetryConfig = {}
): Promise<T> {
 const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
 let lastError: Error | null = null;
 for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
 try {
 return await fn();
 } catch (error) {
 lastError = error as Error;
 // Don't retry on final attempt
 if (attempt === fullConfig.maxRetries) {
 break;
 }
 // Check if error is retryable (4xx errors should not be retried)
 if (error instanceof Response && error.status >= 400 && error.status < 500) {
 throw error;
 }
 const delay = calculateBackoff(attempt, fullConfig);
 logger.warn(`[APIResilience] Retry attempt ${attempt + 1}/${fullConfig.maxRetries} after ${delay}ms`, error);
 await sleep(delay);
 }
 }
 throw lastError || new Error('Retry failed');
}
/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
 return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
/**
 * Wait for online status
 */
export function waitForOnline(timeoutMs: number = 30000): Promise<void> {
 return new Promise((resolve, reject) => {
 if (isOnline()) {
 resolve();
 return;
 }
 const timeout = setTimeout(() => {
 window.removeEventListener('online', onlineHandler);
 reject(new Error('Timeout waiting for online status'));
 }, timeoutMs);
 const onlineHandler = () => {
 clearTimeout(timeout);
 window.removeEventListener('online', onlineHandler);
 resolve();
 };
 window.addEventListener('online', onlineHandler);
 });
}
/**
 * Offline Queue Manager (Simplified)
 * Stores failed requests and retries them when online
 */
class OfflineQueueManager {
 private queue: Array<{ id: string; fn: () => Promise<void>; timestamp: number }> = [];
 private readonly MAX_QUEUE_SIZE = 50;
 private isProcessing = false;
 constructor() {
 // Listen for online events
 if (typeof window !== 'undefined') {
 window.addEventListener('online', () => this.processQueue());
 }
 }
 /**
 * Add a request to the offline queue
 */
 enqueue(id: string, fn: () => Promise<void>): void {
 // Remove oldest if queue is full
 if (this.queue.length >= this.MAX_QUEUE_SIZE) {
 this.queue.shift();
 logger.warn('[OfflineQueue] Queue full, removing oldest item');
 }
 this.queue.push({
 id,
 fn,
 timestamp: Date.now()
 });
 }
 /**
 * Process all queued requests
 */
 async processQueue(): Promise<void> {
 if (this.isProcessing || this.queue.length === 0 || !isOnline()) {
 return;
 }
 this.isProcessing = true;
 while (this.queue.length > 0 && isOnline()) {
 const item = this.queue.shift();
 if (!item) continue;
 try {
 await item.fn();
 } catch (error) {
 logger.error(`[OfflineQueue] Failed to process ${item.id}`, error);
 // Re-queue if still offline
 if (!isOnline()) {
 this.queue.unshift(item);
 break;
 }
 }
 }
 this.isProcessing = false;
 }
 /**
 * Get queue size
 */
 getQueueSize(): number {
 return this.queue.length;
 }
 /**
 * Clear the queue
 */
 clear(): void {
 this.queue = [];
 }
}
// Export singleton instance
export const offlineQueue = new OfflineQueueManager();
/**
 * Optimistic Update Helper
 * Immediately updates local state, then syncs with server
 */
export async function optimisticUpdate<T>(
 localUpdate: () => void,
 serverUpdate: () => Promise<T>,
 onError?: (error: Error) => void
): Promise<T | null> {
 // Apply local update immediately
 localUpdate();
 try {
 // Sync with server
 const result = await serverUpdate();
 return result;
 } catch (error) {
 // Handle error (optionally revert local update)
 if (onError) {
 onError(error as Error);
 }
 throw error;
 }
}
