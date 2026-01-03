import styles from './LifecyclePhaseStep.module.css';

interface LifecyclePhase {
  title: string;
  steps: string[];
}

interface LifecyclePhaseStepProps {
  phase: LifecyclePhase;
  stepNumber: number;
  showArrow?: boolean;
}

/**
 * Reusable component for rendering a single lifecycle phase
 * Used in ConceptCard "How" tab and other lifecycle displays
 * 
 * Consolidates duplicated phase rendering pattern:
 * - Phase badge (1, 2, 3)
 * - Phase title
 * - Step list
 */
export function LifecyclePhaseStep({ 
  phase, 
  stepNumber, 
  showArrow = false 
}: LifecyclePhaseStepProps) {
  return (
    <>
      <div className={styles.lifecycleStep}>
        <div className={styles.stepBadge}>{stepNumber}</div>
        <div className={styles.stepContent}>
          <span className={styles.stepLabel}>{phase.title}</span>
          <ul className={styles.stepItems}>
            {phase.steps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ul>
        </div>
      </div>
      {showArrow && <div className={styles.flowArrow}>→</div>}
    </>
  );
}

interface LifecycleFlowProps {
  lifecycle: {
    phase1: LifecyclePhase;
    phase2: LifecyclePhase;
    phase3: LifecyclePhase;
  };
  className?: string;
}

/**
 * Renders the complete 3-phase lifecycle flow
 * PREPARE → MODEL → DELIVER (or custom lifecycle verbs)
 */
export function LifecycleFlow({ lifecycle, className }: LifecycleFlowProps) {
  return (
    <div className={`${styles.lifecycleFlow} ${className || ''}`}>
      <LifecyclePhaseStep phase={lifecycle.phase1} stepNumber={1} showArrow />
      <LifecyclePhaseStep phase={lifecycle.phase2} stepNumber={2} showArrow />
      <LifecyclePhaseStep phase={lifecycle.phase3} stepNumber={3} />
    </div>
  );
}

export default LifecyclePhaseStep;
