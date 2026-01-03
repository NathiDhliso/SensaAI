/**
 * Minimap - Overview navigation for Floor Plan view
 * 
 * Shows a small overview of the entire floor plan with:
 * - All rooms as colored rectangles
 * - Current viewport indicator
 * - Click to navigate to area
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { FloorPlanLayout } from '@/lib/generation/floor-plan-generator';
import type { LearningConcept } from '@/lib/types/learning';
import styles from './Minimap.module.css';

export interface MinimapProps {
    /** Floor plan layout data */
    floorPlan: FloorPlanLayout;
    /** Concepts for visual data */
    concepts: LearningConcept[];
    /** Currently selected concept ID */
    selectedConceptId?: string;
    /** Current viewport bounds (normalized 0-1) */
    viewport?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    /** Callback when minimap area is clicked */
    onNavigate?: (position: { x: number; y: number }) => void;
    /** Callback when concept is clicked */
    onConceptClick?: (conceptId: string) => void;
}

/**
 * Get tier color
 */
function getTierColor(tier: string | undefined): string {
    switch (tier) {
        case 'Foundation': return '#10b981';
        case 'Keystone': return '#8b5cf6';
        case 'Utility': return '#f59e0b';
        default: return '#6b7280';
    }
}

/**
 * Minimap component
 */
export function Minimap({
    floorPlan,
    concepts,
    selectedConceptId,
    viewport = { x: 0, y: 0, width: 1, height: 1 },
    onNavigate,
    onConceptClick,
}: MinimapProps) {
    // Minimap dimensions
    const width = 180;
    const height = 100;

    // Build concept map for quick lookup
    const conceptMap = useMemo(() => {
        const map = new Map<string, LearningConcept>();
        concepts.forEach(c => map.set(c.id, c));
        return map;
    }, [concepts]);

    // Handle minimap click
    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!onNavigate) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        onNavigate({ x, y });
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles.title}>Overview</span>
            </div>

            <svg
                className={styles.minimap}
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="xMidYMid meet"
                onClick={handleClick}
            >
                {/* Background */}
                <rect
                    width={width}
                    height={height}
                    fill="rgba(0, 0, 0, 0.4)"
                    rx="4"
                />

                {/* Grid pattern */}
                <defs>
                    <pattern
                        id="minimapGrid"
                        width="10"
                        height="10"
                        patternUnits="userSpaceOnUse"
                    >
                        <path
                            d="M 10 0 L 0 0 0 10"
                            fill="none"
                            stroke="rgba(59, 130, 246, 0.1)"
                            strokeWidth="0.5"
                        />
                    </pattern>
                </defs>
                <rect width={width} height={height} fill="url(#minimapGrid)" rx="4" />

                {/* Rooms */}
                {floorPlan.rooms.map(room => (
                    <rect
                        key={room.id}
                        x={room.x * width}
                        y={room.y * height}
                        width={room.width * width}
                        height={room.height * height}
                        fill="rgba(59, 130, 246, 0.15)"
                        stroke="rgba(59, 130, 246, 0.4)"
                        strokeWidth="1"
                        rx="2"
                    />
                ))}

                {/* Concept dots */}
                {Object.entries(floorPlan.positions).map(([conceptId, pos]) => {
                    const concept = conceptMap.get(conceptId);
                    const tier = concept?.mnemonic?.tier;
                    const color = getTierColor(tier);
                    const isSelected = conceptId === selectedConceptId;

                    const cx = (pos.x + pos.width / 2) * width;
                    const cy = (pos.y + pos.height / 2) * height;
                    const r = isSelected ? 4 : 2.5;

                    return (
                        <motion.circle
                            key={conceptId}
                            cx={cx}
                            cy={cy}
                            r={r}
                            fill={color}
                            opacity={isSelected ? 1 : 0.7}
                            stroke={isSelected ? 'white' : 'none'}
                            strokeWidth={isSelected ? 1 : 0}
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onConceptClick?.(conceptId);
                            }}
                            whileHover={{ scale: 1.5 }}
                        />
                    );
                })}

                {/* Viewport indicator */}
                <motion.rect
                    x={viewport.x * width}
                    y={viewport.y * height}
                    width={viewport.width * width}
                    height={viewport.height * height}
                    fill="rgba(139, 92, 246, 0.1)"
                    stroke="rgba(139, 92, 246, 0.6)"
                    strokeWidth="1.5"
                    strokeDasharray="3 2"
                    rx="2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                />
            </svg>

            {/* Room count */}
            <div className={styles.footer}>
                <span>{floorPlan.rooms.length} rooms</span>
                <span>•</span>
                <span>{Object.keys(floorPlan.positions).length} concepts</span>
            </div>
        </div>
    );
}

export default Minimap;
