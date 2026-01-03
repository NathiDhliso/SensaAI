/**
 * Floor Plan Generator - Treemap Layout Calculator
 * 
 * This module implements the "Freeze & Bake" layout system:
 * - Calculate treemap positions ONCE at generation time
 * - Save positions to Sprint object (never reshuffle)
 * - Uses d3-hierarchy for deterministic, space-efficient layouts
 */

import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';
import type { HierarchyRectangularNode } from 'd3-hierarchy';
import type { DependencyMetrics } from '@/lib/types/learning';
import { getTierWeight, type Tier } from './tier-calculator';

/**
 * Treemap position for a concept (normalized 0-1 coordinates)
 */
export interface TreemapPosition {
    /** Normalized X position (0-1) */
    x: number;
    /** Normalized Y position (0-1) */
    y: number;
    /** Normalized width (0-1) */
    width: number;
    /** Normalized height (0-1) */
    height: number;
    /** Room/stage this concept belongs to */
    roomId: string;
}

/**
 * Input concept for treemap calculation
 */
export interface TreemapConcept {
    id: string;
    name: string;
    stageId: string;
    tier: Tier;
}

/**
 * Input stage/room for floor plan
 */
export interface TreemapStage {
    id: string;
    name: string;
    order: number;
}

/**
 * Floor plan layout result
 */
export interface FloorPlanLayout {
    /** Map of conceptId -> position */
    positions: Record<string, TreemapPosition>;
    /** Timestamp when layout was generated */
    generatedAt: string;
    /** Canvas dimensions used for calculation */
    canvasSize: { width: number; height: number };
    /** Room boundaries for rendering */
    rooms: Array<{
        id: string;
        name: string;
        x: number;
        y: number;
        width: number;
        height: number;
    }>;
}

/**
 * Fixed canvas dimensions (16:9 aspect ratio)
 * Actual rendering scales via CSS transform
 */
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 900;

/**
 * Room layout configuration
 * Rooms are arranged in a 2-column grid
 */
const ROOM_PADDING = 0.02; // 2% padding between rooms
const CONCEPT_PADDING = 4; // Pixels of padding between concepts in treemap

/**
 * Generate floor plan layout from concepts and stages.
 * This is the core "Freeze & Bake" function - run ONCE at generation time.
 * 
 * @param concepts - Array of concepts with tier information
 * @param stages - Array of stages (rooms)
 * @returns Complete floor plan layout with positions
 */
export function generateFloorPlan(
    concepts: TreemapConcept[],
    stages: TreemapStage[]
): FloorPlanLayout {
    const positions: Record<string, TreemapPosition> = {};
    const rooms: FloorPlanLayout['rooms'] = [];

    // Sort stages by order
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);

    // Calculate room layout (2-column grid with variable height based on content)
    const roomLayouts = calculateRoomLayouts(sortedStages, concepts);

    // For each room, calculate treemap positions for its concepts
    for (const roomLayout of roomLayouts) {
        const roomConcepts = concepts.filter(c => c.stageId === roomLayout.stageId);

        if (roomConcepts.length === 0) continue;

        rooms.push({
            id: roomLayout.stageId,
            name: roomLayout.stageName,
            x: roomLayout.x,
            y: roomLayout.y,
            width: roomLayout.width,
            height: roomLayout.height,
        });

        // Calculate treemap for this room's concepts
        const roomPositions = calculateRoomTreemap(
            roomConcepts,
            roomLayout
        );

        // Merge into main positions map
        Object.assign(positions, roomPositions);
    }

    return {
        positions,
        generatedAt: new Date().toISOString(),
        canvasSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
        rooms,
    };
}

/**
 * Room layout information
 */
interface RoomLayout {
    stageId: string;
    stageName: string;
    x: number;       // Normalized 0-1
    y: number;       // Normalized 0-1
    width: number;   // Normalized 0-1
    height: number;  // Normalized 0-1
}

/**
 * Calculate room boundaries based on stage count and content distribution
 */
