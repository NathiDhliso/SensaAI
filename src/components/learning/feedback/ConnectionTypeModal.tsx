/**
 * ConnectionTypeModal Component
 * 
 * ARCHITECT ENHANCEMENT: "The Why Interstitial"
 * When users draw connections, validate the NATURE of the relationship,
 * not just its existence. Enforces higher-order thinking.
 */
import { motion } from 'framer-motion';
import { X, GitBranch, ArrowRight, Shield, Package, Layers, Lock } from 'lucide-react';
import styles from './ConnectionTypeModal.module.css';
// ============================================================================
// Types
// ============================================================================
export type ConnectionType = 'requires' | 'enables' | 'is-part-of' | 'is-type-of' | 'causes' | 'constrains';
export interface ConnectionTypeData {
 type: ConnectionType;
 customLabel?: string;
}
interface ConnectionTypeModalProps {
 fromConcept: string;
 toConcept: string;
 onConfirm: (data: ConnectionTypeData) => void;
 onCancel: () => void;
}
const CONNECTION_TYPES: Array<{
 id: ConnectionType;
 label: string;
 question: string;
 description: string;
 icon: React.ReactNode;
 example: string;
}> = [
 {
 id: 'requires',
 label: 'Requires',
 question: 'What must I know first?',
 description: 'B must be understood before A',
 icon: <Shield size={20} />,
 example: 'Calculus requires Algebra'
 },
 {
 id: 'enables',
 label: 'Enables',
 question: 'What does this unlock?',
 description: 'Learning A makes B possible',
 icon: <ArrowRight size={20} />,
 example: 'Variables enable Functions'
 },
 {
 id: 'is-part-of',
 label: 'Is Part Of',
 question: 'What is this a piece of?',
 description: 'A is a component within B',
 icon: <Package size={20} />,
 example: 'Mitochondria is part of Cell'
 },
 {
 id: 'is-type-of',
 label: 'Is Type Of',
 question: 'What category does this belong to?',
 description: 'A is a specific instance of B',
 icon: <Layers size={20} />,
 example: 'Sonnet is type of Poem'
 },
 {
 id: 'causes',
 label: 'Causes',
 question: 'What happens because of this?',
 description: 'A directly produces or triggers B',
 icon: <GitBranch size={20} />,
 example: 'Inflation causes Price Increase'
 },
 {
 id: 'constrains',
 label: 'Constrains',
 question: 'What limits or governs this?',
 description: 'A sets rules or limits on B',
 icon: <Lock size={20} />,
 example: 'Budget constrains Scope'
 }
];
// ============================================================================
// Component
// ============================================================================
export function ConnectionTypeModal({
 fromConcept,
 toConcept,
 onConfirm,
 onCancel
}: ConnectionTypeModalProps) {
 const handleSelect = (type: ConnectionType) => {
 onConfirm({ type });
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
 <div>
 <h2 className={styles.title}>Define Connection</h2>
 <p className={styles.subtitle}>
 How does <strong>{fromConcept}</strong> connect to <strong>{toConcept}</strong>?
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
 {/* Connection Types */}
 <div className={styles.types}>
 {CONNECTION_TYPES.map((type) => (
 <motion.button
 key={type.id}
 className={styles.typeCard}
 onClick={() => handleSelect(type.id)}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 >
 <div className={styles.typeIcon}>{type.icon}</div>
 <div className={styles.typeContent}>
 <h3 className={styles.typeLabel}>{type.label}</h3>
 <p className={styles.typeQuestion}>{type.question}</p>
 <span className={styles.typeExample}>{type.example}</span>
 </div>
 </motion.button>
 ))}
 </div>
 </motion.div>
 </motion.div>
 );
}
export default ConnectionTypeModal;