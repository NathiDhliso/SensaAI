/**
 * Build AI - Phase 2: Build the Web
 * 
 * Provides AI suggestions for concept map building:
 * - Connection suggestions between concepts
 * - Gap detection for missing connections
 * - Label validation for connection descriptions
 */
import type { LearningConcept } from '@/shared/types/learning';
import { getPersonaResponse, type PersonaId } from '@/shared/utils/persona';
const GENERIC_STOP_WORDS = new Set([
 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'by', 'as',
 'is', 'are', 'was', 'were', 'be', 'been', 'being',
 'a', 'an', 'this', 'that', 'these', 'those',
 'it', 'its', 'from', 'into', 'onto',
 'concept', 'intro', 'introduction', 'summary', 'overview', 'basic', 'basics',
 'create', 'creating', 'update', 'updating', 'configure', 'configuring',
 'monitor', 'monitoring', 'optimize', 'optimizing',
 'define', 'defining', 'manage', 'management', 'analysis', 'analytics',
 'finding', 'using', 'advanced', 'techniques', 'methods', 'problems', 'involving',
 'understanding', 'applying', 'working', 'exploring', 'studying'
]);
const TIER_CONNECTION_CAPS: Record<string, number> = { trunk: 0, branch: 2, leaf: 3 };
const MAX_TOTAL_SUGGESTIONS = 20;
export interface ConnectionSuggestion {
 id: string;
 fromConceptId: string;
 toConceptId: string;
 suggestedLabel: string;
 confidence: number;
 reasoning: string;
}
export interface GapDetection {
 conceptId: string;
 conceptName: string;
 message: string;
 suggestedConnections: string[];
}
export interface LabelValidation {
 isValid: boolean;
 suggestion?: string;
 reasoning: string;
}
/**
 * Check if a concept has an AI-generated connection to another concept
 * Returns the connection type (requires, enables, is-part-of, is-type-of, causes, constrains) or null
 */
function getAIConnection(conceptA: LearningConcept, conceptB: LearningConcept): { type: string; isReverse: boolean } | null {
 // Check if conceptA has a connection to conceptB
 if (conceptA.connections && Array.isArray(conceptA.connections)) {
 const match = conceptA.connections.find(
 (c: { target?: string; type?: string }) =>
 c.target && c.target.toLowerCase() === conceptB.name.toLowerCase()
 );
 if (match && match.type) {
 return { type: match.type, isReverse: false };
 }
 }
 // Check reverse: if conceptB has a connection to conceptA
 if (conceptB.connections && Array.isArray(conceptB.connections)) {
 const match = conceptB.connections.find(
 (c: { target?: string; type?: string }) =>
 c.target && c.target.toLowerCase() === conceptA.name.toLowerCase()
 );
 if (match && match.type) {
 return { type: match.type, isReverse: true };
 }
 }
 return null;
}
/**
 * Suggest connections between concepts based on their relationships
 * PRIORITY: AI-generated connections > Keyword matching
 * Caps: max 3 connections per concept, max 20 total suggestions
 */
