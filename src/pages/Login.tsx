import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { LogIn, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import styles from './Login.module.css';

export function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();

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
                        Sign in to continue your learning journey
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
                        <span>Sign In / Sign Up</span>
                        <ArrowRight size={16} />
                    </button>
                </div>

                <div className={styles.footer}>
                    <p>
                        Secure authentication provided by AWS Cognito
                    </p>
                </div>
            </div>
        </div>
    );
}
