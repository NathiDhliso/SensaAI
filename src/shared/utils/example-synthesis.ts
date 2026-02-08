import type { LearningConcept } from '@/shared/types/learning';

export interface SynthesizedExample {
    problem: string | null;
    solution: string | null;
    steps: string[];
    hasError: boolean;
}

function isRealContent(text?: string, conceptName?: string): boolean {
    if (!text || text.trim() === '') return false;
    const lowerText = text.toLowerCase();
    if (lowerText.includes('lorem ipsum') || lowerText.includes('placeholder') || lowerText.includes('to be defined')) return false;
    if (conceptName && lowerText.includes(conceptName.toLowerCase()) && lowerText.length < conceptName.length + 10) return false;
    return true;
}

export function synthesizeExample(concept: LearningConcept): SynthesizedExample {
    if (concept.workedExample) {
        return { ...concept.workedExample, hasError: false };
    }

    const contextText = concept.shape?.highStakesExample ||
        concept.hookSentence ||
        concept.whyYouNeed;

    const approachText = concept.shape?.analogicalModel ||
        concept.shape?.simpleCore ||
        concept.metaphor;

    const hasRealContext = isRealContent(contextText, concept.name);
    const hasRealApproach = isRealContent(approachText, concept.name);
    const hasRealSteps = (concept.howToUse && concept.howToUse.length > 0) ||
        (concept.keyPoints && concept.keyPoints.length > 0);

    return {
        problem: hasRealContext ? `Scenario: ${contextText}` : null,
        solution: hasRealApproach ? `Approach: ${approachText}` : null,
        steps: hasRealSteps
            ? (concept.howToUse && concept.howToUse.length > 0 ? concept.howToUse : concept.keyPoints!)
            : [],
        hasError: !hasRealContext || !hasRealApproach || !hasRealSteps,
    };
}
