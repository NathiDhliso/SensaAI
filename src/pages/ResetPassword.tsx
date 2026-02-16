import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, ArrowLeft, Loader2, KeyRound, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import styles from './ForgotPassword.module.css';

const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1';
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';

export function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const emailFromUrl = searchParams.get('email') || '';

    const [email, setEmail] = useState(emailFromUrl);
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!email || !code || !newPassword) return;
        setIsLoading(true);
        setError(null);

        try {
            const { CognitoIdentityProviderClient, ConfirmForgotPasswordCommand } = await import('@aws-sdk/client-cognito-identity-provider');
            const client = new CognitoIdentityProviderClient({ region: AWS_REGION });
            const command = new ConfirmForgotPasswordCommand({
                ClientId: COGNITO_CLIENT_ID,
                Username: email,
                ConfirmationCode: code,
                Password: newPassword,
            });
            await client.send(command);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2500);
        } catch (err: unknown) {
            const errorName = (err as { name?: string })?.name;
            if (errorName === 'CodeMismatchException') {
                setError('Invalid verification code. Please check and try again.');
            } else if (errorName === 'ExpiredCodeException') {
                setError('This code has expired. Please request a new one.');
            } else if (errorName === 'InvalidPasswordException') {
                setError('Password does not meet requirements. Use at least 8 characters with uppercase, lowercase, numbers, and symbols.');
            } else if (errorName === 'LimitExceededException') {
                setError('Too many attempts. Please wait a few minutes and try again.');
            } else {
                setError('Something went wrong. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.iconWrapper}>
                    <KeyRound size={28} />
                </div>
                <h1 className={styles.title}>Set New Password</h1>
                <p className={styles.subtitle}>
                    {success
                        ? 'Your password has been reset. Redirecting to sign in...'
                        : 'Enter the code from your email and choose a new password.'}
                </p>

                {error && (
                    <div className={styles.errorBox}>
                        <span>{error}</span>
                    </div>
                )}

                {success ? (
                    <div className={styles.successBox}>
                        <ShieldCheck size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                        Password reset successful! Redirecting...
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="reset-email">Email</label>
                            <div className={styles.inputWrapper}>
                                <Lock className={styles.inputIcon} size={18} />
                                <input
                                    id="reset-email"
                                    type="email"
                                    className={styles.input}
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading || !!emailFromUrl}
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="reset-code">Verification Code</label>
                            <div className={styles.inputWrapper}>
                                <Lock className={styles.inputIcon} size={18} />
                                <input
                                    id="reset-code"
                                    type="text"
                                    className={styles.input}
                                    placeholder="123456"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    disabled={isLoading}
                                    autoComplete="one-time-code"
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label} htmlFor="reset-password">New Password</label>
                            <div className={styles.inputWrapper}>
                                <Lock className={styles.inputIcon} size={18} />
                                <input
                                    id="reset-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className={styles.input}
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={isLoading}
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                    style={{
                                        position: 'absolute',
                                        right: '0.75rem',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--color-text-muted)',
                                        cursor: 'pointer',
                                        padding: '0.25rem',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0.75rem' }}>
                                At least 8 characters, including uppercase, number, and symbol
                            </p>
                        </div>

                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isLoading || !email || !code || !newPassword}
                        >
                            {isLoading ? <Loader2 className={styles.spinner} size={20} /> : null}
                            <span>{isLoading ? 'Resetting...' : 'Reset Password'}</span>
                        </button>
                    </form>
                )}

                <Link to="/forgot-password" className={styles.backLink}>
                    <ArrowLeft size={16} />
                    Back to Forgot Password
                </Link>
            </div>
        </div>
    );
}
