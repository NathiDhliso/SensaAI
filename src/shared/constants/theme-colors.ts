/**
 * Centralized Theme Colors
 * 
 * This file provides programmatic access to the CSS color palette
 * for use in JavaScript/TypeScript when CSS variables aren't accessible
 * (e.g., canvas drawing, third-party libraries, inline dynamic styles).
 * 
 * IMPORTANT: These should match the CSS variables in index.css
 * When updating colors, update both files.
 */
// ============================================
// PRIMARY COLORS
// ============================================
export const COLORS = {
 // Primary palette (single brand color)
 primary: {
 amethyst: '#6B46C1',
 coral: '#F97316',
 plum: '#7C2D92',
 indigo: '#6366f1'
 },
 // Secondary palette (semantic only: success + warning)
 secondary: {
 amber: '#F59E0B',
 rose: '#EC4899',
 sage: '#10B981'
 },
 // Accent colors (amethyst family only)
 accent: {
 light: '#8b5cf6',
 default: '#6B46C1',
 hover: '#553c9a',
 alt: '#F59E0B',
 altHover: '#d97706'
 },
 // Semantic colors
 success: '#22c55e',
 warning: '#f59e0b',
 error: '#ef4444',
 info: '#3b82f6',
 // Text colors
 text: {
 dark: '#171923', // Deep, high contrast (was #1f2937)
 medium: '#4A5568', // Readable AA standard (was #4b5563)
 light: '#595959', // Darkened for legibility (was #6b7280)
 muted: '#64748b', // Slate 500 - Passes WCAG AA (was #94a3b8)
 },
 // Base colors
 white: '#ffffff',
 black: '#000000'
} as const;
// ============================================
// CATEGORY COLORS (for Home.tsx categories)
// ============================================
export const CATEGORY_COLORS = {
 cloud: COLORS.info, // #3b82f6 - blue
 data: COLORS.accent.light, // #8b5cf6 - purple
 dev: COLORS.secondary.sage, // #10b981 - green
 security: COLORS.error, // #ef4444 - red
 business: COLORS.secondary.amber, // #f59e0b - amber
} as const;
// ============================================
// DIFFICULTY COLORS (for Home.tsx difficulty badges)
// ============================================
export const DIFFICULTY_COLORS = {
 Beginner: COLORS.success, // #22c55e - green
 Intermediate: COLORS.warning, // #f59e0b - amber
 Advanced: COLORS.error, // #ef4444 - red
 Expert: COLORS.accent.light, // #8b5cf6 - purple
} as const;
// ============================================
// CONFETTI COLORS (for CelebrationModal.tsx)
// ============================================
export const CONFETTI_COLORS = [
 COLORS.secondary.amber, // #fbbf24 -> using amber
 COLORS.info, // #3b82f6
 COLORS.success, // #22c55e
 COLORS.secondary.rose, // #f43f5e -> using rose
 COLORS.accent.light, // #8b5cf6
 '#06b6d4', // cyan (not in main palette, keeping for variety)
] as const;
// ============================================
// MAP/MARKER COLORS (for RouteBuilder.tsx)
// ============================================
export const MAP_COLORS = {
 markerText: COLORS.text.dark, // #1f2937
 polylineStroke: COLORS.secondary.amber, // #F59E0B
} as const;
// ============================================
// ICON COLORS (for QuizMode.tsx feedback icons)
// ============================================
export const FEEDBACK_COLORS = {
 correct: COLORS.success, // #22c55e
 incorrect: COLORS.error, // #ef4444
} as const;
// ============================================
// ICON COLORS (for SensaIcon component)
// ============================================
export const ICON_COLORS = {
 default: COLORS.accent.default, // #6B46C1 - primary amethyst
 accent: COLORS.accent.light, // #8b5cf6 - lighter purple
 success: COLORS.success, // #22c55e - green
 warning: COLORS.warning, // #f59e0b - amber
 error: COLORS.error, // #ef4444 - red
 muted: COLORS.text.muted, // #94a3b8 - gray
} as const;
// ============================================
// LIFECYCLE COLORS (for LifecycleNavigator.tsx)
// ============================================
export const LIFECYCLE_COLORS = {
 phase1: { bg: '#DBEAFE', fill: '#3B82F6', text: '#1E40AF' }, // Blue
 phase2: { bg: '#FEF3C7', fill: '#F59E0B', text: '#92400E' }, // Amber
 phase3: { bg: '#D1FAE5', fill: '#10B981', text: '#065F46' }, // Green
} as const;
// ============================================
// GRAPH COLORS (for Results.tsx & GraphView)
// ============================================
export const GRAPH_COLORS = {
 root: COLORS.secondary.sage, // #10b981
 trunk: COLORS.accent.light, // #8b5cf6
 leaf: COLORS.secondary.amber, // #f59e0b
} as const;
export const GRAPH_COLORS_SCHOLARLY = {
 root: '#475569',
 trunk: '#3b4f6b',
 leaf: '#2c3e5a'
} as const;
export function getGraphColors(): { root: string; trunk: string; leaf: string } {
 if (typeof document !== 'undefined') {
 const theme = document.documentElement.getAttribute('data-visual-theme');
 if (theme === 'scholarly') return GRAPH_COLORS_SCHOLARLY;
 }
 return GRAPH_COLORS;
}
// ============================================
// MOOD COLORS (for SessionStartModal.tsx)
// ============================================
export const MOOD_COLORS = {
 energized: COLORS.secondary.amber, // #F59E0B - Amber
 neutral: COLORS.info, // #3b82f6 - Blue (adjusted for consistency)
 tired: COLORS.text.muted, // #64748b - Slate
 stressed: '#64748b', // Slate - calming, not cortisol-triggering
} as const;
// ============================================
// SCORE COLORS (for ScoreCard.tsx)
// ============================================
export const SCORE_COLORS = {
 good: COLORS.secondary.sage, // #10B981 - Sage green
 warning: COLORS.secondary.amber, // #F59E0B - Warm amber
 neutral: COLORS.info, // #3b82f6 - Calm blue
} as const;
// ============================================
// TEXT STROKE COLORS (for graph labels with outlines)
// ============================================
export const TEXT_STROKE = {
 dark: 'rgba(0, 0, 0, 0.8)', // Dark stroke for white text on dark backgrounds
 light: 'rgba(255, 255, 255, 0.8)', // Light stroke for dark text on light backgrounds
} as const;
// ============================================
// HELPER: Get CSS variable value at runtime
// ============================================
export function getCSSVariable(name: string): string {
 if (typeof document === 'undefined') return '';
 return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
// ============================================
// HELPER: Generate rgba from hex
// ============================================
export function hexToRgba(hex: string, alpha: number): string {
 const r = parseInt(hex.slice(1, 3), 16);
 const g = parseInt(hex.slice(3, 5), 16);
 const b = parseInt(hex.slice(5, 7), 16);
 return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}