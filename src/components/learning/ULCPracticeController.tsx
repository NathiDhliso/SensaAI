import { useState, useMemo, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import type { LearningConcept } from '@/shared/types/learning';
import type { QMetricInputs } from '@/shared/services/blueprint-formula';
import { detectVerbJump } from '@/features/content-generation/parsers/ulc-detector';
import { buildMatrixPayload, getFirstSuggestedKey } from './cognitive-matrix/buildMatrixPayload';
import { CognitiveMatrixGrid } from './cognitive-matrix/CognitiveMatrixGrid';
import { DrillDownCard } from './cognitive-matrix/DrillDownCard';
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
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [inLoop, setInLoop] = useState(false);
  const [pendingJumpVerb, setPendingJumpVerb] = useState<SelectedCell | null>(null);

  const masteredIds = useMemo(() => new Set(completedConceptIds), [completedConceptIds]);

  const payload = useMemo(
    () => buildMatrixPayload(concepts, currentSession?.subject ?? 'Concepts'),
    [concepts, currentSession?.subject]
  );

  const suggestedId = useMemo(
    () => getFirstSuggestedKey(payload, masteredIds),
    [payload, masteredIds]
  );

  const activeConcept = useMemo(() => {
    if (!selectedCell) return null;
    return concepts.find(c => c.id === selectedCell.conceptId) ?? null;
  }, [selectedCell, concepts]);

  const handleCellClick = useCallback((cell: SelectedCell) => {
    const ulcPattern = { detected: payload.verbs.length > 1, verbs: payload.verbs, objects: [], confidence: 0, cellMap: {} };
    const isVerbJump = detectVerbJump(
      [...completedConceptIds, cell.conceptId],
      ulcPattern
    );
    if (isVerbJump) {
      setPendingJumpVerb(cell);
      return;
    }
    setSelectedCell(cell);
  }, [completedConceptIds, payload.verbs]);

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
    let count = 0;
    for (const concept of payload.matrix) {
      if (concept.subConcepts) {
        count += concept.subConcepts.length;
      } else {
        count += 1;
      }
    }
    return count;
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

      <div className={styles.matrixAndPanel}>
        <div className={styles.matrixArea}>
          <CognitiveMatrixGrid
            payload={payload}
            masteredIds={masteredIds}
            suggestedId={suggestedId}
            selectedCell={selectedCell}
            onCellClick={handleCellClick}
          />
        </div>

        <DrillDownCard
          cell={selectedCell}
          onClose={() => setSelectedCell(null)}
          onStartDrill={() => setInLoop(true)}
        />
      </div>

      {pendingJumpVerb && (
        <div className={styles.jumpOverlay} onClick={() => setPendingJumpVerb(null)}>
          <div className={styles.jumpWarning} onClick={e => e.stopPropagation()}>
            <p className={styles.jumpTitle}>Verb jump detected</p>
            <p className={styles.jumpBody}>
              You're skipping ahead to <strong>{pendingJumpVerb.verb}</strong> before finishing the current action across all resources. Mastering one verb fully first builds stronger recall.
            </p>
            <div className={styles.jumpActions}>
              <button className={styles.jumpConfirm} onClick={() => { setSelectedCell(pendingJumpVerb); setPendingJumpVerb(null); }}>
                Continue anyway
              </button>
              <button className={styles.jumpCancel} onClick={() => setPendingJumpVerb(null)}>
                Stay on track
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ULCPracticeController;
