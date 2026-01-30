/**
 * Content Validation Utilities
 * 
 * These functions validate generated content for quality issues:
 * - Circular definitions (concept name in definition)
 * - Compound words (nonsensical anchors like "House House+")
 * - Dependency cycles (A→B→C→A)
 * - Invalid dependency references
 */

interface Concept {
  name: string;
  tier?: string;
  dependsOn?: string[];
  hookSentence?: string;
  shape?: {
    simpleCore?: string;
  };
  mnemonic?: {
    anchor?: string;
  };
}

/**
 * Detects if a concept name appears in its own definition (circular definition)
 * 
 * Examples:
 * - hasCircularDefinition("API Gateway", "API Gateway is a gateway for APIs") → true
 * - hasCircularDefinition("Load Balancer", "Distributes traffic across servers") → false
 */
export function hasCircularDefinition(conceptName: string, text: string): boolean {
  if (!conceptName || !text) return false;

  // Normalize both strings (lowercase, remove non-alphanumeric)
  const normalized = conceptName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const textNormalized = text.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Check if concept name appears in text
  if (textNormalized.includes(normalized)) {
    return true;
  }

  // Check for patterns like "X is X" or "X provides X"
  const patterns = [
    new RegExp(`${normalized}\\s+is\\s+${normalized}`, 'i'),
    new RegExp(`${normalized}\\s+provides\\s+${normalized}`, 'i'),
    new RegExp(`${normalized}\\s+enables\\s+${normalized}`, 'i'),
    new RegExp(`${normalized}\\s+for\\s+${normalized}`, 'i'),
  ];

  return patterns.some(pattern => pattern.test(text));
}

/**
 * Detects compound word patterns in mnemonic anchors
 * 
 * Examples:
 * - isCompoundWord("House House+") → true
 * - isCompoundWord("Castle (Castle + Scroll)") → true
 * - isCompoundWord("CloudCake") → true (if concept is "Cloud")
 * - isCompoundWord("Key+Person") → true
 * - isCompoundWord("Volcano 🌋") → false
 */
export function isCompoundWord(anchor: string, conceptName?: string): boolean {
  if (!anchor) return false;

  // Patterns to detect:
  // 1. "X X+" - e.g., "House House+"
  // 2. "X (X + Y)" - e.g., "Castle (Castle + Scroll)"
  // 3. "X X " - e.g., "Network Network "
  // 4. Contains "+" or parentheses (usually indicates forced combination)
  // 5. "XY" where X is the concept name (e.g., "CloudCake" for "Cloud")
  const patterns = [
    /(\w+)\s+\1\+/,                    // "House House+"
    /(\w+)\s+\(\1\s+\+/,               // "Castle (Castle +"
    /(\w+)\s+\1\s/,                    // "Network Network "
    /(\w+)\s+\(\1\)/,                  // "Word (Word)"
    /\+/,                              // Contains "+"
    /\([^)]*\+[^)]*\)/,               // Contains "(... + ...)"
  ];

  if (patterns.some(pattern => pattern.test(anchor))) {
    return true;
  }

  // Check if anchor starts with concept name (e.g., "CloudCake" for "Cloud")
  if (conceptName) {
    const normalizedConcept = conceptName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedAnchor = anchor.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // If anchor starts with concept name and has more characters, it's likely a compound
    if (normalizedAnchor.startsWith(normalizedConcept) && normalizedAnchor.length > normalizedConcept.length) {
      return true;
    }
  }

  return false;
}

/**
 * Detects circular dependencies in concept graph using DFS
 * 
 * Examples:
 * - hasCycle([{name: "A", dependsOn: ["B"]}, {name: "B", dependsOn: ["A"]}]) → true
 * - hasCycle([{name: "A", dependsOn: []}, {name: "B", dependsOn: ["A"]}]) → false
 */
export function hasCycle(concepts: Concept[]): boolean {
  if (!concepts || concepts.length === 0) return false;

  // Build adjacency list
  const graph = new Map<string, string[]>();
  for (const concept of concepts) {
    graph.set(concept.name, concept.dependsOn || []);
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(node: string): boolean {
    visited.add(node);
    recStack.add(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true; // Cycle detected
      }
    }

    recStack.delete(node);
    return false;
  }

  // Check each component
  for (const concept of concepts) {
    if (!visited.has(concept.name)) {
      if (dfs(concept.name)) return true;
    }
  }

  return false;
}

/**
 * Validates that all dependency references exist in the concept list
 * 
 * Returns array of invalid dependencies: [{concept, invalidDep}, ...]
 */
export function validateDependencies(concepts: Concept[]): Array<{concept: string; invalidDep: string}> {
  if (!concepts || concepts.length === 0) return [];

  const conceptNames = new Set(concepts.map(c => c.name));
  const invalidDeps: Array<{concept: string; invalidDep: string}> = [];

  for (const concept of concepts) {
    if (!concept.dependsOn) continue;

    for (const dep of concept.dependsOn) {
      if (!conceptNames.has(dep)) {
        invalidDeps.push({
          concept: concept.name,
          invalidDep: dep
        });
      }
    }
  }

  return invalidDeps;
}

/**
 * Validates tier hierarchy rules:
 * - Foundation concepts: 0-2 dependencies
 * - Keystone concepts: should depend on foundation
 * - Utility concepts: should depend on keystone or foundation
 */
export function validateTierHierarchy(concepts: Concept[]): Array<{concept: string; issue: string}> {
  if (!concepts || concepts.length === 0) return [];

  const issues: Array<{concept: string; issue: string}> = [];
  const tierMap = new Map<string, string>();

  // Build tier map
  for (const concept of concepts) {
    if (concept.tier) {
      tierMap.set(concept.name, concept.tier);
    }
  }

  for (const concept of concepts) {
    if (!concept.tier || !concept.dependsOn) continue;

    // Foundation concepts should have 0-2 dependencies
    if (concept.tier === 'foundation' && concept.dependsOn.length > 2) {
      issues.push({
        concept: concept.name,
        issue: `Foundation concept has ${concept.dependsOn.length} dependencies (max 2 allowed)`
      });
    }

    // Keystone concepts should depend on foundation
    if (concept.tier === 'keystone') {
      for (const dep of concept.dependsOn) {
        const depTier = tierMap.get(dep);
        if (depTier && depTier !== 'foundation') {
          issues.push({
            concept: concept.name,
            issue: `Keystone concept depends on ${depTier} concept "${dep}" (should depend on foundation)`
          });
        }
      }
    }

    // Utility concepts should depend on keystone or foundation
    if (concept.tier === 'utility') {
      for (const dep of concept.dependsOn) {
        const depTier = tierMap.get(dep);
        if (depTier && depTier === 'utility') {
          issues.push({
            concept: concept.name,
            issue: `Utility concept depends on another utility concept "${dep}" (should depend on keystone/foundation)`
          });
        }
      }
    }
  }

  return issues;
}
