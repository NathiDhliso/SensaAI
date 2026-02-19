import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import styles from './OverviewMapView.module.css';

interface OverviewMapViewProps {
  concepts: LearningConcept[];
  ulcPattern: null; // Deprecated - kept for compatibility
  onComplete: () => void;
}

export default function OverviewMapView({
  concepts,
  ulcPattern,
  onComplete,
}: OverviewMapViewProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.iconWrapper}><Sparkles size={28} /></div>
          <div>
            <h2 className={styles.title}>Learning Overview</h2>
            <p className={styles.subtitle}>
              {concepts.length} concepts ready to learn
            </p>
          </div>
        </div>
        <motion.button
          onClick={onComplete}
          className={styles.completeButton}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <CheckCircle size={18} />
          Complete Overview
        </motion.button>
      </div>
      
      <div className={styles.macroView}>
        <div className={styles.conceptGrid}>
          {concepts.map((concept, index) => (
            <motion.div
              key={concept.id}
              className={styles.conceptCard}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className={styles.conceptIcon}>
                <BookOpen size={20} />
              </div>
              <div className={styles.conceptInfo}>
                <h3 className={styles.conceptTitle}>{concept.title}</h3>
                {concept.description && (
                  <p className={styles.conceptDescription}>
                    {concept.description.substring(0, 100)}
                    {concept.description.length > 100 ? '...' : ''}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
