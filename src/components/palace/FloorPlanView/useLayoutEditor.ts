/**
 * useLayoutEditor - Hook for managing layout editing state
 * 
 * Provides drag-to-swap functionality and position persistence
 * for manual layout tuning in Floor Plan view.
 */

import { useState, useCallback, useMemo } from 'react';
import type { TreemapPosition } from '@/lib/generation/floor-plan-generator';

export interface LayoutOverride {
    conceptId: string;
    /** Custom position offset from original */
    offset: { x: number; y: number };
    /** Swapped with another concept */
    swappedWith?: string;
}

export interface UseLayoutEditorProps {
    /** Original positions from floor plan */
    originalPositions: Record<string, TreemapPosition>;
    /** Initial overrides (from storage) */
    initialOverrides?: LayoutOverride[];
    /** Callback when overrides change */
    onOverridesChange?: (overrides: LayoutOverride[]) => void;
}

export interface UseLayoutEditorResult {
    /** Is edit mode active */
    isEditing: boolean;
    /** Toggle edit mode */
    setIsEditing: (editing: boolean) => void;
    /** Currently dragging concept ID */
    draggingId: string | null;
    /** Start dragging a concept */
    startDrag: (conceptId: string) => void;
    /** End drag on a target (swap) or empty space (cancel) */
    endDrag: (targetConceptId?: string) => void;
    /** Get effective position for a concept */
    getPosition: (conceptId: string) => TreemapPosition | undefined;
    /** Reset all overrides to original positions */
    resetToDefault: () => void;
    /** Has any overrides */
    hasOverrides: boolean;
    /** Current overrides */
    overrides: LayoutOverride[];
}

/**
 * Hook for layout editing
 */
export function useLayoutEditor({
    originalPositions,
    initialOverrides = [],
    onOverridesChange,
}: UseLayoutEditorProps): UseLayoutEditorResult {
    const [isEditing, setIsEditing] = useState(false);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [overrides, setOverrides] = useState<LayoutOverride[]>(initialOverrides);

    // Build swap map for quick lookup
    const swapMap = useMemo(() => {
        const map = new Map<string, string>();
        overrides.forEach(o => {
            if (o.swappedWith) {
                map.set(o.conceptId, o.swappedWith);
                map.set(o.swappedWith, o.conceptId);
            }
        });
        return map;
    }, [overrides]);

    // Start dragging
    const startDrag = useCallback((conceptId: string) => {
        if (!isEditing) return;
        setDraggingId(conceptId);
    }, [isEditing]);

    // End drag - swap if dropped on another concept
    const endDrag = useCallback((targetConceptId?: string) => {
        if (!draggingId) return;

        if (targetConceptId && targetConceptId !== draggingId) {
            // Perform swap
            setOverrides(prev => {
                // Remove any existing swaps involving these concepts
                const filtered = prev.filter(
                    o => o.conceptId !== draggingId &&
                        o.conceptId !== targetConceptId &&
                        o.swappedWith !== draggingId &&
                        o.swappedWith !== targetConceptId
                );

                // Add new swap
                const newOverride: LayoutOverride = {
                    conceptId: draggingId,
                    offset: { x: 0, y: 0 },
                    swappedWith: targetConceptId,
                };

                const newOverrides = [...filtered, newOverride];
                onOverridesChange?.(newOverrides);
                return newOverrides;
            });
        }

        setDraggingId(null);
    }, [draggingId, onOverridesChange]);

    // Get effective position (considering swaps)
    const getPosition = useCallback((conceptId: string): TreemapPosition | undefined => {
        const swappedWith = swapMap.get(conceptId);
        const effectiveId = swappedWith || conceptId;
        return originalPositions[effectiveId];
    }, [originalPositions, swapMap]);

    // Reset all overrides
    const resetToDefault = useCallback(() => {
        setOverrides([]);
        onOverridesChange?.([]);
    }, [onOverridesChange]);

    return {
        isEditing,
        setIsEditing,
        draggingId,
        startDrag,
        endDrag,
        getPosition,
        resetToDefault,
        hasOverrides: overrides.length > 0,
        overrides,
    };
}

export default useLayoutEditor;
