import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Play } from 'lucide-react';
import type { MatrixPayload, MatrixConcept, SelectedCell, DrillDownAction } from './types';
import styles from './CognitiveMatrixGrid.module.css';

interface ExpandedCell {
  conceptId: string;
  verb: string;
  action: DrillDownAction;
  conceptName: string;
  realConceptId: string;
}

interface CognitiveMatrixGridProps {
  payload: MatrixPayload;
  masteredIds: Set<string>;
  suggestedId: string | null;
  onCellClick: (cell: SelectedCell) => void;
}

export function CognitiveMatrixGrid({
  payload,
  masteredIds,
  suggestedId,
  onCellClick,
}: CognitiveMatrixGridProps) {
  const colCount = payload.verbs.length;
  const [expandedCell, setExpandedCell] = useState<ExpandedCell | null>(null);

  const handleCellTap = (cell: ExpandedCell) => {
    setExpandedCell(prev =>
      prev?.conceptId === cell.conceptId && prev?.verb === cell.verb ? null : cell
    );
  };

  const handleStartDrill = () => {
    if (!expandedCell) return;
    onCellClick({
      conceptId: expandedCell.conceptId,
      realConceptId: expandedCell.realConceptId,
      conceptName: expandedCell.conceptName,
      verb: expandedCell.verb,
      action: expandedCell.action,
      isMastered: false,
    });
    setExpandedCell(null);
  };

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
            expandedCell={expandedCell}
            colCount={colCount}
            onCellTap={handleCellTap}
            onStartDrill={handleStartDrill}
            onCloseDrawer={() => setExpandedCell(null)}
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
  expandedCell,
  colCount,
  onCellTap,
  onStartDrill,
  onCloseDrawer,
}: {
  concept: MatrixConcept;
  verbs: string[];
  masteredIds: Set<string>;
  suggestedId: string | null;
  expandedCell: ExpandedCell | null;
  colCount: number;
  onCellTap: (cell: ExpandedCell) => void;
  onStartDrill: () => void;
  onCloseDrawer: () => void;
}) {
  const isDrawerOpen = expandedCell?.conceptId === concept.conceptId;

  return (
    <>
      <div className={styles.parentLabel}>
        <span>{concept.conceptName}</span>
      </div>

      {verbs.map(verb => {
        const action = concept.actions?.[verb] ?? null;
        const realConceptId = concept.cellConceptIds?.[verb] ?? concept.conceptId;
        const isExpanded = expandedCell?.conceptId === concept.conceptId && expandedCell?.verb === verb;
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
            isExpanded={isExpanded}
            onCellTap={onCellTap}
          />
        );
      })}

      <AnimatePresence>
        {isDrawerOpen && expandedCell && (
          <motion.div
            className={styles.drawer}
            style={{ gridColumn: `1 / ${colCount + 2}` }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
          >
            <div className={styles.drawerInner}>
              <div className={styles.drawerMeta}>
                <span className={styles.drawerVerb}>{expandedCell.verb}</span>
                <span className={styles.drawerSep}>×</span>
                <span className={styles.drawerConcept}>{expandedCell.conceptName}</span>
              </div>

              <div className={styles.drawerBody}>
                <div className={styles.trickBox}>
                  <div className={styles.trickLabel}>
                    <span className={styles.trickIcon}>🧠</span>
                    <span>THE TRICK</span>
                    <span className={styles.trickTag}>Mental Shortcut</span>
                  </div>
                  <p className={styles.trickText}>{expandedCell.action.trick}</p>
                </div>

                <div className={styles.checklistPanel}>
                  <div className={styles.checklistHeader}>
                    <span className={styles.checklistIcon}>⚡</span>
                    <span className={styles.checklistTitle}>EXECUTION CHECKLIST</span>
                    {expandedCell.action.chain.length > 0 && (
                      <span className={styles.prereqPill}>
                        Needs: {expandedCell.action.chain.join(' → ')}
                      </span>
                    )}
                  </div>
                  {expandedCell.action.steps.length > 0 ? (
                    <ol className={styles.checklist}>
                      {expandedCell.action.steps.map((step, i) => (
                        <li key={i} className={styles.checklistItem}>
                          <span className={styles.checklistNum}>{i + 1}</span>
                          <span className={styles.checklistText}>{step}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className={styles.drawerEmpty}>No steps defined.</p>
                  )}
                </div>
              </div>

              <div className={styles.drawerFooter}>
                <button className={styles.drawerClose} onClick={onCloseDrawer}>Dismiss</button>
                <button className={styles.drawerDrill} onClick={onStartDrill}>
                  <Play size={13} />
                  Start Drill
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  isExpanded,
  onCellTap,
}: {
  conceptId: string;
  realConceptId: string;
  conceptName: string;
  verb: string;
  action: DrillDownAction | null;
  isMastered: boolean;
  isSuggested: boolean;
  isExpanded: boolean;
  onCellTap: (cell: ExpandedCell) => void;
}) {
  const isActive = !!action && !isMastered;

  const handleClick = () => {
    if (!action || isMastered) return;
    onCellTap({ conceptId, realConceptId, conceptName, verb, action });
  };

  return (
    <motion.button
      className={[
        styles.cell,
        isMastered ? styles.cellMastered : '',
        isActive && !isMastered ? styles.cellActive : '',
        isSuggested ? styles.cellSuggested : '',
        isExpanded ? styles.cellSelected : '',
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