function calculateRoomLayouts(
    stages: TreemapStage[],
    concepts: TreemapConcept[]
): RoomLayout[] {
    const layouts: RoomLayout[] = [];
    const stageCount = stages.length;

    if (stageCount === 0) return layouts;

    // Calculate concept weight per stage for proportional sizing
    const stageWeights = new Map<string, number>();
    let totalWeight = 0;

    for (const stage of stages) {
        const stageConcepts = concepts.filter(c => c.stageId === stage.id);
        const weight = stageConcepts.reduce((sum, c) => sum + getTierWeight(c.tier), 0);
        stageWeights.set(stage.id, Math.max(weight, 1)); // Minimum weight of 1
        totalWeight += Math.max(weight, 1);
    }

    // Layout strategy based on stage count
    if (stageCount <= 2) {
        // Single row layout
        let xOffset = ROOM_PADDING;
        const availableWidth = 1 - (ROOM_PADDING * (stageCount + 1));

        for (const stage of stages) {
            const weight = stageWeights.get(stage.id) || 1;
            const widthRatio = weight / totalWeight;
            const roomWidth = availableWidth * widthRatio;

            layouts.push({
                stageId: stage.id,
                stageName: stage.name,
                x: xOffset,
                y: ROOM_PADDING,
                width: roomWidth,
                height: 1 - (ROOM_PADDING * 2),
            });

            xOffset += roomWidth + ROOM_PADDING;
        }
    } else if (stageCount <= 4) {
        // 2x2 grid layout
        const cols = 2;
        const rows = Math.ceil(stageCount / cols);
        const cellWidth = (1 - (ROOM_PADDING * (cols + 1))) / cols;
        const cellHeight = (1 - (ROOM_PADDING * (rows + 1))) / rows;

        stages.forEach((stage, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);

            layouts.push({
                stageId: stage.id,
                stageName: stage.name,
                x: ROOM_PADDING + col * (cellWidth + ROOM_PADDING),
                y: ROOM_PADDING + row * (cellHeight + ROOM_PADDING),
                width: cellWidth,
                height: cellHeight,
            });
        });
    } else {
        // 3-column layout for 5+ stages
        const cols = 3;
        const rows = Math.ceil(stageCount / cols);
        const cellWidth = (1 - (ROOM_PADDING * (cols + 1))) / cols;
        const cellHeight = (1 - (ROOM_PADDING * (rows + 1))) / rows;

        stages.forEach((stage, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);

            layouts.push({
                stageId: stage.id,
                stageName: stage.name,
                x: ROOM_PADDING + col * (cellWidth + ROOM_PADDING),
                y: ROOM_PADDING + row * (cellHeight + ROOM_PADDING),
                width: cellWidth,
                height: cellHeight,
            });
        });
    }

    return layouts;
}

/**
 * Calculate treemap positions for concepts within a room
 */
function calculateRoomTreemap(
    concepts: TreemapConcept[],
    room: RoomLayout
): Record<string, TreemapPosition> {
    const positions: Record<string, TreemapPosition> = {};

    if (concepts.length === 0) return positions;

    // Build hierarchy data for d3-treemap
    // Root node contains all concepts as children
    const hierarchyData = {
        name: 'root',
        children: concepts.map(c => ({
            name: c.name,
            id: c.id,
            value: getTierWeight(c.tier), // Foundation=4, Keystone=2, Utility=1
        })),
    };

    // Create hierarchy and calculate treemap
    const root = hierarchy(hierarchyData)
        .sum(d => (d as { value?: number }).value || 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Room dimensions in pixels (for treemap calculation)
    const roomWidthPx = room.width * CANVAS_WIDTH;
    const roomHeightPx = room.height * CANVAS_HEIGHT;

    // Apply treemap layout
    const treemapLayout = treemap<typeof hierarchyData>()
        .size([roomWidthPx, roomHeightPx])
        .padding(CONCEPT_PADDING)
        .tile(treemapSquarify);

    treemapLayout(root);

    // Extract positions from treemap nodes
    for (const node of root.leaves()) {
        const data = node.data as { id?: string; name: string };
        if (!data.id) continue;

        const rectNode = node as HierarchyRectangularNode<typeof hierarchyData>;

        // Convert pixel positions to normalized room-relative coordinates
        // Then offset by room position
        positions[data.id] = {
            x: room.x + (rectNode.x0 / CANVAS_WIDTH),
            y: room.y + (rectNode.y0 / CANVAS_HEIGHT),
            width: (rectNode.x1 - rectNode.x0) / CANVAS_WIDTH,
            height: (rectNode.y1 - rectNode.y0) / CANVAS_HEIGHT,
            roomId: room.stageId,
        };
    }

    return positions;
}

/**
 * Apply floor plan positions to concepts.
 * Used when loading content after generation.
 * 
 * @param concepts - Concepts with dependency metrics
 * @param layout - Pre-calculated floor plan layout
 * @returns Concepts with treemapPosition filled in
 */
export function applyFloorPlanPositions<T extends { id: string; treemapPosition?: TreemapPosition }>(
    concepts: T[],
    layout: FloorPlanLayout
): T[] {
    return concepts.map(concept => ({
        ...concept,
        treemapPosition: layout.positions[concept.id] || concept.treemapPosition,
    }));
}

/**
 * Build TreemapConcept array from parsed concepts with metrics.
 * Helper for integration with generation pipeline.
 */
export function buildTreemapInput(
    concepts: Array<{
        id: string;
        name: string;
        stageId: string;
        mnemonic?: { tier?: Tier };
        dependencyMetrics?: DependencyMetrics;
    }>
): TreemapConcept[] {
    return concepts.map(c => ({
        id: c.id,
        name: c.name,
        stageId: c.stageId,
        // Priority: calculated tier from metrics > mnemonic tier > default Utility
        tier: c.dependencyMetrics?.calculatedTier
            || c.mnemonic?.tier
            || 'Utility',
    }));
}

/**
 * Build TreemapStage array from learning stages.
 * Helper for integration with generation pipeline.
 */
export function buildTreemapStages(
    stages: Array<{ id: string; name: string; order: number }>
): TreemapStage[] {
    return stages.map(s => ({
        id: s.id,
        name: s.name,
        order: s.order,
    }));
}
