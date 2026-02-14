/**
 * Dependency parser for Mind Palace Floor Plan layout.
 * Extracts and analyzes dependency relationships between concepts.
 */
import type { DependencyMetrics, DependencyEdge, SubjectGraph } from '@/shared/types/learning';
import type { ParsedConcept } from '@/features/content-generation/parsers/types';
import { calculateTier, calculateCentralityScore } from './tier-calculator';
/**
 * Extract dependency edges from parsed concepts.
 * Creates edges strictly from explicit relationship data.
 * 
 * @param concepts - Parsed concepts with mnemonic data
 * @returns Array of dependency edges
 */
export function extractDependencyEdges(concepts: ParsedConcept[]): DependencyEdge[] {
 const edges: DependencyEdge[] = [];
 const nameToIdMap = new Map(concepts.map(c => [c.name.toLowerCase(), c.id]));
 const addedEdges = new Set<string>();
 for (const concept of concepts) {
 let hasConnections = false;
 if (concept.strictConnections && concept.strictConnections.length > 0) {
 for (const conn of concept.strictConnections) {
 const targetId = nameToIdMap.get(conn.target.toLowerCase());
 const edgeKey = `${concept.id}->${targetId}`;
 if (targetId && targetId !== concept.id && !addedEdges.has(edgeKey)) {
 edges.push({
 id: `edge-${concept.id}-${targetId}`,
 source: concept.id,
 target: targetId,
 relationship: conn.type,
 weight: 1.0
 });
 addedEdges.add(edgeKey);
 hasConnections = true;
 }
 }
 }
 if (hasConnections) continue;
 const dependsOn = concept.mnemonic?.dependsOn || [];
 for (const depName of dependsOn) {
 const targetId = nameToIdMap.get(depName.toLowerCase());
 const edgeKey = `${concept.id}->${targetId}`;
 if (targetId && targetId !== concept.id && !addedEdges.has(edgeKey)) {
 edges.push({
 id: `edge-${concept.id}-${targetId}`,
 source: concept.id,
 target: targetId,
 relationship: 'requires',
 weight: 1.0
 });
 addedEdges.add(edgeKey);
 }
 }
 if (concept.mnemonic?.parentName) {
 const parentId = nameToIdMap.get(concept.mnemonic.parentName.toLowerCase());
 const edgeKey = `${concept.id}->${parentId}`;
 if (parentId && parentId !== concept.id && !addedEdges.has(edgeKey)) {
 edges.push({
 id: `edge-${concept.id}-${parentId}`,
 source: concept.id,
 target: parentId,
 relationship: 'is-part-of',
 weight: 1.0
 });
 addedEdges.add(edgeKey);
 }
 }
 if (concept.mnemonic?.parentId) {
 const parentId = concept.mnemonic.parentId;
 const edgeKey = `${concept.id}->${parentId}`;
 if (parentId !== concept.id && !addedEdges.has(edgeKey)) {
 edges.push({
 id: `edge-${concept.id}-${parentId}`,
 source: concept.id,
 target: parentId,
 relationship: 'is-part-of',
 weight: 1.0
 });
 addedEdges.add(edgeKey);
 }
 }
 }
 return edges;
}
/**
 * Calculate dependency metrics for each concept.
 * 
 * @param concepts - Parsed concepts
 * @param edges - Extracted dependency edges
 * @returns Map of conceptId to DependencyMetrics
 */
