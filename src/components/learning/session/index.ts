export { SessionSummary } from './SessionSummary';

// Stub exports for compatibility
export const MOOD_GOAL_MAP: Record<string, { storeMood: string }> = {
    pumped: { storeMood: 'pumped' },
    good: { storeMood: 'good' },
    okay: { storeMood: 'okay' },
    struggling: { storeMood: 'struggling' },
    tired: { storeMood: 'tired' }
};

export const SessionStartModal = (_props: any) => null;
