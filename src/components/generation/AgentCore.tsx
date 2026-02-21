import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Cpu, CheckCircle, Zap } from 'lucide-react';
import styles from '@/pages/ContentGenerator.module.css';
type AgentState = 'idle' | 'scanning' | 'thinking' | 'writing' | 'verifying' | 'complete';
interface AgentCoreProps {
    state: AgentState;
    intensity?: number;
    glitch?: boolean;
}
const STATE_ICONS: Record<AgentState, React.ReactNode> = {
    idle:      <Brain       />,
    scanning:  <Cpu         />,
    thinking:  <Zap         />,
    writing:   <Sparkles    />,
    verifying: <CheckCircle />,
    complete:  <CheckCircle />,
};
const STATE_ICON_CLASS: Record<AgentState, string> = {
    idle:      'iconIdle',
    scanning:  'iconScanning',
    thinking:  'iconThinking',
    writing:   'iconWriting',
    verifying: 'iconVerifying',
    complete:  'iconComplete',
};
export const AgentCore: React.FC<AgentCoreProps> = ({ state, intensity = 0, glitch = false }) => {
    const breatheDuration = Math.max(2.5, 5 - (intensity / 40));
    const rippleDuration  = Math.max(1.8, 4 - (intensity / 35));
    const glitchVariants = {
        normal: { x: 0, filter: 'hue-rotate(0deg) saturate(1)' },
        glitch: {
            x: [-2, 2, -1, 1, 0],
            filter: [
                'hue-rotate(0deg) saturate(1)',
                'hue-rotate(80deg) saturate(2)',
                'hue-rotate(-30deg) saturate(1.5)',
                'hue-rotate(0deg) saturate(1)',
            ],
        },
    };
    return (
        <div className={styles.agentContainer}>
            <div className={styles.orbGlow} style={{ animationDuration: `${breatheDuration}s` }} />
            <div className={styles.ripple}  style={{ animationDuration: `${rippleDuration}s` }} />
            <div className={styles.ripple2} style={{ animationDuration: `${rippleDuration}s` }} />
            <div className={styles.agentCoreWrapper}>
                <motion.div
                    className={styles.agentCore}
                    animate={glitch ? 'glitch' : { scale: 1 }}
                    variants={glitch ? glitchVariants : undefined}
                    transition={{ duration: glitch ? 0.12 : breatheDuration, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ animationDuration: `${breatheDuration}s` }}
                >
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={state}
                            initial={{ opacity: 0, scale: 0.7, filter: 'blur(6px)' }}
                            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 0.7, filter: 'blur(6px)' }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            className={`${state === 'complete' ? styles.coreIconLarge : styles.coreIcon} ${styles[STATE_ICON_CLASS[state]]}`}
                            style={{ display: 'flex' }}
                        >
                            {STATE_ICONS[state]}
                        </motion.span>
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
};
