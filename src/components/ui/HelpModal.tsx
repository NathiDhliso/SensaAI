import React from 'react';

/**
 * HelpModal Component
 * 
 * Comprehensive help modal with navigation tips, keyboard shortcuts,
 * and guidance for using all features of the learning platform.
 */

import { X, Keyboard, Navigation, Brain, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './HelpModal.module.css';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Learning flow steps
const LEARNING_FLOW = [
    { icon: '📋', label: 'Diagnostic' },
    { icon: '📚', label: 'Learn' },
    { icon: '🧠', label: 'Palace' },
    { icon: '⚡', label: 'Sprint' },
    { icon: '🎯', label: 'Ready!' },
];

// Navigation tips by area
const NAVIGATION_TIPS = [
    {
        icon: '🏠',
        title: 'Home Page',
        desc: 'Enter a subject and click Generate. The diagnostic quiz assesses what you already know.',
    },
    {
        icon: '📚',
        title: 'Learn Page',
        desc: 'Work through concepts one by one. Use the journey map on the left to navigate. Click \'Mark as Complete\' when ready.',
    },
    {
        icon: '🗺️',
        title: 'Memory Palace',
        desc: 'Visual map of all concepts. Click buildings to review. Use Street View for immersive exploration.',
    },
    {
        icon: '⚡',
        title: 'Sprint',
        desc: 'Fast yes/no quiz. Appears at 50% progress. Tests if you can recognize concepts instantly.',
    },
    {
        icon: '⚔️',
        title: 'Confusion Drills',
        desc: 'A/B choice questions to distinguish similar concepts. Triggered during learning.',
    },
];

// Feature tips
const FEATURE_TIPS = [
    {
        icon: '⏱️',
        title: 'Speed Reader Timer',
        desc: 'Tracks your reading time per concept. Aim for 2 minutes. Click to minimize if distracting.',
    },
    {
        icon: '🧠',
        title: 'Cognitive Load Gauge',
        desc: 'Shows your mental state. Green = fresh, Purple = focused, Amber = warming, Red = take a break.',
    },
    {
        icon: '🧘',
        title: 'Neural Reset',
        desc: 'Appears when you need a break. Follow the 2-minute guided reset to refresh your mind.',
    },
    {
        icon: '🎯',
        title: 'Sprint Ready Banner',
        desc: 'Appears when all concepts are complete. Take the sprint to confirm exam readiness.',
    },
];

// Keyboard shortcuts
const KEYBOARD_SHORTCUTS = [
    { keys: ['Y', 'N'], label: 'Yes/No in Sprint' },
    { keys: ['A', 'B'], label: 'Choice in Drills' },
    { keys: ['1', '2'], label: 'Alt for A/B' },
    { keys: ['1-4'], label: 'Diagnostic options' },
    { keys: ['Esc'], label: 'Close modals' },
    { keys: ['←', '→'], label: 'Navigate concepts' },
];

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
    if (!isOpen) return null;

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
                            <span className={styles.headerIcon}>❓</span>
                            <h2 className={styles.title}>How to Use SensaPBL</h2>
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
                                            <span className={styles.flowArrow}>→</span>
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
                                        <span className={styles.tipIcon}>{tip.icon}</span>
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
                                        <span className={styles.tipIcon}>{tip.icon}</span>
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
