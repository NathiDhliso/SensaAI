/**
 * Preview AI - Phase 1.5: Problem Preview
 * 
 * Generates practice questions from concepts and provides
 * "What would I need to know?" hints with coach persona framing.
 */
import type { LearningConcept } from '@/shared/types/learning';
import { getPersonaResponse, type PersonaId } from '@/shared/utils/persona';
export interface PracticeQuestion {
 id: string;
 question: string;
 difficulty: 'easy' | 'medium' | 'hard';
 concepts: string[];
 hint: string;
}
export interface PreviewAnalysis {
 questions: PracticeQuestion[];
 prerequisites: string[];
 estimatedDifficulty: 'beginner' | 'intermediate' | 'advanced';
 coachMessage: string;
}
/**
 * Generate practice questions from concepts
 */
export function generatePracticeQuestions(concepts: LearningConcept[]): PracticeQuestion[] {
 return concepts.flatMap((concept) => {
 const question = generateQuestionFromConcept(concept);
 const hint = generateHint(concept);
 if (!question || !hint) return [];
 const difficulty = getDifficultyLevel(concept);
 return [{
 id: `q-${concept.id}`,
 question,
 difficulty,
 concepts: [concept.id],
 hint
 }];
 });
}
/**
 * Generate a question from a concept
 */
function generateQuestionFromConcept(concept: LearningConcept): string {
 if (concept.shape?.patternRecognition?.question) {
 return concept.shape.patternRecognition.question;
 }
 if (concept.commonPitfalls && concept.commonPitfalls.length > 0) {
 return `What is a common misconception about ${concept.name}?`;
 }
 if (concept.workedExample?.problem) {
 return concept.workedExample.problem;
 }
 if (concept.lifecycle?.phase1?.steps?.[0]) {
 return `What is the first step described here: ${concept.lifecycle.phase1.steps[0]}?`;
 }
 return '';
}
/**
 * Generate a hint for a concept
 */
function generateHint(concept: LearningConcept): string {
 if (concept.shape?.simpleCore) {
 return concept.shape.simpleCore;
 }
 if (concept.hookSentence) {
 return concept.hookSentence;
 }
 if (concept.keyPoints && concept.keyPoints.length > 0) {
 return concept.keyPoints[0];
 }
 return '';
}
/**
 * Determine difficulty level based on concept data
 */
function getDifficultyLevel(concept: LearningConcept): 'easy' | 'medium' | 'hard' {
 let score = 0;
 const keyPointCount = concept.keyPoints?.length || 0;
 if (keyPointCount > 4) score += 2;
 else if (keyPointCount > 2) score += 1;
 if (concept.tier === 'leaf') score += 2;
 else if (concept.tier === 'branch') score += 1;
 const cog = concept.cognitiveLevel;
 if (cog === 'evaluate' || cog === 'create') score += 2;
 else if (cog === 'analyze' || cog === 'apply') score += 1;
 if (score >= 4) return 'hard';
 if (score >= 2) return 'medium';
 return 'easy';
}
/**
 * Get prerequisites list from concepts
 */
export function extractPrerequisites(concepts: LearningConcept[]): string[] {
 const prerequisites: Set<string> = new Set();
 concepts.forEach(concept => {
 // Look for dependency markers in concept data
 if (concept.prerequisites) {
 concept.prerequisites.forEach(dep => prerequisites.add(dep));
 }
 });
 return Array.from(prerequisites);
}
/**
 * Get coach's framing message for problem preview
 */
export function getPreviewCoachMessage(
 personaId: PersonaId,
 questionCount: number
): string {
 const baseMessage = getPersonaResponse(personaId, 'preview', 'intro');
 return `${baseMessage} We have ${questionCount} practice problems to target.`;
}
/**
 * Analyze concepts and generate full preview
 */
export function generatePreviewAnalysis(
 concepts: LearningConcept[],
 personaId: PersonaId
): PreviewAnalysis {
 const questions = generatePracticeQuestions(concepts);
 const prerequisites = extractPrerequisites(concepts);
 // Estimate overall difficulty
 const difficultyScores = (questions.length > 0 ? questions.map(q => q.difficulty) : concepts.map(getDifficultyLevel)).map(d =>
 d === 'hard' ? 3 : d === 'medium' ? 2 : 1
 );
 const avgDifficulty = difficultyScores.reduce((a, b) => a + b, 0) / difficultyScores.length;
 const estimatedDifficulty: 'beginner' | 'intermediate' | 'advanced' =
 avgDifficulty >= 2.5 ? 'advanced' :
 avgDifficulty >= 1.5 ? 'intermediate' : 'beginner';
 return {
 questions,
 prerequisites,
 estimatedDifficulty,
 coachMessage: getPreviewCoachMessage(personaId, questions.length)
 };
}
