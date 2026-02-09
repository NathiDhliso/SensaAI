/**
 * SensaAI Learning Velocity Engine Integration
 * 
 * Example integration showing how to use enhanced content parsing
 * for the Learning Velocity Engine features.
 */
import { parseContent as parseGeneratedContent } from './json-parser';
import { transformToSensaAIContent, validateSensaAIMetadata } from './transformer';
import type { SensaAILearningConcept } from './transformer';
import {
 generateEnhancedDiagnosticQuestions,
 createDiagnosticAssessment,
 validateDiagnosticAssessment
} from '@/features/learning-session/activities/diagnostic-generator';
import { generateSensaAIConfusionPairs } from '@/features/learning-session/activities/confusion-generator';
import type { BedrockConfig } from '@/features/content-generation/api/claude-client';
/**
 * Enhanced content loading with SensaAI Learning Velocity Engine metadata
 * and optional assessment material generation
 */
export async function loadSensaAIContent(
 rawContent: string,
 subjectId?: string,
 config?: BedrockConfig,
 generateAssessments: boolean = false
) {
 try {
 // Step 1: Parse the raw generated content
 const parseResult = parseGeneratedContent(rawContent);
 if (!parseResult.success) {
 return {
 success: false,
 error: parseResult.error || 'Failed to parse content'
 };
 }
 // Step 2: Transform to SensaAI enhanced format
 const transformed = transformToSensaAIContent(parseResult.data, subjectId);
 // Step 3: Validate metadata completeness
 const validation = validateSensaAIMetadata(transformed.concepts);
 // Step 4: Generate enhanced assessment materials if requested
 let enhancedDiagnostics;
 let enhancedConfusionPairs;
 let diagnosticAssessment;
 if (generateAssessments && config && transformed.metadata.diagnosticReady) {
 try {
 // Generate enhanced diagnostic questions
 enhancedDiagnostics = await generateEnhancedDiagnosticQuestions(
 transformed.concepts,
 transformed.metadata.domain,
 config,
 2 // 2 questions per concept
 );
 // Generate enhanced confusion pairs
 enhancedConfusionPairs = await generateSensaAIConfusionPairs(
 transformed.concepts,
 transformed.metadata.domain,
 config,
 5 // Up to 5 confusion pairs
 );
 // Create diagnostic assessment
 diagnosticAssessment = createDiagnosticAssessment(transformed.concepts, enhancedDiagnostics);
 } catch (_error) {
 // Continue with built-in assessments
 }
 }
 return {
 success: true,
 data: {
 stages: transformed.stages,
 concepts: transformed.concepts,
 dependencyGraph: transformed.dependencyGraph,
 metadata: transformed.metadata,
 validation,
 assessments: {
 enhancedDiagnostics,
 enhancedConfusionPairs,
 diagnosticAssessment
 }
 }
 };
 } catch (error) {
 return {
 success: false,
 error: error instanceof Error ? error.message : 'Failed to load SensaAI content'
 };
 }
}
/**
 * Get root concepts suitable for diagnostic assessment
 */
export function getRootConcepts(concepts: SensaAILearningConcept[]): SensaAILearningConcept[] {
 return concepts
 .filter(concept => concept.rootLevel)
 .sort((a, b) => {
 // Sort by diagnostic suitability
 const scoreA = a.prerequisiteWeight * 0.4 + a.frequencyWeight * 0.3 + (a.abstractionLevel === 'concrete' ? 0.3 : 0);
 const scoreB = b.prerequisiteWeight * 0.4 + b.frequencyWeight * 0.3 + (b.abstractionLevel === 'concrete' ? 0.3 : 0);
 return scoreB - scoreA;
 })
 .slice(0, 7); // Limit to 5-7 for cognitive load management
}
/**
 * Get concepts with high confusion risk for prevention drilling
 */
