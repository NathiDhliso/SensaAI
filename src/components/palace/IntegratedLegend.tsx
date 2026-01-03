import { ArrowRight, Layers, Workflow } from 'lucide-react';
import { GRAPH_COLORS, LIFECYCLE_COLORS } from '@/constants/theme-colors';
import styles from './IntegratedLegend.module.css';

export interface IntegratedLegendProps {
    lifecycle?: {
        phase1: string;
        phase2: string;
        phase3: string;
    };
}

export default function IntegratedLegend({ lifecycle }: IntegratedLegendProps) {
    const labels = {
        phase1: lifecycle?.phase1 || 'Foundation',
        phase2: lifecycle?.phase2 || 'Action',
        phase3: lifecycle?.phase3 || 'Verification',
    };

    return (
        <div className={styles.container}>
            <div className={styles.systemBlock}>
                <div className={styles.header}>
                    <Layers className={styles.icon} size={18} />
                    <h3 className={styles.title}>Macro: Concept Network</h3>
                </div>
                <p className={styles.description}>
                    Determines the <strong>Order of Engagement</strong> (Structural Role)
                </p>
                <div className={styles.legendRow}>
                    <div className={styles.legendItem}>
                        <span className={styles.dot} style={{ backgroundColor: GRAPH_COLORS.foundation }} />
                        <span className={styles.label}>Foundation</span>
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.dot} style={{ backgroundColor: GRAPH_COLORS.keystone }} />
                        <span className={styles.label}>Keystone</span>
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.dot} style={{ backgroundColor: GRAPH_COLORS.utility }} />
                        <span className={styles.label}>Utility</span>
                    </div>
                </div>
            </div>

            <div className={styles.connector}>
                <div className={styles.connectorLine} />
                <div className={styles.connectorLabel}>
                    <span>Select Node</span>
                    <ArrowRight size={14} />
                    <span>Apply Logic</span>
                </div>
                <div className={styles.connectorLine} />
            </div>

            <div className={styles.systemBlock}>
                <div className={styles.header}>
                    <Workflow className={styles.icon} size={18} />
                    <h3 className={styles.title}>Micro: Universal Lifecycle</h3>
                </div>
                <p className={styles.description}>
                    The <strong>Sequential Logic</strong> to master the concept (Process)
                </p>
                <div className={styles.legendRow}>
                    <div className={styles.legendItem}>
                        <span className={styles.phaseBadge} style={{ backgroundColor: LIFECYCLE_COLORS.phase1.bg, color: LIFECYCLE_COLORS.phase1.text, borderColor: LIFECYCLE_COLORS.phase1.fill }}>1</span>
                        <span className={styles.label}>{labels.phase1}</span>
                    </div>
                    <ArrowRight size={12} className={styles.arrow} />
                    <div className={styles.legendItem}>
                        <span className={styles.phaseBadge} style={{ backgroundColor: LIFECYCLE_COLORS.phase2.bg, color: LIFECYCLE_COLORS.phase2.text, borderColor: LIFECYCLE_COLORS.phase2.fill }}>2</span>
                        <span className={styles.label}>{labels.phase2}</span>
                    </div>
                    <ArrowRight size={12} className={styles.arrow} />
                    <div className={styles.legendItem}>
                        <span className={styles.phaseBadge} style={{ backgroundColor: LIFECYCLE_COLORS.phase3.bg, color: LIFECYCLE_COLORS.phase3.text, borderColor: LIFECYCLE_COLORS.phase3.fill }}>3</span>
                        <span className={styles.label}>{labels.phase3}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
