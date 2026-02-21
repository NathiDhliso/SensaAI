import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Cpu, CheckCircle, Zap } from 'lucide-react';
import styles from '@/pages/ContentGenerator.module.css';
type AgentState = 'idle' | 'scanning' | 'thinking' | 'writing' | 'verifying' | 'complete';
interface AgentCoreProps {
    state: AgentState;
    intensity?: number;
    glitch?: boolean;
}
export const AgentCore: React.FC<AgentCoreProps> = ({ state, intensity = 0, glitch = false }) => {
    const pulseDuration = Math.max(0.5, 2.4 - (intensity / 60));
    const scaleRange: [number, number] = [1, 1 + (intensity / 160)];
    const glitchVariants = {
        normal: { x: 0, opacity: 1, filter: 'hue-rotate(0deg) saturate(1)' },
        glitch: {
            x: [-3, 3, -1, 2, 0],
            opacity: [1, 0.75, 1, 0.85, 1],
            filter: [
                'hue-rotate(0deg) saturate(1)',
                'hue-rotate(90deg) saturate(2)',
                'hue-rotate(-45deg) saturate(1.5)',
                'hue-rotate(0deg) saturate(1)'
            ]
        }
    };
    const outerRingDuration = Math.max(4, 22 - (intensity / 5));
    const midRingDuration = Math.max(3, 14 - (intensity / 8));
    const innerRingDuration = Math.max(1.5, 8 - (intensity / 12));
    return (
        <div className={styles.agentContainer}>
            <div className={styles.orbitalRingOuter} style={{ animationDuration: `${outerRingDuration}s` }} />
            <div className={styles.orbitalRingMid} style={{ animationDuration: `${midRingDuration}s` }} />
            <div className={styles.orbitalRingInner} style={{ animationDuration: `${innerRingDuration}s` }} />
            <div className={styles.agentCoreWrapper}>
                {(state !== 'idle') && (
                    <>
                        <div className={styles.agentPulse} style={{ animationDuration: `${pulseDuration}s` }} />
                        <div className={styles.agentPulse2} style={{ animationDuration: `${pulseDuration}s` }} />
                    </>
                )}
                <motion.div
                    className={styles.agentCore}
                    animate={
                        glitch ? 'glitch' :
                        state === 'scanning' ? { rotate: [0, 360] } :
                        state === 'thinking' ? { scale: scaleRange } :
                        state === 'writing'  ? { scale: [1, 1.04, 1] } :
                        state === 'complete' ? { scale: [1, 1.08, 1] } :
                        { scale: 1 }
                    }
                    variants={glitch ? glitchVariants : undefined}
                    transition={{
                        duration: glitch ? 0.15 : pulseDuration,
                        repeat: Infinity,
                        ease: glitch ? 'linear' : 'easeInOut'
                    }}
                >
                    {state === 'idle'      && <Brain       className={`${styles.coreIcon} ${styles.iconIdle}`} />}
                    {state === 'scanning'  && <Cpu         className={`${styles.coreIcon} ${styles.iconScanning}`} />}
                    {state === 'thinking'  && <Zap         className={`${styles.coreIcon} ${styles.iconThinking}`} />}
                    {state === 'writing'   && <Sparkles    className={`${styles.coreIcon} ${styles.iconWriting}`} />}
                    {state === 'verifying' && <CheckCircle className={`${styles.coreIcon} ${styles.iconVerifying}`} />}
                    {state === 'complete'  && <CheckCircle className={`${styles.coreIcon} ${styles.coreIconLarge} ${styles.iconComplete}`} />}
                </motion.div>
            </div>
        </div>
    );
};
