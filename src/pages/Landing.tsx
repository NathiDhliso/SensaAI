/**
 * Landing Page - Application Entry Point
 * Routes users to appropriate interface based on role
 * Admins get a choice between curator and learner modes
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { Loader2, BookOpen, Settings } from 'lucide-react';
import styles from './Landing.module.css';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [showChoice, setShowChoice] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Check user role and route accordingly
    const userRole = user?.role || 'learner';
    
    // Admins get to choose their mode
    if (userRole === 'admin') {
      setShowChoice(true);
    } else if (userRole === 'curator') {
      navigate('/curator');
    } else {
      navigate('/library');
    }
  }, [isAuthenticated, user, navigate]);

  if (showChoice) {
    return (
      <div className={styles.container}>
        <div className={styles.choiceContainer}>
          <h1 className={styles.choiceTitle}>Welcome, Admin</h1>
          <p className={styles.choiceSubtitle}>Choose your mode</p>
          
          <div className={styles.choiceButtons}>
            <button
              className={styles.choiceButton}
              onClick={() => navigate('/curator')}
            >
              <Settings size={32} />
              <span className={styles.choiceButtonTitle}>Curator Mode</span>
              <span className={styles.choiceButtonDesc}>Manage content, review audits, analytics</span>
            </button>
            
            <button
              className={styles.choiceButton}
              onClick={() => navigate('/library')}
            >
              <BookOpen size={32} />
              <span className={styles.choiceButtonTitle}>Learner Mode</span>
              <span className={styles.choiceButtonDesc}>Study content, track progress</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Loader2 className={styles.spinner} size={48} />
      <p className={styles.text}>Loading...</p>
    </div>
  );
}
