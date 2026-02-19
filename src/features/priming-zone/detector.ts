/**
 * Dynamic ULC Pattern Detector
 * Detects Universal Life Cycle patterns from generated LearningConcept data
 */

import type { LearningConcept } from '@/shared/types/learning';
import type { PrimingMatrixData, MatrixCell, AtomicConcept, UniversalAction, PrimingCard, ULCVerbs } from './types';

/**
 * Detect if concepts follow a ULC pattern and extract the matrix
 * Returns null if no valid ULC pattern is detected
 */
export function detectULCPattern(
  concepts: LearningConcept[],
  subjectId: string,
  subjectName?: string
): PrimingMatrixData | null {
  if (!concepts || concepts.length === 0) return null;

  // Analyze the concept structure dynamically
  const structure = analyzeConceptStructure(concepts);

  // Build the matrix from detected patterns
  const matrix = buildMatrix(structure, concepts, subjectId, subjectName);

  // Validate minimum viable matrix
  if (!matrix.concepts.length || matrix.cells.length < 1) {
    return null;
  }

  return matrix;
}

interface ConceptStructure {
  verbs: ULCVerbs;
  actionMap: Map<string, UniversalAction>;
  conceptHierarchy: Map<string, AtomicConcept>;
  domain: string;
}

/**
 * Analyze concept names to extract ULC actions and build hierarchy
 * Fully dynamic - no hardcoded assumptions
 */
function analyzeConceptStructure(concepts: LearningConcept[]): ConceptStructure {
  const actionMap = new Map<string, UniversalAction>();
  const conceptHierarchy = new Map<string, AtomicConcept>();
  
  // Extract domain from first concept or common trunk
  const domain = extractDomain(concepts);

  // Extract ULC verbs from lifecycle phases
  const verbs = extractULCVerbs(concepts);

  // Build concept hierarchy
  for (const concept of concepts) {
    // Determine which ULC action this concept maps to
    const action = matchConceptToAction(concept, verbs);
    if (action) {
      actionMap.set(concept.id, action);
    }

    // Build hierarchical structure
    const rootKey = concept.trunkDomain || concept.parentName || 'root';
    
    if (!conceptHierarchy.has(rootKey)) {
      conceptHierarchy.set(rootKey, {
        id: slugify(rootKey),
        name: rootKey,
        tier: 'trunk',
        children: [],
      });
    }

    const root = conceptHierarchy.get(rootKey)!;
    
    // Add concept as child if it's not the root itself
    if (concept.name !== rootKey) {
      if (!root.children) root.children = [];
      
      // Check if already exists
      const exists = root.children.some(c => c.id === concept.id);
      if (!exists) {
        root.children.push({
          id: concept.id,
          name: concept.name,
          tier: concept.tier,
        });
      }
    }
  }

  return { verbs, actionMap, conceptHierarchy, domain };
}

/**
 * Extract ULC verbs from lifecycle phases
 */
function extractULCVerbs(concepts: LearningConcept[]): ULCVerbs {
  // Check if concepts have lifecycle phases
  const phases = new Set(concepts.map(c => c.lifecyclePhase).filter(Boolean));
  
  if (phases.has('PREPARE') && phases.has('MODEL') && phases.has('DELIVER')) {
    return {
      verb1: 'PREPARE',
      verb2: 'EXECUTE',
      verb3: 'VERIFY',
    };
  }

  // Fallback to generic ULC verbs
  return {
    verb1: 'UNDERSTAND',
    verb2: 'LINK',
    verb3: 'COMMIT',
  };
}

/**
 * Build the concept matrix from detected patterns
 */
