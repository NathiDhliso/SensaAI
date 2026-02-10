import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { contentRouter } from '../features/content/routes/content.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from '../features/auth/routes/auth.js';
import { conceptsRouter } from '../features/concepts/routes/concepts.js';
import { proxyRouter } from '../features/proxy/routes/proxy.js';
import { gymAiRouter } from '../features/gym/routes/gym-ai.js';
import { authMiddleware } from '../shared/middleware/auth.js';
import { errorHandler } from '../shared/middleware/error-handler.js';
import { rateLimiter } from '../shared/middleware/rate-limit.js';
const app = express();
const PORT = process.env.PORT || 3000;
console.log('Environment Debug:');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('COGNITO_USER_POOL_ID:', process.env.COGNITO_USER_POOL_ID ? 'SET' : 'NOT SET');
console.log('CONCEPTS_TABLE:', process.env.CONCEPTS_TABLE);
console.log('CWD:', process.cwd());
// Security middleware
app.use(helmet());
app.use(cors({
 origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
 credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser()); // Parse cookies for HttpOnly token storage
// Rate limiting
app.use(rateLimiter);
// Health check (no auth required)
app.use('/health', healthRouter);
app.use('/ready', healthRouter);
// Proxy routes (no auth required for public resources)
app.use('/api/v1/proxy', proxyRouter);
// Protected routes
app.use('/api/v1/content', authMiddleware, contentRouter);
app.use('/api/v1/concepts', authMiddleware, conceptsRouter);
app.use('/api/v1/gym-ai', authMiddleware, gymAiRouter);

// Alias: frontend calls POST /generate directly (matches API Gateway route pattern)
app.post('/api/v1/generate', authMiddleware, (req, res, next) => {
 // Forward to concepts router's /generate handler
 req.url = '/generate';
 conceptsRouter(req, res, next);
});
app.use('/api/v1/auth', authRouter);
// Error handling
app.use(errorHandler);
// Start server
app.listen(PORT, () => {
 console.log(` SensaAI Backend running on port ${PORT}`);
 console.log(` Health check: http://localhost:${PORT}/health`);
 // Server ready
});
export default app;
