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
    loginWithCredentials: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string) => Promise<void>;
    confirmSignUp: (email: string, code: string) => Promise<void>;
    resendConfirmationCode: (email: string) => Promise<void>;
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

// Initialize Cognito Client
// note: region is inferred from config or defaults to us-east-1 if needed, 
// strictly we should get it from env but often it's not strictly required for just public client operations if endpoint is inferred, 
// but for SDK V3 it's best to pass it.
const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1';

export const useAuthStore = create<AuthState & AuthActions>()(
    persist(
        (set, get) => ({
            ...initialState,

            login: async () => {
                // ... (keep existing hosted UI logic as fallback) ...
                // Generate PKCE verifier and challenge
                const codeVerifier = generateRandomString(128);
                const codeChallenge = await generateCodeChallenge(codeVerifier);

                localStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);

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

            loginWithCredentials: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const { CognitoIdentityProviderClient, InitiateAuthCommand } = await import('@aws-sdk/client-cognito-identity-provider');

                    const client = new CognitoIdentityProviderClient({ region: AWS_REGION });

                    const command = new InitiateAuthCommand({
                        AuthFlow: 'USER_PASSWORD_AUTH',
                        ClientId: COGNITO_CLIENT_ID,
                        AuthParameters: {
                            USERNAME: email,
                            PASSWORD: password,
                        },
                    });

                    const response = await client.send(command);
                    const authResult = response.AuthenticationResult;

                    if (!authResult || !authResult.AccessToken || !authResult.IdToken) {
                        throw new Error('Authentication failed - No tokens received');
                    }

                    // Parse ID Token
                    const idTokenPayload = JSON.parse(atob(authResult.IdToken.split('.')[1]));

                    const user: User = {
                        id: idTokenPayload.sub,
                        email: idTokenPayload.email,
                        name: idTokenPayload.name || idTokenPayload.email?.split('@')[0],
                    };

                    const tokens: AuthTokens = {
                        accessToken: authResult.AccessToken,
                        refreshToken: authResult.RefreshToken || get().tokens?.refreshToken || '', // Keep old refresh token if not returned
                        idToken: authResult.IdToken,
                        expiresAt: Date.now() + (authResult.ExpiresIn || 3600) * 1000,
                    };

                    // Configure API Client
                    apiClient.configure({
                        getToken: async () => {
                            const currentTokens = get().tokens;
                            if (!currentTokens) return null;
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
                        error: null // clear explicit error
                    });

                    return Promise.resolve();
                } catch (error) {
                    console.error('Login error:', error);
                    let errorMessage = 'Authentication failed';
                    if (error instanceof Error) {
                        // Clean up AWS error messages typically like "NotAuthorizedException: Incorrect username or password."
                        errorMessage = error.message.replace(/^[a-zA-Z]+: /, '');
                    }
                    set({
                        error: errorMessage,
                        isLoading: false,
                    });
                    return Promise.reject(error);
                }
            },

            signUp: async (email, password, name) => {
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
                            { Name: 'name', Value: name },
                        ],
                    });

                    await client.send(command);
                    set({ isLoading: false, error: null });
                } catch (error) {
                    console.error('Sign up error:', error);
                    let errorMessage = 'Sign up failed';
                    if (error instanceof Error) {
                        errorMessage = error.message.replace(/^[a-zA-Z]+: /, '');
                    }
                    set({ error: errorMessage, isLoading: false });
                    throw error;
                }
            },

            confirmSignUp: async (email, code) => {
                set({ isLoading: true, error: null });
                try {
                    const { CognitoIdentityProviderClient, ConfirmSignUpCommand } = await import('@aws-sdk/client-cognito-identity-provider');
                    const client = new CognitoIdentityProviderClient({ region: AWS_REGION });

                    const command = new ConfirmSignUpCommand({
                        ClientId: COGNITO_CLIENT_ID,
                        Username: email,
                        ConfirmationCode: code,
                    });

                    await client.send(command);
                    set({ isLoading: false, error: null });
                } catch (error) {
                    console.error('Confirm sign up error:', error);
                    let errorMessage = 'Verification failed';
                    if (error instanceof Error) {
                        errorMessage = error.message.replace(/^[a-zA-Z]+: /, '');
                    }
                    set({ error: errorMessage, isLoading: false });
                    throw error;
                }
            },

            resendConfirmationCode: async (email) => {
                try {
                    const { CognitoIdentityProviderClient, ResendConfirmationCodeCommand } = await import('@aws-sdk/client-cognito-identity-provider');
                    const client = new CognitoIdentityProviderClient({ region: AWS_REGION });

                    const command = new ResendConfirmationCodeCommand({
                        ClientId: COGNITO_CLIENT_ID,
                        Username: email,
                    });

                    await client.send(command);
                } catch (error) {
                    console.error('Resend code error:', error);
                    let errorMessage = 'Failed to resend code';
                    if (error instanceof Error) {
                        errorMessage = error.message.replace(/^[a-zA-Z]+: /, '');
                    }
                    set({ error: errorMessage });
                    throw error;
                }
            },

            logout: () => {
                set({ user: null, tokens: null, isAuthenticated: false });
                localStorage.removeItem(CODE_VERIFIER_KEY);

                // For direct auth, we just clear local state and redirect to login
                window.location.reload();
            },

            handleCallback: async (code: string) => {
                set({ isLoading: true, error: null });

                try {
                    const codeVerifier = localStorage.getItem(CODE_VERIFIER_KEY);

                    if (!codeVerifier) {
                        console.warn('PKCE code verifier missing, redirecting to login...');
                        set({ user: null, tokens: null, isAuthenticated: false });
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

                    localStorage.removeItem(CODE_VERIFIER_KEY);

                    if (!response.ok) {
                        throw new Error('Failed to exchange auth code');
                    }

                    const data = await response.json();
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

                    apiClient.configure({
                        getToken: async () => {
                            const currentTokens = get().tokens;
                            if (!currentTokens) return null;
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

                // Try to refresh via backend first (legacy flow support)
                try {
                    const response = await fetch('/api/v1/auth/refresh', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            refresh_token: tokens.refreshToken,
                        }),
                    });

                    // If backend endpoint works, use it
                    if (response.ok) {
                        const data = await response.json();
                        set({
                            tokens: {
                                ...tokens,
                                accessToken: data.access_token,
                                idToken: data.id_token,
                                expiresAt: Date.now() + data.expires_in * 1000,
                            },
                        });
                        return;
                    }
                } catch (e) {
                    // Fallback to SDK refresh if implemented (omitted for brevity standard backend preferred for refresh token security)
                    console.warn('Backend refresh failed, trying SDK...');
                }

                // SDK Refresh Implementation (InitiateAuth with REFRESH_TOKEN_AUTH)
                try {
                    const { CognitoIdentityProviderClient, InitiateAuthCommand } = await import('@aws-sdk/client-cognito-identity-provider');
                    const client = new CognitoIdentityProviderClient({ region: AWS_REGION });

                    const command = new InitiateAuthCommand({
                        AuthFlow: 'REFRESH_TOKEN_AUTH',
                        ClientId: COGNITO_CLIENT_ID,
                        AuthParameters: {
                            REFRESH_TOKEN: tokens.refreshToken,
                        },
                    });

                    const response = await client.send(command);
                    const authResult = response.AuthenticationResult;

                    if (authResult) {
                        set({
                            tokens: {
                                ...tokens,
                                accessToken: authResult.AccessToken || tokens.accessToken,
                                idToken: authResult.IdToken || tokens.idToken,
                                expiresAt: Date.now() + (authResult.ExpiresIn || 3600) * 1000,
                            },
                        });
                    } else {
                        throw new Error('No refresh result');
                    }

                } catch (err) {
                    // If refresh fails, log out
                    set({ user: null, tokens: null, isAuthenticated: false });
                }
            },

            getAccessToken: async () => {
                const { tokens, refreshTokens } = get();
                if (!tokens) return null;
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
            onRehydrateStorage: () => (state) => {
                if (state && state.tokens) {
                    // Check if tokens are expired immediately upon hydration
                    if (Date.now() >= state.tokens.expiresAt) {
                        console.warn('[Auth] Session expired on load, attempting refresh...');
                        // We can try to refresh, but we need to be careful about async in this callback
                        // Best to just set the token getter, and let the getter handle refresh logic if possible, 
                        // or trigger the refresh action safely.
                        // However, the existing logic at the bottom of the file tried to refresh.
                        // Let's just configure the client, and trigger a refresh check.
                        setTimeout(() => {
                            useAuthStore.getState().refreshTokens().catch(() => {
                                console.warn('[Auth] Refresh failed, clearing auth state');
                                useAuthStore.setState({ user: null, tokens: null, isAuthenticated: false });
                            });
                        }, 0);
                    }

                    apiClient.configure({
                        getToken: async () => {
                            const store = useAuthStore.getState();
                            const currentTokens = store.tokens;
                            if (!currentTokens) return null;

                            // Check expiration with buffer
                            if (Date.now() >= currentTokens.expiresAt - 60000) {
                                await store.refreshTokens();
                            }
                            return useAuthStore.getState().tokens?.accessToken || null;
                        },
                    });
                }
            }
        }
    )
);

// We remove the module-level initialization because onRehydrateStorage handles it more reliably.
// The previous code block (lines 359-381) is removed.
