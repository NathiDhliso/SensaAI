import { COLORS } from './theme-colors';
import type { LearningHealthEquation } from '@/shared/types/learning';
/**
 * SENSA v2.0 Flow Constants
 * 
 * Centralized constants for the 5-step SENSA flow and
 * Learning Health Equation calculations.
 *
 * I = min(h, Q_k × Q_r × Q_c × Q_f × Q_p)
 * The equation measures ONLY the learner — not the AI, not the platform.
 */
// ============================================================================
// Flow Step Definitions
// ============================================================================
export const SENSA_STEPS = {
    SEE: {
        id: 'see',
        label: 'See',
        description: 'Set your learning goal',
        order: 1,
        eqVariables: ['h']
    },
    EXPLORE: {
        id: 'explore',
        label: 'Explore',
        description: 'Survey structure & predict connections',
        order: 2,
        eqVariables: ['Q_k', 'Q_c']
    },
    NOTE: {
        id: 'note',
        label: 'Note',
        description: 'Build your concept map',
        order: 3,
        eqVariables: ['Q_c', 'Q_p']
    },
    STUDY: {
        id: 'study',
        label: 'Study',
        description: 'Deep dive with SHAPE content',
        order: 4,
        eqVariables: ['Q_r', 'Q_p']
    },
    APPLY: {
        id: 'apply',
        label: 'Apply',
        description: 'Synthesis challenge + optional Flow Mode',
        order: 5,
        eqVariables: ['Q_r', 'Q_f']
    }
} as const;
export type SensaStepId = keyof typeof SENSA_STEPS;
// ============================================================================
// Thresholds
// ============================================================================
/** Minimum Q_f to unlock Flow Mode after synthesis */
export const FLOW_MODE_THRESHOLD = 0.7;
/** Minimum I to consider healthy learning state */
export const HEALTH_THRESHOLD = 0.75;
/** @deprecated Use HEALTH_THRESHOLD instead */
export const MASTERY_THRESHOLD = HEALTH_THRESHOLD;
/** Per-step contribution caps for learner variables */
export const STEP_CONTRIBUTION_CAPS = {
    see: { h: 1.0 },
    explore: { Q_k: 0.5, Q_c: 0.3 },
    note: { Q_c: 0.5, Q_p: 0.3 },
    study: { Q_r: 0.5, Q_p: 0.4 },
    apply: { Q_r: 0.3, Q_f: 1.0 }
} as const;
// ============================================================================
// Expected Durations (minutes)
// ============================================================================
export const EXPECTED_DURATIONS = {
    see: 2, // Goal setting (formerly setup)
    explore: 5, // Structure + predictions
    note: 10, // Concept map building
    study: 15, // SHAPE content deep dive
    apply: 15, // Synthesis (10) + Flow Mode (5)
    total: 47
} as const;
// ============================================================================
// Learning Health Equation Calculation
// ============================================================================
/**
 * Calculates the Learning Health Index.
 * 
 * I = min(h, Q_k × Q_r × Q_c × Q_f × Q_p)
 * 
 * This measures ONLY the learner's absorption quality.
 * h is the mood-dependent cognitive bandwidth ceiling (0.4–1.0).
 * Each Q variable is a learner process signal (0–1).
 * 
 * @returns The health index I (0–1)
 */
export function calculateHealthIndex(eq: Omit<LearningHealthEquation, 'I'>): number {
    const raw = eq.Q_k * eq.Q_r * eq.Q_c * eq.Q_f * eq.Q_p;
    return Math.min(eq.h, Math.max(0, raw));
}

/** @deprecated Use calculateHealthIndex instead */
export function calculateMasteryIndex(
    _G: number,
    Q_P: number,
    Q_M: number,
    Q_f: number,
    h: number = 1.0
): number {
    // Legacy compatibility: map old vars into the new equation approximately
    const raw = Q_P * Q_M * Q_f;
    return Math.min(h, Math.max(0, raw));
}

/**
 * Determines if the learning health threshold is met.
 */
export function hasHealthyLearning(I: number): boolean {
    return I >= HEALTH_THRESHOLD;
}

/** @deprecated Use hasHealthyLearning instead */
export function hasMastery(I: number): boolean {
    return hasHealthyLearning(I);
}

/**
 * Learning Health Variable type — only learner-measured variables.
 */
export type HealthVariable = 'Q_k' | 'Q_r' | 'Q_c' | 'Q_f' | 'Q_p';

/**
 * Returns the weakest health variable (the learner's current bottleneck).
 */
export function findWeakestVariable(
    Q_k: number,
    Q_r: number,
    Q_c: number,
    Q_f: number,
    Q_p: number
): { variable: HealthVariable; value: number } {
    const vars: { variable: HealthVariable; value: number }[] = [
        { variable: 'Q_k', value: Q_k },
        { variable: 'Q_r', value: Q_r },
        { variable: 'Q_c', value: Q_c },
        { variable: 'Q_f', value: Q_f },
        { variable: 'Q_p', value: Q_p }
    ];
    return vars.reduce((min, curr) => curr.value < min.value ? curr : min);
}
// ============================================================================
// Color Coding for Variables
// ============================================================================
export const EQUATION_COLORS = {
    Q_k: 'var(--color-knowledge)',
    Q_r: 'var(--color-recall)',
    Q_c: 'var(--color-connection)',
    Q_f: 'var(--color-fluency)',
    Q_p: 'var(--color-process)',
    I: 'var(--color-mastery)',
    h: 'var(--color-mood)'
} as const;
// Fallback colors if CSS vars not defined
export const EQUATION_COLORS_HEX = {
    Q_k: COLORS.primary.indigo, // Prior knowledge
    Q_r: COLORS.warning, // Recall (amber)
    Q_c: COLORS.secondary.rose, // Connection (pink)
    Q_f: COLORS.success, // Spacing (green)
    Q_p: COLORS.accent.light, // Process (purple)
    I: '#3b82f6', // Health index (blue)
    h: '#94a3b8', // Mood ceiling (slate)
} as const;
