import { useAuthStore } from '@/store/auth-store';

const ALLOWED_GENERATOR_EMAILS: ReadonlySet<string> = new Set([
  'nkosimano@gmail.com',
  'immanueldhliso@gmail.com',
  'nkosinathi.dhliso@gmail.com',
]);

export function isGenerationAllowed(): boolean {
  const email = useAuthStore.getState().user?.email?.toLowerCase();
  if (!email) return false;
  return ALLOWED_GENERATOR_EMAILS.has(email);
}