export function getConfusionRiskConcepts(concepts: SensaAILearningConcept[]): SensaAILearningConcept[] {
 return concepts
 .filter(concept => concept.confusionPairs.length > 0)
 .sort((a, b) => {
 // Sort by highest confusion risk
 const maxRiskA = Math.max(...a.confusionPairs.map(p => p.similarityScore));
 const maxRiskB = Math.max(...b.confusionPairs.map(p => p.similarityScore));
 return maxRiskB - maxRiskA;
 });
}
/**
 * Get tier distribution for interleaving algorithm
 */
export function getTierDistribution(concepts: SensaAILearningConcept[]): {
 root: SensaAILearningConcept[];
 trunk: SensaAILearningConcept[];
 leaf: SensaAILearningConcept[];
 distribution: { root: number; trunk: number; leaf: number };
} {
 const root = concepts.filter(c => c.tier === 'root');
 const trunk = concepts.filter(c => c.tier === 'trunk');
 const leaf = concepts.filter(c => c.tier === 'leaf');
 const total = concepts.length;
 return {
 root,
 trunk,
 leaf,
 distribution: {
 root: Math.round((root.length / total) * 100),
 trunk: Math.round((trunk.length / total) * 100),
 leaf: Math.round((leaf.length / total) * 100)
 }
 };
}
/**
 * Create a diagnostic assessment ready for the Learning Velocity Engine
 */
export function createReadyDiagnosticAssessment(
 concepts: SensaAILearningConcept[],
 enhancedQuestions?: Map<string, unknown>
): {
 assessment: ReturnType<typeof createDiagnosticAssessment>;
 validation: ReturnType<typeof validateDiagnosticAssessment>;
 isReady: boolean;
} {
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const assessment = createDiagnosticAssessment(concepts, enhancedQuestions as Map<string, any>);
 const validation = validateDiagnosticAssessment(assessment);
 return {
 assessment,
 validation,
 isReady: validation.isValid && assessment.totalTime <= 180 && assessment.concepts.length >= 5
 };
}
/**
 * Get assessment materials summary for debugging
 */
export function getAssessmentSummary(concepts: SensaAILearningConcept[]): {
 totalConcepts: number;
 rootConcepts: number;
 diagnosticQuestions: number;
 confusionPairs: number;
 avgComplexity: number;
 tierDistribution: Record<string, number>;
 readinessScore: number;
} {
 const rootLevelConcepts = concepts.filter(c => c.rootLevel);
 const totalQuestions = concepts.reduce((sum, c) => sum + c.diagnosticQuestions.length, 0);
 const totalConfusionPairs = concepts.reduce((sum, c) => sum + c.confusionPairs.length, 0);
 const avgComplexity = concepts.reduce((sum, c) => sum + c.complexityScore, 0) / concepts.length;
 const tierDistribution = concepts.reduce((dist, c) => {
 dist[c.tier] = (dist[c.tier] || 0) + 1;
 return dist;
 }, {} as Record<string, number>);
 // Calculate readiness score (0-100)
 let readinessScore = 0;
 // Foundation concepts (40 points max)
 readinessScore += Math.min(40, (rootLevelConcepts.length / 7) * 40);
 // Diagnostic questions (30 points max)
 readinessScore += Math.min(30, (totalQuestions / (concepts.length * 2)) * 30);
 // Confusion pairs (20 points max)
 readinessScore += Math.min(20, (totalConfusionPairs / concepts.length) * 20);
 // Tier balance (10 points max)
 const tierCount = Object.keys(tierDistribution).length;
 readinessScore += Math.min(10, (tierCount / 3) * 10);
 return {
 totalConcepts: concepts.length,
 rootConcepts: rootLevelConcepts.length,
 diagnosticQuestions: totalQuestions,
 confusionPairs: totalConfusionPairs,
 avgComplexity: Math.round(avgComplexity * 10) / 10,
 tierDistribution,
 readinessScore: Math.round(readinessScore)
 };
}