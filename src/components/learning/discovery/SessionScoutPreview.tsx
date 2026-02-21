/**
 * SessionScoutPreview Component
 *
 * The FIRST screen a learner sees when entering a learning session.
 * Wraps MasterBlueprintReveal to present the "Deep Structure" of the subject
 * before progressing to the Concept Tree and Nomenclature Sprint.
 */
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen } from 'lucide-react';
import type { SubjectClassification } from '@/shared/types/macro-workflow';
import { MasterBlueprintReveal } from './MasterBlueprintReveal';
import styles from './SessionScoutPreview.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════
interface SessionScoutPreviewProps {
    /** The full classification data from the generation engine */
    classification: SubjectClassification;
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
    const { deepStructure, lifecycleBlueprints, examDomains } = classification;

    // Guard: if deepStructure is missing (old data), skip and proceed
    if (!deepStructure || !lifecycleBlueprints) {
        onContinue();
        return null;
    }

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
