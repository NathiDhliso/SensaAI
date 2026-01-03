/**
 * LayoutEditorToolbar - Controls for layout editing mode
 * 
 * Provides toggle for edit mode, reset button, and regenerate option.
 */

import { motion } from 'framer-motion';
import { Pencil, RotateCcw, Check, RefreshCw } from 'lucide-react';
import styles from './LayoutEditorToolbar.module.css';

export interface LayoutEditorToolbarProps {
    /** Is edit mode active */
    isEditing: boolean;
    /** Toggle edit mode */
    onToggleEdit: () => void;
    /** Reset to default layout */
    onReset: () => void;
    /** Whether there are any overrides to reset */
    hasOverrides: boolean;
    /** Callback to open regenerate dialog */
    onRegenerate?: () => void;
}

/**
 * LayoutEditorToolbar component
 */
export function LayoutEditorToolbar({
    isEditing,
    onToggleEdit,
    onReset,
    hasOverrides,
    onRegenerate,
}: LayoutEditorToolbarProps) {
    return (
        <div className={styles.toolbar}>
            <motion.button
                className={`${styles.button} ${isEditing ? styles.active : ''}`}
                onClick={onToggleEdit}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isEditing ? 'Done editing' : 'Edit layout'}
            >
                {isEditing ? (
                    <>
                        <Check size={16} />
                        <span>Done</span>
                    </>
                ) : (
                    <>
                        <Pencil size={16} />
                        <span>Edit Layout</span>
                    </>
                )}
            </motion.button>

            {hasOverrides && (
                <motion.button
                    className={styles.resetButton}
                    onClick={onReset}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    title="Reset to default layout"
                >
                    <RotateCcw size={16} />
                    <span>Reset</span>
                </motion.button>
            )}

            {onRegenerate && (
                <motion.button
                    className={styles.regenerateButton}
                    onClick={onRegenerate}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Regenerate layout from dependencies"
                >
                    <RefreshCw size={16} />
                    <span>Regenerate</span>
                </motion.button>
            )}

            {isEditing && (
                <motion.div
                    className={styles.hint}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    Drag concepts to swap positions
                </motion.div>
            )}
        </div>
    );
}

export default LayoutEditorToolbar;
