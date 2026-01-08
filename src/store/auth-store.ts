// Authentication Store using AWS Cognito
// Manages user authentication state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api/client';

const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';
const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN || '';
const COGNITO_REDIRECT_URI = import.meta.env.VITE_COGNITO_REDIRECT_URI || window.location.origin + '/auth/callback';

interface User {
    id: string;
    email: string;
    name?: string;
}

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    idToken: string;
    expiresAt: number;
}

interface AuthState {
    user: User | null;
    tokens: AuthTokens | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

interface AuthActions {
    login: () => void;
    logout: () => void;
    handleCallback: (code: string) => Promise<void>;
    refreshTokens: () => Promise<void>;
    getAccessToken: () => Promise<string | null>;
    isSessionValid: () => boolean;
    clearError: () => void;
}

const initialState: AuthState = {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
};

// Helper to generate random string for PKCE
const generateRandomString = (length: number) => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
        result += charset[values[i] % charset.length];
    }
    return result;
};

// Helper to generate code challenge from verifier
const generateCodeChallenge = async (verifier: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);

    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

const CODE_VERIFIER_KEY = 'auth_code_verifier';

export const useAuthStore = create<AuthState & AuthActions>()(
    persist(
        (set, get) => ({
            ...initialState,

            login: async () => {
                // Generate PKCE verifier and challenge
                const codeVerifier = generateRandomString(128);
                const codeChallenge = await generateCodeChallenge(codeVerifier);

                // Store verifier in localStorage (needs to persist across redirect)
                // We use localStorage directly to ensure it survives the redirect cycle safely outside of Zustand state if state cleared
                localStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);

                // Redirect to Cognito hosted UI
                const params = new URLSearchParams({
                    client_id: COGNITO_CLIENT_ID,
                    response_type: 'code',
                    scope: 'email openid profile',
                    redirect_uri: COGNITO_REDIRECT_URI,
                    code_challenge: codeChallenge,
                    code_challenge_method: 'S256'
                });

                window.location.href = `https://${COGNITO_DOMAIN}/login?${params.toString()}`;
            },

            logout: () => {
                // Clear local state
                set({ user: null, tokens: null, isAuthenticated: false });
                localStorage.removeItem(CODE_VERIFIER_KEY);

                // Redirect to Cognito logout
                const params = new URLSearchParams({
                    client_id: COGNITO_CLIENT_ID,
                    logout_uri: window.location.origin,
                });

                window.location.href = `https://${COGNITO_DOMAIN}/logout?${params.toString()}`;
            },

            handleCallback: async (code: string) => {
                set({ isLoading: true, error: null });

                try {
                    // Retrieve code verifier
                    const codeVerifier = localStorage.getItem(CODE_VERIFIER_KEY);

                    if (!codeVerifier) {
                        console.warn('PKCE code verifier missing, redirecting to login...');
                        // Clear any stale state
                        set({ user: null, tokens: null, isAuthenticated: false });
                        // Trigger login flow again
                        get().login();
                        return;
                    }

                    // Exchange code for tokens via backend
                    const response = await fetch('/api/v1/auth/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            code,
                            redirect_uri: COGNITO_REDIRECT_URI,
                            code_verifier: codeVerifier
                        }),
                    });

                    // Clean up verifier
                    localStorage.removeItem(CODE_VERIFIER_KEY);

                    if (!response.ok) {
                        throw new Error('Failed to exchange auth code');
                    }

                    const data = await response.json();

                    // Parse the ID token to get user info
                    const idTokenPayload = JSON.parse(atob(data.id_token.split('.')[1]));

                    const user: User = {
                        id: idTokenPayload.sub,
                        email: idTokenPayload.email,
                        name: idTokenPayload.name,
                    };

                    const tokens: AuthTokens = {
                        accessToken: data.access_token,
                        refreshToken: data.refresh_token,
                        idToken: data.id_token,
                        expiresAt: Date.now() + data.expires_in * 1000,
                    };

                    // Configure API client with token getter
                    apiClient.configure({
                        getToken: async () => {
                            const currentTokens = get().tokens;
                            if (!currentTokens) return null;

                            // Refresh if expired
                            if (Date.now() >= currentTokens.expiresAt - 60000) {
                                await get().refreshTokens();
                            }

                            return get().tokens?.accessToken || null;
                        },
                    });

                    set({
                        user,
                        tokens,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Authentication failed',
                        isLoading: false,
                    });
                }
            },

            refreshTokens: async () => {
                const { tokens } = get();
                if (!tokens?.refreshToken) return;

                try {
                    const response = await fetch('/api/v1/auth/refresh', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            refresh_token: tokens.refreshToken,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error('Token refresh failed');
                    }

                    const data = await response.json();

                    set({
                        tokens: {
                            ...tokens,
                            accessToken: data.access_token,
                            idToken: data.id_token,
                            expiresAt: Date.now() + data.expires_in * 1000,
                        },
                    });
                } catch {
                    // If refresh fails, log out
                    set({ user: null, tokens: null, isAuthenticated: false });
                }
            },

            getAccessToken: async () => {
                const { tokens, refreshTokens } = get();
                if (!tokens) return null;

                // Refresh if expired
                if (Date.now() >= tokens.expiresAt - 60000) {
                    await refreshTokens();
                }

                return get().tokens?.accessToken || null;
            },

            isSessionValid: () => {
                const { tokens, isAuthenticated } = get();
                if (!isAuthenticated || !tokens) return false;
                return Date.now() < tokens.expiresAt;
            },

            clearError: () => set({ error: null }),
        }),
        {
            name: 'sensapbl-auth',
            partialize: (state) => ({
                user: state.user,
                tokens: state.tokens,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

// Initialize API client on app load
if (typeof window !== 'undefined') {
    // Clean up any stale verifier on fresh load (login will generate a new one)
    if (!window.location.search.includes('code=')) {
        localStorage.removeItem(CODE_VERIFIER_KEY);
    }

    const tokens = useAuthStore.getState().tokens;
    if (tokens) {
        // Check if tokens are expired - if so, clear auth state
        if (Date.now() >= tokens.expiresAt) {
            console.warn('[Auth] Session expired, clearing auth state');
            useAuthStore.setState({ user: null, tokens: null, isAuthenticated: false });
        } else {
            apiClient.configure({
                getToken: () => useAuthStore.getState().getAccessToken(),
            });
        }
    }
}
