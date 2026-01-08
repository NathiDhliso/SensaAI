
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { LIFECYCLE_COLORS } from '@/constants/theme-colors';
import styles from './LifecyclePhaseDisplay.module.css';

interface LifecyclePhaseDisplayProps {
    phases: {
        phase1: string;
        phase2: string;
        phase3: string;
    };
    delay?: number;
}

const PHASE_CONFIG = [
    { key: 'phase1', label: 'Phase 1', colors: LIFECYCLE_COLORS.phase1 },
    { key: 'phase2', label: 'Phase 2', colors: LIFECYCLE_COLORS.phase2 },
    { key: 'phase3', label: 'Phase 3', colors: LIFECYCLE_COLORS.phase3 },
] as const;

export const LifecyclePhaseDisplay: React.FC<LifecyclePhaseDisplayProps> = ({
    phases,
    delay = 0
}) => {
    const phaseData = [
        { ...PHASE_CONFIG[0], verb: phases.phase1 },
        { ...PHASE_CONFIG[1], verb: phases.phase2 },
        { ...PHASE_CONFIG[2], verb: phases.phase3 },
    ];

    return (
        <div className={styles.container}>
            {phaseData.map((phase, i) => (
                <React.Fragment key={phase.key}>
                    <motion.div
                        className={styles.phaseCard}
                        style={{
                            backgroundColor: phase.colors.bg,
                            borderColor: phase.colors.fill,
                        }}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: delay + (i * 0.12), duration: 0.35 }}
                    >
                        <span
                            className={styles.phaseLabel}
                            style={{ color: phase.colors.text }}
                        >
                            {phase.label}
                        </span>
                        <span
                            className={styles.phaseVerb}
                            style={{ color: phase.colors.text }}
                        >
                            {phase.verb}
                        </span>
                    </motion.div>
                    
                    {/* Arrow between phases */}
                    {i < 2 && (
                        <motion.div
                            className={styles.arrow}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: delay + (i * 0.12) + 0.06, duration: 0.2 }}
                        >
                            <ArrowRight size={16} />
                        </motion.div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};
