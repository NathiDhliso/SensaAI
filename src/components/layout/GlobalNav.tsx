import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Archive, Globe, Settings, ArrowLeftRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useUIStore } from '@/store/ui-store';
import { getSpacingEngine } from '@/features/learning-session/algorithms/spacing-engine';
import { useMemo } from 'react';
import styles from './GlobalNav.module.css';

const HIDDEN_PATHS = ['/login', '/signup', '/confirm-signup', '/forgot-password', '/reset-password', '/auth/callback', '/callback', '/generate', '/study', '/dev', '/curator'];

function shouldHideNav(pathname: string): boolean {
    return HIDDEN_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

export function GlobalNav() {
    const { isAuthenticated, user } = useAuthStore();
    const { openSettingsPanel } = useUIStore();
    const navigate = useNavigate();
    const location = useLocation();

    const dueCount = useMemo(() => {
        try {
            return getSpacingEngine().getDueReviews().length;
        } catch {
            return 0;
        }
    }, [location.pathname]);

    if (!isAuthenticated || shouldHideNav(location.pathname)) return null;

    const isActive = (path: string) => location.pathname === path;
    const isAdmin = user?.role === 'admin';

    return (
        <>
            <nav className={styles.navBar}>
                <button
                    className={`${styles.navItem} ${isActive('/home') ? styles.navItemActive : ''}`}
                    onClick={() => navigate('/home')}
                >
                    <Home size={20} />
                    <span className={styles.navLabel}>Home</span>
                </button>
                <button
                    className={`${styles.navItem} ${isActive('/library') ? styles.navItemActive : ''}`}
                    onClick={() => navigate('/library')}
                >
                    <Archive size={20} />
                    <span className={styles.navLabel}>Library</span>
                    {dueCount > 0 && (
                        <span className={styles.navBadge}>{dueCount > 99 ? '99+' : dueCount}</span>
                    )}
                </button>
                <button
                    className={`${styles.navItem} ${isActive('/community') ? styles.navItemActive : ''}`}
                    onClick={() => navigate('/community')}
                >
                    <Globe size={20} />
                    <span className={styles.navLabel}>Community</span>
                </button>
                {isAdmin && (
                    <button
                        className={styles.navItem}
                        onClick={() => navigate('/curator')}
                        title="Switch to Curator Mode"
                    >
                        <ArrowLeftRight size={20} />
                        <span className={styles.navLabel}>Curator</span>
                    </button>
                )}
                <button
                    className={styles.navItem}
                    onClick={openSettingsPanel}
                >
                    <Settings size={20} />
                    <span className={styles.navLabel}>Settings</span>
                </button>
            </nav>
            <div className={styles.navSpacerInternal} />
        </>
    );
}

export function NavSpacer() {
    const { isAuthenticated } = useAuthStore();
    const location = useLocation();
    if (!isAuthenticated || shouldHideNav(location.pathname)) return null;
    return <div className={styles.navSpacer} />;
}
