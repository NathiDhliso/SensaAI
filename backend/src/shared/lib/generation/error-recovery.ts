/**
 * Error Recovery System
 * 
 * Handles partial failures and retry logic:
 * - Save completed concepts when phase fails mid-execution
 * - Retry only missing concepts
 * - Merge retry results with existing concepts
 * - Break dependency cycles
 */

import { Phase2Input, Phase2Output, executePhase2 } from './multi-phase-orchestrator.js';
import { hasCycle } from '../validation/content-validators.js';

export interface PartialGenerationState {
  completedConcepts: Phase2Output['concepts'];
  missingConceptNames: string[];
  retryCount: number;
  lastError?: string;
}

export interface RecoveryOptions {
  maxRetries?: number;
  savePartialResults?: boolean;
}

/**
 * Save partial generation state when Phase 2 fails mid-execution
 */
export function savePartialState(
  completedConcepts: Phase2Output['concepts'],
  allConceptNames: string[]
): PartialGenerationState {
  const completedNames = new Set(completedConcepts.map(c => c.name));
  const missingConceptNames = allConceptNames.filter(name => !completedNames.has(name));

  return {
    completedConcepts,
    missingConceptNames,
    retryCount: 0
  };
}

/**
 * Retry generation for missing concepts only
 */
export async function retryMissingConcepts(
  state: PartialGenerationState,
  phase2Input: Phase2Input,
  options: RecoveryOptions = {}
): Promise<Phase2Output> {
  const maxRetries = options.maxRetries || 3;

  if (state.retryCount >= maxRetries) {
    throw new Error(`Max retries (${maxRetries}) exceeded. ${state.missingConceptNames.length} concepts still missing.`);
  }

  // Filter to only missing concepts
  const missingConcepts = phase2Input.concepts.filter(c =>
    state.missingConceptNames.includes(c.name)
  );

  if (missingConcepts.length === 0) {
    // All concepts completed
    return { concepts: state.completedConcepts };
  }

  try {
    // Retry with only missing concepts
    const retryInput: Phase2Input = {
      ...phase2Input,
      concepts: missingConcepts
    };

    const retryOutput = await executePhase2(retryInput);

    // Merge with existing concepts
    const mergedConcepts = [
      ...state.completedConcepts,
      ...retryOutput.concepts
    ];

    return { concepts: mergedConcepts };
  } catch (error) {
    // Update state and retry
    const newState: PartialGenerationState = {
      ...state,
      retryCount: state.retryCount + 1,
      lastError: error instanceof Error ? error.message : 'Unknown error'
    };

    return retryMissingConcepts(newState, phase2Input, options);
  }
}

/**
 * Mark missing concepts as "pending" after max retries
 */
export function markConceptsAsPending(
  state: PartialGenerationState
): Phase2Output {
  // Create placeholder concepts for missing ones
  const pendingConcepts = state.missingConceptNames.map(name => ({
    name,
    tier: 'utility' as const,
    dependsOn: [],
    cognitiveLevel: 'understand',
    shape: {
      simpleCore: '[Pending generation - retry later]',
      highStakesExample: '[Pending generation - retry later]',
      analogicalModel: '[Pending generation - retry later]',
      patternRecognition: {
        question: '[Pending generation - retry later]',
        answer: '[Pending generation - retry later]'
      },
      eliminationLogic: '[Pending generation - retry later]'
    },
    lifecycle: {
      phase1: {
        hookSentence: '[Pending generation - retry later]',
        prerequisite: 'None',
        execution: '[Pending generation - retry later]'
      },
      phase2: ['[Pending generation - retry later]'],
      phase3: {
        tool: '[Pending generation - retry later]',
        metrics: ['[Pending generation - retry later]']
      }
    },
    mnemonic: {
      tier: 'utility' as const,
      anchor: '⏳ Pending',
      story: 'This concept is pending generation. Please retry later.',
      parentName: undefined
    },
    whyYouNeed: '[Pending generation - retry later]',
    realWorldExample: '[Pending generation - retry later]',
    commonPitfalls: ['[Pending generation - retry later]']
  }));

  return {
    concepts: [
      ...state.completedConcepts,
      ...pendingConcepts
    ]
  };
}

/**
 * Break circular dependencies by removing lowest-confidence edge
 * 
 * Confidence heuristic: Foundation concepts are higher confidence than utility
 */
export function breakCycles(concepts: Phase2Output['concepts']): Phase2Output['concepts'] {
  if (!hasCycle(concepts)) {
    return concepts; // No cycles to break
  }

  // Find cycle using DFS
  const graph = new Map<string, string[]>();
  for (const concept of concepts) {
    graph.set(concept.name, concept.dependsOn || []);
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycleEdges: Array<{ from: string; to: string }> = [];

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recStack.add(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path, node]);
      } else if (recStack.has(neighbor)) {
        // Found cycle
        cycleEdges.push({ from: node, to: neighbor });
      }
    }

    recStack.delete(node);
  }

  // Find all cycles
  for (const concept of concepts) {
    if (!visited.has(concept.name)) {
      dfs(concept.name, []);
    }
  }

  if (cycleEdges.length === 0) {
    return concepts; // No cycles found (shouldn't happen)
  }

  // Calculate confidence for each edge in cycle
  const tierConfidence = { foundation: 3, keystone: 2, utility: 1 };
  const edgeConfidence = cycleEdges.map(edge => {
    const fromConcept = concepts.find(c => c.name === edge.from);
    const toConcept = concepts.find(c => c.name === edge.to);
    const confidence = 
      (tierConfidence[fromConcept?.tier || 'utility'] || 1) +
      (tierConfidence[toConcept?.tier || 'utility'] || 1);
    return { edge, confidence };
  });

  // Remove edge with lowest confidence
  edgeConfidence.sort((a, b) => a.confidence - b.confidence);
  const edgeToRemove = edgeConfidence[0].edge;

  // Create new concepts array with edge removed
  const fixedConcepts = concepts.map(concept => {
    if (concept.name === edgeToRemove.from) {
      return {
        ...concept,
        dependsOn: concept.dependsOn.filter(dep => dep !== edgeToRemove.to)
      };
    }
    return concept;
  });

  // Recursively break remaining cycles
  return breakCycles(fixedConcepts);
}

/**
 * Regenerate specific fields that failed validation
 */
export async function regenerateFields(
  concepts: Phase2Output['concepts'],
  issues: Array<{ conceptName: string; field: string; issue: string }>,
  phase2Input: Phase2Input
): Promise<Phase2Output['concepts']> {
  // Group issues by concept
  const conceptIssues = new Map<string, string[]>();
  for (const issue of issues) {
    if (!conceptIssues.has(issue.conceptName)) {
      conceptIssues.set(issue.conceptName, []);
    }
    conceptIssues.get(issue.conceptName)!.push(issue.field);
  }

  // For now, regenerate entire concepts with issues
  // TODO: Implement field-level regeneration for efficiency
  const conceptsToRegenerate = Array.from(conceptIssues.keys());
  const conceptsToKeep = concepts.filter(c => !conceptsToRegenerate.includes(c.name));

  const regenerateInput: Phase2Input = {
    ...phase2Input,
    concepts: phase2Input.concepts.filter(c => conceptsToRegenerate.includes(c.name))
  };

  const regeneratedOutput = await executePhase2(regenerateInput);

  return [
    ...conceptsToKeep,
    ...regeneratedOutput.concepts
  ];
}
