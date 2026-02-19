/**
 * MasteryChallenge - Legacy Stub
 * This component has been replaced by the unified flow VERIFY phase.
 * Kept as a stub to avoid breaking existing imports.
 */

import type { LearningConcept } from '@/shared/types/learning';

interface MasteryChallengeProps {
    concepts: LearningConcept[];
    onComplete: (passed: boolean) => void;
}

export default function MasteryChallenge({ onComplete }: MasteryChallengeProps) {
    return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Mastery Challenge</h2>
            <p>This activity has been replaced by the unified flow VERIFY phase.</p>
            <p>Please use the main learning flow to access verification activities.</p>
            <button 
                onClick={() => onComplete(false)}
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
                Go Back
            </button>
        </div>
    );
}
