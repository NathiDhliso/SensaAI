import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ChevronsUpDown, ChevronsDownUp, Zap } from 'lucide-react';
import type { MatrixPayload, BranchRow } from './types';
import { TrunkRowGroup, BranchRowGroup, LeafRowComponent, ProgressRing } from './CognitiveMatrixGridParts';
import type { ExpandedCell } from './CognitiveMatrixGridParts';
import styles from './CognitiveMatrixGrid.module.css';

interface CognitiveMatrixGridProps {
  payload: MatrixPayload;
  masteredIds: Set<string>;
  suggestedId: string | null;
  onExploreWhy?: (conceptName: string) => void;
}

export function CognitiveMatrixGrid({ payload, masteredIds, suggestedId, onExploreWhy }: CognitiveMatrixGridProps) {
  const colCount = payload.verbs.length;
  const [expandedCell, setExpandedCell] = useState<ExpandedCell | null>(null);
  const [openTrunks, setOpenTrunks] = useState<Set<string>>(() => new Set());
  const [openBranches, setOpenBranches] = useState<Set<string>>(() => new Set());
  const [focusedTrunkId, setFocusedTrunkId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [heatmap, setHeatmap] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const cmdRef = useRef<HTMLInputElement>(null);

  const q = searchQuery.trim().toLowerCase();

  const allLeafEntries = payload.matrix.flatMap(trunk => [
    ...trunk.branches.flatMap(b => b.children.map(l => ({ trunk, branch: b as BranchRow | null, leaf: l }))),
    ...trunk.children.map(l => ({ trunk, branch: null as BranchRow | null, leaf: l })),
  ]);

  const matchingLeafIds = q
    ? new Set(allLeafEntries.filter(e => e.leaf.conceptName.toLowerCase().includes(q)).map(e => e.leaf.conceptId))
    : null;

  const matchingTrunkIds = matchingLeafIds
    ? new Set(payload.matrix.filter(t =>
        [...t.branches.flatMap(b => b.children), ...t.children].some(l => matchingLeafIds.has(l.conceptId))
      ).map(t => t.conceptId))
    : null;

  const matchingBranchIds = matchingLeafIds
    ? new Set(payload.matrix.flatMap(t => t.branches).filter(b =>
        b.children.some(l => matchingLeafIds.has(l.conceptId))
      ).map(b => b.conceptId))
    : null;

  useEffect(() => {
    if (!q) return;
    if (matchingTrunkIds) setOpenTrunks(prev => new Set([...prev, ...matchingTrunkIds]));
    if (matchingBranchIds) setOpenBranches(prev => new Set([...prev, ...matchingBranchIds]));
  }, [q]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(o => !o); setCmdQuery(''); }
      if (e.key === 'Escape') { setCmdOpen(false); setFocusedTrunkId(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => { if (cmdOpen) setTimeout(() => cmdRef.current?.focus(), 50); }, [cmdOpen]);

  const handleCellTap = (cell: ExpandedCell) => {
    setExpandedCell(prev => prev?.conceptId === cell.conceptId && prev?.verb === cell.verb ? null : cell);
  };

  const toggleTrunk = (id: string) => setOpenTrunks(prev => {
    const n = new Set(prev);
    if (n.has(id)) { n.delete(id); setExpandedCell(null); } else n.add(id);
    return n;
  });

  const toggleBranch = (id: string) => setOpenBranches(prev => {
    const n = new Set(prev);
    if (n.has(id)) { n.delete(id); setExpandedCell(null); } else n.add(id);
    return n;
  });

  const expandAll = useCallback(() => {
    setOpenTrunks(new Set(payload.matrix.map(t => t.conceptId)));
    setOpenBranches(new Set(payload.matrix.flatMap(t => t.branches.map(b => b.conceptId))));
  }, [payload]);

  const collapseAll = useCallback(() => {
    setOpenTrunks(new Set());
    setOpenBranches(new Set());
    setExpandedCell(null);
  }, []);

  const jumpToLeaf = useCallback((entry: typeof allLeafEntries[0]) => {
    setCmdOpen(false);
    setOpenTrunks(prev => new Set([...prev, entry.trunk.conceptId]));
    if (entry.branch) setOpenBranches(prev => new Set([...prev, entry.branch!.conceptId]));
    setTimeout(() => document.getElementById(`leaf-${entry.leaf.conceptId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
  }, []);

  const suggestedEntry = suggestedId ? allLeafEntries.find(e => suggestedId.startsWith(e.leaf.conceptId)) : null;

  const handleStartSuggested = () => {
    if (!suggestedEntry || !suggestedId) return;
    const verb = suggestedId.split('::')[1];
    const action = suggestedEntry.leaf.actions?.[verb];
    if (!action) return;
    setOpenTrunks(prev => new Set([...prev, suggestedEntry.trunk.conceptId]));
    if (suggestedEntry.branch) setOpenBranches(prev => new Set([...prev, suggestedEntry.branch!.conceptId]));
    setExpandedCell({ conceptId: suggestedEntry.leaf.conceptId, realConceptId: suggestedEntry.leaf.cellConceptIds?.[verb] ?? suggestedEntry.leaf.conceptId, conceptName: suggestedEntry.leaf.conceptName, verb, action });
    setTimeout(() => document.getElementById(`leaf-${suggestedEntry.leaf.conceptId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
  };

  const focusedTrunk = focusedTrunkId ? payload.matrix.find(t => t.conceptId === focusedTrunkId) ?? null : null;
  const colTemplate = `minmax(220px, auto) repeat(${colCount}, minmax(110px, 1fr))`;
  const focusColTemplate = `minmax(280px, auto) repeat(${colCount}, minmax(160px, 1fr))`;
  const allExpanded = openTrunks.size >= payload.matrix.length;
  const cmdResults = (cmdQuery.trim()
    ? allLeafEntries.filter(e => e.leaf.conceptName.toLowerCase().includes(cmdQuery.trim().toLowerCase()))
    : allLeafEntries
  ).slice(0, 12);

  const focusedAllLeaves = focusedTrunk
    ? [...focusedTrunk.branches.flatMap(b => b.children), ...focusedTrunk.children]
    : [];
  const focusedMastered = focusedAllLeaves.filter(l => Object.values(l.cellConceptIds).some(id => masteredIds.has(id))).length;

  return (
    <>
      <div className={styles.matrixControls}>
        <div className={styles.searchWrap}>
          <Search size={13} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Filter concepts…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className={styles.searchClear} onClick={() => setSearchQuery('')}>
              <X size={11} />
            </button>
          )}
        </div>
        <div className={styles.controlsRight}>
          {suggestedEntry && (
            <button className={styles.suggestedBtn} onClick={handleStartSuggested} title="Jump to next suggested concept">
              <Zap size={13} />
              Start Suggested
            </button>
          )}
          <button className={styles.controlBtn} onClick={allExpanded ? collapseAll : expandAll}>
            {allExpanded ? <ChevronsDownUp size={13} /> : <ChevronsUpDown size={13} />}
            {allExpanded ? 'Collapse' : 'Expand'} All
          </button>
          <button
            className={`${styles.controlBtn} ${heatmap ? styles.controlBtnActive : ''}`}
            onClick={() => setHeatmap(h => !h)}
          >
            Heatmap
          </button>
          <button className={styles.controlBtn} onClick={() => { setCmdOpen(true); setCmdQuery(''); }}>
            ⌘K
          </button>
        </div>
      </div>

      <div className={styles.gridWrapper}>
        <div className={styles.gridScroll}>
          <div className={styles.stickyHeader} style={{ gridTemplateColumns: colTemplate }}>
            <div className={styles.cornerCell}>DOMAINS</div>
            {payload.verbs.map(verb => (
              <div key={verb} className={styles.verbHeader}>{verb.toUpperCase()}</div>
            ))}
          </div>
          <div className={styles.grid}>
            {payload.matrix.map(trunk => {
              if (matchingTrunkIds && !matchingTrunkIds.has(trunk.conceptId)) return null;
              return (
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
                  heatmap={heatmap}
                  matchingLeafIds={matchingLeafIds}
                  onToggleTrunk={() => toggleTrunk(trunk.conceptId)}
                  onToggleBranch={toggleBranch}
                  onFocus={() => { setFocusedTrunkId(trunk.conceptId); setExpandedCell(null); }}
                  onCellTap={handleCellTap}
                  onCloseDrawer={() => setExpandedCell(null)}
                  onExploreWhy={onExploreWhy}
                />
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {focusedTrunk && (
          <motion.div
            className={styles.focusOverlay}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <div className={styles.focusHeader}>
              <div className={styles.focusTitleGroup}>
                <span className={styles.focusLabel}>FOCUS MODE</span>
                <span className={styles.focusTitle}>{focusedTrunk.conceptName}</span>
              </div>
              <div className={styles.focusHeaderRight}>
                <ProgressRing value={focusedMastered} total={focusedAllLeaves.length} size={32} />
                <button className={styles.focusClose} onClick={() => setFocusedTrunkId(null)}>
                  <X size={16} />Exit Focus
                </button>
              </div>
            </div>
            <div className={styles.focusBody}>
              <div className={styles.focusGrid} style={{ gridTemplateColumns: focusColTemplate }}>
                <div className={styles.focusCorner}>RESOURCE</div>
                {payload.verbs.map(verb => (
                  <div key={verb} className={styles.focusVerbHeader}>{verb.toUpperCase()}</div>
                ))}
                {focusedTrunk.branches.map(branch => (
                  <BranchRowGroup
                    key={branch.conceptId}
                    branch={branch}
                    verbs={payload.verbs}
                    masteredIds={masteredIds}
                    suggestedId={suggestedId}
                    expandedCell={expandedCell}
                    isOpen={openBranches.has(branch.conceptId)}
                    colCount={colCount}
                    colTemplate={focusColTemplate}
                    heatmap={heatmap}
                    matchingLeafIds={null}
                    onToggle={() => toggleBranch(branch.conceptId)}
                    onCellTap={handleCellTap}
                    onCloseDrawer={() => setExpandedCell(null)}
                    onExploreWhy={onExploreWhy}
                    focusMode
                  />
                ))}
                {focusedTrunk.children.map(leaf => (
                  <LeafRowComponent
                    key={leaf.conceptId}
                    leaf={leaf}
                    verbs={payload.verbs}
                    masteredIds={masteredIds}
                    suggestedId={suggestedId}
                    expandedCell={expandedCell}
                    colCount={colCount}
                    colTemplate={focusColTemplate}
                    depth={1}
                    heatmap={heatmap}
                    isMatch={null}
                    onCellTap={handleCellTap}
                    onCloseDrawer={() => setExpandedCell(null)}
                    onExploreWhy={onExploreWhy}
                    focusMode
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cmdOpen && (
          <motion.div
            className={styles.cmdOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCmdOpen(false)}
          >
            <motion.div
              className={styles.cmdPalette}
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.cmdSearch}>
                <Search size={14} className={styles.cmdIcon} />
                <input
                  ref={cmdRef}
                  className={styles.cmdInput}
                  placeholder="Jump to concept…"
                  value={cmdQuery}
                  onChange={e => setCmdQuery(e.target.value)}
                />
                <kbd className={styles.cmdEsc}>ESC</kbd>
              </div>
              <ul className={styles.cmdList}>
                {cmdResults.map(entry => (
                  <li key={entry.leaf.conceptId}>
                    <button className={styles.cmdItem} onClick={() => jumpToLeaf(entry)}>
                      <span className={styles.cmdItemPath}>
                        {entry.trunk.conceptName}{entry.branch ? ` › ${entry.branch.conceptName}` : ''}
                      </span>
                      <span className={styles.cmdItemName}>{entry.leaf.conceptName}</span>
                    </button>
                  </li>
                ))}
                {cmdResults.length === 0 && <li className={styles.cmdEmpty}>No concepts found</li>}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
