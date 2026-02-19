import { useState, useMemo, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import { useGenerationStore } from '@/store/generation-store';
import type { LearningConcept } from '@/shared/types/learning';
import type { QMetricInputs } from '@/shared/services/blueprint-formula';
import { buildMatrixPayload, getFirstSuggestedKey } from './cognitive-matrix/buildMatrixPayload';
import { CognitiveMatrixGrid } from './cognitive-matrix/CognitiveMatrixGrid';
import type { SelectedCell } from './cognitive-matrix/types';
import MicroLearningLoopController from './MicroLearningLoopController';
import styles from './ULCPracticeController.module.css';

interface ULCPracticeControllerProps {
  concepts: LearningConcept[];
  completedConceptIds: string[];
  subjectType?: string;
  onCellComplete: (
    conceptId: string,
    outcome: 'mastered' | 'needs-learning' | 'needs-review',
    metrics: Partial<QMetricInputs>
  ) => void;
  onAllComplete: () => void;
}

export function ULCPracticeController({
  concepts,
  completedConceptIds,
  subjectType,
  onCellComplete,
  onAllComplete,
}: ULCPracticeControllerProps) {
  const { studySession, currentSession } = useLearningStore();
  const lifecycleVerbs = useGenerationStore(state => state.pass1Data?.lifecycle);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [inLoop, setInLoop] = useState(false);


  const masteredIds = useMemo(() => new Set(completedConceptIds), [completedConceptIds]);

  const payload = useMemo(
    () => buildMatrixPayload(concepts, currentSession?.subject ?? 'Concepts', lifecycleVerbs ?? undefined),
    [concepts, currentSession?.subject, lifecycleVerbs]
  );

  const suggestedId = useMemo(
    () => getFirstSuggestedKey(payload, masteredIds),
    [payload, masteredIds]
  );

  const activeConcept = useMemo(() => {
    if (!selectedCell) return null;
    return concepts.find(c => c.id === selectedCell.realConceptId) ?? null;
  }, [selectedCell, concepts]);

  const handleCellClick = useCallback((cell: SelectedCell) => {
    setSelectedCell(cell);
    setInLoop(true);
  }, []);

  const handleLoopComplete = useCallback((
    outcome: 'mastered' | 'needs-learning' | 'needs-review',
    timeSpentSeconds: number
  ) => {
    if (!activeConcept) return;

    const progress = studySession ? {
      mapNodeCount: studySession.conceptMap?.nodes?.length ?? 0,
      mapConnectionCount: studySession.conceptMap?.connections?.length ?? 0,
    } : { mapNodeCount: 0, mapConnectionCount: 0 };

    const score = outcome === 'mastered' ? 1.0 : outcome === 'needs-review' ? 0.6 : 0.3;

    onCellComplete(activeConcept.id, outcome, {
      quizAccuracy: score,
      blankSheetScore: score,
      timeSpentMs: timeSpentSeconds * 1000,
      avgResponseTimeMs: timeSpentSeconds > 0 ? (timeSpentSeconds * 1000) / 3 : 0,
      ...progress,
    });

    setSelectedCell(null);
    setInLoop(false);

    const remaining = concepts.filter(
      c => !completedConceptIds.includes(c.id) && c.id !== activeConcept.id
    );
    if (remaining.length === 0) onAllComplete();
  }, [activeConcept, studySession, onCellComplete, onAllComplete, concepts, completedConceptIds]);

  const totalCells = useMemo(() => {
    const seen = new Set<string>();
    for (const trunk of payload.matrix) {
      for (const branch of trunk.branches) {
        for (const leaf of branch.children) {
          const realId = leaf.cellConceptIds?.[payload.verbs[0]];
          if (realId) seen.add(realId);
        }
      }
      for (const leaf of trunk.children) {
        const realId = leaf.cellConceptIds?.[payload.verbs[0]];
        if (realId) seen.add(realId);
      }
    }
    return seen.size;
  }, [payload]);

  if (inLoop && activeConcept) {
    return (
      <div className={styles.loopWrapper}>
        <button className={styles.backBtn} onClick={() => { setInLoop(false); setSelectedCell(null); }}>
          <ArrowLeft size={15} />
          Back to Matrix
        </button>
        <MicroLearningLoopController
          key={activeConcept.id}
          concept={activeConcept}
          allConcepts={concepts}
          complexityScore={(activeConcept as LearningConcept & { complexityScore?: number }).complexityScore ?? 5}
          userVelocity={1.0}
          subjectType={subjectType as any}
          onLoopComplete={handleLoopComplete}
          onSkip={() => { setInLoop(false); setSelectedCell(null); }}
        />
      </div>
    );
  }

  return (
    <div className={styles.zone}>
      <div className={styles.zoneHeader}>
        <div className={styles.zoneTitleGroup}>
          <span className={styles.zoneTitle}>Sensa AI Priming Zone</span>
          <span className={styles.zoneSubject}>{payload.subject}</span>
        </div>
        <span className={styles.progressPill}>{masteredIds.size}/{totalCells} mastered</span>
      </div>

      <CognitiveMatrixGrid
        payload={payload}
        masteredIds={masteredIds}
        suggestedId={suggestedId}
        onCellClick={handleCellClick}
      />

    </div>
  );
}

export default ULCPracticeController;
