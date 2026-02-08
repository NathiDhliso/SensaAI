import { Router, Request, Response } from 'express';
import { bedrockService } from '../services/bedrock.js';

export const generationRouter = Router();

interface AuthenticatedRequest extends Request {
    user?: { sub: string; email: string };
}

// Start a new generation
generationRouter.post('/start', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { subject, context, domain } = req.body;
        const userId = req.user?.sub;

        if (!subject) {
            res.status(400).json({ error: 'Subject is required' });
            return;
        }

        // Start generation (always uses multi-phase system)
        // Use 'context' if provided, fallback to 'domain' for backwards compatibility
        const jobId = await bedrockService.startGeneration({
            userId: userId || 'anonymous',
            subject,
            context: context || domain,
        });

        res.json({ jobId, status: 'queued', multiPhase: true });
    } catch (error) {
        console.error('Generation start error:', error);
        res.status(500).json({ error: 'Failed to start generation' });
    }
});

// Stream generation progress
generationRouter.get('/stream/:jobId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { jobId } = req.params;

        // Set up SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Stream content from Bedrock
        const generator = bedrockService.streamGeneration(jobId);
        for await (const chunk of generator) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            if (chunk.done) break;
        }

        res.end();
    } catch (error) {
        console.error('Stream error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
        res.end();
    }
});

// Get generation status
generationRouter.get('/:jobId/status', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { jobId } = req.params;
        const status = await bedrockService.getStatus(jobId);

        if (!status) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        res.json(status);
    } catch (error) {
        console.error('Status error:', error);
        res.status(500).json({ error: 'Failed to get status' });
    }
});

// Cancel generation
generationRouter.post('/:jobId/cancel', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { jobId } = req.params;
        await bedrockService.cancelGeneration(jobId);
        res.json({ success: true });
    } catch (error) {
        console.error('Cancel error:', error);
        res.status(500).json({ error: 'Failed to cancel generation' });
    }
});
