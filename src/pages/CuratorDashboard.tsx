/**
 * Curator Dashboard
 * Main dashboard for Content Lifecycle Management
 */

import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { ArrowLeft } from 'lucide-react';
import styles from './CuratorDashboard.module.css';

export default function CuratorDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <h1 className={styles.title}>Content Curator</h1>
          <p className={styles.subtitle}>Lifecycle Management</p>
        </div>

        <nav className={styles.nav}>
          <NavLink
            to="/curator/generate"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Content
          </NavLink>

          <NavLink
            to="/curator/audits"
            className={({ isActive }) =>
              isActive || location.pathname === '/curator'
                ? `${styles.navLink} ${styles.active}`
                : styles.navLink
            }
          >
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Audit Queue
          </NavLink>

          <NavLink
            to="/curator/analytics"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics
          </NavLink>

          <NavLink
            to="/curator/library"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Library
          </NavLink>
        </nav>

        {isAdmin && (
          <div className={styles.modeSwitcher}>
            <button
              className={styles.switchModeButton}
              onClick={() => navigate('/library')}
            >
              <ArrowLeft size={16} />
              Switch to Learner Mode
            </button>
          </div>
        )}
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
