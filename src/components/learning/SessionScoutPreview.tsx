
/**
 * SessionScoutPreview Component
 * 
 * Implements Phase 1 (Scout the Territory) and Phase 1.5 (The Problem Preview)
 * of the Silver Bullet Study System.
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Map as MapIcon,
    HelpCircle,
    ChevronRight,
    Search,
    Target,
    ArrowRight,
    TrendingUp,
    AlertCircle
} from 'lucide-react';
import type { LearningConcept } from '@/lib/types/learning';
import { renderShapeOrIcon } from '@/components/ui/SensaShape';
import styles from './SessionScoutPreview.module.css';

interface SessionScoutPreviewProps {
    concepts: LearningConcept[];
    initialPhase?: 'scout' | 'preview';
    onComplete: () => void;
}

export function SessionScoutPreview({ concepts, initialPhase = 'scout', onComplete }: SessionScoutPreviewProps) {
    const [phase, setPhase] = useState<'scout' | 'preview'>(initialPhase);
    const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');

    // Group concepts by phase for "Scout" view
    const conceptsByPhase = useMemo(() => {
        const grouped: Record<string, LearningConcept[]> = {};
        concepts.forEach(c => {
            const phase = c.lifecycle?.phase1?.title || 'Uncategorized';
            if (!grouped[phase]) grouped[phase] = [];
            grouped[phase].push(c);
        });
        return grouped;
    }, [concepts]);

    // Extract potential questions for "Preview" view
    // In a real app, these would come from metadata. We simulate them if missing.
    const previewQuestions = useMemo(() => {
        return concepts.slice(0, 3).map(c => ({
            conceptId: c.id,
            conceptName: c.name,
            question: `How does ${c.name} change when constraints are tightened?`,
            type: 'Prediction'
        }));
    }, [concepts]);

    return (
        <div className={styles.container}>
            <AnimatePresence mode="wait">
                {phase === 'scout' ? (
                    <motion.div
                        key="scout"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className={styles.phaseContainer}
                    >
                        <div className={styles.header}>
                            <div className={styles.headerIcon}>
                                <MapIcon size={32} />
                            </div>
                            <div>
                                <h2 className={styles.title}>Phase 1: Scout the Territory</h2>
                                <p className={styles.subtitle}>
                                    Don't memorize yet. Just look for the logical flow and "big ideas".
                                </p>
                            </div>
                        </div>

                        <div className={styles.scoutContent}>
                            <div className={styles.viewTabs}>
                                <button
                                    className={`${styles.tab} ${activeTab === 'list' ? styles.activeTab : ''}`}
                                    onClick={() => setActiveTab('list')}
                                >
                                    Concept List
                                </button>
                                <button
                                    className={`${styles.tab} ${activeTab === 'map' ? styles.activeTab : ''}`}
                                    onClick={() => setActiveTab('map')}
                                >
                                    Dependency Map
                                </button>
                            </div>

                            {activeTab === 'list' ? (
                                <div className={styles.conceptList}>
                                    {Object.entries(conceptsByPhase).map(([phaseName, phaseConcepts]) => (
                                        <div key={phaseName} className={styles.conceptGroup}>
                                            <h3 className={styles.groupTitle}>{phaseName}</h3>
                                            <div className={styles.cardGrid}>
                                                {phaseConcepts.map(c => (
                                                    <div key={c.id} className={styles.conceptCard}>
                                                        <div className={styles.conceptIcon}>
                                                            {renderShapeOrIcon(c.icon, 'sm')}
                                                        </div>
                                                        <span className={styles.conceptName}>{c.name}</span>
                                                        <span className={styles.conceptTier}>{c.mnemonic?.tier || 'Utility'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.mapView}>
                                    <div className={styles.mapPlaceholder}>
                                        <Search size={48} />
                                        <p>Dependency Graph Visualization would go here.</p>
                                        <p className={styles.hint}>Trace the arrows to see how concepts connect.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.actionFooter}>
                            <div className={styles.hintBox}>
                                <Target size={18} />
                                <span>Tip: Ask yourself "Why does {concepts[1]?.name || 'Concept B'} follow {concepts[0]?.name || 'Concept A'}?"</span>
                            </div>
                            <button className={styles.primaryButton} onClick={() => setPhase('preview')}>
                                Go to Phase 1.5: Preview
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="preview"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={styles.phaseContainer}
                    >
                        <div className={styles.header}>
                            <div className={styles.headerIcon}>
                                <HelpCircle size={32} />
                            </div>
                            <div>
                                <h2 className={styles.title}>Phase 1.5: The Problem Preview</h2>
                                <p className={styles.subtitle}>
                                    Prime your brain by looking at problems <em>before</em> you know how to solve them.
                                </p>
                            </div>
                        </div>

                        <div className={styles.previewContent}>
                            <div className={styles.alertBox}>
                                <AlertCircle size={20} />
                                <span><strong>Don't solve these yet!</strong> Just ask: "What would I need to know to answer this?"</span>
                            </div>

                            <div className={styles.questionsList}>
                                {previewQuestions.map((q, idx) => (
                                    <div key={idx} className={styles.questionCard}>
                                        <div className={styles.questionHeader}>
                                            <span className={styles.questionType}>{q.type}</span>
                                            <span className={styles.relatedConcept}>{q.conceptName}</span>
                                        </div>
                                        <p className={styles.questionText}>{q.question}</p>
                                        <div className={styles.reflectionInput}>
                                            <input type="text" placeholder="What concepts seem confusing here?" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.actionFooter}>
                            <div className={styles.hintBox}>
                                <TrendingUp size={18} />
                                <span>Now your brain has "shelves" to store the answers.</span>
                            </div>
                            <button className={styles.primaryButton} onClick={onComplete}>
                                Start Phase 2: Build the Web
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default SessionScoutPreview;