export function calculateDependencyMetrics(
 concepts: ParsedConcept[],
 edges: DependencyEdge[]
): Map<string, DependencyMetrics> {
 const metricsMap = new Map<string, DependencyMetrics>();
 // Initialize counts
 const dependentCounts = new Map<string, number>();
 const dependencyCounts = new Map<string, number>();
 for (const concept of concepts) {
 dependentCounts.set(concept.id, 0);
 dependencyCounts.set(concept.id, 0);
 }
 // Count dependencies
 for (const edge of edges) {
 // Source depends on target, so target has one more dependent
 dependentCounts.set(
 edge.target,
 (dependentCounts.get(edge.target) || 0) + 1
 );
 // Source has one more dependency
 dependencyCounts.set(
 edge.source,
 (dependencyCounts.get(edge.source) || 0) + 1
 );
 }
 // Find max for centrality normalization
 let maxConnections = 0;
 for (const concept of concepts) {
 const total = (dependentCounts.get(concept.id) || 0) +
 (dependencyCounts.get(concept.id) || 0);
 if (total > maxConnections) maxConnections = total;
 }
 // Build metrics for each concept
 for (const concept of concepts) {
 const dependentCount = dependentCounts.get(concept.id) || 0;
 const dependencyCount = dependencyCounts.get(concept.id) || 0;
 const totalConnections = dependentCount + dependencyCount;
 metricsMap.set(concept.id, {
 conceptId: concept.id,
 conceptName: concept.name,
 dependentCount,
 dependencyCount,
 totalConnections,
 calculatedTier: calculateTier(dependentCount).toLowerCase() as 'trunk' | 'branch' | 'leaf',
 centralityScore: calculateCentralityScore(totalConnections, maxConnections),
 clusterGroup: concept.stageId
 });
 }
 return metricsMap;
}
/**
 * Build the full subject graph from parsed concepts.
 * This is the main entry point for dependency analysis.
 * 
 * @param subjectId - ID of the subject being generated
 * @param concepts - Parsed concepts from content generation
 * @returns Complete SubjectGraph with nodes, edges, and stats
 */
export function buildSubjectGraph(
 subjectId: string,
 concepts: ParsedConcept[]
): SubjectGraph {
 const edges = extractDependencyEdges(concepts);
 const metricsMap = calculateDependencyMetrics(concepts, edges);
 // Build nodes array
 const nodes = concepts.map(concept => ({
 id: concept.id,
 name: concept.name,
 stageId: concept.stageId,
 metrics: metricsMap.get(concept.id)!
 }));
 // Calculate stats
 let trunkCount = 0;
 let branchCount = 0;
 let leafCount = 0;
 let centralHub = '';
 let maxConnections = 0;
 for (const [id, metrics] of metricsMap) {
 switch (metrics.calculatedTier) {
 case 'trunk':
 trunkCount++;
 break;
 case 'branch':
 branchCount++;
 break;
 case 'leaf':
 leafCount++;
 break;
 }
 if (metrics.totalConnections > maxConnections) {
 maxConnections = metrics.totalConnections;
 centralHub = id;
 }
 }
 return {
 subjectId,
 generatedAt: new Date().toISOString(),
 nodes,
 edges,
 stats: {
 totalNodes: nodes.length,
 totalEdges: edges.length,
 trunkCount,
 branchCount,
 leafCount,
 centralHub
 }
 };
}
/**
 * Incrementally update metrics for a subset of concepts (Surgical Merge).
 * Only recalculates stats for the affected node and its direct neighbors.
 */
export function updateIncrementalMetrics(
 allConcepts: ParsedConcept[],
 affectedConceptId: string
): Map<string, DependencyMetrics> {
 // 1. Re-extract edges (fast for 70 items)
 const edges = extractDependencyEdges(allConcepts);
 // 2. Identify blast radius: affected node + neighbors
 const neighbors = new Set<string>();
 neighbors.add(affectedConceptId);
 edges.forEach(edge => {
 if (edge.source === affectedConceptId) neighbors.add(edge.target);
 if (edge.target === affectedConceptId) neighbors.add(edge.source);
 });
 // 3. Recalculate full metrics (safest to ensure global consistency, 
 // optimization to only update neighbors can be done if perf is an issue)
 // For <100 nodes, O(N) is negligible.
 return calculateDependencyMetrics(allConcepts, edges);
}
