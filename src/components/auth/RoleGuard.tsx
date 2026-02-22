/**
 * Role-Based Route Guard
 * Restricts access to routes based on user role
 */

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export function RoleGuard({ children, allowedRoles, redirectTo = '/library' }: RoleGuardProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user?.role || 'learner';

  // Allow access if user has allowed role OR if in development mode
  const isDev = import.meta.env.DEV;
  const hasAccess = allowedRoles.includes(userRole) || isDev;

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
