/**
 * Overview Map View - Futuristic Read-Only Concept Overview
 * 
 * Provides a visually stunning, passive view of the subject structure with:
 * - ULC matrix as interactive legend
 * - Spatial concept layout with step progression
 * - Macro/micro drill-down with smooth animations
 * - Futuristic glassmorphic design
 */

import { useState, useMemo } from 'react';
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

  // Detect ULC pattern from concept names if not provided
  const detectedPattern = useMemo(() => {
    if (ulcPattern && ulcPattern.detected) return ulcPattern;
    
    // For Azure-style concepts, extract the resource/object first
    // Example: "Blob Storage Management" → object: "Blob Storage", implied verbs: manage, configure, monitor
    
    // Common Azure/cloud resource patterns
    const resourcePatterns = [
      'storage', 'network', 'identity', 'compute', 'database', 'security',
      'backup', 'recovery', 'policy', 'governance', 'role', 'access',
      'virtual', 'container', 'service', 'account', 'management'
    ];
    
    // Extract resources from concept names
    const resources = new Map<string, number>();
    
    concepts.forEach(concept => {
      const name = concept.name.toLowerCase();
      const words = name.split(/\s+/);
      
      // Find resource keywords
      const foundResources = words.filter(w => resourcePatterns.includes(w));
      if (foundResources.length > 0) {
        // Take first 2-3 words as resource name
        const resourceName = words.slice(0, Math.min(3, words.length))
          .filter(w => w.length > 2)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        
        if (resourceName.length > 3) {
          resources.set(resourceName, (resources.get(resourceName) || 0) + 1);
        }
      }
    });
    
    // Standard ULC verbs for cloud/IT subjects
    const verbs = ['Create', 'Configure', 'Monitor', 'Manage', 'Secure'];
    
    const objects = Array.from(resources.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([obj]) => obj);
    
    if (objects.length >= 3) {
      // Build matrix
      const matrix = objects.map(object => 
        verbs.map(verb => {
          // Find concepts that match this object
          const matchingConcepts = concepts.filter(c => 
            c.name.toLowerCase().includes(object.toLowerCase())
          );
          
          return {
            verb,
            object,
            conceptId: matchingConcepts[0]?.id,
            conceptName: matchingConcepts[0]?.name,
            status: 'not-started' as const
          };
        })
      );
      
      return {
        detected: true,
        verbs,
        objects,
        confidence: 80,
        matrix,
        totalCells: verbs.length * objects.length,
        explanation: `This subject covers ${objects.length} key resources with ${verbs.length} core operations.`
      };
    }
    
    return { detected: false, verbs: [], objects: [], confidence: 0, matrix: [], totalCells: 0 };
  }, [concepts, ulcPattern]);

  // Group concepts by tier for non-ULC fallback
  const conceptsByTier = useMemo(() => {
    const trunk = concepts.filter(c => c.tier === 'trunk');
    const branch = concepts.filter(c => c.tier === 'branch');
    const leaf = concepts.filter(c => c.tier === 'leaf' || !c.tier);
    return { trunk, branch, leaf };
  }, [concepts]);

  const handleCellClick = (verb: string, object: string) => {
    if (!detectedPattern.detected) return;

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
    if (!detectedPattern.detected) return null;
    const lower = name.toLowerCase();
    for (const verb of detectedPattern.verbs) {
      if (lower.includes(verb.toLowerCase())) return verb;
    }
    return null;
  };

  // Helper to extract object from concept name (simplified)
  const extractObjectFromName = (name: string): string | null => {
    if (!detectedPattern.detected) return null;
    const lower = name.toLowerCase();
    for (const obj of detectedPattern.objects) {
      if (lower.includes(obj.toLowerCase())) return obj;
    }
    return null;
  };

  return (
    <div className={styles.container}>
      {/* Animated background gradient */}
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
              {viewMode === 'macro' ? 'Knowledge Matrix' : 'Deep Dive'}
            </h2>
            <p className={styles.subtitle}>
              {viewMode === 'macro' 
                ? `${detectedPattern.detected ? detectedPattern.objects.length : concepts.length} concepts • ${detectedPattern.detected ? detectedPattern.verbs.length : 3} operations`
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
            {detectedPattern.detected ? (
              <ULCMacroView
                pattern={detectedPattern}
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

// ULC Macro View - Futuristic matrix with step indicators
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
          <h3>Universal Learning Cycle</h3>
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
              const cellConcepts = concepts.filter(c => {
                const name = c.name.toLowerCase();
                return name.includes(cell.object.toLowerCase());
              });
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
                {/* Show HOW steps instead of hook sentence */}
                {concept.howToUse && concept.howToUse.length > 0 && (
                  <div className={styles.howSteps}>
                    {concept.howToUse.slice(0, 2).map((step, i) => (
                      <div key={i} className={styles.howStep}>
                        <span className={styles.stepBullet}>→</span>
                        <span className={styles.stepText}>{step}</span>
                      </div>
                    ))}
                  </div>
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
                {concept.howToUse && concept.howToUse.length > 0 && (
                  <div className={styles.howSteps}>
                    {concept.howToUse.slice(0, 2).map((step, i) => (
                      <div key={i} className={styles.howStep}>
                        <span className={styles.stepBullet}>→</span>
                        <span className={styles.stepText}>{step}</span>
                      </div>
                    ))}
                  </div>
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
                {concept.howToUse && concept.howToUse.length > 0 && (
                  <div className={styles.howSteps}>
                    {concept.howToUse.slice(0, 2).map((step, i) => (
                      <div key={i} className={styles.howStep}>
                        <span className={styles.stepBullet}>→</span>
                        <span className={styles.stepText}>{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Micro View - Futuristic step-by-step procedure view
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
          <span className={styles.microSteps}>{concepts.reduce((acc, c) => acc + (c.howToUse?.length || 0), 0)} steps</span>
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
              
              {/* Show HOW steps - procedural instructions */}
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
