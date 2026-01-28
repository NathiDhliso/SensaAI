/**
 * @file auth.ts
 * @description Authentication routes with HttpOnly cookie support.
 * 
 * Security Model:
 * - Access tokens stored in HttpOnly cookies (inaccessible to JavaScript)
 * - Refresh tokens stored in HttpOnly cookies with path restriction
 * - CSRF protection via SameSite cookie attribute
 * - Session validation endpoint for frontend auth state sync
 */

import { Router, Request, Response } from 'express';
import {
    CognitoIdentityProviderClient,
    GlobalSignOutCommand,
    InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

export const authRouter = Router();

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

// ============================================================================
// Cookie Configuration
// ============================================================================

interface CookieOptions {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    path: string;
    maxAge?: number;
    domain?: string;
}

/**
 * Get cookie options based on environment
 */
function getCookieOptions(isAccessToken: boolean = true): CookieOptions {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN; // e.g., '.sensapbl.com'

    const options: CookieOptions = {
        httpOnly: true,
        secure: isProduction, // HTTPS only in production
        sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
        path: isAccessToken ? '/' : '/api/v1/auth', // Refresh token restricted to auth routes
    };

    if (cookieDomain) {
        options.domain = cookieDomain;
    }

    return options;
}

/**
 * Set authentication cookies on response
 */
function setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    expiresIn: number
): void {
    // Access token cookie - accessible by all API routes
    res.cookie('access_token', accessToken, {
        ...getCookieOptions(true),
        maxAge: expiresIn * 1000, // Convert to milliseconds
    });

    // Refresh token cookie - restricted path for security
    res.cookie('refresh_token', refreshToken, {
        ...getCookieOptions(false),
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
}

/**
 * Clear authentication cookies
 */
function clearAuthCookies(res: Response): void {
    res.clearCookie('access_token', getCookieOptions(true));
    res.clearCookie('refresh_token', getCookieOptions(false));
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract user info from ID token
 */
function extractUserFromIdToken(idToken: string): { id: string; email: string; name?: string } {
    try {
        const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
        return {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
        };
    } catch (error) {
        console.error('[Auth] Failed to extract user from ID token:', error);
        throw new Error('Invalid ID token');
    }
}

/**
 * Construct Cognito token endpoint URL
 */
function getTokenEndpoint(): string {
    const domain = process.env.COGNITO_DOMAIN || '';
    const region = process.env.AWS_REGION || 'us-east-1';

    let baseUrl = domain;
    baseUrl = baseUrl.replace(/^https?:\/\//, '');
    baseUrl = baseUrl.replace(/\/$/, '');

    if (!baseUrl.includes('amazoncognito.com')) {
        baseUrl = `${baseUrl}.auth.${region}.amazoncognito.com`;
    }

    return `https://${baseUrl}/oauth2/token`;
}

/**
 * Get headers for Cognito token requests
 */
function getTokenRequestHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded'
    };

    // Handle Confidential Client (Server-side secret)
    if (process.env.COGNITO_CLIENT_SECRET) {
        const secret = process.env.COGNITO_CLIENT_SECRET;
        const clientId = process.env.COGNITO_CLIENT_ID || '';
        const authHeader = Buffer.from(`${clientId}:${secret}`).toString('base64');
        headers['Authorization'] = `Basic ${authHeader}`;
    }

    return headers;
}

// ============================================================================
// Types
// ============================================================================

interface CognitoTokenResponse {
    access_token: string;
    refresh_token: string;
    id_token: string;
    expires_in: number;
    token_type: string;
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /auth/session/exchange
 * Exchange OAuth authorization code for session (sets HttpOnly cookies)
 */
authRouter.post('/session/exchange', async (req: Request, res: Response) => {
    try {
        const { code, redirect_uri, code_verifier } = req.body;

        if (!code || !redirect_uri) {
            res.status(400).json({ error: 'Code and redirect_uri are required' });
            return;
        }

        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', process.env.COGNITO_CLIENT_ID || '');
        params.append('code', code);
        params.append('redirect_uri', redirect_uri);

        if (code_verifier) {
            params.append('code_verifier', code_verifier);
        }

        const tokenEndpoint = getTokenEndpoint();
        console.log('[Auth] Exchanging code at:', tokenEndpoint);

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: getTokenRequestHeaders(),
            body: params
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Auth] Token exchange failed:', response.status, errorText);
            res.status(response.status).json({ error: 'Failed to exchange code' });
            return;
        }

        const data = await response.json() as CognitoTokenResponse;
        const user = extractUserFromIdToken(data.id_token);

        // Set HttpOnly cookies
        setAuthCookies(res, data.access_token, data.refresh_token, data.expires_in);

        // Return only user info (tokens are in cookies)
        res.json({ user });

    } catch (error) {
        console.error('[Auth] Session exchange error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /auth/session/login
 * Direct login with credentials (sets HttpOnly cookies)
 */
authRouter.post('/session/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        // Use Cognito SDK for USER_PASSWORD_AUTH flow
        const command = new InitiateAuthCommand({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: process.env.COGNITO_CLIENT_ID || '',
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password,
            },
        });

        const response = await cognitoClient.send(command);
        const authResult = response.AuthenticationResult;

        if (!authResult?.AccessToken || !authResult?.RefreshToken || !authResult?.IdToken) {
            throw new Error('Incomplete authentication result');
        }

        const user = extractUserFromIdToken(authResult.IdToken);

        // Set HttpOnly cookies
        setAuthCookies(
            res,
            authResult.AccessToken,
            authResult.RefreshToken,
            authResult.ExpiresIn || 3600
        );

        // Return only user info
        res.json({ user });

    } catch (error: unknown) {
        console.error('[Auth] Login error:', error);

        // Map Cognito errors to user-friendly messages
        const errorName = (error as { name?: string })?.name;
        if (errorName === 'NotAuthorizedException') {
            res.status(401).json({ error: 'Invalid email or password' });
        } else if (errorName === 'UserNotConfirmedException') {
            res.status(403).json({ error: 'Please verify your email first' });
        } else if (errorName === 'UserNotFoundException') {
            res.status(401).json({ error: 'Invalid email or password' }); // Don't reveal user existence
        } else {
            res.status(500).json({ error: 'Authentication failed' });
        }
    }
});

/**
 * POST /auth/session/refresh
 * Refresh the session (reads refresh_token from cookie, sets new cookies)
 */
authRouter.post('/session/refresh', async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies?.refresh_token;

        if (!refreshToken) {
            res.status(401).json({ error: 'No refresh token' });
            return;
        }

        // Use Cognito SDK for REFRESH_TOKEN_AUTH flow
        const command = new InitiateAuthCommand({
            AuthFlow: 'REFRESH_TOKEN_AUTH',
            ClientId: process.env.COGNITO_CLIENT_ID || '',
            AuthParameters: {
                REFRESH_TOKEN: refreshToken,
            },
        });

        const response = await cognitoClient.send(command);
        const authResult = response.AuthenticationResult;

        if (!authResult?.AccessToken || !authResult?.IdToken) {
            throw new Error('Incomplete refresh result');
        }

        // Set new access token cookie (refresh token stays the same)
        res.cookie('access_token', authResult.AccessToken, {
            ...getCookieOptions(true),
            maxAge: (authResult.ExpiresIn || 3600) * 1000,
        });

        res.json({ success: true });

    } catch (error: unknown) {
        console.error('[Auth] Refresh error:', error);
        const errorName = (error as { name?: string })?.name;

        if (errorName === 'NotAuthorizedException') {
            clearAuthCookies(res);
            res.status(401).json({ error: 'Session expired' });
        } else {
            res.status(500).json({ error: 'Failed to refresh session' });
        }
    }
});

