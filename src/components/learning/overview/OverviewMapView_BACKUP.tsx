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
    
    // Debug: Check what lifecycle data we have
    console.log('[OverviewMap] Lifecycle labels:', lifecycleLabels);
    console.log('[OverviewMap] First concept full data:', JSON.stringify(concepts[0], null, 2));
    
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
    
    // STRATEGY: For Azure-style subjects, the concept names themselves contain the resource
    // e.g., "Implement and Manage Storage" → resource is "Storage"
    // We need to extract the resource name from the concept name and group by it
    
    // Extract unique resources from concept names
    const resourceMap = new Map<string, LearningConcept[]>();
    
    concepts.forEach(c => {
      // Try multiple strategies to extract resource name
      let resourceName: string | null = null;
      
      // Strategy 1: Use trunkDomain if available
      if (c.trunkDomain) {
        resourceName = c.trunkDomain;
      }
      // Strategy 2: Use parentName if available
      else if (c.parentName) {
        resourceName = c.parentName;
      }
      // Strategy 3: Extract from concept name
      // Look for patterns like "Implement and Manage Storage" → "Storage"
      // or "Deploy and Manage Azure Compute Resources" → "Compute"
      else {
        const name = c.name;
        // Common Azure resource keywords
        const resourceKeywords = [
          'Storage', 'Networking', 'Network', 'Identity', 'Identities', 
          'Compute', 'Security', 'Monitor', 'Database', 'Container',
          'Virtual Machine', 'App Service', 'Function', 'Kubernetes'
        ];
        
        for (const keyword of resourceKeywords) {
          if (name.includes(keyword)) {
            resourceName = keyword;
            break;
          }
        }
        
        // If still no match, try to extract the last significant word
        if (!resourceName) {
          const words = name.split(' ').filter(w => 
            w.length > 3 && 
            !['and', 'the', 'for', 'with', 'Azure', 'Manage', 'Deploy', 'Implement', 'Monitor'].includes(w)
          );
          if (words.length > 0) {
            resourceName = words[words.length - 1];
          }
        }
      }
      
      if (resourceName) {
        if (!resourceMap.has(resourceName)) {
          resourceMap.set(resourceName, []);
        }
        resourceMap.get(resourceName)!.push(c);
      }
    });
    
    const objects = Array.from(resourceMap.keys());
    console.log('[OverviewMap] ULC Resources extracted:', objects);
    console.log('[OverviewMap] Resource map:', Array.from(resourceMap.entries()).map(([k, v]) => `${k}: ${v.length} concepts`));
    
    // If we have resources, build ULC matrix
    if (objects.length >= 2) {
      // Build matrix: objects × verbs
      // Each resource appears in ALL verbs with the SAME concepts
      const matrix = objects.map(resourceName => 
        verbs.map(verb => {
          // Get all concepts for this resource
          const resourceConcepts = resourceMap.get(resourceName) || [];
          
          // For ULC pattern: the SAME concepts appear in all verbs
          // The difference is which lifecycle phase steps are shown
          // So we return ALL concepts for this resource, regardless of their current lifecyclePhase
          const matchingConcepts = resourceConcepts;
          
          console.log(`[OverviewMap] Cell ${verb} × ${resourceName}:`, matchingConcepts.length, 'concepts', matchingConcepts.map(c => c.name));
          
          return {
            verb,
            object: resourceName,
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

    // For ULC pattern: ALL concepts for a resource appear in ALL verbs
    // The difference is which lifecycle phase steps we show
    // So we find all concepts that match this resource
    const cellConcepts = concepts.filter(c => {
      // Check if concept belongs to this resource
      if (c.trunkDomain === object || c.parentName === object) {
        return true;
      }
      
      // Also check if resource name is in the concept name
      if (c.name.includes(object)) {
        return true;
      }
      
      return false;
    });

    console.log(`[OverviewMap] Clicked ${verb} × ${object}: ${cellConcepts.length} concepts`);

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
              // For ULC pattern: ALL concepts for a resource appear in ALL verbs
              // Count all concepts that match this resource
              const cellConcepts = concepts.filter(c => {
                // Check if concept belongs to this resource
                if (c.trunkDomain === cell.object || c.parentName === cell.object) {
                  return true;
                }
                
                // Also check if resource name is in the concept name
                if (c.name.includes(cell.object)) {
                  return true;
                }
                
                return false;
              });
              
              const count = cellConcepts.length;
              const isEmpty = count === 0;
              
              console.log(`[ULCMatrix] Cell ${cell.verb} × ${cell.object}: ${count} concepts`);

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
  // Determine which lifecycle phase to show based on verb
  // verb is one of the AI-generated labels (e.g., "Create", "Configure", "Monitor")
  // We need to map it to phase1, phase2, or phase3
  const getPhaseKey = (verb: string, concept: LearningConcept): 'phase1' | 'phase2' | 'phase3' => {
    if (!concept.lifecycle) return 'phase1';
    
    // Match verb to lifecycle phase title
    if (concept.lifecycle.phase1.title === verb) return 'phase1';
    if (concept.lifecycle.phase2.title === verb) return 'phase2';
    if (concept.lifecycle.phase3.title === verb) return 'phase3';
    
    // Fallback: assume order (first verb = phase1, second = phase2, third = phase3)
    return 'phase1';
  };

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
        {concepts.map((concept, index) => {
          // Get the correct phase steps for this verb
          const phaseKey = getPhaseKey(verb, concept);
          const phaseSteps = concept.lifecycle?.[phaseKey]?.steps || concept.howToUse || [];
          
          return (
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
                
                {/* Show verb-specific steps from lifecycle phase */}
                {phaseSteps.length > 0 && (
                  <div className={styles.howSteps}>
                    {phaseSteps.map((step, i) => (
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
          );
        })}
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
