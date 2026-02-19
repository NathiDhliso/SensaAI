/**
 * SessionScoutPreview - Legacy Stub
 * This component has been replaced by the unified flow ORIENT phase.
 * Kept as a stub to avoid breaking existing imports.
 */

import type { LearningConcept } from '@/shared/types/learning';

interface SessionScoutPreviewProps {
    concepts: LearningConcept[];
    initialPhase?: string;
    onComplete: (guesses: Map<string, string>) => void;
}

export function SessionScoutPreview({ onComplete }: SessionScoutPreviewProps) {
    return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Session Scout</h2>
            <p>This component has been replaced by the unified flow ORIENT phase.</p>
            <button 
                onClick={() => onComplete(new Map())}
                style={{
                    padding: '1rem 2rem',
                    marginTop: '2rem',
                    background: 'var(--primary-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                }}
            >
                Continue
            </button>
        </div>
    );
}

export default SessionScoutPreview;
