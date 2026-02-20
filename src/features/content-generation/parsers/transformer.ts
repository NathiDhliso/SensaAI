import type { ParsedGeneratedContent, ParsedConcept, ParsedMentalAnchor } from './types';
import type { LearningStage, LearningConcept, ConceptLifecycle, SubjectGraph, MnemonicContext } from '@/shared/types/learning';
import { buildSubjectGraph } from '@/features/content-generation/generators/dependency-parser';
function safeStr(val: unknown): string {
 if (typeof val === 'string') return val;
 if (val == null) return '';
 if (typeof val === 'object') {
 const obj = val as Record<string, unknown>;
 if ('correct' in obj && 'incorrect' in obj) return `${obj.correct} ${obj.incorrect}`;
 if ('boundary' in obj && 'rationale' in obj) return `${obj.boundary} ${obj.rationale}`;
 try { return JSON.stringify(val); } catch { return ''; }
 }
 return String(val);
}
// ============================================================================
// SENSAAI LEARNING VELOCITY ENGINE EXTENSIONS
// Enhanced metadata for diagnostic assessments, blank sheet tests, and confusion prevention
// ============================================================================
/**
 * Enhanced learning concept with SensaAI Learning Velocity Engine metadata
 */
export interface SensaAILearningConcept extends Omit<LearningConcept, 'confusionPairs'> {
 // Core Learning Velocity Engine Extensions
 keyPoints: string[]; // For blank sheet test analysis
 diagnosticQuestions: DiagnosticQuestion[]; // For diagnostic assessments
 confusionPairs: ConfusionPairMetadata[]; // For prevention system
 // Metadata for intelligent systems
 trunkLevel: boolean; // Eligible for diagnostic inclusion (is this a trunk concept?)
 tier: 'trunk' | 'branch' | 'leaf'; // Tree level for interleaving algorithm
 complexityScore: number; // 1-10 for adaptive timing
 prerequisiteWeight: number; // How many concepts depend on this
 frequencyWeight: number; // How often this concept is used
 abstractionLevel: 'concrete' | 'abstract'; // For diagnostic selection
}
/**
 * Diagnostic question for foundation concept assessment
 */
export interface DiagnosticQuestion {
 id: string;
 question: string;
 type: 'multiple-choice' | 'true-false' | 'short-answer';
 options?: string[];
 correctAnswer: string | number;
 expectedTime: number; // seconds
 keyPoints: string[]; // What this question tests
}
/**
 * Confusion pair metadata for prevention system
 */
export interface ConfusionPairMetadata {
 id: string;
 relatedConceptId: string;
 relatedConceptName: string;
 similarityScore: number; // 0-1, how similar the concepts are
 commonMistakes: string[];
 keyDifferences: string[];
 mnemonicDistinguisher: string;
}
const DEFAULT_STAGE_ICONS = ['shape:seed', 'shape:sprout', 'shape:bloom', 'shape:crown', 'shape:synapse'];
// ============================================================================
// SENSAAI LEARNING VELOCITY ENGINE FUNCTIONS
// ============================================================================
/**
 * Get concept name - now simplified since the prompt generates proper names
 */
function cleanConceptName(concept: ParsedConcept): string {
 // The prompt should now generate proper names like "Row-Level Security"
 // instead of placeholder IDs like "concept-P1-003"
 if (concept.name && concept.name.trim().length > 0) {
 return concept.name;
 }
 return '';
}
/**
 * Extract key points from concept content for blank sheet test scoring
 */
function extractKeyPoints(concept: ParsedConcept): string[] {
 if (concept.keyPoints && concept.keyPoints.length >= 3) {
 return concept.keyPoints.slice(0, 7);
 }
 const keyPoints: string[] = [...(concept.keyPoints || [])];
 if (concept.phase1.hookSentence) {
 keyPoints.push(concept.phase1.hookSentence);
 }
 if (concept.phase1.microMetaphor) {
 keyPoints.push(concept.phase1.microMetaphor);
 }
 concept.phase1.selection.forEach(item => {
 if (item.length > 10) {
 keyPoints.push(item);
 }
 });
 concept.phase2.forEach(item => {
 const text = typeof item === 'string' ? item : safeStr(item);
 if (text.includes(':')) {
 const [key, value] = text.split(':');
 if (value && value.trim().length > 5) {
 keyPoints.push(`${key.trim()}: ${value.trim()}`);
 }
 }
 });
 if (concept.shape) {
 if (concept.shape.simpleCore) {
 keyPoints.push(concept.shape.simpleCore);
 }
 if (concept.shape.highStakesExample) {
 keyPoints.push(concept.shape.highStakesExample);
 }
 }
 return keyPoints.slice(0, 7);
}
/**
 * Generate diagnostic questions from concept content
 * Enhanced to work with existing assessment infrastructure
 */
function generateDiagnosticQuestions(concept: ParsedConcept): DiagnosticQuestion[] {
 const questions: DiagnosticQuestion[] = [];
 // Generate from hook sentence (recognition question)
 if (concept.phase1.hookSentence) {
 questions.push({
 id: `${concept.id}-hook`,
 question: `What is the main purpose of ${concept.name}?`,
 type: 'short-answer',
 correctAnswer: concept.phase1.hookSentence,
 expectedTime: 30,
 keyPoints: [concept.phase1.hookSentence]
 });
 }
 // Generate from critical distinctions (true/false)
 (concept.commonPitfalls ?? []).slice(0, 2).forEach((distinction, index) => {
 if (index < 2) {
 const text = safeStr(distinction);
 if (text.length > 5) {
 questions.push({
 id: `${concept.id}-distinction-${index}`,
 question: `True or False: ${text}`,
 type: 'true-false',
 correctAnswer: 1,
 expectedTime: 20,
 keyPoints: [text]
 });
 }
 }
 });
 // Generate from SHAPE pattern recognition if available
 if (concept.shape?.patternRecognition?.question) {
 questions.push({
 id: `${concept.id}-pattern`,
 question: concept.shape.patternRecognition.question,
 type: 'short-answer',
 correctAnswer: concept.shape.patternRecognition.answer,
 expectedTime: 45,
 keyPoints: [concept.shape.patternRecognition.answer]
 });
 }
 // Generate multiple choice from selection criteria
 if (concept.phase1.selection.length >= 3) {
 const correctOption = concept.phase1.selection[0];
 const distractors = concept.phase1.selection.slice(1, 3);
 questions.push({
 id: `${concept.id}-selection`,
 question: `Which of the following is the primary approach for ${concept.name}?`,
 type: 'multiple-choice',
 options: [correctOption, ...distractors, 'None of the above'],
 correctAnswer: 0,
 expectedTime: 35,
 keyPoints: [correctOption]
 });
 }
 // Limit to 3 questions per concept (cognitive load management)
 return questions.slice(0, 3);
}
/**
 * Calculate concept similarity for confusion pair identification
 */
