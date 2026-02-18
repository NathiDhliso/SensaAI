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
function stemIng(word: string): string | null {
  if (!word.endsWith('ing')) return null;
  const base = word.slice(0, -3);
  if (COMMON_VERBS.includes(base)) return base;
  if (COMMON_VERBS.includes(base + 'e')) return base + 'e';
  if (base.length > 1 && base[base.length - 1] === base[base.length - 2]) {
    const dedoubled = base.slice(0, -1);
    if (COMMON_VERBS.includes(dedoubled)) return dedoubled;
  }
  return null;
}

function extractVerb(conceptName: string): string | null {
  const normalized = conceptName.toLowerCase().trim();
  const firstWord = normalized.split(/\s+/)[0].replace(/[^a-z]/g, '');

  if (COMMON_VERBS.includes(firstWord)) {
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  }

  const stemmed = stemIng(firstWord);
  if (stemmed) {
    return stemmed.charAt(0).toUpperCase() + stemmed.slice(1);
  }

  const words = normalized.split(/\s+/);
  for (const word of words) {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (COMMON_VERBS.includes(cleaned)) {
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    const wordStem = stemIng(cleaned);
    if (wordStem) {
      return wordStem.charAt(0).toUpperCase() + wordStem.slice(1);
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
  
  if (verb) {
    const escaped = verb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const ingForm = verb.endsWith('e') ? verb.slice(0, -1) + 'ing' : verb + 'ing';
    const ingEscaped = ingForm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const verbPattern = new RegExp(`^(${escaped}|${ingEscaped})\\s+`, 'i');
    cleaned = cleaned.replace(verbPattern, '');
  }
  
  // Remove common filler words
  cleaned = cleaned
    .replace(/\b(azure|aws|gcp|google|microsoft|the|a|an|and|or|of|for|with|using|in|on|to|your|their|its)\b/gi, ' ')
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

  if (COMMON_VERBS.includes(lower)) {
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  const ingResult = stemIng(lower);
  if (ingResult) return ingResult.charAt(0).toUpperCase() + ingResult.slice(1);

  if (lower.endsWith('ed')) {
    const base = lower.slice(0, -2);
    if (COMMON_VERBS.includes(base)) return base.charAt(0).toUpperCase() + base.slice(1);
    if (COMMON_VERBS.includes(base + 'e')) return (base + 'e').charAt(0).toUpperCase() + (base + 'e').slice(1);
  }

  return verb.charAt(0).toUpperCase() + verb.slice(1);
}

/**
 * Detect ULC pattern from concepts
 * Strict detection - only shows ULC when content is properly structured with clear verbs
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
  
  // Step 1: Extract verbs and objects from concept names (strict - no fallback)
  const verbCounts = new Map<string, number>();
  const objectCounts = new Map<string, number>();
  const conceptMap = new Map<string, { verb: string; object: string; concept: ParsedConcept }>();
  
  for (const concept of concepts) {
    const verb = extractVerb(concept.name);
    if (!verb) continue;
    
    const normalizedVerb = normalizeVerb(verb);
    const object = extractObject(concept.name, verb);
    if (!object) continue;
    
    verbCounts.set(normalizedVerb, (verbCounts.get(normalizedVerb) || 0) + 1);
    objectCounts.set(object, (objectCounts.get(object) || 0) + 1);
    
    const key = `${normalizedVerb}:${object}`;
    conceptMap.set(key, { verb: normalizedVerb, object, concept });
  }
  
  // Step 2: Find verbs that appear across multiple objects (ULC candidates)
  const allVerbs = Array.from(verbCounts.entries())
    .filter(([_, count]) => count >= 2) // Verb must appear at least 2 times
    .sort((a, b) => b[1] - a[1]) // Sort by frequency
    .map(([verb]) => verb);
  
  // Step 3: Find objects that have multiple verbs applied (resources in ULC)
  const ulcObjects = Array.from(objectCounts.entries())
    .filter(([_, count]) => count >= 2) // Object must have at least 2 verbs
    .sort((a, b) => b[1] - a[1]) // Sort by frequency
    .slice(0, 10) // Take top 10 objects max
    .map(([obj]) => obj);
  
  // Step 4: Handle multiple verb sets (e.g., AZ-104 + AZ-305 combined)
  // If we have 6+ verbs, take the top 3-5 most frequent
  let ulcVerbs: string[];
  let phaseNote: string | undefined;
  
  if (allVerbs.length >= 6) {
    // Multiple phases detected - take top 5 verbs
    ulcVerbs = allVerbs.slice(0, 5);
    phaseNote = `Note: ${allVerbs.length} verbs detected. Showing top ${ulcVerbs.length}. Consider splitting into separate phases.`;
  } else if (allVerbs.length >= 3) {
    // Standard ULC - 3-5 verbs
    ulcVerbs = allVerbs.slice(0, 5);
  } else {
    // Not enough verbs for ULC pattern
    return {
      detected: false,
      verbs: [],
      objects: [],
      confidence: 0,
      matrix: [],
      totalCells: 0
    };
  }
  
  // Step 5: Calculate confidence (strict)
  const expectedCells = ulcVerbs.length * ulcObjects.length;
  const actualCells = Array.from(conceptMap.keys()).filter(key => {
    const [verb, obj] = key.split(':');
    return ulcVerbs.includes(verb) && ulcObjects.includes(obj);
  }).length;
  
  const coverage = expectedCells > 0 ? (actualCells / expectedCells) * 100 : 0;
  
  // Strict confidence scoring
  const verbCountScore = ulcVerbs.length >= 3 && ulcVerbs.length <= 6 ? 30 : 0;
  const objectCountScore = ulcObjects.length >= 3 ? 30 : 0;
  const coverageScore = coverage * 0.4; // Up to 40 points
  
  const confidence = Math.round(verbCountScore + objectCountScore + coverageScore);
  
  // Only show ULC if confidence is high (strict threshold)
  if (confidence < 70) {
    return {
      detected: false,
      verbs: [],
      objects: [],
      confidence,
      matrix: [],
      totalCells: 0
    };
  }
  
  // Step 6: Build matrix
  const matrix: ULCCell[][] = ulcObjects.map(object => 
    ulcVerbs.map(verb => {
      const key = `${verb}:${object}`;
      const entry = conceptMap.get(key);
      
      return {
        verb,
        object,
        conceptId: entry?.concept.id,
        conceptName: entry?.concept.name,
        howSteps: entry?.concept.phase1?.execution,
        status: 'not-started' as const
      };
    })
  );
  
  // Step 7: Generate explanation
  let explanation = `This subject follows a Universal Life Cycle pattern: ${ulcVerbs.length} core actions (${ulcVerbs.join(', ')}) applied across ${ulcObjects.length} resources.`;
  
  if (phaseNote) {
    explanation += ` ${phaseNote}`;
  }
  
  return {
    detected: true,
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

  for (const row of pattern.matrix) {
    const incompleteCells = row.filter(cell => cell.conceptId && cell.status !== 'mastered');
    if (incompleteCells.length > 0) {
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

  const filledCells = pattern.matrix.flat().filter(c => c.conceptId);
  const masteredCells = filledCells.filter(c => c.status === 'mastered').length;
  const learningCells = filledCells.filter(c => c.status === 'learning').length;
  const notStartedCells = filledCells.filter(c => c.status === 'not-started').length;
  const filledTotal = filledCells.length;

  const objectsCompleted = pattern.matrix.filter(row => {
    const filled = row.filter(cell => cell.conceptId);
    return filled.length > 0 && filled.every(cell => cell.status === 'mastered');
  }).length;

  const verbsCompleted = pattern.verbs.filter((_, verbIndex) => {
    const columnCells = pattern.matrix.map(row => row[verbIndex]).filter(cell => cell.conceptId);
    return columnCells.length > 0 && columnCells.every(cell => cell.status === 'mastered');
  }).length;

  return {
    totalCells: filledTotal,
    masteredCells,
    learningCells,
    notStartedCells,
    completionPercent: filledTotal > 0 ? Math.round((masteredCells / filledTotal) * 100) : 0,
    objectsCompleted,
    verbsCompleted
  };
}
