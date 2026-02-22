/**
 * Session Progress Storage
 * 
 * Persists learning session progress to localStorage for recovery after
 * browser refresh, tab close, or navigation away.
 * 
 * Automatically expires progress after 24 hours to prevent stale data.
 */
import type { UserProgress } from '@/shared/types/learning';
import { logger } from '@/shared/utils/logger';
const STORAGE_KEY = 'sensa-session-progress';
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const EXPIRY_WARNING_MS = 1 * 60 * 60 * 1000; // Warn 1 hour before expiry
/**
 * Get time remaining before session expires
 * Returns null if session doesn't exist, object with status if it does
 */
export function getTimeUntilExpiry(sessionId: string): {
 expiresInMs: number;
 isWarning: boolean;
 isExpired: boolean;
 formattedTime: string;
} | null {
 try {
 const stored = localStorage.getItem(`${STORAGE_KEY}:${sessionId}`);
 if (!stored) return null;
 const data = JSON.parse(stored);
 const age = Date.now() - data.timestamp;
 const remainingMs = EXPIRY_MS - age;
 if (remainingMs <= 0) {
 return { expiresInMs: 0, isWarning: true, isExpired: true, formattedTime: 'Expired' };
 }
 const hours = Math.floor(remainingMs / (60 * 60 * 1000));
 const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
 const formattedTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
 return {
 expiresInMs: remainingMs,
 isWarning: remainingMs <= EXPIRY_WARNING_MS,
 isExpired: false,
 formattedTime
 };
 } catch {
 return null;
 }
}
export interface SessionProgressData {
 sessionId: string;
 subjectId: string;
 progress: UserProgress;
 currentPhase: string;
 activeConcept: string | null;
 timestamp: number;
 version: string; // For future schema migrations
}
const SAVE_THROTTLE_MS = 2000;
let lastSaveTime = 0;
let pendingSave: ReturnType<typeof setTimeout> | null = null;
function writeSave(data: Omit<SessionProgressData, 'timestamp' | 'version'>): void {
 const progressData: SessionProgressData = {
 ...data,
 timestamp: Date.now(),
 version: '1.0'
 };
 localStorage.setItem(
 `${STORAGE_KEY}:${data.sessionId}`,
 JSON.stringify(progressData)
 );
 lastSaveTime = Date.now();
}
export function saveSessionProgress(data: Omit<SessionProgressData, 'timestamp' | 'version'>): void {
 try {
 const now = Date.now();
 const elapsed = now - lastSaveTime;
 if (elapsed >= SAVE_THROTTLE_MS) {
 if (pendingSave) { clearTimeout(pendingSave); pendingSave = null; }
 writeSave(data);
 } else if (!pendingSave) {
 pendingSave = setTimeout(() => {
 pendingSave = null;
 writeSave(data);
 }, SAVE_THROTTLE_MS - elapsed);
 }
 } catch (error) {
 logger.error('[SessionProgress] Failed to save progress:', error);
 }
}
export function flushSessionProgress(data: Omit<SessionProgressData, 'timestamp' | 'version'>): void {
 if (pendingSave) { clearTimeout(pendingSave); pendingSave = null; }
 try { writeSave(data); } catch (_) { /* non-critical */ }
}
/**
 * Load session progress from localStorage
 * Returns null if not found or expired
 */
export function loadSessionProgress(sessionId: string): SessionProgressData | null {
 try {
 const stored = localStorage.getItem(`${STORAGE_KEY}:${sessionId}`);
 if (!stored) {
 return null;
 }
 const data: SessionProgressData = JSON.parse(stored);
 // Check expiry
 const age = Date.now() - data.timestamp;
 if (age > EXPIRY_MS) {
 logger.debug('[SessionProgress] Progress expired (age:', Math.round(age / 1000 / 60), 'minutes)');
 deleteSessionProgress(sessionId);
 return null;
 }
 return data;
 } catch (error) {
 logger.error('[SessionProgress] Failed to load progress:', error);
 return null;
 }
}
/**
 * Delete session progress from localStorage
 */
export function deleteSessionProgress(sessionId: string): void {
 try {
 localStorage.removeItem(`${STORAGE_KEY}:${sessionId}`);
 } catch (error) {
 logger.error('[SessionProgress] Failed to delete progress:', error);
 }
}
/**
 * List all saved session progress (for debugging/cleanup)
 */
export function listAllSessionProgress(): SessionProgressData[] {
 const sessions: SessionProgressData[] = [];
 try {
 for (let i = 0; i < localStorage.length; i++) {
 const key = localStorage.key(i);
 if (key?.startsWith(STORAGE_KEY)) {
 const stored = localStorage.getItem(key);
 if (stored) {
 try {
 const data: SessionProgressData = JSON.parse(stored);
 sessions.push(data);
 } catch {
 // Skip invalid entries
 }
 }
 }
 }
 } catch (error) {
 logger.error('[SessionProgress] Failed to list sessions:', error);
 }
 return sessions;
}
/**
 * Clean up expired session progress
 */
export function cleanupExpiredProgress(): number {
 let cleaned = 0;
 try {
 const sessions = listAllSessionProgress();
 const now = Date.now();
 for (const session of sessions) {
 const age = now - session.timestamp;
 if (age > EXPIRY_MS) {
 deleteSessionProgress(session.sessionId);
 cleaned++;
 }
 }
 if (cleaned > 0) {
 logger.debug('[SessionProgress] Cleaned up', cleaned, 'expired sessions');
 }
 } catch (error) {
 logger.error('[SessionProgress] Failed to cleanup:', error);
 }
 return cleaned;
}
/**
 * Get human-readable age of saved progress
 */
export function getProgressAge(sessionId: string): string | null {
 const progress = loadSessionProgress(sessionId);
 if (!progress) return null;
 const ageMs = Date.now() - progress.timestamp;
 const ageMinutes = Math.floor(ageMs / 1000 / 60);
 if (ageMinutes < 1) return 'just now';
 if (ageMinutes < 60) return `${ageMinutes} minute${ageMinutes > 1 ? 's' : ''} ago`;
 const ageHours = Math.floor(ageMinutes / 60);
 if (ageHours < 24) return `${ageHours} hour${ageHours > 1 ? 's' : ''} ago`;
 const ageDays = Math.floor(ageHours / 24);
 return `${ageDays} day${ageDays > 1 ? 's' : ''} ago`;
}