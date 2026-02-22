/**
 * Landing Page - Application Entry Point
 * Routes users to appropriate interface based on role
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { Loader2 } from 'lucide-react';
import styles from './Landing.module.css';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Check user role and route accordingly
    const userRole = user?.role || 'learner';
    
    if (userRole === 'curator' || userRole === 'admin') {
      navigate('/curator');
    } else {
      navigate('/library');
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className={styles.container}>
      <Loader2 className={styles.spinner} size={48} />
      <p className={styles.text}>Loading...</p>
    </div>
  );
}
