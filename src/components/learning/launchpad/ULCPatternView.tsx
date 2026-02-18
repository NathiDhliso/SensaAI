/**
 * ULCPatternView
 *
 * Dedicated component for rendering the Universal Life Cycle (ULC) pattern
 * matrix visualization. Extracted from ContentLaunchpad for reusability and
 * cleaner separation of concerns.
 *
 * Features:
 * - Interactive verb × object matrix with status indicators
 * - Hover tooltips showing procedural "how" steps
 * - Progress stats (completion %, cells mastered, objects/verbs done)
 * - Expandable "how to use" guidance section
 * - Progress bar visualization
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, ChevronDown, ChevronUp, Grid3X3 } from 'lucide-react';
import {
    getULCStats,
    type ULCPattern,
    type ULCCell,
} from '@/features/content-generation/parsers/ulc-detector';
import styles from './ULCPatternView.module.css';

export interface ULCPatternViewProps {
    pattern: ULCPattern;
    /** Called when user clicks a cell to navigate to that concept */
    onCellClick: (conceptId: string) => void;
    /** Optional: highlight a specific verb×object cell */
    highlightCell?: { verb: string; object: string };
    /** Whether to show the compact (collapsed) version */
    compact?: boolean;
}

function getCellStatusClass(cell: ULCCell, cssStyles: Record<string, string>): string {
    if (!cell.conceptId) return cssStyles.statusEmpty;
    switch (cell.status) {
        case 'mastered': return cssStyles.statusMastered;
        case 'learning': return cssStyles.statusLearning;
        default: return cssStyles.statusNotStarted;
    }
}

function getCellSymbol(cell: ULCCell): string {
    if (!cell.conceptId) return '—';
    switch (cell.status) {
        case 'mastered': return '✓';
        case 'learning': return '○';
        default: return '·';
    }
}

