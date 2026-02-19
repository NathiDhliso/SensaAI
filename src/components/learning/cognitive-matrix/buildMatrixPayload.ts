import type { LearningConcept } from '@/shared/types/learning';
import { detectULC, type ULCPattern } from '@/features/content-generation/parsers/ulc-detector';
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
  subject: string
): MatrixPayload {
  const pattern: ULCPattern = detectULC(concepts);

  if (pattern.detected) {
    const matrix: MatrixConcept[] = pattern.objects.map(obj => {
      const actions: Record<string, DrillDownAction | null> = {};
      const cellConceptIds: Record<string, string> = {};

      for (const verb of pattern.verbs) {
        const key = `${verb}::${obj}`;
        const conceptId = pattern.cellMap[key] ?? null;
        if (conceptId) {
          const concept = concepts.find(c => c.id === conceptId);
          actions[verb] = concept ? buildAction(concept) : null;
          if (conceptId) cellConceptIds[verb] = conceptId;
        } else {
          actions[verb] = null;
        }
      }

      return {
        conceptId: obj,
        conceptName: obj,
        actions,
        cellConceptIds,
      };
    });

    return { subject, verbs: pattern.verbs, matrix };
  }

  const grouped: Record<string, LearningConcept[]> = {};
  for (const concept of concepts) {
    const tier = (concept.tier || concept.mnemonic?.tier || 'leaf').toLowerCase();
    if (!grouped[tier]) grouped[tier] = [];
    grouped[tier].push(concept);
  }

  const verbs = ['Study'];
  const matrix: MatrixConcept[] = Object.entries(grouped).map(([tier, group]) => {
    const subConcepts = group.map(c => ({
      conceptId: c.id,
      conceptName: c.name,
      actions: { Study: buildAction(c) },
    }));

    return {
      conceptId: tier,
      conceptName: tier.charAt(0).toUpperCase() + tier.slice(1),
      subConcepts,
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
      if (concept.subConcepts) {
        for (const sub of concept.subConcepts) {
          if (!masteredIds.has(sub.conceptId) && sub.actions[verb]) {
            return `${sub.conceptId}::${verb}`;
          }
        }
      } else {
        if (!masteredIds.has(concept.conceptId) && concept.actions?.[verb]) {
          return `${concept.conceptId}::${verb}`;
        }
      }
    }
  }
  return null;
}
