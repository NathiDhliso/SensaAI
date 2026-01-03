/**
 * GraphView - Dependency network visualization
 * 
 * Force-directed graph showing concept relationships.
 * Uses SVG with animated nodes and edges.
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { SubjectGraph, DependencyEdge, DependencyMetrics } from '@/lib/types/learning';
import type { LearningConcept } from '@/lib/types/learning';
import styles from './GraphView.module.css';

export interface GraphViewProps {
    /** Dependency graph data */
    graph: SubjectGraph;
    /** Concepts for additional data */
    concepts: LearningConcept[];
    /** Selected concept ID */
    selectedConceptId?: string;
    /** Callback when node is clicked */
    onNodeClick?: (conceptId: string) => void;
    /** Canvas dimensions */
    width?: number;
    height?: number;
}

/**
 * Simple force-directed layout calculation
 * (Lightweight alternative to full d3-force)
 */
function calculateForceLayout(
    nodes: Array<{ id: string; metrics: DependencyMetrics }>,
    edges: DependencyEdge[],
    width: number,
    height: number,
    iterations: number = 50
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number; vx: number; vy: number }>();

    // Initialize positions in a circle
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    nodes.forEach((node, i) => {
        const angle = (i / nodes.length) * Math.PI * 2;
        positions.set(node.id, {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            vx: 0,
            vy: 0,
        });
    });

    // Build adjacency map
    const adjacency = new Map<string, Set<string>>();
    nodes.forEach(n => adjacency.set(n.id, new Set()));
    edges.forEach(e => {
        adjacency.get(e.source)?.add(e.target);
        adjacency.get(e.target)?.add(e.source);
    });

    // Simulation parameters
    const repulsion = 3000;
    const attraction = 0.02;
    const damping = 0.85;
    const minDistance = 60;

    // Run simulation
    for (let iter = 0; iter < iterations; iter++) {
        const alpha = 1 - iter / iterations;

        // Repulsion between all nodes
        for (const nodeA of nodes) {
            const posA = positions.get(nodeA.id)!;

            for (const nodeB of nodes) {
                if (nodeA.id === nodeB.id) continue;
                const posB = positions.get(nodeB.id)!;

                const dx = posA.x - posB.x;
                const dy = posA.y - posB.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                if (dist < minDistance * 3) {
                    const force = (repulsion * alpha) / (dist * dist);
                    posA.vx += (dx / dist) * force;
                    posA.vy += (dy / dist) * force;
                }
            }
        }

        // Attraction along edges
        for (const edge of edges) {
            const posA = positions.get(edge.source);
            const posB = positions.get(edge.target);
            if (!posA || !posB) continue;

            const dx = posB.x - posA.x;
            const dy = posB.y - posA.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            const force = dist * attraction * alpha;
            posA.vx += (dx / dist) * force;
            posA.vy += (dy / dist) * force;
            posB.vx -= (dx / dist) * force;
            posB.vy -= (dy / dist) * force;
        }

        // Apply velocities and damping
        for (const node of nodes) {
            const pos = positions.get(node.id)!;
            pos.x += pos.vx;
            pos.y += pos.vy;
            pos.vx *= damping;
            pos.vy *= damping;

            // Keep within bounds
            const margin = 50;
            pos.x = Math.max(margin, Math.min(width - margin, pos.x));
            pos.y = Math.max(margin, Math.min(height - margin, pos.y));
        }
    }

    // Convert to simple positions
    const result = new Map<string, { x: number; y: number }>();
    positions.forEach((pos, id) => result.set(id, { x: pos.x, y: pos.y }));
    return result;
}

/**
 * Get node size based on tier
 */
function getNodeSize(tier: string | undefined): number {
    switch (tier) {
        case 'Foundation': return 32;
        case 'Keystone': return 24;
        case 'Utility': return 18;
        default: return 20;
    }
}

/**
 * Get node color based on tier
 */
function getNodeColor(tier: string | undefined): string {
    switch (tier) {
        case 'Foundation': return '#10b981';
        case 'Keystone': return '#8b5cf6';
        case 'Utility': return '#f59e0b';
        default: return '#6b7280';
    }
}

/**
 * GraphView component
 */
