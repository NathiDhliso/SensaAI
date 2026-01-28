/**
 * NeuralResetBanner Component
 * 
 * A non-blocking banner that suggests users take a break
 * when cognitive load is too high. Can be dismissed easily.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Coffee } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import styles from './NeuralResetModal.module.css';

export default function NeuralResetBanner() {
    const { showNeuralReset, dismissNeuralReset } = useLearningStore();

    return (
        <AnimatePresence>
            {showNeuralReset && (
                <motion.div
                    className={styles.banner}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className={styles.bannerContent}>
                        <Coffee size={18} className={styles.bannerIcon} />
                        <span className={styles.bannerText}>
                            <strong>Time for a quick break?</strong> Your brain could use a 2-minute reset.
                        </span>
                    </div>
                    <button 
                        className={styles.bannerDismiss} 
                        onClick={dismissNeuralReset}
                        aria-label="Dismiss"
                    >
                        <X size={18} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
