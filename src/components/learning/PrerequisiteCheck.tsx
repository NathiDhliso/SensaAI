/**
 * PrerequisiteCheck Component
 * 
 * Phase 3: Cognitive Load Mitigations - Prerequisite Gates
 * Prevents out-of-order learning by showing missing prerequisites.
 * 
 * @see SILVER_BULLET_LEARNING_ARCHITECTURE.md Phase 3.B
 */
import { AlertTriangle, ChevronRight, Lock, CheckCircle2 } from 'lucide-react';
import type { LearningConcept } from '@/lib/types/learning';
import styles from './PrerequisiteCheck.module.css';

interface PrerequisiteCheckProps {
  /** Current concept being viewed */
  concept: LearningConcept;
  /** All concepts in the learning content */
  allConcepts: LearningConcept[];
  /** IDs of concepts the user has completed */
  completedConcepts: string[];
  /** Callback when user clicks a prerequisite to navigate to it */
  onPrerequisiteClick?: (conceptId: string) => void;
  /** Whether to block content or just warn */
  mode?: 'block' | 'warn';
  /** Custom warning message */
  warningMessage?: string;
}

interface PrerequisiteConcept {
  id: string;
  name: string;
  completed: boolean;
}

/**
 * Resolves prerequisite names/IDs to actual concept data.
 */
function resolvePrerequisites(
  prerequisites: string[],
  allConcepts: LearningConcept[],
  completedConcepts: string[]
): PrerequisiteConcept[] {
  return prerequisites.map(prereq => {
    // Try to find by name first (prerequisites are stored as names)
    const concept = allConcepts.find(c => 
      c.name.toLowerCase() === prereq.toLowerCase() ||
      c.id === prereq
    );
    
    return {
      id: concept?.id || prereq,
      name: concept?.name || prereq,
      completed: concept 
        ? completedConcepts.includes(concept.id)
        : false,
    };
  });
}

export function PrerequisiteCheck({
  concept,
  allConcepts,
  completedConcepts,
  onPrerequisiteClick,
  mode = 'warn',
  warningMessage = 'Complete these concepts first for best understanding:',
}: PrerequisiteCheckProps) {
  // Resolve prerequisites to concept data
  const resolvedPrereqs = resolvePrerequisites(
    concept.prerequisites || [],
    allConcepts,
    completedConcepts
  );
  
  // Check which prerequisites are missing
  const missingPrereqs = resolvedPrereqs.filter(p => !p.completed);
  const completedPrereqs = resolvedPrereqs.filter(p => p.completed);
  
  // If all prerequisites are met, don't show anything
  if (missingPrereqs.length === 0) {
    return null;
  }
  
  const isBlocked = mode === 'block';
  
  return (
    <div className={`${styles.container} ${isBlocked ? styles.blocked : styles.warning}`}>
      <div className={styles.header}>
        <AlertTriangle className={styles.icon} size={20} />
        <span className={styles.title}>
          {isBlocked ? 'Prerequisites Required' : 'Recommended Prerequisites'}
        </span>
      </div>
      
      <p className={styles.message}>{warningMessage}</p>
      
      <div className={styles.prereqList}>
        {/* Missing prerequisites */}
        {missingPrereqs.map(prereq => (
          <button
            key={prereq.id}
            className={styles.prereqItem}
            onClick={() => onPrerequisiteClick?.(prereq.id)}
            disabled={!onPrerequisiteClick}
          >
            <Lock size={14} className={styles.prereqIcon} />
            <span className={styles.prereqName}>{prereq.name}</span>
            <ChevronRight size={14} className={styles.chevron} />
          </button>
        ))}
        
        {/* Completed prerequisites (if any) */}
        {completedPrereqs.length > 0 && (
          <div className={styles.completedSection}>
            <span className={styles.completedLabel}>Already completed:</span>
            {completedPrereqs.map(prereq => (
              <div key={prereq.id} className={styles.completedItem}>
                <CheckCircle2 size={14} className={styles.checkIcon} />
                <span>{prereq.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {isBlocked && (
        <div className={styles.blockedOverlay}>
          <Lock size={32} />
          <p>Complete prerequisites to unlock this concept</p>
        </div>
      )}
    </div>
  );
}

/**
 * Hook to check if a concept's prerequisites are met.
 */
export function usePrerequisiteCheck(
  concept: LearningConcept | null,
  allConcepts: LearningConcept[],
  completedConcepts: string[]
): { 
  isReady: boolean; 
  missingCount: number; 
  missingNames: string[];
} {
  if (!concept || !concept.prerequisites || concept.prerequisites.length === 0) {
    return { isReady: true, missingCount: 0, missingNames: [] };
  }
  
  const resolved = resolvePrerequisites(
    concept.prerequisites,
    allConcepts,
    completedConcepts
  );
  
  const missing = resolved.filter(p => !p.completed);
  
  return {
    isReady: missing.length === 0,
    missingCount: missing.length,
    missingNames: missing.map(p => p.name),
  };
}

export default PrerequisiteCheck;
