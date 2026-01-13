import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { Mail, Lock, User, ArrowRight, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Login.module.css'; // Reusing Login styles for consistency

export function SignUp() {
    const navigate = useNavigate();
    const { signUp } = useAuthStore();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const storeError = useAuthStore(state => state.error);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            await signUp(email, password, name);
            // After successful sign up, move to verification
            navigate('/confirm-signup', { state: { email } });
        } catch (err: unknown) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <motion.div
                className={styles.glassCard}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                {/* Visual Side (Left) */}
                <div className={styles.visualSide}>
                    <div className={styles.visualContent}>
                        <div className={styles.logoIcon} style={{ background: 'var(--overlay-white-20)' }}>
                            <Sparkles size={24} />
                        </div>

                        <div className={styles.primeDirective}>
                            <h2 className={styles.primeTitle}>🚀 Join SensaAI</h2>
                            <p className={styles.primeStatement}>
                                Build your personalized learning architecture. Master subjects faster with AI-driven velocity and spatial mnemonics.
                            </p>
                            <div className={styles.primePrinciples}>
                                <span>⚡ Rapid Acquisition</span>
                                <span>🧠 Deep Understanding</span>
                                <span>📈 Measurable Velocity</span>
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto' }}>
                            <p className={styles.quote}>
                                "The more that you read, the more things you will know. The more that you learn, the more places you'll go."
                            </p>
                            <span className={styles.author}>— Dr. Seuss</span>
                        </div>
                    </div>
                    <div className={`${styles.visualShape} ${styles.shape1}`} />
                    <div className={`${styles.visualShape} ${styles.shape2}`} />
                </div>

                {/* Form Side (Right) */}
                <div className={styles.formSide}>
                    <div className={styles.header}>
                        <div className={styles.logoIcon}>
                            <Sparkles size={28} />
                        </div>
                        <h1 className={styles.title}>Create Account</h1>
                        <p className={styles.subtitle}>Begin your high-velocity learning journey</p>
                    </div>

                    <AnimatePresence mode="wait">
                        {(error || storeError) && (
                            <motion.div
                                className={styles.errorBox}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <AlertCircle size={18} />
                                <span>{error || storeError}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="name">Full Name</label>
                            <div className={styles.inputWrapper}>
                                <User size={18} className={styles.inputIcon} />
                                <input
                                    id="name"
                                    type="text"
                                    className={styles.input}
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="email">Email Address</label>
                            <div className={styles.inputWrapper}>
                                <Mail size={18} className={styles.inputIcon} />
                                <input
                                    id="email"
                                    type="email"
                                    className={styles.input}
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="password">Password</label>
                            <div className={styles.inputWrapper}>
                                <Lock size={18} className={styles.inputIcon} />
                                <input
                                    id="password"
                                    type="password"
                                    className={styles.input}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className={styles.spinner} size={20} />
                            ) : (
                                <>
                                    <span>Create Account</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className={styles.footer}>
                        <p>
                            Already have an account?
                            <span className={styles.link} onClick={() => navigate('/login')}>
                                Sign in
                            </span>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
