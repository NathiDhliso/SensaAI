/**
 * LifecycleNavigator - Always-visible lifecycle progress bar
 * 
 * Shows progress across the 3 lifecycle phases (PREPARE → MODEL → DELIVER)
 * Clickable phases to filter/focus on specific phase concepts.
 * 
 * Cognitive benefit: Students always see WHERE they are in the learning journey
 */

import { useMemo } from 'react';
import { ClipboardList, Settings, BarChart3 } from 'lucide-react';
import { LIFECYCLE_COLORS } from '@/constants/theme-colors';
import styles from './LifecycleNavigator.module.css';

export interface LifecycleLabels {
  phase1: string;
  phase2: string;
  phase3: string;
}

export interface PhaseProgress {
  total: number;
  completed: number;
}

export interface LifecycleNavigatorProps {
  /** Custom lifecycle phase labels (e.g., "PREPARE", "MODEL", "DELIVER") */
  labels: LifecycleLabels;
  /** Progress counts for each phase */
  progress: {
    phase1: PhaseProgress;
    phase2: PhaseProgress;
    phase3: PhaseProgress;
  };
  /** Currently active/focused phase */
  activePhase?: 'phase1' | 'phase2' | 'phase3' | null;
  /** Callback when phase is clicked */
  onPhaseClick?: (phase: 'phase1' | 'phase2' | 'phase3') => void;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

const PHASE_ICONS = {
  phase1: ClipboardList,
  phase2: Settings,
  phase3: BarChart3,
};

const PHASE_COLORS = LIFECYCLE_COLORS;

export function LifecycleNavigator({
  labels,
  progress,
  activePhase,
  onPhaseClick,
  compact = false,
}: LifecycleNavigatorProps) {

  const phases = useMemo(() => [
    { key: 'phase1' as const, label: labels.phase1, progress: progress.phase1 },
    { key: 'phase2' as const, label: labels.phase2, progress: progress.phase2 },
    { key: 'phase3' as const, label: labels.phase3, progress: progress.phase3 },
  ], [labels, progress]);

  const totalProgress = useMemo(() => {
    const total = progress.phase1.total + progress.phase2.total + progress.phase3.total;
    const completed = progress.phase1.completed + progress.phase2.completed + progress.phase3.completed;
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [progress]);

  return (
    <nav
      className={`${styles.navigator} ${compact ? styles.compact : ''}`}
      aria-label="Learning lifecycle progress"
    >
      <div className={styles.phasesContainer}>
        {phases.map((phase, index) => {
          const Icon = PHASE_ICONS[phase.key];
          const colors = PHASE_COLORS[phase.key];
          const percentage = phase.progress.total > 0
            ? Math.round((phase.progress.completed / phase.progress.total) * 100)
            : 0;
          const isActive = activePhase === phase.key;
          const isClickable = !!onPhaseClick;

          return (
            <div key={phase.key} className={styles.phaseWrapper}>
              <button
                className={`${styles.phase} ${isActive ? styles.active : ''}`}
                onClick={() => onPhaseClick?.(phase.key)}
                disabled={!isClickable}
                style={{
                  '--phase-bg': colors.bg,
                  '--phase-fill': colors.fill,
                  '--phase-text': colors.text,
                } as React.CSSProperties}
                aria-current={isActive ? 'step' : undefined}
              >
                <div className={styles.phaseHeader}>
                  <Icon size={compact ? 16 : 18} className={styles.phaseIcon} />
                  <span className={styles.phaseLabel}>{phase.label}</span>
                </div>

                <div className={styles.progressBarContainer}>
                  <div
                    className={styles.progressBar}
                    style={{ width: `${percentage}%` }}
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>

                <div className={styles.phaseStats}>
                  <span className={styles.phaseCount}>
                    {phase.progress.completed}/{phase.progress.total}
                  </span>
                  {!compact && (
                    <span className={styles.phasePercentage}>{percentage}%</span>
                  )}
                </div>
              </button>

              {/* Arrow connector */}
              {index < phases.length - 1 && (
                <div className={styles.connector} aria-hidden="true">
                  <span className={styles.arrow}>→</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overall progress summary */}
      {!compact && (
        <div className={styles.totalProgress}>
          <span className={styles.totalLabel}>Overall Progress</span>
          <div className={styles.totalBarContainer}>
            <div
              className={styles.totalBar}
              style={{ width: `${totalProgress.percentage}%` }}
            />
          </div>
          <span className={styles.totalPercentage}>{totalProgress.percentage}%</span>
        </div>
      )}
    </nav>
  );
}

export default LifecycleNavigator;
