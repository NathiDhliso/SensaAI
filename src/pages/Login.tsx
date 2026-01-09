import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { Mail, Lock, ArrowRight, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Login.module.css';

export function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { loginWithCredentials, isAuthenticated } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Redirect if already authenticated
    if (isAuthenticated) {
        const from = (location.state as { from?: string })?.from || '/';
        navigate(from, { replace: true });
        return null;
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            await loginWithCredentials(email, password);
            // Navigation handled by auth check effect or manual redirect here
            navigate('/');
        } catch (err: any) {
            // Error is also set in store, but we can set local state too if preferred
            // For now relying on local state for immediate feedback control
            console.error(err);
            // The store sets the error, but we want to ensure we display it.
            // We can check store error or just use the caught error.
        } finally {
            setIsLoading(false);
        }
    };

    // Access store error to display it (as it cleans up AWS error messages)
    const storeError = useAuthStore(state => state.error);

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
                        <div className={styles.logoIcon} style={{ background: 'rgba(255,255,255,0.2)' }}>
                            <Sparkles size={24} />
                        </div>
                        <div style={{ marginTop: 'auto' }}>
                            <p className={styles.quote}>
                                "Learning is not attained by chance, it must be sought for with ardor and attended to with diligence."
                            </p>
                            <span className={styles.author}>— Abigail Adams</span>
                        </div>
                    </div>
                    {/* Decorative Shapes */}
                    <div className={`${styles.visualShape} ${styles.shape1}`} />
                    <div className={`${styles.visualShape} ${styles.shape2}`} />
                </div>

                {/* Form Side (Right) */}
                <div className={styles.formSide}>
                    <div className={styles.header}>
                        <div className={styles.logoIcon}>
                            <Sparkles size={28} />
                        </div>
                        <h1 className={styles.title}>Welcome Back</h1>
                        <p className={styles.subtitle}>Sign in to continue your learning journey</p>
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
                                    <span>Sign In</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className={styles.footer}>
                        <p>
                            Don't have an account?
                            <span className={styles.link} onClick={() => useAuthStore.getState().login()}>
                                Sign up
                            </span>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
