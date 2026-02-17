/**
 * PhaseNavigator Component
 * 
 * Displays a visual breadcrumb/stepper showing the current phase
 * in the Velocity Learning workflow and which phases are completed.
 */
import { motion } from 'framer-motion';
import {
  Rocket,
  Map as MapIcon,
  Target,
  Brain,
  Trophy,
  CheckCircle2,
  TreePine
} from 'lucide-react';
import type { LearningPhase } from '@/shared/hooks/useLearningFlow';
import { useTreeNarrative } from '@/shared/hooks/useTreeNarrative';
import styles from './PhaseNavigator.module.css';
// ============================================================================
// TYPES
// ============================================================================
interface PhaseNavigatorProps {
  currentPhase: LearningPhase;
  completedPhases: LearningPhase[];
  className?: string;
}
// ============================================================================
// PHASE CONFIGURATION
// ============================================================================
const PHASE_CONFIG = {
  PRIME: { label: 'Lock In', treeLabel: 'Plant', icon: Rocket, treeIcon: TreePine, order: 1, verb: 'See' },
  BUILD: { label: 'Map Concepts', treeLabel: 'Graft', icon: MapIcon, treeIcon: MapIcon, order: 2, verb: 'See' },
  DIAGNOSE: { label: 'Assessment', treeLabel: 'Assess', icon: Target, treeIcon: Target, order: 3, verb: 'Know' },
  LEARN: { label: 'Learning', treeLabel: 'Grow', icon: Brain, treeIcon: Brain, order: 4, verb: 'Know' },
  MASTER: { label: 'Mastery', treeLabel: 'Harvest', icon: Trophy, treeIcon: Trophy, order: 5, verb: 'Do' },
  COMPLETE: { label: 'Complete', treeLabel: 'Flourish', icon: CheckCircle2, treeIcon: CheckCircle2, order: 6, verb: 'Keep' }
} as const;
// Only show these phases in the navigator (skip internal phases)
const VISIBLE_PHASES: LearningPhase[] = ['PRIME', 'BUILD', 'DIAGNOSE', 'LEARN', 'MASTER', 'COMPLETE'];
// ============================================================================
// COMPONENT
// ============================================================================
export function PhaseNavigator({
  currentPhase,
  completedPhases,
  className = ''
}: PhaseNavigatorProps) {
  const narrative = useTreeNarrative();
  const visiblePhases = VISIBLE_PHASES;
  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.phases}>
        {visiblePhases.map((phase, index) => {
          const config = PHASE_CONFIG[phase as keyof typeof PHASE_CONFIG];
          const Icon = narrative.isActive ? config.treeIcon : config.icon;
          const displayLabel = narrative.isActive ? config.treeLabel : config.label;
          const mappedPhase = (currentPhase === 'SCOUT' || currentPhase === 'PREVIEW') ? 'BUILD' : currentPhase;
          const isActive = phase === mappedPhase;
          const isCompleted = completedPhases.includes(phase);
          const isUpcoming = !isActive && !isCompleted;
          return (
            <div key={phase} className={styles.phaseWrapper}>
              {/* Connector Line */}
              {index > 0 && (
                <div className={styles.connector}>
                  <div
                    className={`${styles.connectorLine} ${isCompleted || isActive ? styles.connectorComplete : ''
                      }`}
                  />
                </div>
              )}
              {/* Phase Step */}
              <motion.div
                className={`${styles.phase} ${isActive ? styles.phaseActive : ''
                  } ${isCompleted ? styles.phaseComplete : ''} ${isUpcoming ? styles.phaseUpcoming : ''
                  }`}
                initial={false}
                animate={
                  isActive
                    ? {
                      scale: [1, 1.05, 1],
                      transition: {
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }
                    }
                    : {}
                }
              >
                <div className={styles.phaseIcon}>
                  {isCompleted ? (
                    <CheckCircle2 size={20} className={styles.iconComplete} />
                  ) : (
                    <Icon size={20} />
                  )}
                </div>
                <div className={styles.phaseInfo}>
                  <span className={styles.phaseNumber}>{index + 1}</span>
                  <span className={styles.phaseLabel}>{displayLabel}</span>
                  <span className={styles.phaseVerb}>{config.verb}</span>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default PhaseNavigator;
