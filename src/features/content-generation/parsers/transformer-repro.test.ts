
import { expect, test, describe } from 'vitest';
import { transformToLearningConcepts } from './transformer';
import type { ParsedGeneratedContent } from './types';

describe('Trunk Tier Logic', () => {
    const mockStage = {
        id: 'stage-1',
        title: 'Stage 1',
        description: '',
        order: 1,
        name: 'Stage 1',
        concepts: [],
        icon: '',
        metaphor: '',
        metaphorDescription: '',
        celebrationTitle: '',
        celebrationMessage: ''
    };

    const baseConcept = {
        phase1: { prerequisite: 'None', selection: [], execution: '', hookSentence: '', microMetaphor: '' },
        phase2: [],
        phase3: { tool: '', metrics: [], thresholds: '' },
        criticalDistinctions: [],
        designBoundaries: [],
        stageId: 'stage-1',
        whyYouNeed: '',
        cognitiveLevel: 'remember',
        commonPitfalls: [],
        technicalDetails: '',
        workedExample: { problem: '', solution: '', steps: [] },
        keyPoints: []
    };

    test('should respect explicit "trunk" tier', () => {
        const input: ParsedGeneratedContent = {
            domainAnalysis: { domain: 'Test', lifecycle: { phase1: '', phase2: '', phase3: '' }, coreConceptsCount: 0, conceptNames: [] },
            concepts: [
                { ...baseConcept, id: '1', name: 'Root Concept', tier: 'trunk' } as any
            ],
            learningPath: { stages: [] },
            mentalAnchors: [],
            confusionPairs: [],
            rawContent: ''
        };

        const result = transformToLearningConcepts(input, [mockStage]);
        expect(result[0].tier).toBe('trunk');
    });

    test('should handle capitalized "Trunk" tier by normalizing it', () => {
        const input: ParsedGeneratedContent = {
            domainAnalysis: { domain: 'Test', lifecycle: { phase1: '', phase2: '', phase3: '' }, coreConceptsCount: 0, conceptNames: [] },
            concepts: [
                { ...baseConcept, id: '1', name: 'Root Concept', tier: 'Trunk' } as any
            ],
            learningPath: { stages: [] },
            mentalAnchors: [],
            confusionPairs: [],
            rawContent: ''
        };

        const result = transformToLearningConcepts(input, [mockStage]);
        // We expect this to fail if the code doesn't normalize
        expect(result[0].tier).toBe('trunk');
    });

    test('should calculate trunk based on dependencies', () => {
        const input: ParsedGeneratedContent = {
            domainAnalysis: { domain: 'Test', lifecycle: { phase1: '', phase2: '', phase3: '' }, coreConceptsCount: 0, conceptNames: [] },
            concepts: [
                { ...baseConcept, id: 'root', name: 'Root' } as any,
                { ...baseConcept, id: 'c1', name: 'C1', phase1: { ...baseConcept.phase1, prerequisite: 'Root' } } as any,
                { ...baseConcept, id: 'c2', name: 'C2', phase1: { ...baseConcept.phase1, prerequisite: 'Root' } } as any,
                { ...baseConcept, id: 'c3', name: 'C3', phase1: { ...baseConcept.phase1, prerequisite: 'Root' } } as any
            ],
            learningPath: { stages: [] },
            mentalAnchors: [],
            confusionPairs: [],
            rawContent: ''
        };

        const result = transformToLearningConcepts(input, [mockStage]);
        const root = result.find(c => c.id === 'root');
        expect(root?.tier).toBe('trunk');
    });
});
