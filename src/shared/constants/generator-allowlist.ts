import { useAuthStore } from '@/store/auth-store';

/**
 * Check if the current user is allowed to generate content
 * Content generation is now restricted to curators and admins only
 */
export function isGenerationAllowed(): boolean {
  const user = useAuthStore.getState().user;
  if (!user) return false;

  // Bypass for local development mock user
  if (import.meta.env.DEV && user.id === 'dev-user') return true;

  // Only curators and admins can generate content
  const role = user.role || 'learner';
  return role === 'curator' || role === 'admin';
}
