import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import type { ReactNode } from 'react';

const isDev = import.meta.env.DEV;

interface ProtectedRouteProps {
    children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const location = useLocation();
    const { isAuthenticated } = useAuthStore();

    // In dev mode, allow access without auth (uses .env credentials)
    if (isDev) {
        return <>{children}</>;
    }

    // In production, require authentication
    if (!isAuthenticated) {
        // Redirect to login, saving the intended destination
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    return <>{children}</>;
}