/**
 * GET /auth/session/validate
 * Validate current session (check if access_token cookie is valid)
 */
authRouter.get('/session/validate', async (req: Request, res: Response) => {
    try {
        const accessToken = req.cookies?.access_token;

        if (!accessToken) {
            res.json({ valid: false });
            return;
        }

        // Development mode bypass - use same hardcoded user as authMiddleware
        if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
            res.json({
                valid: true,
                user: {
                    id: 'dev-user',
                    email: 'dev@sensapbl.com',
                    name: 'Developer',
                }
            });
            return;
        }

        // Decode the token to extract user info (we don't verify signature here,
        // that happens when the token is used for API calls)
        // For a more secure validation, you could call Cognito's GetUser API

        // Validate JWT structure before parsing (must have 3 parts: header.payload.signature)
        const tokenParts = accessToken.split('.');
        if (tokenParts.length !== 3 || !tokenParts[1]) {
            console.warn('[Auth] Invalid JWT structure');
            res.json({ valid: false });
            return;
        }

        try {
            // Attempt to decode the payload
            const base64Payload = tokenParts[1];
            // Handle URL-safe base64 encoding
            const normalizedPayload = base64Payload
                .replace(/-/g, '+')
                .replace(/_/g, '/');

            const decodedPayload = Buffer.from(normalizedPayload, 'base64').toString('utf8');
            const payload = JSON.parse(decodedPayload);

            // Check if token has required fields
            if (!payload || typeof payload !== 'object' || !payload.exp || !payload.sub) {
                console.warn('[Auth] JWT missing required fields');
                res.json({ valid: false });
                return;
            }

            // Check if token is expired
            const exp = payload.exp * 1000; // Convert to milliseconds
            if (Date.now() >= exp) {
                res.json({ valid: false });
                return;
            }

            const user = {
                id: payload.sub,
                email: payload.email || payload.username,
                name: payload.name,
            };

            res.json({ valid: true, user });
        } catch (decodeError) {
            console.warn('[Auth] Failed to decode JWT payload:', decodeError);
            res.json({ valid: false });
        }

    } catch (error) {
        console.error('[Auth] Validation error:', error);
        res.json({ valid: false });
    }
});

