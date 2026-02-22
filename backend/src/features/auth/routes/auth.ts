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
  GetUserCommand,
  GlobalSignOutCommand,
  InitiateAuthCommand,
  UpdateUserAttributesCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { logger } from '../../../shared/utils/logger.js';
import { validate, SessionExchangeSchema } from '../../../shared/validation/schemas.js';
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

function mapCognitoAttributes(
  attributes: Array<{ Name?: string; Value?: string }> = []
): {
  id: string;
  email: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  phoneNumber?: string;
  preferredUsername?: string;
  role?: 'learner' | 'curator' | 'admin';
} {
  const attributeMap = attributes.reduce<Record<string, string>>((acc, item) => {
    if (item.Name && typeof item.Value === 'string') {
      acc[item.Name] = item.Value;
    }
    return acc;
  }, {});

  // Map role from custom attribute
  const roleValue = attributeMap['custom:role'] || 'learner';
  const role = (['learner', 'curator', 'admin'].includes(roleValue) ? roleValue : 'learner') as 'learner' | 'curator' | 'admin';

  return {
    id: attributeMap.sub || '',
    email: attributeMap.email || '',
    name: attributeMap.name,
    givenName: attributeMap.given_name,
    familyName: attributeMap.family_name,
    phoneNumber: attributeMap.phone_number,
    preferredUsername: attributeMap.preferred_username,
    role
  };
}

function getAccessTokenFromRequest(req: Request): string | null {
  return req.cookies?.access_token
    || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
}
/**
 * Get cookie options based on environment
 */
