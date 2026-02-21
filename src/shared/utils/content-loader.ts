/**
 * Shared Content Loading Utilities
 * 
 * These utilities are used across Results.tsx and SavedResults.tsx
 * to parse generated content and load it into the learning store.
 */
import { parseGeneratedContent, transformGeneratedContent } from '@/features/content-generation/parsers';
import { useLearningStore } from '@/store/learning-store';
import { indexedDBStorage } from '@/features/content-storage/local/indexed-db';
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
 * @returns Result object indicating success or containing error message
 */
export function parseAndLoadContent(rawContent: string, subjectId?: string): ParseAndLoadResult {
    console.log(`\n [ContentLoader] parseAndLoadContent called`);
    console.log(` Subject ID: ${subjectId || 'NONE'}`);
    console.log(` Raw content length: ${rawContent.length} chars`);
    try {
        const parseResult = parseGeneratedContent(rawContent);
        if (!parseResult.success) {
            console.error(` Parse failed: ${parseResult.error}`);
            return {
                success: false,
                error: parseResult.error || 'Failed to parse content'
            };
        }
        console.log(` Parse successful, ${parseResult.data.concepts.length} concepts found`);
        const transformed = transformGeneratedContent(parseResult.data, subjectId);
        // FIX: Validate that we actually have concepts to learn
        if (!transformed.concepts || transformed.concepts.length === 0) {
            console.error(` No concepts after transformation`);
            return {
                success: false,
                error: 'Generation incomplete: No learning concepts were created. Please try again.'
            };
        }
        console.log(` Transformation successful, ${transformed.concepts.length} concepts created`);
        console.log(` First 3 transformed concept names:`);
        transformed.concepts.slice(0, 3).forEach((c, i) => {
            console.log(` ${i + 1}. "${c.name}"`);
        });
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
                subjectType: parseResult.data.domainAnalysis.subjectType,
                // Pass the full classification object (includes deepStructure, lifecycleBlueprints)
                fullClassification: parseResult.data.domainAnalysis.classification,
                macroWorkflow: parseResult.data.domainAnalysis.classification
                    ? {
                        classification: parseResult.data.domainAnalysis.classification,
                        macroStructure: parseResult.data.domainAnalysis.macroStructure!,
                        connectiveTissue: parseResult.data.domainAnalysis.connectiveTissue!
                    }
                    : undefined
            },
            subjectType: parseResult.data.domainAnalysis.subjectType
        });
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
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
                    error: parseResult.error || 'Failed to parse content'
                };
            }
            const transformed = transformGeneratedContent(parseResult.data, subjectId);
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
                    subjectType: parseResult.data.domainAnalysis.subjectType,
                    fullClassification: parseResult.data.domainAnalysis.classification,
                    macroWorkflow: parseResult.data.domainAnalysis.classification
                        ? {
                            classification: parseResult.data.domainAnalysis.classification,
                            macroStructure: parseResult.data.domainAnalysis.macroStructure!,
                            connectiveTissue: parseResult.data.domainAnalysis.connectiveTissue!
                        }
                        : undefined
                },
                subjectType: parseResult.data.domainAnalysis.subjectType
            });
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    };
}
