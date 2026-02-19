import type { LearningConcept } from '@/shared/types/learning';

export interface ULCPattern {
  detected: boolean;
  verbs: string[];
  objects: string[];
  confidence: number;
  cellMap: Record<string, string>;
}

export interface ULCCell {
  verb: string;
  object: string;
  conceptId: string | null;
  status: 'not-started' | 'learning' | 'mastered';
}

const COMMON_VERBS = [
  'Create', 'Configure', 'Monitor', 'Manage', 'Deploy', 'Delete',
  'Update', 'Set', 'Enable', 'Disable', 'Connect', 'Assign',
  'Install', 'Remove', 'Backup', 'Restore', 'Migrate', 'Scale',
  'Secure', 'Audit', 'Review', 'Implement', 'Design', 'Build',
  'Test', 'Validate', 'Troubleshoot', 'Optimize', 'Integrate'
];

function extractVerb(conceptName: string): string | null {
  const words = conceptName.trim().split(/\s+/);
  const firstWord = words[0];
  const normalized = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  if (COMMON_VERBS.includes(normalized)) return normalized;
  const upperFirst = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  if (COMMON_VERBS.some(v => v.toLowerCase() === upperFirst.toLowerCase())) return upperFirst;
  return null;
}

function extractObject(conceptName: string): string | null {
  const words = conceptName.trim().split(/\s+/);
  if (words.length < 2) return null;
  return words.slice(1).join(' ');
}

export function detectULC(concepts: LearningConcept[]): ULCPattern {
  const verbCounts: Record<string, number> = {};
  const objectCounts: Record<string, number> = {};
  const cellMap: Record<string, string> = {};

  for (const concept of concepts) {
    const verb = extractVerb(concept.name);
    const obj = extractObject(concept.name);
    if (verb && obj) {
      verbCounts[verb] = (verbCounts[verb] || 0) + 1;
      objectCounts[obj] = (objectCounts[obj] || 0) + 1;
      cellMap[`${verb}::${obj}`] = concept.id;
    }
  }

  const repeatedVerbs = Object.entries(verbCounts)
    .filter(([, count]) => count >= 2)
    .map(([verb]) => verb)
    .sort();

  const repeatedObjects = Object.entries(objectCounts)
    .filter(([, count]) => count >= 2)
    .map(([obj]) => obj)
    .sort();

  const matchedCells = Object.keys(cellMap).filter(key => {
    const [verb, obj] = key.split('::');
    return repeatedVerbs.includes(verb) && repeatedObjects.includes(obj);
  });

  const totalPossible = repeatedVerbs.length * repeatedObjects.length;
  const confidence = totalPossible > 0
    ? Math.round((matchedCells.length / totalPossible) * 100)
    : 0;

  const detected = repeatedVerbs.length >= 2 && repeatedObjects.length >= 2 && confidence >= 40;

  return {
    detected,
    verbs: repeatedVerbs,
    objects: repeatedObjects,
    confidence,
    cellMap
  };
}

export function buildULCMatrix(
  pattern: ULCPattern,
  concepts: LearningConcept[],
  completedConceptIds: string[]
): ULCCell[][] {
  return pattern.objects.map(obj =>
    pattern.verbs.map(verb => {
      const key = `${verb}::${obj}`;
      const conceptId = pattern.cellMap[key] ?? null;
      let status: ULCCell['status'] = 'not-started';
      if (conceptId) {
        if (completedConceptIds.includes(conceptId)) {
          status = 'mastered';
        } else {
          const concept = concepts.find(c => c.id === conceptId);
          if (concept) status = 'learning';
        }
      }
      return { verb, object: obj, conceptId, status };
    })
  );
}

export function getNextULCCell(
  matrix: ULCCell[][],
  pattern: ULCPattern
): ULCCell | null {
  for (const verb of pattern.verbs) {
    for (const row of matrix) {
      const cell = row.find(c => c.verb === verb && c.status !== 'mastered' && c.conceptId);
      if (cell) return cell;
    }
  }
  return null;
}

export function detectVerbJump(
  completedConceptIds: string[],
  pattern: ULCPattern
): boolean {
  if (!pattern.detected || completedConceptIds.length < 2) return false;

  const lastTwo = completedConceptIds.slice(-2);
  const getVerb = (id: string) => {
    for (const [key, cid] of Object.entries(pattern.cellMap)) {
      if (cid === id) return key.split('::')[0];
    }
    return null;
  };
  const getObject = (id: string) => {
    for (const [key, cid] of Object.entries(pattern.cellMap)) {
      if (cid === id) return key.split('::')[1];
    }
    return null;
  };

  const [prevId, currId] = lastTwo;
  const prevVerb = getVerb(prevId);
  const currVerb = getVerb(currId);
  const prevObj = getObject(prevId);
  const currObj = getObject(currId);

  if (!prevVerb || !currVerb || !prevObj || !currObj) return false;

  if (prevVerb === currVerb && prevObj !== currObj) {
    const prevObjIdx = pattern.objects.indexOf(prevObj);
    const nextExpectedObj = pattern.objects[prevObjIdx + 1];
    if (nextExpectedObj && currObj !== nextExpectedObj) return true;
  }

  return false;
}
