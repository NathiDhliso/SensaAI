import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import styles from './AppErrorBoundary.module.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AppErrorBoundary] Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.container}>
          <div className={styles.card}>
            <AlertTriangle size={48} className={styles.icon} />
            <h1 className={styles.title}>Something went wrong</h1>
            <p className={styles.message}>
              An unexpected error occurred. You can try refreshing the page or
              return to the home screen.
            </p>
            <div className={styles.actions}>
              <button onClick={this.handleReload} className={styles.primaryButton}>
                <RefreshCw size={16} />
                Refresh Page
              </button>
              <button onClick={this.handleGoHome} className={styles.secondaryButton}>
                <Home size={16} />
                Go Home
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className={styles.details}>
                <summary>Error Details (Dev Only)</summary>
                <pre className={styles.stack}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;
