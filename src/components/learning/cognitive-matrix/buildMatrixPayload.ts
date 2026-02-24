import type { LearningConcept } from '@/shared/types/learning';
import type { MatrixPayload, MatrixConcept, BranchRow, LeafRow, DrillDownAction, BlueprintAlignedStep } from './types';

function buildTrick(concept: LearningConcept): string {
  return concept.shape?.analogicalModel || concept.shape?.simpleCore || '';
}

function buildChain(concept: LearningConcept): string[] {
  return concept.prerequisites?.length ? concept.prerequisites : [];
}

function buildStepsForVerb(concept: LearningConcept, verbIndex: number): string[] {
  const phase1Steps = (concept.lifecycle?.phase1?.steps ?? [])
    .filter(s => !s.startsWith('Prerequisite:'));
  const phase2Steps = concept.lifecycle?.phase2?.steps ?? [];
  const phase3Steps = concept.lifecycle?.phase3?.steps ?? [];
  const howToUse = concept.howToUse ?? [];

  if (verbIndex === 0) return phase1Steps;
  if (verbIndex === 1) return phase2Steps.length ? phase2Steps : howToUse;
  return phase3Steps;
}

function buildBlueprintSteps(concept: LearningConcept, verb: string, verbIndex: number): BlueprintAlignedStep[] | undefined {
  if (!concept.blueprintSteps || concept.blueprintSteps.length === 0) return undefined;
  const verbUpper = verb.toUpperCase();

  const matched = concept.blueprintSteps.filter(
    bs => bs.verb.toUpperCase() === verbUpper
  );
  if (matched.length > 0) return matched;

  const phaseAliases: Record<number, string[]> = {
    0: ['PREPARE', 'PHASE1', 'PHASE 1', 'FOUNDATION', 'SETUP', 'PRIME'],
    1: ['MODEL', 'PHASE2', 'PHASE 2', 'ACTION', 'EXECUTE', 'APPLICATION'],
    2: ['DELIVER', 'PHASE3', 'PHASE 3', 'VERIFY', 'VERIFICATION', 'VALIDATE'],
  };

  for (const [, aliases] of Object.entries(phaseAliases)) {
    if (aliases.includes(verbUpper)) {
      const aliasMatched = concept.blueprintSteps.filter(bs => aliases.includes(bs.verb.toUpperCase()));
      if (aliasMatched.length > 0) return aliasMatched;
    }
  }

  if (verbIndex >= 0 && verbIndex <= 2) {
    const targetAliases = phaseAliases[verbIndex];
    const indexMatched = concept.blueprintSteps.filter(bs => targetAliases.includes(bs.verb.toUpperCase()));
    if (indexMatched.length > 0) return indexMatched;
  }

  return undefined;
}

