import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Play, ChevronRight } from 'lucide-react';
import type { MatrixPayload, MatrixConcept, BranchRow, LeafRow, SelectedCell, DrillDownAction } from './types';
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

export function CognitiveMatrixGrid({ payload, masteredIds, suggestedId, onCellClick }: CognitiveMatrixGridProps) {
  const colCount = payload.verbs.length;
  const [expandedCell, setExpandedCell] = useState<ExpandedCell | null>(null);
  const [openTrunks, setOpenTrunks] = useState<Set<string>>(() => new Set());
  const [openBranches, setOpenBranches] = useState<Set<string>>(() => new Set());

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

  const toggleTrunk = (id: string) => {
    setOpenTrunks(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); setExpandedCell(null); }
      else next.add(id);
      return next;
    });
  };

  const toggleBranch = (id: string) => {
    setOpenBranches(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); setExpandedCell(null); }
      else next.add(id);
      return next;
    });
  };

  const colTemplate = `minmax(220px, auto) repeat(${colCount}, minmax(110px, 1fr))`;

  return (
    <div className={styles.gridWrapper}>
      <div className={styles.grid} style={{ gridTemplateColumns: colTemplate }}>
        <div className={styles.cornerCell}>DOMAINS</div>
        {payload.verbs.map(verb => (
          <div key={verb} className={styles.verbHeader}>{verb.toUpperCase()}</div>
        ))}
        {payload.matrix.map(trunk => (
          <TrunkRowGroup
            key={trunk.conceptId}
            trunk={trunk}
            verbs={payload.verbs}
            masteredIds={masteredIds}
            suggestedId={suggestedId}
            expandedCell={expandedCell}
            isTrunkOpen={openTrunks.has(trunk.conceptId)}
            openBranches={openBranches}
            colCount={colCount}
            colTemplate={colTemplate}
            onToggleTrunk={() => toggleTrunk(trunk.conceptId)}
            onToggleBranch={toggleBranch}
            onCellTap={handleCellTap}
            onStartDrill={handleStartDrill}
            onCloseDrawer={() => setExpandedCell(null)}
          />
        ))}
      </div>
    </div>
  );
}