export function GraphView({
    graph,
    concepts,
    selectedConceptId,
    onNodeClick,
    width = 800,
    height = 600,
}: GraphViewProps) {
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

    // Build concept map for quick lookup
    const conceptMap = useMemo(() => {
        const map = new Map<string, LearningConcept>();
        concepts.forEach(c => map.set(c.id, c));
        return map;
    }, [concepts]);

    // Calculate positions using force layout
    const positions = useMemo(() => {
        return calculateForceLayout(graph.nodes, graph.edges, width, height);
    }, [graph.nodes, graph.edges, width, height]);

    // Get edges with positions
    const edgesWithPositions = useMemo(() => {
        return graph.edges.map(edge => {
            const sourcePos = positions.get(edge.source);
            const targetPos = positions.get(edge.target);
            if (!sourcePos || !targetPos) return null;
            return {
                ...edge,
                x1: sourcePos.x,
                y1: sourcePos.y,
                x2: targetPos.x,
                y2: targetPos.y,
            };
        }).filter(Boolean) as Array<DependencyEdge & { x1: number; y1: number; x2: number; y2: number }>;
    }, [graph.edges, positions]);

    // Get connected nodes for highlighting
    const connectedNodes = useMemo(() => {
        const targetId = hoveredNodeId || selectedConceptId;
        if (!targetId) return new Set<string>();

        const connected = new Set<string>();
        connected.add(targetId);

        graph.edges.forEach(edge => {
            if (edge.source === targetId) connected.add(edge.target);
            if (edge.target === targetId) connected.add(edge.source);
        });

        return connected;
    }, [hoveredNodeId, selectedConceptId, graph.edges]);

    return (
        <div className={styles.graphContainer}>
            <svg
                className={styles.graphSvg}
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="xMidYMid meet"
            >
                {/* Grid background */}
                <defs>
                    <pattern id="graphGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(139, 92, 246, 0.05)" strokeWidth="1" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#graphGrid)" />

                {/* Edges */}
                <g className={styles.edges}>
                    {edgesWithPositions.map(edge => {
                        const isHighlighted = connectedNodes.has(edge.source) && connectedNodes.has(edge.target);

                        return (
                            <motion.line
                                key={edge.id}
                                x1={edge.x1}
                                y1={edge.y1}
                                x2={edge.x2}
                                y2={edge.y2}
                                stroke={isHighlighted ? 'rgba(139, 92, 246, 0.6)' : 'rgba(139, 92, 246, 0.2)'}
                                strokeWidth={isHighlighted ? 2 : 1}
                                strokeDasharray={edge.relationship === 'depends-on' ? 'none' : '4 2'}
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                            />
                        );
                    })}
                </g>

                {/* Arrow markers for edges */}
                <defs>
                    <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                    >
                        <polygon
                            points="0 0, 10 3.5, 0 7"
                            fill="rgba(139, 92, 246, 0.4)"
                        />
                    </marker>
                </defs>

                {/* Nodes */}
                <g className={styles.nodes}>
                    {graph.nodes.map(node => {
                        const pos = positions.get(node.id);
                        if (!pos) return null;

                        const concept = conceptMap.get(node.id);
                        const tier = node.metrics.calculatedTier;
                        const size = getNodeSize(tier);
                        const color = getNodeColor(tier);
                        const isSelected = node.id === selectedConceptId;
                        const isHovered = node.id === hoveredNodeId;
                        const isConnected = connectedNodes.size === 0 || connectedNodes.has(node.id);

                        // Get emoji from mnemonic
                        const emoji = concept?.mnemonic?.anchor?.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu)?.[0] || '📦';

                        return (
                            <motion.g
                                key={node.id}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{
                                    scale: 1,
                                    opacity: isConnected ? 1 : 0.3,
                                    x: pos.x,
                                    y: pos.y,
                                }}
                                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredNodeId(node.id)}
                                onMouseLeave={() => setHoveredNodeId(null)}
                                onClick={() => onNodeClick?.(node.id)}
                            >
                                {/* Node circle */}
                                <circle
                                    r={size}
                                    fill={`${color}20`}
                                    stroke={isSelected || isHovered ? color : `${color}60`}
                                    strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                                />

                                {/* Emoji */}
                                <text
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize={size * 0.8}
                                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                                >
                                    {emoji}
                                </text>

                                {/* Label on hover */}
                                {(isHovered || isSelected) && (
                                    <text
                                        y={size + 14}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="11"
                                        fontWeight="500"
                                    >
                                        {node.name.length > 20 ? node.name.slice(0, 20) + '...' : node.name}
                                    </text>
                                )}
                            </motion.g>
                        );
                    })}
                </g>
            </svg>

            {/* Stats panel */}
            {/* Stats panel - Bar Chart visualization */}
            <div className={styles.statsPanel}>
                <div className={styles.chartHeader}>
                    <span className={styles.totalLabel}>Total Concepts</span>
                    <span className={styles.totalValue}>{graph.stats.totalNodes}</span>
                </div>

                <div className={styles.barChart}>
                    {/* Foundation Bar */}
                    <div className={styles.barContainer} title={`Foundation: ${graph.stats.foundationCount}`}>
                        <div className={styles.barLabel}>Foundation</div>
                        <div className={styles.barTrack}>
                            <motion.div
                                className={styles.barFill}
                                initial={{ width: 0 }}
                                animate={{ width: `${(graph.stats.foundationCount / graph.stats.totalNodes) * 100}%` }}
                                transition={{ duration: 1, delay: 0.2 }}
                                style={{ backgroundColor: '#10b981' }}
                            />
                        </div>
                        <div className={styles.barValue}>{graph.stats.foundationCount}</div>
                    </div>

                    {/* Keystone Bar */}
                    <div className={styles.barContainer} title={`Keystone: ${graph.stats.keystoneCount}`}>
                        <div className={styles.barLabel}>Keystone</div>
                        <div className={styles.barTrack}>
                            <motion.div
                                className={styles.barFill}
                                initial={{ width: 0 }}
                                animate={{ width: `${(graph.stats.keystoneCount / graph.stats.totalNodes) * 100}%` }}
                                transition={{ duration: 1, delay: 0.4 }}
                                style={{ backgroundColor: '#8b5cf6' }}
                            />
                        </div>
                        <div className={styles.barValue}>{graph.stats.keystoneCount}</div>
                    </div>

                    {/* Utility Bar */}
                    <div className={styles.barContainer} title={`Utility: ${graph.stats.utilityCount}`}>
                        <div className={styles.barLabel}>Utility</div>
                        <div className={styles.barTrack}>
                            <motion.div
                                className={styles.barFill}
                                initial={{ width: 0 }}
                                animate={{ width: `${(graph.stats.utilityCount / graph.stats.totalNodes) * 100}%` }}
                                transition={{ duration: 1, delay: 0.6 }}
                                style={{ backgroundColor: '#f59e0b' }}
                            />
                        </div>
                        <div className={styles.barValue}>{graph.stats.utilityCount}</div>
                    </div>
                </div>

                <div className={styles.chartFooter}>
                    <span className={styles.connectionsLabel}>{graph.stats.totalEdges} Connections</span>
                </div>
            </div>
        </div>
    );
}

export default GraphView;