function getCookieOptions(isAccessToken: boolean = true): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = process.env.COOKIE_DOMAIN; // e.g., '.sensaai.com'
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
function extractUserFromIdToken(idToken: string): {
  id: string;
  email: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  phoneNumber?: string;
  preferredUsername?: string;
  role?: 'learner' | 'curator' | 'admin';
} {
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());

    // Extract role from custom attribute
    const roleValue = payload['custom:role'] || 'learner';
    const role = (['learner', 'curator', 'admin'].includes(roleValue) ? roleValue : 'learner') as 'learner' | 'curator' | 'admin';

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      givenName: payload.given_name,
      familyName: payload.family_name,
      phoneNumber: payload.phone_number,
      preferredUsername: payload.preferred_username,
      role
    };
  } catch (error) {
    logger.error('[Auth] Failed to extract user from ID token:', error);
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
authRouter.post('/session/exchange', validate(SessionExchangeSchema), async (req: Request, res: Response) => {
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
    logger.debug('[Auth] Exchanging code at:', tokenEndpoint);
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: getTokenRequestHeaders(),
      body: params
    });
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[Auth] Token exchange failed:', response.status, errorText);
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
    logger.error('[Auth] Session exchange error:', error);
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
    // Development mode bypass - use same hardcoded user as authMiddleware
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      const user = {
        id: 'dev-user',
        email: 'dev@sensaai.com',
        name: 'Developer',
        role: 'admin'
      };
      // Set dummy cookies for consistency
      setAuthCookies(
        res,
        'dev-access-token',
        'dev-refresh-token',
        3600
      );
      res.json({ user });
      return;
    }
    // Use Cognito SDK for USER_PASSWORD_AUTH flow
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID || '',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
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
    logger.error('[Auth] Login error:', error);
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
        REFRESH_TOKEN: refreshToken
      }
    });
    const response = await cognitoClient.send(command);
    const authResult = response.AuthenticationResult;
    if (!authResult?.AccessToken || !authResult?.IdToken) {
      throw new Error('Incomplete refresh result');
    }
    // Set new access token cookie (refresh token stays the same)
    res.cookie('access_token', authResult.AccessToken, {
      ...getCookieOptions(true),
      maxAge: (authResult.ExpiresIn || 3600) * 1000
    });
    res.json({ success: true });
  } catch (error: unknown) {
    logger.error('[Auth] Refresh error:', error);
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
          email: 'dev@sensaai.com',
          name: 'Developer'
        }
      });
      return;
    }
    // Verify the token by calling Cognito GetUser (validates signature server-side)
    try {
      const response = await cognitoClient.send(new GetUserCommand({ AccessToken: accessToken }));
      const user = mapCognitoAttributes(response.UserAttributes);
      res.json({ valid: true, user });
    } catch {
      res.json({ valid: false });
    }
  } catch (error) {
    logger.error('[Auth] Validation error:', error);
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
    if (accessToken) {
      try {
        const command = new GlobalSignOutCommand({
          AccessToken: accessToken
        });
        await cognitoClient.send(command);
      } catch (error) {
        logger.warn('[Auth] Global sign out failed:', error);
      }
    }
    clearAuthCookies(res);
    res.json({ success: true });
  } catch (error) {
    logger.error('[Auth] Clear session error:', error);
    clearAuthCookies(res);
    res.json({ success: true });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      const user = { id: 'dev-user', email: 'dev@sensaai.com', name: 'Developer', role: 'admin' };
      const tokens = {
        access_token: 'dev-access-token',
        id_token: 'dev-id-token',
        refresh_token: 'dev-refresh-token',
        expires_in: 3600
      };
      setAuthCookies(res, tokens.access_token, tokens.refresh_token, tokens.expires_in);
      res.json({ user });
      return;
    }
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID || '',
      AuthParameters: { USERNAME: email, PASSWORD: password }
    });
    const response = await cognitoClient.send(command);
    const authResult = response.AuthenticationResult;
    if (!authResult?.AccessToken || !authResult?.RefreshToken || !authResult?.IdToken) {
      throw new Error('Incomplete authentication result');
    }
    const user = extractUserFromIdToken(authResult.IdToken);
    const tokens = {
      access_token: authResult.AccessToken,
      id_token: authResult.IdToken,
      refresh_token: authResult.RefreshToken,
      expires_in: authResult.ExpiresIn || 3600
    };
    setAuthCookies(res, tokens.access_token, tokens.refresh_token, tokens.expires_in);
    res.json({ user });
  } catch (error: unknown) {
    logger.error('[Auth] Login error:', error);
    const errorName = (error as { name?: string })?.name;
    if (errorName === 'NotAuthorizedException') {
      res.status(401).json({ error: 'Invalid email or password' });
    } else if (errorName === 'UserNotConfirmedException') {
      res.status(403).json({ error: 'Please verify your email first' });
    } else if (errorName === 'UserNotFoundException') {
      res.status(401).json({ error: 'Invalid email or password' });
    } else {
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
});

authRouter.post('/exchange', async (req: Request, res: Response) => {
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
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: getTokenRequestHeaders(),
      body: params
    });
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[Auth] Token exchange failed:', response.status, errorText);
      res.status(response.status).json({ error: 'Failed to exchange code' });
      return;
    }
    const data = await response.json() as CognitoTokenResponse;
    const user = extractUserFromIdToken(data.id_token);
    const tokens = {
      access_token: data.access_token,
      id_token: data.id_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in
    };
    setAuthCookies(res, tokens.access_token, tokens.refresh_token, tokens.expires_in);
    // Return only user info (tokens are in HttpOnly cookies)
    res.json({ user });
  } catch (error) {
    logger.error('[Auth] Exchange error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body?.refresh_token;
    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token' });
      return;
    }
    const command = new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID || '',
      AuthParameters: { REFRESH_TOKEN: refreshToken }
    });
    const response = await cognitoClient.send(command);
    const authResult = response.AuthenticationResult;
    if (!authResult?.AccessToken || !authResult?.IdToken) {
      throw new Error('Incomplete refresh result');
    }
    res.cookie('access_token', authResult.AccessToken, {
      ...getCookieOptions(true),
      maxAge: (authResult.ExpiresIn || 3600) * 1000
    });
    res.json({
      access_token: authResult.AccessToken,
      id_token: authResult.IdToken,
      expires_in: authResult.ExpiresIn || 3600
    });
  } catch (error: unknown) {
    logger.error('[Auth] Refresh error:', error);
    const errorName = (error as { name?: string })?.name;
    if (errorName === 'NotAuthorizedException') {
      clearAuthCookies(res);
      res.status(401).json({ error: 'Session expired' });
    } else {
      res.status(500).json({ error: 'Failed to refresh session' });
    }
  }
});