function TrunkRowGroup({
  trunk, verbs, masteredIds, suggestedId, expandedCell,
  isTrunkOpen, openBranches, colCount, colTemplate,
  onToggleTrunk, onToggleBranch, onCellTap, onStartDrill, onCloseDrawer,
}: {
  trunk: MatrixConcept;
  verbs: string[];
  masteredIds: Set<string>;
  suggestedId: string | null;
  expandedCell: ExpandedCell | null;
  isTrunkOpen: boolean;
  openBranches: Set<string>;
  colCount: number;
  colTemplate: string;
  onToggleTrunk: () => void;
  onToggleBranch: (id: string) => void;
  onCellTap: (cell: ExpandedCell) => void;
  onStartDrill: () => void;
  onCloseDrawer: () => void;
}) {
  const allLeaves = [
    ...trunk.branches.flatMap(b => b.children),
    ...trunk.children,
  ];
  const totalLeaves = allLeaves.length;
  const masteredLeaves = allLeaves.filter(l =>
    Object.values(l.cellConceptIds).some(id => masteredIds.has(id))
  ).length;

  return (
    <>
      <div className={styles.trunkLabel} onClick={onToggleTrunk} role="button" aria-expanded={isTrunkOpen}>
        <motion.span className={styles.chevron} animate={{ rotate: isTrunkOpen ? 90 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronRight size={14} />
        </motion.span>
        <span className={styles.parentName}>{trunk.conceptName}</span>
        <span className={styles.parentCount}>{masteredLeaves}/{totalLeaves}</span>
      </div>
      {verbs.map(verb => (
        <div key={`${trunk.conceptId}-${verb}-ph`} className={styles.trunkPlaceholder} />
      ))}

      <AnimatePresence>
        {isTrunkOpen && (
          <motion.div
            className={styles.childrenBlock}
            style={{ gridColumn: `1 / ${colCount + 2}` }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
          >
            {trunk.branches.map(branch => (
              <BranchRowGroup
                key={branch.conceptId}
                branch={branch}
                verbs={verbs}
                masteredIds={masteredIds}
                suggestedId={suggestedId}
                expandedCell={expandedCell}
                isOpen={openBranches.has(branch.conceptId)}
                colCount={colCount}
                colTemplate={colTemplate}
                onToggle={() => onToggleBranch(branch.conceptId)}
                onCellTap={onCellTap}
                onStartDrill={onStartDrill}
                onCloseDrawer={onCloseDrawer}
              />
            ))}
            {trunk.children.map(leaf => (
              <LeafRowComponent
                key={leaf.conceptId}
                leaf={leaf}
                verbs={verbs}
                masteredIds={masteredIds}
                suggestedId={suggestedId}
                expandedCell={expandedCell}
                colCount={colCount}
                colTemplate={colTemplate}
                depth={1}
                onCellTap={onCellTap}
                onStartDrill={onStartDrill}
                onCloseDrawer={onCloseDrawer}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function BranchRowGroup({
  branch, verbs, masteredIds, suggestedId, expandedCell,
  isOpen, colCount, colTemplate, onToggle, onCellTap, onStartDrill, onCloseDrawer,
}: {
  branch: BranchRow;
  verbs: string[];
  masteredIds: Set<string>;
  suggestedId: string | null;
  expandedCell: ExpandedCell | null;
  isOpen: boolean;
  colCount: number;
  colTemplate: string;
  onToggle: () => void;
  onCellTap: (cell: ExpandedCell) => void;
  onStartDrill: () => void;
  onCloseDrawer: () => void;
}) {
  const masteredInBranch = branch.children.filter(l =>
    Object.values(l.cellConceptIds).some(id => masteredIds.has(id))
  ).length;

  return (
    <>
      <div className={styles.branchGrid} style={{ gridTemplateColumns: colTemplate }}>
        <div className={styles.branchLabel} onClick={onToggle} role="button" aria-expanded={isOpen}>
          <span className={styles.branchIndent} />
          <motion.span className={styles.chevron} animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.18 }}>
            <ChevronRight size={12} />
          </motion.span>
          <span className={styles.branchName}>{branch.conceptName}</span>
          <span className={styles.parentCount}>{masteredInBranch}/{branch.children.length}</span>
        </div>
        {verbs.map(verb => (
          <div key={`${branch.conceptId}-${verb}-ph`} className={styles.branchPlaceholder} />
        ))}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            {branch.children.map(leaf => (
              <LeafRowComponent
                key={leaf.conceptId}
                leaf={leaf}
                verbs={verbs}
                masteredIds={masteredIds}
                suggestedId={suggestedId}
                expandedCell={expandedCell}
                colCount={colCount}
                colTemplate={colTemplate}
                depth={2}
                onCellTap={onCellTap}
                onStartDrill={onStartDrill}
                onCloseDrawer={onCloseDrawer}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function LeafRowComponent({
  leaf, verbs, masteredIds, suggestedId, expandedCell,
  colCount, colTemplate, depth, onCellTap, onStartDrill, onCloseDrawer,
}: {
  leaf: LeafRow;
  verbs: string[];
  masteredIds: Set<string>;
  suggestedId: string | null;
  expandedCell: ExpandedCell | null;
  colCount: number;
  colTemplate: string;
  depth: 1 | 2;
  onCellTap: (cell: ExpandedCell) => void;
  onStartDrill: () => void;
  onCloseDrawer: () => void;
}) {
  const isDrawerOpen = expandedCell?.conceptId === leaf.conceptId;

  return (
    <div className={styles.leafGrid} style={{ gridTemplateColumns: colTemplate }}>
      <div className={depth === 2 ? styles.leafLabelDeep : styles.leafLabel}>
        <span className={depth === 2 ? styles.leafIndentDeep : styles.leafIndent} />
        <span>{leaf.conceptName}</span>
      </div>

      {verbs.map(verb => {
        const action = leaf.actions?.[verb] ?? null;
        const realConceptId = leaf.cellConceptIds?.[verb] ?? leaf.conceptId;
        const isExpanded = expandedCell?.conceptId === leaf.conceptId && expandedCell?.verb === verb;
        return (
          <GridCell
            key={`${leaf.conceptId}-${verb}`}
            conceptId={leaf.conceptId}
            realConceptId={realConceptId}
            conceptName={leaf.conceptName}
            verb={verb}
            action={action}
            isMastered={masteredIds.has(realConceptId)}
            isSuggested={suggestedId === `${leaf.conceptId}::${verb}`}
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
    </div>
  );
}

function GridCell({
  conceptId, realConceptId, conceptName, verb, action,
  isMastered, isSuggested, isExpanded, onCellTap,
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
        isActive ? styles.cellActive : '',
        isSuggested ? styles.cellSuggested : '',
        isExpanded ? styles.cellSelected : '',
        !action ? styles.cellNull : '',
      ].filter(Boolean).join(' ')}
      onClick={handleClick}
      disabled={!isActive}
      whileHover={isActive ? { scale: 1.05 } : {}}
      whileTap={isActive ? { scale: 0.95 } : {}}
      title={action ? `${verb} · ${conceptName}` : undefined}
    >
      {isMastered && <CheckCircle size={15} className={styles.masteredIcon} />}
      {!isMastered && isActive && <span className={styles.cellDot} />}
      {!action && <span className={styles.nullDash}>—</span>}
    </motion.button>
  );
}
