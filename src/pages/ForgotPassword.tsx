import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import styles from './ForgotPassword.module.css';

const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1';
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';

export function ForgotPassword() {
 const [email, setEmail] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [success, setSuccess] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const handleSubmit = async (e: FormEvent) => {
 e.preventDefault();
 if (!email) return;
 setIsLoading(true);
 setError(null);
 try {
 const { CognitoIdentityProviderClient, ForgotPasswordCommand } = await import('@aws-sdk/client-cognito-identity-provider');
 const client = new CognitoIdentityProviderClient({ region: AWS_REGION });
 const command = new ForgotPasswordCommand({
 ClientId: COGNITO_CLIENT_ID,
 Username: email,
 });
 await client.send(command);
 setSuccess(true);
 } catch (err: unknown) {
 const errorName = (err as { name?: string })?.name;
 if (errorName === 'UserNotFoundException') {
 setSuccess(true);
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
 <h1 className={styles.title}>Reset Password</h1>
 <p className={styles.subtitle}>
 {success
 ? 'If an account exists with that email, we sent a reset code.'
 : 'Enter your email and we\'ll send you a code to reset your password.'}
 </p>

 {error && (
 <div className={styles.errorBox}>
 <span>{error}</span>
 </div>
 )}

 {success ? (
 <div className={styles.successBox}>
 Check your inbox for a verification code, then use it to set a new password.
 </div>
 ) : (
 <form onSubmit={handleSubmit}>
 <div className={styles.inputGroup}>
 <label className={styles.label} htmlFor="reset-email">Email</label>
 <div className={styles.inputWrapper}>
 <Mail className={styles.inputIcon} size={18} />
 <input
 id="reset-email"
 type="email"
 className={styles.input}
 placeholder="you@example.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 disabled={isLoading}
 autoComplete="email"
 required
 />
 </div>
 </div>
 <button
 type="submit"
 className={styles.submitButton}
 disabled={isLoading || !email}
 >
 {isLoading ? <Loader2 className={styles.spinner} size={20} /> : null}
 <span>{isLoading ? 'Sending...' : 'Send Reset Code'}</span>
 </button>
 </form>
 )}

 <Link to="/login" className={styles.backLink}>
 <ArrowLeft size={16} />
 Back to Sign In
 </Link>
 </div>
 </div>
 );
}
