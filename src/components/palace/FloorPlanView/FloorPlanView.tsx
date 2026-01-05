/**
 * Floor Plan View - Blueprint-style interior visualization
 * 
 * The primary "interior" learning experience showing concepts as
 * emoji-based rectangles in a treemap layout within room boundaries.
 */

import { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { FloorPlanLayout } from '@/lib/generation/floor-plan-generator';
import type { LearningConcept } from '@/lib/types/learning';
import type { RoomTheme } from '@/lib/palace/theme-engine';
import { Room } from './Room';
import { MnemonicNode } from './MnemonicNode';
import styles from './FloorPlanView.module.css';

export interface FloorPlanViewProps {
    /** Pre-calculated floor plan layout */
    floorPlan: FloorPlanLayout;
    /** Concepts with mnemonic data */
    concepts: LearningConcept[];
    /** Currently selected concept ID */
    selectedConceptId?: string;
    /** Callback when a concept is clicked */
    onConceptClick?: (conceptId: string) => void;
    /** Callback to exit floor plan view */
    onExit?: () => void;
    /** Whether to show dependency lines */
    showDependencyLines?: boolean;
    /** Visual theme for the rooms */
    theme?: RoomTheme;
}

/**
 * FloorPlanView renders the "interior" of the memory palace.
 * Uses the pre-calculated treemap positions from the Freeze & Bake system.
 */
export function FloorPlanView({
    floorPlan,
    concepts,
    selectedConceptId,
    onConceptClick,
    onExit,
    showDependencyLines = false,
    theme,
}: FloorPlanViewProps) {
    // Map concepts to their positions
    const conceptsWithPositions = useMemo(() => {
        return concepts.map(concept => ({
            ...concept,
            position: floorPlan.positions[concept.id],
        })).filter(c => c.position); // Only render concepts with positions
    }, [concepts, floorPlan.positions]);

    return (
        <div className={styles.floorPlanContainer}>
            {/* Blueprint grid background */}
            <div className={styles.gridBackground} />

            {/* Exit button */}
            {onExit && (
                <button className={styles.exitButton} onClick={onExit}>
                    ← Exit to Exterior
                </button>
            )}

            {/* Main SVG canvas */}
            <svg
                className={styles.canvas}
                viewBox={`0 0 ${floorPlan.canvasSize.width} ${floorPlan.canvasSize.height}`}
                preserveAspectRatio="xMidYMid meet"
            >
                {/* Grid pattern definition */}
                <defs>
                    <pattern
                        id="blueprintGrid"
                        width="40"
                        height="40"
                        patternUnits="userSpaceOnUse"
                    >
                        <path
                            d="M 40 0 L 0 0 0 40"
                            fill="none"
                            stroke="var(--overlay-primary-5)"
                            strokeWidth="1"
                        />
                    </pattern>
                </defs>

                {/* Grid overlay */}
                <rect
                    width="100%"
                    height="100%"
                    fill="url(#blueprintGrid)"
                />

                {/* Render rooms */}
                <AnimatePresence>
                    {floorPlan.rooms.map((room, index) => (
                        <Room
                            key={room.id}
                            room={room}
                            canvasSize={floorPlan.canvasSize}
                            animationDelay={index * 0.1}
                            theme={theme}
                        />
                    ))}
                </AnimatePresence>

                {/* Render dependency lines */}
                {showDependencyLines && (
                    <g className={styles.dependencyLines}>
                        {conceptsWithPositions.map(concept => {
                            if (!concept.mnemonic?.dependsOn || concept.mnemonic.dependsOn.length === 0) return null;

                            return concept.mnemonic.dependsOn.map(targetName => {
                                // Find target concept by name (approximate matching) or ID if we had it
                                // For now, we iterate to find the partial match in names since we stored names in dependsOn
                                const target = conceptsWithPositions.find(
                                    c => c.name.toLowerCase() === targetName.toLowerCase() ||
                                        c.mnemonic?.anchor.toLowerCase().includes(targetName.toLowerCase())
                                );

                                if (!target) return null;

                                const startX = concept.position.x + concept.position.width / 2;
                                const startY = concept.position.y + concept.position.height / 2;
                                const endX = target.position.x + target.position.width / 2;
                                const endY = target.position.y + target.position.height / 2;

                                return (
                                    <line
                                        key={`${concept.id}-${target.id}`}
                                        x1={startX}
                                        y1={startY}
                                        x2={endX}
                                        y2={endY}
                                        className={styles.dependencyLine}
                                    />
                                );
                            });
                        })}
                    </g>
                )}

                {/* Render concepts as MnemonicNodes */}
                <AnimatePresence>
                    {conceptsWithPositions.map((concept, index) => (
                        <MnemonicNode
                            key={concept.id}
                            concept={concept}
                            position={concept.position}
                            canvasSize={floorPlan.canvasSize}
                            isSelected={concept.id === selectedConceptId}
                            onClick={() => onConceptClick?.(concept.id)}
                            animationDelay={0.3 + index * 0.05}
                        />
                    ))}
                </AnimatePresence>
            </svg>

            {/* Legend */}
            <div className={styles.legend}>
                <div className={styles.legendItem}>
                    <span className={styles.legendIcon} style={{ fontSize: '1.5rem' }}>🏔️</span>
                    <span>Foundation (Large)</span>
                </div>
                <div className={styles.legendItem}>
                    <span className={styles.legendIcon} style={{ fontSize: '1.2rem' }}>🔧</span>
                    <span>Keystone (Medium)</span>
                </div>
                <div className={styles.legendItem}>
                    <span className={styles.legendIcon} style={{ fontSize: '1rem' }}>🔑</span>
                    <span>Utility (Small)</span>
                </div>
            </div>
        </div>
    );
}

export default FloorPlanView;
