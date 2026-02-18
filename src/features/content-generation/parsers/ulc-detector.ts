/**
 * Universal Life Cycle (ULC) Pattern Detector
 * 
 * Dynamically detects if a subject follows a ULC pattern where
 * a consistent set of verbs (actions) are applied across multiple
 * objects/resources.
 * 
 * Example: Azure AZ-104 has "Create, Configure, Monitor" applied to
 * "Identity, Storage, Networking, Compute, etc."
 */

import type { ParsedConcept } from './types';

export interface ULCPattern {
  detected: boolean;
  verbs: string[];           // e.g., ["Create", "Configure", "Monitor"]
  objects: string[];         // e.g., ["Identity", "Storage", "Networking"]
  confidence: number;        // 0-100
  matrix: ULCCell[][];       // 2D array: objects × verbs
  totalCells: number;
  explanation?: string;
}

export interface ULCCell {
  verb: string;
  object: string;
  conceptId?: string;
  conceptName?: string;
  status: 'not-started' | 'learning' | 'mastered';
  howSteps?: string; // The procedural "how" - phase1.execution
}

// Common action verbs that might indicate ULC pattern
const COMMON_VERBS = [
  'create', 'configure', 'monitor', 'manage', 'implement', 'deploy',
  'design', 'optimize', 'secure', 'troubleshoot', 'analyze', 'evaluate',
  'develop', 'test', 'maintain', 'diagnose', 'treat', 'prevent',
  'plan', 'execute', 'control', 'close', 'initiate',
  'argue', 'distinguish', 'interpret', 'apply', 'assess'
];

/**
 * Extract verb from concept name
 * Examples:
 * - "Create Azure Storage Accounts" → "Create"
 * - "Configuring Virtual Networks" → "Configure"
 * - "Identity Management" → "Manage"
 */
