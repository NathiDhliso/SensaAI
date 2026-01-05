/**
 * PL-300 Content Loader
 *
 * Loads and transforms the PL-300 certification content from the generated JSON file
 * into LearningStage[] and LearningConcept[] for use in the application.
 */

import { parseGeneratedContent } from './parser';
import { transformToLearningStages, transformToLearningConcepts } from './transformer';
import type { LearningStage, LearningConcept, MnemonicContext } from '@/lib/types/learning';

// Hardcoded PL-300 content from the JSON file
// This is the fullDocument field from PL_300_1766515561801-c6ara0akv.json
import PL300_JSON from '../../../public/PL_300_1766515561801-c6ara0akv.json';

// Stage definitions with metaphors and celebration messages
const STAGE_DEFINITIONS = [
    {
        order: 1,
        name: 'Data Foundation Builder',
        metaphor: 'Assembly Line',
        metaphorDescription: 'Establishing the connection and transformation pipeline',
        icon: '🏭',
        celebrationTitle: 'Foundation Complete!',
        celebrationMessage: 'You can now connect and transform data sources',
        narrativeBridge: 'Now that you can prepare data, let\'s model it...',
        conceptRange: [1, 8],
    },
    {
        order: 2,
        name: 'Model Architect',
        metaphor: 'Blueprint Designer',
        metaphorDescription: 'Designing the relationships and structure of your data model',
        icon: '📐',
        celebrationTitle: 'Architecture Mastered!',
        celebrationMessage: 'You can design star schemas and create relationships',
        narrativeBridge: 'With a solid model foundation, let\'s add calculations...',
        conceptRange: [9, 19],
    },
    {
        order: 3,
        name: 'Calculation Specialist',
        metaphor: 'Formula Wizard',
        metaphorDescription: 'Mastering DAX for dynamic calculations and security',
        icon: '🧮',
        celebrationTitle: 'DAX Master!',
        celebrationMessage: 'You can create measures, time intelligence, and security rules',
        narrativeBridge: 'Now let\'s bring your data to life with visualizations...',
        conceptRange: [20, 28],
    },
    {
        order: 4,
        name: 'Experience Designer',
        metaphor: 'Visual Storyteller',
        metaphorDescription: 'Creating compelling reports and interactive experiences',
        icon: '🎨',
        celebrationTitle: 'Visualization Expert!',
        celebrationMessage: 'You can create stunning reports and dashboards',
        narrativeBridge: 'Finally, let\'s deploy and govern your solutions...',
        conceptRange: [29, 40],
    },
    {
        order: 5,
        name: 'Enterprise Administrator',
        metaphor: 'Control Tower',
        metaphorDescription: 'Deploying, securing, and governing Power BI at scale',
        icon: '🗼',
        celebrationTitle: 'PL-300 Complete!',
        celebrationMessage: 'You are now a certified Power BI Data Analyst!',
        narrativeBridge: undefined,
        conceptRange: [41, 50],
    },
];

// Tier assignments based on concept importance for Memory Palace markers
// Foundation = Core building blocks (largest markers)
// Keystone = Connectors between concepts (medium markers)
// Utility = Supporting tools (smallest markers)
const TIER_ASSIGNMENTS: Record<string, 'Foundation' | 'Keystone' | 'Utility'> = {
    // Foundation tier - Core building blocks everyone depends on
    'power-bi-service-workspace-management': 'Foundation',
    'power-bi-desktop-environment': 'Foundation',
    'import-vs-directquery-vs-live-connection-storage-modes': 'Foundation',
    'star-schema-design': 'Foundation',
    'dax-measures-and-implicit-measures': 'Foundation',
    'row-level-security-rls': 'Foundation',
    'dashboard-creation-from-reports': 'Foundation',
    'power-bi-apps-for-distribution': 'Foundation',

    // Keystone tier - Important connectors
    'data-source-connectivity': 'Keystone',
    'power-query-editor-m-language': 'Keystone',
    'table-relationships-and-cardinality': 'Keystone',
    'dax-calculated-columns': 'Keystone',
    'dax-filter-context-and-row-context': 'Keystone',
    'dax-time-intelligence-functions': 'Keystone',
    'composite-models-and-hybrid-tables': 'Keystone',
    'data-refresh-configuration': 'Keystone',
    'visual-selection-and-use-cases': 'Keystone',
    'slicers-and-cross-filtering-behavior': 'Keystone',
    'drillthrough-and-drill-down-navigation': 'Keystone',
    'workspace-roles-and-permissions': 'Keystone',
    'gateway-configuration-for-on-premises-data': 'Keystone',
    'incremental-refresh-policy': 'Keystone',
    'query-folding-optimization': 'Keystone',

    // Utility tier - Supporting tools and features (default for others)
};

