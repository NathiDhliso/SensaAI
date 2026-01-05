/**
 * Dynamic Content Loader
 *
 * Loads content asynchronously from a JSON file path.
 * This replaces the hardcoded PL-300 loader.
 */

import { parseContent } from './json-content-parser';
import { transformToLearningStages, transformToLearningConcepts } from './transformer';
import type { LearningStage, LearningConcept } from '@/lib/types/learning';

export interface ContentLoadResult {
    stages: LearningStage[];
    concepts: LearningConcept[];
}

// Default generic definitions if metadata is missing from the file
const DEFAULT_STAGE_DEFINITIONS = [
    {
        order: 1,
        name: 'Foundation',
        metaphor: 'Base',
        metaphorDescription: 'Core concepts',
        icon: '🏗️',
    },
    {
        order: 2,
        name: 'Structure',
        metaphor: 'Framework',
        metaphorDescription: 'Building the structure',
        icon: '📐',
    },
    {
        order: 3,
        name: 'Logic',
        metaphor: 'Mechanics',
        metaphorDescription: 'Adding logic and rules',
        icon: '⚙️',
    },
    {
        order: 4,
        name: 'Presentation',
        metaphor: 'Facade',
        metaphorDescription: 'Customer facing layer',
        icon: '🎨',
    },
    {
        order: 5,
        name: 'Optimization',
        metaphor: 'Refinement',
        metaphorDescription: 'Optimizing performance',
        icon: '🚀',
    },
    {
        order: 6,
        name: 'Advanced',
        metaphor: 'Mastery',
        metaphorDescription: 'Advanced scenarios',
        icon: '🏆',
    },
];

/**
 * Loads and transforms content from a generic JSON file URL
 */
export async function loadContent(url: string): Promise<ContentLoadResult> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch content from ${url}: ${response.statusText}`);
        }

        const rawContent = await response.text();

        // Parse content
        const parseResult = parseContent(rawContent);

        if (!parseResult.success) {
            throw new Error(`Failed to parse content: ${parseResult.error}`);
        }

        const parsedContent = parseResult.data;

        // Transform to learning stages and concepts
        const parsedStages = transformToLearningStages(parsedContent);
        const parsedConcepts = transformToLearningConcepts(parsedContent, parsedStages);

        // Enhance stages with more metadata if available, otherwise use defaults
        // Note: Ideally the parsed content would have rich stage metadata.
        // For now, we overlay defaults if the parsed stages are just basic skeletons.
        const stages: LearningStage[] = parsedStages.map((stage) => {
            const defaultDef = DEFAULT_STAGE_DEFINITIONS.find(d => d.order === stage.order) || DEFAULT_STAGE_DEFINITIONS[DEFAULT_STAGE_DEFINITIONS.length - 1];

            // Map concepts that belong to this stage
            const stageConcepts = parsedConcepts.filter(c => c.stageId === stage.id).map(c => c.id);

            return {
                ...stage,
                metaphor: stage.metaphor || defaultDef.metaphor,
                metaphorDescription: stage.metaphorDescription || defaultDef.metaphorDescription,
                icon: stage.icon || defaultDef.icon,
                concepts: stageConcepts,
            };
        });

        // Ensure concepts have proper stage linkage
        const concepts = parsedConcepts;

        return { stages, concepts };

    } catch (error) {
        console.error('Content loading error:', error);
        throw error;
    }
}
