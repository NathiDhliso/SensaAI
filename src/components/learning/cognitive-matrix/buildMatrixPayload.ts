import type { LearningConcept } from '@/shared/types/learning';
import type { MatrixPayload, MatrixConcept, BranchRow, LeafRow, DrillDownAction } from './types';

function buildAction(concept: LearningConcept): DrillDownAction {
  const trick =
    concept.shape?.analogicalModel ||
    concept.shape?.simpleCore ||
    concept.hookSentence ||
    concept.name;

  const chain: string[] = concept.prerequisites?.length
    ? concept.prerequisites
    : concept.mnemonic?.story
      ? [concept.mnemonic.story]
      : [];

  const steps: string[] =
    concept.workedExample?.steps?.length
      ? concept.workedExample.steps
      : concept.lifecycle?.phase1?.steps?.length
        ? concept.lifecycle.phase1.steps
        : concept.keyPoints?.length
          ? concept.keyPoints
          : [];

  return { trick, chain, steps };
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

  const trunks = concepts.filter(c => c.tier === 'trunk');
  const branches = concepts.filter(c => c.tier === 'branch');
  const leaves = concepts.filter(c => c.tier === 'leaf');

  const branchByName: Record<string, LearningConcept> = {};
  for (const b of branches) branchByName[b.name] = b;

  const leafesByBranch: Record<string, LearningConcept[]> = {};
  for (const leaf of leaves) {
    const key = leaf.parentName || leaf.trunkDomain || 'General';
    if (!leafesByBranch[key]) leafesByBranch[key] = [];
    leafesByBranch[key].push(leaf);
  }

  const branchesByTrunk: Record<string, LearningConcept[]> = {};
  for (const branch of branches) {
    const key = branch.parentName || branch.trunkDomain || 'General';
    if (!branchesByTrunk[key]) branchesByTrunk[key] = [];
    branchesByTrunk[key].push(branch);
  }

  function buildLeafRow(leaf: LearningConcept): LeafRow {
    const action = buildAction(leaf);
    const actions: Record<string, DrillDownAction> = {};
    const cellConceptIds: Record<string, string> = {};
    for (const verb of verbs) {
      actions[verb] = action;
      cellConceptIds[verb] = leaf.id;
    }
    return { conceptId: leaf.id, conceptName: leaf.name, actions, cellConceptIds };
  }

  function buildBranchRow(branch: LearningConcept): BranchRow {
    const children = (leafesByBranch[branch.name] ?? []).map(buildLeafRow);
    return {
      conceptId: branch.id,
      conceptName: branch.name,
      children,
    };
  }

  const matrix: MatrixConcept[] = [];

  for (const trunk of trunks) {
    const trunkBranches = branchesByTrunk[trunk.name] ?? [];
    const branchRows = trunkBranches.map(buildBranchRow);

    const orphanLeaves = (leafesByBranch[trunk.name] ?? []).map(buildLeafRow);
    if (orphanLeaves.length > 0) {
      branchRows.push({
        conceptId: `${trunk.id}-general`,
        conceptName: 'General',
        children: orphanLeaves,
      });
    }

    matrix.push({
      conceptId: trunk.id,
      conceptName: trunk.name,
      isParent: true,
      branches: branchRows,
      children: [],
    });
  }

  if (matrix.length === 0) {
    const grouped: Record<string, LearningConcept[]> = {};
    for (const c of concepts) {
      const key = c.trunkDomain || c.parentName || 'General';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(c);
    }
    for (const [domain, group] of Object.entries(grouped)) {
      const subGroups: Record<string, LearningConcept[]> = {};
      for (const c of group) {
        const key = c.parentName && c.parentName !== domain ? c.parentName : '_root';
        if (!subGroups[key]) subGroups[key] = [];
        subGroups[key].push(c);
      }
      const branchRows: BranchRow[] = Object.entries(subGroups).map(([bName, bGroup]) => ({
        conceptId: `${domain}-${bName}`,
        conceptName: bName === '_root' ? domain : bName,
        children: bGroup.map(buildLeafRow),
      }));
      matrix.push({
        conceptId: domain,
        conceptName: domain,
        isParent: true,
        branches: branchRows,
        children: [],
      });
    }
  }

  return { subject, verbs, matrix };
}

export function getFirstSuggestedKey(
  payload: MatrixPayload,
  masteredIds: Set<string>
): string | null {
  for (const verb of payload.verbs) {
    for (const trunk of payload.matrix) {
      for (const branch of trunk.branches) {
        for (const leaf of branch.children) {
          const realId = leaf.cellConceptIds?.[verb];
          if (realId && !masteredIds.has(realId) && leaf.actions?.[verb]) {
            return `${leaf.conceptId}::${verb}`;
          }
        }
      }
      for (const leaf of trunk.children) {
        const realId = leaf.cellConceptIds?.[verb];
        if (realId && !masteredIds.has(realId) && leaf.actions?.[verb]) {
          return `${leaf.conceptId}::${verb}`;
        }
      }
    }
  }
  return null;
}