function extractVerb(conceptName: string): string | null {
  const normalized = conceptName.toLowerCase().trim();
  
  // Check for verb at start (most common pattern)
  for (const verb of COMMON_VERBS) {
    if (normalized.startsWith(verb)) {
      return verb.charAt(0).toUpperCase() + verb.slice(1);
    }
    // Check for -ing form
    if (normalized.startsWith(verb + 'ing')) {
      return verb.charAt(0).toUpperCase() + verb.slice(1);
    }
  }
  
  // Check for verb anywhere in the name
  const words = normalized.split(/\s+/);
  for (const word of words) {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (COMMON_VERBS.includes(cleaned)) {
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    // Check -ing form
    if (cleaned.endsWith('ing')) {
      const base = cleaned.slice(0, -3);
      if (COMMON_VERBS.includes(base)) {
        return base.charAt(0).toUpperCase() + base.slice(1);
      }
    }
  }
  
  return null;
}

/**
 * Extract object/resource from concept name after removing verb
 * Examples:
 * - "Create Azure Storage Accounts" → "Storage"
 * - "Configure Virtual Networks" → "Networks"
 * - "Monitor Identity Services" → "Identity"
 */
function extractObject(conceptName: string, verb: string | null): string | null {
  let cleaned = conceptName.trim();
  
  // Remove verb if present
  if (verb) {
    const verbPattern = new RegExp(`^${verb}(ing)?\\s+`, 'i');
    cleaned = cleaned.replace(verbPattern, '');
  }
  
  // Remove common filler words
  cleaned = cleaned
    .replace(/\b(azure|aws|the|a|an|for|with|using|in|on|to)\b/gi, ' ')
    .trim();
  
  // Take first significant word as the object
  const words = cleaned.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return null;
  
  // If we have multiple words, try to find the key noun
  // Prefer words that appear in multiple concepts (domain terms)
  return words[0].charAt(0).toUpperCase() + words[0].slice(1);
}

/**
 * Normalize verb variations to canonical form
 * "Creating" → "Create", "Configured" → "Configure"
 */
function normalizeVerb(verb: string): string {
  const lower = verb.toLowerCase();
  
  // Remove -ing
  if (lower.endsWith('ing')) {
    const base = lower.slice(0, -3);
    if (COMMON_VERBS.includes(base)) {
      return base.charAt(0).toUpperCase() + base.slice(1);
    }
  }
  
  // Remove -ed
  if (lower.endsWith('ed')) {
    const base = lower.slice(0, -2);
    if (COMMON_VERBS.includes(base)) {
      return base.charAt(0).toUpperCase() + base.slice(1);
    }
  }
  
  return verb.charAt(0).toUpperCase() + verb.slice(1);
}

/**
 * Detect ULC pattern from concepts
 */
export function detectULC(concepts: ParsedConcept[]): ULCPattern {
  if (concepts.length < 6) {
    return {
      detected: false,
      verbs: [],
      objects: [],
      confidence: 0,
      matrix: [],
      totalCells: 0
    };
  }
  
  // Step 1: Extract verbs and objects from all concepts
  const verbCounts = new Map<string, number>();
  const objectCounts = new Map<string, number>();
  const conceptMap = new Map<string, { verb: string; object: string; concept: ParsedConcept }>();
  
  for (const concept of concepts) {
    const verb = extractVerb(concept.name);
    if (!verb) continue;
    
    const normalizedVerb = normalizeVerb(verb);
    const object = extractObject(concept.name, verb);
    if (!object) continue;
    
    // Count occurrences
    verbCounts.set(normalizedVerb, (verbCounts.get(normalizedVerb) || 0) + 1);
    objectCounts.set(object, (objectCounts.get(object) || 0) + 1);
    
    // Store mapping
    const key = `${normalizedVerb}:${object}`;
    conceptMap.set(key, { verb: normalizedVerb, object, concept });
  }
  
  // Step 2: Find verbs that appear across multiple objects (ULC candidates)
  const ulcVerbs = Array.from(verbCounts.entries())
    .filter(([_, count]) => count >= 3) // Verb must appear at least 3 times
    .sort((a, b) => b[1] - a[1]) // Sort by frequency
    .slice(0, 6) // Take top 6 verbs max
    .map(([verb]) => verb);
  
  // Step 3: Find objects that have multiple verbs applied (resources in ULC)
  const ulcObjects = Array.from(objectCounts.entries())
    .filter(([_, count]) => count >= 2) // Object must have at least 2 verbs
    .sort((a, b) => b[1] - a[1]) // Sort by frequency
    .slice(0, 10) // Take top 10 objects max
    .map(([obj]) => obj);
  
  // Step 4: Calculate confidence
  // High confidence if:
  // - We have 2-6 verbs
  // - We have 3+ objects
  // - Most verb×object combinations exist
  const expectedCells = ulcVerbs.length * ulcObjects.length;
  const actualCells = Array.from(conceptMap.keys()).filter(key => {
    const [verb, obj] = key.split(':');
    return ulcVerbs.includes(verb) && ulcObjects.includes(obj);
  }).length;
  
  const coverage = expectedCells > 0 ? (actualCells / expectedCells) * 100 : 0;
  
  // Confidence factors
  const verbCountScore = ulcVerbs.length >= 2 && ulcVerbs.length <= 6 ? 30 : 0;
  const objectCountScore = ulcObjects.length >= 3 ? 30 : 0;
  const coverageScore = coverage * 0.4; // Up to 40 points
  
  const confidence = Math.round(verbCountScore + objectCountScore + coverageScore);
  
  // Step 5: Build matrix
  const matrix: ULCCell[][] = ulcObjects.map(object => 
    ulcVerbs.map(verb => {
      const key = `${verb}:${object}`;
      const entry = conceptMap.get(key);
      
      return {
        verb,
        object,
        conceptId: entry?.concept.id,
        conceptName: entry?.concept.name,
        howSteps: entry?.concept.phase1?.execution, // Extract the "how"
        status: 'not-started' as const // Will be updated by caller with actual progress
      };
    })
  );
  
  // Step 6: Generate explanation
  let explanation = '';
  if (confidence >= 70) {
    explanation = `This subject follows a Universal Life Cycle pattern: ${ulcVerbs.length} core actions (${ulcVerbs.join(', ')}) applied across ${ulcObjects.length} resources.`;
  }
  
  return {
    detected: confidence >= 70,
    verbs: ulcVerbs,
    objects: ulcObjects,
    confidence,
    matrix,
    totalCells: ulcVerbs.length * ulcObjects.length,
    explanation
  };
}

/**
 * Update ULC matrix with actual learning progress
 */
export function updateULCProgress(
  pattern: ULCPattern,
  conceptProgress: Map<string, 'not-started' | 'learning' | 'mastered'>
): ULCPattern {
  const updatedMatrix = pattern.matrix.map(row =>
    row.map(cell => ({
      ...cell,
      status: cell.conceptId ? (conceptProgress.get(cell.conceptId) || 'not-started') : 'not-started'
    }))
  );
  
  return {
    ...pattern,
    matrix: updatedMatrix
  };
}

/**
 * Get next recommended cell to practice
 * Strategy: Complete verbs for one object before moving to next object
 */
export function getNextULCCell(pattern: ULCPattern): ULCCell | null {
  if (!pattern.detected) return null;
  
  // Find first object with incomplete verbs
  for (const row of pattern.matrix) {
    const incompleteCells = row.filter(cell => cell.status !== 'mastered');
    if (incompleteCells.length > 0) {
      // Return first incomplete cell in this row
      return incompleteCells[0];
    }
  }
  
  return null;
}

/**
 * Calculate ULC completion percentage
 */
export function getULCCompletion(pattern: ULCPattern): number {
  if (!pattern.detected || pattern.totalCells === 0) return 0;
  
  const masteredCells = pattern.matrix
    .flat()
    .filter(cell => cell.status === 'mastered').length;
  
  return Math.round((masteredCells / pattern.totalCells) * 100);
}

/**
 * Get ULC statistics
 */
export interface ULCStats {
  totalCells: number;
  masteredCells: number;
  learningCells: number;
  notStartedCells: number;
  completionPercent: number;
  objectsCompleted: number; // Objects with all verbs mastered
  verbsCompleted: number;   // Verbs mastered across all objects
}

export function getULCStats(pattern: ULCPattern): ULCStats {
  if (!pattern.detected) {
    return {
      totalCells: 0,
      masteredCells: 0,
      learningCells: 0,
      notStartedCells: 0,
      completionPercent: 0,
      objectsCompleted: 0,
      verbsCompleted: 0
    };
  }
  
  const allCells = pattern.matrix.flat();
  const masteredCells = allCells.filter(c => c.status === 'mastered').length;
  const learningCells = allCells.filter(c => c.status === 'learning').length;
  const notStartedCells = allCells.filter(c => c.status === 'not-started').length;
  
  // Count completed objects (all verbs mastered for that object)
  const objectsCompleted = pattern.matrix.filter(row =>
    row.every(cell => cell.status === 'mastered')
  ).length;
  
  // Count completed verbs (verb mastered across all objects)
  const verbsCompleted = pattern.verbs.filter((_, verbIndex) =>
    pattern.matrix.every(row => row[verbIndex].status === 'mastered')
  ).length;
  
  return {
    totalCells: pattern.totalCells,
    masteredCells,
    learningCells,
    notStartedCells,
    completionPercent: getULCCompletion(pattern),
    objectsCompleted,
    verbsCompleted
  };
}
