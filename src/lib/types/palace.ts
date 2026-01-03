/**
 * Memory Palace Types
 * For spatial learning using Street View locations
 */

import type { MnemonicContext, DependencyMetrics, SubjectGraph } from './learning';
import type { FloorPlanLayout } from '@/lib/generation/floor-plan-generator';

export interface MemoryPalace {
    id: string;
    subjectId: string;
    routeId: string;
    buildings: PalaceBuilding[];
    createdAt: string;
    /** Dynamic lifecycle labels for this subject */
    lifecycleLabels?: {
        phase1: string;
        phase2: string;
        phase3: string;
    };
    /** Current view mode for this palace */
    viewMode?: 'exterior' | 'interior' | 'graph';
    /** Layout version for migration tracking */
    layoutVersion?: number;
    /** "FREEZE & BAKE" - Saved floor plan layout (never reshuffles) */
    floorPlan?: FloorPlanLayout;
    /** Dependency graph for Graph View */
    dependencyGraph?: SubjectGraph;
}

export interface PalaceRoute {
    id: string;
    name: string;
    description: string;
    buildings: RouteBuilding[];
}

export interface RouteBuilding {
    id: string;
    name: string;
    visualTheme: string;
    coordinates: { lat: number; lng: number };
    heading: number;
    placements: PlacementSlot[];
    panoId?: string;
}

export interface PlacementSlot {
    id: string;
    location: string;
    visualAnchor: string;
    position: 'top' | 'center' | 'bottom';
    headingOffset?: number;
    pitch?: number;
}

export interface PalaceBuilding {
    routeBuildingId: string;
    stageId: string;
    stageName: string;
    concepts: PlacedConcept[];
}

export interface PlacedConcept {
    conceptId: string;
    conceptName: string;
    slotId: string;
    lifecycle: {
        phase1: string[];
        phase2: string[];
        phase3: string[];
    };
    mastery: number;
    /** Memory Palace mnemonic context */
    mnemonic?: MnemonicContext;
    /** Dependency metrics for layout sizing */
    dependencyMetrics?: DependencyMetrics;

    /** "FREEZE & BAKE" - Saved treemap position (never reshuffles) */
    treemapPosition?: {
        x: number;
        y: number;
        width: number;
        height: number;
        roomId: string;
    };
    /** Facade overlay position for exterior view */
    facadePosition?: {
        tier: number;
        offset: number;
    };
    /** User manual drag adjustment */
    positionOverride?: {
        x: number;
        y: number;
    };
}

export interface PalaceProgress {
    palaceId: string;
    buildingProgress: Record<string, number>; // buildingId -> mastery %
    conceptMastery: Record<string, ConceptMastery>;
    streak: number;
    lastWalkDate: string | null;
}

export interface ConceptMastery {
    seen: number;
    correct: number;
    mastery: number; // 0-1
    nextReview: string;
}
