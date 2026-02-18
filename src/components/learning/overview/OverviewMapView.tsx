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

  // SILVER BULLET: Use AI-generated lifecycle labels as ULC verbs
  const detectedPattern = useMemo(() => {
    if (ulcPattern && ulcPattern.detected) return ulcPattern;
    
    console.log('[OverviewMap] Total concepts:', concepts.length);
    console.log('[OverviewMap] Sample concept:', concepts[0]);
    
    // Extract AI-generated lifecycle labels from concepts
    // These are the actual ULC verbs (e.g., "Create", "Configure", "Monitor" for Azure)
    const lifecycleLabels = concepts[0]?.lifecycle;
    const verbs = lifecycleLabels 
      ? [lifecycleLabels.phase1.title, lifecycleLabels.phase2.title, lifecycleLabels.phase3.title]
      : ['Prepare', 'Implement', 'Verify']; // Fallback
    
    console.log('[OverviewMap] ULC Verbs from AI:', verbs);
    
    // Map verbs to internal phase keys
    const verbToPhase: Record<string, 'PREPARE' | 'MODEL' | 'DELIVER'> = {
      [verbs[0]]: 'PREPARE',
      [verbs[1]]: 'MODEL',
      [verbs[2]]: 'DELIVER'
    };
    
    // Extract unique objects (resources) from concept names
    // For Azure: "Storage", "Identity", "Networking", etc.
    const objectSet = new Set<string>();
    concepts.forEach(c => {
      // Try to extract object from trunkDomain or parentName
      if (c.trunkDomain) {
        objectSet.add(c.trunkDomain);
      } else if (c.parentName && c.tier !== 'trunk') {
        objectSet.add(c.parentName);
      }
    });
    
    const objects = Array.from(objectSet);
    console.log('[OverviewMap] ULC Objects extracted:', objects);
    
    // If we have objects, build ULC matrix
    if (objects.length >= 2) {
      // Build matrix: objects × verbs
      // Each object (e.g., "Storage") appears in ALL verbs (Create, Configure, Monitor)
      const matrix = objects.map(objectName => 
        verbs.map(verb => {
          const phase = verbToPhase[verb];
          
          // Find concepts for this object × verb combination
          const matchingConcepts = concepts.filter(c => 
            (c.trunkDomain === objectName || c.parentName === objectName) &&
            c.lifecyclePhase === phase
          );
          
          console.log(`[OverviewMap] Cell ${verb} × ${objectName}:`, matchingConcepts.length, 'concepts');
          
          return {
            verb,
            object: objectName,
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
        confidence: 95,
        matrix,
        totalCells: verbs.length * objects.length,
        explanation: `Master ${objects.length} resources through ${verbs.length} operations`
      };
    }
    
    // Fallback: Use tier-based grouping
    const tierCounts = {
      trunk: concepts.filter(c => c.tier === 'trunk').length,
      branch: concepts.filter(c => c.tier === 'branch').length,
      leaf: concepts.filter(c => c.tier === 'leaf').length
    };
    console.log('[OverviewMap] Tier distribution:', tierCounts);
    
    const tierObjects = Object.entries(tierCounts)
      .filter(([_, count]) => count > 0)
      .map(([tier]) => tier.charAt(0).toUpperCase() + tier.slice(1));
    
    if (tierObjects.length >= 2) {
      const matrix = tierObjects.map(tierName => 
        verbs.map(verb => {
          const phase = verbToPhase[verb];
          const tier = tierName.toLowerCase() as 'trunk' | 'branch' | 'leaf';
          
          const matchingConcepts = concepts.filter(c => 
            c.tier === tier && c.lifecyclePhase === phase
          );
          
          console.log(`[OverviewMap] Fallback cell ${verb} × ${tierName}:`, matchingConcepts.length, 'concepts');
          
          return {
            verb,
            object: tierName,
            conceptId: matchingConcepts[0]?.id,
            conceptName: matchingConcepts[0]?.name,
            status: 'not-started' as const
          };
        })
      );
      
      return {
        detected: true,
        verbs,
        objects: tierObjects,
        confidence: 85,
        matrix,
        totalCells: verbs.length * tierObjects.length,
        explanation: `Master ${tierObjects.length} concept levels through ${verbs.length} operations`
      };
    }
    
    console.log('[OverviewMap] No ULC pattern detected');
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

    // Map verb to phase dynamically
    const verbToPhase: Record<string, 'PREPARE' | 'MODEL' | 'DELIVER'> = {
      [detectedPattern.verbs[0]]: 'PREPARE',
      [detectedPattern.verbs[1]]: 'MODEL',
      [detectedPattern.verbs[2]]: 'DELIVER'
    };
    
    const phase = verbToPhase[verb];
    
    // Find concepts matching this cell using structured data
    let cellConcepts: LearningConcept[] = [];
    
    // Check if object is a trunk domain
    const isTrunkDomain = concepts.some(c => c.tier === 'trunk' && c.name === object);
    
    if (isTrunkDomain && phase) {
      // Find branch/leaf concepts under this trunk with this phase
      cellConcepts = concepts.filter(c => 
        (c.trunkDomain === object || c.parentName === object) &&
        c.lifecyclePhase === phase
      );
    } else {
      // Object is a tier name (Trunk/Branch/Leaf)
      const tier = object.toLowerCase() as 'trunk' | 'branch' | 'leaf';
      if (phase) {
        cellConcepts = concepts.filter(c => 
          c.tier === tier && c.lifecyclePhase === phase
        );
      }
    }

    if (cellConcepts.length > 0) {
      setSelectedCell({ verb, object, concepts: cellConcepts });
      setViewMode('micro');
    }
  };

  const handleBackToMacro = () => {
    setViewMode('macro');
    setSelectedCell(null);
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
              {viewMode === 'macro' ? 'Universal Learning Cycle' : 'Deep Dive'}
            </h2>
            <p className={styles.subtitle}>
              {viewMode === 'macro' 
                ? detectedPattern.detected 
                  ? `${detectedPattern.objects.length} resources × ${detectedPattern.verbs.join(' → ')}`
                  : `${concepts.length} concepts to master`
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
  // Map verbs to phases dynamically
  const verbToPhase: Record<string, 'PREPARE' | 'MODEL' | 'DELIVER'> = {
    [pattern.verbs[0]]: 'PREPARE',
    [pattern.verbs[1]]: 'MODEL',
    [pattern.verbs[2]]: 'DELIVER'
  };

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
              const mappedPhase = verbToPhase[cell.verb];
              
              // Count concepts that match this cell
              // Check if object is a trunk domain name or a tier name
              const isTrunkDomain = concepts.some(c => c.tier === 'trunk' && c.name === cell.object);
              
              let cellConcepts: LearningConcept[] = [];
              if (isTrunkDomain) {
                // Object is a trunk concept name - find children with this phase
                cellConcepts = concepts.filter(c => 
                  (c.trunkDomain === cell.object || c.parentName === cell.object) &&
                  c.lifecyclePhase === mappedPhase
                );
              } else {
                // Object is a tier name (Trunk/Branch/Leaf)
                const tier = cell.object.toLowerCase() as 'trunk' | 'branch' | 'leaf';
                cellConcepts = concepts.filter(c => 
                  c.tier === tier && c.lifecyclePhase === mappedPhase
                );
              }
              
              const count = cellConcepts.length;
              const isEmpty = count === 0;
              
              console.log(`[ULCMatrix] Cell ${cell.verb} × ${cell.object}: ${count} concepts (phase=${mappedPhase}, isTrunk=${isTrunkDomain})`);

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
