/**
 * RegenerateLayoutDialog - Confirmation dialog for regenerating floor plan layout
 * 
 * Warns user that regenerating will reset their customizations.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, AlertTriangle, X } from 'lucide-react';
import styles from './RegenerateLayoutDialog.module.css';

export interface RegenerateLayoutDialogProps {
    /** Is the dialog open */
    isOpen: boolean;
    /** Close the dialog */
    onClose: () => void;
    /** Confirm regeneration */
    onConfirm: () => void;
    /** Whether regeneration is in progress */
    isRegenerating?: boolean;
}

/**
 * RegenerateLayoutDialog component
 */
export function RegenerateLayoutDialog({
    isOpen,
    onClose,
    onConfirm,
    isRegenerating = false,
}: RegenerateLayoutDialogProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className={styles.backdrop}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Dialog */}
                    <motion.div
                        className={styles.dialog}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        {/* Close button */}
                        <button
                            className={styles.closeButton}
                            onClick={onClose}
                            disabled={isRegenerating}
                        >
                            <X size={18} />
                        </button>

                        {/* Warning icon */}
                        <div className={styles.iconWrapper}>
                            <AlertTriangle size={32} className={styles.warningIcon} />
                        </div>

                        {/* Content */}
                        <h2 className={styles.title}>Regenerate Layout?</h2>
                        
                        <p className={styles.description}>
                            This will recalculate the treemap layout based on current dependency data.
                        </p>

                        <div className={styles.warning}>
                            <strong>Warning:</strong> Any manual position adjustments you've made 
                            will be reset to default positions.
                        </div>

                        {/* Actions */}
                        <div className={styles.actions}>
                            <button
                                className={styles.cancelButton}
                                onClick={onClose}
                                disabled={isRegenerating}
                            >
                                Cancel
                            </button>

                            <button
                                className={styles.confirmButton}
                                onClick={onConfirm}
                                disabled={isRegenerating}
                            >
                                {isRegenerating ? (
                                    <>
                                        <RefreshCw size={16} className={styles.spinning} />
                                        Regenerating...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={16} />
                                        Regenerate Layout
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default RegenerateLayoutDialog;
