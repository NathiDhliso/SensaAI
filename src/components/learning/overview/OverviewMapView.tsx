/**
 * Overview Map View - Read-Only Concept Overview for Low Energy Users
 * 
 * Provides a passive, read-only view of the subject structure with:
 * - ULC matrix as legend (if detected)
 * - Spatial concept layout
 * - Macro/micro drill-down
 * - No interaction required
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  CheckCircle,
  Target,
  Eye
} from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import type { ULCPattern } from '@/features/content-generation/parsers/ulc-detector';
import styles from './OverviewMapView.module.css';

interface OverviewMapViewProps {
  concepts: LearningConcept[];
  ulcPattern: ULCPattern | null;
  onComplete: () => void;
}

type ViewMode = 'macro' | 'micro';

interface MicroViewData {
  verb: string;
  object: string;
  concepts: LearningConcept[];
}

export default function OverviewMapView({
  concepts,
  ulcPattern,
  onComplete
}: OverviewMapViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('macro');
  const [selectedCell, setSelectedCell] = useState<MicroViewData | null>(null);

  // Group concepts by tier for non-ULC fallback
  const conceptsByTier = useMemo(() => {
    const trunk = concepts.filter(c => c.tier === 'trunk');
    const branch = concepts.filter(c => c.tier === 'branch');
    const leaf = concepts.filter(c => c.tier === 'leaf' || !c.tier);
    return { trunk, branch, leaf };
  }, [concepts]);

  const handleCellClick = (verb: string, object: string) => {
    if (!ulcPattern) return;

    // Find all concepts in this cell
    const cellConcepts = concepts.filter(c => {
      const conceptVerb = extractVerbFromName(c.name);
      const conceptObject = extractObjectFromName(c.name);
      return conceptVerb === verb && conceptObject === object;
    });

    if (cellConcepts.length > 0) {
      setSelectedCell({ verb, object, concepts: cellConcepts });
      setViewMode('micro');
    }
  };

  const handleBackToMacro = () => {
    setViewMode('macro');
    setSelectedCell(null);
  };

  // Helper to extract verb from concept name (simplified)
  const extractVerbFromName = (name: string): string | null => {
    if (!ulcPattern) return null;
    const lower = name.toLowerCase();
    for (const verb of ulcPattern.verbs) {
      if (lower.startsWith(verb.toLowerCase())) return verb;
    }
    return null;
  };

  // Helper to extract object from concept name (simplified)
  const extractObjectFromName = (name: string): string | null => {
    if (!ulcPattern) return null;
    for (const obj of ulcPattern.objects) {
      if (name.toLowerCase().includes(obj.toLowerCase())) return obj;
    }
    return null;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Eye size={24} />
          <div>
            <h2 className={styles.title}>Subject Overview</h2>
            <p className={styles.subtitle}>
              {viewMode === 'macro' 
                ? 'Explore the structure at your own pace'
                : `${selectedCell?.verb} ${selectedCell?.object}`
              }
            </p>
          </div>
        </div>
        <button onClick={onComplete} className={styles.completeButton}>
          <CheckCircle size={18} />
          I've Seen Enough
        </button>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'macro' && (
          <motion.div
            key="macro"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className={styles.macroView}
          >
            {ulcPattern && ulcPattern.detected ? (
              <ULCMacroView
                pattern={ulcPattern}
                concepts={concepts}
                onCellClick={handleCellClick}
              />
            ) : (
              <HierarchyMacroView conceptsByTier={conceptsByTier} />
            )}
          </motion.div>
        )}

        {viewMode === 'micro' && selectedCell && (
          <motion.div
            key="micro"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className={styles.microView}
          >
            <MicroView
              verb={selectedCell.verb}
              object={selectedCell.object}
              concepts={selectedCell.concepts}
              onBack={handleBackToMacro}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ULC Macro View - Shows matrix with concept counts
function ULCMacroView({
  pattern,
  concepts,
  onCellClick
}: {
  pattern: ULCPattern;
  concepts: LearningConcept[];
  onCellClick: (verb: string, object: string) => void;
}) {
  return (
    <div className={styles.ulcContainer}>
      <div className={styles.ulcLegend}>
        <Target size={18} />
        <h3>Learning Pattern</h3>
        <p>{pattern.explanation}</p>
      </div>

      <div className={styles.ulcMatrix} role="grid">
        <div className={styles.matrixHeader} role="row">
          <div className={styles.matrixCorner}></div>
          {pattern.verbs.map(verb => (
            <div key={verb} className={styles.matrixVerb} role="columnheader">
              {verb}
            </div>
          ))}
        </div>

        {pattern.matrix.map((row, rowIndex) => (
          <div key={rowIndex} className={styles.matrixRow} role="row">
            <div className={styles.matrixObject} role="rowheader">
              {pattern.objects[rowIndex]}
            </div>
            {row.map((cell, cellIndex) => {
              const isEmpty = !cell.conceptId;
              const cellConcepts = concepts.filter(c => {
                const name = c.name.toLowerCase();
                return name.includes(cell.verb.toLowerCase()) && 
                       name.includes(cell.object.toLowerCase());
              });
              const count = cellConcepts.length;

              return (
                <button
                  key={cellIndex}
                  className={`${styles.matrixCell} ${isEmpty ? styles.cellEmpty : styles.cellFilled}`}
                  onClick={() => !isEmpty && onCellClick(cell.verb, cell.object)}
                  disabled={isEmpty}
                  role="gridcell"
                  aria-label={`${cell.verb} ${cell.object}: ${count} concept${count !== 1 ? 's' : ''}`}
                >
                  {isEmpty ? (
                    <span className={styles.cellEmpty}>—</span>
                  ) : (
                    <div className={styles.cellContent}>
                      <span className={styles.cellCount}>{count}</span>
                      <ZoomIn size={14} className={styles.cellIcon} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className={styles.ulcHint}>
        <p>💡 Click any cell to see the concepts and their step-by-step procedures</p>
      </div>
    </div>
  );
}

// Hierarchy Macro View - Fallback for non-ULC subjects
function HierarchyMacroView({
  conceptsByTier
}: {
  conceptsByTier: { trunk: LearningConcept[]; branch: LearningConcept[]; leaf: LearningConcept[] };
}) {
  return (
    <div className={styles.hierarchyContainer}>
      <div className={styles.hierarchyLegend}>
        <h3>Subject Structure</h3>
        <p>Concepts organized by importance and dependency</p>
      </div>

      {conceptsByTier.trunk.length > 0 && (
        <div className={styles.tierSection}>
          <div className={styles.tierHeader}>
            <span className={styles.tierBadge} style={{ backgroundColor: 'var(--color-trunk)' }}>
              Trunk
            </span>
            <span className={styles.tierCount}>{conceptsByTier.trunk.length} concepts</span>
          </div>
          <div className={styles.conceptList}>
            {conceptsByTier.trunk.map(concept => (
              <div key={concept.id} className={styles.conceptCard}>
                <h4>{concept.name}</h4>
                {concept.hookSentence && (
                  <p className={styles.conceptHook}>{concept.hookSentence}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {conceptsByTier.branch.length > 0 && (
        <div className={styles.tierSection}>
          <div className={styles.tierHeader}>
            <span className={styles.tierBadge} style={{ backgroundColor: 'var(--color-branch)' }}>
              Branch
            </span>
            <span className={styles.tierCount}>{conceptsByTier.branch.length} concepts</span>
          </div>
          <div className={styles.conceptList}>
            {conceptsByTier.branch.map(concept => (
              <div key={concept.id} className={styles.conceptCard}>
                <h4>{concept.name}</h4>
                {concept.hookSentence && (
                  <p className={styles.conceptHook}>{concept.hookSentence}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {conceptsByTier.leaf.length > 0 && (
        <div className={styles.tierSection}>
          <div className={styles.tierHeader}>
            <span className={styles.tierBadge} style={{ backgroundColor: 'var(--color-leaf)' }}>
              Leaf
            </span>
            <span className={styles.tierCount}>{conceptsByTier.leaf.length} concepts</span>
          </div>
          <div className={styles.conceptList}>
            {conceptsByTier.leaf.map(concept => (
              <div key={concept.id} className={styles.conceptCard}>
                <h4>{concept.name}</h4>
                {concept.hookSentence && (
                  <p className={styles.conceptHook}>{concept.hookSentence}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Micro View - Shows concepts within a ULC cell
function MicroView({
  verb,
  object,
  concepts,
  onBack
}: {
  verb: string;
  object: string;
  concepts: LearningConcept[];
  onBack: () => void;
}) {
  return (
    <div className={styles.microContainer}>
      <button onClick={onBack} className={styles.backButton}>
        <ArrowLeft size={16} />
        Back to Overview
      </button>

      <div className={styles.microHeader}>
        <h3>{verb} {object}</h3>
        <span className={styles.microCount}>{concepts.length} concept{concepts.length !== 1 ? 's' : ''}</span>
      </div>

      <div className={styles.microSequence}>
        {concepts.map((concept, index) => (
          <div key={concept.id} className={styles.sequenceItem}>
            <div className={styles.sequenceNumber}>{index + 1}</div>
            <div className={styles.sequenceContent}>
              <h4>{concept.name}</h4>
              
              {concept.phase1?.execution && (
                <div className={styles.howStep}>
                  <span className={styles.howLabel}>How:</span>
                  <span className={styles.howText}>{concept.phase1.execution}</span>
                </div>
              )}

              {concept.hookSentence && (
                <p className={styles.sequenceHook}>{concept.hookSentence}</p>
              )}

              {concept.keyPoints && concept.keyPoints.length > 0 && (
                <ul className={styles.keyPoints}>
                  {concept.keyPoints.slice(0, 2).map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.microFooter}>
        <button onClick={onBack} className={styles.backButtonLarge}>
          <ArrowLeft size={18} />
          Back to Overview
        </button>
      </div>
    </div>
  );
}
