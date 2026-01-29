/**
 * Dependency parser for Mind Palace Floor Plan layout.
 * Extracts and analyzes dependency relationships between concepts.
 */

import type { DependencyMetrics, DependencyEdge, SubjectGraph } from '@/shared/types/learning';
import type { ParsedConcept } from '@/features/content-generation/parsers/types';
import { calculateTier, calculateCentralityScore } from './tier-calculator';

/**
 * Infer dependencies from prerequisite text when dependsOn is not available.
 * Matches concept names mentioned in the prerequisite field.
 */
function inferDependenciesFromPrerequisite(
    concept: ParsedConcept,
    allConcepts: ParsedConcept[]
): string[] {
    const prereqText = concept.phase1?.prerequisite?.toLowerCase() || '';
    if (!prereqText || prereqText.includes('none') || prereqText.length < 5) {
        return [];
    }

    const dependencies: string[] = [];

    for (const other of allConcepts) {
        if (other.id === concept.id) continue;

        const otherNameLower = other.name.toLowerCase();
        // Check if the prerequisite text mentions this concept
        if (prereqText.includes(otherNameLower)) {
            dependencies.push(other.name);
        }
        // Also check partial matches for compound concept names
        const nameParts = otherNameLower.split(/[\s-]+/);
        if (nameParts.length > 1) {
            const significantParts = nameParts.filter(p => p.length > 3);
            if (significantParts.some(part => prereqText.includes(part))) {
                if (!dependencies.includes(other.name)) {
                    dependencies.push(other.name);
                }
            }
        }
    }

    return dependencies;
}

/**
 * Extract dependency edges from parsed concepts.
 * Creates edges based on the `dependsOn` arrays in mnemonic data,
 * with fallback to inferring from prerequisite text.
 * 
 * @param concepts - Parsed concepts with mnemonic data
 * @returns Array of dependency edges
 */
export function extractDependencyEdges(concepts: ParsedConcept[]): DependencyEdge[] {
    const edges: DependencyEdge[] = [];
    const nameToIdMap = new Map(concepts.map(c => [c.name.toLowerCase(), c.id]));
    const addedEdges = new Set<string>(); // Prevent duplicates

    for (const concept of concepts) {
        // Priority 1: Strict Connections (Sensa v2.0 Strict Mode)
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
                        weight: 1.0,
                    });
                    addedEdges.add(edgeKey);
                }
            }
            // If we have strict connections, we skip other inferred dependencies to avoid noise
            if (addedEdges.size > 0 && Array.from(addedEdges).some(k => k.startsWith(`${concept.id}->`))) {
                continue;
            }
        }

        // Priority 2: Inferred from dependencies/mnemonic
        // Get explicit dependencies from mnemonic
        let dependsOn = concept.mnemonic?.dependsOn || [];

        // Fallback: infer from prerequisite text if no explicit dependencies
        if (dependsOn.length === 0) {
            dependsOn = inferDependenciesFromPrerequisite(concept, concepts);
        }

        for (const depName of dependsOn) {
            const targetId = nameToIdMap.get(depName.toLowerCase());
            const edgeKey = `${concept.id}->${targetId}`;

            if (targetId && targetId !== concept.id && !addedEdges.has(edgeKey)) {
                edges.push({
                    id: `edge-${concept.id}-${targetId}`,
                    source: concept.id,
                    target: targetId,
                    relationship: 'depends-on',
                    weight: 1.0,
                });
                addedEdges.add(edgeKey);
            }
        }

        // Also create edge from parentName if present
        if (concept.mnemonic?.parentName) {
            const parentId = nameToIdMap.get(concept.mnemonic.parentName.toLowerCase());
            const edgeKey = `${concept.id}->${parentId}`;

            if (parentId && parentId !== concept.id && !addedEdges.has(edgeKey)) {
                edges.push({
                    id: `edge-${concept.id}-${parentId}`,
                    source: concept.id,
                    target: parentId,
                    relationship: 'depends-on',
                    weight: 1.0,
                });
                addedEdges.add(edgeKey);
            }
        }

        // Also use parentId if directly available
        if (concept.mnemonic?.parentId) {
            const parentId = concept.mnemonic.parentId;
            const edgeKey = `${concept.id}->${parentId}`;

            if (parentId !== concept.id && !addedEdges.has(edgeKey)) {
                edges.push({
                    id: `edge-${concept.id}-${parentId}`,
                    source: concept.id,
                    target: parentId,
                    relationship: 'depends-on',
                    weight: 1.0,
                });
                addedEdges.add(edgeKey);
            }
        }
    }

    // If still no edges, create a simple linear chain based on concept order
    // This ensures the graph isn't completely disconnected
    if (edges.length === 0 && concepts.length > 1) {
        for (let i = 1; i < concepts.length; i++) {
            edges.push({
                id: `edge-chain-${concepts[i].id}-${concepts[i - 1].id}`,
                source: concepts[i].id,
                target: concepts[i - 1].id,
                relationship: 'related-to',
                weight: 0.5,
            });
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
            calculatedTier: calculateTier(dependentCount).toLowerCase() as 'foundation' | 'keystone' | 'utility',
            centralityScore: calculateCentralityScore(totalConnections, maxConnections),
            clusterGroup: concept.stageId,
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
        metrics: metricsMap.get(concept.id)!,
    }));

    // Calculate stats
    let foundationCount = 0;
    let keystoneCount = 0;
    let utilityCount = 0;
    let centralHub = '';
    let maxConnections = 0;

    for (const [id, metrics] of metricsMap) {
        switch (metrics.calculatedTier) {
            case 'foundation':
                foundationCount++;
                break;
            case 'keystone':
                keystoneCount++;
                break;
            case 'utility':
                utilityCount++;
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
            foundationCount,
            keystoneCount,
            utilityCount,
            centralHub,
        },
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
    //    optimization to only update neighbors can be done if perf is an issue)
    //    For <100 nodes, O(N) is negligible.
    return calculateDependencyMetrics(allConcepts, edges);
}

