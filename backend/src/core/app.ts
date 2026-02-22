/**
 * Express App Factory
 *
 * Creates and configures the Express application.
 * Exported separately so it can be used by both:
 *  - server.ts  (local dev: starts HTTP listener)
 *  - lambda.ts  (production: wrapped with serverless-http)
 */
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
import { curatorRouter } from '../features/clm/routes/curator.js';
import { authMiddleware } from '../shared/middleware/auth.js';
import { errorHandler } from '../shared/middleware/error-handler.js';
import { rateLimiter } from '../shared/middleware/rate-limit.js';

export function createApp() {
    const app = express();

    // Security middleware
    app.use(helmet());
    app.use(cors({
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
        credentials: true
    }));
    app.use(express.json({ limit: '10mb' }));
    app.use(cookieParser());

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
    app.use('/api/v1/curator', authMiddleware, curatorRouter);

    // Alias: frontend calls POST /generate directly (matches API Gateway route pattern)
    app.post('/api/v1/generate', authMiddleware, (req, res, next) => {
        req.url = '/generate';
        conceptsRouter(req, res, next);
    });

    app.use('/api/v1/auth', authRouter);

    // Error handling
    app.use(errorHandler);

    return app;
}
