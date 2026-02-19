export { SessionSummary } from './SessionSummary';
export { default as SessionScoutPreview } from './SessionScoutPreview'; // Legacy stub

// Legacy exports removed - using unified flow
// export { default as SessionStartModal, MOOD_GOAL_MAP } from './SessionStartModal';
// export { default as VelocityLockInGate } from './VelocityLockInGate';

// Stub exports for compatibility
export const MOOD_GOAL_MAP: Record<string, { storeMood: string }> = {
    pumped: { storeMood: 'pumped' },
    good: { storeMood: 'good' },
    okay: { storeMood: 'okay' },
    struggling: { storeMood: 'struggling' },
    tired: { storeMood: 'tired' }
};

export const SessionStartModal = (_props: any) => null;
