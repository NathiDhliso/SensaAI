/**
 * Map Layout Types
 * 
 * Shared types for classification-driven concept map layouts.
 * Each layout engine positions nodes according to the subject's
 * deep structure, producing PositionedNode[] for rendering.
 */
import type { LearningConcept } from '@/shared/types/learning';
import type { SubjectType } from '@/shared/types/macro-workflow';
import type { LifecycleBlueprint } from '@/shared/types/generation';

// ============================================================================
// NODE ROLES (classification-specific semantics)
// ============================================================================
export type MapNodeRole =
    | 'center'        // Subject diamond/circle at origin
    | 'verb'          // Procedural: arm verb label
    | 'phase'         // Cyclic: phase on the loop ring
    | 'lens'          // Conceptual: analytical lens (ring 1)
    | 'step'          // Generic numbered step
    | 'scenario'      // Conceptual: application scenario (ring 2)
    | 'fork'          // Perceptual: decision diamond
    | 'root'          // Perceptual: observation root
    | 'branch-label'; // Perceptual: classification branch label

// ============================================================================
// POSITIONED NODE (output of layout engines)
// ============================================================================
export interface MapNodeMeta {
    role: MapNodeRole;
    armIndex?: number;          // Procedural: which verb arm (0, 1, 2)
    ringIndex?: number;         // Conceptual: which orbital ring (0 = inner, 1 = outer)
    phaseIndex?: number;        // Cyclic: which phase (0, 1, 2)
    branchPath?: string;        // Perceptual: which classification branch
    sequenceNumber?: number;    // Step ordering within arm/phase/branch
    verbLabel?: string;         // The verb text (CREATE, CONFIGURE, etc.)
    phaseAngle?: number;        // Cyclic: angle in radians for this phase node
    armColor?: string;          // Procedural: per-arm color CSS variable
}

export interface PositionedNode {
    id: string;
    conceptId: string;
    conceptName: string;
    x: number;
    y: number;
    meta: MapNodeMeta;
}

// ============================================================================
// LAYOUT EDGE (classification-specific connections)
// ============================================================================
export type MapEdgeStyle = 'solid' | 'dashed' | 'dotted' | 'arrow' | 'double-arrow' | 'return-arc' | 'fork-fan';

export interface LayoutEdge {
    id: string;
    fromId: string;
    toId: string;
    style: MapEdgeStyle;
    label?: string;
    /** SVG marker IDs to place on the edge */
    markers?: string[];
    /** Curvature factor (0 = straight, > 0 = curved) */
    curvature?: number;
    /** For animated edges (cyclic return arc) */
    animated?: boolean;
    /** SVG path data for curved edges */
    pathData?: string;
    /** Per-edge color override (e.g. per-arm color in procedural layout) */
    color?: string;
}

// ============================================================================
// LAYOUT RESULT (complete output from a layout engine)
// ============================================================================
export interface LayoutResult {
    nodes: PositionedNode[];
    edges: LayoutEdge[];
    /** SVG overlay elements (tier rings, return arcs, depth bands, etc.) */
    overlays: LayoutOverlay[];
    classification: SubjectType;
}

export interface LayoutOverlay {
    type: 'tier-ring' | 'arm-rail' | 'orbital-ring' | 'phase-arc' | 'depth-band' | 'return-arc' | 'tier-label';
    /** SVG path or circle data */
    pathData?: string;
    cx?: number;
    cy?: number;
    radius?: number;
    label?: string;
    color?: string;
    animated?: boolean;
    /** For depth-band / tier-label overlays */
    y?: number;
    height?: number;
    /** For return-arc overlays */
    startAngle?: number;
    endAngle?: number;
}

// ============================================================================
// LIFECYCLE BLUEPRINTS INPUT
// ============================================================================
export interface LifecycleBlueprints {
    phase1: LifecycleBlueprint;
    phase2: LifecycleBlueprint | null;
    phase3: LifecycleBlueprint | null;
}

// ============================================================================
// LAYOUT ENGINE SIGNATURE
// ============================================================================
export type LayoutEngine = (
    concepts: LearningConcept[],
    canvasSize: { width: number; height: number },
    lifecycleBlueprints?: LifecycleBlueprints | null,
) => LayoutResult;
