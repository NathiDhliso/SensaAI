/**
 * SensaSynopticView Component
 * 
 * A "Silver Bullet" visualization for stressed learners.
 * Reduces cognitive load by presenting a structured Mind Map (Synoptic View)
 * rather than a linear list. Uses specialized tiered orbits.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    BookOpen,
    Anchor,
    Globe,
    Lightbulb,
    Activity,
    ZoomIn,
    ZoomOut,
    Maximize,
    Minimize,
    Focus,
    Zap // [NEW] For Core Insight
} from 'lucide-react';
import type { LearningConcept } from '@/lib/types/learning';
import { isRealContent, auditConceptContent } from '@/lib/validation/content-quality';
import styles from './SensaSynopticView.module.css';

interface SensaSynopticViewProps {
    concepts: LearningConcept[];
    subjectName: string;
}

interface NodePosition {
    x: number;
    y: number;
    angle: number;
    radius: number;
}

// CONSTANTS
const CANVAS_SIZE = 2400; // Fixed "Virtual World" size
const CENTER = { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 };

export default function SensaSynopticView({ concepts, subjectName }: SensaSynopticViewProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [focusedTier, setFocusedTier] = useState<'foundation' | 'keystone' | 'utility' | null>(null);

    // Viewport Refs
    const mapContainerRef = useRef<HTMLDivElement>(null);

    // Camera State
    const [view, setView] = useState({ x: 0, y: 0, scale: 0.35 }); // Initial zoom out to fit
    const [isFullScreen, setIsFullScreen] = useState(false);

    // DEV: Audit content gaps when a concept is selected (logs to console)
    useEffect(() => {
        if (selectedId) {
            const concept = concepts.find(c => c.id === selectedId);
            if (concept) {
                auditConceptContent(concept);
            }
        }
    }, [selectedId, concepts]);


    // VIEW LAYER DEFENSE: Filter out "Unnamed" artifacts that might slip through the pipeline
    const validConcepts = useMemo(() => {
        return concepts.filter(c =>
            c.name &&
            !c.name.toLowerCase().includes('unnamed') &&
            !c.name.toLowerCase().includes('undefined') &&
            c.name.trim().length > 0
        );
    }, [concepts]);

    // Calculate node positions on FIXED CANVAS
    const nodePositions = useMemo(() => {
        const positions = new Map<string, NodePosition>();

        // Define Sectors (Angles in Radians)
        // 0 is Right (3 o'clock). Clockwise is positive.
        // PREPARE (Phase 1): Top-Right (-90° to 30°) -> Start of cycle
        // MODEL (Phase 2): Bottom (30° to 150°) -> The "Work"
        // DELIVER (Phase 3): Top-Left (150° to 270°) -> The "Outcome"
        const sectors = {
            PREPARE: { start: -Math.PI / 2, end: Math.PI / 6 }, // -90 to 30
            MODEL: { start: Math.PI / 6, end: (5 * Math.PI) / 6 }, // 30 to 150
            DELIVER: { start: (5 * Math.PI) / 6, end: (3 * Math.PI) / 2 } // 150 to 270
        };

        // Radii per Tier (EXPANDED for visual clarity)
        const radii = {
            foundation: 220, // Inner
            keystone: 450,   // Middle (Clear gap)
            utility: 680     // Outer (Far out)
        };

        // Group concepts by Phase AND Tier
        const grouped = {
            PREPARE: { foundation: [] as LearningConcept[], keystone: [] as LearningConcept[], utility: [] as LearningConcept[] },
            MODEL: { foundation: [] as LearningConcept[], keystone: [] as LearningConcept[], utility: [] as LearningConcept[] },
            DELIVER: { foundation: [] as LearningConcept[], keystone: [] as LearningConcept[], utility: [] as LearningConcept[] }
        };

        // Classify every concept
        validConcepts.forEach(c => {
            const phase = c.lifecyclePhase || 'PREPARE'; // Fallback
            const tier = c.tier || 'utility';
            if (grouped[phase] && grouped[phase][tier]) {
                grouped[phase][tier].push(c);
            }
        });

        // Helper to place nodes within a sector arc with ZIG-ZAG to prevent overlap
        const placeInSector = (nodes: LearningConcept[], sectorStart: number, sectorEnd: number, radius: number) => {
            if (nodes.length === 0) return;

            // Sort by order
            nodes.sort((a, b) => (a.order || 0) - (b.order || 0));

            // Determine if we need to zig-zag (if too many nodes for this arc)
            const sectorSpan = sectorEnd - sectorStart;
            const arcLength = radius * sectorSpan;
            const nodeDiameter = 120; // Assume larger node size
            const maxNodesLinear = arcLength / nodeDiameter;
            const useZigZag = nodes.length > (maxNodesLinear * 0.8); // Be aggressive with zig-zag

            // Usable span (85%)
            const usableSpan = sectorSpan * 0.85;
            const offset = sectorStart + (sectorSpan * 0.075);

            const step = nodes.length > 1 ? usableSpan / (nodes.length - 1) : 0;

            nodes.forEach((node, index) => {
                const angle = nodes.length > 1 ? offset + (index * step) : sectorStart + (sectorSpan / 2);

                // Zig-Zag Logic: Alternate radius AGGRESSIVELY
                let finalRadius = radius;
                if (useZigZag) {
                    // Even indices pull in, Odd indices push out
                    const zigZagAmount = 80; // Massive offset to clear neighbors
                    finalRadius = index % 2 === 0 ? radius - zigZagAmount : radius + zigZagAmount;
                }

                positions.set(node.id, {
                    x: CENTER.x + Math.cos(angle) * finalRadius,
                    y: CENTER.y + Math.sin(angle) * finalRadius,
                    angle,
                    radius: finalRadius
                });
            });
        };

        // Process all groups
        (['PREPARE', 'MODEL', 'DELIVER'] as const).forEach(phase => {
            const { start, end } = sectors[phase];
            placeInSector(grouped[phase].foundation, start, end, radii.foundation);
            placeInSector(grouped[phase].keystone, start, end, radii.keystone);
            placeInSector(grouped[phase].utility, start, end, radii.utility);
        });

        return positions;
    }, [validConcepts]); // Removed containerSize dependency

    // Snap to Fit
    const handleSnapToFit = () => {
        if (!mapContainerRef.current) return;
        // Simple center logic
        setView({ x: 0, y: 0, scale: 0.35 }); // Reset to default "Overview" zoom
    };

    // Zoom Handlers
    const handleZoomIn = () => setView(v => ({ ...v, scale: Math.min(v.scale * 1.2, 1.5) }));
    const handleZoomOut = () => setView(v => ({ ...v, scale: Math.max(v.scale / 1.2, 0.1) }));

    const selectedConcept = useMemo(() =>
        validConcepts.find(c => c.id === selectedId),
        [validConcepts, selectedId]);

    // KEYBOARD NAVIGATION: Escape to clear selection
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (selectedConcept) setSelectedId(null);
                else if (focusedTier) setFocusedTier(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedConcept, focusedTier]);

    // NEW: GOLDEN PATH LOGIC (Sequence Line)
    const sortedConcepts = useMemo(() =>
        [...validConcepts].sort((a, b) => (a.order || 0) - (b.order || 0)),
        [validConcepts]);

    // Calculate Focus: Dependent nodes + Path neighbors
    const focusedDefaults = useMemo(() => {
        if (!selectedId) return null;
        const concept = validConcepts.find(c => c.id === selectedId);
        if (!concept) return null;

        const dependentIds = new Set(concept.dependencies);

        // Also include immediate sequence neighbors (Prev/Next in order)
        const idx = sortedConcepts.findIndex(c => c.id === selectedId);
        if (idx > 0) dependentIds.add(sortedConcepts[idx - 1].id);
        if (idx < sortedConcepts.length - 1) dependentIds.add(sortedConcepts[idx + 1].id);

        return dependentIds;
    }, [selectedId, validConcepts, sortedConcepts]);

    // Tier/Concept Descriptions (Child-Friendly / Sensa Persona)
    const getExplanation = (tier: string, conceptName?: string | null) => {
        const concept = concepts.find(c => c.name === conceptName);

        // If a specific concept is hovered, explain WHY it fits there
        if (conceptName && concept) {
            // PRIORITY 1: AI-Generated tierJustification (if real content)
            if (isRealContent(concept.tierJustification, concept.name)) {
                return `💡 ${concept.tierJustification}`;
            }

            // PRIORITY 2: Use SHAPE simpleCore (if real content)
            if (isRealContent(concept.shape?.simpleCore, concept.name)) {
                const tierLabel = tier === 'foundation' ? 'Foundation 🏗️' :
                    tier === 'keystone' ? 'Keystone 🌉' : 'Utility 🛠️';
                return `${tierLabel}: ${concept.shape!.simpleCore}`;
            }

            // PRIORITY 3: Use hookSentence (if real content)
            if (isRealContent(concept.hookSentence, concept.name)) {
                const tierLabel = tier === 'foundation' ? 'Foundation 🏗️' :
                    tier === 'keystone' ? 'Keystone 🌉' : 'Utility 🛠️';
                return `${tierLabel}: ${concept.hookSentence}`;
            }

            // PRIORITY 4: Use whyYouNeed (if real content)
            if (isRealContent(concept.whyYouNeed, concept.name)) {
                return `Why: ${concept.whyYouNeed}`;
            }

            // NO FALLBACK - return empty if no real content (UI will handle)
            return '';
        }

        // General Tier Description covers
        switch (tier) {
            case 'foundation': return "FOUNDATION ROOTS 🏗️ — These are the big ideas that hold everything else up!";
            case 'keystone': return "KEYSTONE BRIDGES 🌉 — These connect your ideas together so they make sense.";
            case 'utility': return "UTILITY TOOLS 🛠️ — Special tricks and details for specific problems.";
            default: return "";
        }
    };

    const handleRingClick = (tier: 'foundation' | 'keystone' | 'utility') => {
        if (focusedTier === tier) {
            setFocusedTier(null); // Toggle off
        } else {
            setFocusedTier(tier);
        }
    };

    // Render connection lines (Golden Path + Hub Links)
    const renderLines = () => {
        const lines = [];

        // 1. GOLDEN PATH: Sequential Line connecting all nodes in order
        // Only show if not focusing on a specific tier/node (or if focusing on path?)
        // Let's always show it faintly as the "backbone"
        let pathD = '';
        sortedConcepts.forEach((concept, i) => {
            const pos = nodePositions.get(concept.id);
            if (!pos) return;

            if (i === 0) {
                pathD += `M ${pos.x} ${pos.y}`;
            } else {
                pathD += ` L ${pos.x} ${pos.y}`;
            }
        });

        if (pathD) {
            lines.push(
                <path
                    key="golden-path"
                    d={pathD}
                    fill="none"
                    stroke="var(--color-primary)" // Use primary color
                    strokeWidth="2"
                    strokeDasharray="6 4" // Dashed line
                    opacity="0.6" // Increased visibility
                    className={styles.goldenPath}
                />
            );
        }

        // 2. Hub Links (Foundation Only)
        Array.from(nodePositions.entries()).forEach(([id, pos]) => {
            const concept = concepts.find(c => c.id === id);
            if (concept?.tier === 'foundation') {
                lines.push(
                    <line
                        key={`line-hub-${id}`}
                        x1={CENTER.x}
                        y1={CENTER.y}
                        x2={pos.x}
                        y2={pos.y}
                        stroke="var(--color-text-muted)"
                        strokeWidth="1" // Thinner
                        opacity="0.5"
                    />
                );
            }
        });

        // 3. Selection Highlighting (Dependencies)
        if (selectedId && focusedDefaults) {
            const selectedPos = nodePositions.get(selectedId);
            if (selectedPos) {
                focusedDefaults.forEach(depId => {
                    const depPos = nodePositions.get(depId);
                    if (depPos) {
                        lines.push(
                            <line
                                key={`focus-line-${selectedId}-${depId}`}
                                x1={selectedPos.x}
                                y1={selectedPos.y}
                                x2={depPos.x}
                                y2={depPos.y}
                                stroke="var(--color-accent)"
                                strokeWidth="2"
                                opacity="0.8"
                            />
                        );
                    }
                });
            }
        }

        return lines;
    };

    return (
        <div className={`${styles.container} ${isFullScreen ? styles.fullScreen : ''}`}>
            {/* Header Controls */}
            <div className={styles.toolbar}>
                <div className={styles.header}>
                    <div className={styles.headerIcon}>
                        <Activity size={24} />
                    </div>
                    <div>
                        <h2 className={styles.title}>Sensa Synoptic View</h2>
                        <p className={styles.subtitle}>
                            {focusedTier
                                ? `Focusing on ${focusedTier.toUpperCase()} ZONE — Click background to reset.`
                                : `Visualizing ${subjectName} — Hover for structure, Click rings to filter.`}
                        </p>
                    </div>
                </div>
                <div className={styles.controls}>
                    <button onClick={handleZoomOut} title="Zoom Out"><ZoomOut size={16} /></button>
                    <button onClick={handleSnapToFit} title="Snap to Fit"><Focus size={16} /></button>
                    <button onClick={handleZoomIn} title="Zoom In"><ZoomIn size={16} /></button>
                    <button onClick={() => setIsFullScreen(!isFullScreen)} title="Toggle Fullscreen">
                        {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
                    </button>
                </div>
            </div>

            <div className={styles.contentWrapper}>
                {/* Map Area */}
                <div
                    ref={mapContainerRef}
                    className={styles.mapViewport}
                    onClick={(e) => {
                        // Reset focus if clicking background
                        if (e.target === e.currentTarget) setFocusedTier(null);
                    }}
                    onDoubleClick={() => setSelectedId(null)}
                >
                    <motion.div
                        className={styles.virtualCanvas}
                        drag
                        dragConstraints={{ left: -CANVAS_SIZE, right: 0, top: -CANVAS_SIZE, bottom: 0 }} // Adjusted constraints for better panning
                        animate={{
                            scale: view.scale,
                            x: view.x,
                            y: view.y,
                        }}
                        style={{
                            width: CANVAS_SIZE,
                            height: CANVAS_SIZE,
                            transformOrigin: 'center center'
                            // Removed manual x/y from style, handled by animate
                        }}
                    >
                        {/* Visual Orbit Rings - Render Order: Outer -> Inner (Pointer Events Stack) */}
                        <div className={`${styles.orbitRing} ${focusedTier === 'utility' ? styles.active : ''}`}
                            style={{ width: 1360, height: 1360, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                            onClick={(e) => { e.stopPropagation(); handleRingClick('utility'); }} />
                        <div className={`${styles.ringLabel} ${focusedTier && focusedTier !== 'utility' ? styles.dimmed : ''}`} style={{ marginTop: -500 }}>Utility Zone</div>

                        <div className={`${styles.orbitRing} ${focusedTier === 'keystone' ? styles.active : ''}`}
                            style={{ width: 900, height: 900, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                            onClick={(e) => { e.stopPropagation(); handleRingClick('keystone'); }} />
                        <div className={`${styles.ringLabel} ${focusedTier && focusedTier !== 'keystone' ? styles.dimmed : ''}`} style={{ marginTop: -350 }}>Keystone Zone</div>

                        <div className={`${styles.orbitRing} ${focusedTier === 'foundation' ? styles.active : ''}`}
                            style={{ width: 440, height: 440, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                            onClick={(e) => { e.stopPropagation(); handleRingClick('foundation'); }} />
                        <div className={`${styles.ringLabel} ${focusedTier && focusedTier !== 'foundation' ? styles.dimmed : ''}`} style={{ marginTop: -200 }}>Foundation Zone</div>

                        <svg className={styles.connections} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                            {renderLines()}
                        </svg>

                        {/* Central Hub */}
                        <div className={`${styles.node} ${styles.hub}`} style={{ left: '50%', top: '50%' }} onClick={() => setFocusedTier(null)}>
                            <div className={styles.nodeLabel}>{subjectName}</div>
                        </div>

                        {/* Nodes */}
                        {validConcepts.map((concept) => {
                            const pos = nodePositions.get(concept.id);
                            if (!pos) return null;
                            const tier = concept.tier || 'utility';
                            const isTierVisible = !focusedTier || focusedTier === tier;
                            const isFocusVisible = !selectedId || selectedId === concept.id || (focusedDefaults && focusedDefaults.has(concept.id));
                            const isVisible = isTierVisible && isFocusVisible;

                            return (
                                <motion.div
                                    key={concept.id}
                                    className={`${styles.node} ${styles[tier]}`}
                                    style={{
                                        left: pos.x,
                                        top: pos.y,
                                        opacity: isVisible ? 1 : 0.1,
                                        filter: isVisible ? 'none' : 'grayscale(100%) blur(2px)',
                                        pointerEvents: isVisible ? 'auto' : 'none'
                                    }}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{
                                        scale: selectedId === concept.id ? [1, 1.1, 1] : 1, // Pulse effect if selected
                                        opacity: isVisible ? 1 : 0.1,
                                        filter: isVisible ? 'none' : 'grayscale(100%) blur(2px)'
                                    }}
                                    transition={{
                                        scale: { type: 'spring', damping: 20, stiffness: 300, repeat: selectedId === concept.id ? Infinity : 0, repeatDelay: 2 },
                                        default: { duration: 0.3 }
                                    }}
                                    onClick={() => setSelectedId(concept.id)}
                                    // [REMOVED] Hover handlers to eliminate popups
                                    whileHover={{ scale: isVisible ? 1.15 : 1 }}
                                >
                                    <span className={styles.nodeLabel}>{concept.name}</span>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </div>

                {/* Tier Explanation Tooltip (Status Bar) */}
                <AnimatePresence>
                    {focusedTier && (
                        <motion.div
                            className={styles.tierTooltip}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                        >
                            <div className={styles.tierTitle}>
                                {focusedTier.toUpperCase()} ZONE
                            </div>
                            <div className={styles.tierDesc}>
                                {getExplanation(focusedTier)}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Sidebar (Details Drawer) - Now a Flex Item */}
                <AnimatePresence>
                    {selectedConcept && (
                        <motion.div
                            className={styles.sidebar}
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 400, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        >
                            <div className={styles.drawerContentWrapper}>
                                <div className={styles.drawerHeader}>
                                    <div>
                                        <span className={`${styles.drawerTier} ${styles[selectedConcept.tier || 'utility']}_bg`}>
                                            {selectedConcept.tier || 'Utility'}
                                        </span>
                                        <h3 className={styles.drawerTitle}>{selectedConcept.name}</h3>
                                    </div>
                                    <button onClick={() => setSelectedId(null)} className={styles.closeButton}>
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className={styles.drawerContent}>
                                    {/* Core Insight - [NEW] Priority Display */}
                                    {isRealContent(selectedConcept.shape?.simpleCore, selectedConcept.name) && (
                                        <div className={styles.section}>
                                            <h4><Zap size={16} /> Core Insight</h4>
                                            <p className={styles.coreInsightText}>
                                                {selectedConcept.shape?.simpleCore}
                                            </p>
                                        </div>
                                    )}

                                    {/* Quick Summary - only show if real content */}
                                    {isRealContent(selectedConcept.hookSentence, selectedConcept.name) && (
                                        <div className={styles.section}>
                                            <h4><BookOpen size={16} /> Quick Summary</h4>
                                            <p>{selectedConcept.hookSentence}</p>
                                        </div>
                                    )}

                                    {/* Why It Matters - only show if real content */}
                                    {isRealContent(selectedConcept.whyYouNeed, selectedConcept.name) && (
                                        <div className={styles.section}>
                                            <h4>Why It Matters</h4>
                                            <p>{selectedConcept.whyYouNeed}</p>
                                        </div>
                                    )}

                                    {/* Memory Anchor - only show if real content */}
                                    {selectedConcept.mnemonic && isRealContent(selectedConcept.mnemonic.story, selectedConcept.name) && (
                                        <div className={styles.section}>
                                            <h4><Anchor size={16} /> Memory Anchor</h4>
                                            <p><strong>{selectedConcept.mnemonic.anchor}:</strong> {selectedConcept.mnemonic.story}</p>
                                            {selectedConcept.mnemonic.imageUrl && (
                                                <div className={styles.mnemonicImage}>
                                                    <img
                                                        src={selectedConcept.mnemonic.imageUrl}
                                                        alt={`Mnemonic for ${selectedConcept.name}`}
                                                        loading="lazy"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Real World Context - only show if real content */}
                                    {isRealContent(selectedConcept.realWorldExample, selectedConcept.name) && (
                                        <div className={styles.section}>
                                            <h4><Globe size={16} /> Real World Context</h4>
                                            <p>{selectedConcept.realWorldExample}</p>
                                        </div>
                                    )}

                                    {/* Technical Insight - only show if real content */}
                                    {isRealContent(selectedConcept.technicalDetails, selectedConcept.name) && (
                                        <div className={styles.section}>
                                            <h4><Lightbulb size={16} /> Technical Insight</h4>
                                            <p>{selectedConcept.technicalDetails}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
