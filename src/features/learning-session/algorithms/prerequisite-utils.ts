import type { LearningConcept } from '@/shared/types/learning';
export interface PrerequisiteConcept {
 id: string;
 name: string;
 completed: boolean;
}
export function resolvePrerequisites(
 prerequisites: string[],
 allConcepts: LearningConcept[],
 completedConcepts: string[]
): PrerequisiteConcept[] {
 return prerequisites.map(prereq => {
 const concept = allConcepts.find(c =>
 c.name.toLowerCase() === prereq.toLowerCase() ||
 c.id === prereq
 );
 return {
 id: concept?.id || prereq,
 name: concept?.name || prereq,
 completed: concept
 ? completedConcepts.includes(concept.id)
 : false
 };
 });
}
export function getRequiredNames(concept: LearningConcept): Set<string> {
 const requiredNames = new Set<string>();
 if (concept.prerequisites) {
 concept.prerequisites.forEach(p => requiredNames.add(p.toLowerCase()));
 }
 if (concept.connections) {
 concept.connections
 .filter(c => c.type === 'requires')
 .forEach(c => requiredNames.add(c.target.toLowerCase()));
 }
 return requiredNames;
}
export function arePrerequisitesMet(
 concept: LearningConcept,
 allConcepts: LearningConcept[],
 completedIds: string[] | Set<string>
): boolean {
 const requiredNames = getRequiredNames(concept);
 if (requiredNames.size === 0) return true;
 const isCompleted = completedIds instanceof Set
 ? (id: string) => completedIds.has(id)
 : (id: string) => completedIds.includes(id);
 return Array.from(requiredNames).every(req => {
 const match = allConcepts.find(c =>
 c.name.toLowerCase() === req || c.id === req
 );
 return match ? isCompleted(match.id) : true;
 });
}
