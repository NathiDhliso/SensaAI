/**
 * MasterBlueprintReveal Component
 *
 * Renders the Deep Structure discovery screen — the "Master Blueprint" reveal.
 * Shows: archetype badge, invariant rule, coach reveal script, lifecycle timeline.
 * This is the FIRST thing a learner sees before the Concept Tree and sprints.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Lightbulb, Zap, Network, Scale, Map, Filter } from 'lucide-react';
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
const FALLBACK_ARCHETYPE = {
    label: 'Learning Blueprint',
    icon: <Lightbulb size={24} />,
    color: '#64748b',
    colorEnd: '#94a3b8',
    accent: '#cbd5e1',
    glow: 'rgba(100, 116, 139, 0.1)',
};

const ARCHETYPE_ALIASES: Record<string, DeepStructureArchetype> = {
    'sequential-flow': 'sequential-flow',
    'sequential': 'sequential-flow',
    'sequential_flow': 'sequential-flow',
    'process-flow': 'sequential-flow',
    'pipeline': 'sequential-flow',
    'workflow': 'sequential-flow',
    'linear': 'sequential-flow',
    'procedural': 'sequential-flow',
    'see-saw': 'see-saw',
    'seesaw': 'see-saw',
    'see_saw': 'see-saw',
    'balance': 'see-saw',
    'tension': 'see-saw',
    'trade-off': 'see-saw',
    'tradeoff': 'see-saw',
    'equilibrium': 'see-saw',
    'spatial-map': 'spatial-map',
    'spatial_map': 'spatial-map',
    'spatial': 'spatial-map',
    'map': 'spatial-map',
    'geography': 'spatial-map',
    'topology': 'spatial-map',
    'network': 'spatial-map',
    'hierarchy': 'spatial-map',
    'heuristic': 'heuristic',
    'decision': 'heuristic',
    'judgment': 'heuristic',
    'rule-based': 'heuristic',
    'rule_based': 'heuristic',
    'decision-tree': 'heuristic',
    'conditional': 'heuristic',
};

function normalizeArchetype(raw?: string): DeepStructureArchetype | null {
    if (!raw) return null;
    const key = raw.toLowerCase().trim();
    if (ARCHETYPE_ALIASES[key]) return ARCHETYPE_ALIASES[key];
    for (const [alias, canonical] of Object.entries(ARCHETYPE_ALIASES)) {
        if (key.includes(alias) || alias.includes(key)) return canonical;
    }
    return null;
}

export function DeepStructureDetails({
    deepStructure,
    lifecycleBlueprints,
}: DeepStructureDetailsProps) {
    const resolvedPrimary = normalizeArchetype(deepStructure?.primaryArchetype);
    const archetype = (resolvedPrimary ? ARCHETYPE_META[resolvedPrimary] : null) || FALLBACK_ARCHETYPE;
    const resolvedSecondary = normalizeArchetype(deepStructure?.secondaryArchetype ?? undefined);
    const secondaryArchetype = resolvedSecondary
        ? (ARCHETYPE_META[resolvedSecondary] || null)
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

            {/* ── Deep Structure Insight ── */}
            <motion.div
                className={styles.insightCard}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
            >
                <div className={styles.insightLabel}>
                    <Lightbulb size={13} />
                    &nbsp;Core Principle
                </div>
                <p className={styles.invariantText}>
                    {deepStructure.invariantRule.replace(/^(?:If you remember nothing else:\s*)/i, '').replace(/^"|"$/g, '')}
                </p>
                <div className={styles.divider} />
                <p className={styles.revealText}>
                    {deepStructure.revealScript.replace(/^"|"$/g, '')}
                </p>
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
                                    {Array.isArray(phase.sequence) && phase.sequence.length > 0 && (
                                        <ul className={styles.phaseSequence}>
                                            {phase.sequence.map((step, si) => (
                                                <li key={si} className={styles.sequenceStep}>
                                                    <span className={styles.stepDot} />
                                                    {step}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </motion.div>
                            </React.Fragment>
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
