import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { Loader2 } from 'lucide-react';
import styles from './Login.module.css';

export function AuthCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { handleCallback, error } = useAuthStore();

    useEffect(() => {
        const code = searchParams.get('code');

        if (code) {
            handleCallback(code).then(() => {
                // Redirect to home after successful auth
                navigate('/', { replace: true });
            });
        } else {
            // No code, redirect to login
            navigate('/login', { replace: true });
        }
    }, [searchParams, handleCallback, navigate]);

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.error}>
                        Authentication failed: {error}
                    </div>
                    <button
                        className={styles.primaryButton}
                        onClick={() => navigate('/login')}
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <Loader2 size={48} className={styles.spinner} style={{ margin: '0 auto 1rem' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Completing authentication...
                    </p>
                </div>
            </div>
        </div>
    );
}