function calculateConceptSimilarity(conceptA: ParsedConcept, conceptB: ParsedConcept): number {
 let similarity = 0;
 let factors = 0;
 // Name similarity (basic string comparison)
 const nameA = conceptA.name.toLowerCase();
 const nameB = conceptB.name.toLowerCase();
 const commonWords = nameA.split(' ').filter(word => nameB.includes(word));
 if (commonWords.length > 0) {
 similarity += commonWords.length / Math.max(nameA.split(' ').length, nameB.split(' ').length);
 factors++;
 }
 // Phase similarity (same lifecycle phase usage)
 const phaseAItems = [...conceptA.phase1.selection, ...conceptA.phase2];
 const phaseBItems = [...conceptB.phase1.selection, ...conceptB.phase2];
 const commonPhaseItems = phaseAItems.filter(item =>
 phaseBItems.some(bItem => safeStr(bItem).toLowerCase().includes(safeStr(item).toLowerCase()) ||
 safeStr(item).toLowerCase().includes(safeStr(bItem).toLowerCase()))
 );
 if (commonPhaseItems.length > 0) {
 similarity += commonPhaseItems.length / Math.max(phaseAItems.length, phaseBItems.length);
 factors++;
 }
 // Tool similarity (same verification tools)
 if (conceptA.phase3.tool && conceptB.phase3.tool) {
 if (safeStr(conceptA.phase3.tool).toLowerCase() === safeStr(conceptB.phase3.tool).toLowerCase()) {
 similarity += 0.5;
 }
 factors++;
 }
 return factors > 0 ? similarity / factors : 0;
}
/**
 * Identify potential confusion pairs between concepts
 */
function identifyConfusionPairs(concepts: ParsedConcept[]): Map<string, ConfusionPairMetadata[]> {
 const confusionMap = new Map<string, ConfusionPairMetadata[]>();
 for (let i = 0; i < concepts.length; i++) {
 for (let j = i + 1; j < concepts.length; j++) {
 const conceptA = concepts[i];
 const conceptB = concepts[j];
 const similarity = calculateConceptSimilarity(conceptA, conceptB);
 // Consider concepts confusable if similarity > 0.3
 if (similarity > 0.3) {
 // Find key differences
 const keyDifferences: string[] = [];
 // Compare critical distinctions
 const uniqueToA = (conceptA.commonPitfalls ?? []).filter(d =>
 !(conceptB.commonPitfalls ?? []).some(bd => safeStr(bd).toLowerCase().includes(safeStr(d).toLowerCase()))
 );
 const uniqueToB = (conceptB.commonPitfalls ?? []).filter(d =>
 !(conceptA.commonPitfalls ?? []).some(ad => safeStr(ad).toLowerCase().includes(safeStr(d).toLowerCase()))
 );
 keyDifferences.push(...uniqueToA.map(d => `${conceptA.name}: ${safeStr(d)}`));
 keyDifferences.push(...uniqueToB.map(d => `${conceptB.name}: ${safeStr(d)}`));
 // Create mnemonic distinguisher
 const distinguisher = `${conceptA.name} vs ${conceptB.name}: ${keyDifferences[0] || 'Different use cases'}`;
 const pairA: ConfusionPairMetadata = {
 id: `confusion-${conceptA.id}-${conceptB.id}`,
 relatedConceptId: conceptB.id,
 relatedConceptName: conceptB.name,
 similarityScore: similarity,
 commonMistakes: [`Confusing ${conceptA.name} with ${conceptB.name}`],
 keyDifferences,
 mnemonicDistinguisher: distinguisher
 };
 const pairB: ConfusionPairMetadata = {
 id: `confusion-${conceptB.id}-${conceptA.id}`,
 relatedConceptId: conceptA.id,
 relatedConceptName: conceptA.name,
 similarityScore: similarity,
 commonMistakes: [`Confusing ${conceptB.name} with ${conceptA.name}`],
 keyDifferences: keyDifferences.map(d => d.replace(conceptA.name, conceptB.name).replace(conceptB.name, conceptA.name)),
 mnemonicDistinguisher: distinguisher.replace(conceptA.name, conceptB.name).replace(conceptB.name, conceptA.name)
 };
 if (!confusionMap.has(conceptA.id)) confusionMap.set(conceptA.id, []);
 if (!confusionMap.has(conceptB.id)) confusionMap.set(conceptB.id, []);
 confusionMap.get(conceptA.id)!.push(pairA);
 confusionMap.get(conceptB.id)!.push(pairB);
 }
 }
 }
 return confusionMap;
}
/**
 * Determine if concept is foundation level (eligible for diagnostics)
 */
