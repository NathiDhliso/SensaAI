import type { LearningConcept } from '@/shared/types/learning';

export interface PrerequisiteConcept {
    id: string;
    name: string;
    completed: boolean;
}

/**
 * Resolves prerequisite names/IDs to actual concept data.
 */
export function resolvePrerequisites(
    prerequisites: string[],
    allConcepts: LearningConcept[],
    completedConcepts: string[]
): PrerequisiteConcept[] {
    return prerequisites.map(prereq => {
        // Try to find by name first (prerequisites are stored as names)
        const concept = allConcepts.find(c =>
            c.name.toLowerCase() === prereq.toLowerCase() ||
            c.id === prereq
        );

        return {
            id: concept?.id || prereq,
            name: concept?.name || prereq,
            completed: concept
                ? completedConcepts.includes(concept.id)
                : false,
        };
    });
}
