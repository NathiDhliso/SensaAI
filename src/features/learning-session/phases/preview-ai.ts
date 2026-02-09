/**
 * Preview AI - Phase 1.5: Problem Preview
 * 
 * Generates practice questions from concepts and provides
 * "What would I need to know?" hints with coach persona framing.
 */
import type { LearningConcept } from '@/shared/types/learning';
import { getPersonaResponse, type PersonaId } from '@/features/ai-coach';
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
 return concepts.map((concept) => {
 const difficulty = getDifficultyLevel(concept);
 return {
 id: `q-${concept.id}`,
 question: generateQuestionFromConcept(concept),
 difficulty,
 concepts: [concept.id],
 hint: generateHint(concept)
 };
 });
}
/**
 * Generate a question from a concept
 */
function generateQuestionFromConcept(concept: LearningConcept): string {
 const questionTemplates = [
 `What is the purpose of ${concept.name}?`,
 `How does ${concept.name} work?`,
 `When would you use ${concept.name}?`,
 `What are the key components of ${concept.name}?`,
 `How does ${concept.name} relate to other concepts?`
 ];
 // Select template based on concept properties
 const templateIndex = concept.name.length % questionTemplates.length;
 return questionTemplates[templateIndex];
}
/**
 * Generate a hint for a concept
 */
function generateHint(concept: LearningConcept): string {
 if (concept.keyPoints && concept.keyPoints.length > 0) {
 return `Focus on: ${concept.keyPoints[0]}`;
 }
 return `Consider the relationships with connected concepts`;
}
/**
 * Determine difficulty level based on concept data
 */
function getDifficultyLevel(concept: LearningConcept): 'easy' | 'medium' | 'hard' {
 const keyPointCount = concept.keyPoints?.length || 0;
 if (keyPointCount <= 2) return 'easy';
 if (keyPointCount <= 4) return 'medium';
 return 'hard';
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
 const difficultyScores = questions.map(q =>
 q.difficulty === 'hard' ? 3 : q.difficulty === 'medium' ? 2 : 1
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