function isTrunkLevel(concept: ParsedConcept, allConcepts: ParsedConcept[]): boolean {
 // Foundation concepts typically:
 // 1. Have fewer prerequisites
 // 2. Are referenced by other concepts
 // 3. Have concrete rather than abstract content
 const hasMinimalPrerequisites = !concept.phase1.prerequisite ||
 safeStr(concept.phase1.prerequisite).toLowerCase().includes('none') ||
 safeStr(concept.phase1.prerequisite).length < 50;
 const isReferencedByOthers = allConcepts.some(other =>
 other.id !== concept.id &&
 (other.phase1.prerequisite ? safeStr(other.phase1.prerequisite).toLowerCase().includes(concept.name.toLowerCase()) : false) ||
 (other.phase1.execution ? safeStr(other.phase1.execution).toLowerCase().includes(concept.name.toLowerCase()) : false)
 );
 const hasConcreteContent = concept.phase1.microMetaphor.length > 0 ||
 (concept.shape?.highStakesExample?.length || 0) > 0;
 return hasMinimalPrerequisites && (isReferencedByOthers || hasConcreteContent);
}
/**
 * Calculate concept tier for interleaving algorithm
 */
/**
 * Calculate concept tier for interleaving algorithm
 */
function calculateTier(concept: ParsedConcept, allConcepts: ParsedConcept[]): 'trunk' | 'branch' | 'leaf' {
 if (concept.tier) {
        const t = concept.tier.toLowerCase();
        if (t === 'trunk' || t === 'branch' || t === 'leaf') return t as 'trunk' | 'branch' | 'leaf';
        return 'leaf';
    }
 if (concept.mnemonic?.tier) {
 return concept.mnemonic.tier;
 }
 const dependentCount = allConcepts.filter(other =>
 other.id !== concept.id &&
 ((other.phase1.prerequisite ? safeStr(other.phase1.prerequisite).toLowerCase().includes(concept.name.toLowerCase()) : false) ||
 (other.phase1.execution ? safeStr(other.phase1.execution).toLowerCase().includes(concept.name.toLowerCase()) : false))
 ).length;
 const dependencyCount = concept.phase1.prerequisite &&
 !safeStr(concept.phase1.prerequisite).toLowerCase().includes('none') ? 1 : 0;
 if (dependentCount >= 3) return 'trunk';
 if (dependentCount >= 1 || dependencyCount > 0) return 'branch';
 return 'leaf';
}
/**
 * Calculate complexity score for adaptive timing
 */
function calculateComplexityScore(concept: ParsedConcept): number {
 let complexity = 1;
 // Factor in content length
 const totalContent = concept.phase1.execution.length +
 concept.phase2.join(' ').length +
 concept.phase3.thresholds.length;
 complexity += Math.min(3, totalContent / 500); // Max 3 points for length
 // Factor in number of selection criteria
 complexity += Math.min(2, concept.phase1.selection.length / 3); // Max 2 points
 // Factor in critical distinctions (indicates complexity)
 complexity += Math.min(2, (concept.commonPitfalls ?? []).length / 2); // Max 2 points
 // Factor in SHAPE sections (indicates comprehensive coverage)
 if (concept.shape) {
 const shapeCount = [
 concept.shape.simpleCore,
 concept.shape.highStakesExample,
 concept.shape.analogicalModel,
 concept.shape.patternRecognition?.question,
 concept.shape.eliminationLogic
 ].filter(Boolean).length;
 complexity += Math.min(2, shapeCount / 3); // Max 2 points
 }
 return Math.min(10, Math.round(complexity));
}
// ============================================================================
// EXISTING TRANSFORMER FUNCTIONS
// ============================================================================
function extractIconFromMetaphor(metaphor: string, _domain: string = 'General'): string {
 // 1. GLOBAL KEYWORDS (Strong matches independent of domain)
 // These are universally recognized metaphors
 const globalIcons: Record<string, string> = {
 'brain': 'shape:synapse', 'mind': 'shape:synapse', 'logic': 'shape:synapse',
 'cloud': 'shape:nebula', 'web': 'shape:nebula',
 'security': 'shape:bastion', 'shield': 'shape:bastion',
 'foundation': 'shape:bastion', 'core': 'shape:construct',
 'tool': 'shape:construct', 'engine': 'shape:construct',
 'plant': 'shape:sprout', 'growth': 'shape:bloom',
 'light': 'shape:prism', 'vision': 'shape:prism'
 };
 const lowerMetaphor = metaphor.toLowerCase();
 for (const [keyword, icon] of Object.entries(globalIcons)) {
 if (lowerMetaphor.includes(keyword)) {
 return icon;
 }
 }
 // 2. DOMAIN CONTEXT PALETTE (Fallback)
 // Use a default icon if no matches
 return 'shape:seed';
}
function findMetaphorForConcept(conceptName: string, mentalAnchors: ParsedMentalAnchor[]): string {
 const lowerName = conceptName.toLowerCase();
 for (const anchor of mentalAnchors) {
 for (const mapping of anchor.mappings) {
 if (mapping.concept.toLowerCase().includes(lowerName) ||
 lowerName.includes(mapping.concept.toLowerCase())) {
 // Validation: Verify the metaphor is not circular (not the name itself)
 const candidate = mapping.metaphorElement;
 const lowerCandidate = candidate.toLowerCase();
 if (lowerCandidate !== lowerName &&
 !lowerCandidate.includes(lowerName) &&
 !lowerName.includes(lowerCandidate)) {
 return candidate;
 }
 }
 }
 }
 // Return empty string if no metaphor found - UI should handle missing metaphors
 return '';
}
function getConceptIcon(conceptName: string, mentalAnchors: ParsedMentalAnchor[], domain: string): string {
 const metaphor = findMetaphorForConcept(conceptName, mentalAnchors);
 return extractIconFromMetaphor(metaphor, domain);
}
function generateHookSentence(concept: ParsedConcept, _metaphor: string): string {
 // FULL THROTTLE: Only return AI-generated content, NO FALLBACKS
 return concept.phase1.hookSentence || '';
}
function getConceptMetaphor(concept: ParsedConcept, mentalAnchors: ParsedMentalAnchor[]): string {
 const lowerName = concept.name.toLowerCase();
 // Use extracted micro-metaphor if available AND valid (not circular)
 if (concept.phase1.microMetaphor) {
 const lowerMetaphor = concept.phase1.microMetaphor.toLowerCase();
 // Strict validation: Metaphor cannot be the concept name or a substring of it
 const isCircular = lowerMetaphor === lowerName ||
 lowerMetaphor.includes(lowerName) ||
 lowerName.includes(lowerMetaphor);
 if (!isCircular) {
 return concept.phase1.microMetaphor;
 }
 }
 // Fall back to finding from mental anchors
 return findMetaphorForConcept(concept.name, mentalAnchors);
}
function extractPrerequisites(concept: ParsedConcept, allConcepts: ParsedConcept[]): string[] {
 const prereqText = safeStr(concept.phase1.prerequisite).toLowerCase();
 const prerequisites: string[] = [];
 for (const other of allConcepts) {
 if (other.id === concept.id) continue;
 const otherNameLower = other.name.toLowerCase();
 if (prereqText.includes(otherNameLower) ||
 prereqText.includes(other.id.replace(/-/g, ' '))) {
 prerequisites.push(other.id);
 }
 }
 return prerequisites;
}
/**
 * SILVER BULLET: Extract semantic connections from AI-generated content.
 * 
 * This function maps the AI-generated relationship types (6 universal: requires, enables, is-part-of, is-type-of, causes, constrains)
 * to the LearningConcept.connections format.
 * 
 * Priority order:
 * 1. strictConnections (from frontend surgical prompt)
 * 2. mnemonic.dependsOn (explicit dependency declarations)
 */
