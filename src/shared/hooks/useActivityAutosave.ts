/**
 * useActivityAutosave Hook
 * 
 * Reusable autosave for any learning activity's in-progress state.
 * Uses throttled localStorage writes (matching session-tracker pattern)
 * to avoid storage thrashing while ensuring no user work is lost on
 * refresh, navigation, or accidental tab close.
 * 
 * Features:
 * - Throttled saves (configurable, default 2s)
 * - Immediate flush on unmount / beforeunload
 * - 24h expiry with auto-cleanup
 * - Typed draft data via generic parameter
 * 
 * Usage:
 *   const { saveDraft, loadDraft, clearDraft, flushDraft } = useActivityAutosave<ConceptMapData>({
 *     storageKey: 'concept-map',
 *     sessionId: currentSession.id,
 *   });
 */
import { useCallback, useEffect, useRef } from 'react';

const STORAGE_PREFIX = 'sensa-activity-draft';
const DEFAULT_THROTTLE_MS = 2000;
const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface DraftEnvelope<T> {
  data: T;
  timestamp: number;
  version: string;
}

interface UseActivityAutosaveOptions {
  /** Unique key for this activity type (e.g. 'concept-map', 'blank-sheet') */
  storageKey: string;
  /** Session ID to namespace drafts per session */
  sessionId: string;
  /** Throttle interval in ms (default: 2000) */
  throttleMs?: number;
  /** Expiry time in ms (default: 24h) */
  expiryMs?: number;
}

interface UseActivityAutosaveReturn<T> {
  /** Throttled save — safe to call on every state change */
  saveDraft: (data: T) => void;
  /** Immediate save — use on unmount / beforeunload */
  flushDraft: (data: T) => void;
  /** Load previously saved draft (returns null if missing/expired) */
  loadDraft: () => T | null;
  /** Clear the saved draft (call on successful completion) */
  clearDraft: () => void;
}

export function useActivityAutosave<T>(
  options: UseActivityAutosaveOptions
): UseActivityAutosaveReturn<T> {
  const {
    storageKey,
    sessionId,
    throttleMs = DEFAULT_THROTTLE_MS,
    expiryMs = DEFAULT_EXPIRY_MS
  } = options;

  const fullKey = `${STORAGE_PREFIX}:${storageKey}:${sessionId}`;
  const lastSaveTimeRef = useRef(0);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref to the latest data so beforeunload can flush it
  const latestDataRef = useRef<T | null>(null);

  // =========================================================================
  // Core write
  // =========================================================================
  const writeDraft = useCallback(
    (data: T) => {
      try {
        const envelope: DraftEnvelope<T> = {
          data,
          timestamp: Date.now(),
          version: '1.0'
        };
        localStorage.setItem(fullKey, JSON.stringify(envelope));
        lastSaveTimeRef.current = Date.now();
      } catch (err) {
        console.warn('[ActivityAutosave] Failed to save draft:', err);
      }
    },
    [fullKey]
  );

  // =========================================================================
  // Throttled save (safe to call every render / state change)
  // =========================================================================
  const saveDraft = useCallback(
    (data: T) => {
      latestDataRef.current = data;
      const now = Date.now();
      const elapsed = now - lastSaveTimeRef.current;

      if (elapsed >= throttleMs) {
        if (pendingTimerRef.current) {
          clearTimeout(pendingTimerRef.current);
          pendingTimerRef.current = null;
        }
        writeDraft(data);
      } else if (!pendingTimerRef.current) {
        pendingTimerRef.current = setTimeout(() => {
          pendingTimerRef.current = null;
          if (latestDataRef.current !== null) {
            writeDraft(latestDataRef.current);
          }
        }, throttleMs - elapsed);
      }
    },
    [throttleMs, writeDraft]
  );

  // =========================================================================
  // Immediate flush (unmount / beforeunload)
  // =========================================================================
  const flushDraft = useCallback(
    (data: T) => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      try {
        writeDraft(data);
      } catch {
        /* non-critical */
      }
    },
    [writeDraft]
  );

  // =========================================================================
  // Load draft
  // =========================================================================
  const loadDraft = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(fullKey);
      if (!raw) return null;

      const envelope: DraftEnvelope<T> = JSON.parse(raw);
      const age = Date.now() - envelope.timestamp;

      if (age > expiryMs) {
        localStorage.removeItem(fullKey);
        return null;
      }

      return envelope.data;
    } catch {
      return null;
    }
  }, [fullKey, expiryMs]);

  // =========================================================================
  // Clear draft (call after successful onComplete)
  // =========================================================================
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(fullKey);
    } catch {
      /* non-critical */
    }
  }, [fullKey]);

  // =========================================================================
  // beforeunload flush + cleanup on unmount
  // =========================================================================
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (latestDataRef.current !== null) {
        // Use synchronous write for beforeunload
        try {
          const envelope: DraftEnvelope<T> = {
            data: latestDataRef.current,
            timestamp: Date.now(),
            version: '1.0'
          };
          localStorage.setItem(fullKey, JSON.stringify(envelope));
        } catch {
          /* non-critical */
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Flush any pending save on unmount
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      if (latestDataRef.current !== null) {
        try {
          const envelope: DraftEnvelope<T> = {
            data: latestDataRef.current,
            timestamp: Date.now(),
            version: '1.0'
          };
          localStorage.setItem(fullKey, JSON.stringify(envelope));
        } catch {
          /* non-critical */
        }
      }
    };
  }, [fullKey]);

  return { saveDraft, flushDraft, loadDraft, clearDraft };
}

/**
 * Cleanup all expired activity drafts.
 * Call this on app init alongside the stale session guard.
 */
export function cleanupExpiredActivityDrafts(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;

      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const envelope = JSON.parse(raw);
        const age = Date.now() - envelope.timestamp;
        if (age > DEFAULT_EXPIRY_MS) {
          keysToRemove.push(key);
        }
      } catch {
        keysToRemove.push(key!);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    if (keysToRemove.length > 0) {
      console.log(`[ActivityAutosave] Cleaned up ${keysToRemove.length} expired draft(s)`);
    }
  } catch {
    /* non-critical */
  }
}
