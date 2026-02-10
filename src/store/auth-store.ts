/**
 * @file auth-store.ts
 * @description Zustand store for authentication state management.
 * Uses HttpOnly cookies for secure token storage - tokens are never exposed to JavaScript.
 * 
 * Security Model:
 * - Access/Refresh tokens stored in HttpOnly cookies (managed by backend)
 * - Only user profile data stored in client state
 * - Session validation via backend API
 * - Automatic logout on 401 responses
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authSessionApi } from '@/shared/api/client';
// Configuration from environment
const COGNITO_DOMAIN = (import.meta.env.VITE_COGNITO_DOMAIN || '').replace(/^(https?:\/\/)?/, 'https://');
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';
const COGNITO_REDIRECT_URI = import.meta.env.VITE_COGNITO_REDIRECT_URI || window.location.origin + '/auth/callback';
const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1';
// Storage key for the PKCE code verifier (temporary, cleared after exchange)
const CODE_VERIFIER_KEY = 'sensapbl_code_verifier';
// ============================================================================
// Interfaces
// ============================================================================
export interface User {
 id: string;
 email: string;
 name?: string;
}
// Note: AuthTokens interface removed - tokens now in HttpOnly cookies
// We keep a minimal session state for UI purposes
interface AuthState {
 user: User | null;
 isAuthenticated: boolean;
 isLoading: boolean;
 error: string | null;
 /** Timestamp of last successful session validation */
 lastValidated: number | null;
}
interface AuthActions {
 /** Redirect to Cognito hosted UI for OAuth login */
 login: () => void;
 /** Direct login with email/password (sets HttpOnly cookie) */
 loginWithCredentials: (email: string, password: string) => Promise<void>;
 /** Sign up new user */
 signUp: (email: string, password: string, name: string) => Promise<void>;
 /** Confirm sign up with verification code */
 confirmSignUp: (email: string, code: string) => Promise<void>;
 /** Resend confirmation code */
 resendConfirmationCode: (email: string) => Promise<void>;
 /** Logout and clear session cookie */
 logout: () => Promise<void>;
 /** Handle OAuth callback - exchange code for session */
 handleCallback: (code: string) => Promise<void>;
 /** Validate current session with backend */
 validateSession: () => Promise<boolean>;
 /** Refresh session (backend handles token refresh) */
 refreshSession: () => Promise<boolean>;
 /** Clear error state */
 clearError: () => void;
 /** Clear all auth data (for debugging/support) */
 clearAllAuthData: () => Promise<void>;
 /** Initialize auth listeners (call once on app mount) */
 initializeAuthListeners: () => () => void;
}
export type AuthStore = AuthState & AuthActions;
// ============================================================================
// PKCE Helper Functions (for OAuth flow)
// ============================================================================
/** Generate a cryptographically random string */
function generateRandomString(length: number): string {
 const array = new Uint8Array(length);
 crypto.getRandomValues(array);
 return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
}
/** Create a SHA-256 hash of the input */
async function sha256(plain: string): Promise<ArrayBuffer> {
 const encoder = new TextEncoder();
 const data = encoder.encode(plain);
 return crypto.subtle.digest('SHA-256', data);
}
/** Base64 URL encode the buffer */
function base64UrlEncode(buffer: ArrayBuffer): string {
 const bytes = new Uint8Array(buffer);
 let binary = '';
 for (let i = 0; i < bytes.byteLength; i++) {
 binary += String.fromCharCode(bytes[i]);
 }
 return btoa(binary)
 .replace(/\+/g, '-')
 .replace(/\//g, '_')
 .replace(/=+$/, '');
}
/** Generate the code challenge from the verifier */
async function generateCodeChallenge(verifier: string): Promise<string> {
 const hash = await sha256(verifier);
 return base64UrlEncode(hash);
}
// ============================================================================
// Error Formatting
// ============================================================================
/**
 * Maps AWS Cognito error messages to user-friendly messages
 */
function formatAuthError(error: unknown): string {
 if (error instanceof Error) {
 const message = error.message;
 // Handle specific Cognito error messages
 if (message.includes('Incorrect username or password')) {
 return 'Invalid email or password. Please try again.';
 }
 if (message.includes('User does not exist')) {
 return 'No account found with this email. Please sign up first.';
 }
 if (message.includes('User is not confirmed')) {
 return 'Please verify your email before signing in.';
 }
 if (message.includes('Password attempts exceeded')) {
 return 'Too many failed attempts. Please try again later.';
 }
 if (message.includes('Invalid verification code') || message.includes('CodeMismatchException')) {
 return 'Invalid verification code. Please check the code and try again, or request a new one.';
 }
 if (message.includes('expired') || message.includes('ExpiredCodeException')) {
 return 'Verification code has expired. Please click "Resend Code" below to get a new one.';
 }
 if (message.includes('LimitExceededException') || message.includes('Attempt limit exceeded')) {
 return 'Too many attempts. Please wait a few minutes before trying again.';
 }
 if (message.includes('InvalidParameterException')) {
 return 'Invalid input. Please check your details.';
 }
 if (message.includes('Session expired') || message.includes('session')) {
 return 'Your session has expired. Please sign in again.';
 }
 if (message.includes('Network') || message.includes('fetch')) {
 return 'Network error. Please check your connection and try again.';
 }
 return message;
 }
 return 'An unexpected error occurred. Please try again.';
}
// ============================================================================
// Auth Store
// ============================================================================
export const useAuthStore = create<AuthStore>()(
 persist(
 (set, get) => ({
 // Initial State - No tokens stored (they're in HttpOnly cookies)
 user: null,
 isAuthenticated: false,
 isLoading: false,
 error: null,
 lastValidated: null,
 // ----------------------------------------------------------------
 // OAuth Login (Redirect to Cognito Hosted UI)
 // ----------------------------------------------------------------
 login: async () => {
 try {
 // Generate PKCE values
 const codeVerifier = generateRandomString(64);
 const codeChallenge = await generateCodeChallenge(codeVerifier);
 // Store verifier for callback
 localStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
 // Build authorization URL
 const params = new URLSearchParams({
 client_id: COGNITO_CLIENT_ID,
 response_type: 'code',
 scope: 'openid email profile',
 redirect_uri: COGNITO_REDIRECT_URI,
 code_challenge: codeChallenge,
 code_challenge_method: 'S256'
 });
 // Redirect to Cognito
 window.location.href = `${COGNITO_DOMAIN}/oauth2/authorize?${params}`;
 } catch (error) {
 console.error('[Auth] Failed to initiate login:', error);
 set({ error: 'Failed to start login process. Please try again.' });
 }
 },
 // ----------------------------------------------------------------
 // Direct Credentials Login (HttpOnly cookie set by backend)
 // ----------------------------------------------------------------
 loginWithCredentials: async (email: string, password: string) => {
 set({ isLoading: true, error: null });
 try {
 const result = await authSessionApi.loginWithCredentials(email, password);
 set({
 user: result.user,
 isAuthenticated: true,
 isLoading: false,
 error: null,
 lastValidated: Date.now()
 });
 } catch (error) {
 console.error('[Auth] Login error:', error);
 const errorMessage = formatAuthError(error);
 set({
 error: errorMessage,
 isLoading: false,
 isAuthenticated: false,
 user: null
 });
 throw error;
 }
 },
 // ----------------------------------------------------------------
 // Sign Up (Uses Cognito SDK - no tokens involved)
 // ----------------------------------------------------------------
 signUp: async (email: string, password: string, name: string) => {
 set({ isLoading: true, error: null });
 try {
 const { CognitoIdentityProviderClient, SignUpCommand } = await import('@aws-sdk/client-cognito-identity-provider');
 const client = new CognitoIdentityProviderClient({ region: AWS_REGION });
 const command = new SignUpCommand({
 ClientId: COGNITO_CLIENT_ID,
 Username: email,
 Password: password,
 UserAttributes: [
 { Name: 'email', Value: email },
 { Name: 'name', Value: name }
 ]
 });
 await client.send(command);
 set({ isLoading: false, error: null });
 } catch (error) {
 console.error('[Auth] Sign up error:', error);
 const errorMessage = formatAuthError(error);
 set({ error: errorMessage, isLoading: false });
 throw error;
 }
 },
 // ----------------------------------------------------------------
 // Confirm Sign Up
 // ----------------------------------------------------------------
 confirmSignUp: async (email: string, code: string) => {
 set({ isLoading: true, error: null });
 try {
 const { CognitoIdentityProviderClient, ConfirmSignUpCommand } = await import('@aws-sdk/client-cognito-identity-provider');
 const client = new CognitoIdentityProviderClient({ region: AWS_REGION });
 const command = new ConfirmSignUpCommand({
 ClientId: COGNITO_CLIENT_ID,
 Username: email,
 ConfirmationCode: code
 });
 await client.send(command);
 set({ isLoading: false, error: null });
 } catch (error) {
 console.error('[Auth] Confirm sign up error:', error);
 const errorMessage = formatAuthError(error);
 set({ error: errorMessage, isLoading: false });
 throw error;
 }
 },
 // ----------------------------------------------------------------
 // Resend Confirmation Code
 // ----------------------------------------------------------------
 resendConfirmationCode: async (email: string) => {
 try {
 const { CognitoIdentityProviderClient, ResendConfirmationCodeCommand } = await import('@aws-sdk/client-cognito-identity-provider');
 const client = new CognitoIdentityProviderClient({ region: AWS_REGION });
 const command = new ResendConfirmationCodeCommand({
 ClientId: COGNITO_CLIENT_ID,
 Username: email
 });
 await client.send(command);
 } catch (error) {
 console.error('[Auth] Resend code error:', error);
 const errorMessage = formatAuthError(error);
 set({ error: errorMessage });
 throw error;
 }
 },
 // ----------------------------------------------------------------
 // Logout (Clears HttpOnly cookie via backend)
 // ----------------------------------------------------------------
 logout: async () => {
 try {
 // Clear the HttpOnly cookie via backend
 await authSessionApi.clearSession();
 } catch (error) {
 console.warn('[Auth] Error clearing session cookie:', error);
 // Continue with local cleanup even if backend call fails
 }
 // Clear local state
 set({
 user: null,
 isAuthenticated: false,
 error: null,
 lastValidated: null
 });
 // Clear PKCE verifier if present
 localStorage.removeItem(CODE_VERIFIER_KEY);
 // Redirect to login page
 window.location.href = '/login';
 },
 // ----------------------------------------------------------------
 // Handle OAuth Callback (Exchange code for session cookie)
 // ----------------------------------------------------------------
 handleCallback: async (code: string) => {
 set({ isLoading: true, error: null });
 try {
 const codeVerifier = localStorage.getItem(CODE_VERIFIER_KEY);
 if (!codeVerifier) {
 console.warn('[Auth] PKCE code verifier missing, redirecting to login...');
 set({ user: null, isAuthenticated: false, isLoading: false });
 get().login();
 return;
 }
 // Exchange code for session (backend sets HttpOnly cookie)
 const result = await authSessionApi.exchangeCode(
 code,
 COGNITO_REDIRECT_URI,
 codeVerifier
 );
 // Clear the verifier
 localStorage.removeItem(CODE_VERIFIER_KEY);
 set({
 user: result.user,
 isAuthenticated: true,
 isLoading: false,
 lastValidated: Date.now()
 });
 } catch (error) {
 console.error('[Auth] Callback error:', error);
 localStorage.removeItem(CODE_VERIFIER_KEY);
 set({
 error: error instanceof Error ? error.message : 'Authentication failed',
 isLoading: false,
 isAuthenticated: false,
 user: null
 });
 }
 },
 // ----------------------------------------------------------------
 // Validate Session (Check with backend if session is still valid)
 // ----------------------------------------------------------------
 validateSession: async () => {
 try {
 const result = await authSessionApi.validateSession();
 if (result.valid && result.user) {
 set({
 user: result.user,
 isAuthenticated: true,
 lastValidated: Date.now()
 });
 return true;
 } else {
 set({
 user: null,
 isAuthenticated: false,
 lastValidated: null
 });
 return false;
 }
 } catch (error) {
 console.warn('[Auth] Session validation failed:', error);
 set({
 user: null,
 isAuthenticated: false,
 lastValidated: null
 });
 return false;
 }
 },
 // ----------------------------------------------------------------
 // Refresh Session (Backend handles token refresh, sets new cookie)
 // ----------------------------------------------------------------
 refreshSession: async () => {
 try {
 const result = await authSessionApi.refreshSession();
 if (result.success) {
 set({ lastValidated: Date.now() });
 return true;
 }
 return false;
 } catch (error) {
 console.warn('[Auth] Session refresh failed:', error);
 return false;
 }
 },
 // ----------------------------------------------------------------
 // Clear Error
 // ----------------------------------------------------------------
 clearError: () => set({ error: null }),
 // ----------------------------------------------------------------
 // Clear All Auth Data (Debug/Support utility)
 // ----------------------------------------------------------------
 clearAllAuthData: async () => {
 try {
 await authSessionApi.clearSession();
 } catch (_e) {
 // Ignore errors
 }
 // Clear Zustand persisted state
 set({
 user: null,
 isAuthenticated: false,
 error: null,
 lastValidated: null
 });
 // Clear localStorage items
 localStorage.removeItem(CODE_VERIFIER_KEY);
 localStorage.removeItem('sensapbl-auth');
 // Clear session storage
 sessionStorage.clear();
 },
 // ----------------------------------------------------------------
 // Initialize Auth Listeners (call on app mount)
 // ----------------------------------------------------------------
 initializeAuthListeners: () => {
 // Listen for 401 unauthorized events from API client
 const handleUnauthorized = () => {
 console.warn('[Auth] Received unauthorized event, clearing session...');
 set({
 user: null,
 isAuthenticated: false,
 error: 'Session expired. Please sign in again.',
 lastValidated: null
 });
 };
 window.addEventListener('auth:unauthorized', handleUnauthorized);
 // Return cleanup function
 return () => {
 window.removeEventListener('auth:unauthorized', handleUnauthorized);
 };
 }
 }),
 {
 name: 'sensapbl-auth',
 // Only persist user info, not tokens (those are in HttpOnly cookies)
 partialize: (state) => ({
 user: state.user,
 isAuthenticated: state.isAuthenticated,
 lastValidated: state.lastValidated
 }),
 onRehydrateStorage: () => (state) => {
 if (state?.isAuthenticated) {
 // Validate session with backend after hydration
 // Use setTimeout to ensure store is ready
 setTimeout(async () => {
 const isValid = await useAuthStore.getState().validateSession();
 if (!isValid) {
 console.warn('[Auth] Session invalid on hydration, clearing state');
 useAuthStore.setState({
 user: null,
 isAuthenticated: false,
 lastValidated: null
 });
 }
 }, 100);
 }
 }
 }
 )
);
// ============================================================================
// Backward Compatibility Exports
// ============================================================================
/**
 * @deprecated Use validateSession() instead
 * This is kept for backward compatibility during migration
 */
export const isSessionValid = (): boolean => {
 const state = useAuthStore.getState();
 // Session validity is now determined by backend, but we can do a quick local check
 if (!state.isAuthenticated || !state.lastValidated) return false;
 // Consider session potentially invalid if not validated in last 5 minutes
 const VALIDATION_TTL = 5 * 60 * 1000; // 5 minutes
 return Date.now() - state.lastValidated < VALIDATION_TTL;
};
/**
 * @deprecated Tokens are now in HttpOnly cookies, inaccessible to JavaScript
 * This function now always returns null - API client handles auth automatically
 */
export const getAccessToken = async (): Promise<string | null> => {
 console.warn('[Auth] getAccessToken() is deprecated. Tokens are now in HttpOnly cookies.');
 return null;
};