function extractSemanticConnections(
 concept: ParsedConcept,
 allConcepts: ParsedConcept[]
): Array<{ target: string; type: 'requires' | 'enables' | 'is-part-of' | 'is-type-of' | 'causes' | 'constrains' }> {
 const connections: Array<{ target: string; type: 'requires' | 'enables' | 'is-part-of' | 'is-type-of' | 'causes' | 'constrains' }> = [];
 const addedTargets = new Set<string>(); // Prevent duplicates
 // Helper to validate target exists in curriculum
 const validateTarget = (targetName: string): boolean => {
 return allConcepts.some(c =>
 c.name.toLowerCase() === targetName.toLowerCase() &&
 c.id !== concept.id
 );
 };
 // Priority 1: strictConnections (AI-generated semantic relationships)
 if (concept.strictConnections && concept.strictConnections.length > 0) {
 for (const conn of concept.strictConnections) {
 if (conn.target && validateTarget(conn.target) && !addedTargets.has(conn.target.toLowerCase())) {
 connections.push({
 target: conn.target,
 type: (conn.type || 'requires') as 'requires' | 'enables' | 'is-part-of' | 'is-type-of' | 'causes' | 'constrains'
 });
 addedTargets.add(conn.target.toLowerCase());
 }
 }
 }
 // Priority 2: mnemonic.dependsOn (explicit dependency declarations)
 if (concept.mnemonic?.dependsOn && concept.mnemonic.dependsOn.length > 0) {
 for (const dep of concept.mnemonic.dependsOn) {
 if (validateTarget(dep) && !addedTargets.has(dep.toLowerCase())) {
 connections.push({
 target: dep,
 type: 'requires', // Dependencies are always "requires" relationships
 });
 addedTargets.add(dep.toLowerCase());
 }
 }
 }
 return connections;
}
function generateWhyYouNeed(concept: ParsedConcept): string {
 // FULL THROTTLE: Only return AI-generated content, NO FALLBACKS
 return concept.whyYouNeed || '';
}
function generateRealWorldExample(concept: ParsedConcept, _metaphor: string): string {
 // FULL THROTTLE: Only return AI-generated content, NO FALLBACKS
 return concept.shape?.highStakesExample || '';
}
function slugify(text: string): string {
 return text
 .toLowerCase()
 .replace(/[^a-z0-9]+/g, '-')
 .replace(/(^-|-$)/g, '');
}
export function transformToLearningStages(
 parsed: ParsedGeneratedContent
): LearningStage[] {
 const stages: LearningStage[] = [];
 const macro = parsed.domainAnalysis.macroStructure;
 if (macro && macro.data) {
 const macroStages = extractMacroStageNames(macro);
 if (macroStages.length > 0) {
 const conceptsPerStage = Math.ceil(parsed.concepts.length / macroStages.length);
 for (let i = 0; i < macroStages.length; i++) {
 const stageName = macroStages[i];
 const stageId = `stage-${i + 1}-${slugify(stageName)}`;
 const stageIcon = DEFAULT_STAGE_ICONS[i] || DEFAULT_STAGE_ICONS[0];
 const startIdx = i * conceptsPerStage;
 const endIdx = Math.min(startIdx + conceptsPerStage, parsed.concepts.length);
 const conceptIds = parsed.concepts.slice(startIdx, endIdx).map(c => c.id);
 stages.push({
 id: stageId,
 title: stageName,
 description: `Master the ${stageName.toLowerCase()} concepts`,
 order: i + 1,
 name: stageName,
 metaphor: stageName,
 metaphorDescription: `Master the ${stageName.toLowerCase()} concepts`,
 icon: stageIcon,
 concepts: conceptIds,
 celebrationTitle: `${stageName} Complete!`,
 celebrationMessage: `You've mastered the ${stageName.toLowerCase()} stage!`
 });
 }
 return stages;
 }
 }
 if (parsed.learningPath.stages.length > 0) {
 for (const stage of parsed.learningPath.stages) {
 const stageId = `stage-${stage.order}-${slugify(stage.name)}`;
 const conceptIds = stage.concepts.map(c => slugify(c));
 const stageIcon = DEFAULT_STAGE_ICONS[stage.order - 1] || DEFAULT_STAGE_ICONS[0];
 const metaphorDesc = stage.capabilitiesGained || `Master the ${stage.name.toLowerCase()} concepts`;
 stages.push({
 id: stageId,
 title: stage.name,
 description: metaphorDesc,
 order: stage.order,
 name: stage.name,
 metaphor: stage.name,
 metaphorDescription: metaphorDesc,
 icon: stageIcon,
 concepts: conceptIds,
 celebrationTitle: `${stage.name} Complete!`,
 celebrationMessage: stage.capabilitiesGained || `You've mastered the ${stage.name.toLowerCase()} concepts!`,
 narrativeBridge: stage.narrativeBridge
 });
 }
 } else {
 stages.push({
 id: 'stage-1-foundation',
 title: 'Foundation',
 description: 'Establish the core concepts.',
 order: 1,
 name: 'Foundation',
 metaphor: 'Foundation',
 metaphorDescription: 'Establish the core concepts.',
 icon: DEFAULT_STAGE_ICONS[0],
 concepts: parsed.concepts.slice(0, 8).map(c => c.id),
 celebrationTitle: 'Foundation Complete!',
 celebrationMessage: 'You\'ve mastered the foundational concepts!'
 });
 }
 return stages;
}
function extractMacroStageNames(macro: NonNullable<import('./types').ParsedDomainAnalysis['macroStructure']>): string[] {
 const data = macro.data as unknown as Record<string, unknown>;
 if (macro.type === 'procedural' && Array.isArray((data as { stages?: unknown }).stages)) {
 return ((data as { stages: { verb?: string; id?: string }[] }).stages).map(s => s.verb || s.id || '');
 }
 if (macro.type === 'conceptual' && Array.isArray((data as { coreMoves?: unknown }).coreMoves)) {
 return ((data as { coreMoves: { verb?: string; id?: string }[] }).coreMoves).map(m => m.verb || m.id || '');
 }
 if (macro.type === 'cyclic' && Array.isArray((data as { fundamentalCycle?: unknown }).fundamentalCycle)) {
 return ((data as { fundamentalCycle: { verb?: string; id?: string }[] }).fundamentalCycle).map(n => n.verb || n.id || '');
 }
 if (macro.type === 'perceptual' && Array.isArray((data as { perceptualLadder?: unknown }).perceptualLadder)) {
 return ((data as { perceptualLadder: { label?: string }[] }).perceptualLadder).map(l => l.label || '');
 }
 if (Array.isArray(data.stages)) {
 return (data.stages as string[]).filter(s => typeof s === 'string');
 }
 return [];
}
function findStageForConcept(conceptId: string, stages: LearningStage[]): LearningStage | undefined {
 for (const stage of stages) {
 const concepts = stage.concepts || [];
 if (concepts.includes(conceptId)) {
 return stage;
 }
 for (const stageConceptId of concepts) {
 if (stageConceptId.includes(conceptId) || conceptId.includes(stageConceptId)) {
 return stage;
 }
 const normalizedStage = stageConceptId.replace(/-/g, '').toLowerCase();
 const normalizedConcept = conceptId.replace(/-/g, '').toLowerCase();
 if (normalizedStage === normalizedConcept ||
 normalizedStage.includes(normalizedConcept) ||
 normalizedConcept.includes(normalizedStage)) {
 return stage;
 }
 }
 }
 return undefined;
}
function distributeConceptsToStages(
 concepts: ParsedConcept[],
 stages: LearningStage[]
): Map<string, string> {
 const conceptToStage = new Map<string, string>();
 const conceptsPerStage = Math.ceil(concepts.length / stages.length);
 for (const concept of concepts) {
 const matchedStage = findStageForConcept(concept.id, stages);
 if (matchedStage) {
 conceptToStage.set(concept.id, matchedStage.id);
 }
 }
 const unmatchedConcepts = concepts.filter(c => !conceptToStage.has(c.id));
 if (unmatchedConcepts.length > 0) {
 const stageConceptCounts = new Map<string, number>();
 stages.forEach(s => stageConceptCounts.set(s.id, 0));
 conceptToStage.forEach((stageId) => {
 stageConceptCounts.set(stageId, (stageConceptCounts.get(stageId) || 0) + 1);
 });
 for (const concept of unmatchedConcepts) {
 let targetStage = stages[0];
 let minCount = Infinity;
 for (const stage of stages) {
 const count = stageConceptCounts.get(stage.id) || 0;
 if (count < minCount && count < conceptsPerStage) {
 minCount = count;
 targetStage = stage;
 }
 }
 conceptToStage.set(concept.id, targetStage.id);
 stageConceptCounts.set(targetStage.id, (stageConceptCounts.get(targetStage.id) || 0) + 1);
 }
 }
 return conceptToStage;
}
export function transformToLearningConcepts(
 parsed: ParsedGeneratedContent,
 stages: LearningStage[]
): LearningConcept[] {
 console.log(`\n [Transformer] transformToLearningConcepts called`);
 console.log(` Total parsed concepts: ${parsed.concepts.length}`);
 const concepts: LearningConcept[] = [];
 const lifecycleLabels = parsed.domainAnalysis.lifecycle;
 const conceptToStage = distributeConceptsToStages(parsed.concepts, stages);
 for (const parsedConcept of parsed.concepts) {
 const stageId = conceptToStage.get(parsedConcept.id) || stages[0]?.id;
 const stage = stages.find(s => s.id === stageId) || stages[0];
 const stageConceptIndex = Array.from(conceptToStage.entries())
 .filter(([, sId]) => sId === stageId)
 .findIndex(([cId]) => cId === parsedConcept.id);
 const howToUse = parsedConcept.phase2.slice(0, 3);
 if (howToUse.length === 0 && parsedConcept.phase1.execution) {
 howToUse.push(parsedConcept.phase1.execution);
 }
 const technicalDetails = parsedConcept.technicalDetails || '';
 const phase1Steps: string[] = [];
 if (parsedConcept.phase1.prerequisite) {
 phase1Steps.push(`Prerequisite: ${parsedConcept.phase1.prerequisite}`);
 }
 if (parsedConcept.phase1.selection.length > 0) {
 phase1Steps.push(...parsedConcept.phase1.selection);
 }
 if (parsedConcept.phase1.execution) {
 phase1Steps.push(parsedConcept.phase1.execution);
 }
 const phase3Steps: string[] = [];
 if (parsedConcept.phase3.tool) {
 phase3Steps.push(`Tool: ${parsedConcept.phase3.tool}`);
 }
 if (parsedConcept.phase3.metrics.length > 0) {
 phase3Steps.push(`Metrics: ${parsedConcept.phase3.metrics.join(', ')}`);
 }
 if (parsedConcept.phase3.thresholds) {
 phase3Steps.push(`Thresholds: ${parsedConcept.phase3.thresholds}`);
 }
 const lifecycle: ConceptLifecycle = {
 phase1: {
 title: lifecycleLabels.phase1 || 'FOUNDATION',
 steps: phase1Steps
 },
 phase2: {
 title: lifecycleLabels.phase2 || 'ACTION',
 steps: parsedConcept.phase2.length > 0 ? parsedConcept.phase2 : []
 },
 phase3: {
 title: lifecycleLabels.phase3 || 'VERIFICATION',
 steps: phase3Steps
 }
 };
 const metaphor = getConceptMetaphor(parsedConcept, parsed.mentalAnchors);
 const icon = getConceptIcon(parsedConcept.name, parsed.mentalAnchors, parsed.domainAnalysis.domain);
 // Transform parsed mnemonic to MnemonicContext
 let mnemonic: MnemonicContext | undefined;
 if (parsedConcept.mnemonic) {
 mnemonic = {
 anchor: parsedConcept.mnemonic.anchor,
 story: parsedConcept.mnemonic.story,
 tier: parsedConcept.mnemonic.tier || parsedConcept.tier || 'leaf',
 parentName: parsedConcept.mnemonic.parentName,
 parentId: parsedConcept.mnemonic.parentId,
 dependsOn: parsedConcept.mnemonic.dependsOn,
 imageUrl: parsedConcept.mnemonic.imageUrl
 };
 }
 concepts.push({
 id: parsedConcept.id,
 stageId: stage?.id || 'stage-1-root',
 order: stageConceptIndex + 1,
 name: cleanConceptName(parsedConcept),
 icon,
 metaphor,
 hookSentence: generateHookSentence(parsedConcept, metaphor),
 whyYouNeed: generateWhyYouNeed(parsedConcept),
 realWorldExample: generateRealWorldExample(parsedConcept, metaphor),
 howToUse,
 technicalDetails: parsedConcept.technicalDetails || technicalDetails || '',
 workedExample: parsedConcept.workedExample,
 keyPoints: parsedConcept.keyPoints,
 perspectives: parsedConcept.perspectives,
 prerequisites: extractPrerequisites(parsedConcept, parsed.concepts),
 visualElement: slugify(parsedConcept.name),
 actionButtonText: `Master ${parsedConcept.name}`,
 lifecycle,
 mnemonic,
 shape: parsedConcept.shape ? {
 simpleCore: parsedConcept.shape.simpleCore,
 highStakesExample: parsedConcept.shape.highStakesExample,
 analogicalModel: parsedConcept.shape.analogicalModel,
 patternRecognition: parsedConcept.shape.patternRecognition,
 eliminationLogic: parsedConcept.shape.eliminationLogic
 } : undefined,
 tier: calculateTier(parsedConcept, parsed.concepts),
 parentName: parsedConcept.parentName,
 trunkDomain: parsedConcept.trunkDomain,
 cognitiveLevel: parsedConcept.cognitiveLevel,
 commonPitfalls: parsedConcept.commonPitfalls,
 // Map raw stageId (PREPARE/MODEL/DELIVER) to lifecyclePhase with Robust Normalization
 lifecyclePhase: normalizeLifecyclePhase(parsedConcept.stageId),
 dependencies: extractPrerequisites(parsedConcept, parsed.concepts),
 outdegree: parsed.concepts.filter(other =>
 other.id !== parsedConcept.id &&
 ((other.phase1.prerequisite ? safeStr(other.phase1.prerequisite).toLowerCase().includes(parsedConcept.name.toLowerCase()) : false) ||
 (other.phase1.execution ? safeStr(other.phase1.execution).toLowerCase().includes(parsedConcept.name.toLowerCase()) : false))
 ).length,
 // SILVER BULLET: Map AI-generated semantic connections to LearningConcept.connections
 // Priority: strictConnections (frontend prompt) > connections (Lambda prompt)
 connections: extractSemanticConnections(parsedConcept, parsed.concepts)
 });
 // Log the final concept name
 const finalConcept = concepts[concepts.length - 1];
 console.log(` Created concept #${finalConcept.order}: "${finalConcept.name}"`);
 }
 return concepts;
}
// Helper to normalize fuzzy AI output to strict Lifecycle Phase
function normalizeLifecyclePhase(input: string | undefined): 'PREPARE' | 'MODEL' | 'DELIVER' {
 if (!input) return 'PREPARE';
 const s = input.toUpperCase();
 // Phase 1: Foundation/Prepare
 if (s.includes('PREPARE') || s.includes('FOUNDATION') || s.includes('STAGE 1') || s.includes('PRIME') || s.includes('PHASE 1')) return 'PREPARE';
 // Phase 2: Action/Model
 if (s.includes('MODEL') || s.includes('APPLICATION') || s.includes('STAGE 2') || s.includes('ACTION') || s.includes('PHASE 2') || s.includes('EXECUTE')) return 'MODEL';
 // Phase 3: Deliver/Verification
 if (s.includes('DELIVER') || s.includes('VERIFICATION') || s.includes('STAGE 3') || s.includes('RETRIEVAL') || s.includes('PHASE 3') || s.includes('VALIDATE')) return 'DELIVER';
 return 'PREPARE'; // Default
}
// Helper to force-balance distribution if AI fails to spread concepts
function balanceLifecycleDistribution(concepts: LearningConcept[]) {
 const counts = { PREPARE: 0, MODEL: 0, DELIVER: 0 };
 concepts.forEach(c => { if (c.lifecyclePhase) counts[c.lifecyclePhase]++; });
 const total = concepts.length;
 if (total < 3) return; // Too few to balance
 
 // If any sector is empty or heavily skewed (>70%), redistribute by Order
 const isSkewed = (counts.PREPARE === 0 || counts.MODEL === 0 || counts.DELIVER === 0) ||
 (counts.PREPARE / total > 0.7) ||
 (counts.MODEL / total > 0.7);
 
 if (isSkewed) {
 console.log('ℹ️ Lifecycle Distribution Skewed. Force Balancing by Order.');
 // Sort a copy to determine rank
 const sortedIds = [...concepts].sort((a, b) => (a.order || 0) - (b.order || 0)).map(c => c.id);
 const chunkSize = Math.ceil(total / 3);
 concepts.forEach(c => {
 // Find rank in sorted list
 const rank = sortedIds.indexOf(c.id);
 if (rank < chunkSize) c.lifecyclePhase = 'PREPARE';
 else if (rank < chunkSize * 2) c.lifecyclePhase = 'MODEL';
 else c.lifecyclePhase = 'DELIVER';
 });
 }
 
 // TIER-AWARE BALANCING: Also balance within each tier for better matrix distribution
 ['trunk', 'branch', 'leaf'].forEach(tierName => {
 const tierConcepts = concepts.filter(c => c.tier === tierName);
 if (tierConcepts.length < 3) return; // Too few to balance
 
 const tierCounts = { PREPARE: 0, MODEL: 0, DELIVER: 0 };
 tierConcepts.forEach(c => { if (c.lifecyclePhase) tierCounts[c.lifecyclePhase]++; });
 
 // Check if this tier is skewed (any phase empty or >70%)
 const tierSkewed = (tierCounts.PREPARE === 0 || tierCounts.MODEL === 0 || tierCounts.DELIVER === 0) ||
 (tierCounts.PREPARE / tierConcepts.length > 0.7) ||
 (tierCounts.MODEL / tierConcepts.length > 0.7) ||
 (tierCounts.DELIVER / tierConcepts.length > 0.7);
 
 if (tierSkewed) {
 console.log(`ℹ️ Tier "${tierName}" distribution skewed. Rebalancing ${tierConcepts.length} concepts.`);
 // Redistribute this tier's concepts evenly across phases
 const sortedTier = [...tierConcepts].sort((a, b) => (a.order || 0) - (b.order || 0));
 const tierChunkSize = Math.ceil(tierConcepts.length / 3);
 sortedTier.forEach((c, i) => {
 if (i < tierChunkSize) c.lifecyclePhase = 'PREPARE';
 else if (i < tierChunkSize * 2) c.lifecyclePhase = 'MODEL';
 else c.lifecyclePhase = 'DELIVER';
 });
 }
 });
}
// ============================================================================
// SILVER BULLET: ROBUST TIER CLASSIFICATION
// ============================================================================
/**
 * Validate all dependsOn references exist in the curriculum
 * Removes hallucinated dependencies
 */
