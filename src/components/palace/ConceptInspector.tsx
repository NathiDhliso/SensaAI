import { X, Network, Workflow, ArrowRight } from 'lucide-react';
import type { LearningConcept } from '@/lib/types/learning';
import { renderShapeOrIcon } from '@/components/ui';
import { LIFECYCLE_COLORS } from '@/constants/theme-colors';
import styles from './ConceptInspector.module.css';

interface ConceptInspectorProps {
    concept: LearningConcept;
    tier: 'Foundation' | 'Keystone' | 'Utility';
    onClose: () => void;
}

export default function ConceptInspector({ concept, tier, onClose }: ConceptInspectorProps) {
    const lifecycle = concept.lifecycle;

    return (
        <div className={styles.container}>
            <button className={styles.closeButton} onClick={onClose} aria-label="Close inspector">
                <X size={16} />
            </button>

            <div className={styles.header}>
                <div className={styles.iconWrapper}>
                    {renderShapeOrIcon(concept.icon, 'lg')}
                </div>
                <div className={styles.headerContent}>
                    <div className={styles.tierBadge} data-tier={tier}>
                        <Network size={12} />
                        <span>{tier} Tier</span>
                    </div>
                    <h2 className={styles.conceptName}>{concept.name}</h2>
                    <p className={styles.metaphor}>{concept.metaphor}</p>
                </div>
            </div>

            <div className={styles.divider} />

            <div className={styles.lifecycleSection}>
                <div className={styles.sectionHeader}>
                    <Workflow size={16} className={styles.sectionIcon} />
                    <h3 className={styles.sectionTitle}>Universal Lifecycle</h3>
                </div>
                <p className={styles.sectionDesc}>To master this concept, follow this sequential logical process:</p>

                <div className={styles.flowContainer}>
                    {/* Phase 1 */}
                    <div className={styles.phaseCard} style={{ backgroundColor: LIFECYCLE_COLORS.phase1.bg, borderColor: LIFECYCLE_COLORS.phase1.fill }}>
                        <div className={styles.phaseHeader} style={{ color: LIFECYCLE_COLORS.phase1.text }}>
                            <span className={styles.phaseNum}>1</span>
                            <span className={styles.phaseName}>{lifecycle?.phase1.title}</span>
                        </div>
                        <div className={styles.verbsList}>
                            {lifecycle?.phase1.steps.map((step, i) => (
                                <div key={i} className={styles.verb}>{step}</div>
                            ))}
                        </div>
                    </div>

                    <ArrowRight className={styles.flowArrow} />

                    {/* Phase 2 */}
                    <div className={styles.phaseCard} style={{ backgroundColor: LIFECYCLE_COLORS.phase2.bg, borderColor: LIFECYCLE_COLORS.phase2.fill }}>
                        <div className={styles.phaseHeader} style={{ color: LIFECYCLE_COLORS.phase2.text }}>
                            <span className={styles.phaseNum}>2</span>
                            <span className={styles.phaseName}>{lifecycle?.phase2.title}</span>
                        </div>
                        <div className={styles.verbsList}>
                            {lifecycle?.phase2.steps.map((step, i) => (
                                <div key={i} className={styles.verb}>{step}</div>
                            ))}
                        </div>
                    </div>

                    <ArrowRight className={styles.flowArrow} />

                    {/* Phase 3 */}
                    <div className={styles.phaseCard} style={{ backgroundColor: LIFECYCLE_COLORS.phase3.bg, borderColor: LIFECYCLE_COLORS.phase3.fill }}>
                        <div className={styles.phaseHeader} style={{ color: LIFECYCLE_COLORS.phase3.text }}>
                            <span className={styles.phaseNum}>3</span>
                            <span className={styles.phaseName}>{lifecycle?.phase3.title}</span>
                        </div>
                        <div className={styles.verbsList}>
                            {lifecycle?.phase3.steps.map((step, i) => (
                                <div key={i} className={styles.verb}>{step}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
