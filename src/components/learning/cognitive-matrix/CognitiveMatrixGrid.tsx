import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, CheckCircle } from 'lucide-react';
import type { MatrixPayload, MatrixConcept, MatrixSubConcept, SelectedCell } from './types';
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
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
            collapsed={collapsedIds.has(concept.conceptId)}
            onToggle={() => toggleCollapse(concept.conceptId)}
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
  collapsed,
  onToggle,
  onCellClick,
}: {
  concept: MatrixConcept;
  verbs: string[];
  masteredIds: Set<string>;
  suggestedId: string | null;
  selectedCell: SelectedCell | null;
  collapsed: boolean;
  onToggle: () => void;
  onCellClick: (cell: SelectedCell) => void;
}) {
  const hasChildren = concept.subConcepts && concept.subConcepts.length > 0;

  return (
    <>
      <div
        className={`${styles.parentLabel} ${hasChildren ? styles.parentLabelClickable : ''}`}
        onClick={hasChildren ? onToggle : undefined}
      >
        {hasChildren && (
          <motion.span
            className={styles.chevron}
            animate={{ rotate: collapsed ? 0 : 90 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronRight size={14} />
          </motion.span>
        )}
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
            isMastered={masteredIds.has(concept.conceptId)}
            isSuggested={suggestedId === `${concept.conceptId}::${verb}`}
            isSelected={
              selectedCell?.conceptId === concept.conceptId &&
              selectedCell?.verb === verb
            }
            onCellClick={onCellClick}
          />
        );
      })}

      {hasChildren && !collapsed &&
        concept.subConcepts!.map(sub => (
          <SubConceptRow
            key={sub.conceptId}
            sub={sub}
            verbs={verbs}
            masteredIds={masteredIds}
            suggestedId={suggestedId}
            selectedCell={selectedCell}
            onCellClick={onCellClick}
          />
        ))
      }
    </>
  );
}

function SubConceptRow({
  sub,
  verbs,
  masteredIds,
  suggestedId,
  selectedCell,
  onCellClick,
}: {
  sub: MatrixSubConcept;
  verbs: string[];
  masteredIds: Set<string>;
  suggestedId: string | null;
  selectedCell: SelectedCell | null;
  onCellClick: (cell: SelectedCell) => void;
}) {
  return (
    <>
      <div className={styles.childLabel}>
        <span className={styles.childIndent} />
        <span>{sub.conceptName}</span>
      </div>

      {verbs.map(verb => {
        const action = sub.actions[verb] ?? null;
        return (
          <GridCell
            key={`${sub.conceptId}-${verb}`}
            conceptId={sub.conceptId}
            realConceptId={sub.conceptId}
            conceptName={sub.conceptName}
            verb={verb}
            action={action}
            isMastered={masteredIds.has(sub.conceptId)}
            isSuggested={suggestedId === `${sub.conceptId}::${verb}`}
            isSelected={
              selectedCell?.conceptId === sub.conceptId &&
              selectedCell?.verb === verb
            }
            onCellClick={onCellClick}
          />
        );
      })}
    </>
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
