/**
 * DeepStructureDiscovery Component
 *
 * The FIRST screen a learner sees when entering a learning session.
 * Wraps DeepStructureDetails to present the "Deep Structure" of the subject
 * before progressing to the Concept Tree and Nomenclature Sprint.
 *
 * For legacy payloads (pre-Deep Structure), renders a fallback UI without generating inline.
 */
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, AlertCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SubjectClassification } from '@/shared/types/macro-workflow';
import { DeepStructureDetails } from './DeepStructureDetails';
import styles from './DeepStructureDiscovery.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════
interface DeepStructureDiscoveryProps {
    /** The full classification data from the generation engine */
    classification?: SubjectClassification | null;
    /** Subject name for display */
    subjectName: string;
    /** Callback when the user is ready to proceed to the Concept Tree */
    onContinue: () => void;
    /** Optional override for the continue button text */
    continueText?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export function DeepStructureDiscovery({
    classification,
    subjectName,
    onContinue,
    continueText,
}: DeepStructureDiscoveryProps) {
    const navigate = useNavigate();

    const deepStructure = classification?.deepStructure;
    const lifecycleBlueprints = classification?.lifecycleBlueprints;
    const examDomains = classification?.examDomains;



    // ─── Legacy Fallback ─────────────────────────────────────────────────
    // Older generation payloads lack deepStructure / lifecycleBlueprints, or even classification.
    // Show a "Generate Master Blueprint" button to run classification only.

    const hasValidDeepStructure = Boolean(
        deepStructure &&
        Object.keys(deepStructure).length > 0 &&
        deepStructure.invariantRule
    );

    const hasValidLifecycle = Boolean(
        lifecycleBlueprints &&
        Object.keys(lifecycleBlueprints).length > 0 &&
        (lifecycleBlueprints.phase1 || lifecycleBlueprints.phase2)
    );

    if (import.meta.env.DEV) {
        console.log('[DeepStructureDiscovery] classification:', JSON.stringify({
            hasClassification: !!classification,
            hasValidDeepStructure,
            hasValidLifecycle,
            primaryArchetype: deepStructure?.primaryArchetype,
            invariantRule: deepStructure?.invariantRule?.substring(0, 80),
            revealScript: deepStructure?.revealScript?.substring(0, 80),
            phase1Verb: lifecycleBlueprints?.phase1?.verb,
            phase2Verb: lifecycleBlueprints?.phase2?.verb,
            examDomainCount: examDomains?.length,
        }, null, 2));
    }

    if (!classification || !hasValidDeepStructure || !hasValidLifecycle) {
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
                        Master Blueprint Not Found
                    </div>
                    <p style={{ color: 'var(--color-text-secondary, #94a3b8)', lineHeight: 1.6, maxWidth: '34rem', margin: '0 auto 1.5rem' }}>
                        This subject was generated with an older version of the engine.
                        To unlock the Master Blueprint, you'll need to regenerate the subject.
                    </p>
                </motion.div>

                <motion.div
                    className={styles.actions}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.35 }}
                    style={{ flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}
                >
                    <button
                        className={styles.generateButton}
                        onClick={() => navigate('/')}
                    >
                        <Sparkles size={18} />
                        Go to Generation Dashboard
                    </button>
                    <button className={styles.skipButton} onClick={onContinue}>
                        {continueText || 'Skip to Concept Tree'}
                        <ArrowRight size={16} />
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
            <DeepStructureDetails
                deepStructure={deepStructure!}
                lifecycleBlueprints={lifecycleBlueprints!}
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
                        {examDomains.map((domain: any) => (
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
                    {continueText || 'Continue to Concept Tree'}
                    <ArrowRight size={18} />
                </button>
            </motion.div>
        </div>
    );
}
