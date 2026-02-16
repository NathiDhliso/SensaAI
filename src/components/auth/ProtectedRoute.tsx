import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { SensaShape } from '@/components/ui';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const location = useLocation();
    const { isAuthenticated, isLoading } = useAuthStore();

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, margin: '0 auto 1rem' }}>
                        <SensaShape type="nebula" size="md" animate={true} />
                    </div>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: `${location.pathname}${location.search}${location.hash}` }} replace />;
    }

    return <>{children}</>;
}
