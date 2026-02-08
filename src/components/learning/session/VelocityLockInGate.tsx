/**
 * VelocityLockInGate Component
 * 
 * Full-screen dramatic confirmation before locking into Velocity Learning.
 * "There's no turning back" - once committed, users must complete setup.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, AlertTriangle, ArrowLeft, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './VelocityLockInGate.module.css';

interface VelocityLockInGateProps {
    subjectName: string;
    onConfirm: () => void;
}

export default function VelocityLockInGate({
    subjectName,
    onConfirm
}: VelocityLockInGateProps) {
    const navigate = useNavigate();

    // Use useState with initializer function to avoid calling Math.random() during render
    const [particles] = useState(() =>
        [...Array(20)].map((_, i) => ({
            id: i,
            initialX: Math.random() * 100 - 50,
            initialY: Math.random() * 100 - 50,
            duration: 3 + Math.random() * 2,
            delay: Math.random() * 2,
            left: Math.random() * 100,
            top: Math.random() * 100,
        }))
    );

    const handleGoBack = () => {
        // Go to home instead of back (prevents returning to generate page)
        navigate('/');
    };

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Animated background particles */}
            <div className={styles.particles}>
                {particles.map((particle) => (
                    <motion.div
                        key={particle.id}
                        className={styles.particle}
                        initial={{
                            x: particle.initialX,
                            y: particle.initialY,
                            opacity: 0
                        }}
                        animate={{
                            y: [0, -30, 0],
                            opacity: [0, 0.5, 0]
                        }}
                        transition={{
                            duration: particle.duration,
                            delay: particle.delay
                        }}
                        style={{
                            left: `${particle.left}%`,
                            top: `${particle.top}%`,
                        }}
                    />
                ))}
            </div>

            <div className={styles.content}>
                {/* Icon with pulsing effect */}
                <motion.div
                    className={styles.iconContainer}
                    animate={{
                        scale: [0.9, 1.02, 1],
                        boxShadow: '0 0 30px var(--overlay-primary-15)',
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                    <Rocket size={48} className={styles.icon} />
                </motion.div>

                {/* Title */}
                <motion.h1
                    className={styles.title}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    Velocity Learning
                </motion.h1>

                {/* Subject */}
                <motion.p
                    className={styles.subject}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    {subjectName}
                </motion.p>

                {/* Warning box */}
                <motion.div
                    className={styles.warningBox}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <AlertTriangle size={20} className={styles.warningIcon} />
                    <div className={styles.warningContent}>
                        <span className={styles.warningTitle}>Session Commitment</span>
                        <p className={styles.warningText}>
                            Focus locked until complete.
                        </p>
                    </div>
                </motion.div>

                {/* Features list */}
                <motion.div
                    className={styles.features}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <div className={styles.feature}>
                        <Zap size={18} className={styles.featureIcon} />
                        <span>Accelerated micro-learning loops</span>
                    </div>
                    <div className={styles.feature}>
                        <Zap size={18} className={styles.featureIcon} />
                        <span>Adaptive difficulty based on your pace</span>
                    </div>
                    <div className={styles.feature}>
                        <Zap size={18} className={styles.featureIcon} />
                        <span>Real-time cognitive load monitoring</span>
                    </div>
                </motion.div>

                {/* Action buttons */}
                <motion.div
                    className={styles.actions}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <button
                        className={styles.backButton}
                        onClick={handleGoBack}
                    >
                        <ArrowLeft size={18} />
                        Go Back
                    </button>

                    <button
                        className={styles.confirmButton}
                        onClick={onConfirm}
                    >
                        <Rocket size={18} />
                        I'm Ready
                    </button>
                </motion.div>
            </div>
        </motion.div>
    );
}
