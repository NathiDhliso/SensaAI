/**
 * GuidedPrimer - Step-by-step guided priming experience
 * 
 * A calming, therapist-like wizard that guides students through
 * setting their learning intention one question at a time.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wind,
    Heart,
    Target,
    Gift,
    Sparkles,
    ChevronRight,
    ChevronLeft,
    Volume2,
    VolumeX,
    Music,
    Loader2,
    Square
} from 'lucide-react';
import { useVoice } from '@/hooks/useVoice';
import { audioManager } from '@/lib/audio';
import {
    getMoodAdjustedIntro,
    getRecommendedBreathing,
    BREATHING_EXERCISES,
    type Mood
} from '@/lib/ai/coach';
import { usePersonalizationStore } from '@/store/personalization-store';
import styles from './GuidedPrimer.module.css';

interface GuidedPrimerProps {
    subjectName: string;
    duration: number;
    mood?: Mood;
    onComplete: (data: { reason: string; action: string; reward: string }) => void;
    onBack: () => void;
}

// Quick-select options for each step
const REASON_CHIPS = [
    { label: 'Career growth', icon: '📈' },
    { label: 'Curious mind', icon: '🧠' },
    { label: 'Exam prep', icon: '📚' },
    { label: 'Build something', icon: '🛠️' },
    { label: 'Stay relevant', icon: '🔄' },
];

const ACTION_CHIPS = [
    { label: 'Learn 3 new concepts', icon: '💡' },
    { label: 'Build a concept map', icon: '🗺️' },
    { label: 'Complete one practice', icon: '✅' },
    { label: 'Understand the basics', icon: '📖' },
];

const REWARD_CHIPS = [
    { label: 'Coffee break', icon: '☕' },
    { label: 'Gaming time', icon: '🎮' },
    { label: 'Social scroll', icon: '📱' },
    { label: 'Short walk', icon: '🚶' },
    { label: 'Snack time', icon: '🍪' },
];

type Step = 'breathe' | 'reason' | 'action' | 'reward' | 'ready';

const STEPS: Step[] = ['breathe', 'reason', 'action', 'reward', 'ready'];

export default function GuidedPrimer({
    subjectName,
    duration,
    mood = 'neutral',
    onComplete,
    onBack
}: GuidedPrimerProps) {
    const [currentStep, setCurrentStep] = useState<Step>('breathe');
    const [reason, setReason] = useState('');
    const [action, setAction] = useState('');
    const [reward, setReward] = useState('');
    const [customInput, setCustomInput] = useState<'reason' | 'action' | 'reward' | null>(null);
    const [musicEnabled, setMusicEnabled] = useState(audioManager.getBackgroundMusicEnabled());
    const [narrationEnabled, setNarrationEnabled] = useState(audioManager.getNarrationEnabled());
    const [isTransitioning, setIsTransitioning] = useState(false);
    const isFirstRender = useRef(true);
    const { selectedPersona } = usePersonalizationStore();
    const { toggle, isPlaying: isVoicePlaying, isLoading: isVoiceLoading } = useVoice();


    // Get coach intro and breathing based on mood
    const coachIntro = getMoodAdjustedIntro(selectedPersona, mood);
    const recommendedBreathing = getRecommendedBreathing(mood);
    const breathingExercise = BREATHING_EXERCISES[recommendedBreathing];

    const currentStepIndex = STEPS.indexOf(currentStep);

    // Initialize audio on mount
    useEffect(() => {
        audioManager.preloadPrimerAudio();

        // Start background music if enabled (with delay to avoid overlap)
        const musicTimer = setTimeout(() => {
            if (musicEnabled) {
                audioManager.playBackgroundMusic('ambientStudy');
            }
        }, 500);

        // Cleanup on unmount
        return () => {
            clearTimeout(musicTimer);
            audioManager.fadeOutBackgroundMusic(1000);
            audioManager.stopNarration();
        };
    }, []);

    // Play narration when step changes (with proper sequencing)
    useEffect(() => {
        // Skip on first render to avoid overlap with component mount
        if (isFirstRender.current) {
            isFirstRender.current = false;
            // Play breathe narration after a small delay
            if (narrationEnabled && currentStep === 'breathe') {
                const timer = setTimeout(() => {
                    audioManager.playNarration('breathe');
                }, 300);
                return () => clearTimeout(timer);
            }
            return;
        }

        if (narrationEnabled && !isTransitioning) {
            // Stop any playing narration first
            audioManager.stopNarration();

            const narrationKey = currentStep === 'reason' ? 'reason' :
                currentStep === 'action' ? 'action' :
                    currentStep === 'reward' ? 'reward' :
                        currentStep === 'ready' ? 'ready' : null;

            if (narrationKey) {
                // Small delay to let the UI transition complete
                const timer = setTimeout(() => {
                    audioManager.playNarration(narrationKey);
                }, 400);
                return () => clearTimeout(timer);
            }
        }
    }, [currentStep, narrationEnabled, isTransitioning]);

    // Auto-advance from breathe step after delay
    useEffect(() => {
        if (currentStep === 'breathe') {
            const timer = setTimeout(() => {
                setCurrentStep('reason');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [currentStep]);

    const handleNext = useCallback(() => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < STEPS.length) {
            setCurrentStep(STEPS[nextIndex]);
            setCustomInput(null);
        }
    }, [currentStepIndex]);

    const handlePrev = useCallback(() => {
        if (currentStepIndex > 1) { // Don't go back to breathe
            setCurrentStep(STEPS[currentStepIndex - 1]);
            setCustomInput(null);
        } else {
            onBack();
        }
    }, [currentStepIndex, onBack]);

    // Auto-advance when chip is selected
    const handleChipSelect = (value: string, type: 'reason' | 'action' | 'reward') => {
        if (type === 'reason') setReason(value);
        if (type === 'action') setAction(value);
        if (type === 'reward') setReward(value);
        setCustomInput(null);

        // Auto-advance after a brief moment to show selection
        setIsTransitioning(true);
        setTimeout(() => {
            setIsTransitioning(false);
            handleNext();
        }, 600);
    };

    const handleComplete = () => {
        audioManager.fadeOutBackgroundMusic(1500);
        onComplete({ reason, action, reward });
    };

    const toggleMusic = () => {
        const newValue = !musicEnabled;
        setMusicEnabled(newValue);
        audioManager.setBackgroundMusicEnabled(newValue);
        if (newValue) {
            audioManager.playBackgroundMusic('ambientStudy');
        }
    };

    const toggleNarration = () => {
        const newValue = !narrationEnabled;
        setNarrationEnabled(newValue);
        audioManager.setNarrationEnabled(newValue);
    };

    const canProceed = () => {
        if (currentStep === 'reason') return reason.length > 0;
        if (currentStep === 'action') return action.length > 0;
        if (currentStep === 'reward') return reward.length > 0;
        return true;
    };

    return (
        <div className={styles.container}>
            {/* Audio Controls */}
            <div className={styles.audioControls}>
                <button
                    className={`${styles.audioButton} ${musicEnabled ? styles.active : ''}`}
                    onClick={toggleMusic}
                    title={musicEnabled ? 'Disable music' : 'Enable music'}
                >
                    <Music size={18} />
                </button>
                <button
                    className={`${styles.audioButton} ${narrationEnabled ? styles.active : ''}`}
                    onClick={toggleNarration}
                    title={narrationEnabled ? 'Disable voice' : 'Enable voice'}
                >
                    {narrationEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
            </div>

            {/* Progress Dots */}
            <div className={styles.progressDots}>
                {STEPS.map((step, index) => (
                    <div
                        key={step}
                        className={`${styles.dot} ${index <= currentStepIndex ? styles.dotActive : ''} ${index === currentStepIndex ? styles.dotCurrent : ''}`}
                    />
                ))}
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
                {/* Step 1: Breathe */}
                {currentStep === 'breathe' && (
                    <motion.div
                        key="breathe"
                        className={styles.stepContent}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className={styles.breatheContainer}>
                            <motion.div
                                className={styles.breatheCircle}
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.5, 0.8, 0.5],
                                }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            />
                            <Wind className={styles.breatheIcon} size={48} />
                        </div>
                        <h2 className={styles.stepTitle}>Take a breath</h2>
                        <p className={styles.stepSubtitle}>
                            {coachIntro}
                            <button
                                className={styles.voicePlayButton}
                                onClick={() => toggle(coachIntro)}
                                disabled={isVoiceLoading}
                                title={isVoicePlaying ? "Stop" : "Hear coach"}
                            >
                                {isVoiceLoading ? <Loader2 size={16} className={styles.spin} /> :
                                    isVoicePlaying ? <Square size={16} fill="currentColor" /> : <Volume2 size={16} />}
                            </button>
                        </p>
                        {recommendedBreathing !== 'none' && (
                            <p className={styles.breathingHint}>
                                {breathingExercise.pattern}
                            </p>
                        )}
                    </motion.div>
                )}

                {/* Step 2: Reason */}
                {currentStep === 'reason' && (
                    <motion.div
                        key="reason"
                        className={styles.stepContent}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className={styles.stepIcon}>
                            <Heart size={32} />
                        </div>
                        <h2 className={styles.stepTitle}>Why does this matter to you?</h2>
                        <p className={styles.stepSubtitle}>
                            Connect with your personal motivation for learning {subjectName}
                        </p>

                        <div className={styles.chipsContainer}>
                            {REASON_CHIPS.map(chip => (
                                <button
                                    key={chip.label}
                                    className={`${styles.chip} ${reason === chip.label ? styles.chipSelected : ''}`}
                                    onClick={() => handleChipSelect(chip.label, 'reason')}
                                >
                                    <span>{chip.icon}</span>
                                    <span>{chip.label}</span>
                                </button>
                            ))}
                            <button
                                className={`${styles.chip} ${styles.chipCustom} ${customInput === 'reason' ? styles.chipSelected : ''}`}
                                onClick={() => setCustomInput('reason')}
                            >
                                <span>✏️</span>
                                <span>Custom...</span>
                            </button>
                        </div>

                        {customInput === 'reason' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className={styles.customInputContainer}
                            >
                                <input
                                    type="text"
                                    placeholder="I'm learning this because..."
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    className={styles.customInput}
                                    autoFocus
                                />
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* Step 3: Action */}
                {currentStep === 'action' && (
                    <motion.div
                        key="action"
                        className={styles.stepContent}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className={styles.stepIcon}>
                            <Target size={32} />
                        </div>
                        <h2 className={styles.stepTitle}>What will you accomplish?</h2>
                        <p className={styles.stepSubtitle}>
                            Choose something specific and achievable in {duration} minutes
                        </p>

                        <div className={styles.chipsContainer}>
                            {ACTION_CHIPS.map(chip => (
                                <button
                                    key={chip.label}
                                    className={`${styles.chip} ${action === chip.label ? styles.chipSelected : ''}`}
                                    onClick={() => handleChipSelect(chip.label, 'action')}
                                >
                                    <span>{chip.icon}</span>
                                    <span>{chip.label}</span>
                                </button>
                            ))}
                            <button
                                className={`${styles.chip} ${styles.chipCustom} ${customInput === 'action' ? styles.chipSelected : ''}`}
                                onClick={() => setCustomInput('action')}
                            >
                                <span>✏️</span>
                                <span>Custom...</span>
                            </button>
                        </div>

                        {customInput === 'action' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className={styles.customInputContainer}
                            >
                                <input
                                    type="text"
                                    placeholder="Today, I will..."
                                    value={action}
                                    onChange={e => setAction(e.target.value)}
                                    className={styles.customInput}
                                    autoFocus
                                />
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* Step 4: Reward */}
                {currentStep === 'reward' && (
                    <motion.div
                        key="reward"
                        className={styles.stepContent}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className={styles.stepIcon}>
                            <Gift size={32} />
                        </div>
                        <h2 className={styles.stepTitle}>What reward awaits you?</h2>
                        <p className={styles.stepSubtitle}>
                            A small treat keeps your brain motivated
                        </p>

                        <div className={styles.chipsContainer}>
                            {REWARD_CHIPS.map(chip => (
                                <button
                                    key={chip.label}
                                    className={`${styles.chip} ${reward === chip.label ? styles.chipSelected : ''}`}
                                    onClick={() => handleChipSelect(chip.label, 'reward')}
                                >
                                    <span>{chip.icon}</span>
                                    <span>{chip.label}</span>
                                </button>
                            ))}
                            <button
                                className={`${styles.chip} ${styles.chipCustom} ${customInput === 'reward' ? styles.chipSelected : ''}`}
                                onClick={() => setCustomInput('reward')}
                            >
                                <span>✏️</span>
                                <span>Custom...</span>
                            </button>
                        </div>

                        {customInput === 'reward' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className={styles.customInputContainer}
                            >
                                <input
                                    type="text"
                                    placeholder="After I finish, I'll..."
                                    value={reward}
                                    onChange={e => setReward(e.target.value)}
                                    className={styles.customInput}
                                    autoFocus
                                />
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* Step 5: Ready */}
                {currentStep === 'ready' && (
                    <motion.div
                        key="ready"
                        className={styles.stepContent}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className={styles.stepIcon}>
                            <Sparkles size={32} />
                        </div>
                        <h2 className={styles.stepTitle}>You're prepared!</h2>

                        <div className={styles.summaryCard}>
                            <div className={styles.summaryItem}>
                                <Heart size={16} />
                                <span className={styles.summaryLabel}>Why:</span>
                                <span className={styles.summaryValue}>{reason}</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <Target size={16} />
                                <span className={styles.summaryLabel}>Goal:</span>
                                <span className={styles.summaryValue}>{action}</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <Gift size={16} />
                                <span className={styles.summaryLabel}>Reward:</span>
                                <span className={styles.summaryValue}>{reward}</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigation */}
            <div className={styles.navigation}>
                {currentStep !== 'breathe' && (
                    <button className={styles.backButton} onClick={handlePrev}>
                        <ChevronLeft size={18} />
                        Back
                    </button>
                )}

                {/* Continue button only shows when using custom input */}
                {currentStep !== 'breathe' && currentStep !== 'ready' && customInput && (
                    <button
                        className={styles.nextButton}
                        onClick={handleNext}
                        disabled={!canProceed()}
                    >
                        Continue
                        <ChevronRight size={18} />
                    </button>
                )}

                {currentStep === 'ready' && (
                    <button
                        className={styles.startButton}
                        onClick={handleComplete}
                    >
                        Begin Learning
                        <ChevronRight size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}
