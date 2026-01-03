import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, BookOpen, Zap, Unlock } from 'lucide-react';
import type { LearningConcept } from '@/lib/types/learning';
import styles from './CinematicView.module.css';

export interface CinematicViewProps {
    concept: LearningConcept;
    onClose: () => void;
}

/**
 * CinematicView - A "Zero UI" focus mode for learning a concept.
 * 
 * Replaces standard tooltips with a full-screen, progressive disclosure experience.
 * Steps:
 * 1. Focus: Background blurs, rest of UI disappears.
 * 2. Hook: Emoji + Anchor + "What is this?"
 * 3. Story: Interactive reveal of the mnemonic.
 * 4. Deep Dive: Technical details on demand.
 */
export function CinematicView({ concept, onClose }: CinematicViewProps) {
    const [step, setStep] = useState<'hook' | 'story' | 'details'>('hook');
    const [isRevealing, setIsRevealing] = useState(false);

    // Reset state when concept changes
    useEffect(() => {
        setStep('hook');
        setIsRevealing(false);
    }, [concept.id]);

    // Extract mnemonic data
    const mnemonic = concept.mnemonic;
    const emoji = mnemonic?.anchor?.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u)?.[0] || '📦';
    const anchorName = mnemonic?.anchor?.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim() || concept.name;

    const handleReveal = () => {
        setIsRevealing(true);
        setTimeout(() => {
            setStep('story');
            setIsRevealing(false);
        }, 600);
    };

    return (
        <div className={styles.container}>
            {/* Backdrop Blur */}
            <motion.div
                className={styles.backdrop}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />

            {/* Main Content Stage */}
            <div className={styles.stage}>
                <AnimatePresence mode="wait">
                    {/* Step 1 & 2: Hook & Story */}
                    {(step === 'hook' || step === 'story') && (
                        <motion.div
                            key="card"
                            className={styles.card}
                            layoutId={`concept-${concept.id}`}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <button className={styles.closeButton} onClick={onClose}>
                                <X size={24} />
                            </button>

                            {/* Hero Section */}
                            <div className={styles.heroSection}>
                                <motion.div
                                    className={styles.emojiHero}
                                    layoutId={`emoji-${concept.id}`}
                                >
                                    {emoji}
                                </motion.div>
                                <motion.h2 className={styles.anchorTitle}>
                                    {anchorName}
                                </motion.h2>
                                <span className={styles.tierBadge} data-tier={mnemonic?.tier}>
                                    {mnemonic?.tier || 'Concept'}
                                </span>
                            </div>

                            {/* Content Body */}
                            <div className={styles.contentBody}>
                                {step === 'hook' ? (
                                    <div className={styles.hookView}>
                                        <p className={styles.mysteryText}>
                                            What does this represent?
                                        </p>
                                        <div className={styles.blurredConcept}>
                                            {concept.name}
                                        </div>
                                        <button
                                            className={`${styles.actionButton} ${isRevealing ? styles.revealing : ''}`}
                                            onClick={handleReveal}
                                            disabled={isRevealing}
                                        >
                                            {isRevealing ? (
                                                <>Connecting Neurons...</>
                                            ) : (
                                                <>
                                                    <Unlock size={20} />
                                                    Reveal Memory
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ) : (
                                    <div className={styles.storyView}>
                                        <motion.div
                                            className={styles.storyContainer}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <p className={styles.storyText}>"{mnemonic?.story}"</p>

                                            <div className={styles.connectionLine}>
                                                <Zap size={16} className={styles.zapIcon} />
                                                <span>Connects to: <strong>{mnemonic?.parentName || 'Root Concept'}</strong></span>
                                            </div>

                                            <div className={styles.revealBanner}>
                                                <span>Means:</span>
                                                <h3>{concept.name}</h3>
                                            </div>
                                        </motion.div>

                                        <button
                                            className={styles.secondaryButton}
                                            onClick={() => setStep('details')}
                                        >
                                            <BookOpen size={18} />
                                            View Technical Details
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Technical Details */}
                    {step === 'details' && (
                        <motion.div
                            key="details"
                            className={styles.detailsPanel}
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                        >
                            <button className={styles.backButton} onClick={() => setStep('story')}>
                                <ChevronRight size={24} /> Back
                            </button>

                            <div className={styles.detailsContent}>
                                <h2>{concept.name}</h2>
                                <p className={styles.description}>{concept.metaphor}</p>

                                <div className={styles.section}>
                                    <h3>Phase 1: Foundation</h3>
                                    <ul>
                                        {concept.lifecycle?.phase1?.steps?.map((item, i) => (
                                            <li key={i}>{item}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className={styles.section}>
                                    <h3>Phase 2: Application</h3>
                                    <ul>
                                        {concept.lifecycle?.phase2?.steps?.map((item, i) => (
                                            <li key={i}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
