import { motion, AnimatePresence } from 'framer-motion';
import { X, Play } from 'lucide-react';
import type { SelectedCell } from './types';
import styles from './DrillDownCard.module.css';

interface DrillDownCardProps {
  cell: SelectedCell | null;
  onClose: () => void;
  onStartDrill: () => void;
}

export function DrillDownCard({ cell, onClose, onStartDrill }: DrillDownCardProps) {
  return (
    <AnimatePresence>
      {cell && (
        <motion.aside
          className={styles.panel}
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        >
          <div className={styles.panelHeader}>
            <div className={styles.panelMeta}>
              <span className={styles.panelVerb}>{cell.verb.toUpperCase()}</span>
              <span className={styles.panelSep}>×</span>
              <span className={styles.panelConcept}>{cell.conceptName}</span>
            </div>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <div className={styles.sections}>
            <section className={styles.trickSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>🧠</span>
                <span className={styles.sectionLabel}>THE TRICK</span>
                <span className={styles.sectionTag}>Schema Construction</span>
              </div>
              <p className={styles.trickContent}>{cell.action.trick}</p>
            </section>

            <section className={styles.chainSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>🔗</span>
                <span className={styles.sectionLabel}>THE CHAIN</span>
                <span className={styles.sectionTag}>Prerequisites</span>
              </div>
              {cell.action.chain.length > 0 ? (
                <ul className={styles.chainList}>
                  {cell.action.chain.map((item, i) => (
                    <li key={i} className={styles.chainItem}>
                      <span className={styles.chainBullet} />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.emptyNote}>No prerequisites.</p>
              )}
            </section>

            <section className={styles.stepsSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>⚡</span>
                <span className={styles.sectionLabel}>ATOMIC STEPS</span>
                <span className={styles.sectionTag}>Execution</span>
              </div>
              {cell.action.steps.length > 0 ? (
                <ol className={styles.stepsList}>
                  {cell.action.steps.map((step, i) => (
                    <li key={i} className={styles.stepItem}>
                      <span className={styles.stepNumber}>{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.emptyNote}>No steps defined.</p>
              )}
            </section>
          </div>

          <div className={styles.panelFooter}>
            <button className={styles.drillBtn} onClick={onStartDrill}>
              <Play size={14} />
              Start Drill
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
