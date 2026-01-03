import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const contentRouter = Router();

interface AuthenticatedRequest extends Request {
    user?: { sub: string; email: string };
}

// In-memory store (replace with database in production)
const contentStore = new Map<string, object>();

// Get all saved content for user
contentRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.sub;

        // Filter content by user
        const userContent = Array.from(contentStore.entries())
            .filter(([_, content]: [string, { userId?: string }]) => content.userId === userId)
            .map(([id, content]) => ({ id, ...content as object }));

        res.json({ content: userContent });
    } catch (error) {
        console.error('List content error:', error);
        res.status(500).json({ error: 'Failed to list content' });
    }
});

// Get single content item
contentRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const content = contentStore.get(id);

        if (!content) {
            res.status(404).json({ error: 'Content not found' });
            return;
        }

        res.json(content);
    } catch (error) {
        console.error('Get content error:', error);
        res.status(500).json({ error: 'Failed to get content' });
    }
});

// Save content
contentRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.sub;
        const { subject, content, domain, validation } = req.body;

        const id = uuidv4();
        const savedContent = {
            id,
            userId,
            subject,
            content,
            domain,
            validation,
            savedAt: new Date().toISOString(),
        };

        contentStore.set(id, savedContent);

        res.status(201).json({ id, message: 'Content saved successfully' });
    } catch (error) {
        console.error('Save content error:', error);
        res.status(500).json({ error: 'Failed to save content' });
    }
});

// Delete content
contentRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.sub;

        const content = contentStore.get(id) as { userId?: string } | undefined;

        if (!content) {
            res.status(404).json({ error: 'Content not found' });
            return;
        }

        if (content.userId !== userId) {
            res.status(403).json({ error: 'Not authorized to delete this content' });
            return;
        }

        contentStore.delete(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete content error:', error);
        res.status(500).json({ error: 'Failed to delete content' });
    }
});
