/**
 * TierExplainer Component
 * 
 * Visual diagram explaining the 3-tier concept hierarchy:
 * Foundation → Keystone → Utility
 * 
 * Shown as an onboarding modal or tooltip during Explore phase.
 */

import { motion } from 'framer-motion';
import { Layers, Gem, Wrench, X, ArrowDown } from 'lucide-react';
import { TIER_CONFIG } from '@/lib/content-adapter/validate-tier-progression';
import styles from './TierExplainer.module.css';

// ============================================================================
// Types
// ============================================================================

interface TierExplainerProps {
    onDismiss: () => void;
    compact?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function TierExplainer({ onDismiss, compact = false }: TierExplainerProps) {
    const tiers = [
        {
            id: 'foundation',
            label: 'Foundation',
            icon: <Layers size={24} />,
            color: TIER_CONFIG.foundation.color,
            description: 'Core concepts that support many others',
            outdegree: '≥ 5 concepts depend on these',
            example: 'Variables, Data Types, Functions',
        },
        {
            id: 'keystone',
            label: 'Keystone',
            icon: <Gem size={24} />,
            color: TIER_CONFIG.keystone.color,
            description: 'Connecting concepts that bridge foundations',
            outdegree: '2-4 concepts depend on these',
            example: 'Loops, Conditionals, Objects',
        },
        {
            id: 'utility',
            label: 'Utility',
            icon: <Wrench size={24} />,
            color: TIER_CONFIG.utility.color,
            description: 'Polish & optimization concepts',
            outdegree: '0-1 concepts depend on these',
            example: 'Shortcuts, Best Practices, Edge Cases',
        },
    ];

    if (compact) {
        return (
            <div className={styles.compactContainer}>
                {tiers.map(tier => (
                    <div
                        key={tier.id}
                        className={styles.compactTier}
                        style={{ '--tier-color': tier.color } as React.CSSProperties}
                    >
                        {tier.icon}
                        <span>{tier.label}</span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className={styles.container}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className={styles.header}>
                    <h2>Understanding Concept Tiers</h2>
                    <button className={styles.closeButton} onClick={onDismiss}>
                        <X size={20} />
                    </button>
                </div>

                <p className={styles.intro}>
                    Concepts are organized into three tiers based on how many other concepts depend on them.
                    Master foundations first, then keystones, then utilities.
                </p>

                <div className={styles.tierList}>
                    {tiers.map((tier, index) => (
                        <motion.div
                            key={tier.id}
                            className={styles.tierCard}
                            style={{ '--tier-color': tier.color } as React.CSSProperties}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + index * 0.1 }}
                        >
                            <div className={styles.tierIcon}>{tier.icon}</div>
                            <div className={styles.tierContent}>
                                <h3 className={styles.tierLabel}>{tier.label}</h3>
                                <p className={styles.tierDescription}>{tier.description}</p>
                                <span className={styles.tierOutdegree}>{tier.outdegree}</span>
                                <span className={styles.tierExample}>e.g., {tier.example}</span>
                            </div>
                            {index < tiers.length - 1 && (
                                <ArrowDown size={16} className={styles.tierArrow} />
                            )}
                        </motion.div>
                    ))}
                </div>

                <div className={styles.footer}>
                    <p className={styles.footerNote}>
                        🔒 You must achieve 60% mastery on a tier before unlocking the next.
                    </p>
                    <button className={styles.dismissButton} onClick={onDismiss}>
                        Got it!
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default TierExplainer;
