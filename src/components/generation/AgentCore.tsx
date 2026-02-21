import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Cpu, CheckCircle, Zap } from 'lucide-react';
import styles from '@/pages/ContentGenerator.module.css';
type AgentState = 'idle' | 'scanning' | 'thinking' | 'writing' | 'verifying' | 'complete';
interface AgentCoreProps {
    state: AgentState;
    intensity?: number; // 0-100
    glitch?: boolean;
}
export const AgentCore: React.FC<AgentCoreProps> = ({ state, intensity = 0, glitch = false }) => {
    // Map intensity to animation parameters
    const pulseDuration = Math.max(0.2, 2 - (intensity / 50)); // Fast pulse at high intensity
    const scaleRange = [1, 1 + (intensity / 200)]; // Larger breath at high intensity
    // Glitch effect variants
    const glitchvariants = {
        normal: { x: 0, opacity: 1, filter: 'hue-rotate(0deg)' },
        glitch: {
            x: [-2, 2, -1, 1, 0],
            opacity: [1, 0.8, 1, 0.9, 1],
            filter: ['hue-rotate(0deg)', 'hue-rotate(90deg)', 'hue-rotate(-45deg)', 'hue-rotate(0deg)']
        }
    };
    return (
        <div className={styles.agentContainer}>
            {/* Outer Orbital Ring - Speed increases with intensity */}
            <motion.div
                className={styles.agentOrbital}
                animate={{ rotate: 360 }}
                transition={{ duration: Math.max(2, 20 - (intensity / 5)), repeat: Infinity, ease: 'linear' }}
                style={{
                    borderStyle: glitch ? 'solid' : 'dashed'
                }}
            />
            {/* Inner Core - Reacts to State & Intensity */}
            <div className={styles.agentCoreWrapper}>
                <motion.div
                    className={`${styles.agentCore} ${styles[state]}`}
                    animate={
                        glitch ? "glitch" :
                            state === 'scanning' ? { scale: [1, 1.2, 1], rotate: [0, 180, 360] } :
                                state === 'thinking' ? { scale: scaleRange } :
                                    state === 'writing' ? { x: [-1, 1, -1, 1] } :
                                        { scale: 1 }
                    }
                    variants={glitch ? glitchvariants : undefined}
                    transition={{
                        duration: glitch ? 0.2 : pulseDuration,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                >
                    {state === 'idle' && <Brain className={`${styles.coreIcon} ${styles.iconIdle}`} />}
                    {state === 'scanning' && <Cpu className={`${styles.coreIcon} ${styles.iconScanning}`} />}
                    {state === 'thinking' && <Zap className={`${styles.coreIcon} ${styles.iconThinking}`} />}
                    {state === 'writing' && <Sparkles className={`${styles.coreIcon} ${styles.iconWriting}`} />}
                    {state === 'verifying' && <CheckCircle className={`${styles.coreIcon} ${styles.iconVerifying}`} />}
                    {state === 'complete' && <CheckCircle className={`${styles.coreIcon} ${styles.coreIconLarge} ${styles.iconComplete}`} />}
                </motion.div>
                {/* Pulse Effect for Thinking/Verifying - Scale based on intensity */}
                {(state === 'thinking' || state === 'verifying' || intensity > 50) && (
                    <motion.div
                        className={styles.agentPulse}
                        animate={{ scale: [1, 1.5 + (intensity / 100)], opacity: [0.5, 0] }}
                        transition={{ duration: pulseDuration, repeat: Infinity }}
                    />
                )}
            </div>
        </div>
    );
};
