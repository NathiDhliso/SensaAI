/**
 * Dynamic ULC Pattern Detector
 * Detects Universal Life Cycle patterns from generated LearningConcept data
 */

import type { LearningConcept } from '@/shared/types/learning';
import type { ConceptMatrix, MatrixCell, AtomicConcept, UniversalAction, PrimingCard } from './types';

/**
 * Detect if concepts follow a ULC pattern and extract the matrix
 */
export function detectULCPattern(concepts: LearningConcept[]): ConceptMatrix | null {
  if (concepts.length < 6) return null;

  // Extract verbs and objects from concept names
  const { verbs, objects, conceptMap } = analyzeConceptStructure(concepts);

  // Need at least 2 verbs and 2 objects for a valid pattern
  if (verbs.length < 2 || objects.length < 2) return null;

  // Build the matrix
  const matrix = buildMatrix(verbs, objects, conceptMap, concepts);

  if (matrix.cells.length < 4) return null; // Need minimum cells

  return matrix;
}

interface ConceptStructure {
  verbs: string[];
  objects: string[];
  conceptMap: Map<string, LearningConcept>;
}

/**
 * Analyze concept names to extract verbs and objects
 */
function analyzeConceptStructure(concepts: LearningConcept[]): ConceptStructure {
  const verbCounts = new Map<string, number>();
  const objectCounts = new Map<string, number>();
  const conceptMap = new Map<string, LearningConcept>();

  // Common action verbs that indicate ULC pattern
  const actionVerbs = [
    'create', 'configure', 'monitor', 'manage', 'implement', 'deploy',
    'setup', 'install', 'maintain', 'troubleshoot', 'optimize', 'secure'
  ];

  for (const concept of concepts) {
    conceptMap.set(concept.id, concept);
    
    const nameLower = concept.name.toLowerCase();
    
    // Extract verb from concept name
    for (const verb of actionVerbs) {
      if (nameLower.includes(verb)) {
        const capitalizedVerb = verb.charAt(0).toUpperCase() + verb.slice(1);
        verbCounts.set(capitalizedVerb, (verbCounts.get(capitalizedVerb) || 0) + 1);
        
        // Extract object (what comes after the verb)
        const parts = concept.name.split(new RegExp(verb, 'i'));
        if (parts.length > 1) {
          const object = parts[1].trim();
          if (object) {
            objectCounts.set(object, (objectCounts.get(object) || 0) + 1);
          }
        }
      }
    }
  }

  // Get top verbs and objects
  const verbs = Array.from(verbCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([verb]) => verb);

  const objects = Array.from(objectCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([obj]) => obj);

  return { verbs, objects, conceptMap };
}

/**
 * Build the concept matrix from detected patterns
 */
function buildMatrix(
  verbs: string[],
  objects: string[],
  conceptMap: Map<string, LearningConcept>,
  concepts: LearningConcept[]
): ConceptMatrix {
  // Build atomic concepts with hierarchy
  const atomicConcepts: AtomicConcept[] = buildAtomicConcepts(concepts);

  // Build matrix cells
  const cells: MatrixCell[] = [];

  for (const concept of concepts) {
    const matchedAction = matchConceptToAction(concept, verbs);
    const matchedObject = matchConceptToObject(concept, objects);

    if (matchedAction && matchedObject) {
      const primingCard = buildPrimingCard(concept);
      
      cells.push({
        action: matchedAction,
        conceptId: concept.id,
        conceptPath: buildConceptPath(concept, concepts),
        primingCard,
      });
    }
  }

  return {
    concepts: atomicConcepts,
    cells,
    domain: extractDomain(concepts),
    version: '1.0.0',
  };
}


/**
 * Build atomic concepts with hierarchy from learning concepts
 */
function buildAtomicConcepts(concepts: LearningConcept[]): AtomicConcept[] {
  const rootConcepts = new Map<string, AtomicConcept>();
  
  // Group by trunk domain or parent
  for (const concept of concepts) {
    const rootName = concept.trunkDomain || concept.parentName || concept.name;
    
    if (!rootConcepts.has(rootName)) {
      rootConcepts.set(rootName, {
        id: slugify(rootName),
        name: rootName,
        children: [],
      });
    }

    // Add as child if it has a parent
    if (concept.parentName && concept.parentName !== rootName) {
      const root = rootConcepts.get(rootName);
      if (root && root.children) {
        root.children.push({
          id: concept.id,
          name: concept.name,
        });
      }
    }
  }

  return Array.from(rootConcepts.values());
}

/**
 * Match concept to universal action
 */
