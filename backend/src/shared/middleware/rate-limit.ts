import { Request, Response, NextFunction } from 'express';
interface RateLimitEntry {
 count: number;
 resetTime: number;
}
const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 300; // 300 requests per minute (5 req/sec avg)
export function rateLimiter(
 req: Request,
 res: Response,
 next: NextFunction
): void {
 // Use IP or user ID for rate limiting
 const identifier = req.ip || 'unknown';
 const now = Date.now();
 let entry = rateLimitStore.get(identifier);
 if (!entry || now > entry.resetTime) {
 entry = {
 count: 1,
 resetTime: now + RATE_LIMIT_WINDOW_MS
 };
 rateLimitStore.set(identifier, entry);
 } else {
 entry.count++;
 }
 // Set rate limit headers
 res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
 res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count));
 res.setHeader('X-RateLimit-Reset', entry.resetTime);
 if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
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