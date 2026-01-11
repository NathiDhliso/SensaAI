import { Router, Request, Response } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutItemCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

export const conceptsRouter = Router();

interface AuthenticatedRequest extends Request {
    user?: { sub: string; email: string };
}

// DynamoDB client
const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'af-south-1',
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Lambda client for invoking generation function
const lambdaClient = new LambdaClient({
    region: process.env.AWS_REGION || 'af-south-1',
});

// Table names from environment
const CONCEPTS_TABLE = process.env.CONCEPTS_TABLE || 'sensapbl-concepts-dev';
const JOBS_TABLE = process.env.JOBS_TABLE || 'sensapbl-jobs-dev';
const GENERATE_FUNCTION = process.env.GENERATE_LAMBDA || 'sensapbl-generate-concepts-dev';

// Helper to create pagination cursor
function createCursor(lastKey: Record<string, unknown> | undefined): string | null {
    if (!lastKey) return null;
    return Buffer.from(JSON.stringify(lastKey)).toString('base64');
}

function parseCursor(cursor?: string): Record<string, unknown> | undefined {
    if (!cursor) return undefined;
    try {
        return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    } catch {
        return undefined;
    }
}

// Query concepts with pagination
conceptsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.sub || req.query.userId as string;
        const sessionId = req.query.sessionId as string;
        const tier = req.query.tier as string | undefined;
        const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
        const cursor = req.query.cursor as string | undefined;

        if (!userId || !sessionId) {
            res.status(400).json({ error: 'userId and sessionId are required' });
            return;
        }

        // Build query for GSI
        const gsi1pk = `USER#${userId}#SESSION#${sessionId}`;
        const queryParams: Parameters<typeof docClient.send>[0] = new QueryCommand({
            TableName: CONCEPTS_TABLE,
            IndexName: 'tier-index',
            KeyConditionExpression: tier
                ? 'GSI1PK = :pk AND begins_with(GSI1SK, :tier)'
                : 'GSI1PK = :pk',
            ExpressionAttributeValues: tier
                ? { ':pk': gsi1pk, ':tier': `TIER#${tier}` }
                : { ':pk': gsi1pk },
            Limit: limit,
            ExclusiveStartKey: parseCursor(cursor),
        });

        const result = await docClient.send(queryParams);

        // Transform items to concept format
        const concepts = (result.Items || []).map(item => ({
            id: item.conceptId,
            name: item.name,
            tier: item.tier,
            stageId: item.stageId,
            description: item.description,
            keyPoints: item.keyPoints || [],
            prerequisiteWeight: parseFloat(item.prerequisiteWeight) || 0.5,
            displayProperties: item.displayProperties || {},
        }));

        res.json({
            concepts,
            nextCursor: createCursor(result.LastEvaluatedKey),
            hasMore: !!result.LastEvaluatedKey,
            count: concepts.length,
        });
    } catch (error) {
        console.error('Concepts query error:', error);
        res.status(500).json({ error: 'Failed to query concepts' });
    }
});

// Start async concept generation
conceptsRouter.post('/generate', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.sub || 'anonymous';
        const { subject, sessionId, context } = req.body;

        if (!subject) {
            res.status(400).json({ error: 'Subject is required' });
            return;
        }

        // Invoke Lambda function asynchronously
        const payload = JSON.stringify({
            body: JSON.stringify({
                subject,
                userId,
                sessionId,
                context,
            }),
        });

        const invokeCommand = new InvokeCommand({
            FunctionName: GENERATE_FUNCTION,
            InvocationType: 'RequestResponse', // Sync for now, can be 'Event' for true async
            Payload: Buffer.from(payload),
        });

        const lambdaResponse = await lambdaClient.send(invokeCommand);
        const responsePayload = JSON.parse(
            Buffer.from(lambdaResponse.Payload || '{}').toString()
        );

        if (lambdaResponse.FunctionError) {
            res.status(500).json({
                error: 'Generation failed',
                details: responsePayload
            });
            return;
        }

        // Parse Lambda response body
        const body = JSON.parse(responsePayload.body || '{}');
        res.json(body);
    } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({ error: 'Failed to start generation' });
    }
});

// Get job status
conceptsRouter.get('/jobs/:jobId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { jobId } = req.params;
        const userId = req.user?.sub || req.query.userId as string;

        const result = await docClient.send(new GetCommand({
            TableName: JOBS_TABLE,
            Key: { jobId, userId },
        }));

        if (!result.Item) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        res.json({
            jobId: result.Item.jobId,
            userId: result.Item.userId,
            sessionId: result.Item.sessionId,
            subject: result.Item.subject,
            status: result.Item.status,
            conceptCount: result.Item.conceptCount,
            error: result.Item.error,
        });
    } catch (error) {
        console.error('Job status error:', error);
        res.status(500).json({ error: 'Failed to get job status' });
    }
});
