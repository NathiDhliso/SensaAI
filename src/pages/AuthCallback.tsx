import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { Loader2 } from 'lucide-react';
import styles from './Login.module.css';
export function AuthCallback() {
 const navigate = useNavigate();
 const [searchParams] = useSearchParams();
 const { handleCallback, clearError, error } = useAuthStore();

 const decodeParam = (value: string): string => {
 try {
 return decodeURIComponent(value.replace(/\+/g, ' '));
 } catch {
 return value;
 }
 };

 const oauthErrorParam = searchParams.get('error');
 const oauthErrorDescription = searchParams.get('error_description');
 const oauthError = oauthErrorParam
 ? decodeParam(oauthErrorDescription || oauthErrorParam)
 : null;

 useEffect(() => {
 let isCancelled = false;
 clearError();

 if (oauthError) {
 return () => {
 isCancelled = true;
 };
 }

 const code = searchParams.get('code');
 if (!code) {
 navigate('/login', {
 replace: true,
 state: { authError: 'Authentication code was missing. Please try signing in again.' }
 });
 return () => {
 isCancelled = true;
 };
 }

 const runCallback = async () => {
 try {
 await handleCallback(code);
 if (!isCancelled) {
  navigate('/', { replace: true });
 }
 } catch {
 // Error state is set by the auth store
 }
 };
 runCallback();

 return () => {
 isCancelled = true;
 };
 }, [searchParams, handleCallback, navigate, clearError, oauthError]);

 const displayError = oauthError || error;

 if (displayError) {
 return (
 <div className={styles.container}>
 <div className={styles.card}>
 <div className={styles.error}>
 Authentication failed: {displayError}
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
 <div className={styles.loadingContainer}>
 <Loader2 size={48} className={`${styles.spinner} ${styles.loadingSpinnerMargin}`} />
 <p className={styles.loadingText}>
 Completing authentication...
 </p>
 </div>
 </div>
 </div>
 );
}
