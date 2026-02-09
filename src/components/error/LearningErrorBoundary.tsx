/**
 * LearningErrorBoundary - Error Boundary for VelocityLearning
 * 
 * Provides two recovery paths:
 * 1. Recover Partial Session - Attempt to reload from last checkpoint
 * 2. Safe Abandon - Clear corrupted state and return to dashboard
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import styles from './LearningErrorBoundary.module.css';
interface Props {
 children: ReactNode;
 onRecover?: () => void;
 onAbandon?: () => void;
}
interface State {
 hasError: boolean;
 error: Error | null;
 errorInfo: ErrorInfo | null;
 attemptedRecovery: boolean;
}
export class LearningErrorBoundary extends Component<Props, State> {
 constructor(props: Props) {
 super(props);
 this.state = {
 hasError: false,
 error: null,
 errorInfo: null,
 attemptedRecovery: false
 };
 }
 static getDerivedStateFromError(error: Error): Partial<State> {
 return { hasError: true, error };
 }
 componentDidCatch(error: Error, errorInfo: ErrorInfo) {
 // Log error to console for debugging
 console.error('[LearningErrorBoundary] Caught error:', error, errorInfo);
 this.setState({
 error,
 errorInfo
 });
 // TODO: Send to error tracking service (e.g., Sentry)
 }
 handleRecover = () => {
 this.setState({ attemptedRecovery: true });
 // Attempt to recover by calling parent's recovery handler
 if (this.props.onRecover) {
 this.props.onRecover();
 }
 // Reset error state to retry rendering
 this.setState({
 hasError: false,
 error: null,
 errorInfo: null
 });
 };
 handleAbandon = () => {
 // Clear corrupted state via parent handler
 if (this.props.onAbandon) {
 this.props.onAbandon();
 }
 // Reset error state
 this.setState({
 hasError: false,
 error: null,
 errorInfo: null,
 attemptedRecovery: false
 });
 };
 render() {
 if (this.state.hasError) {
 const { error, attemptedRecovery } = this.state;
 return (
 <div className={styles.container}>
 <div className={styles.errorCard}>
 <AlertTriangle size={64} className={styles.icon} />
 <h1 className={styles.title}>
 {attemptedRecovery ? 'Recovery Failed' : 'Something Went Wrong'}
 </h1>
 <p className={styles.message}>
 {attemptedRecovery
 ? 'We attempted to recover your session, but the error persists. You can safely abandon this session and return to the dashboard.'
 : 'An unexpected error occurred during your learning session. You can try to recover your progress or safely exit.'}
 </p>
 {/* Error Details (Development Only) */}
 {import.meta.env.DEV && error && (
 <details className={styles.errorDetails}>
 <summary>Error Details (Dev Only)</summary>
 <pre className={styles.errorStack}>
 {error.toString()}
 {this.state.errorInfo?.componentStack}
 </pre>
 </details>
 )}
 {/* Recovery Actions */}
 <div className={styles.actions}>
 {!attemptedRecovery && (
 <button
 onClick={this.handleRecover}
 className={styles.recoverButton}
 aria-label="Attempt to recover session"
 >
 <RefreshCw size={20} />
 Recover Session
 </button>
 )}
 <button
 onClick={this.handleAbandon}
 className={styles.abandonButton}
 aria-label="Abandon session and return to dashboard"
 >
 <Home size={20} />
 Return to Dashboard
 </button>
 </div>
 </div>
 </div>
 );
 }
 return this.props.children;
 }
}
export default LearningErrorBoundary;