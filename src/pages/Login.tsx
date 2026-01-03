import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { LogIn, Loader2, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import styles from './Login.module.css';

export function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();
    const [mode, setMode] = useState<'login' | 'signup'>('login');

    // Redirect if already authenticated
    if (isAuthenticated) {
        const from = (location.state as { from?: string })?.from || '/';
        navigate(from, { replace: true });
        return null;
    }

    const handleCognitoLogin = () => {
        clearError();
        login();
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.logo}>
                        <Sparkles size={32} />
                    </div>
                    <h1 className={styles.title}>Welcome to SensaPBL</h1>
                    <p className={styles.subtitle}>
                        {mode === 'login'
                            ? 'Sign in to continue your learning journey'
                            : 'Create an account to get started'}
                    </p>
                </div>

                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                <div className={styles.content}>
                    <button
                        className={styles.primaryButton}
                        onClick={handleCognitoLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className={styles.spinner} size={20} />
                        ) : (
                            <LogIn size={20} />
                        )}
                        <span>Continue with Cognito</span>
                        <ArrowRight size={16} />
                    </button>

                    <div className={styles.divider}>
                        <span>or</span>
                    </div>

                    <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                        <div className={styles.inputGroup}>
                            <Mail size={18} className={styles.inputIcon} />
                            <input
                                type="email"
                                placeholder="Email address"
                                className={styles.input}
                                disabled={isLoading}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <Lock size={18} className={styles.inputIcon} />
                            <input
                                type="password"
                                placeholder="Password"
                                className={styles.input}
                                disabled={isLoading}
                            />
                        </div>

                        <button
                            type="submit"
                            className={styles.secondaryButton}
                            disabled={isLoading}
                            onClick={handleCognitoLogin}
                        >
                            {mode === 'login' ? 'Sign In' : 'Create Account'}
                        </button>
                    </form>
                </div>

                <div className={styles.footer}>
                    <p>
                        {mode === 'login' ? (
                            <>
                                Don't have an account?{' '}
                                <button
                                    className={styles.linkButton}
                                    onClick={() => setMode('signup')}
                                >
                                    Sign up
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?{' '}
                                <button
                                    className={styles.linkButton}
                                    onClick={() => setMode('login')}
                                >
                                    Sign in
                                </button>
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
