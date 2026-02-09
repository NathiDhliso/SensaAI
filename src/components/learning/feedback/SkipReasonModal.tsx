/**
 * SkipReasonModal Component
 * 
 * ARCHITECT ENHANCEMENT: Captures diagnostic information when user skips a concept.
 * Transforms "skip" from neutral navigation to actionable signal for adaptive routing.
 * 
 * Pedagogical Intent:
 * - "Too Easy" Route to high-stakes verification
 * - "Too Hard" Route to prerequisite check
 * - "Not Relevant" Metadata for curriculum tuning
 */
import { motion } from 'framer-motion';
import { X, Zap, AlertCircle, Target, MessageCircle } from 'lucide-react';
import styles from './SkipReasonModal.module.css';
// ============================================================================
// Types
// ============================================================================
export type SkipReason = 'too-easy' | 'too-hard' | 'not-relevant' | 'other';
export interface SkipReasonData {
 reason: SkipReason;
 details?: string;
}
interface SkipReasonModalProps {
 conceptName: string;
 onConfirm: (data: SkipReasonData) => void;
 onCancel: () => void;
}
const SKIP_OPTIONS: Array<{
 id: SkipReason;
 label: string;
 description: string;
 icon: React.ReactNode;
 color: string;
}> = [
 {
 id: 'too-easy',
 label: 'Already Know This',
 description: "I'm confident I can demonstrate mastery",
 icon: <Target size={20} />,
 color: 'var(--color-success)'
 },
 {
 id: 'too-hard',
 label: 'Too Advanced',
 description: "I need to review prerequisites first",
 icon: <AlertCircle size={20} />,
 color: 'var(--color-warning)'
 },
 {
 id: 'not-relevant',
 label: 'Not Relevant',
 description: "This doesn't align with my learning goals",
 icon: <MessageCircle size={20} />,
 color: 'var(--color-text-tertiary)'
 }
];
// ============================================================================
// Component
// ============================================================================
export function SkipReasonModal({
 conceptName,
 onConfirm,
 onCancel
}: SkipReasonModalProps) {
 const handleSelect = (reason: SkipReason) => {
 onConfirm({ reason });
 };
 return (
 <motion.div
 className={styles.overlay}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={onCancel}
 >
 <motion.div
 className={styles.modal}
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.9, opacity: 0 }}
 onClick={(e) => e.stopPropagation()}
 >
 {/* Header */}
 <div className={styles.header}>
 <div className={styles.iconWrapper}>
 <Zap size={24} />
 </div>
 <div>
 <h2 className={styles.title}>Skip Diagnostic</h2>
 <p className={styles.subtitle}>
 Why are you skipping <strong>{conceptName}</strong>?
 </p>
 </div>
 <button
 className={styles.closeButton}
 onClick={onCancel}
 aria-label="Cancel"
 >
 <X size={20} />
 </button>
 </div>
 {/* Options */}
 <div className={styles.options}>
 {SKIP_OPTIONS.map((option) => (
 <motion.button
 key={option.id}
 className={styles.optionCard}
 onClick={() => handleSelect(option.id)}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 style={{ '--option-color': option.color } as React.CSSProperties}
 >
 <div className={styles.optionIcon}>{option.icon}</div>
 <div className={styles.optionContent}>
 <h3 className={styles.optionLabel}>{option.label}</h3>
 <p className={styles.optionDescription}>{option.description}</p>
 </div>
 </motion.button>
 ))}
 </div>
 {/* Footer Hint */}
 <div className={styles.footer}>
 <p className={styles.hint}>
 Your answer helps us adapt the learning path
 </p>
 </div>
 </motion.div>
 </motion.div>
 );
}
export default SkipReasonModal;