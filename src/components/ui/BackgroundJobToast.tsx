/**
 * BackgroundJobToast Component
 * 
 * Displays a notification when the user returns to the app
 * and a generation job completed while they were away.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2, X, ArrowRight } from 'lucide-react';
import { useBackgroundJobRecovery } from '@/hooks/useBackgroundJobRecovery';
import styles from './BackgroundJobToast.module.css';

export default function BackgroundJobToast() {
  const {
    hasActiveJob,
    job,
    isChecking,
    isCompleted,
    error,
    checkJobStatus,
    viewCompletedResults,
    dismissJob,
  } = useBackgroundJobRecovery();

  const [dismissed, setDismissed] = useState(false);

  // Auto-check status when we detect an active job
  useEffect(() => {
    if (hasActiveJob && !dismissed) {
      checkJobStatus();
    }
  }, [hasActiveJob, dismissed, checkJobStatus]);

  // Don't show if no job or already dismissed
  if (!hasActiveJob || dismissed || !job) return null;

  const handleDismiss = () => {
    setDismissed(true);
    dismissJob();
  };

  const handleViewResults = () => {
    viewCompletedResults();
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        className={styles.toast}
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        {/* Status Icon */}
        <div className={styles.iconContainer}>
          {isChecking && (
            <Loader2 className={styles.iconSpinner} size={24} />
          )}
          {isCompleted && (
            <CheckCircle className={styles.iconSuccess} size={24} />
          )}
          {error && (
            <AlertCircle className={styles.iconError} size={24} />
          )}
          {!isChecking && !isCompleted && !error && (
            <Loader2 className={styles.iconSpinner} size={24} />
          )}
        </div>

        {/* Content */}
        <div className={styles.content}>
          <h4 className={styles.title}>
            {isChecking && 'Checking background generation...'}
            {isCompleted && 'Generation Complete!'}
            {error && 'Generation Failed'}
            {!isChecking && !isCompleted && !error && 'Generation in Progress'}
          </h4>
          <p className={styles.subject}>{job.subject}</p>
          {error && <p className={styles.error}>{error}</p>}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {isCompleted && (
            <button
              className={styles.viewButton}
              onClick={handleViewResults}
            >
              View Results
              <ArrowRight size={16} />
            </button>
          )}
          <button
            className={styles.dismissButton}
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
