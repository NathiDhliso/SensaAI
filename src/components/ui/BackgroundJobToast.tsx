/**
 * BackgroundJobToast Component
 * 
 * Displays a subtle notification when the user navigates AWAY from the
 * generation page while a job is still running. Only appears when:
 * 1. There's an active generation job
 * 2. User is NOT currently on the /generate page
 * 
 * This lets users know their generation continues in the background.
 */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2, X, ArrowRight } from 'lucide-react';
import { useBackgroundJobRecovery } from '@/shared/hooks/useBackgroundJobRecovery';
import styles from './BackgroundJobToast.module.css';

export default function BackgroundJobToast() {
  const location = useLocation();
  const navigate = useNavigate();
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
  const [lastPath, setLastPath] = useState(location.pathname);

  // Check if user is currently on the generation page (with or without subject param)
  const isOnGeneratePage = location.pathname.startsWith('/generate');

  // Reset dismissed state when user leaves and returns to a non-generate page
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname);
    // If leaving generate page, reset dismissed so toast can show
    if (lastPath.startsWith('/generate') && !isOnGeneratePage) {
      setDismissed(false);
    }
  }

  // Auto-check status when we detect an active job (and not on generate page)
  useEffect(() => {
    if (hasActiveJob && !dismissed && !isOnGeneratePage) {
      checkJobStatus();
    }
  }, [hasActiveJob, dismissed, isOnGeneratePage, checkJobStatus]);

  // Don't show if:
  // - No active job
  // - Already dismissed  
  // - User is currently ON the generate page (they can see the full UI)
  if (!hasActiveJob || dismissed || !job || isOnGeneratePage) return null;

  const handleDismiss = () => {
    setDismissed(true);
    dismissJob();
  };

  const handleViewResults = () => {
    viewCompletedResults();
    setDismissed(true);
  };

  // Navigate to generation page when toast is clicked
  const handleGoToGenerate = () => {
    if (job?.subject) {
      navigate(`/generate/${encodeURIComponent(job.subject)}`);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className={styles.toast}
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        onClick={handleGoToGenerate}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleGoToGenerate()}
        style={{ cursor: 'pointer' }}
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
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
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