/**
 * Assigns a mnemonic tier based on concept importance
 */
function assignTier(conceptId: string): 'Foundation' | 'Keystone' | 'Utility' {
    return TIER_ASSIGNMENTS[conceptId] || 'Utility';
}

/**
 * Generates a mnemonic context for a concept
 */
function generateMnemonicContext(concept: LearningConcept): MnemonicContext {
    const tier = assignTier(concept.id);

    // Default anchors based on tier
    const anchors: Record<string, string> = {
        Foundation: '🏛️',
        Keystone: '🔑',
        Utility: '🔧',
    };

    return {
        anchor: `${concept.name} ${anchors[tier]}`,
        story: `${concept.metaphor} - ${concept.hookSentence}`,
        tier,
    };
}

/**
 * Loads and transforms PL-300 content into learning stages and concepts
 */
export function loadPL300Content(): {
    stages: LearningStage[];
    concepts: LearningConcept[];
} {
    // Get the raw content from the JSON file
    const rawContent = PL300_JSON.fullDocument;

    // Parse the content using existing parser
    const parseResult = parseGeneratedContent(rawContent);

    if (!parseResult.success) {
        console.error('Failed to parse PL-300 content:', parseResult.error);
        return { stages: [], concepts: [] };
    }

    // Transform to learning stages and concepts
    const parsedStages = transformToLearningStages(parseResult.data);
    const parsedConcepts = transformToLearningConcepts(parseResult.data, parsedStages);

    // Enhance stages with our custom definitions
    const stages: LearningStage[] = STAGE_DEFINITIONS.map((stageDef) => {
        const [start, end] = stageDef.conceptRange;
        const stageConceptIds = parsedConcepts
            .slice(start - 1, end)
            .map((c) => c.id);

        return {
            id: `stage-${stageDef.order}`,
            title: stageDef.name,
            description: stageDef.metaphorDescription,
            order: stageDef.order,
            name: stageDef.name,
            metaphor: stageDef.metaphor,
            metaphorDescription: stageDef.metaphorDescription,
            icon: stageDef.icon,
            concepts: stageConceptIds,
            celebrationTitle: stageDef.celebrationTitle,
            celebrationMessage: stageDef.celebrationMessage,
            narrativeBridge: stageDef.narrativeBridge,
        };
    });

    // Enhance concepts with stage assignments and mnemonics
    const concepts: LearningConcept[] = parsedConcepts.map((concept, index) => {
        // Find which stage this concept belongs to based on index
        const conceptNumber = index + 1;
        const stage = STAGE_DEFINITIONS.find(
            (s) => conceptNumber >= s.conceptRange[0] && conceptNumber <= s.conceptRange[1]
        );

        const stageId = stage ? `stage-${stage.order}` : 'stage-1';
        const orderInStage = stage
            ? conceptNumber - stage.conceptRange[0] + 1
            : concept.order;

        return {
            ...concept,
            stageId,
            order: orderInStage,
            mnemonic: generateMnemonicContext(concept),
        };
    });

    return { stages, concepts };
}

// Export for direct use
export const { stages: PL300_STAGES, concepts: PL300_CONCEPTS } = loadPL300Content();
