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
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 ArrowRight,
 ArrowLeft,
 Move,
 Group,
 Check,
 Sparkles,
 Lightbulb,
 AlertTriangle,
 Undo2,
 Redo2,
 X,
 LayoutGrid,
 ChevronLeft,
 ChevronRight,
 ChevronDown,
 ZoomIn,
 ZoomOut,
 Maximize,
 Minimize,
 LocateFixed
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
import { useLearningStore } from '@/store/learning-store';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import { useActivityAutosave } from '@/shared/hooks/useActivityAutosave';
import { STORAGE_KEYS } from '@/shared/constants/storage-keys';
import ConnectionTypeModal, { type ConnectionTypeData } from '@/components/learning/feedback/ConnectionTypeModal';
import styles from './ConceptMapBuilder.module.css';
// ============================================================================
// CONSTANTS
// ============================================================================
const MAX_LABEL_LENGTH = 25;
const LABEL_PRESETS = [
 'requires', 'enables', 'is-part-of',
 'is-type-of', 'causes', 'constrains'
];
const RELATIONSHIP_LEGEND = [
 { id: 'requires', label: 'Requires', meaning: 'Need this first', example: 'Learn ladder safety before climbing the treehouse.' },
 { id: 'enables', label: 'Enables', meaning: 'Unlocks what you can do next', example: 'Having the key lets you open the treehouse door.' },
 { id: 'is-part-of', label: 'Is Part Of', meaning: 'A piece of something bigger', example: 'The ladder is part of the treehouse.' },
 { id: 'is-type-of', label: 'Is Type Of', meaning: 'A kind of a bigger group', example: 'An apple treehouse is a type of treehouse.' },
 { id: 'causes', label: 'Causes', meaning: 'Makes something happen', example: 'Pressing the bell makes the club alarm ring.' },
 { id: 'constrains', label: 'Constrains', meaning: 'Sets rules or limits', example: 'Club rules limit which games can be played.' }
];
const normalizeConnectionLabel = (label: string): string => {
 const normalized = label.toLowerCase().trim();
 if (normalized === 'is part of' || normalized === 'is_part_of' || normalized === 'part of') return 'is-part-of';
 if (normalized === 'is type of' || normalized === 'is_type_of' || normalized === 'type of') return 'is-type-of';
 if (normalized === 'depends-on' || normalized === 'depends_on' || normalized === 'prerequisite') return 'requires';
 if (normalized === 'related-to' || normalized === 'related to' || normalized === 'relates') return 'enables';
 if (normalized === 'requires' || normalized === 'enables' || normalized === 'is-part-of' || normalized === 'is-type-of' || normalized === 'causes' || normalized === 'constrains') {
 return normalized;
 }
 return label.trim();
};
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
 focusConcept?: string;
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
 mode: initialMode = 'guided',
 focusConcept,
}: ConceptMapBuilderProps) {
 // ========== SENSA v2.0 Phase State ==========
 const { isScholarly } = useVisualTheme();
 const sessionId = useLearningStore(s => s.currentSession?.id) || 'unknown';
 const [mapMode, setMapMode] = useState<'guided' | 'free'>(initialMode);
 const [mapPhase, setMapPhase] = useState<'build' | 'validate' | 'rebuild'>('build');
 const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

 // ========== AUTOSAVE: Restore draft or initialData ==========
 const { saveDraft, clearDraft, loadDraft } = useActivityAutosave<ConceptMapData>({
  storageKey: STORAGE_KEYS.DRAFT_CONCEPT_MAP,
  sessionId,
 });
 const restoredData = useRef<ConceptMapData | null>(null);
 if (restoredData.current === null) {
  // Priority: explicit initialData > saved draft > empty
  restoredData.current = initialData || loadDraft() || { nodes: [], connections: [] };
 }
 const seedData = restoredData.current;

 // Core State - initialize nodes with conceptName fallback for backward compatibility
 const [nodes, setNodes] = useState<MapNode[]>(() => {
 if (!seedData?.nodes?.length) return [];
 return seedData.nodes.map(n => ({
 ...n,
 conceptName: n.conceptName || concepts.find(c => c.id === n.conceptId)?.name || 'Unknown'
 }));
 });
 const [connections, setConnections] = useState<Connection[]>(
 (seedData?.connections || []).map((conn) => ({
 ...conn,
 label: normalizeConnectionLabel(conn.label)
 }))
 );
 const [addedConceptIds, setAddedConceptIds] = useState<Set<string>>(
 new Set(seedData?.nodes?.map(n => n.conceptId) || [])
 );
 // History for Undo/Redo
 const [history, setHistory] = useState<HistoryEntry[]>([]);
 const [historyIndex, setHistoryIndex] = useState(-1);
 // Tools: 'select' (drag nodes/groups), 'connect' (draw lines)
 const [activeTool, setActiveTool] = useState<'select' | 'connect'>('select');
 const [groupDrag, setGroupDrag] = useState(false);
 // Interaction State
 const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
 const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
 const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
 const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
 const [draggingGroupTier, setDraggingGroupTier] = useState<string | null>(null);
 const dragLastPosRef = useRef<{ x: number; y: number } | null>(null);
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
 // Legend State
 const [legendCollapsed, setLegendCollapsed] = useState(true);
 // Canvas Pan/Zoom State
 const [zoom, setZoom] = useState(1);
 const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
 const [isPanning, setIsPanning] = useState(false);
 const panStartRef = useRef({ x: 0, y: 0 });
 const panOffsetStartRef = useRef({ x: 0, y: 0 });
 // Fullscreen State
 const [isFullscreen, setIsFullscreen] = useState(false);
 // Node Info Popover State
 const [inspectedNodeId, setInspectedNodeId] = useState<string | null>(null);
 // Space-drag panning state
 const [spaceHeld, setSpaceHeld] = useState(false);
 // Shortcuts help overlay
 const [showShortcuts, setShowShortcuts] = useState(false);
 // =========================================================================
 // AUTOSAVE: Persist draft whenever nodes or connections change
 // =========================================================================
 useEffect(() => {
  if (nodes.length > 0 || connections.length > 0) {
  saveDraft({ nodes, connections });
  }
 }, [nodes, connections, saveDraft]);

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

 useEffect(() => {
  if (!focusConcept) return;
  const concept = concepts.find(c => c.name === focusConcept);
  if (!concept || addedConceptIds.has(concept.id)) return;
  handleAddConcept(concept);
 }, [focusConcept]);

 // ========== AUTOSAVE: Persist draft on every meaningful change ==========
 useEffect(() => {
  if (nodes.length === 0 && connections.length === 0) return;
  saveDraft({ nodes, connections });
 }, [nodes, connections, saveDraft]);
 // =========================================================================
 // AUTO-LAYOUT FUNCTION
 // =========================================================================
 const NODE_HEIGHT = 40;
 const NODE_H_PAD = 32;
 const MIN_GAP = 60;

 const estimateNodeWidth = useCallback((node: MapNode): number => {
 const concept = concepts.find(c => c.id === node.conceptId);
 const name = concept?.name || node.conceptName || 'Unknown';
 return Math.max(120, name.length * 9 + NODE_H_PAD);
 }, [concepts]);

 const getParentGroup = useCallback((node: MapNode): string => {
 const c = concepts.find(cc => cc.id === node.conceptId);
 if (!c) return 'ungrouped';
 const tier = (c.tier || c.mnemonic?.tier || 'leaf').toLowerCase();
 if (tier === 'trunk') return 'trunk';
 if (tier === 'branch') return c.trunkDomain || c.parentName || 'ungrouped';
 return c.parentName || c.trunkDomain || 'ungrouped';
 }, [concepts]);

 const resolveCollisions = useCallback((laid: MapNode[], iterations: number = 30): MapNode[] => {
 const result = laid.map(n => ({ ...n }));
 const widths = result.map(n => estimateNodeWidth(n));
 for (let iter = 0; iter < iterations; iter++) {
 let moved = false;
 for (let i = 0; i < result.length; i++) {
 for (let j = i + 1; j < result.length; j++) {
 const a = result[i];
 const b = result[j];
 const wA = widths[i] / 2;
 const wB = widths[j] / 2;
 const hA = NODE_HEIGHT / 2;
 const hB = NODE_HEIGHT / 2;
 const minDistX = wA + wB + MIN_GAP;
 const minDistY = hA + hB + MIN_GAP * 0.6;
 const dx = b.x - a.x;
 const dy = b.y - a.y;
 const overlapX = minDistX - Math.abs(dx);
 const overlapY = minDistY - Math.abs(dy);
 if (overlapX > 0 && overlapY > 0) {
 moved = true;
 if (overlapX < overlapY) {
 const pushX = overlapX / 2 + 1;
 const signX = dx >= 0 ? 1 : -1;
 a.x -= signX * pushX;
 b.x += signX * pushX;
 } else {
 const pushY = overlapY / 2 + 1;
 const signY = dy >= 0 ? 1 : -1;
 a.y -= signY * pushY;
 b.y += signY * pushY;
 }
 }
 }
 }
 if (!moved) break;
 }
 return result.map(n => ({
 ...n,
 x: Math.round(n.x / 20) * 20,
 y: Math.round(n.y / 20) * 20
 }));
 }, [estimateNodeWidth]);

 const layoutTierRows = useCallback((
 tierNodes: MapNode[],
 centerX: number,
 startY: number,
 maxWidth: number
 ): { laid: MapNode[]; height: number } => {
 if (tierNodes.length === 0) return { laid: [], height: 0 };
 const sorted = [...tierNodes].sort((a, b) => estimateNodeWidth(b) - estimateNodeWidth(a));
 const rows: MapNode[][] = [];
 const rowWidths: number[] = [];
 const ROW_GAP = NODE_HEIGHT + MIN_GAP * 0.6;
 for (const node of sorted) {
 const nw = estimateNodeWidth(node) + MIN_GAP;
 let placed = false;
 for (let r = 0; r < rows.length; r++) {
 if (rowWidths[r] + nw <= maxWidth) {
 rows[r].push(node);
 rowWidths[r] += nw;
 placed = true;
 break;
 }
 }
 if (!placed) {
 rows.push([node]);
 rowWidths.push(nw);
 }
 }
 const laid: MapNode[] = [];
 let curY = startY;
 for (const row of rows) {
 const totalRowW = row.reduce((s, n) => s + estimateNodeWidth(n) + MIN_GAP, 0) - MIN_GAP;
 let curX = centerX - totalRowW / 2;
 for (const node of row) {
 const nw = estimateNodeWidth(node);
 laid.push({ ...node, x: Math.round((curX + nw / 2) / 20) * 20, y: Math.round(curY / 20) * 20 });
 curX += nw + MIN_GAP;
 }
 curY += ROW_GAP;
 }
 return { laid, height: Math.max(ROW_GAP, curY - startY) };
 }, [estimateNodeWidth]);

 const autoLayout = useCallback(() => {
 if (nodes.length === 0) return;
 pushHistory();
 const canvasW = canvasRef.current?.clientWidth || 800;
 const maxWidth = Math.max(600, canvasW * 2);
 const cx = canvasW / 2;
 const trunks: MapNode[] = [];
 const branches: MapNode[] = [];
 const leaves: MapNode[] = [];
 for (const n of nodes) {
 const c = concepts.find(cc => cc.id === n.conceptId);
 const tier = (c?.tier || c?.mnemonic?.tier || 'leaf').toLowerCase();
 if (tier === 'trunk') trunks.push(n);
 else if (tier === 'branch') branches.push(n);
 else leaves.push(n);
 }
 const TIER_GAP = 100;
 let currentY = 100;
 let laid: MapNode[] = [];
 for (const group of [trunks, branches, leaves]) {
 if (group.length === 0) continue;
 const result = layoutTierRows(group, cx, currentY, maxWidth);
 laid.push(...result.laid);
 currentY += result.height + TIER_GAP;
 }
 laid = resolveCollisions(laid);
 setNodes(laid);
 requestAnimationFrame(() => {
 if (laid.length === 0) return;
 const rect = canvasRef.current?.getBoundingClientRect();
 if (!rect) return;
 const widths = laid.map(n => estimateNodeWidth(n));
 const minX = Math.min(...laid.map((n, i) => n.x - widths[i] / 2)) - 60;
 const maxX = Math.max(...laid.map((n, i) => n.x + widths[i] / 2)) + 60;
 const minY = Math.min(...laid.map(n => n.y)) - 60;
 const maxY = Math.max(...laid.map(n => n.y)) + 60;
 const contentW = maxX - minX;
 const contentH = maxY - minY;
 const newZoom = Math.min(1.5, Math.max(0.2, Math.min(rect.width / contentW, rect.height / contentH) * 0.9));
 setPanOffset({
 x: (rect.width - contentW * newZoom) / 2 - minX * newZoom,
 y: (rect.height - contentH * newZoom) / 2 - minY * newZoom
 });
 setZoom(newZoom);
 });
 }, [nodes, concepts, pushHistory, layoutTierRows, resolveCollisions, estimateNodeWidth]);
 // =========================================================================
 // KEYBOARD SHORTCUTS
 // =========================================================================
 useEffect(() => {
 if (readOnly) return;
 const handleKeyDown = (e: KeyboardEvent) => {
 const tag = (e.target as HTMLElement)?.tagName;
 const isInput = tag === 'INPUT' || tag === 'TEXTAREA';
 if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
 e.preventDefault();
 undo();
 }
 if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
 e.preventDefault();
 redo();
 }
 if ((e.key === 'Delete' || e.key === 'Backspace') && !editingConnectionId && !isInput) {
 if (selectedNodeId) {
 e.preventDefault();
 removeNode(selectedNodeId);
 } else if (selectedConnectionId) {
 e.preventDefault();
 removeConnection(selectedConnectionId);
 }
 }
 if (e.key === 'Escape') {
 if (showShortcuts) {
 setShowShortcuts(false);
 } else if (isFullscreen) {
 setIsFullscreen(false);
 } else if (inspectedNodeId) {
 setInspectedNodeId(null);
 } else {
 setConnectingFromId(null);
 setEditingConnectionId(null);
 setSelectedNodeId(null);
 setSelectedConnectionId(null);
 }
 }
 if (e.key === ' ' && !isInput) {
 e.preventDefault();
 setSpaceHeld(true);
 }
 if ((e.key === '=' || e.key === '+') && !e.ctrlKey && !isInput) {
 handleZoomIn();
 }
 if ((e.key === '-' || e.key === '_') && !e.ctrlKey && !isInput) {
 handleZoomOut();
 }
 if (e.ctrlKey && e.key === '0') {
 e.preventDefault();
 setZoom(1);
 setPanOffset({ x: 0, y: 0 });
 }
 if (e.ctrlKey && e.key === '1') {
 e.preventDefault();
 handleFitToView();
 }
 if (e.key === '?' && !isInput) {
 setShowShortcuts(prev => !prev);
 }
 };
 const handleKeyUp = (e: KeyboardEvent) => {
 if (e.key === ' ') {
 setSpaceHeld(false);
 }
 };
 window.addEventListener('keydown', handleKeyDown);
 window.addEventListener('keyup', handleKeyUp);
 return () => {
 window.removeEventListener('keydown', handleKeyDown);
 window.removeEventListener('keyup', handleKeyUp);
 };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [readOnly, undo, redo, selectedNodeId, selectedConnectionId, editingConnectionId, isFullscreen, showShortcuts, inspectedNodeId]);
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
 label: normalizeConnectionLabel(suggestion.suggestedLabel)
 };
 setConnections(prev => [...prev, newConnection]);
 setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
 }
 };
 const GRID_SIZE = 20;
 const snapToGrid = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;
 const findOpenPosition = useCallback((tier: string, allNodes: MapNode[], newNode: MapNode): { x: number; y: number } => {
 const canvasW = canvasRef.current?.clientWidth || 800;
 const canvasH = canvasRef.current?.clientHeight || 600;
 const cx = (canvasW / 2 - panOffset.x) / zoom;
 const tiers = ['trunk', 'branch', 'leaf'];
 const tierIdx = tiers.indexOf(tier);
 const baseY = (canvasH * 0.2 - panOffset.y) / zoom + tierIdx * 200;
 const newW = estimateNodeWidth(newNode);
 const tierNodes = allNodes.filter(n => {
 if (n.id === newNode.id) return false;
 const c = concepts.find(cc => cc.id === n.conceptId);
 return (c?.tier || c?.mnemonic?.tier || 'leaf').toLowerCase() === tier;
 });
 if (tierNodes.length === 0) return { x: cx, y: baseY };
 const avgX = tierNodes.reduce((s, n) => s + n.x, 0) / tierNodes.length;
 const avgY = tierNodes.reduce((s, n) => s + n.y, 0) / tierNodes.length;
 const angles = [0, Math.PI, Math.PI / 2, -Math.PI / 2, Math.PI / 4, -Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4];
 for (let dist = newW + MIN_GAP; dist < 2000; dist += 80) {
 for (const angle of angles) {
 const testX = avgX + dist * Math.cos(angle);
 const testY = avgY + dist * Math.sin(angle);
 let collides = false;
 for (const existing of allNodes) {
 if (existing.id === newNode.id) continue;
 const ew = estimateNodeWidth(existing);
 const minDx = (newW + ew) / 2 + MIN_GAP;
 const minDy = NODE_HEIGHT + MIN_GAP * 0.5;
 if (Math.abs(testX - existing.x) < minDx && Math.abs(testY - existing.y) < minDy) {
 collides = true;
 break;
 }
 }
 if (!collides) return { x: snapToGrid(testX), y: snapToGrid(testY) };
 }
 }
 return { x: cx + (tierNodes.length * 150), y: baseY };
 }, [concepts, panOffset, zoom, estimateNodeWidth]);
 const createLogicalConnections = useCallback((allNodes: MapNode[], existingConns: Connection[]): Connection[] => {
 const newConns: Connection[] = [];
 const existingKeys = new Set(existingConns.map(c => `${c.fromId}->${c.toId}`));
 const nodeByConceptId = new Map(allNodes.map(n => [n.conceptId, n]));
 let connIdx = 0;
 if (dependencyGraph?.edges) {
 for (const edge of dependencyGraph.edges) {
 const fromNode = nodeByConceptId.get(edge.from);
 const toNode = nodeByConceptId.get(edge.to);
 if (!fromNode || !toNode) continue;
 const key = `${fromNode.id}->${toNode.id}`;
 const reverseKey = `${toNode.id}->${fromNode.id}`;
 if (existingKeys.has(key) || existingKeys.has(reverseKey)) continue;
 const label = edge.type === 'prerequisite' ? 'requires' : edge.type === 'optional' ? 'enables' : 'enables';
 newConns.push({
 id: `conn-${Date.now()}-${connIdx++}-${edge.from}-${edge.to}`,
 fromId: fromNode.id,
 toId: toNode.id,
 label
 });
 existingKeys.add(key);
 }
 }
 for (const concept of concepts) {
 const sourceNode = nodeByConceptId.get(concept.id);
 if (!sourceNode) continue;
 if (concept.connections) {
 for (const conn of concept.connections) {
 const targetNode = nodeByConceptId.get(conn.target);
 if (!targetNode) continue;
 const key = `${sourceNode.id}->${targetNode.id}`;
 const reverseKey = `${targetNode.id}->${sourceNode.id}`;
 if (existingKeys.has(key) || existingKeys.has(reverseKey)) continue;
 newConns.push({
 id: `conn-${Date.now()}-${connIdx++}-${concept.id}-${conn.target}`,
 fromId: sourceNode.id,
 toId: targetNode.id,
 label: conn.type
 });
 existingKeys.add(key);
 }
 }
 if (concept.dependencies?.length) {
 for (const depId of concept.dependencies) {
 const depNode = nodeByConceptId.get(depId);
 if (!depNode) continue;
 const key = `${sourceNode.id}->${depNode.id}`;
 const reverseKey = `${depNode.id}->${sourceNode.id}`;
 if (existingKeys.has(key) || existingKeys.has(reverseKey)) continue;
 newConns.push({
 id: `conn-${Date.now()}-${connIdx++}-${concept.id}-${depId}`,
 fromId: sourceNode.id,
 toId: depNode.id,
 label: 'requires'
 });
 existingKeys.add(key);
 }
 }
 }
 return newConns;
 }, [dependencyGraph, concepts]);
 const handleAddConcept = (concept: LearningConcept) => {
 if (readOnly || addedConceptIds.has(concept.id)) return;
 pushHistory();
 const tier = (concept.tier || concept.mnemonic?.tier || 'leaf').toLowerCase();
 const newNode: MapNode = {
 id: `node-${Date.now()}`,
 conceptId: concept.id,
 conceptName: concept.name,
 x: 0,
 y: 0
 };
 setNodes(prev => {
 const updated = [...prev, newNode];
 const logicalConns = createLogicalConnections(updated, connections);
 if (logicalConns.length > 0) {
 setConnections(c => [...c, ...logicalConns]);
 }
 return rebalanceTier(updated, tier);
 });
 setAddedConceptIds(prev => new Set(prev).add(concept.id));
 };
 const rebalanceTier = (allNodes: MapNode[], tier: string): MapNode[] => {
 const newNode = allNodes[allNodes.length - 1];
 if (!newNode) return allNodes;
 const pos = findOpenPosition(tier, allNodes, newNode);
 return allNodes.map(n => n.id === newNode.id ? { ...n, x: pos.x, y: pos.y } : n);
 };
 const handleAddAll = () => {
 if (readOnly) return;
 pushHistory();
 const toAdd = concepts.filter(c => !addedConceptIds.has(c.id));
 if (toAdd.length === 0) return;
 const newNodes: MapNode[] = toAdd.map(c => ({
 id: `node-${Date.now()}-${c.id}`,
 conceptId: c.id,
 conceptName: c.name,
 x: 0,
 y: 0
 }));
 setNodes(prev => {
 const allNodes = [...prev, ...newNodes];
 const logicalConns = createLogicalConnections(allNodes, connections);
 if (logicalConns.length > 0) {
 setConnections(c => [...c, ...logicalConns]);
 }
 return allNodes;
 });
 setAddedConceptIds(prev => {
 const next = new Set(prev);
 toAdd.forEach(c => next.add(c.id));
 return next;
 });
 setTimeout(() => autoLayout(), 50);
 };
 const getNodeTier = useCallback((nodeId: string): string => {
 const node = nodes.find(n => n.id === nodeId);
 if (!node) return 'leaf';
 const c = concepts.find(cc => cc.id === node.conceptId);
 return (c?.tier || c?.mnemonic?.tier || 'leaf').toLowerCase();
 }, [nodes, concepts]);
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
 if (activeTool === 'select') {
 const pos = screenToCanvas(e.clientX, e.clientY);
 dragLastPosRef.current = pos;
 if (groupDrag) {
 const tier = getNodeTier(nodeId);
 setDraggingGroupTier(tier);
 setDraggingNodeId(nodeId);
 } else {
 setDraggingNodeId(nodeId);
 setDraggingGroupTier(null);
 }
 }
 };
 const screenToCanvas = (clientX: number, clientY: number) => {
 const rect = canvasRef.current!.getBoundingClientRect();
 return {
 x: (clientX - rect.left - panOffset.x) / zoom,
 y: (clientY - rect.top - panOffset.y) / zoom
 };
 };
 const handleCanvasMouseDown = (e: React.MouseEvent) => {
 if (e.button === 1) {
 e.preventDefault();
 setIsPanning(true);
 panStartRef.current = { x: e.clientX, y: e.clientY };
 panOffsetStartRef.current = { ...panOffset };
 return;
 }
 if (e.button !== 0) return;
 if (draggingNodeId) return;
 if (spaceHeld) {
 setIsPanning(true);
 panStartRef.current = { x: e.clientX, y: e.clientY };
 panOffsetStartRef.current = { ...panOffset };
 return;
 }
 setIsPanning(true);
 panStartRef.current = { x: e.clientX, y: e.clientY };
 panOffsetStartRef.current = { ...panOffset };
 };
 const handleCanvasMouseMove = (e: React.MouseEvent) => {
 if (draggingNodeId && canvasRef.current) {
 const pos = screenToCanvas(e.clientX, e.clientY);
 if (draggingGroupTier && dragLastPosRef.current) {
 const dx = pos.x - dragLastPosRef.current.x;
 const dy = pos.y - dragLastPosRef.current.y;
 dragLastPosRef.current = pos;
 setNodes(prev => prev.map(n => {
 const c = concepts.find(cc => cc.id === n.conceptId);
 const nTier = (c?.tier || c?.mnemonic?.tier || 'leaf').toLowerCase();
 if (nTier === draggingGroupTier) {
 return { ...n, x: n.x + dx, y: n.y + dy };
 }
 return n;
 }));
 } else {
 setNodes(prev => prev.map(n =>
 n.id === draggingNodeId ? { ...n, x: pos.x, y: pos.y } : n
 ));
 }
 return;
 }
 if (isPanning) {
 const dx = e.clientX - panStartRef.current.x;
 const dy = e.clientY - panStartRef.current.y;
 setPanOffset({
 x: panOffsetStartRef.current.x + dx,
 y: panOffsetStartRef.current.y + dy
 });
 }
 };
 const handleCanvasMouseUp = () => {
 if (draggingNodeId) {
 if (draggingGroupTier) {
 setNodes(prev => prev.map(n => {
 const c = concepts.find(cc => cc.id === n.conceptId);
 const nTier = (c?.tier || c?.mnemonic?.tier || 'leaf').toLowerCase();
 if (nTier === draggingGroupTier) {
 return { ...n, x: snapToGrid(n.x), y: snapToGrid(n.y) };
 }
 return n;
 }));
 } else {
 setNodes(prev => prev.map(n =>
 n.id === draggingNodeId ? { ...n, x: snapToGrid(n.x), y: snapToGrid(n.y) } : n
 ));
 }
 }
 setDraggingNodeId(null);
 setDraggingGroupTier(null);
 dragLastPosRef.current = null;
 setIsPanning(false);
 };
 const handleWheel = useCallback((e: WheelEvent) => {
 e.preventDefault();
 const rect = canvasRef.current?.getBoundingClientRect();
 if (!rect) return;
 const mouseX = e.clientX - rect.left;
 const mouseY = e.clientY - rect.top;
 let delta: number;
 if (e.ctrlKey) {
 const sensitivity = 0.01;
 delta = 1 - e.deltaY * sensitivity;
 delta = Math.min(1.15, Math.max(0.85, delta));
 } else {
 const clampedDelta = Math.min(50, Math.max(-50, e.deltaY));
 delta = 1 - clampedDelta * 0.002;
 }
 const newZoom = Math.min(3, Math.max(0.2, zoom * delta));
 const scale = newZoom / zoom;
 setPanOffset(prev => ({
 x: mouseX - scale * (mouseX - prev.x),
 y: mouseY - scale * (mouseY - prev.y)
 }));
 setZoom(newZoom);
 }, [zoom]);
 useEffect(() => {
 const el = canvasRef.current;
 if (!el) return;
 el.addEventListener('wheel', handleWheel, { passive: false });
 return () => el.removeEventListener('wheel', handleWheel);
 }, [handleWheel]);
 const handleCanvasClick = () => {
 setSelectedNodeId(null);
 setSelectedConnectionId(null);
 };
 const handleZoomIn = () => {
 setZoom(z => Math.min(3, z * 1.2));
 };
 const handleZoomOut = () => {
 setZoom(z => Math.max(0.2, z / 1.2));
 };
 const handleFitToView = () => {
 if (nodes.length === 0) {
 setZoom(1);
 setPanOffset({ x: 0, y: 0 });
 return;
 }
 const rect = canvasRef.current?.getBoundingClientRect();
 if (!rect) return;
 const xs = nodes.map(n => n.x);
 const ys = nodes.map(n => n.y);
 const minX = Math.min(...xs) - 100;
 const maxX = Math.max(...xs) + 100;
 const minY = Math.min(...ys) - 100;
 const maxY = Math.max(...ys) + 100;
 const contentW = maxX - minX;
 const contentH = maxY - minY;
 const newZoom = Math.min(3, Math.max(0.2, Math.min(rect.width / contentW, rect.height / contentH) * 0.9));
 setPanOffset({
 x: (rect.width - contentW * newZoom) / 2 - minX * newZoom,
 y: (rect.height - contentH * newZoom) / 2 - minY * newZoom
 });
 setZoom(newZoom);
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
 label: normalizeConnectionLabel(data.customLabel || data.type)
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
 c.id === editingConnectionId ? { ...c, label: normalizeConnectionLabel(trimmedLabel) || '?' } : c
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
 const inspectedNode = useMemo(() => {
 if (!inspectedNodeId) return null;
 const node = nodes.find(n => n.id === inspectedNodeId);
 if (!node) return null;
 const concept = concepts.find(c => c.id === node.conceptId);
 const tier = (concept?.tier || concept?.mnemonic?.tier || 'leaf').toLowerCase();
 const nodeConns = connections.filter(c => c.fromId === node.id || c.toId === node.id);
 const connDetails = nodeConns.map(c => {
 const isFrom = c.fromId === node.id;
 const otherNodeId = isFrom ? c.toId : c.fromId;
 const otherNode = nodes.find(n => n.id === otherNodeId);
 return {
 label: c.label,
 direction: isFrom ? 'outgoing' : 'incoming',
 otherName: otherNode ? getConceptName(otherNode.conceptId) : 'Unknown'
 };
 });
 const whyText = concept?.whyYouNeed || concept?.technicalDetails || null;
 return { node, concept, tier, connDetails, whyText };
 }, [inspectedNodeId, nodes, connections, concepts, getConceptName]);
 const handleNodeDoubleClick = (e: React.MouseEvent, nodeId: string) => {
 e.stopPropagation();
 e.preventDefault();
 setInspectedNodeId(prev => prev === nodeId ? null : nodeId);
 };
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
 clearDraft();
 onComplete?.({ nodes, connections });
 return;
 }
 if (userGuesses && dependencyGraph) {
 setMapPhase('validate');
 } else {
 clearDraft();
 onComplete?.({ nodes, connections });
 }
 }, [mapMode, userGuesses, dependencyGraph, nodes, connections, onComplete, clearDraft]);
 const handleCompleteWithValidation = useCallback(() => {
 clearDraft();
 onComplete?.({ nodes, connections }, validationResult || undefined);
 }, [nodes, connections, onComplete, validationResult, clearDraft]);
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
 <div className={`${styles.container} ${isFullscreen ? styles.fullscreenMode : ''}`}>
 {/* Phase Header */}
 {!isFullscreen && renderPhaseHeader()}
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
 <button
 className={styles.addAllButton}
 onClick={handleAddAll}
 disabled={addedConceptIds.size >= concepts.length}
 >
 <LayoutGrid size={14} />
 {addedConceptIds.size >= concepts.length ? 'All Added' : 'Add All & Layout'}
 </button>
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
 className={`${styles.canvasArea} ${isPanning ? styles.isPanning : ''} ${spaceHeld ? styles.spaceHeld : ''}`}
 style={readOnly ? { left: 0, width: '100%' } : {}}
 onMouseDown={handleCanvasMouseDown}
 onAuxClick={(e) => e.preventDefault()}
 onMouseMove={handleCanvasMouseMove}
 onMouseUp={handleCanvasMouseUp}
 onMouseLeave={handleCanvasMouseUp}
 onClick={handleCanvasClick}
 >
 {/* Grid dots that move with pan */}
 <div
 className={styles.canvasGrid}
 style={{
 backgroundPosition: `${panOffset.x % 20}px ${panOffset.y % 20}px`
 }}
 />
 {/* Transform layer for pan/zoom */}
 <div
 className={styles.canvasTransformLayer}
 style={{
 transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`
 }}
 >
 {/* Tier Group Rings + Sub-cluster Rings */}
 {(() => {
 const tierConfig = [
 { tier: 'trunk', label: 'Trunk', color: 'var(--color-accent)' },
 { tier: 'branch', label: 'Branch', color: 'var(--color-warning)' },
 { tier: 'leaf', label: 'Leaf', color: 'var(--color-sage)' }
 ];
 const rings: React.ReactNode[] = [];
 for (const { tier, label, color } of tierConfig) {
 const tierNodes = nodes.filter(n => {
 const c = concepts.find(cc => cc.id === n.conceptId);
 return (c?.tier || c?.mnemonic?.tier || 'leaf').toLowerCase() === tier;
 });
 if (tierNodes.length === 0) continue;
 const xs = tierNodes.map(n => n.x);
 const ys = tierNodes.map(n => n.y);
 const tcx = xs.reduce((a, b) => a + b, 0) / xs.length;
 const tcy = ys.reduce((a, b) => a + b, 0) / ys.length;
 const maxDist = tierNodes.length === 1 ? 0 : Math.max(
 ...tierNodes.map(n => Math.sqrt((n.x - tcx) ** 2 + (n.y - tcy) ** 2))
 );
 const tr = maxDist + 80;
 rings.push(
 <div
 key={tier}
 className={styles.tierRing}
 style={{ left: tcx - tr, top: tcy - tr, width: tr * 2, height: tr * 2, borderColor: color }}
 >
 <span className={styles.tierRingLabel} style={{ color }}>{label}</span>
 </div>
 );
 const subGroups = new Map<string, MapNode[]>();
 for (const n of tierNodes) {
 const key = getParentGroup(n);
 if (!subGroups.has(key)) subGroups.set(key, []);
 subGroups.get(key)!.push(n);
 }
 if (subGroups.size > 1) {
 subGroups.forEach((groupNodes, groupName) => {
 if (groupNodes.length === 0) return;
 const gxs = groupNodes.map(n => n.x);
 const gys = groupNodes.map(n => n.y);
 const gcx = gxs.reduce((a, b) => a + b, 0) / gxs.length;
 const gcy = gys.reduce((a, b) => a + b, 0) / gys.length;
 const gMaxDist = groupNodes.length === 1 ? 0 : Math.max(
 ...groupNodes.map(n => Math.sqrt((n.x - gcx) ** 2 + (n.y - gcy) ** 2))
 );
 const gr = gMaxDist + 50;
 rings.push(
 <div
 key={`${tier}-${groupName}`}
 className={styles.subClusterRing}
 style={{ left: gcx - gr, top: gcy - gr, width: gr * 2, height: gr * 2, borderColor: color }}
 >
 <span className={styles.subClusterLabel} style={{ color }}>{groupName}</span>
 </div>
 );
 });
 }
 }
 return rings;
 })()}
 {/* Nodes */}
 {nodes.map(node => {
 const isGroupTarget = draggingGroupTier && (() => {
 const c = concepts.find(cc => cc.id === node.conceptId);
 return (c?.tier || c?.mnemonic?.tier || 'leaf').toLowerCase() === draggingGroupTier;
 })();
 return (
 <div
 key={node.id}
 className={`${styles.node} ${selectedNodeId === node.id ? styles.selected : ''} ${isGroupTarget ? styles.groupDragging : ''} ${focusConcept && node.conceptName === focusConcept ? styles.focusEntry : ''}`}
 style={{ left: node.x, top: node.y }}
 onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
 onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
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
 );
 })}
 {/* Node Info Popover */}
 {inspectedNode && (
 <div
 className={styles.nodeInfoPopover}
 style={{ left: inspectedNode.node.x, top: inspectedNode.node.y + 30 }}
 onClick={(e) => e.stopPropagation()}
 >
 <div className={styles.nodeInfoHeader}>
 <span className={styles.nodeInfoTitle}>{inspectedNode.concept?.name || 'Unknown'}</span>
 <span className={styles.nodeInfoTier}>{inspectedNode.tier}</span>
 <button className={styles.nodeInfoClose} onClick={() => setInspectedNodeId(null)}>
 <X size={14} />
 </button>
 </div>
 <div className={styles.nodeInfoBody}>
 {inspectedNode.connDetails.length > 0 ? (
 <div className={styles.nodeInfoConnections}>
 {inspectedNode.connDetails.map((c, i) => (
 <div key={i} className={styles.nodeInfoConnItem}>
 <span className={styles.nodeInfoConnLabel}>{c.label}</span>
 <span>{c.direction === 'outgoing' ? '\u2192' : '\u2190'} {c.otherName}</span>
 </div>
 ))}
 </div>
 ) : (
 <div className={styles.nodeInfoEmpty}>No connections yet</div>
 )}
 {inspectedNode.whyText && (
 <div className={styles.nodeInfoAiSection}>
 <div className={styles.nodeInfoAiTitle}>
 <Sparkles size={12} />
 Why this matters
 </div>
 <div className={styles.nodeInfoAiText}>{inspectedNode.whyText}</div>
 </div>
 )}
 </div>
 </div>
 )}
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
 </div>
 {/* UI overlays (not affected by pan/zoom) */}
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
 className={`${styles.toolButton} ${groupDrag ? styles.active : ''}`}
 onClick={() => setGroupDrag(g => !g)}
 title={groupDrag ? 'Group Drag ON — drag moves entire tier' : 'Group Drag OFF — drag moves single node'}
 >
 <Group size={20} />
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
 className={styles.toolButton}
 onClick={() => setIsFullscreen(f => !f)}
 title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
 >
 {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
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
 {/* Collapsible Legend */}
 <div className={`${styles.relationshipLegend} ${legendCollapsed ? styles.legendCollapsed : ''}`}>
 <div
 className={styles.relationshipLegendTitle}
 onClick={() => setLegendCollapsed(c => !c)}
 >
 <span>Legend</span>
 <span className={styles.legendToggleIcon}>
 <ChevronDown size={14} />
 </span>
 </div>
 {!legendCollapsed && (
 <div className={styles.relationshipLegendList}>
 {RELATIONSHIP_LEGEND.map((item) => (
 <div key={item.id} className={styles.relationshipLegendItem}>
 <div className={styles.relationshipLegendLabelRow}>
 <span className={styles.relationshipLegendType}>{item.label}</span>
 <span className={styles.relationshipLegendMeaning}>{item.meaning}</span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 {/* Zoom Controls */}
 <div className={styles.zoomControls}>
 <button className={styles.zoomButton} onClick={handleZoomIn} title="Zoom in">
 <ZoomIn size={16} />
 </button>
 <div className={styles.zoomDivider} />
 <div className={styles.zoomLevel}>{Math.round(zoom * 100)}%</div>
 <div className={styles.zoomDivider} />
 <button className={styles.zoomButton} onClick={handleZoomOut} title="Zoom out">
 <ZoomOut size={16} />
 </button>
 <div className={styles.zoomDivider} />
 <button className={styles.zoomButton} onClick={handleFitToView} title="Fit to view">
 <LocateFixed size={16} />
 </button>
 </div>
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
 {/* Shortcuts Help Overlay */}
 <AnimatePresence>
 {showShortcuts && (
 <motion.div
 className={styles.shortcutsOverlay}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setShowShortcuts(false)}
 >
 <motion.div
 className={styles.shortcutsPanel}
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.9, opacity: 0 }}
 onClick={(e) => e.stopPropagation()}
 >
 <div className={styles.shortcutsPanelHeader}>
 <h3>Keyboard & Mouse Shortcuts</h3>
 <button onClick={() => setShowShortcuts(false)} className={styles.shortcutsPanelClose}>
 <X size={16} />
 </button>
 </div>
 <div className={styles.shortcutsGrid}>
 <div className={styles.shortcutsSection}>
 <h4>Navigation</h4>
 <div className={styles.shortcutRow}><kbd>Scroll</kbd><span>Zoom in / out</span></div>
 <div className={styles.shortcutRow}><kbd>Click + Drag</kbd><span>Pan canvas</span></div>
 <div className={styles.shortcutRow}><kbd>Middle Click + Drag</kbd><span>Pan canvas</span></div>
 <div className={styles.shortcutRow}><kbd>Space + Drag</kbd><span>Pan canvas</span></div>
 <div className={styles.shortcutRow}><kbd>+</kbd> / <kbd>-</kbd><span>Zoom in / out</span></div>
 <div className={styles.shortcutRow}><kbd>Ctrl + 0</kbd><span>Reset zoom to 100%</span></div>
 <div className={styles.shortcutRow}><kbd>Ctrl + 1</kbd><span>Fit all to view</span></div>
 </div>
 <div className={styles.shortcutsSection}>
 <h4>Editing</h4>
 <div className={styles.shortcutRow}><kbd>Ctrl + Z</kbd><span>Undo</span></div>
 <div className={styles.shortcutRow}><kbd>Ctrl + Y</kbd><span>Redo</span></div>
 <div className={styles.shortcutRow}><kbd>Delete</kbd><span>Remove selected</span></div>
 <div className={styles.shortcutRow}><kbd>Double Click</kbd><span>Inspect node</span></div>
 <div className={styles.shortcutRow}><kbd>Escape</kbd><span>Cancel / close</span></div>
 <div className={styles.shortcutRow}><kbd>?</kbd><span>Toggle this panel</span></div>
 </div>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 {/* Shortcuts hint button */}
 <button
 className={styles.shortcutsHintButton}
 onClick={() => setShowShortcuts(true)}
 title="Keyboard shortcuts (?)"
 >
 ?
 </button>
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
