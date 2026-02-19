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

const ULC_VERBS = ['Recall', 'Apply', 'Create'];

export function buildMatrixPayload(
  concepts: LearningConcept[],
  subject: string
): MatrixPayload {
  const ULC_VERBS_LOCAL = ULC_VERBS;

  function cognitiveVerb(level?: string): string {
    const l = (level || '').toLowerCase();
    if (l === 'evaluate' || l === 'create') return 'Create';
    if (l === 'apply' || l === 'analyze') return 'Apply';
    return 'Recall';
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

    for (const verb of ULC_VERBS_LOCAL) {
      const match = group.find(c => cognitiveVerb(c.cognitiveLevel) === verb) ?? group[0];
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

  return { subject, verbs: ULC_VERBS_LOCAL, matrix };
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
