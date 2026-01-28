/**
 * ConnectionTypeModal Component
 * 
 * ARCHITECT ENHANCEMENT: "The Why Interstitial"
 * When users draw connections, validate the NATURE of the relationship,
 * not just its existence. Enforces higher-order thinking.
 */

import { motion } from 'framer-motion';
import { X, GitBranch, ArrowRight, Shield, Package, Link } from 'lucide-react';
import styles from './ConnectionTypeModal.module.css';

// ============================================================================
// Types
// ============================================================================

export type ConnectionType = 'causes' | 'requires' | 'enables' | 'prevents' | 'contains' | 'relates-to';

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
    description: string;
    icon: React.ReactNode;
    example: string;
}> = [
    {
        id: 'requires',
        label: 'Requires',
        description: 'Must be understood before',
        icon: <Shield size={20} />,
        example: 'Foundation → Keystone',
    },
    {
        id: 'enables',
        label: 'Enables',
        description: 'Makes possible',
        icon: <ArrowRight size={20} />,
        example: 'Variable → Function',
    },
    {
        id: 'causes',
        label: 'Causes',
        description: 'Directly produces',
        icon: <GitBranch size={20} />,
        example: 'Error → Exception',
    },
    {
        id: 'prevents',
        label: 'Prevents',
        description: 'Blocks or mitigates',
        icon: <Shield size={20} />,
        example: 'Validation → Bug',
    },
    {
        id: 'contains',
        label: 'Contains',
        description: 'Is composed of',
        icon: <Package size={20} />,
        example: 'Class → Method',
    },
    {
        id: 'relates-to',
        label: 'Related To',
        description: 'Shares context',
        icon: <Link size={20} />,
        example: 'General association',
    },
];

// ============================================================================
// Component
// ============================================================================

export function ConnectionTypeModal({
    fromConcept,
    toConcept,
    onConfirm,
    onCancel,
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
                                <p className={styles.typeDescription}>{type.description}</p>
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