function validateDependencies(concepts: ParsedConcept[]): void {
 const allNames = new Set(concepts.map(c => c.name));
 concepts.forEach(concept => {
 if (concept.dependsOn && concept.dependsOn.length > 0) {
 concept.dependsOn = concept.dependsOn.filter((dep: string) => {
 if (!allNames.has(dep)) {
 console.warn(` "${concept.name}" depends on non-existent "${dep}". Removing.`);
 return false;
 }
 return true;
 });
 }
 });
}
/**
 * Transform concepts to SensaAI Learning Velocity Engine enhanced concepts
 * Adds diagnostic questions, key points, confusion pairs, and metadata
 */
export function transformToSensaAIConcepts(
 parsed: ParsedGeneratedContent,
 stages: LearningStage[]
): SensaAILearningConcept[] {
 let baseConcepts = transformToLearningConcepts(parsed, stages);
 // CRITICAL FILTER: Remove any "Unnamed Concept" or empty name artifacts that slipped through
 baseConcepts = baseConcepts.filter(c =>
 c.name &&
 c.name.trim().length > 0 &&
 c.name !== 'Unnamed Concept' &&
 !c.name.toLowerCase().includes('unnamed')
 );
 // CRITICAL: Deduplicate Concepts by Name (Fuzzy Match)
 // This handles the "Duplicate Concept" double-up bug
 const deduped: LearningConcept[] = [];
 const seenNames = new Map<string, LearningConcept>();
 baseConcepts.forEach(c => {
 // Normalize name: lowercase, trim, remove special chars to catch "Workspace" vs "Workspaces"
 // For now, strict name matching (case insensitive) is safer to avoid over-merging distinct concepts
 const norm = c.name.toLowerCase().trim();
 if (seenNames.has(norm)) {
 const existing = seenNames.get(norm)!;
 // Merge logic: If new one has better shape data, update the existing one
 if (!existing.shape && c.shape) {
 Object.assign(existing, c);
 }
 // If conflicting tiers, prefer Foundation
 if (c.tier === 'trunk' && existing.tier !== 'trunk') {
 existing.tier = 'trunk';
 }
 } else {
 seenNames.set(norm, c);
 deduped.push(c);
 }
 });
 baseConcepts = deduped;
 // CRITICAL: Ensure balanced distribution layout
 balanceLifecycleDistribution(baseConcepts);
 validateDependencies(parsed.concepts);
 // Identify confusion pairs across all concepts
 const confusionMap = identifyConfusionPairs(parsed.concepts);
 // Transform to SensaAI enhanced concepts
 const sensaAIConcepts: SensaAILearningConcept[] = baseConcepts.map((baseConcept) => {
 const parsedConcept = parsed.concepts.find(pc => pc.id === baseConcept.id);
 if (!parsedConcept) {
 return null;
 }
 // Extract SensaAI metadata
 const keyPoints = extractKeyPoints(parsedConcept);
 const diagnosticQuestions = generateDiagnosticQuestions(parsedConcept);
 const trunkLevel = isTrunkLevel(parsedConcept, parsed.concepts);
 const tier = calculateTier(parsedConcept, parsed.concepts);
 const complexityScore = calculateComplexityScore(parsedConcept);
 // Calculate weights for diagnostic selection
 const prerequisiteWeight = parsed.concepts.filter(other =>
 other.phase1.prerequisite?.toLowerCase().includes(parsedConcept.name.toLowerCase())
 ).length;
 const frequencyWeight = parsedConcept.phase1.selection.length + parsedConcept.phase2.length;
 const abstractionLevel = parsedConcept.phase1.microMetaphor.length > 0 ||
 (parsedConcept.shape?.highStakesExample?.length || 0) > 0
 ? 'concrete' : 'abstract';
 // Get confusion pairs for this concept
 const conceptConfusionPairs = confusionMap.get(parsedConcept.id) || [];
 return {
 ...baseConcept,
 keyPoints,
 diagnosticQuestions,
 confusionPairs: conceptConfusionPairs,
 trunkLevel,
 tier,
 complexityScore,
 prerequisiteWeight,
 frequencyWeight,
 abstractionLevel
 };
 }).filter((c): c is SensaAILearningConcept => c !== null);
 return sensaAIConcepts;
}
export function transformGeneratedContent(
 parsed: ParsedGeneratedContent,
 subjectId?: string
): {
 stages: LearningStage[];
 concepts: LearningConcept[];
 dependencyGraph: SubjectGraph;
 metadata: {
 domain: string;
 role: string;
 source: string;
 conceptCount: number;
 };
} {
 const stages = transformToLearningStages(parsed);
 const concepts = transformToSensaAIConcepts(parsed, stages);
 // Build the dependency graph from parsed concepts
 // This is the "Freeze & Bake" foundation - calculated once at generation time
 const dependencyGraph = buildSubjectGraph(
 subjectId || `subject-${Date.now()}`,
 parsed.concepts
 );
 return {
 stages,
 concepts,
 dependencyGraph,
 metadata: {
 domain: parsed.domainAnalysis.domain,
 role: 'Learner',
 source: 'Documentation',
 conceptCount: concepts.length
 }
 };
}
/**
 * Enhanced transformation with SensaAI Learning Velocity Engine metadata
 */
