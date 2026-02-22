/**
 * Curator Dashboard
 * Main dashboard for Content Lifecycle Management
 */

import { Outlet, NavLink, useLocation } from 'react-router-dom';
import styles from './CuratorDashboard.module.css';

export default function CuratorDashboard() {
  const location = useLocation();

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
        </nav>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
