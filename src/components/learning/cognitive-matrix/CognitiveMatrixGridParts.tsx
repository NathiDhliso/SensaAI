import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ChevronRight, Maximize2, Network, Info } from 'lucide-react';
import type { MatrixConcept, BranchRow, LeafRow, DrillDownAction } from './types';
import styles from './CognitiveMatrixGrid.module.css';


export interface ExpandedCell {
  conceptId: string;
  verb: string;
  action: DrillDownAction;
  conceptName: string;
  realConceptId: string;
}

export function ProgressRing({ value, total, size = 26 }: { value: number; total: number; size?: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : value / total;
  return (
    <svg width={size} height={size} className={styles.progressRing} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} className={styles.ringTrack} />
      <circle cx={size / 2} cy={size / 2} r={r} className={styles.ringFill}
        strokeDasharray={`${pct * circ} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 1} className={styles.ringText} textAnchor="middle" dominantBaseline="middle">
        {total === 0 ? '—' : `${value}`}
      </text>
    </svg>
  );
}

export function GridCell({ conceptId, realConceptId, conceptName, verb, action, isMastered, isSuggested, isExpanded, heatmap, onCellTap }: {
  conceptId: string; realConceptId: string; conceptName: string; verb: string;
  action: DrillDownAction | null; isMastered: boolean; isSuggested: boolean;
  isExpanded: boolean; heatmap: boolean; onCellTap: (cell: ExpandedCell) => void;
}) {
  const isActive = !!action && !isMastered;
  const handleClick = () => { if (!action || isMastered) return; onCellTap({ conceptId, realConceptId, conceptName, verb, action }); };
  const cellClass = [
    styles.cell,
    isMastered ? styles.cellMastered : '',
    isActive ? styles.cellActive : '',
    isSuggested ? styles.cellSuggested : '',
    isExpanded ? styles.cellSelected : '',
    !action ? styles.cellNull : '',
    heatmap && isMastered ? styles.cellHeatMastered : '',
    heatmap && !isMastered && action ? styles.cellHeatPending : '',
  ].filter(Boolean).join(' ');

  return (
    <motion.button className={cellClass} onClick={handleClick} disabled={!isActive}
      whileHover={isActive ? { scale: 1.05 } : {}} whileTap={isActive ? { scale: 0.95 } : {}}
      title={action ? `${verb} · ${conceptName}` : undefined}>
      {isMastered && <CheckCircle size={15} className={styles.masteredIcon} />}
      {!isMastered && isActive && <span className={styles.cellDot} />}
      {!action && <span className={styles.nullDash}>—</span>}
    </motion.button>
  );
}

export function LeafRowComponent({ leaf, verbs, masteredIds, suggestedId, expandedCell, colCount, colTemplate, depth, heatmap, isMatch, onCellTap, onCloseDrawer, onExploreWhy, focusMode }: {
  leaf: LeafRow; verbs: string[]; masteredIds: Set<string>; suggestedId: string | null;
  expandedCell: ExpandedCell | null; colCount: number; colTemplate: string; depth: 1 | 2;
  heatmap: boolean; isMatch: boolean | null; onCellTap: (cell: ExpandedCell) => void;
  onCloseDrawer: () => void; onExploreWhy?: (conceptName: string) => void; focusMode?: boolean;
}) {
  const isDrawerOpen = expandedCell?.conceptId === leaf.conceptId;
  const isMasteredLeaf = Object.values(leaf.cellConceptIds).some(id => masteredIds.has(id));
  const labelClass = focusMode
    ? (depth === 2 ? styles.focusLeafLabelDeep : styles.focusLeafLabel)
    : (depth === 2 ? styles.leafLabelDeep : styles.leafLabel);
  const rowClass = [
    styles.leafGrid,
    heatmap && isMasteredLeaf ? styles.leafHeatMastered : '',
    heatmap && !isMasteredLeaf ? styles.leafHeatPending : '',
    isMatch === false ? styles.leafDimmed : '',
    isMatch === true ? styles.leafHighlighted : '',
  ].filter(Boolean).join(' ');

  return (
    <div id={`leaf-${leaf.conceptId}`} className={rowClass} style={{ gridTemplateColumns: colTemplate }}>
      <div className={labelClass} title={leaf.conceptName}>
        <span className={depth === 2 ? styles.leafIndentDeep : styles.leafIndent} />
        <span>{leaf.conceptName}</span>
      </div>
      {verbs.map(verb => {
        const action = leaf.actions?.[verb] ?? null;
        const realConceptId = leaf.cellConceptIds?.[verb] ?? leaf.conceptId;
        return (
          <GridCell key={`${leaf.conceptId}-${verb}`} conceptId={leaf.conceptId} realConceptId={realConceptId}
            conceptName={leaf.conceptName} verb={verb} action={action} isMastered={masteredIds.has(realConceptId)}
            isSuggested={suggestedId === `${leaf.conceptId}::${verb}`}
            isExpanded={expandedCell?.conceptId === leaf.conceptId && expandedCell?.verb === verb}
            heatmap={heatmap} onCellTap={onCellTap} />
        );
      })}
      <AnimatePresence>
        {isDrawerOpen && expandedCell && (
          <motion.div className={styles.drawer} style={{ gridColumn: `1 / ${colCount + 2}` }}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 34 }}>
            <div className={styles.drawerInner}>
              <div className={styles.drawerMeta}>
                <span className={styles.drawerVerb}>{expandedCell.verb}</span>
                <span className={styles.drawerSep}>×</span>
                <span className={styles.drawerConcept}>{expandedCell.conceptName}</span>
              </div>
              <div className={styles.drawerBody}>
                <div className={styles.checklistPanel}>
                  <div className={styles.checklistHeader}>
                    <span className={styles.checklistIcon}>⚡</span>
                    <span className={styles.checklistTitle}>
                      {expandedCell.action.blueprintSteps ? 'BLUEPRINT SCAFFOLD' : 'ATOMIC STEPS'}
                    </span>
                    {expandedCell.action.chain.length > 0 && (
                      <span className={styles.prereqPill}>Needs: {expandedCell.action.chain.join(' → ')}</span>
                    )}
                  </div>
                  {expandedCell.action.blueprintSteps && expandedCell.action.blueprintSteps.length > 0 ? (
                    <ol className={styles.checklist}>
                      {expandedCell.action.blueprintSteps.map((bs, i) => (
                        <li key={i} className={styles.checklistItem}>
                          <span className={styles.checklistNum}>{i + 1}</span>
                          <div className={styles.blueprintStepCell}>
                            <span className={styles.atomicLabel}>{bs.atomicStep}</span>
                            <span className={styles.checklistText}>{bs.instantiation}</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : expandedCell.action.steps.length > 0 ? (
                    <ol className={styles.checklist}>
                      {expandedCell.action.steps.map((step, i) => (
                        <li key={i} className={styles.checklistItem}>
                          <span className={styles.checklistNum}>{i + 1}</span>
                          <span className={styles.checklistText}>{step}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className={styles.drawerNotice}>
                      <Info size={14} className={styles.drawerNoticeIcon} />
                      <span>Steps for this phase weren't generated. Regenerating content may provide richer data.</span>
                    </div>
                  )}
                </div>
                {expandedCell.action.highStakesExample && (
                  <div className={styles.trickRow}>
                    <span className={styles.trickIcon}>🎯</span>
                    <span className={styles.trickText}>{expandedCell.action.highStakesExample}</span>
                  </div>
                )}
                {expandedCell.action.commonPitfalls && expandedCell.action.commonPitfalls.length > 0 && (
                  <div className={styles.pitfallsRow}>
                    <span className={styles.pitfallsIcon}>⚠️</span>
                    <div className={styles.pitfallsList}>
                      {expandedCell.action.commonPitfalls.map((pitfall, i) => (
                        <span key={i} className={styles.pitfallItem}>{pitfall}</span>
                      ))}
                    </div>
                  </div>
                )}
                {expandedCell.action.eliminationLogic && (
                  <div className={styles.trickRow}>
                    <span className={styles.trickIcon}>&#10003;</span>
                    <span className={styles.trickText}><strong>Elimination:</strong> {expandedCell.action.eliminationLogic}</span>
                  </div>
                )}
                {expandedCell.action.examContext?.examTip && (
                  <div className={styles.trickRow}>
                    <span className={styles.trickIcon}>&#9733;</span>
                    <span className={styles.trickText}><strong>Exam Tip:</strong> {expandedCell.action.examContext.examTip}</span>
                  </div>
                )}
                {expandedCell.action.trick && (
                  <div className={styles.trickRow}>
                    <span className={styles.trickIcon}>🧠</span>
                    <span className={styles.trickText}>{expandedCell.action.trick}</span>
                  </div>
                )}
                {expandedCell.action.warnings && expandedCell.action.warnings.length > 0 && (
                  <div className={styles.drawerWarnings}>
                    {expandedCell.action.warnings.map((w, i) => (
                      <div key={i} className={styles.drawerWarningItem}>
                        <Info size={12} className={styles.drawerWarningIcon} />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.drawerFooter}>
                {onExploreWhy && (
                  <button className={styles.exploreWhyBtn} onClick={() => onExploreWhy(leaf.conceptName)}>
                    <Network size={13} />
                    Explore Why
                  </button>
                )}
                <button className={styles.drawerClose} onClick={onCloseDrawer}>Dismiss</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BranchRowGroup({ branch, verbs, masteredIds, suggestedId, expandedCell, isOpen, colCount, colTemplate, heatmap, matchingLeafIds, onToggle, onCellTap, onCloseDrawer, onExploreWhy, focusMode }: {
  branch: BranchRow; verbs: string[]; masteredIds: Set<string>; suggestedId: string | null;
  expandedCell: ExpandedCell | null; isOpen: boolean; colCount: number; colTemplate: string;
  heatmap: boolean; matchingLeafIds: Set<string> | null; onToggle: () => void;
  onCellTap: (cell: ExpandedCell) => void; onCloseDrawer: () => void; onExploreWhy?: (conceptName: string) => void; focusMode?: boolean;
}) {
  const masteredInBranch = branch.children.filter(l => Object.values(l.cellConceptIds).some(id => masteredIds.has(id))).length;
  return (
    <>
      <div className={focusMode ? styles.focusBranchGrid : styles.branchGrid} style={{ gridTemplateColumns: colTemplate }}>
        <div className={focusMode ? styles.focusBranchLabel : styles.branchLabel} onClick={onToggle} role="button" aria-expanded={isOpen}>
          <span className={styles.branchIndent} />
          <motion.span className={styles.chevron} animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.18 }}>
            <ChevronRight size={focusMode ? 14 : 12} />
          </motion.span>
          <span className={styles.branchName}>{branch.conceptName}</span>
          <span className={styles.parentCount}>{masteredInBranch}/{branch.children.length}</span>
        </div>
        {verbs.map(verb => <div key={`${branch.conceptId}-${verb}-ph`} className={styles.branchPlaceholder} style={{ gridColumn: 'auto' }} />)}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            style={{ minWidth: 'max-content' }}>
            {branch.children.map(leaf => (
              <LeafRowComponent key={leaf.conceptId} leaf={leaf} verbs={verbs} masteredIds={masteredIds}
                suggestedId={suggestedId} expandedCell={expandedCell} colCount={colCount} colTemplate={colTemplate}
                depth={2} heatmap={heatmap} isMatch={matchingLeafIds ? matchingLeafIds.has(leaf.conceptId) : null}
                onCellTap={onCellTap} onCloseDrawer={onCloseDrawer} onExploreWhy={onExploreWhy} focusMode={focusMode} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function TrunkRowGroup({ trunk, verbs, masteredIds, suggestedId, expandedCell, isTrunkOpen, openBranches, colCount, colTemplate, heatmap, matchingLeafIds, onToggleTrunk, onToggleBranch, onFocus, onCellTap, onCloseDrawer, onExploreWhy }: {
  trunk: MatrixConcept; verbs: string[]; masteredIds: Set<string>; suggestedId: string | null;
  expandedCell: ExpandedCell | null; isTrunkOpen: boolean; openBranches: Set<string>;
  colCount: number; colTemplate: string; heatmap: boolean; matchingLeafIds: Set<string> | null;
  onToggleTrunk: () => void; onToggleBranch: (id: string) => void; onFocus: () => void;
  onCellTap: (cell: ExpandedCell) => void; onCloseDrawer: () => void; onExploreWhy?: (conceptName: string) => void;
}) {
  const allLeaves = [...trunk.branches.flatMap(b => b.children), ...trunk.children];
  const totalLeaves = allLeaves.length;
  const masteredLeaves = allLeaves.filter(l => Object.values(l.cellConceptIds).some(id => masteredIds.has(id))).length;

  return (
    <>
      <div className={styles.trunkRow} style={{ gridTemplateColumns: colTemplate }}>
        <div className={styles.trunkLabel} onClick={onToggleTrunk} role="button" aria-expanded={isTrunkOpen}>
          <motion.span className={styles.chevron} animate={{ rotate: isTrunkOpen ? 90 : 0 }} transition={{ duration: 0.18 }}>
            <ChevronRight size={14} />
          </motion.span>
          <span className={styles.parentName}>{trunk.conceptName}</span>
          <ProgressRing value={masteredLeaves} total={totalLeaves} />
          <button className={styles.focusBtn} onClick={e => { e.stopPropagation(); onFocus(); }} title={`Focus: ${trunk.conceptName}`}>
            <Maximize2 size={12} />
          </button>
        </div>
        {verbs.map(verb => <div key={`${trunk.conceptId}-${verb}-ph`} className={styles.trunkPlaceholder} />)}
      </div>
      <AnimatePresence>
        {isTrunkOpen && (
          <motion.div className={styles.childrenBlock} style={{ gridColumn: `1 / ${colCount + 2}` }}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ type: 'spring', stiffness: 360, damping: 36 }}>
            {trunk.branches.map(branch => (
              <BranchRowGroup key={branch.conceptId} branch={branch} verbs={verbs} masteredIds={masteredIds}
                suggestedId={suggestedId} expandedCell={expandedCell} isOpen={openBranches.has(branch.conceptId)}
                colCount={colCount} colTemplate={colTemplate} heatmap={heatmap} matchingLeafIds={matchingLeafIds}
                onToggle={() => onToggleBranch(branch.conceptId)} onCellTap={onCellTap}
                onCloseDrawer={onCloseDrawer} onExploreWhy={onExploreWhy} />
            ))}
            {trunk.children.map(leaf => (
              <LeafRowComponent key={leaf.conceptId} leaf={leaf} verbs={verbs} masteredIds={masteredIds}
                suggestedId={suggestedId} expandedCell={expandedCell} colCount={colCount} colTemplate={colTemplate}
                depth={1} heatmap={heatmap} isMatch={matchingLeafIds ? matchingLeafIds.has(leaf.conceptId) : null}
                onCellTap={onCellTap} onCloseDrawer={onCloseDrawer} onExploreWhy={onExploreWhy} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