export function transformToSensaAIContent(parsed: ParsedGeneratedContent, subjectId?: string): {
 stages: LearningStage[];
 concepts: SensaAILearningConcept[];
 dependencyGraph: SubjectGraph;
 metadata: {
 domain: string;
 role: string;
 source: string;
 conceptCount: number;
 trunkConcepts: number;
 diagnosticReady: boolean;
 metadataCompleteness: number;
 };
} {
 const stages = transformToLearningStages(parsed);
 const concepts = transformToSensaAIConcepts(parsed, stages);
 // Build the dependency graph from parsed concepts
 const dependencyGraph = buildSubjectGraph(
 subjectId || `subject-${Date.now()}`,
 parsed.concepts
 );
 // Calculate SensaAI metrics
 const trunkConcepts = concepts.filter(c => c.trunkLevel).length;
 const diagnosticReady = trunkConcepts >= 5; // Need at least 5 for diagnostic
 // Calculate metadata completeness
 let completenessScore = 0;
 let totalChecks = 0;
 concepts.forEach(concept => {
 totalChecks += 6; // 6 checks per concept
 if (concept.keyPoints.length >= 3) completenessScore++;
 if (concept.diagnosticQuestions.length >= 1) completenessScore++;
 if (concept.trunkLevel !== undefined) completenessScore++;
 if (concept.tier) completenessScore++;
 if (concept.complexityScore > 0) completenessScore++;
 if (concept.confusionPairs.length >= 0) completenessScore++; // Always true, validates structure
 });
 const metadataCompleteness = Math.round((completenessScore / totalChecks) * 100);
 return {
 stages,
 concepts,
 dependencyGraph,
 metadata: {
 domain: parsed.domainAnalysis.domain,
 role: 'Learner',
 source: 'Documentation',
 conceptCount: concepts.length,
 trunkConcepts,
 diagnosticReady,
 metadataCompleteness
 }
 };
}
/**
 * Validate that content has sufficient metadata for Learning Velocity Engine
 */
