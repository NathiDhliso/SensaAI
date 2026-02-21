/**
 * MasterBlueprintReveal Component
 *
 * Renders the Deep Structure discovery screen — the "Master Blueprint" reveal.
 * Shows: archetype badge, invariant rule, coach reveal script, lifecycle timeline.
 * This is the FIRST thing a learner sees before the Concept Tree and sprints.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Lightbulb, Sparkles, Zap, Network, Scale, Map, Filter } from 'lucide-react';
import type { DeepStructure, DeepStructureArchetype, LifecycleBlueprint } from '@/shared/types/generation';
import styles from './DeepStructureDetails.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// ARCHETYPE CONFIG
// ═══════════════════════════════════════════════════════════════════════════
const ARCHETYPE_META: Record<DeepStructureArchetype, {
    label: string;
    icon: React.ReactNode;
    color: string;
    colorEnd: string;
    accent: string;
    glow: string;
}> = {
    'sequential-flow': {
        label: 'Sequential Pipeline',
        icon: <Zap size={24} />,
        color: '#3b82f6',
        colorEnd: '#60a5fa',
        accent: '#93c5fd',
        glow: 'rgba(59, 130, 246, 0.1)',
    },
    'see-saw': {
        label: 'Balance Equation',
        icon: <Scale size={24} />,
        color: '#8b5cf6',
        colorEnd: '#a78bfa',
        accent: '#c4b5fd',
        glow: 'rgba(139, 92, 246, 0.1)',
    },
    'spatial-map': {
        label: 'Spatial Geography',
        icon: <Map size={24} />,
        color: '#10b981',
        colorEnd: '#34d399',
        accent: '#6ee7b7',
        glow: 'rgba(16, 185, 129, 0.1)',
    },
    'heuristic': {
        label: 'Decision Heuristic',
        icon: <Filter size={24} />,
        color: '#f59e0b',
        colorEnd: '#fbbf24',
        accent: '#fcd34d',
        glow: 'rgba(245, 158, 11, 0.1)',
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════
interface DeepStructureDetailsProps {
    deepStructure: DeepStructure;
    lifecycleBlueprints: {
        phase1: LifecycleBlueprint;
        phase2: LifecycleBlueprint | null;
        phase3: LifecycleBlueprint | null;
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export function DeepStructureDetails({
    deepStructure,
    lifecycleBlueprints,
}: DeepStructureDetailsProps) {
    const archetype = ARCHETYPE_META[deepStructure.primaryArchetype];
    const secondaryArchetype = deepStructure.secondaryArchetype
        ? ARCHETYPE_META[deepStructure.secondaryArchetype]
        : null;

    // Collect non-null phases for the timeline
    const phases: { phase: LifecycleBlueprint; index: number }[] = [];
    if (lifecycleBlueprints.phase1) phases.push({ phase: lifecycleBlueprints.phase1, index: 1 });
    if (lifecycleBlueprints.phase2) phases.push({ phase: lifecycleBlueprints.phase2, index: 2 });
    if (lifecycleBlueprints.phase3) phases.push({ phase: lifecycleBlueprints.phase3, index: 3 });

    const cssVars = {
        '--archetype-color': archetype.color,
        '--archetype-color-end': archetype.colorEnd,
        '--archetype-accent': archetype.accent,
        '--archetype-glow': archetype.glow,
    } as React.CSSProperties;

    return (
        <motion.div
            className={styles.container}
            style={cssVars}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
            {/* ── Header: Archetype Badge ── */}
            <motion.div
                className={styles.header}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
            >
                <div className={styles.archetypeIcon}>{archetype.icon}</div>
                <div className={styles.headerText}>
                    <div className={styles.headerLabel}>Master Blueprint</div>
                    <h2 className={styles.headerTitle}>
                        {archetype.label}
                        {deepStructure.isHybrid && secondaryArchetype && (
                            <span className={styles.hybridBadge}>
                                <Network size={11} />
                                + {secondaryArchetype.label}
                            </span>
                        )}
                    </h2>
                </div>
            </motion.div>

            {/* ── Invariant Rule — The Golden Rule ── */}
            <motion.div
                className={styles.invariantCard}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
            >
                <div className={styles.invariantLabel}>
                    <Lightbulb size={13} />
                    The Golden Rule
                </div>
                <p className={styles.invariantText}>{deepStructure.invariantRule}</p>
            </motion.div>

            {/* ── Coach Reveal Script ── */}
            <motion.div
                className={styles.revealCard}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
            >
                <div className={styles.revealQuote}>
                    <div className={styles.revealLabel}>
                        <Sparkles size={13} />
                        &nbsp;Your Coach Says
                    </div>
                    <p className={styles.revealText}>{deepStructure.revealScript}</p>
                    <div className={styles.revealAttribution}>
                        <Sparkles size={11} />
                        Expert Blueprint Insight
                    </div>
                </div>
            </motion.div>

            {/* ── Lifecycle Timeline ── */}
            {phases.length > 0 && (
                <motion.div
                    className={styles.timelineSection}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                >
                    <div className={styles.timelineLabel}>Lifecycle Blueprint</div>
                    <div className={styles.timeline}>
                        {phases.map(({ phase, index }, i) => (
                            <React.Fragment key={index}>
                                {i > 0 && (
                                    <div className={styles.phaseConnector}>
                                        <ArrowRight size={16} />
                                    </div>
                                )}
                                <motion.div
                                    className={styles.phaseCard}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.65 + i * 0.1, duration: 0.35 }}
                                >
                                    <div className={styles.phaseNumber}>{index}</div>
                                    <div className={styles.phaseVerb}>{phase.verb}</div>
                                    <div className={styles.phaseName}>{phase.blueprintName}</div>
                                    <ul className={styles.phaseSequence}>
                                        {phase.sequence.map((step, si) => (
                                            <li key={si} className={styles.sequenceStep}>
                                                <span className={styles.stepDot} />
                                                {step}
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            </React.Fragment>
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
