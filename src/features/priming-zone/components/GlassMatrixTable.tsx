/**
 * Glass Matrix Table - The 2D Grid (X × Y Axes)
 * X-Axis: Dynamic ULC Verbs (extracted from subject)
 * Y-Axis: Concepts (with nested hierarchy support)
 */

import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { PrimingMatrixData, MatrixCell, AtomicConcept } from '../types';
import styles from './GlassMatrixTable.module.css';

interface GlassMatrixTableProps {
  matrix: PrimingMatrixData;
  onCellClick: (cell: MatrixCell) => void;
  selectedCell: MatrixCell | null;
}

export default function GlassMatrixTable({
  matrix,
  onCellClick,
  selectedCell,
}: GlassMatrixTableProps) {
  const ACTIONS = [matrix.verbs.verb1, matrix.verbs.verb2, matrix.verbs.verb3];

  // Flatten concepts into rows (including nested children)
  const flattenedRows = useMemo(() => {
    const rows: Array<{ concept: AtomicConcept; depth: number }> = [];
    
    const flatten = (concepts: AtomicConcept[], depth = 0) => {
      concepts.forEach(concept => {
        rows.push({ concept, depth });
        if (concept.children && concept.children.length > 0) {
          flatten(concept.children, depth + 1);
        }
      });
    };
    
    flatten(matrix.concepts);
    return rows;
  }, [matrix.concepts]);

  // Get cell for a specific action × concept intersection
  const getCell = (action: string, conceptId: string): MatrixCell | undefined => {
    return matrix.cells.find(
      cell => cell.action === action && cell.conceptId === conceptId
    );
  };

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.glassTable} role="grid">
        <thead>
          <tr>
            <th className={styles.cornerCell}>
              <span className={styles.cornerLabel}>Concept / Action</span>
            </th>
            {ACTIONS.map(action => (
              <th key={action} className={styles.headerCell}>
                <span className={styles.actionLabel}>{action}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {flattenedRows.map(({ concept, depth }) => (
            <tr key={concept.id} className={styles.dataRow}>
              <td className={styles.conceptCell}>
                <div
                  className={styles.conceptLabel}
                  style={{ paddingLeft: `${depth * 24}px` }}
                >
                  {depth > 0 && <ChevronRight size={16} className={styles.nestedIcon} />}
                  <span className={depth === 0 ? styles.parentConcept : styles.childConcept}>
                    {concept.name}
                  </span>
                </div>
              </td>
              {ACTIONS.map(action => {
                const cell = getCell(action, concept.id);
                const isSelected = selectedCell?.conceptId === concept.id && 
                                   selectedCell?.action === action;
                
                return (
                  <td key={action} className={styles.matrixCell}>
                    {cell ? (
                      <button
                        onClick={() => onCellClick(cell)}
                        className={`${styles.cellButton} ${isSelected ? styles.cellButtonActive : ''}`}
                        aria-label={`${action} ${concept.name}`}
                      >
                        <span className={styles.cellDot} />
                      </button>
                    ) : (
                      <div className={styles.emptyCell} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
