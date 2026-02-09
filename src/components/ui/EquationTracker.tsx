/**
 * EquationTracker Component
 * 
 * Real-time visualization of the Universal Learning Equation:
 * I = min(h, G × Q_f × Q_M × Q_P)
 * 
 * Shows current values and highlights the weakest variable.
 * NEW: Proactive intervention when Q_P is critically low (< 0.2) during Study phase.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import { Z_INDEX } from '@/shared/constants/z-index';
import { EQUATION_COLORS_HEX, MASTERY_THRESHOLD } from '@/shared/constants/sensa-flow-constants';
import styles from './EquationTracker.module.css';
// ============================================================================
// Types
// ============================================================================
/** Threshold below which grinding is mathematically futile */
const LOW_PREP_THRESHOLD = 0.2;
interface EquationTrackerProps {
 G: number;
 Q_P: number;
 Q_M: number;
 Q_f: number;
 I: number;
 weakestVariable?: 'G' | 'Q_P' | 'Q_M' | 'Q_f';
 position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
 compact?: boolean;
 /** Current learning phase - enables proactive intervention warnings */
 currentPhase?: 'see' | 'explore' | 'note' | 'study' | 'apply' | 'complete';
 /** Callback when user should go back to Explore phase */
 onSuggestBacktrack?: () => void;
}
// ============================================================================
// Component
// ============================================================================
export function EquationTracker({
 G,
 Q_P,
 Q_M,
 Q_f,
 I,
 weakestVariable,
 position = 'top-right',
 compact = false,
 currentPhase,
 onSuggestBacktrack
}: EquationTrackerProps) {
 const hasMastery = I >= MASTERY_THRESHOLD;
 // Proactive intervention: Detect when grinding is futile
 // If Q_P < 0.2 during Study/Apply phase, the math ensures mastery is impossible
 const isGrindingFutile = currentPhase && 
 ['study', 'apply'].includes(currentPhase) && 
 Q_P < LOW_PREP_THRESHOLD;
 const positionStyles = {
 'top-right': { top: '1rem', right: '1rem' },
 'bottom-right': { bottom: '1rem', right: '1rem' },
 'top-left': { top: '1rem', left: '1rem' },
 'bottom-left': { bottom: '1rem', left: '1rem' }
 };
 const renderVariable = (
 label: string,
 value: number,
 color: string,
 isWeak: boolean
 ) => (
 <div
 className={`${styles.variable} ${isWeak ? styles.weak : ''}`}
 style={{ '--var-color': color } as React.CSSProperties}
 >
 <span className={styles.varLabel}>{label}</span>
 <motion.span
 className={styles.varValue}
 key={value.toFixed(2)}
 initial={{ scale: 1.2, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 >
 {(value * 100).toFixed(0)}%
 </motion.span>
 {isWeak && (
 <TrendingDown size={12} className={styles.weakIcon} />
 )}
 </div>
 );
 if (compact) {
 return (
 <motion.div
 className={`${styles.containerCompact}`}
 style={{
 ...positionStyles[position],
 zIndex: Z_INDEX.EQUATION_TRACKER
 }}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 >
 <div className={styles.compactEquation}>
 <span className={styles.compactLabel}>I</span>
 <span className={`${styles.compactValue} ${hasMastery ? styles.mastered : ''}`}>
 {(I * 100).toFixed(0)}%
 </span>
 </div>
 {hasMastery && <Target size={14} className={styles.masteryIcon} />}
 </motion.div>
 );
 }
 return (
 <motion.div
 className={styles.container}
 style={{
 ...positionStyles[position],
 zIndex: Z_INDEX.EQUATION_TRACKER
 }}
 initial={{ opacity: 0, x: 50 }}
 animate={{ opacity: 1, x: 0 }}
 >
 {/* Header */}
 <div className={styles.header}>
 <span className={styles.headerLabel}>Mastery Index</span>
 <motion.span
 className={`${styles.headerValue} ${hasMastery ? styles.mastered : ''}`}
 key={I.toFixed(2)}
 animate={{ scale: [1, 1.1, 1] }}
 transition={{ duration: 0.3 }}
 >
 I = {(I * 100).toFixed(0)}%
 </motion.span>
 </div>
 {/* Equation Preview */}
 <div className={styles.equation}>
 <code>I = G × Q<sub>f</sub> × Q<sub>M</sub> × Q<sub>P</sub></code>
 </div>
 {/* Variables */}
 <div className={styles.variables}>
 {renderVariable('G', G, EQUATION_COLORS_HEX.G, weakestVariable === 'G')}
 <span className={styles.operator}>×</span>
 {renderVariable('Q_f', Q_f, EQUATION_COLORS_HEX.Q_f, weakestVariable === 'Q_f')}
 <span className={styles.operator}>×</span>
 {renderVariable('Q_M', Q_M, EQUATION_COLORS_HEX.Q_M, weakestVariable === 'Q_M')}
 <span className={styles.operator}>×</span>
 {renderVariable('Q_P', Q_P, EQUATION_COLORS_HEX.Q_P, weakestVariable === 'Q_P')}
 </div>
 {/* Mastery Threshold Indicator */}
 <div className={styles.threshold}>
 <div
 className={styles.thresholdBar}
 style={{
 '--progress': `${Math.min(I / MASTERY_THRESHOLD, 1) * 100}%`,
 '--color': hasMastery ? 'var(--color-success)' : 'var(--color-primary)'
 } as React.CSSProperties}
 />
 <span className={styles.thresholdLabel}>
 {hasMastery ? (
 <>
 <TrendingUp size={12} />
 Mastery Achieved!
 </>
 ) : (
 `${Math.round((I / MASTERY_THRESHOLD) * 100)}% to mastery`
 )}
 </span>
 </div>
 {/* Proactive Intervention: Low Q_P Warning */}
 <AnimatePresence>
 {isGrindingFutile && (
 <motion.div
 className={styles.interventionWarning}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 10 }}
 >
 <AlertTriangle size={14} className={styles.warningIcon} />
 <span className={styles.warningText}>
 Low prep score ({(Q_P * 100).toFixed(0)}%) — consider revisiting Explore phase
 </span>
 {onSuggestBacktrack && (
 <button 
 className={styles.backtrackButton}
 onClick={onSuggestBacktrack}
 >
 Go Back
 </button>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 </motion.div>
 );
}
export default EquationTracker;