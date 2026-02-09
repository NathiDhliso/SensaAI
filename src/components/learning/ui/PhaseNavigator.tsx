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
 CheckCircle2
} from 'lucide-react';
import type { LearningPhase } from '@/shared/hooks/useLearningFlow';
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
 PRIME: { label: 'Lock In', icon: Rocket, order: 1 },
 BUILD: { label: 'Map Concepts', icon: MapIcon, order: 2 },
 DIAGNOSE: { label: 'Assessment', icon: Target, order: 3 },
 LEARN: { label: 'Learning', icon: Brain, order: 4 },
 MASTER: { label: 'Mastery', icon: Trophy, order: 5 },
 COMPLETE: { label: 'Complete', icon: CheckCircle2, order: 6 }
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
 const visiblePhases = VISIBLE_PHASES;
 return (
 <div className={`${styles.container} ${className}`}>
 <div className={styles.phases}>
 {visiblePhases.map((phase, index) => {
 const config = PHASE_CONFIG[phase as keyof typeof PHASE_CONFIG];
 const Icon = config.icon;
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
 className={`${styles.connectorLine} ${
 isCompleted || isActive ? styles.connectorComplete : ''
 }`}
 />
 </div>
 )}
 {/* Phase Step */}
 <motion.div
 className={`${styles.phase} ${
 isActive ? styles.phaseActive : ''
 } ${isCompleted ? styles.phaseComplete : ''} ${
 isUpcoming ? styles.phaseUpcoming : ''
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
 <span className={styles.phaseLabel}>{config.label}</span>
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