function buildAction(concept: LearningConcept, verbIndex: number, verb: string): DrillDownAction {
  const bpSteps = buildBlueprintSteps(concept, verb, verbIndex);
  const steps = bpSteps && bpSteps.length > 0
    ? bpSteps.map(bs => bs.instantiation)
    : buildStepsForVerb(concept, verbIndex);
  const trick = buildTrick(concept);

  const warnings: string[] = [];
  if (steps.length === 0) {
    warnings.push(`No ${verb.toLowerCase()} steps were generated for this concept.`);
  }
  if (!trick) {
    warnings.push('Memory anchor not available for this concept.');
  }

  return {
    trick,
    chain: buildChain(concept),
    steps,
    blueprintSteps: bpSteps,
    commonPitfalls: concept.commonPitfalls?.length ? concept.commonPitfalls : undefined,
    highStakesExample: concept.shape?.highStakesExample || undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    eliminationLogic: concept.shape?.eliminationLogic || undefined,
    examContext: concept.examContext ? {
      examObjective: concept.examContext.examObjective,
      questionTypes: concept.examContext.questionTypes,
      examTip: concept.examContext.examTip,
    } : undefined,
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

  // Case-insensitive tier matching
  const getTier = (c: LearningConcept): string => (c.tier || '').toLowerCase();
  
  const trunks = concepts.filter(c => getTier(c) === 'trunk');
  const branches = concepts.filter(c => getTier(c) === 'branch');
  const leaves = concepts.filter(c => getTier(c) === 'leaf');

  // Fallback: if no tiers set properly, treat all non-trunk as leaves
  const effectiveLeaves = leaves.length > 0 ? leaves : concepts.filter(c => getTier(c) !== 'trunk');

  // Debug logging for tier distribution
  if (typeof window !== 'undefined' && (window as unknown as { __DEBUG_MATRIX?: boolean }).__DEBUG_MATRIX) {
    console.log('[BuildMatrix] Concepts:', concepts.length, 'Trunks:', trunks.length, 'Branches:', branches.length, 'Leaves:', leaves.length, 'EffectiveLeaves:', effectiveLeaves.length);
    console.log('[BuildMatrix] Sample tiers:', concepts.slice(0, 5).map(c => ({ name: c.name, tier: c.tier, parentName: c.parentName, trunkDomain: c.trunkDomain })));
  }

  const branchByName: Record<string, LearningConcept> = {};
  for (const b of branches) branchByName[b.name] = b;

  const UNGROUPED = 'Ungrouped';
  const leafesByBranch: Record<string, LearningConcept[]> = {};
  for (const leaf of effectiveLeaves) {
    const key = leaf.parentName || leaf.trunkDomain || UNGROUPED;
    if (!leafesByBranch[key]) leafesByBranch[key] = [];
    leafesByBranch[key].push(leaf);
  }

  const branchesByTrunk: Record<string, LearningConcept[]> = {};
  for (const branch of branches) {
    const key = branch.parentName || branch.trunkDomain || UNGROUPED;
    if (!branchesByTrunk[key]) branchesByTrunk[key] = [];
    branchesByTrunk[key].push(branch);
  }

  function buildLeafRow(leaf: LearningConcept): LeafRow {
    const actions: Record<string, DrillDownAction> = {};
    const cellConceptIds: Record<string, string> = {};
    for (let i = 0; i < verbs.length; i++) {
      actions[verbs[i]] = buildAction(leaf, i, verbs[i]);
      cellConceptIds[verbs[i]] = leaf.id;
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

  // Fallback: if trunks exist but all have empty branches, redistribute ungrouped leaves
  const hasEmptyMatrix = matrix.length > 0 && matrix.every(t => t.branches.length === 0 || t.branches.every(b => b.children.length === 0));
  if (hasEmptyMatrix && leafesByBranch[UNGROUPED]?.length > 0) {
    const ungroupedLeaves = leafesByBranch[UNGROUPED];
    // Distribute leaves to trunks based on fuzzy matching of trunkDomain or examContext
    for (const trunk of matrix) {
      const trunkNameLower = trunk.conceptName.toLowerCase();
      const matchedLeaves = ungroupedLeaves.filter(leaf => {
        const trunkDomain = (leaf.trunkDomain || '').toLowerCase();
        const parentName = (leaf.parentName || '').toLowerCase();
        const examObjective = (leaf.examContext?.examObjective || '').toLowerCase();
        return trunkDomain.includes(trunkNameLower) || 
               trunkNameLower.includes(trunkDomain) ||
               parentName.includes(trunkNameLower) ||
               trunkNameLower.includes(parentName) ||
               examObjective.includes(trunkNameLower);
      });
      if (matchedLeaves.length > 0) {
        trunk.branches.push({
          conceptId: `${trunk.conceptId}-matched`,
          conceptName: 'Concepts',
          children: matchedLeaves.map(buildLeafRow),
        });
      }
    }
    // Any remaining unmatched leaves go to first trunk
    const assignedIds = new Set(matrix.flatMap(t => t.branches.flatMap(b => b.children.map(c => c.conceptId))));
    const remaining = ungroupedLeaves.filter(l => !assignedIds.has(l.id));
    if (remaining.length > 0 && matrix.length > 0) {
      matrix[0].branches.push({
        conceptId: `${matrix[0].conceptId}-remaining`,
        conceptName: 'Other Concepts',
        children: remaining.map(buildLeafRow),
      });
    }
  }

  // Final fallback: if matrix still has empty trunks and there are no leaves at all,
  // show the trunk concepts themselves as leaf items so users can see *something*
  const stillEmpty = matrix.length > 0 && matrix.every(t => t.branches.length === 0);
  if (stillEmpty && effectiveLeaves.length === 0) {
    for (const m of matrix) {
      const trunkConcept = trunks.find(t => t.id === m.conceptId);
      if (trunkConcept) {
        m.branches.push({
          conceptId: `${m.conceptId}-self`,
          conceptName: 'Overview',
          children: [buildLeafRow(trunkConcept)],
        });
      }
    }
  }

  if (matrix.length === 0) {
    const grouped: Record<string, LearningConcept[]> = {};
    for (const c of concepts) {
      const key = c.trunkDomain || c.parentName || UNGROUPED;
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
