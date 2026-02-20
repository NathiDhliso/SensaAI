import type { LearningConcept } from '@/shared/types/learning';
import type { MatrixPayload, MatrixConcept, BranchRow, LeafRow, DrillDownAction, CreatorPerspective } from './types';

function buildTrick(concept: LearningConcept): string {
  return (
    concept.shape?.analogicalModel ||
    concept.shape?.simpleCore ||
    concept.hookSentence ||
    concept.name
  );
}

function buildChain(concept: LearningConcept): string[] {
  return concept.prerequisites?.length
    ? concept.prerequisites
    : concept.mnemonic?.story
      ? [concept.mnemonic.story]
      : [];
}

function buildStepsForVerb(concept: LearningConcept, verbIndex: number): string[] {
  const phase1Steps = concept.lifecycle?.phase1?.steps ?? [];
  const phase2Steps = concept.lifecycle?.phase2?.steps ?? [];
  const phase3Steps = concept.lifecycle?.phase3?.steps ?? [];
  const workedSteps = concept.workedExample?.steps ?? [];
  const keyPoints = concept.keyPoints ?? [];

  if (verbIndex === 0) {
    return phase1Steps.length ? phase1Steps
      : keyPoints.length ? keyPoints
      : workedSteps.length ? workedSteps
      : [];
  }
  if (verbIndex === 1) {
    return phase2Steps.length ? phase2Steps
      : workedSteps.length ? workedSteps
      : keyPoints.length ? keyPoints
      : [];
  }
  return phase3Steps.length ? phase3Steps
    : workedSteps.length ? workedSteps
    : keyPoints.length ? keyPoints
    : [];
}

function buildPerspectives(concept: LearningConcept, verbIndex: number): CreatorPerspective[] | undefined {
  if (concept.perspectives && concept.perspectives.length > 0) {
    return concept.perspectives;
  }

  const perspectives: CreatorPerspective[] = [];
  const phase1Steps = concept.lifecycle?.phase1?.steps ?? [];
  const phase2Steps = concept.lifecycle?.phase2?.steps ?? [];
  const phase3Steps = concept.lifecycle?.phase3?.steps ?? [];

  if (verbIndex === 0 && phase1Steps.length > 0) {
    const executionLine = phase1Steps.find(s => s.includes('→'));
    const steps = executionLine
      ? executionLine.split(/\s*→\s*/).map(s => s.trim()).filter(s => s.length > 3)
      : phase1Steps;
    const selectionSteps = phase1Steps.filter(s => s.startsWith('When ') || s.includes('→ Unlocks'));
    if (steps.length > 0) {
      perspectives.push({
        label: 'Blueprint',
        blueprint: executionLine || phase1Steps[0] || '',
        steps,
      });
    }
    if (selectionSteps.length > 0) {
      perspectives.push({
        label: 'Decision Map',
        blueprint: 'When to apply each approach and what it unlocks',
        steps: selectionSteps,
      });
    }
  }

  if (verbIndex === 1 && phase2Steps.length > 0) {
    perspectives.push({
      label: 'Application',
      blueprint: phase2Steps[0] || '',
      steps: phase2Steps,
    });
  }

  if (verbIndex === 2 && phase3Steps.length > 0) {
    const toolLine = phase3Steps.find(s => s.startsWith('Tool:'));
    const metricLines = phase3Steps.filter(s => s.startsWith('Metrics:') || s.startsWith('Thresholds:'));
    perspectives.push({
      label: 'Tool / Method',
      blueprint: toolLine || phase3Steps[0] || '',
      steps: metricLines.length > 0 ? metricLines : phase3Steps,
    });
  }

  return perspectives.length > 0 ? perspectives : undefined;
}

function buildAction(concept: LearningConcept, verbIndex: number): DrillDownAction {
  const phase3Raw = concept.lifecycle?.phase3 as unknown as { tool?: string; metrics?: string[] } | undefined;
  return {
    trick: buildTrick(concept),
    chain: buildChain(concept),
    steps: buildStepsForVerb(concept, verbIndex),
    shape: concept.shape ? {
      simpleCore: concept.shape.simpleCore,
      highStakesExample: concept.shape.highStakesExample,
      analogicalModel: concept.shape.analogicalModel,
      patternRecognition: concept.shape.patternRecognition,
      eliminationLogic: concept.shape.eliminationLogic,
    } : undefined,
    phase3: (phase3Raw?.tool || phase3Raw?.metrics?.length) ? {
      tool: phase3Raw?.tool,
      metrics: phase3Raw?.metrics,
    } : undefined,
    perspectives: buildPerspectives(concept, verbIndex),
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
    const actions: Record<string, DrillDownAction> = {};
    const cellConceptIds: Record<string, string> = {};
    for (let i = 0; i < verbs.length; i++) {
      actions[verbs[i]] = buildAction(leaf, i);
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
