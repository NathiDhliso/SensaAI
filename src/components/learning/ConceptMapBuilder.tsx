/**
 * ConceptMapBuilder Component
 * 
 * Implements Phase 2: Build the Web.
 * Allows users to create a concept map by dragging concepts and connecting them.
 */
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    Move,
    Check,
    Sparkles,
    Lightbulb,
    AlertTriangle
} from 'lucide-react';
import type { LearningConcept, ConceptMapData } from '@/lib/types/learning';
import {
    suggestConnections,
    detectGaps,
    type ConnectionSuggestion,
    type GapDetection
} from '@/lib/ai/phases';
import { usePersonalizationStore } from '@/store/personalization-store';
import styles from './ConceptMapBuilder.module.css';

interface ConceptMapBuilderProps {
    concepts: LearningConcept[];
    onComplete?: (data: ConceptMapData) => void;
    initialData?: ConceptMapData | null;
    readOnly?: boolean;
}

interface MapNode {
    id: string;
    conceptId: string;
    x: number;
    y: number;
}

interface Connection {
    id: string;
    fromId: string;
    toId: string;
    label: string;
}

export default function ConceptMapBuilder({
    concepts,
    onComplete,
    initialData,
    readOnly = false
}: ConceptMapBuilderProps) {
    const [nodes, setNodes] = useState<MapNode[]>(initialData?.nodes || []);
    const [connections, setConnections] = useState<Connection[]>(initialData?.connections || []);
    const [addedConceptIds, setAddedConceptIds] = useState<Set<string>>(
        new Set(initialData?.nodes.map(n => n.conceptId) || [])
    );

    // Tools: 'select' (drag nodes), 'connect' (draw lines)
    const [activeTool, setActiveTool] = useState<'select' | 'connect'>('select');

    // Interaction State
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

    // Refs for drag math
    const canvasRef = useRef<HTMLDivElement>(null);

    // AI State
    const { selectedPersona } = usePersonalizationStore();
    const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
    const [detectedGaps, setDetectedGaps] = useState<GapDetection[]>([]);
    const [showAiPanel, setShowAiPanel] = useState(true);

    // Run AI analysis when map changes (debounced could be better, but simple for now)
    // In a real app, wrap in useEffect withdebounce
    const analyzeMap = () => {
        if (nodes.length < 2) return;

        // generated suggestions
        const existingConns = connections.map(c => ({ fromId: c.fromId, toId: c.toId }));
        // Note: AI needs concept IDs, but nodes manage positions. Map nodes lack direct concept ref mapping easily available?
        // nodes has conceptId. 

        // Filter concepts currently on the map
        const mapConceptIds = new Set(nodes.map(n => n.conceptId));
        const mapConcepts = concepts.filter(c => mapConceptIds.has(c.id));

        // 1. Suggest Connections
        const newSuggestions = suggestConnections(mapConcepts,
            connections.map(c => {
                const fromNode = nodes.find(n => n.id === c.fromId);
                const toNode = nodes.find(n => n.id === c.toId);
                return {
                    fromId: fromNode?.conceptId || '',
                    toId: toNode?.conceptId || ''
                };
            })
        );
        setSuggestions(newSuggestions.slice(0, 3)); // Top 3

        // 2. Detect Gaps
        const gaps = detectGaps(concepts,
            nodes.map(n => n.conceptId),
            connections.map(c => {
                const fromNode = nodes.find(n => n.id === c.fromId);
                const toNode = nodes.find(n => n.id === c.toId);
                return {
                    fromId: fromNode?.conceptId || '',
                    toId: toNode?.conceptId || ''
                };
            })
        );
        setDetectedGaps(gaps);
    };

    // Trigger analysis on changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const timer = setTimeout(analyzeMap, 1000); // 1s debounce
        return () => clearTimeout(timer);
    }, [nodes, connections]);

    const acceptSuggestion = (suggestion: ConnectionSuggestion) => {
        const fromNode = nodes.find(n => n.conceptId === suggestion.fromConceptId);
        const toNode = nodes.find(n => n.conceptId === suggestion.toConceptId);

        if (fromNode && toNode) {
            const newConnection: Connection = {
                id: `conn-${Date.now()}`,
                fromId: fromNode.id,
                toId: toNode.id,
                label: suggestion.suggestedLabel
            };
            setConnections(prev => [...prev, newConnection]);

            // Remove this suggestion
            setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        }
    };

    const handleAddConcept = (concept: LearningConcept) => {
        if (readOnly || addedConceptIds.has(concept.id)) return;

        const newNode: MapNode = {
            id: `node-${Date.now()}`,
            conceptId: concept.id,
            x: 100 + Math.random() * 50,
            y: 100 + Math.random() * 50
        };

        setNodes(prev => [...prev, newNode]);
        setAddedConceptIds(prev => new Set(prev).add(concept.id));
    };

    const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();

        // Still allow selecting in readOnly, but not dragging if rigid? 
        // Let's allow dragging to rearrange view even in readOnly, but NO connecting.

        if (activeTool === 'connect' && !readOnly) {
            if (connectingFromId === null) {
                setConnectingFromId(nodeId);
            } else if (connectingFromId !== nodeId) {
                // Complete connection
                finishConnection(connectingFromId, nodeId);
            }
            return;
        }

        // Select tool (always allowed to move nodes for visibility)
        setSelectedNodeId(nodeId);
        setDraggingNodeId(nodeId);
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (!draggingNodeId || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setNodes(prev => prev.map(n =>
            n.id === draggingNodeId ? { ...n, x, y } : n
        ));
    };

    const handleCanvasMouseUp = () => {
        setDraggingNodeId(null);
    };

    const finishConnection = (fromId: string, toId: string) => {
        if (readOnly) return;

        // Prevent duplicate connections
        const exists = connections.some(c => c.fromId === fromId && c.toId === toId);
        if (exists) {
            setConnectingFromId(null);
            return;
        }

        const newConnection: Connection = {
            id: `conn-${Date.now()}`,
            fromId,
            toId,
            label: '?' // Default label, user should edit
        };

        setConnections(prev => [...prev, newConnection]);
        setConnectingFromId(null);

        // Prompt for label immediately
        const label = prompt("Why do these connect? (e.g., 'causes', 'is part of')", "connects to");
        if (label) {
            updateConnectionLabel(newConnection.id, label);
        }
    };

    const updateConnectionLabel = (connId: string, newLabel: string) => {
        setConnections(prev => prev.map(c =>
            c.id === connId ? { ...c, label: newLabel } : c
        ));
    };

    const getConceptName = (conceptId: string) => {
        return concepts.find(c => c.id === conceptId)?.name || 'Unknown';
    };

    // Helper to draw SVG lines
    const renderConnections = () => {
        return connections.map(conn => {
            const startNode = nodes.find(n => n.id === conn.fromId);
            const endNode = nodes.find(n => n.id === conn.toId);
            if (!startNode || !endNode) return null;

            // Simple center-to-center for now
            // In a pro version, calculate intersection with node boundary

            return (
                <g key={conn.id} onClick={() => {
                    if (readOnly) return;
                    const label = prompt("Update label:", conn.label);
                    if (label) updateConnectionLabel(conn.id, label);
                }}>
                    <line
                        x1={startNode.x}
                        y1={startNode.y}
                        x2={endNode.x}
                        y2={endNode.y}
                        stroke="var(--color-primary)"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                        style={{ cursor: readOnly ? 'default' : 'pointer' }}
                    />
                    <circle cx={(startNode.x + endNode.x) / 2} cy={(startNode.y + endNode.y) / 2} r="10" fill="var(--color-surface-base)" stroke="var(--color-border)" />
                    <text
                        x={(startNode.x + endNode.x) / 2}
                        y={(startNode.y + endNode.y) / 2}
                        dy=".3em"
                        textAnchor="middle"
                        fontSize="12"
                        className={styles.svgLabel}
                    >
                        ?
                    </text>
                </g>
            );
        });
    };

    // Render connection HTML labels for better editing/visibility
    const renderConnectionLabels = () => {
        return connections.map(conn => {
            const startNode = nodes.find(n => n.id === conn.fromId);
            const endNode = nodes.find(n => n.id === conn.toId);
            if (!startNode || !endNode) return null;

            const midX = (startNode.x + endNode.x) / 2;
            const midY = (startNode.y + endNode.y) / 2;

            return (
                <div
                    key={`label-${conn.id}`}
                    className={styles.connectionLabel}
                    style={{ left: midX, top: midY }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (readOnly) return;
                        const label = prompt("Why do these connect?", conn.label);
                        if (label) updateConnectionLabel(conn.id, label);
                    }}
                >
                    {conn.label || '?'}
                </div>
            );
        });
    };

    // Render AI Panel
    const renderAiPanel = () => {
        if (!showAiPanel || (suggestions.length === 0 && detectedGaps.length === 0)) return null;

        return (
            <div className={styles.aiPanel}>
                <div className={styles.aiPanelHeader}>
                    <Sparkles size={14} />
                    <span>Coach {selectedPersona === 'goggins' ? 'Insights' : 'Suggestions'}</span>
                    <button
                        onClick={() => setShowAiPanel(false)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'currentColor' }}
                    >
                        ×
                    </button>
                </div>
                <div className={styles.aiPanelContent}>
                    {detectedGaps.length > 0 && (
                        <div className={styles.aiGapAlert}>
                            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <strong>Gap Detected:</strong><br />
                                {detectedGaps[0].message}
                            </div>
                        </div>
                    )}

                    {suggestions.map(suggestion => {
                        const fromName = concepts.find(c => c.id === suggestion.fromConceptId)?.name;
                        const toName = concepts.find(c => c.id === suggestion.toConceptId)?.name;

                        return (
                            <div
                                key={suggestion.id}
                                className={styles.aiSuggestion}
                                onClick={() => acceptSuggestion(suggestion)}
                            >
                                <div className={styles.aiSuggestionText}>
                                    <Lightbulb size={12} style={{ display: 'inline', marginRight: 4 }} />
                                    Connect <strong>{fromName}</strong> and <strong>{toName}</strong>
                                </div>
                                <div className={styles.aiSuggestionMeta}>
                                    Suggested: "{suggestion.suggestedLabel}" • {Math.round(suggestion.confidence * 100)}% Match
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            {/* Sidebar - Hide in readOnly to focus on map */}
            {!readOnly && (
                <div className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <h3 className={styles.sidebarTitle}>Concepts</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Drag to canvas</p>
                    </div>
                    <div className={styles.conceptList}>
                        {concepts.map(c => (
                            <div
                                key={c.id}
                                className={`${styles.sidebarItem} ${addedConceptIds.has(c.id) ? styles.added : ''}`}
                                onClick={() => handleAddConcept(c)}
                            >
                                {c.name}
                                {addedConceptIds.has(c.id) && <Check size={14} style={{ float: 'right', color: 'var(--color-success)' }} />}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Canvas */}
            <div
                ref={canvasRef}
                className={styles.canvasArea}
                style={readOnly ? { left: 0, width: '100%' } : {}}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
            >
                {/* Toolbar */}
                {!readOnly && (
                    <div className={styles.toolbar}>
                        <button
                            className={`${styles.toolButton} ${activeTool === 'select' ? styles.active : ''}`}
                            onClick={() => setActiveTool('select')}
                            title="Move Mode"
                        >
                            <Move size={20} />
                        </button>
                        <button
                            className={`${styles.toolButton} ${activeTool === 'connect' ? styles.active : ''}`}
                            onClick={() => setActiveTool('connect')}
                            title="Connect Mode"
                        >
                            <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {activeTool === 'connect' && !readOnly && (
                    <div className={styles.connectModeHint}>
                        {connectingFromId ? 'Select target node' : 'Select starting node'}
                    </div>
                )}

                {/* Nodes */}
                {nodes.map(node => (
                    <div
                        key={node.id}
                        className={`${styles.node} ${selectedNodeId === node.id ? styles.selected : ''}`}
                        style={{ left: node.x, top: node.y }}
                        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    >
                        {getConceptName(node.conceptId)}
                    </div>
                ))}

                {/* Connections SVG Layer */}
                <svg className={styles.svgLayer}>
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-primary)" />
                        </marker>
                    </defs>
                    {renderConnections()}
                    {/* Dragging line */}
                    {activeTool === 'connect' && connectingFromId && draggingNodeId === null && (
                        // If we wanted to draw a line to cursor, we'd need cursor pos in state. 
                        // Skipping for simplicity, just highlighting origin.
                        null
                    )}
                </svg>

                {/* HTML Labels */}
                {renderConnectionLabels()}

                {/* AI Panel */}
                {!readOnly && renderAiPanel()}

                {!readOnly && nodes.length >= 2 && connections.length >= 1 && onComplete && (
                    <motion.button
                        className={styles.completeButton}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => onComplete({ nodes, connections })}
                    >
                        Finished Map
                        <Check size={20} />
                    </motion.button>
                )}
            </div>
        </div>
    );
}
