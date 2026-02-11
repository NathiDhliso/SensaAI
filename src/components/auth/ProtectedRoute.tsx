import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import type { ReactNode } from 'react';
interface ProtectedRouteProps {
 children: ReactNode;
}
export function ProtectedRoute({ children }: ProtectedRouteProps) {
 const location = useLocation();
 const { isAuthenticated, isLoading } = useAuthStore();
 // Dev bypass removed to enforce auth flow testing
 // if (isDev) {
 // return <>{children}</>;
 // }
 if (isLoading) {
 return null;
 }
 // In production, require authentication
 if (!isAuthenticated) {
 // Redirect to login, saving the intended destination
 return <Navigate to="/login" state={{ from: `${location.pathname}${location.search}${location.hash}` }} replace />;
 }
 return <>{children}</>;
}
