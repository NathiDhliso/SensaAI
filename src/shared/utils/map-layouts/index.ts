/**
 * Map Layout Factory
 *
 * Returns the appropriate layout engine for a given subject classification.
 * Also re-exports all layout types for convenient imports.
 */
import type { SubjectType } from '@/shared/types/macro-workflow';
import type { LayoutEngine, LayoutResult, LifecycleBlueprints } from './types';
import type { LearningConcept } from '@/shared/types/learning';
import { proceduralLayout } from './procedural-layout';
import { conceptualLayout } from './conceptual-layout';
import { cyclicLayout } from './cyclic-layout';
import { perceptualLayout } from './perceptual-layout';

export type { LayoutEngine, LayoutResult, PositionedNode, LayoutEdge, LayoutOverlay, MapNodeRole, MapNodeMeta, MapEdgeStyle, LifecycleBlueprints } from './types';

const layoutEngineMap: Record<SubjectType, LayoutEngine> = {
    procedural: proceduralLayout,
    conceptual: conceptualLayout,
    cyclic: cyclicLayout,
    perceptual: perceptualLayout,
};

/**
 * Get the layout engine for a subject classification type.
 * Falls back to procedural layout if the type is unknown.
 */
export function getLayoutEngine(subjectType: SubjectType | undefined | null): LayoutEngine {
    return layoutEngineMap[subjectType || 'procedural'] ?? proceduralLayout;
}

/**
 * Run layout for given concepts + classification in one call.
 */
export function computeClassificationLayout(
    concepts: LearningConcept[],
    canvasSize: { width: number; height: number },
    subjectType: SubjectType | undefined | null,
    lifecycleBlueprints?: LifecycleBlueprints | null,
): LayoutResult {
    const engine = getLayoutEngine(subjectType);
    return engine(concepts, canvasSize, lifecycleBlueprints);
}
