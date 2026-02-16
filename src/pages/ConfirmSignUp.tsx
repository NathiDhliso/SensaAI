import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { getErrorMessage } from '@/shared/api/client';
import { ShieldCheck, ArrowRight, Loader2, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Login.module.css';
export function ConfirmSignUp() {
 const navigate = useNavigate();
 const location = useLocation();
 const { confirmSignUp, resendConfirmationCode, clearError } = useAuthStore();
 const emailFromState = (location.state as { email?: string })?.email || '';
 const email = emailFromState || sessionStorage.getItem('confirm-signup-email') || '';
 const [code, setCode] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [isResending, setIsResending] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [success, setSuccess] = useState<string | null>(null);
 const storeError = useAuthStore(state => state.error);

 useEffect(() => {
 return () => clearError();
 }, [clearError]);

 const handleSubmit = async (e: FormEvent) => {
 e.preventDefault();
 clearError();
 if (!code) {
 setError('Please enter the verification code');
 return;
 }
 setError(null);
 setIsLoading(true);
 try {
 await confirmSignUp(email, code);
 setSuccess('Email verified! Redirecting to login...');
 setTimeout(() => {
 navigate('/login');
 }, 2000);
 } catch (err: unknown) {
 setError(getErrorMessage(err, 'Could not verify code. Please try again.'));
 } finally {
 setIsLoading(false);
 }
 };
 const handleResend = async () => {
 if (!email) return;
 setIsResending(true);
 setError(null);
 setSuccess(null);
 clearError();
 try {
 await resendConfirmationCode(email);
 setSuccess('A new code has been sent to your email.');
 } catch (err: unknown) {
 setError(getErrorMessage(err, 'Unable to resend code. Please try again.'));
 } finally {
 setIsResending(false);
 }
 };
 if (!email) {
 return (
 <div className={styles.container}>
 <div className={styles.errorBox}>
 <AlertCircle size={18} />
 <span>Missing email information. Please sign up again.</span>
 </div>
 <button className={styles.link} onClick={() => navigate('/signup')}>Go to Sign Up</button>
 </div>
 );
 }
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
 <ShieldCheck size={24} />
 </div>
 <div className={styles.primeDirective}>
 <h2 className={styles.primeTitle}>Secure Your Data</h2>
 <p className={styles.primeStatement}>
 We've sent a verification code to <strong>{email}</strong>. This ensures only you can access your personalized learning brain.
 </p>
 <div className={styles.primePrinciples}>
 <span>End-to-End Privacy</span>
 <span>Verified Identity</span>
 </div>
 </div>
 </div>
 </div>
 {/* Form Side (Right) */}
 <div className={styles.formSide}>
 <div className={styles.header}>
 <div className={styles.logoIcon}>
 <ShieldCheck size={28} />
 </div>
 <h1 className={styles.title}>Verify Email</h1>
 <p className={styles.subtitle}>Enter the code sent to your inbox</p>
 </div>
 <AnimatePresence mode="wait">
 {(error || storeError) && (
 <motion.div
 className={styles.errorBox}
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 key="error"
 >
 <AlertCircle size={18} />
 <span>{error || storeError}</span>
 </motion.div>
 )}
 {success && (
 <motion.div
 className={styles.errorBox}
 style={{
 background: 'var(--color-success-bg)',
 color: 'var(--color-success-text)',
 border: '1px solid var(--color-success-border)'
 }}
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 key="success"
 >
 <ShieldCheck size={18} />
 <span>{success}</span>
 </motion.div>
 )}
 </AnimatePresence>
 <form className={styles.form} onSubmit={handleSubmit}>
 <div className={styles.inputGroup}>
 <label className={styles.label} htmlFor="code">Verification Code</label>
 <div className={styles.inputWrapper}>
 <Lock size={18} className={styles.inputIcon} />
 <input
 id="code"
 type="text"
 className={styles.input}
 placeholder="123456"
 value={code}
 onChange={(e) => {
 setCode(e.target.value);
 if (error) setError(null);
 if (storeError) clearError();
 }}
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
 <span>Verify & Confirm</span>
 <ArrowRight size={18} />
 </>
 )}
 </button>
 </form>
 <div className={styles.footer}>
 <p>
 Didn't receive a code?
 <button
 className={styles.link}
 onClick={handleResend}
 disabled={isResending}
 style={{ background: 'none', border: 'none', fontSize: 'inherit' }}
 >
 {isResending ? <RefreshCw className={styles.spinner} size={14} /> : 'Resend Code'}
 </button>
 </p>
 </div>
 </div>
 </motion.div>
 </div>
 );
}