/**
 * POST /auth/session/clear
 * Clear session (logout - removes HttpOnly cookies)
 */
authRouter.post('/session/clear', async (req: Request, res: Response) => {
    try {
        const accessToken = req.cookies?.access_token;

        // Try to sign out from Cognito (invalidate all sessions)
        if (accessToken) {
            try {
                const command = new GlobalSignOutCommand({
                    AccessToken: accessToken
                });
                await cognitoClient.send(command);
            } catch (error) {
                // Don't fail if global sign out fails
                console.warn('[Auth] Global sign out failed:', error);
            }
        }

        // Clear cookies
        clearAuthCookies(res);

        res.json({ success: true });

    } catch (error) {
        console.error('[Auth] Clear session error:', error);
        // Still clear cookies even if there was an error
        clearAuthCookies(res);
        res.json({ success: true });
    }
});

// ============================================================================
// Legacy Routes (for backward compatibility during migration)
// ============================================================================

/**
 * @deprecated Use /session/exchange instead
 * POST /auth/token - Exchange auth code for tokens (returns tokens in response)
 */
authRouter.post('/token', async (req: Request, res: Response) => {
    try {
        const { code, redirect_uri, code_verifier } = req.body;

        if (!code || !redirect_uri) {
            res.status(400).json({ error: 'Code and redirect_uri are required' });
            return;
        }

        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', process.env.COGNITO_CLIENT_ID || '');
        params.append('code', code);
        params.append('redirect_uri', redirect_uri);

        if (code_verifier) {
            params.append('code_verifier', code_verifier);
        }

        const response = await fetch(getTokenEndpoint(), {
            method: 'POST',
            headers: getTokenRequestHeaders(),
            body: params
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Auth] Token exchange failed:', response.status, errorText);
            res.status(response.status).json({ error: 'Failed to exchange token', details: errorText });
            return;
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('[Auth] Token exchange error:', error);
        res.status(500).json({ error: 'Internal server error while exchanging token' });
    }
});

/**
 * @deprecated Use /session/refresh instead
 * POST /auth/refresh - Refresh tokens (returns tokens in response)
 */
authRouter.post('/refresh', async (req: Request, res: Response) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            res.status(400).json({ error: 'Refresh token is required' });
            return;
        }

        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('client_id', process.env.COGNITO_CLIENT_ID || '');
        params.append('refresh_token', refresh_token);

        const response = await fetch(getTokenEndpoint(), {
            method: 'POST',
            headers: getTokenRequestHeaders(),
            body: params
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Auth] Token refresh failed:', errorText);
            res.status(response.status).json({ error: 'Failed to refresh token', details: errorText });
            return;
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('[Auth] Token refresh error:', error);
        res.status(500).json({ error: 'Internal server error while refreshing token' });
    }
});

/**
 * @deprecated Use /session/clear instead  
 * POST /auth/logout - Logout (sign out from Cognito)
 */
authRouter.post('/logout', async (req: Request, res: Response) => {
    try {
        const { access_token } = req.body;

        if (access_token) {
            const command = new GlobalSignOutCommand({
                AccessToken: access_token
            });
            await cognitoClient.send(command);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[Auth] Logout error:', error);
        res.json({ success: true });
    }
});
