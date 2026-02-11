import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { getErrorMessage } from '@/shared/api/client';
import { Mail, Lock, LogIn, Loader2, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import { SensaShape } from '@/components/ui/SensaShape';
import styles from './Login.module.css';
export function Login() {
 const navigate = useNavigate();
 const location = useLocation();
 const { 
 loginWithCredentials, 
 isLoading, 
 error, 
 clearError, 
 isAuthenticated 
 } = useAuthStore();
 // Form state
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [showPassword, setShowPassword] = useState(false);
 const [formError, setFormError] = useState<string | null>(null);
 const locationAuthError = (location.state as { authError?: string } | null)?.authError || null;
 const displayError = formError || locationAuthError || error;
 // Redirect if already authenticated
 useEffect(() => {
 if (isAuthenticated) {
 const from = (location.state as { from?: string })?.from || '/';
 navigate(from, { replace: true });
 }
 }, [isAuthenticated, navigate, location]);

 useEffect(() => {
 return () => clearError();
 }, [clearError]);

 const handleSubmit = async (e: FormEvent) => {
 e.preventDefault();
 clearError();
 setFormError(null);
 if (!email || !password) {
 setFormError('Please enter both email and password.');
 return;
 }
 try {
 await loginWithCredentials(email, password);
 const from = (location.state as { from?: string })?.from || '/';
 navigate(from, { replace: true });
 } catch (error) {
 setFormError(getErrorMessage(error, 'Unable to sign in. Please try again.'));
 }
 };
 return (
 <div className={styles.container}>
 <div className={styles.glassCard}>
 {/* Left Side - Visual/Brand */}
 <div className={styles.visualSide}>
 <div className={`${styles.visualShape} ${styles.shape1}`} />
 <div className={`${styles.visualShape} ${styles.shape2}`} />
 <div className={styles.visualContent}>
 <div className={styles.brandMark}>
 <SensaShape type="nebula" size="xl" animate={true} />
 </div>
 <div className={styles.quote}>
 "Intelligence is the ability to adapt to change."
 </div>
 <div className={styles.author}>— Stephen Hawking</div>
 </div>
 <div className={styles.featureList}>
 <div className={styles.featureItem}>
 <Sparkles size={16} />
 <span>AI-Powered Learning</span>
 </div>
 <div className={styles.featureItem}>
 <Sparkles size={16} />
 <span>Adaptive Curriculum</span>
 </div>
 <div className={styles.featureItem}>
 <Sparkles size={16} />
 <span>Cognitive Science Based</span>
 </div>
 </div>
 </div>
 {/* Right Side - Form */}
 <div className={styles.formSide}>
 <div className={styles.header}>
 <div className={styles.logoIcon}>
 <SensaShape type="nebula" size="md" animate={true} />
 </div>
 <h1 className={styles.title}>Welcome Back</h1>
 <p className={styles.subtitle}>Sign in to continue your learning journey</p>
 </div>
 {displayError && (
 <div className={styles.errorBox}>
 <div className={styles.alertIcon}>!</div>
 <span>{displayError}</span>
 </div>
 )}
 <form className={styles.form} onSubmit={handleSubmit}>
 {/* Email Input */}
 <div className={styles.inputGroup}>
 <label className={styles.label} htmlFor="email">
 Email
 </label>
 <div className={styles.inputWrapper}>
 <Mail className={styles.inputIcon} size={18} />
 <input
 id="email"
 type="email"
 className={styles.input}
 placeholder="you@example.com"
 value={email}
 onChange={(e) => {
 setEmail(e.target.value);
 if (formError) setFormError(null);
 }}
 disabled={isLoading}
 autoComplete="email"
 required
 />
 </div>
 </div>
 {/* Password Input */}
 <div className={styles.inputGroup}>
 <label className={styles.label} htmlFor="password">
 Password
 </label>
 <div className={styles.inputWrapper}>
 <Lock className={styles.inputIcon} size={18} />
 <input
 id="password"
 type={showPassword ? 'text' : 'password'}
 className={styles.input}
 placeholder="••••••••"
 value={password}
 onChange={(e) => {
 setPassword(e.target.value);
 if (formError) setFormError(null);
 }}
 disabled={isLoading}
 autoComplete="current-password"
 required
 />
 <button
 type="button"
 className={styles.passwordToggle}
 onClick={() => setShowPassword(!showPassword)}
 tabIndex={-1}
 >
 {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
 </button>
 </div>
 </div>
 {/* Forgot Password Link */}
 <div className={styles.forgotPassword}>
 <Link to="/forgot-password" className={styles.link}>
 Forgot your password?
 </Link>
 </div>
 {/* Submit Button */}
 <button
 type="submit"
 className={styles.submitButton}
 disabled={isLoading || !email || !password}
 >
 {isLoading ? (
 <Loader2 className={styles.spinner} size={20} />
 ) : (
 <LogIn size={20} />
 )}
 <span>Sign In</span>
 <ArrowRight size={16} />
 </button>
 </form>
 {/* Sign Up Link */}
 <div className={styles.signupPrompt}>
 Don't have an account?{' '}
 <Link to="/signup" className={styles.signupLink}>
 Create one
 </Link>
 </div>
 <div className={styles.footer}>
 By signing in, you agree to our{' '}
 <a href="/terms" className={styles.link}>Terms</a> and{' '}
 <a href="/privacy" className={styles.link}>Privacy Policy</a>.
 </div>
 </div>
 </div>
 </div>
 );
}
