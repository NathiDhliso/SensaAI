import { useState, useMemo, useCallback, useRef } from 'react';
import { Maximize, Minimize, Info } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import { useGenerationStore } from '@/store/generation-store';
import type { LearningConcept } from '@/shared/types/learning';
import { buildMatrixPayload, getFirstSuggestedKey } from './cognitive-matrix/buildMatrixPayload';
import { CognitiveMatrixGrid } from './cognitive-matrix/CognitiveMatrixGrid';
import styles from './ULCPracticeController.module.css';

interface ULCPracticeControllerProps {
  concepts: LearningConcept[];
  completedConceptIds: string[];
  onExploreWhy?: (conceptName: string) => void;
}

export function ULCPracticeController({
  concepts,
  completedConceptIds,
  onExploreWhy,
}: ULCPracticeControllerProps) {
  const { currentSession } = useLearningStore();
  const lifecycleVerbs = useGenerationStore(state => state.pass1Data?.lifecycle);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      zoneRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const missingSubject = !currentSession?.subject;
  const missingVerbs = !lifecycleVerbs;

  const masteredIds = useMemo(() => new Set(completedConceptIds ?? []), [completedConceptIds]);

  const payload = useMemo(
    () => buildMatrixPayload(
      concepts,
      currentSession?.subject || '',
      lifecycleVerbs ?? undefined,
    ),
    [concepts, currentSession?.subject, lifecycleVerbs]
  );

  const suggestedId = useMemo(
    () => getFirstSuggestedKey(payload, masteredIds),
    [payload, masteredIds]
  );

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

  return (
    <div className={styles.zone} ref={zoneRef}>
      <div className={styles.zoneHeader}>
        <div className={styles.zoneTitleGroup}>
          <span className={styles.zoneTitle}>Sensa AI Priming Zone</span>
          <span className={styles.zoneSubject}>{payload.subject || <em className={styles.missingHint}>Subject not set</em>}</span>
        </div>
        <div className={styles.zoneHeaderRight}>
          <span className={styles.progressPill}>{masteredIds.size}/{totalCells} mastered</span>
          <button className={styles.fullscreenBtn} onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>
        </div>
      </div>

      {(missingSubject || missingVerbs) && (
        <div className={styles.dataNotice}>
          <Info size={13} className={styles.dataNoticeIcon} />
          <span>
            {missingVerbs && 'Using default lifecycle verbs (PREPARE / MODEL / DELIVER). '}
            {missingSubject && 'Subject name was not set. '}
            Regenerating content may resolve this.
          </span>
        </div>
      )}

      <CognitiveMatrixGrid
        payload={payload}
        masteredIds={masteredIds}
        suggestedId={suggestedId}
        onExploreWhy={onExploreWhy}
      />

    </div>
  );
}

export default ULCPracticeController;
