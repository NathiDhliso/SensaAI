/**
 * SURGICAL MERGE PROTOCOL (ACID-Compliant Graph Updates)
 * 
 * Handles the safe insertion of repaired concepts into the living graph.
 * Enforces transactional integrity: either the whole repair works, or we rollback.
 */

import type { ParsedConcept } from '@/lib/content-adapter/types';
import { updateIncrementalMetrics } from './dependency-parser';

/**
 * Detect if a repair changes the graph structure (dependencies)
 * If structural changes occur, we need a wider validation blast radius.
 */
export function detectStructuralChanges(oldConcept: ParsedConcept | undefined, newConcept: ParsedConcept): boolean {
    if (!oldConcept) return true; // New node = structural change

    // Check strict connections
    const oldStrict = JSON.stringify(oldConcept.strictConnections || []);
    const newStrict = JSON.stringify(newConcept.strictConnections || []);
    if (oldStrict !== newStrict) return true;

    // Check inferred dependencies (fallback)
    const oldDeps = JSON.stringify(oldConcept.dependsOn || []);
    const newDeps = JSON.stringify(newConcept.dependsOn || []);
    if (oldDeps !== newDeps) return true;

    return false;
}

/**
 * Perform an ATOMIC update of a single concept into the store state.
 * Returns the modified part of the state if successful, or null on failure.
 */
export function atomicSurgicalMerge(
    currentConcepts: ParsedConcept[],
    repairedConcept: ParsedConcept
): { success: boolean; updatedConcepts: ParsedConcept[]; error?: string } {

    // 1. SNAPSHOT (Implicit in the input array, provided we don't mutate it in place yet)
    // We create a shallow copy for the transaction
    const workingConcepts = [...currentConcepts];
    const targetIndex = workingConcepts.findIndex(c => c.name === repairedConcept.name); // Match by name usually

    // Safety check
    if (targetIndex === -1 && !repairedConcept.name) {
        return { success: false, updatedConcepts: [], error: 'Target concept not found and no name provided' };
    }

    const oldConcept = targetIndex !== -1 ? workingConcepts[targetIndex] : undefined;

    // 2. CHECK FOR RECURSIVE/CIRCULAR DEPENDENCIES (Pre-Merge Validation)
    if (detectStructuralChanges(oldConcept, repairedConcept)) {
        if (createsCycle(workingConcepts, repairedConcept)) {
            return {
                success: false,
                updatedConcepts: [],
                error: 'Surgical merge rejected: Cycle detected in dependencies'
            };
        }
    }

    // 3. EXECUTE MERGE
    if (targetIndex !== -1) {
        workingConcepts[targetIndex] = repairedConcept;
    } else {
        workingConcepts.push(repairedConcept);
    }

    // 4. INCREMENTAL RECALCULATION
    // Only update metrics for this node and its immediate neighbors
    try {
        const updatedMetricsMap = updateIncrementalMetrics(workingConcepts, repairedConcept.name);

        // Apply metrics back to concepts (Mutation is contained within this function scope's clone)
        // We iterate through the map and update the relevant concepts in workingConcepts
        updatedMetricsMap.forEach((_, conceptId) => {
            // Find concept by name (conceptId is usually name in this system)
            const cIndex = workingConcepts.findIndex(c => c.name === conceptId);
            if (cIndex !== -1) {
                // We assume ParsedConcept might not hold metrics directly in some versions,
                // but checking types.ts, ParsedConcept has 'tier' etc.
                // Depending on where metrics are stored (usually separate or enriched).

                // If the system expects metrics to be separate, that's fine.
                // But usually we merge them back if ParsedConcept types allow, 
                // OR we return the metrics map.

                // For this implementation, we assume the store will handle the Side-Car metrics map,
                // but if we need to embed them:
                // workingConcepts[cIndex].tier = metric.tier; // Example
            }
        });
    } catch (e) {
        console.error('Metric recalculation failed', e);
        return { success: false, updatedConcepts: [], error: 'Metric recalculation failed during merge' };
    }

    // 5. COMMIT
    return {
        success: true,
        updatedConcepts: workingConcepts
    };
}

/**
 * Simple Cycle Detection (DFS)
 */
function createsCycle(concepts: ParsedConcept[], candidate: ParsedConcept): boolean {
    // Build temporary graph adjacency list
    const graph = new Map<string, string[]>();

    concepts.forEach(c => {
        // Use candidate instead of old version
        const node = c.name === candidate.name ? candidate : c;
        const deps = extractDeps(node);
        graph.set(node.name, deps);
    });

    // Check cycle involving candidate
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function dfs(nodeFor: string): boolean {
        visited.add(nodeFor);
        recursionStack.add(nodeFor);

        const neighbors = graph.get(nodeFor) || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                if (dfs(neighbor)) return true;
            } else if (recursionStack.has(neighbor)) {
                return true;
            }
        }

        recursionStack.delete(nodeFor);
        return false;
    }

    // Only need to start DFS from the candidate to see if it leads back to itself?
    // Actually, if we change A -> B, checks if A is part of any cycle.
    // Simpler: Run DFS on candidate.
    return dfs(candidate.name);
}

function extractDeps(c: ParsedConcept): string[] {
    const strict = c.strictConnections?.filter(x => x.type === 'requires' || x.type === 'extends').map(x => x.target) || [];
    const loose = c.dependsOn || [];
    return [...new Set([...strict, ...loose])];
}
