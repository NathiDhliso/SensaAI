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
  
  // Handle compound verbs like "Implement and manage", "Create and configure"
  const compoundPatterns = [
    /^(implement and manage|create and configure|deploy and manage|setup and configure)/,
    /^(create|configure|implement|deploy|manage|monitor|secure|optimize|design|analyze|evaluate|test|maintain|troubleshoot)/
  ];
  
  for (const pattern of compoundPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const verb = match[1];
      // Normalize to single verb form
      if (verb.includes(' and ')) {
        const primaryVerb = verb.split(' and ')[0];
        return primaryVerb.charAt(0).toUpperCase() + primaryVerb.slice(1);
      }
      return verb.charAt(0).toUpperCase() + verb.slice(1);
    }
  }
  
  // Check first word against common verbs
  const firstWord = normalized.split(/\s+/)[0].replace(/[^a-z]/g, '');
  if (COMMON_VERBS.includes(firstWord)) {
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  }

  const stemmed = stemIng(firstWord);
  if (stemmed) {
    return stemmed.charAt(0).toUpperCase() + stemmed.slice(1);
  }

  // Check all words for verbs
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
 * - "Create Azure Storage Accounts" → "Storage Accounts"
 * - "Configure Virtual Networks" → "Virtual Networks"
 * - "Monitor Identity Services" → "Identity Services"
 * 
 * Strategy: Take 2-3 significant words after verb removal to capture multi-word objects
 */
function extractObject(conceptName: string, verb: string | null): string | null {
  let cleaned = conceptName.trim();
  
  if (verb) {
    // Handle compound verbs like "Implement and manage"
    const escaped = verb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const ingForm = verb.endsWith('e') ? verb.slice(0, -1) + 'ing' : verb + 'ing';
    const ingEscaped = ingForm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Remove verb patterns including compound forms
    const verbPatterns = [
      new RegExp(`^(${escaped}|${ingEscaped})\\s+`, 'i'),
      new RegExp(`^(implement and manage|create and configure|deploy and manage|setup and configure)\\s+`, 'i')
    ];
    
    for (const pattern of verbPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
  }
  
  // Remove common filler words and prefixes
  cleaned = cleaned
    .replace(/\b(azure|aws|gcp|google|microsoft|the|a|an|and|or|of|for|with|using|in|on|to|your|their|its|access|to)\b/gi, ' ')
    .replace(/\b(you|need|must|should|will|can|may)\b/gi, ' ')
    .trim();
  
  // Extract key resource terms (2-3 words for better specificity)
  const words = cleaned.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return null;
  
  // Look for key resource indicators
  const resourceIndicators = ['storage', 'network', 'compute', 'security', 'identity', 'database', 'monitoring', 'backup', 'firewall', 'virtual', 'account', 'service'];
  
  // Try to find the most significant resource term
  let objectWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (resourceIndicators.some(indicator => words[i].toLowerCase().includes(indicator))) {
      // Take this word and possibly the next one for context
      objectWords = words.slice(i, Math.min(i + 2, words.length));
      break;
    }
  }
  
  // If no resource indicator found, take first 2-3 words
  if (objectWords.length === 0) {
    objectWords = words.slice(0, Math.min(2, words.length));
  }
  
  // Capitalize first letter of each word
  return objectWords
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
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
    .filter(([_, count]) => count >= 1) // Object must have at least 1 verb (more flexible)
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
  } else if (allVerbs.length >= 2) {
    // Flexible ULC - 2+ verbs (for real-world content)
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
  
  // Adjusted confidence scoring for real-world content
  const verbCountScore = ulcVerbs.length >= 2 ? Math.min(25, ulcVerbs.length * 8) : 0;
  const objectCountScore = ulcObjects.length >= 2 ? Math.min(25, ulcObjects.length * 8) : 0;
  const coverageScore = coverage * 0.5; // Up to 50 points for coverage
  
  const confidence = Math.round(verbCountScore + objectCountScore + coverageScore);
  
  // Only show ULC if confidence is reasonable (adjusted for real-world content)
  if (confidence < 60) {
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
      
      // Extract howSteps with fallback chain:
      // 1. phase1.execution (primary - the procedural "how")
      // 2. phase1.selection joined (decision patterns)
      // 3. shape.simpleCore (simple explanation)
      // 4. keyPoints[0] (first key point)
      // 5. phase1.hookSentence (last resort)
      let howSteps: string | undefined;
      if (entry?.concept) {
        const c = entry.concept;
        howSteps = c.phase1?.execution?.trim() || undefined;
        if (!howSteps && c.phase1?.selection && c.phase1.selection.length > 0) {
          howSteps = c.phase1.selection.filter(s => s.trim()).join(' → ');
        }
        if (!howSteps && c.shape?.simpleCore?.trim()) {
          howSteps = c.shape.simpleCore.trim();
        }
        if (!howSteps && c.keyPoints && c.keyPoints.length > 0) {
          howSteps = c.keyPoints[0];
        }
        if (!howSteps && c.phase1?.hookSentence?.trim()) {
          howSteps = c.phase1.hookSentence.trim();
        }
      }
      
      return {
        verb,
        object,
        conceptId: entry?.concept.id,
        conceptName: entry?.concept.name,
        howSteps,
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
