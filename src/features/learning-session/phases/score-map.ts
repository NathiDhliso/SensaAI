/**
 * Score Map - AI-powered concept map evaluation
 * 
 * Scores user-generated concept maps against AI knowledge:
 * - Completeness: % of key concepts included
 * - Connection Accuracy: % of connections matching AI relationships
 * - Structural Quality: Tier hierarchy respected
 * - Tier Balance: All three tiers represented
 */
import type { LearningConcept, ConceptMapData } from '@/shared/types/learning';
import { getPersonaResponse, type PersonaId } from '@/shared/utils/persona';
// ============================================================================
// TYPES
// ============================================================================
export interface MapScoreBreakdown {
 trunkCoverage: number;
 branchCoverage: number;
 leafCoverage: number;
 correctConnections: number; // Count of connections matching AI
 missingConnections: string[]; // List of missing important connections
 incorrectConnections: string[]; // List of potentially incorrect connections
}
export interface MapScore {
 overall: number; // 0-100 weighted score
 completeness: number; // 0-100: % of concepts included
 connectionAccuracy: number; // 0-100: % of connections matching AI
 structuralQuality: number; // 0-100: Tier flow correctness
 tierBalance: number; // 0-100: All tiers represented
 breakdown: MapScoreBreakdown;
 feedback: string; // Coach-style feedback message
 grade: 'A' | 'B' | 'C' | 'D' | 'F'; // Letter grade
}
// ============================================================================
// SCORING WEIGHTS
// ============================================================================
const WEIGHTS = {
 completeness: 0.30, // 30%
 connectionAccuracy: 0.40, // 40%
 structuralQuality: 0.20, // 20%
 tierBalance: 0.10, // 10%
};
// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================
/**
 * Score a user-generated concept map against AI knowledge
 */