function buildMatrix(
  structure: ConceptStructure,
  concepts: LearningConcept[],
  subjectId: string,
  subjectName?: string
): PrimingMatrixData {
  const { verbs, actionMap, conceptHierarchy, domain } = structure;

  // Convert hierarchy map to array
  const atomicConcepts = Array.from(conceptHierarchy.values());

  // Build matrix cells for each concept that has an action mapping
  const cells: MatrixCell[] = [];

  for (const concept of concepts) {
    const action = actionMap.get(concept.id);
    
    if (action) {
      const primingCard = buildPrimingCard(concept, action);
      
      cells.push({
        action,
        conceptId: concept.id,
        conceptPath: buildConceptPath(concept),
        primingCard,
      });
    }
  }

  return {
    verbs,
    concepts: atomicConcepts,
    cells,
    domain: subjectName || domain,
    subjectId,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Match concept to universal action based on lifecycle phase and content
 */
function matchConceptToAction(concept: LearningConcept, verbs: ULCVerbs): UniversalAction | null {
  // Primary: Use lifecycle phase if available
  if (concept.lifecyclePhase) {
    const phase = concept.lifecyclePhase.toUpperCase();
    if (phase === 'PREPARE') return verbs.verb1;
    if (phase === 'MODEL') return verbs.verb2;
    if (phase === 'DELIVER') return verbs.verb3;
  }

  // Secondary: Analyze concept name for action keywords
  const nameLower = concept.name.toLowerCase();
  
  // Verb 1 indicators (UNDERSTAND/PREPARE)
  if (nameLower.includes('understand') || 
      nameLower.includes('learn') || 
      nameLower.includes('know') ||
      nameLower.includes('define') ||
      nameLower.includes('prepare') ||
      nameLower.includes('explain')) {
    return verbs.verb1;
  }
  
  // Verb 2 indicators (LINK/EXECUTE)
  if (nameLower.includes('link') || 
      nameLower.includes('connect') || 
      nameLower.includes('relate') ||
      nameLower.includes('compare') ||
      nameLower.includes('execute') ||
      nameLower.includes('integrate')) {
    return verbs.verb2;
  }
  
  // Verb 3 indicators (COMMIT/VERIFY)
  if (nameLower.includes('commit') || 
      nameLower.includes('apply') || 
      nameLower.includes('practice') ||
      nameLower.includes('verify') ||
      nameLower.includes('deliver') ||
      nameLower.includes('perform')) {
    return verbs.verb3;
  }

  return null;
}

/**
 * Build concept path for breadcrumb from concept's own hierarchy data
 */
function buildConceptPath(concept: LearningConcept): string[] {
  const path: string[] = [];

  if (concept.trunkDomain) path.push(concept.trunkDomain);
  if (concept.parentName && concept.parentName !== concept.trunkDomain) {
    path.push(concept.parentName);
  }
  path.push(concept.name);

  return path;
}

/**
 * Build priming card from concept's own data - no hardcoded content
 */
function buildPrimingCard(concept: LearningConcept, action: string): PrimingCard {
  return {
    trick: {
      title: `🧠 The Trick: ${action}`,
      content: buildTrickContent(concept),
    },
    chain: {
      title: '🔗 The Chain: Prerequisites',
      constraints: buildConstraints(concept),
    },
    steps: {
      title: `⚡ Atomic Steps: How to ${action}`,
      actions: buildAtomicSteps(concept),
    },
  };
}

/**
 * Build the "Trick" content from concept's mental model data
 */
function buildTrickContent(concept: LearningConcept): string {
  // Priority order: metaphor > hookSentence > whyYouNeed
  if (concept.metaphor) return concept.metaphor;
  if (concept.hookSentence) return concept.hookSentence;
  if (concept.whyYouNeed) return concept.whyYouNeed;
  
  // Fallback: construct from key points
  if (concept.keyPoints && concept.keyPoints.length > 0) {
    return concept.keyPoints[0];
  }
  
  return `Mental model for ${concept.name}`;
}

/**
 * Build constraints from concept's own prerequisite data
 */
function buildConstraints(concept: LearningConcept): string[] {
  const constraints: string[] = [];

  // Add explicit prerequisites
  if (concept.prerequisites && concept.prerequisites.length > 0) {
    constraints.push(...concept.prerequisites);
  }

  // Extract from lifecycle phase 1 (preparation/prerequisites)
  if (concept.lifecycle?.phase1?.steps) {
    constraints.push(...concept.lifecycle.phase1.steps);
  }

  // Add common pitfalls as constraints (what NOT to do)
  if (concept.commonPitfalls && concept.commonPitfalls.length > 0) {
    constraints.push(...concept.commonPitfalls.slice(0, 2));
  }

  // If no constraints found, return empty array (better than fake data)
  return constraints.slice(0, 5); // Limit to 5 constraints
}

/**
 * Build atomic steps from concept's own lifecycle and example data
 */
function buildAtomicSteps(concept: LearningConcept): string[] {
  const steps: string[] = [];

  // Priority 1: Worked example steps (most concrete)
  if (concept.workedExample?.steps && concept.workedExample.steps.length > 0) {
    steps.push(...concept.workedExample.steps);
  }

  // Priority 2: How to use instructions
  if (steps.length === 0 && concept.howToUse && concept.howToUse.length > 0) {
    steps.push(...concept.howToUse);
  }

  // Priority 3: Lifecycle phase steps
  if (steps.length === 0 && concept.lifecycle) {
    if (concept.lifecycle.phase1?.steps) steps.push(...concept.lifecycle.phase1.steps);
    if (concept.lifecycle.phase2?.steps) steps.push(...concept.lifecycle.phase2.steps);
    if (concept.lifecycle.phase3?.steps) steps.push(...concept.lifecycle.phase3.steps);
  }

  // Priority 4: Key points as fallback
  if (steps.length === 0 && concept.keyPoints) {
    steps.push(...concept.keyPoints);
  }

  // Clean and format steps
  return steps
    .filter(s => s && s.length > 5)
    .map(s => s.replace(/^(Step \d+:|•|-|\d+\.)\s*/i, '').trim())
    .slice(0, 10); // Limit to 10 steps
}

/**
 * Extract domain name from concepts' own metadata
 */
function extractDomain(concepts: LearningConcept[]): string {
  if (!concepts || concepts.length === 0) return 'Learning Domain';

  // Try trunk domain (most specific)
  const trunkDomains = concepts
    .map(c => c.trunkDomain)
    .filter(Boolean);

  if (trunkDomains.length > 0) {
    return trunkDomains[0]!;
  }

  // Try parent name
  const parentNames = concepts
    .map(c => c.parentName)
    .filter(Boolean);

  if (parentNames.length > 0) {
    return parentNames[0]!;
  }

  // Fallback to first concept name
  return concepts[0].name;
}

/**
 * Create URL-safe slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
