/**
 * Shared Content Loading Utilities
 * 
 * These utilities are used across Results.tsx and SavedResults.tsx
 * to parse generated content and load it into the learning store.
 */

import { parseGeneratedContent, transformGeneratedContent } from '@/lib/content-adapter';
import { useLearningStore } from '@/store/learning-store';
import { indexedDBStorage } from '@/lib/storage/indexed-db-storage';

export interface ParseAndLoadResult {
    success: boolean;
    error?: string;
}

/**
 * Parse raw generated content and load it into the learning store.
 * This centralizes the duplicate logic found in Results.tsx and SavedResults.tsx.
 * 
 * Also caches parsed concepts to IndexedDB for lazy loading to prevent memory issues.
 * 
 * @param rawContent - The raw generated document content
 * @param subjectId - Optional subject ID (defaults to generated ID)
 * @param fallbackConcepts - Optional concept names for recovery
 * @returns Result object indicating success or containing error message
 */
export function parseAndLoadContent(rawContent: string, subjectId?: string, fallbackConcepts: string[] = []): ParseAndLoadResult {
    try {
        const parseResult = parseGeneratedContent(rawContent);

        if (!parseResult.success) {
            return {
                success: false,
                error: parseResult.error || 'Failed to parse content',
            };
        }

        const transformed = transformGeneratedContent(parseResult.data, subjectId, fallbackConcepts);
        const effectiveSubjectId = subjectId || `subject-${Date.now()}`;

        // CRITICAL: Cache parsed concepts to IndexedDB for lazy loading
        // This prevents memory crashes by allowing tier-by-tier loading
        if (indexedDBStorage.isSupported()) {
            indexedDBStorage.saveConcepts(effectiveSubjectId, parseResult.data.concepts)
                .catch(() => { /* Silent cache failure */ });
        }

        useLearningStore.getState().loadSession({
            subjectId: effectiveSubjectId,
            subject: transformed.metadata.domain,
            mode: 'learn',
            stages: transformed.stages,
            concepts: transformed.concepts,
            metadata: {
                ...transformed.metadata,
                fullDocument: rawContent,
            },
        });

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}


/**
 * Hook version for components that need reactive access
 * Returns a function that can be called with content
 */
export function useParseAndLoadContent() {
    const loadSession = useLearningStore((state) => state.loadSession);

    return (rawContent: string, subjectId?: string, fallbackConcepts: string[] = []): ParseAndLoadResult => {
        try {
            const parseResult = parseGeneratedContent(rawContent);

            if (!parseResult.success) {
                return {
                    success: false,
                    error: parseResult.error || 'Failed to parse content',
                };
            }

            const transformed = transformGeneratedContent(parseResult.data, subjectId, fallbackConcepts);
            const effectiveSubjectId = subjectId || `subject-${Date.now()}`;

            // CRITICAL: Cache parsed concepts to IndexedDB for lazy loading
            if (indexedDBStorage.isSupported()) {
                indexedDBStorage.saveConcepts(effectiveSubjectId, parseResult.data.concepts)
                    .catch(() => { /* Silent cache failure */ });
            }

            // Add required session fields, including raw document for reference tab
            loadSession({
                subjectId: effectiveSubjectId,
                subject: transformed.metadata.domain,
                mode: 'learn',
                stages: transformed.stages,
                concepts: transformed.concepts,
                metadata: {
                    ...transformed.metadata,
                    fullDocument: rawContent,
                },
            });

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    };
}