export default function ULCPatternView({
    pattern,
    onCellClick,
    highlightCell,
    compact = false,
}: ULCPatternViewProps) {
    const [expanded, setExpanded] = useState(false);
    const stats = getULCStats(pattern);

    if (!pattern.detected) return null;

    const gridTemplateColumns = `minmax(90px, 140px) repeat(${pattern.verbs.length}, minmax(52px, 1fr))`;

    return (
        <section className={styles.ulcPattern}>
            {/* Header */}
            <div className={styles.ulcHeader}>
                <div className={styles.ulcHeaderLeft}>
                    <Target size={16} className={styles.ulcHeaderIcon} />
                    <h3 className={styles.ulcTitle}>Universal Life Cycle</h3>
                    <span className={styles.ulcBadge}>
                        {pattern.verbs.length}v × {pattern.objects.length}r
                    </span>
                    <span className={styles.ulcConfidence} title={`Detection confidence: ${pattern.confidence}%`}>
                        {pattern.confidence}% match
                    </span>
                </div>
                <button
                    className={styles.ulcCollapseBtn}
                    onClick={() => setExpanded(!expanded)}
                    aria-expanded={expanded}
                    aria-label={expanded ? 'Collapse ULC details' : 'Expand ULC details'}
                >
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {expanded ? 'Less' : 'How to use'}
                </button>
            </div>

            {/* Explanation */}
            <p className={styles.ulcExplanation}>
                {pattern.explanation || `${pattern.verbs.length} core actions applied across ${pattern.objects.length} resources.`}
            </p>
            <p className={styles.ulcTip}>
                💡 <strong>How before why:</strong> The procedure is stable — the rationale shifts with context. Build on what doesn't change.
            </p>

            {/* Progress bar */}
            {stats.totalCells > 0 && (
                <div className={styles.ulcProgressRow}>
                    <div className={styles.ulcProgressBar} role="progressbar" aria-valuenow={stats.completionPercent} aria-valuemin={0} aria-valuemax={100}>
                        <div
                            className={styles.ulcProgressFill}
                            style={{ width: `${stats.completionPercent}%` }}
                        />
                    </div>
                    <span className={styles.ulcProgressLabel}>{stats.completionPercent}% complete</span>
                </div>
            )}

            {/* Matrix */}
            {!compact && (
                <div
                    className={styles.ulcMatrix}
                    role="grid"
                    aria-label="ULC Learning Pattern Matrix"
                    style={{ '--grid-cols': gridTemplateColumns } as React.CSSProperties}
                >
                    {/* Header row */}
                    <div className={styles.matrixHeader} role="row" style={{ gridTemplateColumns }}>
                        <div className={styles.matrixCorner} role="columnheader">
                            <Grid3X3 size={12} />
                        </div>
                        {pattern.verbs.map(verb => (
                            <div key={verb} className={styles.matrixVerb} role="columnheader" title={verb}>
                                {verb}
                            </div>
                        ))}
                    </div>

                    {/* Data rows */}
                    {pattern.matrix.map((row, rowIndex) => (
                        <div
                            key={rowIndex}
                            className={styles.matrixRow}
                            role="row"
                            style={{ gridTemplateColumns }}
                        >
                            <div className={styles.matrixObject} role="rowheader" title={pattern.objects[rowIndex]}>
                                {pattern.objects[rowIndex]}
                            </div>
                            {row.map((cell, cellIndex) => {
                                const isEmpty = !cell.conceptId;
                                const isHighlighted = highlightCell?.verb === cell.verb && highlightCell?.object === cell.object;
                                const statusClass = getCellStatusClass(cell, styles);
                                const statusLabel = isEmpty
                                    ? 'No concept mapped'
                                    : cell.status === 'mastered' ? 'Mastered'
                                    : cell.status === 'learning' ? 'In progress'
                                    : 'Not started';

                                return (
                                    <button
                                        key={cellIndex}
                                        className={`${styles.matrixCell} ${statusClass} ${isHighlighted ? styles.matrixCellHighlighted : ''}`}
                                        onClick={() => cell.conceptId && onCellClick(cell.conceptId)}
                                        disabled={isEmpty}
                                        role="gridcell"
                                        aria-label={`${cell.verb} ${cell.object}: ${statusLabel}`}
                                        aria-disabled={isEmpty}
                                        title={isEmpty ? 'No concept mapped for this combination' : `${cell.verb} ${cell.object} — ${statusLabel}`}
                                    >
                                        <span className={styles.cellSymbol}>{getCellSymbol(cell)}</span>

                                        {/* Tooltip */}
                                        {!isEmpty && (
                                            <div className={styles.cellTooltip} role="tooltip">
                                                <div className={styles.tooltipHeader}>
                                                    <span className={styles.tooltipVerb}>{cell.verb}</span>
                                                    <span className={styles.tooltipObject}>{cell.object}</span>
                                                </div>
                                                {cell.conceptName && (
                                                    <div className={styles.tooltipConceptName}>
                                                        {cell.conceptName}
                                                    </div>
                                                )}
                                                <div className={styles.tooltipStatus} data-status={cell.status}>
                                                    {statusLabel}
                                                </div>
                                                {cell.howSteps ? (
                                                    <>
                                                        <div className={styles.tooltipHowLabel}>⚡ How (Procedure):</div>
                                                        <div className={styles.tooltipContent}>{cell.howSteps}</div>
                                                    </>
                                                ) : (
                                                    <div className={styles.tooltipEmpty}>
                                                        Click to learn the procedure
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}

            {/* Stats row */}
            <div className={styles.ulcStats}>
                <div className={styles.ulcStat}>
                    <span className={styles.ulcStatValue}>{stats.completionPercent}%</span>
                    <span className={styles.ulcStatLabel}>Complete</span>
                </div>
                <div className={styles.ulcStatDivider} />
                <div className={styles.ulcStat}>
                    <span className={styles.ulcStatValue}>{stats.masteredCells}<span className={styles.ulcStatOf}>/{stats.totalCells}</span></span>
                    <span className={styles.ulcStatLabel}>Cells Mastered</span>
                </div>
                <div className={styles.ulcStatDivider} />
                <div className={styles.ulcStat}>
                    <span className={styles.ulcStatValue}>{stats.objectsCompleted}<span className={styles.ulcStatOf}>/{pattern.objects.length}</span></span>
                    <span className={styles.ulcStatLabel}>Resources Done</span>
                </div>
                <div className={styles.ulcStatDivider} />
                <div className={styles.ulcStat}>
                    <span className={styles.ulcStatValue}>{stats.verbsCompleted}<span className={styles.ulcStatOf}>/{pattern.verbs.length}</span></span>
                    <span className={styles.ulcStatLabel}>Actions Done</span>
                </div>
                {stats.learningCells > 0 && (
                    <>
                        <div className={styles.ulcStatDivider} />
                        <div className={styles.ulcStat}>
                            <span className={styles.ulcStatValue} style={{ color: 'var(--color-warning)' }}>{stats.learningCells}</span>
                            <span className={styles.ulcStatLabel}>In Progress</span>
                        </div>
                    </>
                )}
            </div>

            {/* Expandable guidance */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                        className={styles.ulcGuidance}
                    >
                        <h4 className={styles.ulcGuidanceTitle}>How to Use This Pattern</h4>
                        <ol className={styles.ulcGuidanceList}>
                            <li>
                                <strong>Work systematically:</strong> Complete all verbs for one resource before moving to the next. Finish a row, then advance.
                            </li>
                            <li>
                                <strong>How before why:</strong> Learn the procedure first (stable), then the rationale (context-dependent). The "how" doesn't change; the "why" shifts with every scenario.
                            </li>
                            <li>
                                <strong>Track your matrix:</strong> Each cell is a discrete skill. Click any cell to practice that specific verb × resource combination.
                            </li>
                            <li>
                                <strong>Cross-resource practice:</strong> Once individual cells are mastered, tackle scenarios that span multiple resources — that's where real-world problems live.
                            </li>
                        </ol>
                        <div className={styles.ulcVerbList}>
                            <span className={styles.ulcVerbListLabel}>Actions:</span>
                            {pattern.verbs.map(v => (
                                <span key={v} className={styles.ulcVerbChip}>{v}</span>
                            ))}
                        </div>
                        <div className={styles.ulcObjectList}>
                            <span className={styles.ulcObjectListLabel}>Resources:</span>
                            {pattern.objects.map(o => (
                                <span key={o} className={styles.ulcObjectChip}>{o}</span>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
