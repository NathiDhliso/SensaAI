import React from 'react';
/**
 * HelpModal Component
 * 
 * Comprehensive help modal with navigation tips, keyboard shortcuts,
 * and guidance for using all features of the learning platform.
 */
import { X, Keyboard, Navigation, Brain, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import styles from './HelpModal.module.css';
interface HelpModalProps {
 isOpen: boolean;
 onClose: () => void;
}
// Learning flow steps
const LEARNING_FLOW_PLAYFUL = [
 { icon: '1', label: 'Diagnostic' },
 { icon: '2', label: 'Learn' },
 { icon: '3', label: 'Palace' },
 { icon: '4', label: 'Sprint' },
 { icon: '5', label: 'Ready!' }
];
const LEARNING_FLOW_SCHOLARLY = [
 { icon: '1', label: 'Diagnostic' },
 { icon: '2', label: 'Learn' },
 { icon: '3', label: 'Recall' },
 { icon: '4', label: 'Verify' },
 { icon: '5', label: 'Complete' }
];
// Navigation tips by area
const NAVIGATION_TIPS_PLAYFUL = [
 { title: 'Home Page', desc: 'Enter a subject and click Generate. The diagnostic quiz assesses what you already know.' },
 { title: 'Learn Page', desc: 'Work through concepts one by one. Use the journey map on the left to navigate. Click \'Mark as Complete\' when ready.' },
 { title: 'Memory Palace', desc: 'Visual map of all concepts. Click buildings to review. Use Street View for immersive exploration.' },
 { title: 'Sprint', desc: 'Fast yes/no quiz. Appears at 50% progress. Tests if you can recognize concepts instantly.' },
 { title: 'Confusion Drills', desc: 'A/B choice questions to distinguish similar concepts. Triggered during learning.' }
];
const NAVIGATION_TIPS_SCHOLARLY = [
 { title: 'Home', desc: 'Enter a subject and generate content. The diagnostic assessment evaluates prior knowledge.' },
 { title: 'Study', desc: 'Work through concepts sequentially. Use the sidebar to navigate. Mark concepts complete when ready.' },
 { title: 'Concept Map', desc: 'Visual overview of all concepts and their relationships. Click nodes to review.' },
 { title: 'Verification', desc: 'Rapid-fire assessment at 50% progress. Tests instant concept recognition.' },
 { title: 'Discrimination Drills', desc: 'A/B choice questions to distinguish similar concepts. Triggered during study.' }
];
// Feature tips
const FEATURE_TIPS_PLAYFUL = [
 { title: 'Speed Reader Timer', desc: 'Tracks your reading time per concept. Aim for 2 minutes. Click to minimize if distracting.' },
 { title: 'Cognitive Load Gauge', desc: 'Shows your mental state. Green = fresh, Purple = focused, Amber = warming, Red = take a break.' },
 { title: 'Neural Reset', desc: 'Appears when you need a break. Follow the 2-minute guided reset to refresh your mind.' },
 { title: 'Sprint Ready Banner', desc: 'Appears when all concepts are complete. Take the sprint to confirm exam readiness.' }
];
const FEATURE_TIPS_SCHOLARLY = [
 { title: 'Reading Timer', desc: 'Tracks reading time per concept. Target: 2 minutes. Can be minimized.' },
 { title: 'Cognitive Load Indicator', desc: 'Displays current mental load. Green = optimal, Amber = elevated, Red = rest recommended.' },
 { title: 'Neural Reset', desc: 'Triggered when cognitive load is high. A 2-minute guided pause to restore focus.' },
 { title: 'Completion Prompt', desc: 'Appears when all concepts are studied. Proceed to verification to confirm readiness.' }
];
// Keyboard shortcuts
const KEYBOARD_SHORTCUTS = [
 { keys: ['Y', 'N'], label: 'Yes/No in Sprint' },
 { keys: ['A', 'B'], label: 'Choice in Drills' },
 { keys: ['1', '2'], label: 'Alt for A/B' },
 { keys: ['1-4'], label: 'Diagnostic options' },
 { keys: ['Esc'], label: 'Close modals' },
 { keys: ['', ''], label: 'Navigate concepts' }
];
export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
 const { isScholarly } = useVisualTheme();
 if (!isOpen) return null;
 const LEARNING_FLOW = isScholarly ? LEARNING_FLOW_SCHOLARLY : LEARNING_FLOW_PLAYFUL;
 const NAVIGATION_TIPS = isScholarly ? NAVIGATION_TIPS_SCHOLARLY : NAVIGATION_TIPS_PLAYFUL;
 const FEATURE_TIPS = isScholarly ? FEATURE_TIPS_SCHOLARLY : FEATURE_TIPS_PLAYFUL;
 return (
 <AnimatePresence>
 <div className={styles.overlay} onClick={onClose}>
 <motion.div
 className={styles.modal}
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 onClick={e => e.stopPropagation()}
 >
 {/* Header */}
 <div className={styles.header}>
 <div className={styles.headerTitle}>
 <h2 className={styles.title}>{isScholarly ? 'User Guide' : 'How to Use SensaAI'}</h2>
 </div>
 <button className={styles.closeButton} onClick={onClose}>
 <X size={20} />
 </button>
 </div>
 {/* Content */}
 <div className={styles.content}>
 {/* Learning Flow */}
 <div className={styles.section}>
 <h3 className={styles.sectionTitle}>
 <Target className={styles.sectionIcon} />
 Your Learning Journey
 </h3>
 <div className={styles.flowChart}>
 {LEARNING_FLOW.map((step, index) => (
 <React.Fragment key={step.label}>
 <div className={styles.flowStep}>
 <span className={styles.flowIcon}>{step.icon}</span>
 <span className={styles.flowLabel}>{step.label}</span>
 </div>
 {index < LEARNING_FLOW.length - 1 && (
 <span className={styles.flowArrow}></span>
 )}
 </React.Fragment>
 ))}
 </div>
 </div>
 {/* Navigation Tips */}
 <div className={styles.section}>
 <h3 className={styles.sectionTitle}>
 <Navigation className={styles.sectionIcon} />
 Navigation Guide
 </h3>
 <div className={styles.tipsList}>
 {NAVIGATION_TIPS.map(tip => (
 <div key={tip.title} className={styles.tip}>
 <div className={styles.tipContent}>
 <div className={styles.tipTitle}>{tip.title}</div>
 <div className={styles.tipDesc}>{tip.desc}</div>
 </div>
 </div>
 ))}
 </div>
 </div>
 {/* Feature Tips */}
 <div className={styles.section}>
 <h3 className={styles.sectionTitle}>
 <Brain className={styles.sectionIcon} />
 Smart Features
 </h3>
 <div className={styles.tipsList}>
 {FEATURE_TIPS.map(tip => (
 <div key={tip.title} className={styles.tip}>
 <div className={styles.tipContent}>
 <div className={styles.tipTitle}>{tip.title}</div>
 <div className={styles.tipDesc}>{tip.desc}</div>
 </div>
 </div>
 ))}
 </div>
 </div>
 {/* Keyboard Shortcuts */}
 <div className={styles.section}>
 <h3 className={styles.sectionTitle}>
 <Keyboard className={styles.sectionIcon} />
 Keyboard Shortcuts
 </h3>
 <div className={styles.shortcutsList}>
 {KEYBOARD_SHORTCUTS.map(shortcut => (
 <div key={shortcut.label} className={styles.shortcut}>
 <div>
 {shortcut.keys.map((key, idx) => (
 <span key={key}>
 <span className={styles.key}>{key}</span>
 {idx < shortcut.keys.length - 1 && ' / '}
 </span>
 ))}
 </div>
 <span className={styles.shortcutLabel}>{shortcut.label}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 </motion.div>
 </div>
 </AnimatePresence>
 );
}
