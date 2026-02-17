/**
 * FlowProgressBar Component
 * 
 * Horizontal progress visualization for the 5-step SENSA flow.
 * Shows completed, active, and upcoming steps with equation variable labels.
 */
import { motion } from 'framer-motion';
import { Eye, Compass, Edit3, BookOpen, Zap, CheckCircle } from 'lucide-react';
import type { SensaPhase } from '@/shared/types/sensa-flow';
import styles from './FlowProgressBar.module.css';
// ============================================================================
// Types
// ============================================================================
interface FlowStep {
    id: SensaPhase;
    label: string;
    icon: React.ReactNode;
    eqVar: string;
}
interface FlowProgressBarProps {
    currentPhase: SensaPhase;
    completedPhases: SensaPhase[];
    orientation?: 'horizontal' | 'vertical';
    compact?: boolean;
    /** Sub-progress within the current phase (0-1) for micro-learning loops */
    subProgress?: number;
}
// ============================================================================
// Constants
// ============================================================================
const FLOW_STEPS: FlowStep[] = [
    { id: 'see', label: 'See', icon: <Eye size={18} />, eqVar: 'h' },
    { id: 'explore', label: 'Explore', icon: <Compass size={18} />, eqVar: 'Q_k' },
    { id: 'note', label: 'Note', icon: <Edit3 size={18} />, eqVar: 'Q_c' },
    { id: 'study', label: 'Study', icon: <BookOpen size={18} />, eqVar: 'Q_p' },
    { id: 'apply', label: 'Apply', icon: <Zap size={18} />, eqVar: 'Q_r' }
];
// ============================================================================
// Component
// ============================================================================
export function FlowProgressBar({
    currentPhase,
    completedPhases,
    orientation = 'horizontal',
    compact = false,
    subProgress = 0
}: FlowProgressBarProps) {
    const getStepStatus = (stepId: SensaPhase): 'completed' | 'active' | 'upcoming' => {
        if (completedPhases.includes(stepId)) return 'completed';
        if (stepId === currentPhase) return 'active';
        return 'upcoming';
    };
    const currentIndex = FLOW_STEPS.findIndex(s => s.id === currentPhase);
    // Calculate total progress including sub-progress
    // Each phase is worth 1.0, sub-progress adds fractional progress within current phase
    const totalProgress = currentIndex + Math.min(Math.max(subProgress, 0), 1);
    const progressPercent = ((totalProgress) / FLOW_STEPS.length) * 100;
    return (
        <div
            className={`${styles.container} ${styles[orientation]} ${compact ? styles.compact : ''}`}
        >
            {/* Progress Line */}
            <div className={styles.progressLine}>
                <motion.div
                    className={styles.progressFill}
                    initial={{ width: 0 }}
                    animate={{
                        width: `${progressPercent}%`
                    }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
            </div>
            {/* Steps */}
            <div className={styles.steps}>
                {FLOW_STEPS.map((step, index) => {
                    const status = getStepStatus(step.id);
                    return (
                        <motion.div
                            key={step.id}
                            className={`${styles.step} ${styles[status]}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className={styles.stepIcon}>
                                {status === 'completed' ? (
                                    <CheckCircle size={18} className={styles.completedIcon} />
                                ) : (
                                    step.icon
                                )}
                            </div>
                            {!compact && (
                                <>
                                    <span className={styles.stepLabel}>{step.label}</span>
                                    <span className={styles.stepEqVar}>{step.eqVar}</span>
                                </>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
export default FlowProgressBar;
