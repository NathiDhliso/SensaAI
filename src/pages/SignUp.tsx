import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { getErrorMessage } from '@/shared/api/client';
import { Mail, Lock, User, ArrowRight, Sparkles, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import styles from './Login.module.css';
export function SignUp() {
 const navigate = useNavigate();
 const { signUp, clearError } = useAuthStore();
 const [name, setName] = useState('');
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [showPassword, setShowPassword] = useState(false);
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const { isScholarly } = useVisualTheme();
 const storeError = useAuthStore(state => state.error);

 useEffect(() => {
 return () => clearError();
 }, [clearError]);

 const handleSubmit = async (e: FormEvent) => {
 e.preventDefault();
 clearError();
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
 setError(getErrorMessage(err, 'Unable to create your account. Please try again.'));
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
 <h2 className={styles.primeTitle}>Join SensaAI</h2>
 <p className={styles.primeStatement}>
 {isScholarly
 ? 'Build your personalized learning architecture. Master subjects with structured, evidence-based methodology.'
 : 'Build your personalized learning architecture. Master subjects faster with AI-driven velocity and spatial mnemonics.'
 }
 </p>
 <div className={styles.primePrinciples}>
 <span>Rapid Acquisition</span>
 <span>Deep Understanding</span>
 <span>{isScholarly ? 'Measurable Progress' : ' Measurable Velocity'}</span>
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
 onChange={(e) => {
 setName(e.target.value);
 if (error) setError(null);
 if (storeError) clearError();
 }}
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
 onChange={(e) => {
 setEmail(e.target.value);
 if (error) setError(null);
 if (storeError) clearError();
 }}
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
 type={showPassword ? 'text' : 'password'}
 className={styles.input}
 placeholder="••••••••"
 value={password}
 onChange={(e) => {
 setPassword(e.target.value);
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
 <span>Create Account</span>
 <ArrowRight size={18} />
 </>
 )}
 </button>
 </form>
 <div className={styles.footer}>
 <p>
 Already have an account?
 <Link to="/login" className={styles.link}>
 Sign in
 </span>
 </p>
 </div>
 </div>
 </motion.div>
 </div>
 );
}
