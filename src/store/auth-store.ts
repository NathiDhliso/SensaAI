/**
 * @file auth-store.ts
 * @description Zustand store for authentication state management.
 * Uses Bearer JWT tokens stored in memory for serverless API Gateway auth.
 * 
 * Security Model:
 * - Tokens stored in Zustand state (memory) and persisted in localStorage
 * - Authorization: Bearer <token> sent on every API request
 * - Automatic token refresh before expiry
 * - Session validation via local JWT decode (no backend call needed)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authSessionApi, getErrorMessage, isApiError, isAuthError } from '@/shared/api/client';

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

/** JWT tokens returned by auth Lambda */
interface AuthTokens {
 access_token: string;
 id_token: string;
 refresh_token: string;
 expires_in: number;
 /** Absolute timestamp (ms) when access_token expires */
 expires_at?: number;
}

interface AuthState {
 user: User | null;
 isAuthenticated: boolean;
 isLoading: boolean;
 error: string | null;
 /** JWT tokens (stored in memory, persisted via Zustand) */
 tokens: AuthTokens | null;
 /** Timestamp of last successful session validation */
 lastValidated: number | null;
}

interface AuthActions {
 /** Redirect to Cognito hosted UI for OAuth login */
 login: () => void;
 /** Direct login with email/password */
 loginWithCredentials: (email: string, password: string) => Promise<void>;
 /** Sign up new user */
 signUp: (email: string, password: string, name: string) => Promise<void>;
 /** Confirm sign up with verification code */
 confirmSignUp: (email: string, code: string) => Promise<void>;
 /** Resend confirmation code */
 resendConfirmationCode: (email: string) => Promise<void>;
 /** Logout and clear tokens */
 logout: () => Promise<void>;
 /** Handle OAuth callback - exchange code for tokens */
 handleCallback: (code: string) => Promise<void>;
 /** Validate current session (local JWT decode) */
 validateSession: () => Promise<boolean>;
 /** Refresh access token using refresh_token */
 refreshSession: () => Promise<boolean>;
 /** Clear error state */
 clearError: () => void;
 /** Clear all auth data (for debugging/support) */
 clearAllAuthData: () => Promise<void>;
 /** Initialize auth listeners (call once on app mount) */
 initializeAuthListeners: () => () => void;
 /** Get current access token (for API client) */
 getAccessToken: () => string | null;
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
function getAuthErrorName(error: unknown): string {
 if (!error || typeof error !== 'object') return '';
 const maybeName = (error as { name?: unknown }).name;
 if (typeof maybeName === 'string') return maybeName;
 const maybeCode = (error as { code?: unknown }).code;
 if (typeof maybeCode === 'string') return maybeCode;
 const maybeAwsCode = (error as { Code?: unknown }).Code;
 if (typeof maybeAwsCode === 'string') return maybeAwsCode;
 return '';
}

function formatAuthError(error: unknown): string {
 const message = getErrorMessage(error, 'An unexpected error occurred. Please try again.');
 const normalized = message.toLowerCase();
 const errorName = getAuthErrorName(error);

 switch (errorName) {
 case 'UsernameExistsException':
  return 'An account with this email already exists. Please sign in instead.';
 case 'InvalidPasswordException':
  return 'Password does not meet requirements. Please use a stronger password.';
 case 'InvalidParameterException':
  return 'Invalid input. Please review your details and try again.';
 case 'CodeMismatchException':
  return 'Invalid verification code. Please check and try again.';
 case 'ExpiredCodeException':
  return 'Verification code has expired. Please request a new one.';
 case 'TooManyFailedAttemptsException':
 case 'LimitExceededException':
 case 'TooManyRequestsException':
  return 'Too many attempts. Please wait a few minutes and try again.';
 case 'UserNotConfirmedException':
  return 'Please verify your email before signing in.';
 case 'NotAuthorizedException':
  return 'Invalid email or password. Please try again.';
 default:
  break;
 }

 if (isApiError(error)) {
 if (error.isAbortError) {
 return 'Request was cancelled.';
 }
 if (error.isNetworkError) {
 return 'Network error. Please check your connection and try again.';
 }
 if (error.status === 401) {
  if (normalized.includes('invalid email or password')) {
  return 'Invalid email or password. Please try again.';
  }
  return 'Your session has expired. Please sign in again.';
 }
 if (error.status === 403 && normalized.includes('verify')) {
  return 'Please verify your email before signing in.';
 }
 if (error.status === 429) {
  return 'Too many attempts. Please wait a few minutes and try again.';
 }
 if (typeof error.status === 'number' && error.status >= 500) {
  return 'Authentication service is temporarily unavailable. Please try again shortly.';
 }
 }

 if (normalized.includes('incorrect username or password') || normalized.includes('invalid email or password')) {
 return 'Invalid email or password. Please try again.';
 }
 if (normalized.includes('user does not exist') || normalized.includes('no account found')) {
 return 'No account found with this email. Please sign up first.';
 }
 if (normalized.includes('user is not confirmed')) {
 return 'Please verify your email before signing in.';
 }
 if (normalized.includes('expired code') || normalized.includes('verification code has expired')) {
 return 'Verification code has expired. Please request a new one.';
 }
 if (normalized.includes('invalid verification code')) {
 return 'Invalid verification code. Please check and try again.';
 }
 if (normalized.includes('session expired') || normalized.includes('unauthorized') || isAuthError(error)) {
 return 'Your session has expired. Please sign in again.';
 }
 if (normalized.includes('network') || normalized.includes('fetch') || normalized.includes('offline')) {
 return 'Network error. Please check your connection and try again.';
 }
 return message;
}
// ============================================================================
// Auth Store
// ============================================================================
export const useAuthStore = create<AuthStore>()(
 persist(
 (set, get) => ({
 // Initial State
 user: null,
 isAuthenticated: false,
 isLoading: false,
 error: null,
 tokens: null,
 lastValidated: null,

 // ----------------------------------------------------------------
 // Get Access Token (for API client to read)
 // ----------------------------------------------------------------
 getAccessToken: () => {
 const { tokens } = get();
 return tokens?.access_token || null;
 },

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
 // Direct Credentials Login (returns tokens as JSON)
 // ----------------------------------------------------------------
 loginWithCredentials: async (email: string, password: string) => {
 set({ isLoading: true, error: null });
 try {
 const result = await authSessionApi.loginWithCredentials(email, password);
 const tokens: AuthTokens = {
 ...result.tokens,
 expires_at: Date.now() + (result.tokens.expires_in * 1000),
 };
 set({
 user: result.user,
 tokens,
 isAuthenticated: true,
 isLoading: false,
 error: null,
 lastValidated: Date.now()
 });
 // Schedule auto-refresh
 scheduleTokenRefresh(tokens.expires_in);
 } catch (error) {
 console.error('[Auth] Login error:', error);
 const errorMessage = formatAuthError(error);
 set({
 error: errorMessage,
 isLoading: false,
 isAuthenticated: false,
 user: null,
 tokens: null,
 lastValidated: null
 });
 throw new Error(errorMessage);
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
 throw new Error(errorMessage);
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
 throw new Error(errorMessage);
 }
 },

 // ----------------------------------------------------------------
 // Resend Confirmation Code
 // ----------------------------------------------------------------
 resendConfirmationCode: async (email: string) => {
 try {
 set({ isLoading: true, error: null });
 const { CognitoIdentityProviderClient, ResendConfirmationCodeCommand } = await import('@aws-sdk/client-cognito-identity-provider');
 const client = new CognitoIdentityProviderClient({ region: AWS_REGION });
 const command = new ResendConfirmationCodeCommand({
 ClientId: COGNITO_CLIENT_ID,
 Username: email
 });
 await client.send(command);
 set({ isLoading: false, error: null });
 } catch (error) {
 console.error('[Auth] Resend code error:', error);
 const errorMessage = formatAuthError(error);
 set({ error: errorMessage, isLoading: false });
 throw new Error(errorMessage);
 }
 },

 // ----------------------------------------------------------------
 // Logout (clear local tokens, optionally sign out from Cognito)
 // ----------------------------------------------------------------
 logout: async () => {
 try {
 await authSessionApi.clearSession();
 } catch (error) {
 console.warn('[Auth] Error during remote logout:', error);
 }
 // Clear local state
 set({
 user: null,
 isAuthenticated: false,
 tokens: null,
 error: null,
 lastValidated: null
 });
 // Clear PKCE verifier if present
 localStorage.removeItem(CODE_VERIFIER_KEY);
 // Clear any pending refresh timers
 clearScheduledRefresh();
 // Redirect to login page
 window.location.href = '/login';
 },

 // ----------------------------------------------------------------
 // Handle OAuth Callback (Exchange code for tokens)
 // ----------------------------------------------------------------
 handleCallback: async (code: string) => {
 set({ isLoading: true, error: null });
 try {
 const codeVerifier = localStorage.getItem(CODE_VERIFIER_KEY);
 if (!codeVerifier) {
 const message = 'Authentication session expired. Please sign in again.';
 console.warn('[Auth] PKCE code verifier missing.');
 set({
 user: null,
 isAuthenticated: false,
 isLoading: false,
 tokens: null,
 error: message,
 lastValidated: null
 });
 throw new Error(message);
 }
 // Exchange code for tokens
 const result = await authSessionApi.exchangeCode(
 code,
 COGNITO_REDIRECT_URI,
 codeVerifier
 );
 // Clear the verifier
 localStorage.removeItem(CODE_VERIFIER_KEY);

 const tokens: AuthTokens = {
 ...result.tokens,
 expires_at: Date.now() + (result.tokens.expires_in * 1000),
 };
 set({
 user: result.user,
 tokens,
 isAuthenticated: true,
 isLoading: false,
 error: null,
 lastValidated: Date.now()
 });
 // Schedule auto-refresh
 scheduleTokenRefresh(tokens.expires_in);
 } catch (error) {
 console.error('[Auth] Callback error:', error);
 const errorMessage = formatAuthError(error);
 localStorage.removeItem(CODE_VERIFIER_KEY);
 set({
 error: errorMessage,
 isLoading: false,
 isAuthenticated: false,
 user: null,
 tokens: null,
 lastValidated: null
 });
 throw new Error(errorMessage);
 }
 },

 // ----------------------------------------------------------------
 // Validate Session (local JWT decode — no backend call)
 // ----------------------------------------------------------------
 validateSession: async () => {
 try {
 const { tokens } = get();
 if (!tokens?.access_token) {
 set({ user: null, isAuthenticated: false, lastValidated: null, tokens: null });
 return false;
 }

 // Check if token is expired locally
 if (tokens.expires_at && Date.now() >= tokens.expires_at) {
 // Try to refresh
 const refreshed = await get().refreshSession();
 if (!refreshed) {
  set({ user: null, isAuthenticated: false, lastValidated: null, tokens: null });
  return false;
 }
 return true;
 }

 // Validate via backend for user info
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
 lastValidated: null,
 tokens: null
 });
 return false;
 }
 } catch (error) {
 console.warn('[Auth] Session validation failed:', error);
 set({
 user: null,
 isAuthenticated: false,
 lastValidated: null,
 tokens: null
 });
 return false;
 }
 },

 // ----------------------------------------------------------------
 // Refresh Session (send refresh_token, get new access_token)
 // ----------------------------------------------------------------
 refreshSession: async () => {
 try {
 const { tokens } = get();
 if (!tokens?.refresh_token) {
 return false;
 }
 const result = await authSessionApi.refreshSession(tokens.refresh_token);
 if (result.access_token) {
 const newTokens: AuthTokens = {
 ...tokens,
 access_token: result.access_token,
 id_token: result.id_token || tokens.id_token,
 expires_in: result.expires_in,
 expires_at: Date.now() + (result.expires_in * 1000),
 };
 set({ tokens: newTokens, lastValidated: Date.now() });
 scheduleTokenRefresh(result.expires_in);
 return true;
 }
 return false;
 } catch (error) {
 console.warn('[Auth] Session refresh failed:', error);
 if (isAuthError(error)) {
  set({
  user: null,
  isAuthenticated: false,
  tokens: null,
  error: 'Session expired. Please sign in again.',
  lastValidated: null
  });
 }
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
 clearScheduledRefresh();
 set({
 user: null,
 isAuthenticated: false,
 tokens: null,
 error: null,
 lastValidated: null
 });
 localStorage.removeItem(CODE_VERIFIER_KEY);
 localStorage.removeItem('sensapbl-auth');
 sessionStorage.clear();
 },

 // ----------------------------------------------------------------
 // Initialize Auth Listeners (call on app mount)
 // ----------------------------------------------------------------
 initializeAuthListeners: () => {
 const handleUnauthorized = async () => {
 console.warn('[Auth] Received unauthorized event, trying refresh...');
 const refreshed = await get().refreshSession();
 if (!refreshed) {
  set({
  user: null,
  isAuthenticated: false,
  tokens: null,
  error: 'Session expired. Please sign in again.',
  lastValidated: null
  });
 }
 };
 window.addEventListener('auth:unauthorized', handleUnauthorized);
 // If we have tokens, schedule refresh
 const { tokens } = get();
 if (tokens?.expires_at) {
 const remainingSec = Math.max(0, Math.floor((tokens.expires_at - Date.now()) / 1000));
 if (remainingSec > 0) {
  scheduleTokenRefresh(remainingSec);
 }
 }
 return () => {
 window.removeEventListener('auth:unauthorized', handleUnauthorized);
 clearScheduledRefresh();
 };
 }
 }),
 {
 name: 'sensapbl-auth',
 // Persist user info and tokens
 partialize: (state) => ({
 user: state.user,
 isAuthenticated: state.isAuthenticated,
 tokens: state.tokens,
 lastValidated: state.lastValidated
 }),
 onRehydrateStorage: () => (state) => {
 if (state?.isAuthenticated && state?.tokens) {
 setTimeout(async () => {
  const isValid = await useAuthStore.getState().validateSession();
  if (!isValid) {
  console.warn('[Auth] Session invalid on hydration, clearing state');
  useAuthStore.setState({
  user: null,
  isAuthenticated: false,
  tokens: null,
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
// Token Refresh Scheduler
// ============================================================================
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleTokenRefresh(expiresInSec: number): void {
 clearScheduledRefresh();
 // Refresh 60 seconds before expiry (or halfway if < 120s)
 const refreshInMs = Math.max(1000, (expiresInSec - 60) * 1000);
 refreshTimer = setTimeout(async () => {
 const store = useAuthStore.getState();
 if (store.isAuthenticated && store.tokens?.refresh_token) {
 console.info('[Auth] Auto-refreshing token...');
 await store.refreshSession();
 }
 }, refreshInMs);
}

function clearScheduledRefresh(): void {
 if (refreshTimer) {
 clearTimeout(refreshTimer);
 refreshTimer = null;
 }
}

// ============================================================================
// Backward Compatibility Exports
// ============================================================================

/**
 * Quick local check for session validity
 */
export const isSessionValid = (): boolean => {
 const state = useAuthStore.getState();
 if (!state.isAuthenticated || !state.tokens) return false;
 // Check token expiry
 if (state.tokens.expires_at && Date.now() >= state.tokens.expires_at) return false;
 return true;
};

/**
 * Get access token for API calls
 */
export const getAccessToken = async (): Promise<string | null> => {
 const state = useAuthStore.getState();
 if (!state.tokens?.access_token) return null;
 // If expired, try refresh
 if (state.tokens.expires_at && Date.now() >= state.tokens.expires_at) {
 const refreshed = await state.refreshSession();
 if (!refreshed) return null;
 return useAuthStore.getState().tokens?.access_token || null;
 }
 return state.tokens.access_token;
};