authRouter.get('/validate', async (req: Request, res: Response) => {
  try {
    const accessToken = req.cookies?.access_token
      || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
    if (!accessToken) {
      res.json({ valid: false });
      return;
    }
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      res.json({
        valid: true,
        user: { id: 'dev-user', email: 'dev@sensaai.com', name: 'Developer', role: 'admin' }
      });
      return;
    }
    // Verify the token by calling Cognito GetUser (validates signature server-side)
    try {
      const response = await cognitoClient.send(new GetUserCommand({ AccessToken: accessToken }));
      const user = mapCognitoAttributes(response.UserAttributes);
      res.json({ valid: true, user });
    } catch {
      res.json({ valid: false });
    }
  } catch (error) {
    logger.error('[Auth] Validation error:', error);
    res.json({ valid: false });
  }
});

authRouter.get('/profile', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessTokenFromRequest(req);
    if (!accessToken) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      res.json({
        user: {
          id: 'dev-user',
          email: 'dev@sensaai.com',
          name: 'Developer',
          givenName: 'Dev',
          familyName: 'User',
          phoneNumber: '',
          preferredUsername: 'Developer',
          role: 'admin'
        }
      });
      return;
    }

    const response = await cognitoClient.send(new GetUserCommand({ AccessToken: accessToken }));
    const user = mapCognitoAttributes(response.UserAttributes);

    if (!user.id || !user.email) {
      res.status(500).json({ error: 'Invalid profile data' });
      return;
    }

    res.json({ user });
  } catch (error) {
    logger.error('[Auth] Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

authRouter.put('/profile', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessTokenFromRequest(req);
    if (!accessToken) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      name,
      givenName,
      familyName,
      phoneNumber,
      preferredUsername
    } = req.body ?? {};

    const updates: Array<{ Name: string; Value: string }> = [];

    if (typeof name === 'string') updates.push({ Name: 'name', Value: name.trim() });
    if (typeof givenName === 'string') updates.push({ Name: 'given_name', Value: givenName.trim() });
    if (typeof familyName === 'string') updates.push({ Name: 'family_name', Value: familyName.trim() });
    if (typeof preferredUsername === 'string') updates.push({ Name: 'preferred_username', Value: preferredUsername.trim() });
    if (typeof phoneNumber === 'string') updates.push({ Name: 'phone_number', Value: phoneNumber.trim() });

    if (updates.length > 0) {
      await cognitoClient.send(new UpdateUserAttributesCommand({
        AccessToken: accessToken,
        UserAttributes: updates
      }));
    }

    const profileResponse = await cognitoClient.send(new GetUserCommand({ AccessToken: accessToken }));
    const user = mapCognitoAttributes(profileResponse.UserAttributes);

    if (!user.id || !user.email) {
      res.status(500).json({ error: 'Invalid profile data' });
      return;
    }

    res.json({ user });
  } catch (error) {
    logger.error('[Auth] Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

authRouter.post('/logout', async (req: Request, res: Response) => {
  try {
    const accessToken = getAccessTokenFromRequest(req);
    if (accessToken) {
      try {
        await cognitoClient.send(new GlobalSignOutCommand({ AccessToken: accessToken }));
      } catch (error) {
        logger.warn('[Auth] Global sign out failed:', error);
      }
    }
    clearAuthCookies(res);
    res.json({ success: true });
  } catch (error) {
    logger.error('[Auth] Logout error:', error);
    clearAuthCookies(res);
    res.json({ success: true });
  }
});

