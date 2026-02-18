/**
 * Overview Map View - Clean ULC Matrix Implementation
 * 
 * Simply displays the ULC pattern detected by the ulc-detector
 * No complex logic, just trust the detector
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn,
  ArrowLeft,
  CheckCircle,
  Sparkles,
  Layers
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

  // Just use the ULC pattern from the detector
  const pattern = ulcPattern && ulcPattern.detected ? ulcPattern : null;

  const handleCellClick = (verb: string, object: string) => {
    if (!pattern) return;

    // Find all concepts that match this cell
    const cellConcepts = concepts.filter(c => {
      // Check if concept name contains the object
      return c.name.includes(object);
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

  if (!pattern) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>No ULC Pattern Detected</h2>
          <button onClick={onComplete}>Complete Overview</button>
        </div>
        <div>
          <p>This subject doesn't follow a Universal Learning Cycle pattern.</p>
          <p>Total concepts: {concepts.length}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.backgroundGradient} />
      
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <motion.div 
            className={styles.iconWrapper}
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles size={28} />
          </motion.div>
          <div>
            <h2 className={styles.title}>
              {viewMode === 'macro' ? 'Universal Learning Cycle' : 'Deep Dive'}
            </h2>
            <p className={styles.subtitle}>
              {viewMode === 'macro' 
                ? `${pattern.objects.length} resources × ${pattern.verbs.join(' → ')}`
                : `${selectedCell?.verb} → ${selectedCell?.object}`
              }
            </p>
          </div>
        </div>
        <motion.button 
          onClick={onComplete} 
          className={styles.completeButton}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <CheckCircle size={18} />
          Complete Overview
        </motion.button>
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
            <ULCMacroView
              pattern={pattern}
              concepts={concepts}
              onCellClick={handleCellClick}
            />
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

// ULC Macro View
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
      <motion.div 
        className={styles.ulcLegend}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className={styles.legendIcon}>
          <Layers size={24} />
        </div>
        <div className={styles.legendContent}>
          <p>{pattern.explanation}</p>
        </div>
      </motion.div>

      <div className={styles.ulcMatrix} role="grid">
        <div className={styles.matrixHeader} role="row">
          <div className={styles.matrixCorner}>
            <span className={styles.cornerLabel}>Resources</span>
          </div>
          {pattern.verbs.map((verb, index) => (
            <motion.div 
              key={verb} 
              className={styles.matrixVerb} 
              role="columnheader"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
            >
              <span className={styles.verbNumber}>Step {index + 1}</span>
              <span className={styles.verbName}>{verb}</span>
            </motion.div>
          ))}
        </div>

        {pattern.matrix.map((row, rowIndex) => (
          <motion.div 
            key={rowIndex} 
            className={styles.matrixRow} 
            role="row"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: rowIndex * 0.1, duration: 0.4 }}
          >
            <div className={styles.matrixObject} role="rowheader">
              <span className={styles.objectIcon}>◆</span>
              <span className={styles.objectName}>{pattern.objects[rowIndex]}</span>
            </div>
            {row.map((cell, cellIndex) => {
              // Count concepts that contain this object name
              const cellConcepts = concepts.filter(c => c.name.includes(cell.object));
              const count = cellConcepts.length;
              const isEmpty = count === 0;

              return (
                <motion.button
                  key={cellIndex}
                  className={`${styles.matrixCell} ${isEmpty ? styles.cellEmpty : styles.cellFilled}`}
                  onClick={() => !isEmpty && onCellClick(cell.verb, cell.object)}
                  disabled={isEmpty}
                  role="gridcell"
                  aria-label={`${cell.verb} ${cell.object}: ${count} concept${count !== 1 ? 's' : ''}`}
                  whileHover={!isEmpty ? { scale: 1.05, y: -4 } : {}}
                  whileTap={!isEmpty ? { scale: 0.95 } : {}}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (rowIndex + cellIndex) * 0.05, duration: 0.3 }}
                >
                  {isEmpty ? (
                    <span className={styles.emptyIndicator}>—</span>
                  ) : (
                    <div className={styles.cellContent}>
                      <span className={styles.cellCount}>{count}</span>
                      <span className={styles.cellLabel}>concepts</span>
                      <ZoomIn size={16} className={styles.cellIcon} />
                    </div>
                  )}
                  <div className={styles.cellGlow} />
                </motion.button>
              );
            })}
          </motion.div>
        ))}
      </div>

      <motion.div 
        className={styles.ulcHint}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <Sparkles size={16} />
        <p>Click any cell to explore step-by-step procedures</p>
      </motion.div>
    </div>
  );
}

// Micro View
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
      <motion.button 
        onClick={onBack} 
        className={styles.backButton}
        whileHover={{ x: -4 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowLeft size={16} />
        Back to Matrix
      </motion.button>

      <motion.div 
        className={styles.microHeader}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.microTitle}>
          <span className={styles.microVerb}>{verb}</span>
          <span className={styles.microSeparator}>→</span>
          <span className={styles.microObject}>{object}</span>
        </div>
        <div className={styles.microMeta}>
          <span className={styles.microCount}>{concepts.length} concepts</span>
        </div>
      </motion.div>

      <div className={styles.microSequence}>
        {concepts.map((concept, index) => (
          <motion.div 
            key={concept.id} 
            className={styles.sequenceItem}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
          >
            <div className={styles.sequenceNumber}>
              <span className={styles.numberValue}>{index + 1}</span>
              <div className={styles.numberGlow} />
            </div>
            <div className={styles.sequenceContent}>
              <h4 className={styles.sequenceTitle}>{concept.name}</h4>
              
              {/* Show steps from howToUse */}
              {concept.howToUse && concept.howToUse.length > 0 && (
                <div className={styles.howSteps}>
                  {concept.howToUse.map((step, i) => (
                    <motion.div 
                      key={i} 
                      className={styles.howStep}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 + i * 0.05, duration: 0.3 }}
                    >
                      <span className={styles.stepNumber}>{i + 1}</span>
                      <span className={styles.stepText}>{step}</span>
                      <div className={styles.stepConnector} />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div 
        className={styles.microFooter}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <button onClick={onBack} className={styles.backButtonLarge}>
          <ArrowLeft size={18} />
          Return to Matrix
        </button>
      </motion.div>
    </div>
  );
}
