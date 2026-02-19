import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, ArrowLeft } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import type { LearningConcept } from '@/shared/types/learning';
import type { QMetricInputs } from '@/shared/services/blueprint-formula';
import {
  detectULC,
  buildULCMatrix,
  getNextULCCell,
  detectVerbJump,
  type ULCPattern,
  type ULCCell,
} from '@/features/content-generation/parsers/ulc-detector';
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
  const { studySession } = useLearningStore();
  const [drillCell, setDrillCell] = useState<ULCCell | null>(null);
  const [inLoop, setInLoop] = useState(false);
  const [pendingJumpCell, setPendingJumpCell] = useState<ULCCell | null>(null);

  const ulcPattern: ULCPattern = useMemo(() => detectULC(concepts), [concepts]);

  const matrix: ULCCell[][] = useMemo(
    () => buildULCMatrix(ulcPattern, concepts, completedConceptIds),
    [ulcPattern, concepts, completedConceptIds]
  );

  const suggestedCell = useMemo(
    () => getNextULCCell(matrix, ulcPattern),
    [matrix, ulcPattern]
  );

  const activeConcept = useMemo(() => {
    if (!drillCell?.conceptId) return null;
    return concepts.find(c => c.id === drillCell.conceptId) ?? null;
  }, [drillCell, concepts]);

  const drillConcept = useMemo(() => {
    if (!drillCell?.conceptId) return null;
    return concepts.find(c => c.id === drillCell.conceptId) ?? null;
  }, [drillCell, concepts]);

  const handleCellClick = useCallback((cell: ULCCell) => {
    if (!cell.conceptId || cell.status === 'mastered') return;

    const isVerbJump = detectVerbJump(
      [...completedConceptIds, cell.conceptId],
      ulcPattern
    );

    if (isVerbJump && ulcPattern.detected) {
      setPendingJumpCell(cell);
      return;
    }

    setDrillCell(cell);
  }, [completedConceptIds, ulcPattern]);

  const handleStartLoop = useCallback(() => {
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

    setDrillCell(null);
    setInLoop(false);

    const remaining = concepts.filter(
      c => !completedConceptIds.includes(c.id) && c.id !== activeConcept.id
    );
    if (remaining.length === 0) onAllComplete();
  }, [activeConcept, studySession, onCellComplete, onAllComplete, concepts, completedConceptIds]);

  const masteredCount = completedConceptIds.length;
  const totalCells = matrix.flat().filter(c => c.conceptId).length;

  if (inLoop && activeConcept) {
    return (
      <div className={styles.loopWrapper}>
        <button className={styles.backBtn} onClick={() => { setInLoop(false); setDrillCell(null); }}>
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
          onSkip={() => { setInLoop(false); setDrillCell(null); }}
        />
      </div>
    );
  }

  if (!ulcPattern.detected) {
    return (
      <FallbackList
        concepts={concepts}
        completedConceptIds={completedConceptIds}
        onSelect={(cell) => setDrillCell(cell)}
      />
    );
  }

  return (
    <div className={styles.zone}>
      <div className={styles.zoneHeader}>
        <span className={styles.zoneTitle}>Sensa AI Priming Zone</span>
        <span className={styles.progressPill}>{masteredCount}/{totalCells} mastered</span>
      </div>

      <div className={styles.matrixScroll}>
        <div
          className={styles.matrix}
          style={{ gridTemplateColumns: `minmax(140px, auto) repeat(${ulcPattern.verbs.length}, 1fr)` }}
        >
          <div className={styles.cornerCell}>RESOURCE</div>
          {ulcPattern.verbs.map(verb => (
            <div key={verb} className={styles.verbHeader}>{verb}</div>
          ))}

          {matrix.map((row, rowIdx) => (
            <div key={ulcPattern.objects[rowIdx]} className={styles.matrixRow}>
              <div className={styles.objectLabel}>{ulcPattern.objects[rowIdx]}</div>
              {row.map((cell, colIdx) => (
                <MatrixCell
                  key={`${rowIdx}-${colIdx}`}
                  cell={cell}
                  isSuggested={
                    suggestedCell?.verb === cell.verb &&
                    suggestedCell?.object === cell.object
                  }
                  onClick={() => handleCellClick(cell)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {drillCell && drillConcept && !inLoop && (
          <motion.div
            className={styles.drillOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setDrillCell(null)}
          >
            <motion.div
              className={styles.drillPanel}
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.drillHeader}>
                <span className={styles.drillTitle}>
                  {drillCell.verb} {drillCell.object}
                </span>
                <button className={styles.drillClose} onClick={() => setDrillCell(null)}>
                  <X size={16} />
                </button>
              </div>

              <DrillBlock
                icon="🧠"
                label="THE TRICK"
                sublabel="Schema"
                content={drillConcept.mnemonic?.anchor || drillConcept.shape?.simpleCore || drillConcept.name}
              />

              <DrillBlock
                icon="🔗"
                label="THE CHAIN"
                sublabel="Prerequisites"
                content={
                  drillConcept.prerequisites?.length
                    ? drillConcept.prerequisites.join('\n')
                    : drillConcept.mnemonic?.story || 'No prerequisites listed.'
                }
                list
              />

              <DrillBlock
                icon="⚡"
                label="ATOMIC STEPS"
                sublabel="Execution"
                content={
                  drillConcept.lifecycle?.phase1?.steps?.join('\n') ||
                  drillConcept.keyPoints?.join('\n') ||
                  'Open the resource → Configure settings → Review + Create'
                }
                list
              />

              <button className={styles.drillStart} onClick={handleStartLoop}>
                Start Drill
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingJumpCell && (
          <motion.div
            className={styles.drillOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPendingJumpCell(null)}
          >
            <motion.div
              className={styles.jumpWarning}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
            >
              <p className={styles.jumpTitle}>Verb jump detected</p>
              <p className={styles.jumpBody}>
                You're skipping ahead to <strong>{pendingJumpCell.verb}</strong> before finishing the current action across all resources. Mastering one verb fully first builds stronger recall.
              </p>
              <div className={styles.jumpActions}>
                <button className={styles.jumpConfirm} onClick={() => { setDrillCell(pendingJumpCell); setPendingJumpCell(null); }}>
                  Continue anyway
                </button>
                <button className={styles.jumpCancel} onClick={() => setPendingJumpCell(null)}>
                  Stay on track
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MatrixCell({
  cell,
  isSuggested,
  onClick,
}: {
  cell: ULCCell;
  isSuggested: boolean;
  onClick: () => void;
}) {
  const isClickable = !!cell.conceptId && cell.status !== 'mastered';
  const statusClass = cell.status === 'mastered'
    ? styles.cellMastered
    : cell.status === 'learning'
      ? styles.cellLearning
      : styles.cellNotStarted;

  return (
    <motion.button
      className={`${styles.cell} ${statusClass} ${isSuggested ? styles.cellSuggested : ''} ${!cell.conceptId ? styles.cellEmpty : ''}`}
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      whileHover={isClickable ? { scale: 1.04 } : {}}
      whileTap={isClickable ? { scale: 0.96 } : {}}
      title={cell.conceptId ? `${cell.verb} × ${cell.object}` : undefined}
    >
      {cell.status === 'mastered' && <CheckCircle size={16} />}
      {cell.status !== 'mastered' && cell.conceptId && (
        <span className={styles.cellLabel}>
          {isSuggested ? 'Start here' : 'Drill'}
        </span>
      )}
      {!cell.conceptId && <span className={styles.cellEmpty}>—</span>}
    </motion.button>
  );
}

function DrillBlock({
  icon,
  label,
  sublabel,
  content,
  list,
}: {
  icon: string;
  label: string;
  sublabel: string;
  content: string;
  list?: boolean;
}) {
  const lines = content.split('\n').filter(Boolean);

  return (
    <div className={styles.drillBlock}>
      <div className={styles.drillBlockHeader}>
        <span className={styles.drillBlockIcon}>{icon}</span>
        <span className={styles.drillBlockLabel}>{label}</span>
        <span className={styles.drillBlockSub}>({sublabel})</span>
      </div>
      {list && lines.length > 1 ? (
        <ol className={styles.drillBlockList}>
          {lines.map((line, i) => <li key={i}>{line}</li>)}
        </ol>
      ) : (
        <p className={styles.drillBlockText}>{content}</p>
      )}
    </div>
  );
}

function FallbackList({
  concepts,
  completedConceptIds,
  onSelect,
}: {
  concepts: LearningConcept[];
  completedConceptIds: string[];
  onSelect: (cell: ULCCell) => void;
}) {
  const incomplete = concepts.filter(c => !completedConceptIds.includes(c.id));

  return (
    <div className={styles.fallbackList}>
      <p className={styles.fallbackHint}>Select a concept to drill</p>
      {incomplete.map(concept => (
        <button
          key={concept.id}
          className={styles.fallbackItem}
          onClick={() => onSelect({ verb: concept.name, object: concept.id, conceptId: concept.id, status: 'not-started' })}
        >
          <span>{concept.name}</span>
        </button>
      ))}
    </div>
  );
}

export default ULCPracticeController;
