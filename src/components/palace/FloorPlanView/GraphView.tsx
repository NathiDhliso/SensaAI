/**
 * GraphView - Dependency network visualization
 * 
 * Force-directed graph showing concept relationships.
 * Uses SVG with animated nodes and edges.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { SubjectGraph, DependencyEdge, DependencyMetrics } from '@/lib/types/learning';
import type { LearningConcept } from '@/lib/types/learning';
import { GRAPH_COLORS } from '@/constants/theme-colors';
import styles from './GraphView.module.css';

// Ensure surface/text colors are available on GRAPH_COLORS or define local fallback
// Since GRAPH_COLORS is imported, assume it has palette. If not, we might need to cast or extend.
// For safety, let's define the semantic colors used for the labels here if missing from constant.
const LABEL_COLORS = {
    surface: '#1e1e2e', // Dark background for pill
    text: '#ffffff'     // White text
};

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
        case 'Foundation': return GRAPH_COLORS.foundation;
        case 'Keystone': return GRAPH_COLORS.keystone;
        case 'Utility': return GRAPH_COLORS.utility;
        default: return GRAPH_COLORS.utility;
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
    const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
    const [isDragging, setIsDragging] = useState(false);
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

    // Drag offset to keep mouse relative to node center
    const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);

    // Build concept map for quick lookup
    const conceptMap = useMemo(() => {
        const map = new Map<string, LearningConcept>();
        concepts.forEach(c => map.set(c.id, c));
        return map;
    }, [concepts]);

    // Zoom/Pan State
    const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const lastPanPoint = useRef({ x: 0, y: 0 });

    // Initialize positions using persistence or force layout
    useEffect(() => {
        const savedLayout = localStorage.getItem(`graph-layout-${graph.subjectId || 'default'}`);
        if (savedLayout) {
            try {
                const parsed = JSON.parse(savedLayout);
                const restoredMap = new Map<string, { x: number; y: number }>();
                // Reconstruct map
                if (Array.isArray(parsed)) {
                    parsed.forEach(([id, pos]) => restoredMap.set(id, pos));
                    setNodePositions(restoredMap);
                    return; // parsing successful
                }
            } catch (e) {
                console.error("Failed to load layout", e);
            }
        }

        // Fallback to force layout
        const initialPositions = calculateForceLayout(graph.nodes, graph.edges, width, height);
        setNodePositions(initialPositions);
    }, [graph.nodes, graph.edges, width, height, graph.subjectId]);

    // Save layout on change
    useEffect(() => {
        if (nodePositions.size > 0) {
            const serialized = JSON.stringify(Array.from(nodePositions.entries()));
            localStorage.setItem(`graph-layout-${graph.subjectId || 'default'}`, serialized);
        }
    }, [nodePositions, graph.subjectId]);

    // Handle Reset Layout
    const handleResetLayout = () => {
        const initialPositions = calculateForceLayout(graph.nodes, graph.edges, width, height);
        setNodePositions(initialPositions);
        setViewState({ x: 0, y: 0, scale: 1 }); // Also reset view
    };

    // Zoom Handler
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const scaleBy = 1.1;
        const oldScale = viewState.scale;
        const newScale = e.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

        // Clamp scale
        if (newScale < 0.2 || newScale > 5) return;
        setViewState(prev => ({ ...prev, scale: newScale }));
    };

    // Pan/Click Handlers
    const handlePanStart = (e: React.MouseEvent) => {
        if (e.target !== e.currentTarget) return; // Only pan if clicking background
        e.preventDefault();
        setIsPanning(true);
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
    };

    const handlePanMove = (e: React.MouseEvent) => {
        if (!isPanning) return;
        const dx = e.clientX - lastPanPoint.current.x;
        const dy = e.clientY - lastPanPoint.current.y;
        setViewState(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
    };

    const handleBackgroundClick = () => {
        // If we were just panning, don't clear selection (already handled by MouseUp check usually, but good to be explicit)
        // This handler handles the "Exit" interaction
        if (!isPanning && selectedConceptId && onNodeClick) {
            onNodeClick(null as any); // Clear selection
        }
        setIsPanning(false);
    };

    // Node Event Handlers
    const handleNodeHover = (id: string | null) => {
        // FOCUS LOCK: If a concept is selected, suppress hover effects on other nodes
        // to reduce visual noise ("distracting hovering")
        if (selectedConceptId) return;
        setHoveredNodeId(id);
    };

    const handleNodeClick = (e: React.MouseEvent, id: string) => {
        if (isDragging) return;
        e.stopPropagation(); // Prevent background click

        // Toggle selection: if clicking already selected node, deselect it
        if (selectedConceptId === id) {
            onNodeClick?.(null as any);
        } else {
            onNodeClick?.(id);
        }
    };

    // Drag Handlers for Nodes
    const handleMouseDown = (e: React.MouseEvent, nodeId: string, currentX: number, currentY: number) => {
        e.stopPropagation();
        setIsDragging(true);
        setDraggedNodeId(nodeId);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        // Handle Pan if active
        if (isPanning) {
            handlePanMove(e);
            return;
        }

        // Handle Node Drag
        if (!isDragging || !draggedNodeId || !svgRef.current) return;

        const dx = e.movementX / viewState.scale;
        const dy = e.movementY / viewState.scale;

        setNodePositions(prev => {
            const next = new Map(prev);
            const currentPos = next.get(draggedNodeId);
            if (currentPos) {
                next.set(draggedNodeId, {
                    x: currentPos.x + dx,
                    y: currentPos.y + dy
                });
            }
            return next;
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDraggedNodeId(null);
        // setIsPanning is handled in onClick for background
    };

    // Get edges with current positions
    const edgesWithPositions = useMemo(() => {
        return graph.edges.map(edge => {
            const sourcePos = nodePositions.get(edge.source);
            const targetPos = nodePositions.get(edge.target);
            if (!sourcePos || !targetPos) return null;
            return {
                ...edge,
                x1: sourcePos.x,
                y1: sourcePos.y,
                x2: targetPos.x,
                y2: targetPos.y,
            };
        }).filter(Boolean) as Array<DependencyEdge & { x1: number; y1: number; x2: number; y2: number }>;
    }, [graph.edges, nodePositions]);

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
            <div className={styles.controls}>
                <button onClick={handleResetLayout} className={styles.resetButton} title="Reset Layout">
                    ↺ Reset Physics
                </button>
            </div>

            <svg
                ref={svgRef}
                className={styles.graphSvg}
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="xMidYMid meet"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onMouseDown={handlePanStart}
                onClick={handleBackgroundClick} // Handle "Exit" click
                style={{
                    cursor: isPanning ? 'grabbing' : (isDragging ? 'grabbing' : 'default'),
                    touchAction: 'none'
                }}
            >
                {/* Grid background (Fixed, behind pan/zoom) */}
                <defs>
                    <pattern id="graphGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(139, 92, 246, 0.05)" strokeWidth="1" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#graphGrid)" />

                {/* Transformed Content Group */}
                <g transform={`translate(${viewState.x},${viewState.y}) scale(${viewState.scale})`}>

                    {/* Edges */}
                    <g className={styles.edges}>
                        {edgesWithPositions.map(edge => {
                            const isSourceSelected = selectedConceptId === edge.source;
                            const isTargetSelected = selectedConceptId === edge.target;
                            const isHighlighted = isSourceSelected || isTargetSelected || (connectedNodes.has(edge.source) && connectedNodes.has(edge.target));
                            const isFlowActive = (isSourceSelected || isTargetSelected) && !isDragging; // Only flow when focused and not dragging

                            // Calculate flow direction: Knowledge flows from Dependency (Target) to Dependent (Source)
                            // If relationship is 'depends-on', Target -> Source
                            const flowReversed = edge.relationship === 'depends-on';

                            // Midpoint for label
                            const midX = (edge.x1 + edge.x2) / 2;
                            const midY = (edge.y1 + edge.y2) / 2;

                            // Label text logic
                            let labelText = '';
                            if (isSourceSelected) {
                                // I am Source, I depend on Target
                                labelText = 'Needs';
                            } else if (isTargetSelected) {
                                // I is Target, Source depends on me
                                labelText = 'Unlocks';
                            }

                            return (
                                <g key={edge.id}>
                                    {/* Base Line */}
                                    <motion.line
                                        x1={edge.x1}
                                        y1={edge.y1}
                                        x2={edge.x2}
                                        y2={edge.y2}
                                        stroke={isHighlighted ? GRAPH_COLORS.keystone : 'rgba(139, 92, 246, 0.2)'}
                                        strokeWidth={(isHighlighted ? 2 : 1) / viewState.scale}
                                        strokeDasharray={edge.relationship === 'depends-on' ? 'none' : '4 2'}
                                        initial={{ opacity: 0 }}
                                        animate={{
                                            opacity: isHighlighted ? 1 : (selectedConceptId ? 0 : 0.2)
                                        }}
                                        transition={{ duration: 0 }}
                                    />

                                    {/* Flow Particle (The "Current") */}
                                    {isFlowActive && (
                                        <circle r={3 / viewState.scale} fill={GRAPH_COLORS.keystone}>
                                            <animateMotion
                                                dur="1.5s"
                                                repeatCount="indefinite"
                                                keyPoints={flowReversed ? "1;0" : "0;1"}
                                                keyTimes="0;1"
                                                path={`M${edge.x1},${edge.y1} L${edge.x2},${edge.y2}`}
                                            />
                                        </circle>
                                    )}

                                    {/* Contextual Label ("Silver Bullet" Explanation) */}
                                    {isFlowActive && labelText && (
                                        <g transform={`translate(${midX}, ${midY}) scale(${1 / viewState.scale})`}>
                                            {/* Label Background Pill */}
                                            <rect
                                                x="-24" y="-10"
                                                width="48" height="20"
                                                rx="10"
                                                fill={LABEL_COLORS.surface}
                                                stroke={GRAPH_COLORS.keystone}
                                                strokeWidth="1.5"
                                            />
                                            {/* Label Text */}
                                            <text
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                fill={LABEL_COLORS.text}
                                                fontSize="10"
                                                fontWeight="bold"
                                                dy="1"
                                            >
                                                {labelText}
                                            </text>
                                        </g>
                                    )}
                                </g>
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
                            const pos = nodePositions.get(node.id);
                            if (!pos) return null;

                            const concept = conceptMap.get(node.id);
                            const tier = node.metrics.calculatedTier;
                            const size = getNodeSize(tier);
                            const color = getNodeColor(tier);
                            const isSelected = node.id === selectedConceptId;
                            const isHovered = node.id === hoveredNodeId;
                            const isConnected = connectedNodes.size === 0 || connectedNodes.has(node.id);
                            const isDraggingNode = isDragging && draggedNodeId === node.id;

                            // Get emoji from mnemonic
                            const emoji = concept?.mnemonic?.anchor?.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu)?.[0] || '📦';

                            return (
                                <motion.g
                                    key={node.id}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{
                                        scale: isDraggingNode ? 1.1 : 1,
                                        opacity: isConnected ? 1 : (selectedConceptId ? 0.05 : 0.3),
                                        x: pos.x,
                                        y: pos.y,
                                        filter: isConnected ? 'none' : (selectedConceptId ? 'grayscale(100%) blur(1px)' : 'none'),
                                    }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 200,
                                        damping: 20,
                                        x: { duration: isDraggingNode ? 0 : 0.3 },
                                        y: { duration: isDraggingNode ? 0 : 0.3 }
                                    }}
                                    style={{
                                        cursor: isDraggingNode ? 'grabbing' : 'grab',
                                        pointerEvents: isConnected ? 'auto' : 'none',
                                    }}
                                    onMouseEnter={() => handleNodeHover(node.id)}
                                    onMouseLeave={() => handleNodeHover(null)}
                                    onMouseDown={(e: any) => handleMouseDown(e, node.id, pos.x, pos.y)}
                                    onClick={(e) => handleNodeClick(e, node.id)}
                                >
                                    {/* Node circle */}
                                    <circle
                                        r={size}
                                        fill={`${color}20`}
                                        stroke={isSelected || isHovered ? color : `${color}60`}
                                        strokeWidth={(isSelected ? 3 : isHovered ? 2 : 1) / viewState.scale} // Scale stroke inverse
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

                                    {/* Label on hover - keep visible size consistent if possible, or just scale naturally */}
                                    {(isHovered || isSelected || isDraggingNode) && (
                                        <g transform={`scale(${1 / viewState.scale})`}>
                                            <text
                                                y={(size + 14) * viewState.scale} // Counter-scale Y offset
                                                textAnchor="middle"
                                                fill="white"
                                                fontSize="11"
                                                fontWeight="500"
                                                style={{ pointerEvents: 'none' }}
                                            >
                                                {node.name.length > 20 ? node.name.slice(0, 20) + '...' : node.name}
                                            </text>
                                        </g>
                                    )}
                                </motion.g>
                            );
                        })}
                    </g>
                </g>
            </svg>

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
                                style={{ backgroundColor: GRAPH_COLORS.foundation }}
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
                                style={{ backgroundColor: GRAPH_COLORS.keystone }}
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
                                style={{ backgroundColor: GRAPH_COLORS.utility }}
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
