import { COLORS } from './theme-colors';
/**
 * SENSA v2.0 Flow Constants
 * 
 * Centralized constants for the 5-step SENSA flow and
 * Universal Learning Equation calculations.
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
 eqVariables: ['G']
 },
 EXPLORE: {
 id: 'explore',
 label: 'Explore',
 description: 'Survey structure & predict connections',
 order: 2,
 eqVariables: ['Q_P', 'Q_M']
 },
 NOTE: {
 id: 'note',
 label: 'Note',
 description: 'Build your concept map',
 order: 3,
 eqVariables: ['Q_P', 'Q_M']
 },
 STUDY: {
 id: 'study',
 label: 'Study',
 description: 'Deep dive with SHAPE content',
 order: 4,
 eqVariables: ['Q_P', 'Q_M']
 },
 APPLY: {
 id: 'apply',
 label: 'Apply',
 description: 'Synthesis challenge + optional Flow Mode',
 order: 5,
 eqVariables: ['Q_f']
 }
} as const;
export type SensaStepId = keyof typeof SENSA_STEPS;
// ============================================================================
// Thresholds
// ============================================================================
/** Minimum Q_f to unlock Flow Mode after synthesis */
export const FLOW_MODE_THRESHOLD = 0.7;
/** Minimum I to consider mastery achieved */
export const MASTERY_THRESHOLD = 0.75;
/** Per-step contribution caps */
export const STEP_CONTRIBUTION_CAPS = {
 see: { G: 1.0 },
 explore: { Q_P: 0.3, Q_M: 0.3 },
 note: { Q_P: 0.4, Q_M: 0.4 },
 study: { Q_P: 0.3, Q_M: 0.3 },
 apply: { Q_f: 1.0 }
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
// Equation Calculation
// ============================================================================
/**
 * Calculates the Mastery Index using the Universal Learning Equation.
 * 
 * I = min(h, G × Q_f × Q_M × Q_P)
 * 
 * @param G - Generation quality factor (content quality)
 * @param Q_P - Practice quality (engagement, 0-1)
 * @param Q_M - Mastery quality (concept scores, 0-1)
 * @param Q_f - Flow quality (momentum tracking, 0-1)
 * @param h - Ceiling cap (default 1.0)
 * @returns The mastery index I (0-1) - Information absorbed
 */
export function calculateMasteryIndex(
 G: number,
 Q_P: number,
 Q_M: number,
 Q_f: number,
 h: number = 1.0
): number {
 const raw = G * Q_f * Q_M * Q_P;
 return Math.min(h, Math.max(0, raw));
}
/**
 * Determines if mastery threshold is met.
 */
export function hasMastery(I: number): boolean {
 return I >= MASTERY_THRESHOLD;
}
/**
 * Returns the weakest equation variable.
 */
export function findWeakestVariable(
 G: number,
 Q_P: number,
 Q_M: number,
 Q_f: number
): { variable: 'G' | 'Q_P' | 'Q_M' | 'Q_f'; value: number } {
 const vars = [
 { variable: 'G' as const, value: G },
 { variable: 'Q_P' as const, value: Q_P },
 { variable: 'Q_M' as const, value: Q_M },
 { variable: 'Q_f' as const, value: Q_f }
 ];
 return vars.reduce((min, curr) => curr.value < min.value ? curr : min);
}
// ============================================================================
// Color Coding for Variables
// ============================================================================
export const EQUATION_COLORS = {
 G: 'var(--color-governance)',
 Q_P: 'var(--color-preparation)',
 Q_M: 'var(--color-modeling)',
 Q_f: 'var(--color-fluency)',
 I: 'var(--color-mastery)'
} as const;
// Fallback colors if CSS vars not defined
export const EQUATION_COLORS_HEX = {
 G: COLORS.primary.indigo, // Indigo (Custom for Governance)
 Q_P: COLORS.success, // #22c55e - Green
 Q_M: COLORS.warning, // #f59e0b - Amber
 Q_f: COLORS.secondary.rose, // #ec4899 - Pink
 I: COLORS.accent.light, // #8b5cf6 - Purple
} as const;
