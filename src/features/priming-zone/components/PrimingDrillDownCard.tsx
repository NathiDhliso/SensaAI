/**
 * Priming Drill-Down Card - The Z-Axis
 * Displays the 3-part priming content: Trick, Chain, Steps
 */

import { X, Brain, Link2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MatrixCell } from '../types';
import styles from './PrimingDrillDownCard.module.css';

interface PrimingDrillDownCardProps {
  cell: MatrixCell;
  onClose: () => void;
}

export default function PrimingDrillDownCard({
  cell,
  onClose,
}: PrimingDrillDownCardProps) {
  const { primingCard, action, conceptPath } = cell;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.card}
          initial={{ scale: 0.9, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.cardHeader}>
            <div className={styles.headerInfo}>
              <div className={styles.breadcrumb}>
                {conceptPath.join(' → ')}
              </div>
              <h2 className={styles.cardTitle}>
                <span className={styles.actionBadge}>{action}</span>
              </h2>
            </div>
            <button
              onClick={onClose}
              className={styles.closeButton}
              aria-label="Close drill-down"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content: 3 Sections */}
          <div className={styles.cardContent}>
            {/* Section 1: The Trick */}
            <motion.section
              className={styles.section}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className={styles.sectionHeader}>
                <Brain className={styles.sectionIcon} size={24} />
                <h3 className={styles.sectionTitle}>{primingCard.trick.title}</h3>
              </div>
              <p className={styles.sectionContent}>
                {primingCard.trick.content}
              </p>
            </motion.section>

            {/* Section 2: The Chain */}
            <motion.section
              className={styles.section}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className={styles.sectionHeader}>
                <Link2 className={styles.sectionIcon} size={24} />
                <h3 className={styles.sectionTitle}>{primingCard.chain.title}</h3>
              </div>
              <ul className={styles.constraintList}>
                {primingCard.chain.constraints.map((constraint, idx) => (
                  <li key={idx} className={styles.constraintItem}>
                    <span className={styles.constraintDot} />
                    {constraint}
                  </li>
                ))}
              </ul>
            </motion.section>

            {/* Section 3: Atomic Steps */}
            <motion.section
              className={styles.section}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className={styles.sectionHeader}>
                <Zap className={styles.sectionIcon} size={24} />
                <h3 className={styles.sectionTitle}>{primingCard.steps.title}</h3>
              </div>
              <ol className={styles.stepsList}>
                {primingCard.steps.actions.map((step, idx) => (
                  <li key={idx} className={styles.stepItem}>
                    <span className={styles.stepNumber}>{idx + 1}</span>
                    <span className={styles.stepText}>{step}</span>
                  </li>
                ))}
              </ol>
            </motion.section>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
