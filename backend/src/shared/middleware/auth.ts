import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
const COGNITO_REGION = process.env.AWS_REGION || 'us-east-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
// JWKS client for Cognito token verification
const jwksClient = jwksRsa({
    jwksUri: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600000, // 10 minutes
});
interface AuthenticatedRequest extends Request {
    user?: {
        sub: string;
        email: string;
        name?: string;
        role?: string;
    };
}
function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
    jwksClient.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err);
            return;
        }
        const signingKey = key?.getPublicKey();
        callback(null, signingKey);
    });
}
/**
 * Extract token from request - supports both HttpOnly cookies and Authorization header
 * Cookie-based auth is preferred for security (XSS protection)
 */
function extractToken(req: Request): string | null {
    // First, try to get token from HttpOnly cookie
    const cookieToken = req.cookies?.access_token;
    if (cookieToken) {
        return cookieToken;
    }
    // Fallback to Authorization header for backward compatibility
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }
    return null;
}
export async function authMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    // Skip auth entirely in development mode
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
        req.user = {
            sub: 'dev-user',
            email: 'dev@sensaai.com',
            name: 'Developer',
            role: 'admin'
        };
        next();
        return;
    }
    const token = extractToken(req);
    if (!token) {
        res.status(401).json({ error: 'No authorization token provided' });
        return;
    }
    if (!COGNITO_USER_POOL_ID) {
        logger.error('CRITICAL: COGNITO_USER_POOL_ID is missing in env');
        res.status(500).json({ error: 'Cognito not configured' });
        return;
    }
    jwt.verify(
        token,
        getKey,
        {
            algorithms: ['RS256'],
            issuer: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`,
        },
        (err, decoded) => {
            if (err) {
                res.status(401).json({ error: 'Invalid or expired token' });
                return;
            }
            const payload = decoded as jwt.JwtPayload;

            // Reject tokens without a subject — prevents forged tokens
            if (!payload.sub) {
                res.status(401).json({ error: 'Invalid token: missing subject' });
                return;
            }

            // Validate token_use claim — only accept access tokens
            const tokenUse = payload.token_use;
            if (tokenUse && tokenUse !== 'access') {
                res.status(401).json({ error: 'Invalid token type' });
                return;
            }

            req.user = {
                sub: payload.sub,
                email: payload.email || '',
                name: payload.name,
                role: payload['custom:role'] || payload['cognito:groups']?.[0]
            };
            next();
        }
    );
}
