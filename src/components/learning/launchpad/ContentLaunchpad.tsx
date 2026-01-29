import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Play,
    AlertCircle,
    Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { storageManager } from '@/features/content-storage';
import { parseGeneratedContent } from '@/features/content-generation/parsers';
import type { SavedResult } from '@/features/content-storage/types';
import { validateConceptContent, type VerifiableConcept } from '@/features/content-generation/validators/content-quality';

import styles from './ContentLaunchpad.module.css';

export default function ContentLaunchpad() {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();

    const [result, setResult] = useState<SavedResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch Data
    useEffect(() => {
        const loadData = async () => {
            if (!subjectId) return;
            try {
                const data = await storageManager.loadResult(subjectId);
                if (data) {
                    setResult(data);
                    
                    // Parse content to get concepts
                    const parseResult = parseGeneratedContent(data.fullDocument);
                    const loadedConcepts = parseResult.success && parseResult.data ? parseResult.data.concepts : [];

                    // Validate concepts for monitoring (log gaps but don't repair)
                    const allGaps = loadedConcepts.flatMap(c => validateConceptContent(c as unknown as VerifiableConcept));
                    const criticalGaps = allGaps.filter(g => g.severity === 'critical');

                    if (criticalGaps.length > 0) {
                        console.warn('[Content Quality Monitor] Critical gaps detected:', criticalGaps);
                        // Note: Gaps should be fixed during generation, not here
                    }
                } else {
                    setError('Content not found');
                }
            } catch (err) {
                setError('Failed to load content');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [subjectId]);

    // Handlers
    const handleStartLearning = () => {
        navigate(`/study/${subjectId}?tab=learn`);
    };

    if (loading) {
        return (
            <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        style={{ marginBottom: '1rem' }}
                    >
                        <Sparkles size={32} className={styles.loadingIcon} />
                    </motion.div>
                    <p style={{ fontSize: '1rem', fontWeight: 500 }}>Preparing your dashboard...</p>
                </motion.div>
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        textAlign: 'center',
                        color: 'var(--color-text-secondary)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem'
                    }}
                >
                    <AlertCircle size={40} style={{ color: 'var(--color-warning)' }} />
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                        {error || 'Content Not Found'}
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: '300px' }}>
                        {error ? 'We couldn\'t load this content. Please try again.' : 'This content is no longer available.'}
                    </p>
                    <button onClick={() => navigate('/library')} className={styles.backButton} style={{ marginTop: '0.5rem' }}>
                        <ArrowLeft size={16} /> Back to Library
                    </button>
                </motion.div>
            </div>
        );
    }

    // Analytics feature coming soon - show basic launch interface
    return (
        <div className={styles.container}>
            {/* HEADER */}
            <header className={styles.header}>
                <div className={styles.titleGroup}>
                    <button onClick={() => navigate('/library')} className={styles.backButton}>
                        <ArrowLeft size={16} /> Library
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h1>{result.subject}</h1>
                        <button
                            onClick={() => navigate(`/view/${subjectId}`)}
                            className={styles.backButton}
                            style={{ fontSize: '0.75rem', color: 'var(--color-accent-light)' }}
                            title="View formatted readable document"
                        >
                            (View Document)
                        </button>
                    </div>
                </div>
                <button
                    onClick={handleStartLearning}
                    className={styles.startButton}
                    style={{
                        background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Play size={18} /> Start Learning
                </button>
            </header>

            {/* ANALYTICS COMING SOON */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center',
                gap: '1.5rem'
            }}>
                <Sparkles size={64} style={{ color: 'var(--color-accent)', opacity: 0.6 }} />
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Analytics Dashboard Coming Soon</h2>
                <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', maxWidth: '500px', margin: 0 }}>
                    We're building a comprehensive analytics dashboard to show content quality metrics, 
                    tier distribution, and learning insights. For now, click "Start Learning" above to begin your session.
                </p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button
                        onClick={() => navigate(`/view/${subjectId}`)}
                        className={styles.backButton}
                        style={{ padding: '0.75rem 1.5rem' }}
                    >
                        View Document
                    </button>
                    <button
                        onClick={handleStartLearning}
                        className={styles.startButton}
                        style={{
                            background: 'var(--color-accent)',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <Play size={18} /> Start Learning
                    </button>
                </div>
            </div>
        </div>
    );
}
