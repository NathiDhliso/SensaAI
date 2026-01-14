import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

export interface TutorialStep {
    targetId: string;
    title: string;
    description: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

interface DashboardTutorialProps {
    isOpen: boolean;
    onClose: () => void;
    steps: TutorialStep[];
}

export function DashboardTutorial({ isOpen, onClose, steps }: DashboardTutorialProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    const updateTargetRect = useCallback(() => {
        const step = steps[currentStepIndex];
        const element = document.getElementById(step.targetId);
        if (element) {
            const rect = element.getBoundingClientRect();
            setTargetRect(rect);

            // Scroll element into view if needed
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [steps, currentStepIndex]);

    // Use useLayoutEffect for synchronous initial DOM measurement
    useLayoutEffect(() => {
        if (isOpen) {
            // Schedule after paint to get accurate rect
            requestAnimationFrame(() => {
                updateTargetRect();
            });
        }
    }, [isOpen, updateTargetRect, currentStepIndex]);

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('resize', updateTargetRect);
            // Prevent scrolling when tutorial is open
            document.body.style.overflow = 'hidden';
        } else {
            window.removeEventListener('resize', updateTargetRect);
            document.body.style.overflow = 'unset';
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Valid reset on modal close
            setCurrentStepIndex(0);
        }
        return () => {
            window.removeEventListener('resize', updateTargetRect);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, updateTargetRect]);

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    if (!isOpen) return null;

    // Calculate position style based on preference
    const getPositionStyle = () => {
        if (!targetRect) return {};

        const step = steps[currentStepIndex];
        const position = step.position || 'bottom';
        const gap = 20;

        switch (position) {
            case 'right':
                return {
                    left: targetRect.right + gap,
                    top: targetRect.top,
                    width: '320px'
                };
            case 'left':
                return {
                    left: targetRect.left - 320 - gap,
                    top: targetRect.top,
                    width: '320px'
                };
            case 'top':
                return {
                    left: targetRect.left,
                    top: targetRect.top - gap, // We'd need to know height to offset up, but absolute positioning makes this tricky without ref. simpler to just align bottom of card to top of target? 
                    // Let's stick to simple top alignment for now or use transform
                    transform: 'translateY(-100%)',
                    width: '320px'
                };
            case 'bottom':
            default:
                return {
                    left: targetRect.left,
                    top: targetRect.bottom + gap,
                    width: '320px'
                };
        }
    };

    const positionStyle = getPositionStyle();
    const currentStep = steps[currentStepIndex];

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        pointerEvents: 'auto'
                    }}
                >
                    {/* Backdrop */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'var(--overlay-black-60)',
                            transition: 'background 0.3s'
                        }}
                    >
                        {targetRect && (
                            <motion.div
                                initial={false}
                                animate={{
                                    top: targetRect.top - 10,
                                    left: targetRect.left - 10,
                                    width: targetRect.width + 20,
                                    height: targetRect.height + 20,
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                style={{
                                    position: 'absolute',
                                    borderRadius: '12px',
                                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75), 0 0 0 4px var(--color-accent)',
                                    pointerEvents: 'none'
                                }}
                            />
                        )}
                    </div>

                    {/* Content Card */}
                    {targetRect && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={currentStepIndex}
                            style={{
                                position: 'absolute',
                                ...positionStyle,
                                maxWidth: '90vw',
                                zIndex: 10000
                            }}
                        >
                            <div style={{
                                background: 'var(--color-surface)',
                                padding: '1.5rem',
                                borderRadius: '1rem',
                                border: '1px solid var(--color-border)',
                                boxShadow: 'var(--shadow-xl)',
                                color: 'var(--color-text-primary)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Sparkles size={16} color="var(--color-accent)" />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase' }}>
                                            Step {currentStepIndex + 1} of {steps.length}
                                        </span>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                                    {currentStep.title}
                                </h3>
                                <p style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                                    {currentStep.description}
                                </p>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <button
                                        onClick={handlePrev}
                                        disabled={currentStepIndex === 0}
                                        style={{
                                            opacity: currentStepIndex === 0 ? 0.3 : 1,
                                            background: 'none',
                                            border: 'none',
                                            cursor: currentStepIndex === 0 ? 'default' : 'pointer',
                                            color: 'var(--color-text-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            padding: '0.5rem'
                                        }}
                                    >
                                        <ChevronLeft size={16} /> Back
                                    </button>

                                    <button
                                        onClick={handleNext}
                                        style={{
                                            background: 'var(--color-accent)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '2rem',
                                            fontWeight: 600,
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
                                        {currentStepIndex !== steps.length - 1 && <ChevronRight size={16} />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            )}
        </AnimatePresence>
    );
}
