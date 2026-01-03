/**
 * Shared Content Loading Utilities
 * 
 * These utilities are used across Results.tsx and SavedResults.tsx
 * to parse generated content and load it into the learning store.
 */

import { parseGeneratedContent, transformGeneratedContent } from '@/lib/content-adapter';
import { useLearningStore } from '@/store/learning-store';

export interface ParseAndLoadResult {
    success: boolean;
    error?: string;
}

/**
 * Parse raw generated content and load it into the learning store.
 * This centralizes the duplicate logic found in Results.tsx and SavedResults.tsx.
 * 
 * @param rawContent - The raw generated document content
 * @param subjectId - Optional subject ID (defaults to generated ID)
 * @returns Result object indicating success or containing error message
 */
export function parseAndLoadContent(rawContent: string, subjectId?: string): ParseAndLoadResult {
    try {
        const parseResult = parseGeneratedContent(rawContent);

        if (!parseResult.success) {
            return {
                success: false,
                error: parseResult.error || 'Failed to parse content',
            };
        }

        const transformed = transformGeneratedContent(parseResult.data, subjectId);
        
        // Add required session fields
        useLearningStore.getState().loadSession({
            subjectId: subjectId || `subject-${Date.now()}`,
            subject: transformed.metadata.domain,
            mode: 'learn',
            stages: transformed.stages,
            concepts: transformed.concepts,
            metadata: transformed.metadata,
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

    return (rawContent: string, subjectId?: string): ParseAndLoadResult => {
        try {
            const parseResult = parseGeneratedContent(rawContent);

            if (!parseResult.success) {
                return {
                    success: false,
                    error: parseResult.error || 'Failed to parse content',
                };
            }

            const transformed = transformGeneratedContent(parseResult.data, subjectId);
            
            // Add required session fields
            loadSession({
                subjectId: subjectId || `subject-${Date.now()}`,
                subject: transformed.metadata.domain,
                mode: 'learn',
                stages: transformed.stages,
                concepts: transformed.concepts,
                metadata: transformed.metadata,
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
