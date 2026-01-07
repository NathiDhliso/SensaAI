/**
 * Application-wide configuration constants
 */



// Common Types
export interface Coordinates {
    lat: number;
    lng: number;
}

export const CONCEPT_LIMITS = {
    subject: { min: 50, max: 75 },
    // CHANGE THIS: Match the subject limits. Do not throttle the data.
    feature: { min: 40, max: 60 },
    topic: { min: 10, max: 20 }
};

// ============================================
// SENSA Method™ - Learning Phase Definitions
// See → Explore → Note → Study → Apply
// ============================================
export const SENSA_PHASES = {
    see: {
        id: 'see',
        number: 0,
        name: 'See',
        fullName: 'SENSA Phase 0: See',
        description: 'Look at what you\'ll learn and set your intention',
        icon: '👁️',
        color: 'var(--color-primary-amethyst)',
    },
    explore: {
        id: 'explore',
        number: 1,
        name: 'Explore',
        fullName: 'SENSA Phase 1: Explore',
        description: 'Discover the content and recognize patterns',
        icon: '🧭',
        color: 'var(--color-info)',
        subPhases: [
            { id: 'scout', name: 'Scout the Territory', description: 'Build a mental skeleton' },
            { id: 'preview', name: 'Problem Preview', description: 'See what "done" looks like' }
        ]
    },
    note: {
        id: 'note',
        number: 2,
        name: 'Note',
        fullName: 'SENSA Phase 2: Note',
        description: 'Capture what matters and build your knowledge web',
        icon: '📝',
        color: 'var(--color-secondary-amber)',
    },
    study: {
        id: 'study',
        number: 3,
        name: 'Study',
        fullName: 'SENSA Phase 3: Study',
        description: 'Deep dive, practice, and reconstruct from memory',
        icon: '📚',
        color: 'var(--color-secondary-sage)',
        subPhases: [
            { id: 'make-real', name: 'Make It Real', description: 'Convert understanding into skill' },
            { id: 'keep-strong', name: 'Keep It Strong', description: 'Make memories permanent' }
        ]
    },
    apply: {
        id: 'apply',
        number: 4,
        name: 'Apply',
        fullName: 'SENSA Phase 4: Apply',
        description: 'Use it in real life and prove mastery',
        icon: '✅',
        color: 'var(--color-success)',
        subPhases: [
            { id: 'mastery', name: 'Prove Mastery', description: 'Test in new situations' }
        ]
    },
} as const;

export type SensaPhaseKey = keyof typeof SENSA_PHASES;

// SENSA Method™ Tagline
export const SENSA_TAGLINE = 'See. Explore. Note. Study. Apply.';
export const SENSA_METHOD_NAME = 'The SENSA Method™';
