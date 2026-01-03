/**
 * MindPalaceContainer - Orchestrates view modes and transitions
 * 
 * This is the main container component that:
 * - Manages view mode state (exterior/interior/graph)
 * - Handles transitions between views
 * - Renders appropriate view based on current mode
 */

import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { FloorPlanLayout } from '@/lib/generation/floor-plan-generator';
import { generateFloorPlan, buildTreemapInput, buildTreemapStages } from '@/lib/generation/floor-plan-generator';
import type { LearningConcept, SubjectGraph, DependencyMetrics } from '@/lib/types/learning';
import { calculateTier, calculateCentralityScore } from '@/lib/generation/tier-calculator';
import { FloorPlanView } from './FloorPlanView';
import { GraphView } from './GraphView';
import { DoorwayTransition, TOTAL_TRANSITION_DURATION } from './DoorwayTransition';
import { ViewModeSwitcher, type ViewMode } from './ViewModeSwitcher';
import { EntranceMarker } from './EntranceMarker';
import { CinematicView } from '../CinematicView/CinematicView';
import { useGenerationStore } from '@/store/generation-store';
import { getThemeForSubject } from '@/lib/palace/theme-engine';
import styles from './MindPalaceContainer.module.css';

/**
 * Generate fallback dependency graph from concepts when none exists.
 * Creates a simple chain based on order within stages.
 */
function generateFallbackGraph(concepts: LearningConcept[]): SubjectGraph {
    // Group by stage
    const stageGroups = new Map<string, LearningConcept[]>();
    concepts.forEach(c => {
        const group = stageGroups.get(c.stageId) || [];
        group.push(c);
        stageGroups.set(c.stageId, group);
    });

    // Create edges: each concept depends on previous in same stage
    const edges: SubjectGraph['edges'] = [];
    stageGroups.forEach((stageConcepts) => {
        for (let i = 1; i < stageConcepts.length; i++) {
            edges.push({
                id: `edge-fallback-${stageConcepts[i].id}-${stageConcepts[i - 1].id}`,
                source: stageConcepts[i].id,
                target: stageConcepts[i - 1].id,
                relationship: 'related-to',
                weight: 0.5,
            });
        }
    });

    // Calculate simple metrics
    const dependentCounts = new Map<string, number>();
    concepts.forEach(c => dependentCounts.set(c.id, 0));
    edges.forEach(e => {
        dependentCounts.set(e.target, (dependentCounts.get(e.target) || 0) + 1);
    });

    let maxConnections = 0;
    concepts.forEach(c => {
        const count = dependentCounts.get(c.id) || 0;
        if (count > maxConnections) maxConnections = count;
    });

    const nodes = concepts.map(c => {
        const depCount = dependentCounts.get(c.id) || 0;
        const metrics: DependencyMetrics = {
            conceptId: c.id,
            conceptName: c.name,
            dependentCount: depCount,
            dependencyCount: 0,
            totalConnections: depCount,
            calculatedTier: calculateTier(depCount),
            centralityScore: calculateCentralityScore(depCount, maxConnections),
            clusterGroup: c.stageId,
        };
        return { id: c.id, name: c.name, stageId: c.stageId, metrics };
    });

    // Stats
    let foundationCount = 0, keystoneCount = 0, utilityCount = 0;
    nodes.forEach(n => {
        if (n.metrics.calculatedTier === 'Foundation') foundationCount++;
        else if (n.metrics.calculatedTier === 'Keystone') keystoneCount++;
        else utilityCount++;
    });

    return {
        subjectId: 'fallback',
        generatedAt: new Date().toISOString(),
        nodes,
        edges,
        stats: {
            totalNodes: nodes.length,
            totalEdges: edges.length,
            foundationCount,
            keystoneCount,
            utilityCount,
            centralHub: nodes.reduce((a, b) =>
                (a.metrics.totalConnections > b.metrics.totalConnections) ? a : b, nodes[0]
            )?.id || '',
        },
    };
}

/**
 * Generate fallback floor plan from concepts when none exists.
 */
function generateFallbackFloorPlan(concepts: LearningConcept[]): FloorPlanLayout {
    // Extract unique stages
    const stageIds = [...new Set(concepts.map(c => c.stageId))];
    const stages = stageIds.map((id, i) => ({ id, name: id, order: i + 1 }));

    // Build treemap input
    const treemapConcepts = buildTreemapInput(
        concepts.map(c => ({
            id: c.id,
            name: c.name,
            stageId: c.stageId,
            mnemonic: c.mnemonic,
        }))
    );
    const treemapStages = buildTreemapStages(stages as any);

    return generateFloorPlan(treemapConcepts, treemapStages);
}

export interface MindPalaceContainerProps {
    /** Pre-calculated floor plan layout */
    floorPlan?: FloorPlanLayout;
    /** Concepts with mnemonic data */
    concepts: LearningConcept[];
    /** Dependency graph for graph view */
    dependencyGraph?: SubjectGraph;
    /** Initial view mode */
    initialMode?: ViewMode;
    /** External Street View component to render in exterior mode */
    exteriorView?: React.ReactNode;
    /** Callback when a concept is selected */
    onConceptSelect?: (conceptId: string) => void;
    /** Callback when view mode changes */
    onModeChange?: (mode: ViewMode) => void;
}

/**
 * MindPalaceContainer component
 */
