/**
 * DiagnosticLaunchSystem - Legacy Stub
 * This component is not part of the unified flow.
 * Kept as a stub to avoid breaking existing imports.
 */

import type { SensaAILearningConcept } from '@/features/content-generation/parsers/transformer';

interface DiagnosticLaunchSystemProps {
    concepts: SensaAILearningConcept[];
    domain: string;
    diagnosticReady: boolean;
    onStartLearning: () => void;
    onDiagnosticComplete: (results: any) => void;
}

export default function DiagnosticLaunchSystem({ onStartLearning }: DiagnosticLaunchSystemProps) {
    return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Diagnostic System</h2>
            <p>This feature is not part of the unified flow.</p>
            <button 
                onClick={onStartLearning}
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
                Skip to Learning
            </button>
        </div>
    );
}
