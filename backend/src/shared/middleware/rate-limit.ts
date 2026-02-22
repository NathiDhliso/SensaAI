import { Request, Response, NextFunction } from 'express';
interface RateLimitEntry {
 count: number;
 resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_MAP_SIZE = 50_000; // Prevent unbounded memory growth under DDoS
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 300; // 300 requests per minute (5 req/sec avg)

// Stricter limits for sensitive endpoints
const AUTH_RATE_LIMIT_MAX = 20; // 20 requests per minute for auth endpoints
const AUTH_PATHS = ['/api/v1/auth/login', '/api/v1/auth/exchange', '/api/v1/auth/session/login', '/api/v1/auth/session/exchange', '/api/v1/auth/refresh', '/api/v1/auth/session/refresh'];

export function rateLimiter(
 req: Request,
 res: Response,
 next: NextFunction
): void {
 // Use IP or user ID for rate limiting
 const identifier = req.ip || 'unknown';
 const now = Date.now();

 // Determine limit based on path
 const isAuthPath = AUTH_PATHS.some(p => req.path.startsWith(p) || req.originalUrl.startsWith(p));
 const maxRequests = isAuthPath ? AUTH_RATE_LIMIT_MAX : RATE_LIMIT_MAX_REQUESTS;
 const bucketKey = isAuthPath ? `auth:${identifier}` : identifier;

 let entry = rateLimitStore.get(bucketKey);
 if (!entry || now > entry.resetTime) {
 // Cap map size to prevent memory exhaustion
 if (rateLimitStore.size >= MAX_MAP_SIZE) {
 // Evict expired entries first
 for (const [key, val] of rateLimitStore) {
 if (now > val.resetTime) rateLimitStore.delete(key);
 }
 // If still too large, reject
 if (rateLimitStore.size >= MAX_MAP_SIZE) {
 res.status(429).json({ error: 'Too many requests. Please try again later.', retryAfter: 60 });
 return;
 }
 }
 entry = {
 count: 1,
 resetTime: now + RATE_LIMIT_WINDOW_MS
 };
 rateLimitStore.set(bucketKey, entry);
 } else {
 entry.count++;
 }
 // Set rate limit headers
 res.setHeader('X-RateLimit-Limit', maxRequests);
 res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
 res.setHeader('X-RateLimit-Reset', entry.resetTime);
 if (entry.count > maxRequests) {
 res.status(429).json({
 error: 'Too many requests. Please try again later.',
 retryAfter: Math.ceil((entry.resetTime - now) / 1000)
 });
 return;
 }
 next();
}
// Cleanup old entries periodically
setInterval(() => {
 const now = Date.now();
 for (const [key, entry] of rateLimitStore.entries()) {
 if (now > entry.resetTime) {
 rateLimitStore.delete(key);
 }
 }
}, 60000); // Every minute