export function suggestConnections(
 concepts: LearningConcept[],
 existingConnections: Array<{ fromId: string; toId: string }>,
 subjectName?: string
): ConnectionSuggestion[] {
 const suggestions: ConnectionSuggestion[] = [];
 const existingPairs = new Set(
 existingConnections.map(c => `${c.fromId}-${c.toId}`)
 );
 const connectionCount = new Map<string, number>();
 for (const conn of existingConnections) {
 connectionCount.set(conn.fromId, (connectionCount.get(conn.fromId) || 0) + 1);
 connectionCount.set(conn.toId, (connectionCount.get(conn.toId) || 0) + 1);
 }
 const subjectTokens = subjectName
 ? new Set(cleanTokens(subjectName, new Set()))
 : new Set<string>();
 const nameWordFreq = new Map<string, number>();
 for (const c of concepts) {
 const tokens = cleanTokens(c.name, new Set());
 for (const t of tokens) {
 nameWordFreq.set(t, (nameWordFreq.get(t) || 0) + 1);
 }
 }
 const highFreqWords = new Set<string>();
 const freqThreshold = Math.max(2, Math.floor(concepts.length * 0.35));
 for (const [word, count] of nameWordFreq) {
 if (count >= freqThreshold) highFreqWords.add(word);
 }
 const effectiveStopWords = new Set([...GENERIC_STOP_WORDS, ...subjectTokens, ...highFreqWords]);
 const conceptById = new Map(concepts.map(c => [c.id, c]));
 const suggestionCount = new Map<string, number>();
 const canSuggestFor = (conceptId: string) => {
 const concept = conceptById.get(conceptId);
 const cap = TIER_CONNECTION_CAPS[concept?.tier || 'leaf'] ?? 3;
 const existing = connectionCount.get(conceptId) || 0;
 const pending = suggestionCount.get(conceptId) || 0;
 return (existing + pending) < cap;
 };
 for (let i = 0; i < concepts.length; i++) {
 for (let j = i + 1; j < concepts.length; j++) {
 if (suggestions.length >= MAX_TOTAL_SUGGESTIONS) break;
 const conceptA = concepts[i];
 const conceptB = concepts[j];
 if (!canSuggestFor(conceptA.id) || !canSuggestFor(conceptB.id)) continue;
 if (conceptA.tier === 'leaf' && conceptB.tier === 'leaf') {
 const branchA = (conceptA.parentName || '').toLowerCase();
 const branchB = (conceptB.parentName || '').toLowerCase();
 if (branchA && branchB && branchA !== branchB) continue;
 }
 const pairKey = `${conceptA.id}-${conceptB.id}`;
 const reversePairKey = `${conceptB.id}-${conceptA.id}`;
 if (existingPairs.has(pairKey) || existingPairs.has(reversePairKey)) {
 continue;
 }
 const aiConnection = getAIConnection(conceptA, conceptB);
 if (aiConnection) {
 const fromId = aiConnection.isReverse ? conceptB.id : conceptA.id;
 const toId = aiConnection.isReverse ? conceptA.id : conceptB.id;
 suggestions.push({
 id: `suggestion-${Date.now()}-${i}-${j}`,
 fromConceptId: fromId,
 toConceptId: toId,
 suggestedLabel: aiConnection.type,
 confidence: 0.90,
 reasoning: `AI-generated: "${conceptA.name}" ${aiConnection.type} "${conceptB.name}"`
 });
 suggestionCount.set(fromId, (suggestionCount.get(fromId) || 0) + 1);
 suggestionCount.set(toId, (suggestionCount.get(toId) || 0) + 1);
 continue;
 }
 const connection = findConnectionType(conceptA, conceptB, effectiveStopWords);
 if (connection && connection.confidence >= 0.7) {
 suggestions.push({
 id: `suggestion-${Date.now()}-${i}-${j}`,
 fromConceptId: conceptA.id,
 toConceptId: conceptB.id,
 suggestedLabel: connection.label,
 confidence: connection.confidence,
 reasoning: connection.reasoning
 });
 suggestionCount.set(conceptA.id, (suggestionCount.get(conceptA.id) || 0) + 1);
 suggestionCount.set(conceptB.id, (suggestionCount.get(conceptB.id) || 0) + 1);
 }
 }
 if (suggestions.length >= MAX_TOTAL_SUGGESTIONS) break;
 }
 return suggestions.sort((a, b) => b.confidence - a.confidence);
}
const STRUCTURAL_PATTERNS: Array<{
 keywords: string[];
 type: string;
 reasoning: string;
}> = [
 { keywords: ['require', 'requires', 'prerequisite', 'depend', 'depends', 'needs', 'before', 'prior'], type: 'requires', reasoning: 'Prerequisite relationship' },
 { keywords: ['enable', 'enables', 'unlock', 'unlocks', 'allow', 'allows', 'makes possible'], type: 'enables', reasoning: 'Capability chain' },
 { keywords: ['part', 'component', 'within', 'inside', 'contains', 'composed', 'element', 'member'], type: 'is-part-of', reasoning: 'Part-whole composition' },
 { keywords: ['type', 'kind', 'variant', 'instance', 'category', 'class', 'form', 'subtype'], type: 'is-type-of', reasoning: 'Taxonomic classification' },
 { keywords: ['cause', 'causes', 'result', 'results', 'produces', 'triggers', 'leads', 'creates'], type: 'causes', reasoning: 'Causal chain' },
 { keywords: ['constrain', 'constrains', 'limit', 'limits', 'restrict', 'governs', 'bounds', 'rule', 'policy'], type: 'constrains', reasoning: 'Boundary condition' }
];
function findConnectionType(
 conceptA: LearningConcept,
 conceptB: LearningConcept,
 stopWords: Set<string>
): { label: string; confidence: number; reasoning: string } | null {
 const wordsA = extractKeywords(conceptA, stopWords);
 const wordsB = extractKeywords(conceptB, stopWords);
 const sharedWords = wordsA.filter(w => wordsB.includes(w));
 if (sharedWords.length < 2) return null;
 const confidence = Math.min(0.9, 0.3 + (sharedWords.length * 0.15));
 const descWordsA = extractDescriptionKeywords(conceptA, stopWords);
 const descWordsB = extractDescriptionKeywords(conceptB, stopWords);
 const descWords = [...descWordsA, ...descWordsB];
 for (const pattern of STRUCTURAL_PATTERNS) {
 if (descWords.some(w => pattern.keywords.includes(w.toLowerCase()))) {
 return { label: pattern.type, confidence: Math.max(confidence, 0.75), reasoning: pattern.reasoning };
 }
 }
 if (sharedWords.length >= 4) {
 return { label: 'enables', confidence: confidence * 0.85, reasoning: `Strong overlap: ${sharedWords.slice(0, 3).join(', ')}` };
 }
 return null;
}
function extractKeywords(concept: LearningConcept, stopWords: Set<string>): string[] {
 const words: string[] = [];
 words.push(...cleanTokens(concept.name, stopWords));
 if (concept.keyPoints) {
 concept.keyPoints.forEach(point => {
 words.push(...cleanTokens(point, stopWords));
 });
 }
 return [...new Set(words)];
}
function extractDescriptionKeywords(concept: LearningConcept, stopWords: Set<string>): string[] {
 const words: string[] = [];
 if (concept.keyPoints) {
 concept.keyPoints.forEach(point => words.push(...cleanTokens(point, stopWords)));
 }
 if (concept.technicalDetails) {
 words.push(...cleanTokens(concept.technicalDetails, stopWords));
 }
 return [...new Set(words)];
}
function cleanTokens(text: string, stopWords: Set<string>): string[] {
 return text.toLowerCase()
 .split(/[^a-z0-9]+/i) // Split by non-alphanumeric
 .filter(w => w.length > 2) // Filter very short words
 .filter(w => !stopWords.has(w));
}
/**
 * Detect concepts that might be missing connections
 */
