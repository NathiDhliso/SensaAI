
import type { LearningConcept } from '@/lib/types/learning';
import { resolvePrerequisites } from '@/lib/learning/prerequisite-utils';

/**
 * Hook to check if a concept's prerequisites are met.
 */
export function usePrerequisiteCheck(
    concept: LearningConcept | null,
    allConcepts: LearningConcept[],
    completedConcepts: string[]
): {
    isReady: boolean;
    missingCount: number;
    missingNames: string[];
} {
    if (!concept || !concept.prerequisites || concept.prerequisites.length === 0) {
        return { isReady: true, missingCount: 0, missingNames: [] };
    }

    const resolved = resolvePrerequisites(
        concept.prerequisites,
        allConcepts,
        completedConcepts
    );

    const missing = resolved.filter(p => !p.completed);

    return {
        isReady: missing.length === 0,
        missingCount: missing.length,
        missingNames: missing.map(p => p.name),
    };
}
