"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = rateLimiter;
var rateLimitStore = new Map();
var RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
var RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute
function rateLimiter(req, res, next) {
    // Use IP or user ID for rate limiting
    var identifier = req.ip || 'unknown';
    var now = Date.now();
    var entry = rateLimitStore.get(identifier);
    if (!entry || now > entry.resetTime) {
        entry = {
            count: 1,
            resetTime: now + RATE_LIMIT_WINDOW_MS,
        };
        rateLimitStore.set(identifier, entry);
    }
    else {
        entry.count++;
    }
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count));
    res.setHeader('X-RateLimit-Reset', entry.resetTime);
    if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
        res.status(429).json({
            error: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        });
        return;
    }
    next();
}
// Cleanup old entries periodically
setInterval(function () {
    var now = Date.now();
    for (var _i = 0, _a = rateLimitStore.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], entry = _b[1];
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Every minute
