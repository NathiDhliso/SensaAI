/**
 * MapReconstructionTest Component
 * 
 * Implements SENSA Phase 3: Study (Map Reconstruction Mode).
 * Users must rebuild their concept map from memory and compare it with the original.
 */
import { useState, useMemo } from 'react';
import {
    CheckCircle2,
    Eye,
    EyeOff,
    Brain
} from 'lucide-react';
import ConceptMapBuilder from './ConceptMapBuilder';
import type { LearningConcept, ConceptMapData } from '@/lib/types/learning';
import styles from './MapReconstructionTest.module.css';

interface MapReconstructionTestProps {
    concepts: LearningConcept[];
    originalMap: ConceptMapData | null;
    onComplete: (success: boolean) => void;
}

export default function MapReconstructionTest({
    concepts,
    originalMap,
    onComplete
}: MapReconstructionTestProps) {
    const [phase, setPhase] = useState<'build' | 'compare'>('build');
    const [userMap, setUserMap] = useState<ConceptMapData | null>(null);
    const [showingOriginal, setShowingOriginal] = useState(false);

    const handleBuildComplete = (data: ConceptMapData) => {
        setUserMap(data);
        setPhase('compare');
    };

    // Calculate a simple match score
    const matchScore = useMemo(() => {
        if (!userMap || !originalMap) return 0;

        let score = 0;
        const totalConnections = originalMap.connections.length;
        if (totalConnections === 0) return 100; // Edge case

        userMap.connections.forEach(uConn => {
            const match = originalMap.connections.find(
                oConn => oConn.fromId === uConn.fromId && oConn.toId === uConn.toId
            );
            if (match) score++;
        });

        return Math.round((score / totalConnections) * 100);
    }, [userMap, originalMap]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.headerIcon}>
                        <Brain size={24} />
                    </div>
                    <div>
                        <h2 className={styles.title}>
                            {phase === 'build' ? 'Restructure the Web' : 'Compare Your Mental Model'}
                        </h2>
                        <p className={styles.subtitle}>
                            {phase === 'build'
                                ? 'Recreate the concept map you built earlier from memory.'
                                : `You recalled ${matchScore}% of your original connections.`}
                        </p>
                    </div>
                </div>

                {phase === 'compare' && (
                    <div className={styles.headerActions}>
                        <button
                            className={styles.toggleButton}
                            onClick={() => setShowingOriginal(!showingOriginal)}
                        >
                            {showingOriginal ? <EyeOff size={16} /> : <Eye size={16} />}
                            {showingOriginal ? 'View My Map' : 'View Original Map'}
                        </button>
                        <button
                            className={styles.completeButton}
                            onClick={() => onComplete(true)}
                        >
                            Complete
                            <CheckCircle2 size={16} />
                        </button>
                    </div>
                )}
            </div>

            <div className={styles.comparisonContainer}>
                {phase === 'build' ? (
                    <ConceptMapBuilder
                        concepts={concepts}
                        onComplete={handleBuildComplete}
                    />
                ) : (
                    <div className={styles.comparisonContainer}>
                        <ConceptMapBuilder
                            concepts={concepts}
                            initialData={showingOriginal ? originalMap : userMap}
                            readOnly={true}
                            key={showingOriginal ? 'original' : 'user'}
                        />
                        <div className={styles.viewLabel}>
                            <span className={showingOriginal ? styles.original : ''}>
                                {showingOriginal ? 'Viewing: Original Plan' : 'Viewing: Your Memory'}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
