/**
 * Cloud Sync Utilities
 * 
 * Shared helpers for syncing localStorage data to DynamoDB.
 * Provides the current authenticated userId lookup and
 * a fire-and-forget wrapper for non-critical cloud writes.
 */

/**
 * Get the current authenticated user's ID from Zustand's persisted auth state.
 * Reads directly from localStorage to avoid circular imports with React stores.
 * Returns null if unauthenticated.
 */
export function getCurrentUserId(): string | null {
    try {
        const stored = localStorage.getItem('sensaai-auth');
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        return parsed?.state?.user?.id ?? null;
    } catch {
        return null;
    }
}

/**
 * Fire-and-forget: runs an async fn without blocking the caller.
 * Swallows errors and logs them to console.
 */
export function fireAndForget(fn: () => Promise<unknown>, label: string): void {
    fn().catch(err => {
        console.warn(`[CloudSync:${label}] Fire-and-forget failed:`, err);
    });
}
