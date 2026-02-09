/**
 * CognitiveGauge Component
 * 
 * Displays real-time cognitive load indicator to help users
 * understand their mental state and take breaks when needed.
 */
import { useState } from 'react';
import { Brain, Zap, AlertTriangle, Battery, HelpCircle } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import styles from './CognitiveGauge.module.css';
interface CognitiveGaugeProps {
 /** Compact display mode for smaller spaces */
 compact?: boolean;
}
export default function CognitiveGauge({ compact = false }: CognitiveGaugeProps) {
 const { currentSession, getCognitiveLoadLevel } = useLearningStore();
 const [showTooltip, setShowTooltip] = useState(false);
 const loadLevel = getCognitiveLoadLevel();
 const loadPercent = currentSession?.cognitiveMetrics?.currentLoad ?? 0;
 // Get status message based on load level
 const getStatusMessage = () => {
 switch (loadLevel) {
 case 'low':
 return 'Fresh';
 case 'optimal':
 return 'Focused';
 case 'high':
 return 'Warming';
 case 'overload':
 return 'Rest needed';
 }
 };
 // Get icon based on load level
 const getIcon = () => {
 switch (loadLevel) {
 case 'low':
 return <Battery className={styles.icon} />;
 case 'optimal':
 return <Zap className={styles.icon} />;
 case 'high':
 return <Brain className={styles.icon} />;
 case 'overload':
 return <AlertTriangle className={styles.icon} />;
 }
 };
 return (
 <div
 className={`${styles.container} ${compact ? styles.compact : ''}`}
 onMouseEnter={() => setShowTooltip(true)}
 onMouseLeave={() => setShowTooltip(false)}
 >
 <div className={styles.label}>
 <Brain className={styles.icon} />
 <span>Mental Load</span>
 <HelpCircle size={12} className={styles.helpIcon} />
 </div>
 <div className={styles.gaugeBar}>
 <div
 className={`${styles.gaugeFill} ${styles[loadLevel]}`}
 style={{ width: `${loadPercent}%` }}
 />
 </div>
 <div className={`${styles.status} ${styles[loadLevel]}`}>
 {getIcon()}
 {getStatusMessage()}
 </div>
 {/* Tooltip explaining cognitive load */}
 {showTooltip && (
 <div className={styles.tooltip}>
 <strong>What is Mental Load?</strong>
 <p>
 Based on Cognitive Load Theory, working memory has a natural capacity.
 This gauge tracks utilization to suggest optimal timing for
 consolidation breaks.
 </p>
 <ul>
 <li><strong>Fresh:</strong> Ideal for challenging concepts</li>
 <li><strong>Focused:</strong> Peak learning zone</li>
 <li><strong>Warming:</strong> Consider a short break</li>
 <li><strong>Rest needed:</strong> Take a 5-min break</li>
 </ul>
 </div>
 )}
 </div>
 );
}