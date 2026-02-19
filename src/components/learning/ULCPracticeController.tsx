import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle, Target, ArrowRight } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import type { LearningConcept } from '@/shared/types/learning';
import type { QMetricInputs } from '@/shared/services/blueprint-formula';
import {
  detectULC,
  buildULCMatrix,
  getNextULCCell,
  detectVerbJump,
  type ULCPattern,
  type ULCCell
} from '@/features/content-generation/parsers/ulc-detector';
import MicroLearningLoopController from './MicroLearningLoopController';
import CoachInterventionBanner from './ui/CoachInterventionBanner';
import styles from './ULCPracticeController.module.css';

interface ULCPracticeControllerProps {
  concepts: LearningConcept[];
  completedConceptIds: string[];
  subjectType?: string;
  onCellComplete: (conceptId: string, outcome: 'mastered' | 'needs-learning' | 'needs-review', metrics: Partial<QMetricInputs>) => void;
  onAllComplete: () => void;
}

export function ULCPracticeController({
  concepts,
  completedConceptIds,
  subjectType,
  onCellComplete,
  onAllComplete
}: ULCPracticeControllerProps) {
  const { studySession } = useLearningStore();
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);
  const [showVerbJumpWarning, setShowVerbJumpWarning] = useState(false);
  const [pendingJumpKey, setPendingJumpKey] = useState<string | null>(null);

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
    if (!activeCellKey) return null;
    const [verb, obj] = activeCellKey.split('::');
    const cell = matrix.flat().find(c => c.verb === verb && c.object === obj);
    if (!cell?.conceptId) return null;
    return concepts.find(c => c.id === cell.conceptId) ?? null;
  }, [activeCellKey, matrix, concepts]);

  const handleCellClick = useCallback((cell: ULCCell) => {
    if (!cell.conceptId || cell.status === 'mastered') return;
    const key = `${cell.verb}::${cell.object}`;

    const isVerbJump = detectVerbJump(
      [...completedConceptIds, cell.conceptId],
      ulcPattern
    );

    if (isVerbJump && ulcPattern.detected) {
      setPendingJumpKey(key);
      setShowVerbJumpWarning(true);
      return;
    }

    setActiveCellKey(key);
  }, [completedConceptIds, ulcPattern]);

  const handleLoopComplete = useCallback((
    outcome: 'mastered' | 'needs-learning' | 'needs-review',
    timeSpentSeconds: number
  ) => {
    if (!activeConcept) return;

    const progress = studySession ? {
      mapNodeCount: studySession.conceptMap?.nodes?.length ?? 0,
      mapConnectionCount: studySession.conceptMap?.connections?.length ?? 0
    } : { mapNodeCount: 0, mapConnectionCount: 0 };

    const score = outcome === 'mastered' ? 1.0 : outcome === 'needs-review' ? 0.6 : 0.3;

    onCellComplete(activeConcept.id, outcome, {
      quizAccuracy: score,
      blankSheetScore: score,
      timeSpentMs: timeSpentSeconds * 1000,
      avgResponseTimeMs: timeSpentSeconds > 0 ? (timeSpentSeconds * 1000) / 3 : 0,
      ...progress
    });

    setActiveCellKey(null);

    const remaining = concepts.filter(c => !completedConceptIds.includes(c.id) && c.id !== activeConcept.id);
    if (remaining.length === 0) {
      onAllComplete();
    }
  }, [activeConcept, studySession, onCellComplete, onAllComplete, concepts, completedConceptIds]);

  const handleConfirmJump = useCallback(() => {
    setShowVerbJumpWarning(false);
    if (pendingJumpKey) {
      setActiveCellKey(pendingJumpKey);
      setPendingJumpKey(null);
    }
  }, [pendingJumpKey]);

  const handleDismissJump = useCallback(() => {
    setShowVerbJumpWarning(false);
    setPendingJumpKey(null);
  }, []);

  if (activeConcept) {
    return (
      <motion.div
        key={`ulc-loop-${activeConcept.id}`}
        className={styles.loopWrapper}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
      >
        <div className={styles.loopHeader}>
          <Target size={16} className={styles.loopHeaderIcon} />
          <span className={styles.loopHeaderLabel}>
            {activeCellKey?.replace('::', ' × ')}
          </span>
          <button
            className={styles.backToMatrix}
            onClick={() => setActiveCellKey(null)}
          >
            ← Matrix
          </button>
        </div>
        <MicroLearningLoopController
          key={activeConcept.id}
          concept={activeConcept}
          allConcepts={concepts}
          complexityScore={(activeConcept as LearningConcept & { complexityScore?: number }).complexityScore ?? 5}
          userVelocity={1.0}
          subjectType={subjectType as any}
          onLoopComplete={handleLoopComplete}
          onSkip={() => setActiveCellKey(null)}
        />
      </motion.div>
    );
  }

  if (!ulcPattern.detected) {
    return <FallbackConceptList concepts={concepts} completedConceptIds={completedConceptIds} onSelect={(c) => {
      const key = `${c.name}::${c.id}`;
      setActiveCellKey(key);
    }} />;
  }

  const masteredCount = completedConceptIds.length;
  const totalCells = matrix.flat().filter(c => c.conceptId).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Target size={20} className={styles.headerIcon} />
          <div>
            <h2 className={styles.title}>ULC Mastery Matrix</h2>
            <p className={styles.subtitle}>
              {ulcPattern.verbs.length} actions × {ulcPattern.objects.length} resources
            </p>
          </div>
        </div>
        <div className={styles.progressBadge}>
          <span className={styles.progressCount}>{masteredCount}/{totalCells}</span>
          <span className={styles.progressLabel}>mastered</span>
        </div>
      </div>

      <AnimatePresence>
        {showVerbJumpWarning && (
          <div className={styles.interventionWrapper}>
            <CoachInterventionBanner
              type="skip_streak"
              onPrimary={handleConfirmJump}
              onSecondary={handleDismissJump}
              onDismiss={handleDismissJump}
            />
          </div>
        )}
      </AnimatePresence>

      {suggestedCell && (
        <button
          className={styles.suggestedCell}
          onClick={() => handleCellClick(suggestedCell)}
        >
          <ArrowRight size={16} />
          <span>Suggested next: <strong>{suggestedCell.verb} {suggestedCell.object}</strong></span>
        </button>
      )}

      <div className={styles.matrixWrapper}>
        <div
          className={styles.matrix}
          style={{ gridTemplateColumns: `minmax(120px, 1fr) repeat(${ulcPattern.verbs.length}, 1fr)` }}
        >
          <div className={styles.cornerCell} />
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

    </div>
  );
}

