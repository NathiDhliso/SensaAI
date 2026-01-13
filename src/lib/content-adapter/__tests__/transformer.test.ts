import { describe, it, expect } from 'vitest';
import { transformToLearningConcepts } from '../transformer';
import type { ParsedGeneratedContent } from '../types';
import type { LearningStage } from '@/lib/types/learning';

describe('transformer', () => {
    const mockStages: LearningStage[] = [
        {
            id: 'stage-1-foundation',
            title: 'Foundation',
            description: 'Establish the core concepts.',
            icon: 'shape:seed',
            celebrationTitle: 'Complete!',
            celebrationMessage: 'Done',
            concepts: ['concept-1']
        }
    ];

    const mockParsedContent: ParsedGeneratedContent = {
        domainAnalysis: {
            domain: 'Testing',
            professionalRole: 'Tester',
            lifecycle: { phase1: 'P1', phase2: 'P2', phase3: 'P3' },
            sourceVerification: 'Verified',
            recentUpdates: [],
            numericalLimits: [],
            coreConceptsCount: 1,
            conceptNames: ['Concept 1']
        },
        concepts: [
            {
                id: 'concept-1',
                name: 'Concept 1',
                order: 1,
                tier: 'foundation',
                cognitiveLevel: 'understand',
                commonPitfalls: ['Pitfall 1', 'Pitfall 2'],
                stageId: 'PREPARE',
                phase1: {
                    hookSentence: 'Hook',
                    microMetaphor: 'Metaphor',
                    prerequisite: 'None',
                    selection: [],
                    execution: 'Exec'
                },
                phase2: ['Step 1'],
                phase3: {
                    tool: 'Tool',
                    metrics: [],
                    thresholds: 'None'
                },
                criticalDistinctions: [],
                designBoundaries: [],
                examFocus: []
            }
        ],
        learningPath: {
            stages: [
                {
                    order: 1,
                    name: 'Foundation',
                    concepts: ['Concept 1'],
                    conceptsWithDifficulty: [{ name: 'Concept 1', difficulty: 'foundational' }],
                    capabilitiesGained: 'Tested'
                }
            ]
        },
        mentalAnchors: [],
        confusionPairs: [],
        rawContent: ''
    };

    it('should transform cognitiveLevel and commonPitfalls correctly', () => {
        const concepts = transformToLearningConcepts(mockParsedContent, mockStages);

        expect(concepts).toHaveLength(1);
        expect(concepts[0].cognitiveLevel).toBe('understand');
        expect(concepts[0].commonPitfalls).toEqual(['Pitfall 1', 'Pitfall 2']);
    });

    it('should handle missing cognitiveLevel and commonPitfalls gracefully', () => {
        const simpleContent: ParsedGeneratedContent = {
            ...mockParsedContent,
            concepts: [
                {
                    ...mockParsedContent.concepts[0],
                    cognitiveLevel: undefined,
                    commonPitfalls: undefined
                }
            ]
        };

        const concepts = transformToLearningConcepts(simpleContent, mockStages);

        expect(concepts).toHaveLength(1);
        expect(concepts[0].cognitiveLevel).toBeUndefined();
        expect(concepts[0].commonPitfalls).toBeUndefined();
    });
});