export function MindPalaceContainer({
    floorPlan: providedFloorPlan,
    concepts,
    dependencyGraph: providedGraph,
    initialMode = 'exterior',
    exteriorView,
    onConceptSelect,
    onModeChange,
}: MindPalaceContainerProps) {
    const [currentMode, setCurrentMode] = useState<ViewMode>(initialMode);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [transitionDirection, setTransitionDirection] = useState<'enter' | 'exit'>('enter');
    const [selectedConceptId, setSelectedConceptId] = useState<string | undefined>();

    // Generate fallback data if not provided (migration support for older palaces)
    const effectiveGraph = useMemo(() => {
        if (providedGraph && providedGraph.nodes.length > 0) {
            return providedGraph;
        }
        if (concepts.length > 0) {
            console.log('[MindPalaceContainer] Generating fallback dependency graph');
            return generateFallbackGraph(concepts);
        }
        return undefined;
    }, [providedGraph, concepts]);

    const effectiveFloorPlan = useMemo(() => {
        if (providedFloorPlan && Object.keys(providedFloorPlan.positions).length > 0) {
            return providedFloorPlan;
        }
        if (concepts.length > 0) {
            console.log('[MindPalaceContainer] Generating fallback floor plan');
            return generateFallbackFloorPlan(concepts);
        }
        return undefined;
    }, [providedFloorPlan, concepts]);

    // Handle mode change with transition
    const handleModeChange = useCallback((newMode: ViewMode) => {
        if (newMode === currentMode || isTransitioning) return;

        // Determine transition direction
        const direction = newMode === 'interior' ? 'enter' : 'exit';
        setTransitionDirection(direction);
        setIsTransitioning(true);

        // After fade-out phase, switch view
        setTimeout(() => {
            setCurrentMode(newMode);
            onModeChange?.(newMode);
        }, TOTAL_TRANSITION_DURATION / 2);
    }, [currentMode, isTransitioning, onModeChange]);

    // Handle transition complete
    const handleTransitionComplete = useCallback(() => {
        setIsTransitioning(false);
    }, []);

    // Handle entering floor plan from exterior
    const handleEnterFloorPlan = useCallback(() => {
        handleModeChange('interior');
    }, [handleModeChange]);

    // Handle exiting floor plan to exterior
    const handleExitFloorPlan = useCallback(() => {
        handleModeChange('exterior');
    }, [handleModeChange]);

    // Handle concept click
    const handleConceptClick = useCallback((conceptId: string) => {
        setSelectedConceptId(conceptId);
        onConceptSelect?.(conceptId);
    }, [onConceptSelect]);

    // Handle closing cinematic view
    const handleCloseCinematic = useCallback(() => {
        setSelectedConceptId(undefined);
    }, []);

    // Find selected concept object
    const selectedConcept = useMemo(() =>
        concepts.find(c => c.id === selectedConceptId),
        [concepts, selectedConceptId]);

    // Determine available modes based on data (always available with fallbacks)
    const availableModes: ViewMode[] = ['exterior'];
    if (effectiveFloorPlan) availableModes.push('interior');
    if (effectiveGraph) availableModes.push('graph');

    // Determine theme based on subject
    const subject = useGenerationStore(state => state.currentSubject || '');
    const theme = useMemo(() => getThemeForSubject(subject), [subject]);

    return (
        <div className={styles.container}>
            {/* View mode switcher */}
            <div className={styles.switcherWrapper}>
                <ViewModeSwitcher
                    currentMode={currentMode}
                    onModeChange={handleModeChange}
                    isDisabled={isTransitioning}
                    availableModes={availableModes}
                />
            </div>

            {/* Main view area with transitions */}
            <DoorwayTransition
                isTransitioning={isTransitioning}
                direction={transitionDirection}
                onComplete={handleTransitionComplete}
            >
                <div className={styles.viewContainer}>
                    <AnimatePresence mode="wait">
                        {/* Exterior View (Street View) */}
                        {currentMode === 'exterior' && (
                            <div key="exterior" className={styles.viewPane}>
                                {exteriorView || (
                                    <div className={styles.placeholderView}>
                                        <span>Street View Exterior</span>
                                        <p>Connect your Street View component here</p>
                                    </div>
                                )}

                                {/* Entrance marker to enter floor plan */}
                                {effectiveFloorPlan && (
                                    <EntranceMarker
                                        onEnter={handleEnterFloorPlan}
                                        isEnabled={!isTransitioning}
                                    />
                                )}
                            </div>
                        )}

                        {/* Interior View (Floor Plan) */}
                        {currentMode === 'interior' && effectiveFloorPlan && (
                            <div key="interior" className={styles.viewPane}>
                                <FloorPlanView
                                    floorPlan={effectiveFloorPlan}
                                    concepts={concepts}
                                    selectedConceptId={selectedConceptId}
                                    onConceptClick={handleConceptClick}
                                    onExit={handleExitFloorPlan}
                                    theme={theme}
                                />
                            </div>
                        )}

                        {/* Graph View (Dependency Network) */}
                        {currentMode === 'graph' && effectiveGraph && (
                            <div key="graph" className={styles.viewPane}>
                                <GraphView
                                    graph={effectiveGraph}
                                    concepts={concepts}
                                    selectedConceptId={selectedConceptId}
                                    onNodeClick={handleConceptClick}
                                />
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </DoorwayTransition>

            {/* Cinematic Focus Mode Overlay */}
            <AnimatePresence>
                {selectedConcept && (
                    <CinematicView
                        concept={selectedConcept}
                        onClose={handleCloseCinematic}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default MindPalaceContainer;
