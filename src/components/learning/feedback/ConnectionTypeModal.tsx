/**
 * ConnectionTypeModal Component
 * 
 * ARCHITECT ENHANCEMENT: "The Why Interstitial"
 * When users draw connections, validate the NATURE of the relationship,
 * not just its existence. Enforces higher-order thinking.
 */
import { motion } from 'framer-motion';
import { X, GitBranch, ArrowRight, Shield, Package } from 'lucide-react';
import styles from './ConnectionTypeModal.module.css';
// ============================================================================
// Types
// ============================================================================
export type ConnectionType = 'solid' | 'dashed' | 'arrow' | 'double-arrow';
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
            id: 'solid',
            label: 'Solid Line',
            question: 'What is this or what does it have?',
            description: 'Is / Has / Belongs to',
            icon: <Package size={20} />,
            example: 'A direct, factual relationship. Parent-child, category-member, whole-part.'
        },
        {
            id: 'dashed',
            label: 'Dashed Line',
            question: 'How does it influence or relate?',
            description: 'Influences / Relates to',
            icon: <GitBranch size={20} />,
            example: 'An indirect or associative relationship. Cross-branch connections, cause-effect.'
        },
        {
            id: 'arrow',
            label: 'Arrow',
            question: 'What does this lead to or require?',
            description: 'Leads to / Requires',
            icon: <ArrowRight size={20} />,
            example: 'A directional relationship. Sequence, dependency, output.'
        },
        {
            id: 'double-arrow',
            label: 'Double Arrow',
            question: 'How do they depend mutually?',
            description: 'Depends mutually',
            icon: <Shield size={20} />,
            example: 'Bidirectional dependency or feedback loop.'
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
