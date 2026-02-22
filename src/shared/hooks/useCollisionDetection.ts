/**
 * useCollisionDetection Hook
 * 
 * Manages duplicate subject detection and overwrite confirmation flow.
 * Uses fuzzy matching (Levenshtein distance) to detect similar subjects.
 * 
 * @module hooks/useCollisionDetection
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { conceptsApi } from '@/shared/api/concepts';
import { useAuthStore } from '@/store/auth-store';
import { logger } from '@/shared/utils/logger';
interface CollisionDetectionState {
 isCheckingCollision: boolean;
 collisionJobId: string | null;
 showOverwriteModal: boolean;
}
interface CollisionDetectionActions {
 checkForDuplicates: (subject: string) => Promise<boolean>;
 handleOverwrite: () => Promise<void>;
 handleCancelOverwrite: () => void;
 resetCollisionState: () => void;
}
interface UseCollisionDetectionOptions {
 onNoDuplicate: () => void;
 onExistingFound?: (resultId: string) => void;
}
/**
 * Hook for managing subject collision detection and resolution
 * 
 * @param options Configuration options
 * @param options.onNoDuplicate Callback when no duplicate is found
 * @param options.onExistingFound Optional callback when existing result is found locally
 * @returns State and actions for collision detection
 */
export function useCollisionDetection(
 options: UseCollisionDetectionOptions
): CollisionDetectionState & CollisionDetectionActions {
 const navigate = useNavigate();
 const [isCheckingCollision, setIsCheckingCollision] = useState(true);
 const [collisionJobId, setCollisionJobId] = useState<string | null>(null);
 const [showOverwriteModal, setShowOverwriteModal] = useState(false);
 const [pendingSubject, setPendingSubject] = useState<string | null>(null);
 const optionsRef = useRef(options);
 const navigateRef = useRef(navigate);
 useEffect(() => {
 optionsRef.current = options;
 navigateRef.current = navigate;
 });
 /**
 * Race a promise against a timeout. Rejects if the timeout fires first.
 */
 const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
 return Promise.race([
 promise,
 new Promise<never>((_resolve, reject) =>
 setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
 )
 ]);
 };

 /**
 * Check for duplicate subjects using fuzzy matching
 * Returns true if a duplicate was found (and modal is shown)
 * Times out after 10s to prevent the page from hanging indefinitely
 */
 const checkForDuplicates = useCallback(
 async (subject: string): Promise<boolean> => {
 const user = useAuthStore.getState().user;
 setPendingSubject(subject);
 if (!user) {
 setIsCheckingCollision(false);
 optionsRef.current.onNoDuplicate();
 return false;
 }
 try {
 const result = await withTimeout(
 conceptsApi.listJobs(user.id),
 10_000,
 'Duplicate check'
 );
 // Import fuzzy matching utilities
 const { normalizeSubject, levenshtein } = await import(
 '@/shared/utils/alias-generator'
 );
 const normalizedInput = normalizeSubject(subject);
 const duplicate = result.jobs.find((j) => {
 if (j.status !== 'completed') return false;
 const normalizedJob = normalizeSubject(j.subject);
 // Exact match after normalization?
 if (normalizedJob === normalizedInput) return true;
 // Fuzzy match (distance <= 2)?
 const dist = levenshtein(normalizedJob, normalizedInput);
 return dist <= 2;
 });
 if (duplicate) {
 setCollisionJobId(duplicate.jobId);
 setShowOverwriteModal(true);
 setIsCheckingCollision(false);
 return true;
 }
 // No duplicate found - check for local existing content (also with timeout)
 await withTimeout(
 checkForLocalExisting(subject),
 5_000,
 'Local storage check'
 );
 return false;
 } catch (err) {
 logger.error('Failed to check duplicates:', err);
 setIsCheckingCollision(false);
 optionsRef.current.onNoDuplicate();
 return false;
 }
 },
 []
 );
 /**
 * Check for locally stored existing content
 */
 const checkForLocalExisting = useCallback(
 async (subject: string) => {
 try {
 const { storageManager } = await import('@/features/content-storage');
 const existing = await storageManager.findLatestBySubject(subject);
 if (existing) {
 const shouldLoad = window.confirm(
 `Shared Intelligence Found! \n\n` +
 `We found an existing version of "${subject}" generated on ${new Date(
 existing.generatedAt
 ).toLocaleDateString()}.\n\n` +
 `Would you like to load this shared knowledge instead of generating from scratch?`
 );
 if (shouldLoad) {
 if (optionsRef.current.onExistingFound) {
 optionsRef.current.onExistingFound(existing.id);
 } else {
 navigateRef.current(`/study/${existing.id}`);
 }
 return;
 }
 }
 setIsCheckingCollision(false);
 optionsRef.current.onNoDuplicate();
 } catch (e) {
 logger.warn('Failed to check shared intelligence:', e);
 setIsCheckingCollision(false);
 optionsRef.current.onNoDuplicate();
 }
 },
 []
 );
 /**
 * Handle user confirming overwrite of existing content
 */
 const handleOverwrite = useCallback(async () => {
 if (collisionJobId) {
 try {
 const userId = useAuthStore.getState().user?.id || '';
 await conceptsApi.deleteJob(collisionJobId, userId);
 } catch (_e) {
 logger.warn('Failed to delete old job, continuing anyway');
 }
 }
 setShowOverwriteModal(false);
 setCollisionJobId(null);
 if (pendingSubject) {
 optionsRef.current.onNoDuplicate();
 }
 }, [collisionJobId, pendingSubject]);
 /**
 * Handle user canceling overwrite - navigate back
 */
 const handleCancelOverwrite = useCallback(() => {
 setShowOverwriteModal(false);
 setCollisionJobId(null);
 setPendingSubject(null);
 navigateRef.current('/');
 }, []);
 /**
 * Reset all collision state
 */
 const resetCollisionState = useCallback(() => {
 setIsCheckingCollision(true);
 setCollisionJobId(null);
 setShowOverwriteModal(false);
 setPendingSubject(null);
 }, []);
 return {
 // State
 isCheckingCollision,
 collisionJobId,
 showOverwriteModal,
 // Actions
 checkForDuplicates,
 handleOverwrite,
 handleCancelOverwrite,
 resetCollisionState
 };
}
