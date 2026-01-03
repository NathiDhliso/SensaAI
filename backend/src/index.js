"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var cors_1 = require("cors");
var helmet_1 = require("helmet");
var generation_js_1 = require("./routes/generation.js");
var content_js_1 = require("./routes/content.js");
var health_js_1 = require("./routes/health.js");
var auth_js_1 = require("./middleware/auth.js");
var error_handler_js_1 = require("./middleware/error-handler.js");
var rate_limit_js_1 = require("./middleware/rate-limit.js");
var app = (0, express_1.default)();
var PORT = process.env.PORT || 3000;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: ((_a = process.env.CORS_ORIGINS) === null || _a === void 0 ? void 0 : _a.split(',')) || ['http://localhost:5173'],
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
// Rate limiting
app.use(rate_limit_js_1.rateLimiter);
// Health check (no auth required)
app.use('/health', health_js_1.healthRouter);
app.use('/ready', health_js_1.healthRouter);
// Protected routes
app.use('/api/v1/generation', auth_js_1.authMiddleware, generation_js_1.generationRouter);
app.use('/api/v1/content', auth_js_1.authMiddleware, content_js_1.contentRouter);
// Error handling
app.use(error_handler_js_1.errorHandler);
// Start server
app.listen(PORT, function () {
    console.log("\uD83D\uDE80 SensaPBL Backend running on port ".concat(PORT));
    console.log("\uD83D\uDCCA Health check: http://localhost:".concat(PORT, "/health"));
});
exports.default = app;