export function scoreConceptMap(
 mapData: ConceptMapData,
 aiConcepts: LearningConcept[],
 personaId?: PersonaId
): MapScore {
 // Get concepts included in user map
 const userConceptIds = new Set(mapData.nodes.map(n => n.conceptId));
 const userConceptNames = new Map(mapData.nodes.map(n => [n.conceptId, n.conceptName]));
 // Group AI concepts by tier
 const trunkConcepts = aiConcepts.filter(c => c.tier === 'trunk');
 const branchConcepts = aiConcepts.filter(c => c.tier === 'branch');
 const leafConcepts = aiConcepts.filter(c => c.tier === 'leaf' || !c.tier);
 const trunkCoverage = calculateCoverage(trunkConcepts, userConceptIds);
 const branchCoverage = calculateCoverage(branchConcepts, userConceptIds);
 const leafCoverage = calculateCoverage(leafConcepts, userConceptIds);
 const completeness = Math.round(
 (trunkCoverage * 0.3) +
 (branchCoverage * 0.5) +
 (leafCoverage * 0.2)
 );
 // Analyze connections
 const connectionAnalysis = analyzeConnections(mapData.connections, aiConcepts, userConceptNames);
 const connectionAccuracy = connectionAnalysis.accuracy;
 const structuralQuality = calculateStructuralQuality(mapData.connections, aiConcepts, userConceptNames);
 // Calculate tier balance
 const tierBalance = calculateTierBalance(userConceptIds, aiConcepts);
 // Calculate overall score
 const overall = Math.round(
 (completeness * WEIGHTS.completeness) +
 (connectionAccuracy * WEIGHTS.connectionAccuracy) +
 (structuralQuality * WEIGHTS.structuralQuality) +
 (tierBalance * WEIGHTS.tierBalance)
 );
 // Determine grade
 const grade = getGrade(overall);
 // Generate coach feedback
 const feedback = generateFeedback(
 personaId || 'coach',
 overall,
 grade,
 completeness,
 connectionAccuracy,
 connectionAnalysis.missingConnections
 );
 return {
 overall,
 completeness,
 connectionAccuracy,
 structuralQuality,
 tierBalance,
 breakdown: {
 trunkCoverage,
 branchCoverage,
 leafCoverage,
 correctConnections: connectionAnalysis.correctCount,
 missingConnections: connectionAnalysis.missingConnections,
 incorrectConnections: connectionAnalysis.incorrectConnections
 },
 feedback,
 grade
 };
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Calculate coverage percentage for a tier
 */
function calculateCoverage(tierConcepts: LearningConcept[], userConceptIds: Set<string>): number {
 if (tierConcepts.length === 0) return 100;
 const included = tierConcepts.filter(c => userConceptIds.has(c.id)).length;
 return Math.round((included / tierConcepts.length) * 100);
}
/**
 * Analyze user connections against AI-generated connections
 */
function analyzeConnections(
 userConnections: ConceptMapData['connections'],
 aiConcepts: LearningConcept[],
 userConceptNames: Map<string, string>
): {
 accuracy: number;
 correctCount: number;
 missingConnections: string[];
 incorrectConnections: string[];
} {
 const correctConnections: string[] = [];
 const incorrectConnections: string[] = [];
 const missingConnections: string[] = [];
 // Build a map of AI connections for quick lookup
 const aiConnectionMap = new Map<string, Set<string>>();
 for (const concept of aiConcepts) {
 if (concept.connections) {
 const targets = new Set<string>();
 for (const conn of concept.connections) {
 targets.add(conn.target.toLowerCase());
 }
 aiConnectionMap.set(concept.name.toLowerCase(), targets);
 }
 }
 // Check each user connection
 for (const conn of userConnections) {
 const fromName = userConceptNames.get(conn.fromId)?.toLowerCase() || '';
 const toName = userConceptNames.get(conn.toId)?.toLowerCase() || '';
 const aiTargets = aiConnectionMap.get(fromName);
 const reverseAiTargets = aiConnectionMap.get(toName);
 if (aiTargets?.has(toName) || reverseAiTargets?.has(fromName)) {
 correctConnections.push(`${fromName} ${toName}`);
 } else {
 // Not necessarily incorrect, just not AI-verified
 // Only flag if label is vague
 if (conn.label === 'relates to' || conn.label === '?' || !conn.label) {
 incorrectConnections.push(`${fromName} ${toName} (consider more specific label)`);
 }
 }
 }
 // Find missing AI connections
 for (const [conceptName, targets] of aiConnectionMap) {
 const conceptId = Array.from(userConceptNames.entries())
 .find(([, name]) => name.toLowerCase() === conceptName)?.[0];
 if (!conceptId) continue; // Concept not in user map
 for (const target of targets) {
 const targetId = Array.from(userConceptNames.entries())
 .find(([, name]) => name.toLowerCase() === target)?.[0];
 if (!targetId) continue; // Target not in user map
 // Check if user has this connection
 const hasConnection = userConnections.some(
 c => (c.fromId === conceptId && c.toId === targetId) ||
 (c.fromId === targetId && c.toId === conceptId)
 );
 if (!hasConnection) {
 missingConnections.push(`${conceptName} ${target}`);
 }
 }
 }
 // Calculate accuracy
 const totalExpected = correctConnections.length + missingConnections.length;
 const accuracy = totalExpected > 0
 ? Math.round((correctConnections.length / totalExpected) * 100)
 : 100;
 return {
 accuracy,
 correctCount: correctConnections.length,
 missingConnections: missingConnections.slice(0, 5), // Limit to top 5
 incorrectConnections: incorrectConnections.slice(0, 5)
 };
}
/**
 * Calculate structural quality (proper tier flow)
 */
function calculateStructuralQuality(
 userConnections: ConceptMapData['connections'],
 aiConcepts: LearningConcept[],
 _userConceptNames: Map<string, string>
): number {
 if (userConnections.length === 0) return 0;
 // Build tier map
 const tierMap = new Map<string, 'trunk' | 'branch' | 'leaf'>();
 for (const concept of aiConcepts) {
 tierMap.set(concept.id, concept.tier || 'leaf');
 }
 let goodFlowCount = 0;
 let totalConnections = 0;
 for (const conn of userConnections) {
 const fromTier = tierMap.get(conn.fromId);
 const toTier = tierMap.get(conn.toId);
 if (!fromTier || !toTier) continue;
 totalConnections++;
 const tierOrder = { trunk: 0, branch: 1, leaf: 2 } as const;
 const fromOrder = tierOrder[fromTier];
 const toOrder = tierOrder[toTier];
 // Connections should flow from lower tier to higher, or same
 if (fromOrder <= toOrder) {
 goodFlowCount++;
 }
 }
 return totalConnections > 0
 ? Math.round((goodFlowCount / totalConnections) * 100)
 : 50; // Default if no connections to evaluate
}
/**
 * Calculate tier balance score
 */
function calculateTierBalance(
 userConceptIds: Set<string>,
 aiConcepts: LearningConcept[]
): number {
 const includedConcepts = aiConcepts.filter(c => userConceptIds.has(c.id));
 const trunkCount = includedConcepts.filter(c => c.tier === 'trunk').length;
 const branchCount = includedConcepts.filter(c => c.tier === 'branch').length;
 const leafCount = includedConcepts.filter(c => c.tier === 'leaf' || !c.tier).length;
 const hasAllTiers = trunkCount > 0 && branchCount > 0 && leafCount > 0;
 if (!hasAllTiers) {
 const tiersPresent = [trunkCount > 0, branchCount > 0, leafCount > 0]
 .filter(Boolean).length;
 return Math.round((tiersPresent / 3) * 100);
 }
 const total = trunkCount + branchCount + leafCount;
 const idealTrunk = total * 0.15;
 const idealBranch = total * 0.35;
 const idealLeaf = total * 0.50;
 const trunkDeviation = Math.abs(trunkCount - idealTrunk) / idealTrunk;
 const branchDeviation = Math.abs(branchCount - idealBranch) / idealBranch;
 const leafDeviation = Math.abs(leafCount - idealLeaf) / idealLeaf;
 const avgDeviation = (trunkDeviation + branchDeviation + leafDeviation) / 3;
 // Convert deviation to score (0 deviation = 100, high deviation = lower)
 return Math.round(Math.max(0, 100 - (avgDeviation * 100)));
}
/**
 * Get letter grade from numeric score
 */
function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
 if (score >= 90) return 'A';
 if (score >= 80) return 'B';
 if (score >= 70) return 'C';
 if (score >= 60) return 'D';
 return 'F';
}
/**
 * Generate coach feedback based on score
 */
function generateFeedback(
 personaId: PersonaId,
 overall: number,
 _grade: string,
 completeness: number,
 connectionAccuracy: number,
 missingConnections: string[]
): string {
 // Get base coach response
 const situation = overall >= 80 ? 'success' : overall >= 60 ? 'encouragement' : 'struggle';
 const baseResponse = getPersonaResponse(personaId, 'build', situation);
 // Add specific feedback
 const specifics: string[] = [];
 if (completeness < 70) {
 specifics.push(`Your map includes ${completeness}% of the key concepts. Consider adding more Foundation concepts first.`);
 }
 if (connectionAccuracy < 70 && missingConnections.length > 0) {
 specifics.push(`Consider connecting: ${missingConnections.slice(0, 2).join('; ')}`);
 }
 if (overall >= 90) {
 specifics.push("Excellent work! Your understanding of the subject matter is solid.");
 }
 return [baseResponse, ...specifics].join(' ');
}
// ============================================================================
// EXPORT BUILD COACH MESSAGE
// ============================================================================
export function getScoreCoachMessage(
 _personaId: PersonaId,
 score: MapScore
): string {
 return score.feedback;
}