function MatrixCell({
  cell,
  isSuggested,
  onClick
}: {
  cell: ULCCell;
  isSuggested: boolean;
  onClick: () => void;
}) {
  const isClickable = !!cell.conceptId && cell.status !== 'mastered';

  return (
    <motion.button
      className={`${styles.cell} ${styles[`cell--${cell.status}`]} ${isSuggested ? styles['cell--suggested'] : ''} ${!cell.conceptId ? styles['cell--empty'] : ''}`}
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      whileHover={isClickable ? { scale: 1.05 } : {}}
      whileTap={isClickable ? { scale: 0.97 } : {}}
      title={cell.conceptId ? `${cell.verb} ${cell.object}` : 'No concept mapped'}
    >
      {cell.status === 'mastered' && <CheckCircle size={18} />}
      {cell.status === 'learning' && <Circle size={18} />}
      {cell.status === 'not-started' && cell.conceptId && <span className={styles.dot}>·</span>}
      {!cell.conceptId && <span className={styles.emptyDash}>—</span>}
    </motion.button>
  );
}

function FallbackConceptList({
  concepts,
  completedConceptIds,
  onSelect
}: {
  concepts: LearningConcept[];
  completedConceptIds: string[];
  onSelect: (concept: LearningConcept) => void;
}) {
  const incomplete = concepts.filter(c => !completedConceptIds.includes(c.id));

  return (
    <div className={styles.fallbackList}>
      <div className={styles.header}>
        <h2 className={styles.title}>Concept Practice</h2>
        <p className={styles.subtitle}>Select a concept to practice</p>
      </div>
      {incomplete.map(concept => (
        <button
          key={concept.id}
          className={styles.fallbackItem}
          onClick={() => onSelect(concept)}
        >
          <Circle size={16} className={styles.learningIcon} />
          <span>{concept.name}</span>
          <ArrowRight size={16} />
        </button>
      ))}
    </div>
  );
}

export default ULCPracticeController;
