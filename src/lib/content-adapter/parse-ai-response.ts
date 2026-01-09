/**
 * SENSA v2.0 AI Response Parser
 * 
 * Parses and validates AI-generated JSON responses, ensuring they meet
 * SENSA v2.0 requirements for tier classification, dependency graphs,
 * and equation metadata.
 */

import type { LearningConcept } from '@/lib/types/learning';
import type {
    TierType,
    DependencyGraph,
    DependencyGraphNode,
    DependencyGraphEdge,
    EquationMetadata,
    TierDistribution,
} from '@/lib/types/sensa-flow.types';

// ============================================================================
// Types
// ============================================================================

export interface ParsedAIResponse {
    concepts: LearningConcept[];
    dependencyGraph: DependencyGraph;
    tierDistribution: TierDistribution;
    equationMetadata: EquationMetadata;
    validationWarnings: string[];
}

export interface ValidationError {
    field: string;
    message: string;
    conceptId?: string;
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parses AI-generated JSON into SENSA v2.0 format.
 * Validates tier distribution and dependency integrity.
 * 
 * @throws Error if critical fields are missing
 */
export function parseEnhancedAIResponse(rawJSON: unknown): ParsedAIResponse {
    const data = rawJSON as Record<string, unknown>;
    const warnings: string[] = [];

    // Validate required top-level fields
    if (!data.concepts || !Array.isArray(data.concepts)) {
        throw new Error('Invalid AI response: concepts array missing');
    }

    if (!data.dependencyGraph) {
        throw new Error('Invalid AI response: dependencyGraph missing (required for SENSA v2.0)');
    }

    if (!data.equationMetadata) {
        throw new Error('Invalid AI response: equationMetadata missing (required for SENSA v2.0)');
    }

    // Parse concepts with tier validation
    const concepts: LearningConcept[] = (data.concepts as unknown[]).map((c: unknown, index: number) => {
        const concept = c as Record<string, unknown>;
        const errors: ValidationError[] = [];

        // Validate tier at root level
        if (!concept.tier) {
            errors.push({ field: 'tier', message: 'Missing required tier field', conceptId: concept.id as string });
        } else if (!['foundation', 'keystone', 'utility'].includes(concept.tier as string)) {
            errors.push({ field: 'tier', message: `Invalid tier: ${concept.tier}`, conceptId: concept.id as string });
        }

        // Validate dependencies array
        if (!Array.isArray(concept.dependencies)) {
            errors.push({ field: 'dependencies', message: 'Missing dependencies array', conceptId: concept.id as string });
        }

        // Validate outdegree
        if (typeof concept.outdegree !== 'number') {
            errors.push({ field: 'outdegree', message: 'Missing outdegree number', conceptId: concept.id as string });
        }

        // If critical errors, throw
        if (errors.some(e => e.field === 'tier')) {
            throw new Error(`Concept ${index} (${concept.name}) missing required 'tier' field`);
        }

        // Add warnings for non-critical issues
        errors.forEach(e => {
            if (e.field !== 'tier') {
                warnings.push(`Concept ${concept.name}: ${e.message}`);
            }
        });

        return {
            id: (concept.id as string) || `concept-${index}`,
            name: concept.name as string,
            stageId: (concept.stageId as string) || 'stage-1',
            order: (concept.order as number) || index,
            tier: concept.tier as TierType,
            dependencies: (concept.dependencies as string[]) || [],
            outdegree: (concept.outdegree as number) || 0,
            hookSentence: concept.hookSentence as string | undefined,
            mnemonic: concept.mnemonic as LearningConcept['mnemonic'],
            shape: concept.shape as LearningConcept['shape'],
            lifecycle: concept.lifecycle as LearningConcept['lifecycle'],
        } as LearningConcept;
    });

    // Calculate tier distribution
    const tierDistribution = calculateTierDistribution(concepts);

    // Validate tier distribution
    validateTierDistribution(tierDistribution, warnings);

    // Parse dependency graph
    const graphData = data.dependencyGraph as Record<string, unknown>;
    const dependencyGraph: DependencyGraph = {
        nodes: (graphData.nodes as DependencyGraphNode[]) || [],
        edges: (graphData.edges as DependencyGraphEdge[]) || [],
    };

    // Validate dependency graph integrity
    validateDependencyGraph(concepts, dependencyGraph, warnings);

    // Check for circular dependencies
    detectCircularDependencies(dependencyGraph);

    // Parse equation metadata
    const equationMetadata = data.equationMetadata as EquationMetadata;

    return {
        concepts,
        dependencyGraph,
        tierDistribution,
        equationMetadata,
        validationWarnings: warnings,
    };
}

// ============================================================================
// Tier Distribution
// ============================================================================

function calculateTierDistribution(concepts: LearningConcept[]): TierDistribution {
    const counts = { foundation: 0, keystone: 0, utility: 0 };

    for (const concept of concepts) {
        if (concept.tier in counts) {
            counts[concept.tier]++;
        }
    }

    return {
        ...counts,
        total: concepts.length,
    };
}

function validateTierDistribution(dist: TierDistribution, warnings: string[]): void {
    const total = dist.total || 1;
    const foundationPct = (dist.foundation / total) * 100;
    const keystonePct = (dist.keystone / total) * 100;
    const utilityPct = (dist.utility / total) * 100;

    if (foundationPct < 20 || foundationPct > 35) {
        warnings.push(`Foundation tier is ${foundationPct.toFixed(1)}% (expected 25-30%)`);
    }

    if (keystonePct < 25 || keystonePct > 45) {
        warnings.push(`Keystone tier is ${keystonePct.toFixed(1)}% (expected 30-40%)`);
    }

    if (utilityPct < 30 || utilityPct > 45) {
        warnings.push(`Utility tier is ${utilityPct.toFixed(1)}% (expected 35-40%)`);
    }
}

// ============================================================================
// Dependency Graph Validation
// ============================================================================

function validateDependencyGraph(
    concepts: LearningConcept[],
    graph: DependencyGraph,
    warnings: string[]
): void {
    const conceptIds = new Set(concepts.map(c => c.id));
    const nodeIds = new Set(graph.nodes.map(n => n.id));

    // Ensure all concepts appear as nodes
    for (const concept of concepts) {
        if (!nodeIds.has(concept.id)) {
            warnings.push(`Concept ${concept.id} missing from dependency graph nodes`);
        }
    }

    // Ensure all edges reference valid nodes
    for (const edge of graph.edges) {
        if (!conceptIds.has(edge.from)) {
            warnings.push(`Edge references invalid 'from' ID: ${edge.from}`);
        }
        if (!conceptIds.has(edge.to)) {
            warnings.push(`Edge references invalid 'to' ID: ${edge.to}`);
        }
    }
}

// ============================================================================
// Circular Dependency Detection
// ============================================================================

/**
 * Detects circular dependencies in the graph using DFS.
 * Throws an error if a cycle is found.
 */
function detectCircularDependencies(graph: DependencyGraph): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string, path: string[] = []): boolean => {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        path.push(nodeId);

        const outgoingEdges = graph.edges.filter(e => e.from === nodeId);
        for (const edge of outgoingEdges) {
            if (!visited.has(edge.to)) {
                if (hasCycle(edge.to, [...path])) return true;
            } else if (recursionStack.has(edge.to)) {
                throw new Error(`Circular dependency detected: ${path.join(' → ')} → ${edge.to}`);
            }
        }

        recursionStack.delete(nodeId);
        return false;
    };

    for (const node of graph.nodes) {
        if (!visited.has(node.id)) {
            hasCycle(node.id);
        }
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates that a single concept has all required SENSA v2.0 fields.
 */
export function isValidSensaConcept(concept: unknown): concept is LearningConcept {
    const c = concept as Record<string, unknown>;
    return (
        typeof c.id === 'string' &&
        typeof c.name === 'string' &&
        typeof c.tier === 'string' &&
        ['foundation', 'keystone', 'utility'].includes(c.tier) &&
        Array.isArray(c.dependencies) &&
        typeof c.outdegree === 'number'
    );
}

/**
 * Calculates outdegree for each concept based on dependency references.
 */
export function calculateOutdegrees(concepts: LearningConcept[]): Map<string, number> {
    const outdegreeMap = new Map<string, number>();

    // Initialize all to 0
    for (const concept of concepts) {
        outdegreeMap.set(concept.id, 0);
    }

    // Count references
    for (const concept of concepts) {
        for (const depId of concept.dependencies) {
            const current = outdegreeMap.get(depId) || 0;
            outdegreeMap.set(depId, current + 1);
        }
    }

    return outdegreeMap;
}