function matchConceptToAction(concept: LearningConcept, verbs: string[]): UniversalAction | null {
  const nameLower = concept.name.toLowerCase();
  
  // Map verbs to universal actions
  const actionMap: Record<string, UniversalAction> = {
    'create': 'CREATE',
    'install': 'CREATE',
    'deploy': 'CREATE',
    'configure': 'CONFIGURE',
    'manage': 'CONFIGURE',
    'setup': 'CONFIGURE',
    'monitor': 'MONITOR',
    'troubleshoot': 'MONITOR',
    'maintain': 'MONITOR',
  };

  for (const [verb, action] of Object.entries(actionMap)) {
    if (nameLower.includes(verb)) {
      return action;
    }
  }

  // Check lifecycle phase as fallback
  if (concept.lifecyclePhase === 'PREPARE') return 'CREATE';
  if (concept.lifecyclePhase === 'MODEL') return 'CONFIGURE';
  if (concept.lifecyclePhase === 'DELIVER') return 'MONITOR';

  return null;
}

/**
 * Match concept to object/resource
 */
function matchConceptToObject(concept: LearningConcept, objects: string[]): string | null {
  const nameLower = concept.name.toLowerCase();
  
  for (const obj of objects) {
    if (nameLower.includes(obj.toLowerCase())) {
      return obj;
    }
  }

  return concept.parentName || concept.trunkDomain || null;
}

/**
 * Build concept path for breadcrumb
 */
function buildConceptPath(concept: LearningConcept, allConcepts: LearningConcept[]): string[] {
  const path: string[] = [];

  if (concept.trunkDomain) path.push(concept.trunkDomain);
  if (concept.parentName && concept.parentName !== concept.trunkDomain) {
    path.push(concept.parentName);
  }
  path.push(concept.name);

  return path;
}

/**
 * Build priming card from concept data
 */
function buildPrimingCard(concept: LearningConcept): PrimingCard {
  return {
    trick: {
      title: '🧠 The Trick',
      content: concept.metaphor || concept.hookSentence || concept.whyYouNeed || 
               'Mental model for understanding this concept.',
    },
    chain: {
      title: '🔗 The Chain',
      constraints: buildConstraints(concept),
    },
    steps: {
      title: '⚡ Atomic Steps',
      actions: buildAtomicSteps(concept),
    },
  };
}

/**
 * Build constraints from concept prerequisites
 */
function buildConstraints(concept: LearningConcept): string[] {
  const constraints: string[] = [];

  // Add prerequisites
  if (concept.prerequisites && concept.prerequisites.length > 0) {
    constraints.push(...concept.prerequisites.map(p => `Prerequisite: ${p}`));
  }

  // Add from lifecycle phase 1
  if (concept.lifecycle?.phase1?.steps) {
    const prereqSteps = concept.lifecycle.phase1.steps.filter(s => 
      s.toLowerCase().includes('prerequisite') || 
      s.toLowerCase().includes('require')
    );
    constraints.push(...prereqSteps);
  }

  // Add common pitfalls as constraints
  if (concept.commonPitfalls && concept.commonPitfalls.length > 0) {
    constraints.push(...concept.commonPitfalls.slice(0, 2));
  }

  // Fallback
  if (constraints.length === 0) {
    constraints.push('Basic understanding of the domain');
    constraints.push('Access to required tools/platform');
  }

  return constraints.slice(0, 5); // Limit to 5 constraints
}

/**
 * Build atomic steps from concept lifecycle
 */
function buildAtomicSteps(concept: LearningConcept): string[] {
  const steps: string[] = [];

  // Extract from howToUse
  if (concept.howToUse && concept.howToUse.length > 0) {
    steps.push(...concept.howToUse);
  }

  // Extract from lifecycle phases
  if (concept.lifecycle) {
    if (concept.lifecycle.phase1?.steps) {
      steps.push(...concept.lifecycle.phase1.steps);
    }
    if (concept.lifecycle.phase2?.steps) {
      steps.push(...concept.lifecycle.phase2.steps);
    }
    if (concept.lifecycle.phase3?.steps) {
      steps.push(...concept.lifecycle.phase3.steps);
    }
  }

  // Extract from worked example
  if (concept.workedExample?.steps) {
    steps.push(...concept.workedExample.steps);
  }

  // Fallback to key points
  if (steps.length === 0 && concept.keyPoints) {
    steps.push(...concept.keyPoints);
  }

  // Clean and limit steps
  return steps
    .filter(s => s && s.length > 5)
    .map(s => s.replace(/^(Step \d+:|•|-|\d+\.)\s*/i, '').trim())
    .slice(0, 10); // Limit to 10 steps
}

/**
 * Extract domain name from concepts
 */
function extractDomain(concepts: LearningConcept[]): string {
  // Try to find common trunk domain
  const trunkDomains = concepts
    .map(c => c.trunkDomain)
    .filter(Boolean);

  if (trunkDomains.length > 0) {
    return trunkDomains[0]!;
  }

  // Fallback to first concept's parent or name
  return concepts[0]?.parentName || concepts[0]?.name || 'Learning Domain';
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
