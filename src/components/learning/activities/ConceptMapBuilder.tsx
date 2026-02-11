/**
 * ConceptMapBuilder Component
 * 
 * Implements SENSA Phase 2: Note.
 * Allows users to create a concept map by dragging concepts and connecting them.
 * 
 * UX Features:
 * - Undo/Redo with history stack (Ctrl+Z, Ctrl+Y)
 * - Node & Connection deletion (hover X, Delete key)
 * - Inline label editor with presets (no browser prompt())
 * - Label length validation (max 25 chars)
 * - Keyboard shortcuts
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 ArrowRight,
 ArrowLeft,
 Move,
 Check,
 Sparkles,
 Lightbulb,
 AlertTriangle,
 Undo2,
 Redo2,
 X,
 LayoutGrid,
 ChevronLeft,
 ChevronRight
} from 'lucide-react';
import type { LearningConcept, ConceptMapData } from '@/shared/types/learning';
import type { DependencyGraph, ValidationResult } from '@/shared/types/sensa-flow';
import {
 suggestConnections,
 detectGaps,
 type ConnectionSuggestion,
 type GapDetection
} from '@/features/learning-session/phases';
import { usePersonalizationStore } from '@/store/personalization-store';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import ConnectionTypeModal, { type ConnectionTypeData } from '@/components/learning/feedback/ConnectionTypeModal';
import styles from './ConceptMapBuilder.module.css';
// ============================================================================
// CONSTANTS
// ============================================================================
const MAX_LABEL_LENGTH = 25;
const LABEL_PRESETS = [
 'requires', 'enables', 'is part of',
 'is type of', 'causes', 'constrains'
];
// ============================================================================
// TYPES
// ============================================================================
interface ConceptMapBuilderProps {
 concepts: LearningConcept[];
 onComplete?: (data: ConceptMapData, validation?: ValidationResult) => void;
 initialData?: ConceptMapData | null;
 readOnly?: boolean;
 /** Optional callback to exit/go back */
 onBack?: () => void;
 // ========== SENSA v2.0 ==========
 /** Optional dependency graph from AI for validation */
 dependencyGraph?: DependencyGraph;
 /** User guesses from Step 2: Explore */
 userGuesses?: Map<string, string>;
 /** Current subject name for dynamic AI stopwords */
 subjectName?: string;
 mode?: 'guided' | 'free';
}
interface MapNode {
 id: string;
 conceptId: string;
 conceptName: string;
 x: number;
 y: number;
}
interface Connection {
 id: string;
 fromId: string;
 toId: string;
 label: string;
}
interface HistoryEntry {
 nodes: MapNode[];
 connections: Connection[];
 addedConceptIds: string[];
}
// ============================================================================
// COMPONENT
// ============================================================================
export default function ConceptMapBuilder({
 concepts,
 onComplete,
 initialData = null,
 readOnly = false,
 onBack,
 dependencyGraph,
 userGuesses,
 subjectName,
 mode: initialMode = 'guided'
}: ConceptMapBuilderProps) {
 // ========== SENSA v2.0 Phase State ==========
 const { isScholarly } = useVisualTheme();
 const [mapMode, setMapMode] = useState<'guided' | 'free'>(initialMode);
 const [mapPhase, setMapPhase] = useState<'build' | 'validate' | 'rebuild'>('build');
 const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
 // Core State - initialize nodes with conceptName fallback for backward compatibility
 const [nodes, setNodes] = useState<MapNode[]>(() => {
 if (!initialData?.nodes) return [];
 return initialData.nodes.map(n => ({
 ...n,
 conceptName: n.conceptName || concepts.find(c => c.id === n.conceptId)?.name || 'Unknown'
 }));
 });
 const [connections, setConnections] = useState<Connection[]>(initialData?.connections || []);
 const [addedConceptIds, setAddedConceptIds] = useState<Set<string>>(
 new Set(initialData?.nodes.map(n => n.conceptId) || [])
 );
 // History for Undo/Redo
 const [history, setHistory] = useState<HistoryEntry[]>([]);
 const [historyIndex, setHistoryIndex] = useState(-1);
 // Tools: 'select' (drag nodes), 'connect' (draw lines)
 const [activeTool, setActiveTool] = useState<'select' | 'connect'>('select');
 // Interaction State
 const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
 const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
 const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
 const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
 // Inline Label Editor State
 const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
 const [labelInput, setLabelInput] = useState('');
 const labelInputRef = useRef<HTMLInputElement>(null);
 // ARCHITECT ENHANCEMENT: Connection Type Validation
 const [pendingConnection, setPendingConnection] = useState<{ fromId: string; toId: string } | null>(null);
 const [showConnectionTypeModal, setShowConnectionTypeModal] = useState(false);
 // Onboarding/Help State
 const [showOnboarding, setShowOnboarding] = useState(true);
 // Refs
 const canvasRef = useRef<HTMLDivElement>(null);
 // AI State
 const { selectedPersona } = usePersonalizationStore();
 const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
 const [detectedGaps, setDetectedGaps] = useState<GapDetection[]>([]);
 // AI panel only shows in guided mode
 const [showAiPanel, setShowAiPanel] = useState(true);
 // Sidebar State
 const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
 // =========================================================================
 // HISTORY MANAGEMENT (Undo/Redo)
 // =========================================================================
 const pushHistory = useCallback(() => {
 const entry: HistoryEntry = {
 nodes: JSON.parse(JSON.stringify(nodes)),
 connections: JSON.parse(JSON.stringify(connections)),
 addedConceptIds: Array.from(addedConceptIds)
 };
 setHistory(prev => [...prev.slice(0, historyIndex + 1), entry]);
 setHistoryIndex(prev => prev + 1);
 }, [nodes, connections, addedConceptIds, historyIndex]);
 const undo = useCallback(() => {
 if (historyIndex < 0) return;
 const entry = history[historyIndex];
 if (entry) {
 setNodes(entry.nodes);
 setConnections(entry.connections);
 setAddedConceptIds(new Set(entry.addedConceptIds));
 setHistoryIndex(prev => prev - 1);
 }
 }, [history, historyIndex]);
 const redo = useCallback(() => {
 if (historyIndex >= history.length - 1) return;
 const entry = history[historyIndex + 2];
 if (entry) {
 setNodes(entry.nodes);
 setConnections(entry.connections);
 setAddedConceptIds(new Set(entry.addedConceptIds));
 setHistoryIndex(prev => prev + 1);
 }
 }, [history, historyIndex]);
 const canUndo = historyIndex >= 0;
 const canRedo = historyIndex < history.length - 1;
 // =========================================================================
 // AUTO-LAYOUT FUNCTION
 // =========================================================================
 const autoLayout = useCallback(() => {
 if (nodes.length === 0) return;
 pushHistory();
 // Get canvas dimensions (or use defaults)
 const canvasWidth = canvasRef.current?.clientWidth || 800;
 const canvasHeight = canvasRef.current?.clientHeight || 600;
 const centerX = canvasWidth / 2;
 const centerY = canvasHeight / 2;
 // Calculate radius based on number of nodes (more nodes = larger radius)
 const baseRadius = Math.min(canvasWidth, canvasHeight) * 0.35;
 const radius = Math.max(baseRadius, nodes.length * 25);
 // Arrange nodes in a circle
 const layoutedNodes = nodes.map((node, index) => {
 const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2; // Start from top
 return {
 ...node,
 x: centerX + radius * Math.cos(angle),
 y: centerY + radius * Math.sin(angle)
 };
 });
 setNodes(layoutedNodes);
 }, [nodes, pushHistory]);
 // =========================================================================
 // KEYBOARD SHORTCUTS
 // =========================================================================
 useEffect(() => {
 if (readOnly) return;
 const handleKeyDown = (e: KeyboardEvent) => {
 // Undo: Ctrl+Z
 if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
 e.preventDefault();
 undo();
 }
 // Redo: Ctrl+Y or Ctrl+Shift+Z
 if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
 e.preventDefault();
 redo();
 }
 // Delete selected node or connection
 if ((e.key === 'Delete' || e.key === 'Backspace') && !editingConnectionId) {
 if (selectedNodeId) {
 e.preventDefault();
 removeNode(selectedNodeId);
 } else if (selectedConnectionId) {
 e.preventDefault();
 removeConnection(selectedConnectionId);
 }
 }
 // Escape: cancel connection mode or close editor
 if (e.key === 'Escape') {
 setConnectingFromId(null);
 setEditingConnectionId(null);
 setSelectedNodeId(null);
 setSelectedConnectionId(null);
 }
 };
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [readOnly, undo, redo, selectedNodeId, selectedConnectionId, editingConnectionId]);
 // =========================================================================
 // NODE & CONNECTION DELETION
 // =========================================================================
 const removeNode = useCallback((nodeId: string) => {
 if (readOnly) return;
 pushHistory();
 setNodes(prev => {
 const node = prev.find(n => n.id === nodeId);
 if (node) {
 setAddedConceptIds(ids => {
 const next = new Set(ids);
 next.delete(node.conceptId);
 return next;
 });
 }
 return prev.filter(n => n.id !== nodeId);
 });
 // Remove any connections to/from this node
 setConnections(prev => prev.filter(c => c.fromId !== nodeId && c.toId !== nodeId));
 setSelectedNodeId(null);
 }, [readOnly, pushHistory]);
 const removeConnection = useCallback((connId: string) => {
 if (readOnly) return;
 pushHistory();
 setConnections(prev => prev.filter(c => c.id !== connId));
 setSelectedConnectionId(null);
 }, [readOnly, pushHistory]);
 // =========================================================================
 // AI ANALYSIS
 // =========================================================================
 const analyzeMap = useCallback(() => {
 // Skip AI analysis in free mode
 if (mapMode === 'free') {
 setSuggestions([]);
 setDetectedGaps([]);
 return;
 }
 if (nodes.length < 2) return;
 const avgConnsPerNode = nodes.length > 0 ? connections.length / nodes.length : 0;
 if (avgConnsPerNode >= 2.5) {
 setSuggestions([]);
 setDetectedGaps([]);
 return;
 }
 const mapConceptIds = new Set(nodes.map(n => n.conceptId));
 const mapConcepts = concepts.filter(c => mapConceptIds.has(c.id));
 const existingConns = connections.map(c => {
 const fromNode = nodes.find(n => n.id === c.fromId);
 const toNode = nodes.find(n => n.id === c.toId);
 return {
 fromId: fromNode?.conceptId || '',
 toId: toNode?.conceptId || ''
 };
 });
 const newSuggestions = suggestConnections(mapConcepts, existingConns, subjectName);
 setSuggestions(newSuggestions.slice(0, 3));
 const gaps = detectGaps(concepts, nodes.map(n => n.conceptId), existingConns, subjectName);
 setDetectedGaps(gaps);
 }, [mapMode, nodes, connections, concepts, subjectName]);
 useEffect(() => {
 const timer = setTimeout(analyzeMap, UI_TIMINGS.MAP_LOAD_DELAY);
 return () => clearTimeout(timer);
 }, [analyzeMap]);
 // =========================================================================
 // CONNECTION & NODE HANDLERS
 // =========================================================================
 const acceptSuggestion = (suggestion: ConnectionSuggestion) => {
 const fromNode = nodes.find(n => n.conceptId === suggestion.fromConceptId);
 const toNode = nodes.find(n => n.conceptId === suggestion.toConceptId);
 if (fromNode && toNode) {
 pushHistory();
 const newConnection: Connection = {
 id: `conn-${Date.now()}`,
 fromId: fromNode.id,
 toId: toNode.id,
 label: suggestion.suggestedLabel
 };
 setConnections(prev => [...prev, newConnection]);
 setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
 }
 };
 const handleAddConcept = (concept: LearningConcept) => {
 if (readOnly || addedConceptIds.has(concept.id)) return;
 pushHistory();
 const newNode: MapNode = {
 id: `node-${Date.now()}`,
 conceptId: concept.id,
 conceptName: concept.name,
 x: 150 + Math.random() * 100,
 y: 150 + Math.random() * 100
 };
 setNodes(prev => [...prev, newNode]);
 setAddedConceptIds(prev => new Set(prev).add(concept.id));
 };
 const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
 e.stopPropagation();
 if (activeTool === 'connect' && !readOnly) {
 if (connectingFromId === null) {
 setConnectingFromId(nodeId);
 } else if (connectingFromId !== nodeId) {
 finishConnection(connectingFromId, nodeId);
 }
 return;
 }
 setSelectedNodeId(nodeId);
 setSelectedConnectionId(null);
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
 const handleCanvasClick = () => {
 setSelectedNodeId(null);
 setSelectedConnectionId(null);
 };
 // ARCHITECT ENHANCEMENT: Show connection type modal before creating
 const finishConnection = (fromId: string, toId: string) => {
 if (readOnly) return;
 const exists = connections.some(c => c.fromId === fromId && c.toId === toId);
 if (exists) {
 setConnectingFromId(null);
 return;
 }
 // Store pending connection and show type selection modal
 setPendingConnection({ fromId, toId });
 setShowConnectionTypeModal(true);
 setConnectingFromId(null);
 };
 const handleConnectionTypeConfirm = (data: ConnectionTypeData) => {
 if (!pendingConnection) return;
 pushHistory();
 const newConnection: Connection = {
 id: `conn-${Date.now()}`,
 fromId: pendingConnection.fromId,
 toId: pendingConnection.toId,
 label: data.customLabel || data.type
 };
 setConnections(prev => [...prev, newConnection]);
 setShowConnectionTypeModal(false);
 setPendingConnection(null);
 };
 const handleConnectionTypeCancel = () => {
 setShowConnectionTypeModal(false);
 setPendingConnection(null);
 };
 // =========================================================================
 // INLINE LABEL EDITOR
 // =========================================================================
 const saveLabel = () => {
 if (editingConnectionId) {
 const trimmedLabel = labelInput.trim().slice(0, MAX_LABEL_LENGTH);
 setConnections(prev => prev.map(c =>
 c.id === editingConnectionId ? { ...c, label: trimmedLabel || '?' } : c
 ));
 }
 setEditingConnectionId(null);
 setLabelInput('');
 };
 const openLabelEditor = (connId: string, currentLabel: string) => {
 if (readOnly) return;
 setEditingConnectionId(connId);
 setLabelInput(currentLabel === '?' ? '' : currentLabel);
 setSelectedConnectionId(connId);
 };
 // Focus input when editor opens
 useEffect(() => {
 if (editingConnectionId && labelInputRef.current) {
 labelInputRef.current.focus();
 }
 }, [editingConnectionId]);
 // =========================================================================
 // HELPERS
 // =========================================================================
 const getConceptName = useCallback((conceptId: string) => {
 // First try to find the concept in the passed array
 const concept = concepts.find(c => c.id === conceptId);
 if (concept) return concept.name;
 // Fallback: check if the node itself has the stored name
 const node = nodes.find(n => n.conceptId === conceptId);
 return node?.conceptName || 'Unknown';
 }, [concepts, nodes]);
 // =========================================================================
 // SENSA v2.0: GUESS VALIDATION
 // =========================================================================
 const validateGuesses = useCallback(() => {
 if (!userGuesses || !dependencyGraph || userGuesses.size === 0) {
 return null;
 }
 const correctPredictions: string[] = [];
 const incorrectPredictions: Array<{
 conceptId: string;
 userGuess: string;
 actualConnection: string;
 }> = [];
 // Find all actual edges from foundation keystone
 const edgeMap = new Map<string, string[]>();
 for (const edge of dependencyGraph.edges) {
 const existing = edgeMap.get(edge.from) || [];
 existing.push(edge.to);
 edgeMap.set(edge.from, existing);
 }
 // Check each user guess
 userGuesses.forEach((guessedTrunkId, rootId) => {
 const actualEdges = edgeMap.get(rootId) || [];
 if (actualEdges.includes(guessedTrunkId)) {
 correctPredictions.push(rootId);
 } else {
 incorrectPredictions.push({
 conceptId: rootId,
 userGuess: getConceptName(guessedTrunkId),
 actualConnection: actualEdges.length > 0
 ? getConceptName(actualEdges[0])
 : 'No direct connection'
 });
 }
 });
 const guessAccuracy = (correctPredictions.length / userGuesses.size) * 100;
 return {
 guessAccuracy,
 correctPredictions,
 incorrectPredictions
 };
 }, [userGuesses, dependencyGraph, getConceptName]);
 // Trigger validation when entering validate phase
 useEffect(() => {
 if (mapPhase === 'validate' && !validationResult) {
 const result = validateGuesses();
 setValidationResult(result);
 }
 }, [mapPhase, validationResult, validateGuesses]);
 const handleFinishMap = useCallback(() => {
 if (mapMode === 'free') {
 onComplete?.({ nodes, connections });
 return;
 }
 if (userGuesses && dependencyGraph) {
 setMapPhase('validate');
 } else {
 onComplete?.({ nodes, connections });
 }
 }, [mapMode, userGuesses, dependencyGraph, nodes, connections, onComplete]);
 const handleCompleteWithValidation = useCallback(() => {
 onComplete?.({ nodes, connections }, validationResult || undefined);
 }, [nodes, connections, onComplete, validationResult]);
 const handleRebuild = useCallback(() => {
 setMapPhase('rebuild');
 setValidationResult(null);
 }, []);
 // =========================================================================
 // RENDER FUNCTIONS
 // =========================================================================
 const renderConnections = () => {
 return connections.map(conn => {
 const startNode = nodes.find(n => n.id === conn.fromId);
 const endNode = nodes.find(n => n.id === conn.toId);
 if (!startNode || !endNode) return null;
 const isSelected = selectedConnectionId === conn.id;
 return (
 <g
 key={conn.id}
 onClick={(e) => {
 e.stopPropagation();
 if (!readOnly) {
 setSelectedConnectionId(conn.id);
 setSelectedNodeId(null);
 }
 }}
 style={{ cursor: readOnly ? 'default' : 'pointer' }}
 >
 <line
 x1={startNode.x}
 y1={startNode.y}
 x2={endNode.x}
 y2={endNode.y}
 stroke={isSelected ? 'var(--color-accent-alt)' : 'var(--color-accent-light)'}
 strokeWidth={isSelected ? 3 : 2}
 markerEnd="url(#arrowhead)"
 />
 </g>
 );
 });
 };
 const renderConnectionLabels = () => {
 return connections.map(conn => {
 const startNode = nodes.find(n => n.id === conn.fromId);
 const endNode = nodes.find(n => n.id === conn.toId);
 if (!startNode || !endNode) return null;
 const midX = (startNode.x + endNode.x) / 2;
 const midY = (startNode.y + endNode.y) / 2;
 const isEditing = editingConnectionId === conn.id;
 const isSelected = selectedConnectionId === conn.id;
 return (
 <div
 key={`label-${conn.id}`}
 className={`${styles.connectionLabel} ${isSelected ? styles.selectedConnection : ''}`}
 style={{ left: midX, top: midY }}
 onClick={(e) => {
 e.stopPropagation();
 if (!isEditing) {
 openLabelEditor(conn.id, conn.label);
 }
 }}
 >
 {isEditing ? (
 <div className={styles.labelEditor} onClick={e => e.stopPropagation()}>
 <input
 ref={labelInputRef}
 value={labelInput}
 onChange={e => setLabelInput(e.target.value.slice(0, MAX_LABEL_LENGTH))}
 maxLength={MAX_LABEL_LENGTH}
 placeholder="e.g., causes"
 onKeyDown={e => {
 if (e.key === 'Enter') saveLabel();
 if (e.key === 'Escape') setEditingConnectionId(null);
 }}
 />
 <div className={styles.labelEditorActions}>
 <button onClick={saveLabel} className={styles.saveButton}>
 <Check size={14} />
 </button>
 <button onClick={() => setEditingConnectionId(null)} className={styles.cancelButton}>
 <X size={14} />
 </button>
 </div>
 <div className={styles.charCounter}>
 {labelInput.length}/{MAX_LABEL_LENGTH}
 </div>
 <div className={styles.presetChips}>
 {LABEL_PRESETS.map(preset => (
 <button
 key={preset}
 className={styles.presetChip}
 onClick={() => setLabelInput(preset)}
 >
 {preset}
 </button>
 ))}
 </div>
 </div>
 ) : (
 <>
 <span>{conn.label || '?'}</span>
 {!readOnly && (
 <button
 className={styles.deleteConnectionButton}
 onClick={(e) => {
 e.stopPropagation();
 removeConnection(conn.id);
 }}
 title="Delete connection"
 >
 <X size={12} />
 </button>
 )}
 </>
 )}
 </div>
 );
 });
 };
 const renderAiPanel = () => {
 // AI panel only shows in guided mode
 if (mapMode === 'free' || !showAiPanel || (suggestions.length === 0 && detectedGaps.length === 0)) return null;
 return (
 <div className={styles.aiPanel}>
 <div className={styles.aiPanelHeader}>
 <Sparkles size={14} />
 <span>Coach {selectedPersona === 'goggins' ? 'Insights' : 'Suggestions'}</span>
 <button
 onClick={() => setShowAiPanel(false)}
 className={styles.aiPanelClose}
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
 // =========================================================================
 // SENSA v2.0: VALIDATION PANEL
 // =========================================================================
 const renderValidationPanel = () => {
 if (mapPhase !== 'validate' || !validationResult) return null;
 return (
 <motion.div
 className={styles.validationPanel}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 >
 <div className={styles.validationHeader}>
 <Sparkles size={20} />
 <h3>Prediction Check</h3>
 </div>
 <div className={styles.validationScore}>
 <span className={styles.scoreLabel}>Accuracy</span>
 <span className={styles.scoreValue}>
 {Math.round(validationResult.guessAccuracy)}%
 </span>
 </div>
 {validationResult.correctPredictions.length > 0 && (
 <div className={styles.validationCorrect}>
 <Check size={14} />
 <span>{validationResult.correctPredictions.length} correct predictions!</span>
 </div>
 )}
 {validationResult.incorrectPredictions.length > 0 && (
 <div className={styles.validationIncorrect}>
 <AlertTriangle size={14} />
 <div>
 <strong>{validationResult.incorrectPredictions.length} to review:</strong>
 {validationResult.incorrectPredictions.slice(0, 3).map((err, idx) => (
 <div key={idx} className={styles.incorrectItem}>
 • You guessed &quot;{err.userGuess}&quot;, actual: &quot;{err.actualConnection}&quot;
 </div>
 ))}
 </div>
 </div>
 )}
 <div className={styles.validationActions}>
 <button onClick={handleRebuild} className={styles.rebuildButton}>
 Rebuild Map
 </button>
 <button onClick={handleCompleteWithValidation} className={styles.continueButton}>
 Continue Study
 <ArrowRight size={16} />
 </button>
 </div>
 </motion.div>
 );
 };
 // =========================================================================
 // PHASE HEADER
 // =========================================================================
 const renderPhaseHeader = () => {
 if (readOnly) return null;
 const minNodesRequired = 2;
 const minConnectionsRequired = 1;
 const nodesComplete = nodes.length >= minNodesRequired;
 const connectionsComplete = connections.length >= minConnectionsRequired;
 const canComplete = nodesComplete && connectionsComplete;
 return (
 <div className={styles.phaseHeader}>
 <div className={styles.phaseHeaderContent}>
 <div className={styles.phaseInfo}>
 <h1 className={styles.phaseTitle}>Step 3: Note - Build Your Concept Map</h1>
 <p className={styles.phaseDescription}>
 {mapMode === 'guided' 
 ? 'Connect concepts to show relationships. AI coach will provide suggestions and validate your work.'
 : 'Free exploration mode - build your map without AI guidance or validation.'}
 </p>
 </div>
 <div className={styles.phaseProgress}>
 <div className={styles.progressItem}>
 <span className={styles.progressLabel}>Phase Progress</span>
 <span className={styles.progressValue}>3 of 6</span>
 </div>
 </div>
 </div>
 <div className={styles.completionRequirements}>
 <div className={`${styles.requirement} ${nodesComplete ? styles.requirementComplete : ''}`}>
 <span className={styles.requirementIcon}>{nodesComplete ? '' : ''}</span>
 <span className={styles.requirementText}>
 Add {minNodesRequired}+ concepts ({nodes.length}/{minNodesRequired})
 </span>
 </div>
 <div className={`${styles.requirement} ${connectionsComplete ? styles.requirementComplete : ''}`}>
 <span className={styles.requirementIcon}>{connectionsComplete ? '' : ''}</span>
 <span className={styles.requirementText}>
 Create {minConnectionsRequired}+ connection{minConnectionsRequired > 1 ? 's' : ''} ({connections.length}/{minConnectionsRequired})
 </span>
 </div>
 {canComplete && (
 <div className={styles.requirementSuccess}>
 <Check size={14} />
 <span>Ready to continue!</span>
 </div>
 )}
 </div>
 </div>
 );
 };
 // =========================================================================
 // ONBOARDING TOAST
 // =========================================================================
 const renderOnboardingToast = () => {
 if (readOnly || !showOnboarding || nodes.length > 0) return null;
 return (
 <motion.div
 className={styles.onboardingToast}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 >
 <div className={styles.onboardingHeader}>
 <Lightbulb size={20} className={styles.onboardingIcon} />
 <h3>Getting Started with Concept Mapping</h3>
 <button
 onClick={() => setShowOnboarding(false)}
 className={styles.onboardingClose}
 title="Close instructions"
 >
 <X size={16} />
 </button>
 </div>
 <div className={styles.onboardingContent}>
 <ol className={styles.onboardingSteps}>
 <li>
 <strong>Add Concepts:</strong> Click any concept in the left sidebar to place it on the canvas
 </li>
 <li>
 <strong>Position Nodes:</strong> Use the <Move size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Move tool to drag and arrange nodes
 </li>
 <li>
 <strong>Create Links:</strong> Use the <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Connect tool to draw relationships between concepts
 </li>
 <li>
 <strong>Label Connections:</strong> Click a connection to add a relationship label (e.g., "causes", "enables")
 </li>
 <li>
 <strong>Complete:</strong> Add at least 2 concepts and 1 connection to finish this phase
 </li>
 </ol>
 <button
 onClick={() => setShowOnboarding(false)}
 className={styles.onboardingButton}
 >
 Got it, let's start!
 </button>
 </div>
 </motion.div>
 );
 };
 // =========================================================================
 // MAIN RENDER
 // =========================================================================
 return (
 <div className={styles.container}>
 {/* Phase Header */}
 {renderPhaseHeader()}
 {/* Map Builder Content (Sidebar + Canvas) */}
 <div className={styles.mapBuilderContent}>
 {/* Sidebar with Visual Bucket Zones */}
 {!readOnly && (
 <div className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
 {/* Collapse Toggle Button */}
 <button
 className={styles.sidebarToggle}
 onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
 title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
 >
 {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
 </button>
 {/* Header - only show when expanded */}
 {!sidebarCollapsed && (
 <div className={styles.sidebarHeader}>
 <h3 className={styles.sidebarTitle}>Concepts by Tier</h3>
 <p className={styles.sidebarHint}>Click to add to canvas</p>
 </div>
 )}
 {/* Bucket Zones - only show when expanded */}
 {!sidebarCollapsed && (
 <>
 <div className={styles.bucketZone}>
 <div className={`${styles.bucketHeader} ${styles.bucketRoot}`}>
 {!isScholarly && <span className={styles.bucketIcon}></span>}
 <span>Trunk</span>
 <span className={styles.bucketCount}>
 {concepts.filter(c => (c.tier || c.mnemonic?.tier || '').toLowerCase() === 'trunk').length}
 </span>
 </div>
 <div className={styles.bucketConcepts}>
 {concepts
 .filter(c => (c.tier || c.mnemonic?.tier || '').toLowerCase() === 'trunk')
 .map(c => (
 <div
 key={c.id}
 className={`${styles.sidebarItem} ${styles.rootItem} ${addedConceptIds.has(c.id) ? styles.added : ''}`}
 onClick={() => handleAddConcept(c)}
 >
 {c.name}
 {addedConceptIds.has(c.id) && <Check size={14} className={styles.addedCheck} />}
 </div>
 ))}
 </div>
 </div>
 <div className={styles.bucketZone}>
 <div className={`${styles.bucketHeader} ${styles.bucketTrunk}`}>
 {!isScholarly && <span className={styles.bucketIcon}></span>}
 <span>Branch</span>
 <span className={styles.bucketCount}>
 {concepts.filter(c => (c.tier || c.mnemonic?.tier || '').toLowerCase() === 'branch').length}
 </span>
 </div>
 <div className={styles.bucketConcepts}>
 {concepts
 .filter(c => (c.tier || c.mnemonic?.tier || '').toLowerCase() === 'branch')
 .map(c => (
 <div
 key={c.id}
 className={`${styles.sidebarItem} ${styles.trunkItem} ${addedConceptIds.has(c.id) ? styles.added : ''}`}
 onClick={() => handleAddConcept(c)}
 >
 {c.name}
 {addedConceptIds.has(c.id) && <Check size={14} className={styles.addedCheck} />}
 </div>
 ))}
 </div>
 </div>
 <div className={styles.bucketZone}>
 <div className={`${styles.bucketHeader} ${styles.bucketLeaf}`}>
 {!isScholarly && <span className={styles.bucketIcon}></span>}
 <span>Leaf</span>
 <span className={styles.bucketCount}>
 {concepts.filter(c => {
 const t = (c.tier || c.mnemonic?.tier || '').toLowerCase();
 return t !== 'trunk' && t !== 'branch';
 }).length}
 </span>
 </div>
 <div className={styles.bucketConcepts}>
 {concepts
 .filter(c => {
 const t = (c.tier || c.mnemonic?.tier || '').toLowerCase();
 return t !== 'trunk' && t !== 'branch';
 })
 .map(c => (
 <div
 key={c.id}
 className={`${styles.sidebarItem} ${styles.leafItem} ${addedConceptIds.has(c.id) ? styles.added : ''}`}
 onClick={() => handleAddConcept(c)}
 >
 {c.name}
 {addedConceptIds.has(c.id) && <Check size={14} className={styles.addedCheck} />}
 </div>
 ))}
 </div>
 </div>
 </>
 )}
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
 onClick={handleCanvasClick}
 >
 {/* Toolbar */}
 {!readOnly && (
 <div className={styles.toolbar}>
 {onBack && (
 <button
 className={styles.toolButton}
 onClick={onBack}
 title="Go back / Exit"
 >
 <ArrowLeft size={20} />
 </button>
 )}
 {onBack && <div className={styles.toolbarDivider} />}
 <button
 className={`${styles.toolButton} ${activeTool === 'select' ? styles.active : ''}`}
 onClick={() => setActiveTool('select')}
 title="Move Mode (drag nodes)"
 >
 <Move size={20} />
 </button>
 <button
 className={`${styles.toolButton} ${activeTool === 'connect' ? styles.active : ''}`}
 onClick={() => setActiveTool('connect')}
 title="Connect Mode (draw lines)"
 >
 <ArrowRight size={20} />
 </button>
 <div className={styles.toolbarDivider} />
 <button
 className={`${styles.toolButton} ${!canUndo ? styles.disabled : ''}`}
 onClick={undo}
 disabled={!canUndo}
 title="Undo (Ctrl+Z)"
 >
 <Undo2 size={20} />
 </button>
 <button
 className={`${styles.toolButton} ${!canRedo ? styles.disabled : ''}`}
 onClick={redo}
 disabled={!canRedo}
 title="Redo (Ctrl+Y)"
 >
 <Redo2 size={20} />
 </button>
 <div className={styles.toolbarDivider} />
 <button
 className={styles.toolButton}
 onClick={autoLayout}
 title="Auto-layout nodes"
 >
 <LayoutGrid size={20} />
 </button>
 <div className={styles.toolbarDivider} />
 <button
 className={`${styles.toolButton} ${styles.modeToggle} ${mapMode === 'free' ? styles.freeModeActive : ''}`}
 onClick={() => setMapMode(m => m === 'guided' ? 'free' : 'guided')}
 title={mapMode === 'guided' 
 ? 'Switch to Free mode (no AI suggestions or validation)' 
 : 'Switch to Guided mode (AI suggestions and validation)'}
 >
 <span className={styles.modeLabel}>
 {isScholarly
 ? (mapMode === 'guided' ? 'Guided' : 'Free')
 : (mapMode === 'guided' ? ' Guided' : ' Free')}
 </span>
 </button>
 </div>
 )}
 {/* Connect Mode Hint */}
 <AnimatePresence>
 {activeTool === 'connect' && !readOnly && (
 <motion.div
 className={styles.connectModeHint}
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 >
 {isScholarly
 ? (connectingFromId ? 'Click target node' : 'Click starting node')
 : (connectingFromId ? ' Click target node' : ' Click starting node')}
 </motion.div>
 )}
 </AnimatePresence>
 {/* Nodes */}
 {nodes.map(node => (
 <div
 key={node.id}
 className={`${styles.node} ${selectedNodeId === node.id ? styles.selected : ''}`}
 style={{ left: node.x, top: node.y }}
 onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
 >
 {getConceptName(node.conceptId)}
 {!readOnly && (
 <button
 className={styles.deleteNodeButton}
 onClick={(e) => {
 e.stopPropagation();
 removeNode(node.id);
 }}
 title="Delete node (Delete key)"
 >
 <X size={12} />
 </button>
 )}
 </div>
 ))}
 {/* Connections SVG Layer */}
 <svg className={styles.svgLayer}>
 <defs>
 <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
 <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-accent-light)" />
 </marker>
 </defs>
 {renderConnections()}
 </svg>
 {/* HTML Labels */}
 {renderConnectionLabels()}
 {/* AI Panel */}
 {!readOnly && renderAiPanel()}
 {/* Onboarding Toast */}
 <AnimatePresence>
 {renderOnboardingToast()}
 </AnimatePresence>
 {/* Complete Button */}
 {!readOnly && mapPhase === 'build' && nodes.length >= 2 && connections.length >= 1 && onComplete && (
 <motion.button
 className={styles.completeButton}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 onClick={handleFinishMap}
 >
 {userGuesses ? 'Check Predictions ' : 'Finished Map'}
 <Check size={20} />
 </motion.button>
 )}
 {/* Validation Panel */}
 {renderValidationPanel()}
 </div>
 {/* End Map Builder Content */}
 </div>
 {/* ARCHITECT ENHANCEMENT: Connection Type Modal */}
 <AnimatePresence>
 {showConnectionTypeModal && pendingConnection && (
 <ConnectionTypeModal
 fromConcept={getConceptName(pendingConnection.fromId)}
 toConcept={getConceptName(pendingConnection.toId)}
 onConfirm={handleConnectionTypeConfirm}
 onCancel={handleConnectionTypeCancel}
 />
 )}
 </AnimatePresence>
 </div>
 );
}
