import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { generationRouter } from './routes/generation.js';
import { contentRouter } from './routes/content.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { conceptsRouter } from './routes/concepts.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimiter } from './middleware/rate-limit.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
app.use(rateLimiter);

// Health check (no auth required)
app.use('/health', healthRouter);
app.use('/ready', healthRouter);

// Protected routes
app.use('/api/v1/generation', authMiddleware, generationRouter);
app.use('/api/v1/content', authMiddleware, contentRouter);
app.use('/api/v1/concepts', authMiddleware, conceptsRouter);
app.use('/api/v1/auth', authRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 SensaPBL Backend running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    // Server ready
});

export default app;
