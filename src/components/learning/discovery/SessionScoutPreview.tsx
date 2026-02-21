/**
 * SessionScoutPreview Component
 *
 * The FIRST screen a learner sees when entering a learning session.
 * Wraps MasterBlueprintReveal to present the "Deep Structure" of the subject
 * before progressing to the Concept Tree and Nomenclature Sprint.
 *
 * For legacy payloads (pre-Deep Structure), renders a fallback UI instead
 * of silently skipping.
 */
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, AlertCircle } from 'lucide-react';
import type { SubjectClassification } from '@/shared/types/macro-workflow';
import { MasterBlueprintReveal } from './MasterBlueprintReveal';
import styles from './SessionScoutPreview.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════
interface SessionScoutPreviewProps {
    /** The full classification data from the generation engine */
    classification?: SubjectClassification | null;
    /** Subject name for display */
    subjectName: string;
    /** Callback when the user is ready to proceed to the Concept Tree */
    onContinue: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export function SessionScoutPreview({
    classification,
    subjectName,
    onContinue,
}: SessionScoutPreviewProps) {
    const deepStructure = classification?.deepStructure;
    const lifecycleBlueprints = classification?.lifecycleBlueprints;
    const examDomains = classification?.examDomains;

    // ─── Legacy Fallback ─────────────────────────────────────────────────
    // Older generation payloads lack deepStructure / lifecycleBlueprints, or even classification.
    // Instead of silently skipping, show a clear informational screen.
    if (!classification || !deepStructure || !lifecycleBlueprints) {
        return (
            <div className={styles.container}>
                <motion.div
                    className={styles.subjectHeader}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                >
                    <h1 className={styles.subjectName}>{subjectName}</h1>
                </motion.div>

                <motion.div
                    className={styles.domainsSection}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    style={{ textAlign: 'center' }}
                >
                    <AlertCircle size={40} style={{ color: 'var(--color-warning, #f59e0b)', marginBottom: '1rem' }} />
                    <div className={styles.domainsLabel} style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                        Legacy Generation Detected
                    </div>
                    <p style={{ color: 'var(--color-text-secondary, #94a3b8)', lineHeight: 1.6, maxWidth: '34rem', margin: '0 auto 1.5rem' }}>
                        This subject was generated before the Master Blueprint feature was introduced.
                        To unlock the Deep Structure discovery, generate this subject again as a new topic.
                    </p>
                </motion.div>

                <motion.div
                    className={styles.actions}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.35 }}
                >
                    <button className={styles.continueButton} onClick={onContinue}>
                        Skip to Concept Tree
                        <ArrowRight size={18} />
                    </button>
                </motion.div>
            </div>
        );
    }

    // ─── Full Deep Structure Reveal ──────────────────────────────────────
    return (
        <div className={styles.container}>
            {/* Subject Header */}
            <motion.div
                className={styles.subjectHeader}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
            >
                <div className={styles.subjectLabel}>Deep Structure Discovery</div>
                <h1 className={styles.subjectName}>{subjectName}</h1>
                <div className={styles.classificationBadge}>
                    <BookOpen size={13} />
                    {classification.classification?.label ?? 'Learning Blueprint'}
                </div>
            </motion.div>

            {/* Master Blueprint Reveal */}
            <MasterBlueprintReveal
                deepStructure={deepStructure}
                lifecycleBlueprints={lifecycleBlueprints}
            />

            {/* Exam Domains Preview */}
            {examDomains && examDomains.length > 0 && (
                <motion.div
                    className={styles.domainsSection}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75, duration: 0.4 }}
                >
                    <div className={styles.domainsLabel}>Exam Domains</div>
                    <div className={styles.domainsList}>
                        {examDomains.map((domain) => (
                            <div key={domain.name} className={styles.domainChip}>
                                {domain.name}
                                <span className={styles.domainWeight}>
                                    {Math.round(domain.weight * 100)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Continue Action */}
            <motion.div
                className={styles.actions}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.35 }}
            >
                <button className={styles.continueButton} onClick={onContinue}>
                    Continue to Concept Tree
                    <ArrowRight size={18} />
                </button>
            </motion.div>
        </div>
    );
}
