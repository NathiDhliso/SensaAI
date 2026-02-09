import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Map,
    MessageCircle,
    Trophy,
    AlertTriangle,
    Play,
    CheckCircle,
    RefreshCw,
} from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import ConceptMapBuilder from '@/components/learning/activities/ConceptMapBuilder';
import { PeerReviewActivity } from '@/components/learning/activities/PeerReviewActivity';
import MasteryChallenge from '@/components/learning/activities/MasteryChallenge';
import PreMortemActivity from '@/components/learning/activities/PreMortemActivity';
import styles from './GymActivityLauncher.module.css';

export type GymActivity = 'concept-map' | 'peer-review' | 'mastery' | 'pre-mortem';

interface GymActivityLauncherProps {
    activity: GymActivity;
    concepts: LearningConcept[];
    onBack: () => void;
}

const ACTIVITY_META: Record<GymActivity, { label: string; icon: React.ReactNode; needsConcept: boolean; description: string }> = {
    'concept-map': {
        label: 'Concept Map',
        icon: <Map size={20} />,
        needsConcept: false,
        description: 'Build connections between ideas',
    },
    'peer-review': {
        label: 'Peer Review',
        icon: <MessageCircle size={20} />,
        needsConcept: true,
        description: 'Defend your understanding against a simulated peer',
    },
    'mastery': {
        label: 'Mastery Challenge',
        icon: <Trophy size={20} />,
        needsConcept: false,
        description: 'Prove deep understanding across multiple concepts',
    },
    'pre-mortem': {
        label: 'Pre-Mortem',
        icon: <AlertTriangle size={20} />,
        needsConcept: true,
        description: 'Find the failure before it happens',
    },
};

const TIER_COLORS: Record<string, string> = {
    root: 'var(--color-root, #ef4444)',
    trunk: 'var(--color-trunk, #f59e0b)',
    leaf: 'var(--color-leaf, #22c55e)',
};

type LauncherPhase = 'pick' | 'active' | 'result';

export default function GymActivityLauncher({ activity, concepts, onBack }: GymActivityLauncherProps) {
    const navigate = useNavigate();
    const { subjectId } = useParams<{ subjectId: string }>();
    const meta = ACTIVITY_META[activity];

    const [phase, setPhase] = useState<LauncherPhase>(meta.needsConcept ? 'pick' : 'active');
    const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
    const [result, setResult] = useState<{ passed: boolean } | null>(null);

    const selectedConcept = concepts.find(c => c.id === selectedConceptId) || null;

    const grouped = meta.needsConcept ? groupByTier(concepts) : null;

    const handleLaunch = useCallback(() => {
        if (meta.needsConcept && !selectedConceptId) return;
        setPhase('active');
    }, [meta.needsConcept, selectedConceptId]);

    const handleComplete = useCallback((passed: boolean) => {
        setResult({ passed });
        setPhase('result');
    }, []);

    const handleRetry = useCallback(() => {
        setResult(null);
        setPhase(meta.needsConcept ? 'pick' : 'active');
        setSelectedConceptId(null);
    }, [meta.needsConcept]);

    const handleBackToGym = useCallback(() => {
        if (subjectId) {
            navigate(`/launchpad/${subjectId}`);
        } else {
            onBack();
        }
    }, [subjectId, navigate, onBack]);

    const renderPicker = () => {
        if (!grouped) return null;

        return (
            <div className={styles.pickerContainer}>
                <h2 className={styles.pickerTitle}>{meta.label}</h2>
                <p className={styles.pickerSubtitle}>{meta.description} — pick a concept to practice</p>

                {(['root', 'trunk', 'leaf'] as const).map(tier => {
                    const items = grouped[tier];
                    if (!items || items.length === 0) return null;
                    return (
                        <div key={tier} className={styles.tierGroup}>
                            <span className={styles.tierLabel}>{tier} ({items.length})</span>
                            <div className={styles.conceptGrid}>
                                {items.map(c => (
                                    <button
                                        key={c.id}
                                        className={`${styles.conceptOption} ${selectedConceptId === c.id ? styles.conceptOptionSelected : ''}`}
                                        onClick={() => setSelectedConceptId(c.id)}
                                    >
                                        <span className={styles.conceptDot} style={{ background: TIER_COLORS[tier] }} />
                                        <span className={styles.conceptOptionName}>{c.name}</span>
                                        <span className={styles.conceptOptionTier}>{tier}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}

                <button
                    className={styles.launchButton}
                    disabled={!selectedConceptId}
                    onClick={handleLaunch}
                >
                    <Play size={16} />
                    Start {meta.label}
                </button>
            </div>
        );
    };

    const renderActivity = () => {
        switch (activity) {
            case 'concept-map':
                return (
                    <ConceptMapBuilder
                        concepts={concepts}
                        onComplete={() => handleComplete(true)}
                        mode="free"
                    />
                );

            case 'peer-review':
                if (!selectedConcept) return null;
                return (
                    <PeerReviewActivity
                        concept={selectedConcept}
                        allConcepts={concepts}
                        onComplete={(success: boolean) => handleComplete(success)}
                    />
                );

            case 'mastery':
                return (
                    <MasteryChallenge
                        concepts={concepts}
                        onComplete={(passed: boolean) => handleComplete(passed)}
                    />
                );

            case 'pre-mortem':
                if (!selectedConcept) return null;
                return (
                    <PreMortemActivity
                        concept={selectedConcept}
                        onComplete={(success: boolean) => handleComplete(success)}
                    />
                );

            default:
                return null;
        }
    };

    const renderResult = () => {
        if (!result) return null;
        const passed = result.passed;

        return (
            <div className={styles.resultContainer}>
                <div className={`${styles.resultIcon} ${passed ? styles.resultIconSuccess : styles.resultIconFail}`}>
                    {passed ? <CheckCircle size={28} /> : <AlertTriangle size={28} />}
                </div>
                <h3 className={styles.resultTitle}>
                    {passed ? 'Well Done!' : 'Keep Practicing'}
                </h3>
                <p className={styles.resultMessage}>
                    {passed
                        ? `You completed the ${meta.label} activity successfully.`
                        : `This ${meta.label} needs more work. Review the concept and try again.`
                    }
                </p>
                <div className={styles.resultActions}>
                    <button className={styles.resultActionPrimary} onClick={handleRetry}>
                        <RefreshCw size={14} /> Try Again
                    </button>
                    <button className={styles.resultActionSecondary} onClick={handleBackToGym}>
                        <ArrowLeft size={14} /> Back to Gym
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.backButton} onClick={phase === 'active' ? () => setPhase(meta.needsConcept ? 'pick' : 'result') : handleBackToGym}>
                        <ArrowLeft size={14} />
                        {phase === 'active' ? 'Cancel' : 'Back to Gym'}
                    </button>
                    <span className={styles.activityTitle}>
                        {meta.icon}
                        {meta.label}
                    </span>
                </div>
            </div>

            <div className={styles.activityContent}>
                {phase === 'pick' && renderPicker()}
                {phase === 'active' && renderActivity()}
                {phase === 'result' && renderResult()}
            </div>
        </div>
    );
}

function groupByTier(concepts: LearningConcept[]): Record<string, LearningConcept[]> {
    const groups: Record<string, LearningConcept[]> = { root: [], trunk: [], leaf: [] };
    for (const c of concepts) {
        const tier = c.tier || 'leaf';
        if (!groups[tier]) groups[tier] = [];
        groups[tier].push(c);
    }
    return groups;
}
