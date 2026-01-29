/**
 * SensaAI User Onboarding Flow
 * 
 * First-time user introduction to the Learning Velocity Engine.
 * Progressive disclosure of blank sheet testing, spacing, and confusion prevention.
 * 
 * Requirements: Task 13.4 (User onboarding experience)
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    Brain,
    Target,
    CheckCircle2,
    ArrowRight,
    Clock,
    HelpCircle,
    Lightbulb
} from 'lucide-react';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import styles from './OnboardingFlow.module.css';

// ============================================================================
// TYPES
// ============================================================================

export type OnboardingStep =
    | 'welcome'
    | 'blank-sheet-intro'
    | 'practice-test'
    | 'spacing-intro'
    | 'complete';

export interface OnboardingFlowProps {
    /** User name for personalization */
    userName?: string;
    /** Callback when onboarding completes */
    onComplete: () => void;
    /** Callback to skip onboarding */
    onSkip?: () => void;
}

interface StepContent {
    icon: React.ReactNode;
    title: string;
    description: string;
    tips?: string[];
}

// ============================================================================
// STEP CONTENT
// ============================================================================

const STEP_CONTENT: Record<OnboardingStep, StepContent> = {
    welcome: {
        icon: <Sparkles size={48} />,
        title: 'Welcome to SensaAI Learning',
        description: 'Learn faster with science-backed active recall. Instead of passive reading, you\'ll actively retrieve knowledge - the most powerful way to build lasting memory.',
        tips: [
            'Test yourself before you learn',
            'Short, focused learning sessions',
            'Smart reminders before you forget'
        ]
    },
    'blank-sheet-intro': {
        icon: <Brain size={48} />,
        title: 'The Blank Sheet Test',
        description: 'Before seeing any content, you\'ll write down everything you know about a topic. This activates your memory and shows you exactly what to focus on.',
        tips: [
            'Don\'t worry if you don\'t know much yet',
            'Write key terms, concepts, connections',
            'Even partial answers help you learn'
        ]
    },
    'practice-test': {
        icon: <Target size={48} />,
        title: 'Let\'s Try It!',
        description: 'Here\'s a quick practice: Write everything you know about "effective learning techniques" in 60 seconds.',
        tips: [
            'Just start writing - anything counts',
            'This is low-stakes practice',
            'You\'ll see your score afterward'
        ]
    },
    'spacing-intro': {
        icon: <Clock size={48} />,
        title: 'Smart Spacing',
        description: 'We\'ll remind you to review concepts at the optimal time - just before you\'d forget them. This multiplies your retention.',
        tips: [
            'Reviews get spaced further apart over time',
            '1 day → 3 days → 7 days → 14 days',
            'Quick 2-minute refreshers, not full re-learning'
        ]
    },
    complete: {
        icon: <CheckCircle2 size={48} />,
        title: 'You\'re Ready!',
        description: 'You understand the core method. Start your first real learning session and experience the difference.',
        tips: [
            'Each concept takes about 3-5 minutes',
            'Take breaks when recommended',
            'Trust the process - it works!'
        ]
    }
};

const STEP_ORDER: OnboardingStep[] = [
    'welcome',
    'blank-sheet-intro',
    'practice-test',
    'spacing-intro',
    'complete'
];

// ============================================================================
// COMPONENT
// ============================================================================

export function OnboardingFlow({
    userName,
    onComplete,
    onSkip
}: OnboardingFlowProps) {
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
    const [practiceText, setPracticeText] = useState('');
    const [practiceSubmitted, setPracticeSubmitted] = useState(false);

    const stepIndex = STEP_ORDER.indexOf(currentStep);
    const progress = ((stepIndex + 1) / STEP_ORDER.length) * 100;
    const content = STEP_CONTENT[currentStep];

    const handleNext = useCallback(() => {
        const nextIndex = stepIndex + 1;
        if (nextIndex < STEP_ORDER.length) {
            setCurrentStep(STEP_ORDER[nextIndex]);
        } else {
            onComplete();
        }
    }, [stepIndex, onComplete]);

    const handlePracticeSubmit = useCallback(() => {
        setPracticeSubmitted(true);
        // Show feedback for 2 seconds then proceed
        setTimeout(handleNext, UI_TIMINGS.TOAST_SHORT);
    }, [handleNext]);

    const renderPracticeTest = () => (
        <div className={styles.practiceSection}>
            {!practiceSubmitted ? (
                <>
                    <textarea
                        className={styles.practiceInput}
                        placeholder="Write what you know about effective learning techniques..."
                        value={practiceText}
                        onChange={(e) => setPracticeText(e.target.value)}
                        autoFocus
                    />
                    <button
                        className={styles.submitButton}
                        onClick={handlePracticeSubmit}
                        disabled={practiceText.length < 10}
                    >
                        Submit Practice
                        <ArrowRight size={16} />
                    </button>
                </>
            ) : (
                <motion.div
                    className={styles.practiceResult}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <CheckCircle2 size={64} className={styles.successIcon} />
                    <h3>Great job!</h3>
                    <p>You wrote {practiceText.split(/\s+/).length} words. That's the idea - just write what you know!</p>
                </motion.div>
            )}
        </div>
    );

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Progress bar */}
            <div className={styles.progressBar}>
                <div
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Skip button */}
            {onSkip && currentStep !== 'complete' && (
                <button className={styles.skipButton} onClick={onSkip}>
                    Skip intro
                </button>
            )}

            {/* Step content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    className={styles.stepContent}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                >
                    <div className={styles.iconWrapper}>
                        {content.icon}
                    </div>

                    <h1 className={styles.title}>
                        {currentStep === 'welcome' && userName
                            ? `Welcome, ${userName}!`
                            : content.title}
                    </h1>

                    <p className={styles.description}>{content.description}</p>

                    {content.tips && currentStep !== 'practice-test' && (
                        <ul className={styles.tips}>
                            {content.tips.map((tip, i) => (
                                <li key={i}>
                                    <Lightbulb size={16} />
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    )}

                    {currentStep === 'practice-test' ? (
                        renderPracticeTest()
                    ) : (
                        <button className={styles.nextButton} onClick={handleNext}>
                            {currentStep === 'complete' ? 'Start Learning' : 'Continue'}
                            <ArrowRight size={18} />
                        </button>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Step indicators */}
            <div className={styles.stepIndicators}>
                {STEP_ORDER.map((step, i) => (
                    <div
                        key={step}
                        className={`${styles.indicator} ${i <= stepIndex ? styles.active : ''}`}
                    />
                ))}
            </div>
        </motion.div>
    );
}

// ============================================================================
// CONTEXTUAL HELP SYSTEM
// ============================================================================

export interface HelpTooltipProps {
    /** Tooltip trigger element */
    children: React.ReactNode;
    /** Help content */
    content: string;
    /** Optional title */
    title?: string;
}

export function HelpTooltip({ children, content, title }: HelpTooltipProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            className={styles.helpWrapper}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            {children}
            <button className={styles.helpTrigger}>
                <HelpCircle size={14} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={styles.helpTooltip}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                    >
                        {title && <strong>{title}</strong>}
                        <p>{content}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// LEARNING SCIENCE EXPLANATIONS
// ============================================================================


export default OnboardingFlow;
