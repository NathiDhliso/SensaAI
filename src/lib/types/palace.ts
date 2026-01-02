/**
 * Memory Palace Types
 * For spatial learning using Street View locations
 */

import type { MnemonicContext } from './learning';

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
