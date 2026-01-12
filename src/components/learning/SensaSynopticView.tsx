/**
 * SensaSynopticView Component
 * 
 * A "Silver Bullet" visualization for stressed learners.
 * Reduces cognitive load by presenting a structured Mind Map (Synoptic View)
 * rather than a linear list. Uses specialized tiered orbits.
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    BookOpen,
    Anchor,
    Globe,
    Lightbulb,
    Activity
} from 'lucide-react';
import type { LearningConcept } from '@/lib/types/learning';
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

export default function SensaSynopticView({ concepts, subjectName }: SensaSynopticViewProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [hoveredTier, setHoveredTier] = useState<'foundation' | 'keystone' | 'utility' | null>(null);
    const [hoveredConceptName, setHoveredConceptName] = useState<string | null>(null); // New state for specific explanation
    const [focusedTier, setFocusedTier] = useState<'foundation' | 'keystone' | 'utility' | null>(null);
    const [containerSize, setContainerSize] = useState({ width: 800, height: 700 });

    // Validate content helpers (Ported from ConceptBrowser)
    const isValidContent = (text: string | undefined, conceptName: string): boolean => {
        if (!text) return false;
        const lowerText = text.toLowerCase().trim();
        const lowerName = conceptName.toLowerCase().trim();

        if (text.trim() === conceptName.trim()) return false;
        if (lowerText === lowerName) return false;
        // The following checks are removed as per the instruction's diff
        // if (lowerText.includes(lowerName) || lowerName.includes(lowerText)) return false;
        // if (lowerText === `think of ${lowerName} like a ${lowerName}`) return false;
        // if (lowerText.includes(`${lowerName} makes it possible`)) return false;
        // if (lowerText.includes('is essential for mastering')) return false;
        // if (lowerText.includes('example pending generation')) return false;

        return true;
    };

    // Calculate node positions
    const nodePositions = useMemo(() => {
        const positions = new Map<string, NodePosition>();
        const center = { x: containerSize.width / 2, y: containerSize.height / 2 };

        // Group by tier and sort logic
        const tiers = {
            foundation: concepts.filter(c => c.tier === 'foundation').sort((a, b) => (a.order || 0) - (b.order || 0)),
            keystone: concepts.filter(c => c.tier === 'keystone').sort((a, b) => (a.order || 0) - (b.order || 0)),
            utility: concepts.filter(c => c.tier === 'utility' || !c.tier).sort((a, b) => (a.order || 0) - (b.order || 0))
        };

        // Helper to distribute nodes on a circle
        const placeNodes = (nodes: LearningConcept[], radius: number, startAngle: number = 0) => {
            if (nodes.length === 0) return;
            const step = (2 * Math.PI) / nodes.length;

            nodes.forEach((node, index) => {
                const angle = startAngle + (index * step);
                positions.set(node.id, {
                    x: center.x + Math.cos(angle) * radius,
                    y: center.y + Math.sin(angle) * radius,
                    angle,
                    radius
                });
            });
        };

        // Orbits (EXPANDED RADII for better organization)
        placeNodes(tiers.foundation, 200);
        placeNodes(tiers.keystone, 350, 0.5); // Offset angle
        placeNodes(tiers.utility, 500, 0.25);

        return positions;
    }, [concepts, containerSize]);

    const selectedConcept = useMemo(() =>
        concepts.find(c => c.id === selectedId),
        [concepts, selectedId]);

    // Tier/Concept Descriptions (Child-Friendly / Sensa Persona)
    const getExplanation = (tier: string, conceptName?: string | null) => {
        const concept = concepts.find(c => c.name === conceptName);

        // If a specific concept is hovered, explain WHY it fits there
        if (conceptName) {
            // PRIORITY 1: USE AI GENERATED JUSTIFICATION (The "Silver Bullet" Dynamic Content)
            if (concept?.tierJustification) {
                return `💡 ${concept.tierJustification}`;
            }

            // Fallback: Template
            switch (tier) {
                case 'foundation': return `${conceptName} is a Foundation Root 🏗️ because it's a core building block you need to understand before anything else!`;
                case 'keystone': return `${conceptName} is a Keystone Bridge 🌉 because it connects different ideas together to help them make sense.`;
                case 'utility': return `${conceptName} is a Utility Tool 🛠️ because it helps you solve specific problems in special situations.`;
                default: return "";
            }
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

    // Update container size on mount/resize
    useEffect(() => {
        const updateSize = () => {
            const container = document.getElementById('sensa-map-container');
            if (container) {
                setContainerSize({
                    width: container.clientWidth,
                    height: Math.max(900, container.clientHeight)  // Increased min height
                });
            }
        };

        window.addEventListener('resize', updateSize);
        // Slight delay to ensure render
        setTimeout(updateSize, 100);

        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Render connection lines (Subtle links foundation -> hub)
    const renderLines = () => {
        const center = { x: containerSize.width / 2, y: containerSize.height / 2 };

        return Array.from(nodePositions.entries()).map(([id, pos]) => {
            const concept = concepts.find(c => c.id === id);

            // Draw line to center only for foundation nodes to reduce visual noise
            if (concept?.tier === 'foundation') {
                return (
                    <line
                        key={`line-hub-${id}`}
                        x1={center.x}
                        y1={center.y}
                        x2={pos.x}
                        y2={pos.y}
                        stroke="var(--color-text-muted)"
                        strokeWidth="2"
                        opacity="0.8"
                    />
                );
            }
            return null;
        });
    };

    return (
        <div className={styles.container}>
            {/* Header */}
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

            {/* Map Area */}
            <div
                id="sensa-map-container"
                className={styles.mapContainer}
                onClick={(e) => {
                    // Reset focus if clicking background
                    if (e.target === e.currentTarget) setFocusedTier(null);
                }}
                onDoubleClick={() => setSelectedId(null)}
            >

                {/* Visual Orbit Rings & Labels - Expanded sizes */}
                <div
                    className={`${styles.orbitRing} ${hoveredTier === 'foundation' || focusedTier === 'foundation' ? styles.active : ''}`}
                    style={{ width: 400, height: 400, cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); handleRingClick('foundation'); }}
                />
                <div className={`${styles.ringLabel} ${hoveredTier && hoveredTier !== 'foundation' ? styles.dimmed : ''}`} style={{ marginTop: -200 }}>Foundation Zone</div>

                <div
                    className={`${styles.orbitRing} ${hoveredTier === 'keystone' || focusedTier === 'keystone' ? styles.active : ''}`}
                    style={{ width: 700, height: 700, cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); handleRingClick('keystone'); }}
                />
                <div className={`${styles.ringLabel} ${hoveredTier && hoveredTier !== 'keystone' ? styles.dimmed : ''}`} style={{ marginTop: -350 }}>Keystone Zone</div>

                <div
                    className={`${styles.orbitRing} ${hoveredTier === 'utility' || focusedTier === 'utility' ? styles.active : ''}`}
                    style={{ width: 1000, height: 1000, cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); handleRingClick('utility'); }}
                />
                <div className={`${styles.ringLabel} ${hoveredTier && hoveredTier !== 'utility' ? styles.dimmed : ''}`} style={{ marginTop: -500 }}>Utility Zone</div>

                <svg className={styles.connections} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    {renderLines()}
                </svg>

                {/* Central Hub */}
                <div
                    className={`${styles.node} ${styles.hub}`}
                    style={{ left: '50%', top: '50%' }}
                    onClick={() => setFocusedTier(null)}
                >
                    <div className={styles.nodeLabel}>{subjectName}</div>
                </div>

                {/* Nodes */}
                {concepts.map((concept) => {
                    const pos = nodePositions.get(concept.id);
                    if (!pos) return null;
                    const tier = concept.tier || 'utility';

                    // Filter: If focus active, hide others
                    const isVisible = !focusedTier || focusedTier === tier;

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
                                scale: 1,
                                opacity: isVisible ? 1 : 0.1,
                                filter: isVisible ? 'none' : 'grayscale(100%) blur(2px)'
                            }}
                            transition={{ delay: 0.05 * concept.order, type: 'spring' }}
                            onClick={() => setSelectedId(concept.id)}
                            onMouseEnter={() => {
                                setHoveredTier(tier as 'foundation' | 'keystone' | 'utility');
                                setHoveredConceptName(concept.name);
                            }}
                            onMouseLeave={() => {
                                setHoveredTier(null);
                                setHoveredConceptName(null);
                            }}
                            whileHover={{ scale: isVisible ? 1.15 : 1 }}
                        >
                            <span className={styles.nodeLabel}>{concept.name}</span>
                        </motion.div>
                    );
                })}

                {/* Tier Explanation Tooltip (Status Bar) */}
                <AnimatePresence>
                    {(hoveredTier || focusedTier) && (
                        <motion.div
                            className={styles.tierTooltip}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                        >
                            <div className={styles.tierTitle}>
                                {hoveredConceptName ? 'CONCEPT INSIGHT' : `${(hoveredTier || focusedTier!).toUpperCase()} ZONE`}
                            </div>
                            <div className={styles.tierDesc}>
                                {/* Show specific explanation if hovering a concept, otherwise tier definition */}
                                {hoveredConceptName
                                    ? getExplanation(hoveredTier || focusedTier!, hoveredConceptName)
                                    : getExplanation(hoveredTier || focusedTier!)
                                }
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>


            {/* Details Drawer */}
            <AnimatePresence>
                {selectedConcept && (
                    <motion.div
                        className={styles.drawer}
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 50, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
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
                            {/* Hook */}
                            {isValidContent(selectedConcept.hookSentence, selectedConcept.name) && (
                                <div className={styles.section}>
                                    <h4><BookOpen size={16} /> Quick Summary</h4>
                                    <p>{selectedConcept.hookSentence}</p>
                                </div>
                            )}

                            {/* Why It Matters */}
                            {isValidContent(selectedConcept.whyYouNeed, selectedConcept.name) && (
                                <div className={styles.section}>
                                    <h4>Why It Matters</h4>
                                    <p>{selectedConcept.whyYouNeed}</p>
                                </div>
                            )}

                            {/* Metaphor */}
                            {isValidContent(selectedConcept.metaphor, selectedConcept.name) && (
                                <div className={styles.section}>
                                    <h4>Think of it like...</h4>
                                    <p className={styles.metaphor}>{selectedConcept.metaphor}</p>
                                </div>
                            )}

                            {/* Mnemonic (Anchor/Image) */}
                            {selectedConcept.mnemonic && (
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

                            {/* Real World */}
                            {isValidContent(selectedConcept.realWorldExample, selectedConcept.name) && (
                                <div className={styles.section}>
                                    <h4><Globe size={16} /> Real World Context</h4>
                                    <p>{selectedConcept.realWorldExample}</p>
                                </div>
                            )}

                            {/* Technical */}
                            {isValidContent(selectedConcept.technicalDetails, selectedConcept.name) &&
                                !selectedConcept.technicalDetails?.includes('is a core concept') && (
                                    <div className={styles.section}>
                                        <h4><Lightbulb size={16} /> Technical Insight</h4>
                                        <p>{selectedConcept.technicalDetails}</p>
                                    </div>
                                )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
