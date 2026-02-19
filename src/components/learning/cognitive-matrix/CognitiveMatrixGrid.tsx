import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import type { MatrixPayload, MatrixConcept, SelectedCell } from './types';
import styles from './CognitiveMatrixGrid.module.css';

interface CognitiveMatrixGridProps {
  payload: MatrixPayload;
  masteredIds: Set<string>;
  suggestedId: string | null;
  selectedCell: SelectedCell | null;
  onCellClick: (cell: SelectedCell) => void;
}

export function CognitiveMatrixGrid({
  payload,
  masteredIds,
  suggestedId,
  selectedCell,
  onCellClick,
}: CognitiveMatrixGridProps) {
  const colCount = payload.verbs.length;

  return (
    <div className={styles.gridWrapper}>
      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `minmax(180px, auto) repeat(${colCount}, minmax(110px, 1fr))` }}
      >
        <div className={styles.cornerCell}>RESOURCE</div>
        {payload.verbs.map(verb => (
          <div key={verb} className={styles.verbHeader}>{verb.toUpperCase()}</div>
        ))}

        {payload.matrix.map(concept => (
          <ConceptRows
            key={concept.conceptId}
            concept={concept}
            verbs={payload.verbs}
            masteredIds={masteredIds}
            suggestedId={suggestedId}
            selectedCell={selectedCell}
            onCellClick={onCellClick}
          />
        ))}
      </div>
    </div>
  );
}

function ConceptRows({
  concept,
  verbs,
  masteredIds,
  suggestedId,
  selectedCell,
  onCellClick,
}: {
  concept: MatrixConcept;
  verbs: string[];
  masteredIds: Set<string>;
  suggestedId: string | null;
  selectedCell: SelectedCell | null;
  onCellClick: (cell: SelectedCell) => void;
}) {
  return (
    <>
      <div className={styles.parentLabel}>
        <span>{concept.conceptName}</span>
      </div>

      {verbs.map(verb => {
        const action = concept.actions?.[verb] ?? null;
        const realConceptId = concept.cellConceptIds?.[verb] ?? concept.conceptId;
        return (
          <GridCell
            key={`${concept.conceptId}-${verb}`}
            conceptId={concept.conceptId}
            realConceptId={realConceptId}
            conceptName={concept.conceptName}
            verb={verb}
            action={action}
            isMastered={masteredIds.has(realConceptId)}
            isSuggested={suggestedId === `${concept.conceptId}::${verb}`}
            isSelected={
              selectedCell?.conceptId === concept.conceptId &&
              selectedCell?.verb === verb
            }
            onCellClick={onCellClick}
          />
        );
      })}    </>
  );
}

function GridCell({
  conceptId,
  realConceptId,
  conceptName,
  verb,
  action,
  isMastered,
  isSuggested,
  isSelected,
  onCellClick,
}: {
  conceptId: string;
  realConceptId: string;
  conceptName: string;
  verb: string;
  action: import('./types').DrillDownAction | null;
  isMastered: boolean;
  isSuggested: boolean;
  isSelected: boolean;
  onCellClick: (cell: SelectedCell) => void;
}) {
  const isActive = !!action && !isMastered;

  const handleClick = () => {
    if (!action || isMastered) return;
    onCellClick({ conceptId, realConceptId, conceptName, verb, action, isMastered });
  };

  return (
    <motion.button
      className={[
        styles.cell,
        isMastered ? styles.cellMastered : '',
        isActive && !isMastered ? styles.cellActive : '',
        isSuggested ? styles.cellSuggested : '',
        isSelected ? styles.cellSelected : '',
        !action ? styles.cellNull : '',
      ].filter(Boolean).join(' ')}
      onClick={handleClick}
      disabled={!isActive}
      whileHover={isActive ? { scale: 1.05 } : {}}
      whileTap={isActive ? { scale: 0.95 } : {}}
      title={action ? `${verb} ${conceptName}` : undefined}
    >
      {isMastered && <CheckCircle size={15} className={styles.masteredIcon} />}
      {!isMastered && isActive && (
        <span className={styles.cellDot} />
      )}
      {!action && <span className={styles.nullDash}>—</span>}
    </motion.button>
  );
}