/**
 * Detect concepts that might be missing connections
 */
export function detectGaps(
 concepts: LearningConcept[],
 nodesOnMap: string[],
 connections: Array<{ fromId: string; toId: string }>,
 subjectName?: string
): GapDetection[] {
 const gaps: GapDetection[] = [];
 const subjectTokens = subjectName
 ? new Set(cleanTokens(subjectName, new Set()))
 : new Set<string>();
 const effectiveStopWords = new Set([...GENERIC_STOP_WORDS, ...subjectTokens]);
 const avgConnections = nodesOnMap.length > 0
 ? connections.length / nodesOnMap.length
 : 0;
 for (const nodeId of nodesOnMap) {
 const concept = concepts.find(c => c.id === nodeId);
 if (!concept) continue;
 const nodeConnCount = connections.filter(
 c => c.fromId === nodeId || c.toId === nodeId
 ).length;
 if (nodeConnCount === 0) {
 gaps.push({
 conceptId: nodeId,
 conceptName: concept.name,
 message: `"${concept.name}" has no connections. How does it relate to other concepts?`,
 suggestedConnections: findPotentialConnections(concept, concepts, nodesOnMap, effectiveStopWords)
 });
 } else if (nodeConnCount === 1 && avgConnections < 1.5 && nodesOnMap.length > 3) {
 gaps.push({
 conceptId: nodeId,
 conceptName: concept.name,
 message: `"${concept.name}" only has one connection. Are there more relationships?`,
 suggestedConnections: findPotentialConnections(concept, concepts, nodesOnMap, effectiveStopWords)
 });
 }
 }
 return gaps.slice(0, 3);
}
/**
 * Find potential connections for a concept
 */
function findPotentialConnections(
 concept: LearningConcept,
 allConcepts: LearningConcept[],
 nodesOnMap: string[],
 stopWords: Set<string>
): string[] {
 const keywords = extractKeywords(concept, stopWords);
 const potentials: string[] = [];
 for (const other of allConcepts) {
 if (other.id === concept.id) continue;
 if (!nodesOnMap.includes(other.id)) continue;
 const otherKeywords = extractKeywords(other, stopWords);
 const shared = keywords.filter(k => otherKeywords.includes(k));
 // Stricter threshold for gap suggestions
 if (shared.length > 1) {
 potentials.push(other.name);
 }
 }
 return potentials.slice(0, 3);
}
/**
 * Validate a connection label
 */
export function validateConnectionLabel(
 label: string,
 _fromConcept: LearningConcept,
 _toConcept: LearningConcept
): LabelValidation {
 const labelLower = label.toLowerCase().trim();
 // Check for placeholder labels
 if (labelLower === '?' || labelLower === '' || labelLower === 'connects to') {
 return {
 isValid: false,
 reasoning: 'Please describe HOW these concepts relate'
 };
 }
 const vagueLabels = ['relates to', 'connects', 'is related', 'link', 'related to', 'relates', 'associated', 'connected to', 'goes with'];
 if (vagueLabels.includes(labelLower)) {
 return {
 isValid: false,
 reasoning: 'Ask yourself: requires, enables, is-part-of, is-type-of, causes, or constrains?'
 };
 }
 return {
 isValid: true,
 reasoning: 'Good descriptive label'
 };
}
/**
 * Get coach message for building phase
 */
export function getBuildCoachMessage(
 personaId: PersonaId,
 situation: 'intro' | 'encouragement' | 'struggle' | 'success'
): string {
 return getPersonaResponse(personaId, 'build', situation);
}
