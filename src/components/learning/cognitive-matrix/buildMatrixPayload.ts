import type { LearningConcept } from '@/shared/types/learning';
import type { MatrixPayload, MatrixConcept, DrillDownAction } from './types';

function buildAction(concept: LearningConcept): DrillDownAction {
  return {
    trick: concept.mnemonic?.anchor || concept.shape?.simpleCore || concept.name,
    chain: concept.prerequisites?.length
      ? concept.prerequisites
      : concept.mnemonic?.story
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

  const grouped: Record<string, LearningConcept[]> = {};
  for (const concept of concepts) {
    const domain = concept.trunkDomain || concept.parentName || 'General';
    if (!grouped[domain]) grouped[domain] = [];
    grouped[domain].push(concept);
  }

  const matrix: MatrixConcept[] = Object.entries(grouped).map(([domain, group]) => {
    const actions: Record<string, DrillDownAction | null> = {};
    const cellConceptIds: Record<string, string> = {};

    for (const verb of verbs) {
      const match = group.find(c => phaseVerb(c) === verb) ?? group[0];
      if (match) {
        actions[verb] = buildAction(match);
        cellConceptIds[verb] = match.id;
      } else {
        actions[verb] = null;
      }
    }

    return {
      conceptId: domain,
      conceptName: domain,
      actions,
      cellConceptIds,
    };
  });

  return { subject, verbs, matrix };
}

export function getFirstSuggestedKey(
  payload: MatrixPayload,
  masteredIds: Set<string>
): string | null {
  for (const verb of payload.verbs) {
    for (const concept of payload.matrix) {
      const realId = concept.cellConceptIds?.[verb];
      if (realId && !masteredIds.has(realId) && concept.actions?.[verb]) {
        return `${concept.conceptId}::${verb}`;
      }
    }
  }
  return null;
}