export function validateSensaAIMetadata(concepts: SensaAILearningConcept[]): {
 isValid: boolean;
 issues: string[];
 recommendations: string[];
} {
 const issues: string[] = [];
 const recommendations: string[] = [];
 // Check foundation concepts for diagnostics
 const trunkCount = concepts.filter(c => c.trunkLevel).length;
 if (trunkCount < 5) {
 issues.push(`Only ${trunkCount} trunk concepts found, need at least 5 for diagnostics`);
 recommendations.push('Ensure concepts have minimal prerequisites and concrete examples');
 }
 // Check key points coverage
 const conceptsWithoutKeyPoints = concepts.filter(c => c.keyPoints.length < 3).length;
 if (conceptsWithoutKeyPoints > 0) {
 issues.push(`${conceptsWithoutKeyPoints} concepts have insufficient key points`);
 recommendations.push('Ensure concepts have hook sentences, micro-metaphors, and critical distinctions');
 }
 // Check diagnostic questions
 const conceptsWithoutQuestions = concepts.filter(c => c.diagnosticQuestions.length === 0).length;
 if (conceptsWithoutQuestions > 0) {
 issues.push(`${conceptsWithoutQuestions} concepts lack diagnostic questions`);
 recommendations.push('Add critical distinctions and pattern recognition questions to concepts');
 }
 // Check tier distribution
 const tierCounts = {
 Trunk: concepts.filter(c => c.tier === 'trunk').length,
 Branch: concepts.filter(c => c.tier === 'branch').length,
 Leaf: concepts.filter(c => c.tier === 'leaf').length
 };
 const total = concepts.length;
 const trunkPercent = (tierCounts.Trunk / total) * 100;
 if (trunkPercent < 5 || trunkPercent > 30) {
 issues.push(`Trunk concepts: ${trunkPercent.toFixed(1)}% (target: ~10-20%)`);
 recommendations.push('Adjust concept tree structure to achieve better tier balance');
 }
 return {
 isValid: issues.length === 0,
 issues,
 recommendations
 };
}
