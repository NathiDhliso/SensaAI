import type { LearningConcept } from '@/shared/types/learning';
import type { MatrixPayload, MatrixConcept, LeafRow, DrillDownAction } from './types';

function buildAction(concept: LearningConcept): DrillDownAction {
  return {
    trick: concept.mnemonic?.anchor || concept.shape?.simpleCore || concept.name,
    chain: concept.mnemonic?.story
      ? [concept.mnemonic.story]
      : [],
    steps: concept.lifecycle?.phase1?.steps?.length
      ? concept.lifecycle.phase1.steps
      : concept.keyPoints?.length
        ? concept.keyPoints
        : [],
  };
}

export function buildMatrixPayload(
  concepts: LearningConcept[],
  subject: string,
  lifecycleVerbs?: { phase1: string; phase2: string; phase3: string }
): MatrixPayload {
  const verb1 = (lifecycleVerbs?.phase1 || 'PREPARE').toUpperCase();
  const verb2 = (lifecycleVerbs?.phase2 || 'MODEL').toUpperCase();
  const verb3 = (lifecycleVerbs?.phase3 || 'DELIVER').toUpperCase();
  const verbs = [verb1, verb2, verb3];

  function phaseVerb(concept: LearningConcept): string {
    const phase = (concept.lifecyclePhase || '').toUpperCase();
    if (phase === 'PREPARE') return verb1;
    if (phase === 'MODEL') return verb2;
    if (phase === 'DELIVER') return verb3;
    const l = (concept.cognitiveLevel || '').toLowerCase();
    if (l === 'evaluate' || l === 'create') return verb3;
    if (l === 'apply' || l === 'analyze') return verb2;
    return verb1;
  }

  const leaves = concepts.filter(c => c.tier === 'leaf');
  const branches = concepts.filter(c => c.tier === 'branch');

  const branchNames = new Set(branches.map(b => b.name));

  const branchToLeaves: Record<string, LearningConcept[]> = {};
  for (const leaf of leaves) {
    const parent = leaf.parentName || leaf.trunkDomain || 'General';
    if (!branchToLeaves[parent]) branchToLeaves[parent] = [];
    branchToLeaves[parent].push(leaf);
  }

  const parentNames = new Set([
    ...branches.map(b => b.name),
    ...Object.keys(branchToLeaves).filter(k => !branchNames.has(k)),
  ]);

  const matrix: MatrixConcept[] = [];

  for (const parentName of parentNames) {
    const group = branchToLeaves[parentName] ?? [];

    const children: LeafRow[] = group.map(leaf => {
      const leafActions: Record<string, DrillDownAction | null> = {};
      const leafIds: Record<string, string> = {};
      const assignedVerb = phaseVerb(leaf);
      for (const verb of verbs) {
        if (verb === assignedVerb) {
          leafActions[verb] = buildAction(leaf);
          leafIds[verb] = leaf.id;
        } else {
          leafActions[verb] = null;
        }
      }
      return {
        conceptId: leaf.id,
        conceptName: leaf.name,
        actions: leafActions,
        cellConceptIds: leafIds,
      };
    });

    matrix.push({
      conceptId: parentName,
      conceptName: parentName,
      isParent: true,
      children,
    });
  }

  if (matrix.length === 0) {
    const fallbackGroups: Record<string, LearningConcept[]> = {};
    for (const concept of concepts) {
      const domain = concept.trunkDomain || concept.parentName || 'General';
      if (!fallbackGroups[domain]) fallbackGroups[domain] = [];
      fallbackGroups[domain].push(concept);
    }
    for (const [domain, group] of Object.entries(fallbackGroups)) {
      const children: LeafRow[] = group.map(c => {
        const a: Record<string, DrillDownAction | null> = {};
        const ids: Record<string, string> = {};
        const v = phaseVerb(c);
        for (const verb of verbs) {
          if (verb === v) { a[verb] = buildAction(c); ids[verb] = c.id; }
          else a[verb] = null;
        }
        return { conceptId: c.id, conceptName: c.name, actions: a, cellConceptIds: ids };
      });
      matrix.push({ conceptId: domain, conceptName: domain, isParent: true, children });
    }
  }

  return { subject, verbs, matrix };
}

export function getFirstSuggestedKey(
  payload: MatrixPayload,
  masteredIds: Set<string>
): string | null {
  for (const verb of payload.verbs) {
    for (const concept of payload.matrix) {
      for (const leaf of concept.children) {
        const realId = leaf.cellConceptIds?.[verb];
        if (realId && !masteredIds.has(realId) && leaf.actions?.[verb]) {
          return `${leaf.conceptId}::${verb}`;
        }
      }
    }
  }
  return null;
}
