import { Router, Request, Response } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, QueryCommandOutput, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { v4 as uuidv4 } from 'uuid';

export const conceptsRouter = Router();

interface AuthenticatedRequest extends Request {
    user?: { sub: string; email: string };
}

// AWS clients - configured for us-east-1
const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const lambdaClient = new LambdaClient({
    region: process.env.AWS_REGION || 'us-east-1',
});

// Table and function names
const CONCEPTS_TABLE = process.env.CONCEPTS_TABLE || 'sensapbl-concepts-pilot';
const JOBS_TABLE = process.env.JOBS_TABLE || 'sensapbl-jobs-pilot';
const GENERATE_FUNCTION = process.env.GENERATE_LAMBDA || 'sensapbl-generate-concepts-pilot';

// Pagination helpers
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

        const gsi1pk = `USER#${userId}#SESSION#${sessionId}`;
        console.log(`[Backend /concepts] Querying PK: '${gsi1pk}' for Tier: '${tier || 'all'}'`);

        const result: QueryCommandOutput = await docClient.send(new QueryCommand({
            TableName: CONCEPTS_TABLE,
            IndexName: 'tier-index',
            KeyConditionExpression: tier
                ? 'GSI1PK = :pk AND begins_with(GSI1SK, :tier)'
                : 'GSI1PK = :pk',
            ExpressionAttributeValues: tier
                ? { ':pk': gsi1pk, ':tier': `TIER#${tier}#` }
                : { ':pk': gsi1pk },
            Limit: limit,
            ExclusiveStartKey: parseCursor(cursor),
        }));

        const concepts = (result.Items || []).map(item => ({
            id: item.conceptId,
            name: item.name,
            tier: item.tier,
            stageId: item.stageId,
            description: item.description,
            keyPoints: item.keyPoints || [],
            prerequisiteWeight: parseFloat(item.prerequisiteWeight) || 0.5,
            displayProperties: item.displayProperties || {},
            // Include full SENSA learning science fields
            mnemonic: item.mnemonic || {},
            phase1: item.phase1 || {},
            phase2: item.phase2 || [],
            phase3: item.phase3 || {},
            shape: item.shape || {},
            criticalDistinctions: item.criticalDistinctions || [],
            designBoundaries: item.designBoundaries || [],
            examFocus: item.examFocus || [],
            dependencies: item.dependencies || [],
            outdegree: item.outdegree || 0,
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

// Start async concept generation via Lambda
conceptsRouter.post('/generate', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.sub || 'anonymous';
        const { subject, context } = req.body;
        // Always ensure sessionId exists - generate one if not provided
        const sessionId = req.body.sessionId || uuidv4();

        console.log('[Backend /generate] Request received:', { subject, userId, sessionId, hasContext: !!context });

        if (!subject) {
            console.log('[Backend /generate] ERROR: Subject is required');
            res.status(400).json({ error: 'Subject is required' });
            return;
        }

        const jobId = uuidv4();
        console.log('[Backend /generate] Created jobId:', jobId);

        // Fix race condition: Write initial job status BEFORE invoking Lambda
        // This ensures the client doesn't get a 404 when polling immediately
        console.log('[Backend /generate] Writing initial job to DynamoDB...');
        await docClient.send(new PutCommand({
            TableName: JOBS_TABLE,
            Item: {
                jobId,
                userId,
                sessionId,
                subject,
                status: 'in_progress',
                message: 'Generation queued',
                createdAt: Math.floor(Date.now() / 1000),
                expiresAt: Math.floor(Date.now() / 1000) + 86400, // 24h TTL
            }
        }));
        console.log('[Backend /generate] Job written to DynamoDB');

        const payload = JSON.stringify({
            body: JSON.stringify({
                subject,
                userId,
                sessionId,
                jobId,
                context,
            }),
        });

        const invokeCommand = new InvokeCommand({
            FunctionName: GENERATE_FUNCTION,
            InvocationType: 'Event', // Async: don't wait for Lambda to finish
            Payload: Buffer.from(payload),
        });

        console.log('[Backend /generate] Invoking Lambda:', GENERATE_FUNCTION);
        await lambdaClient.send(invokeCommand);

        console.log(`[Backend /generate] ✅ Lambda invoked asynchronously for jobId: ${jobId}, sessionId: ${sessionId}`);

        res.json({
            jobId,
            sessionId,
            status: 'in_progress',
            message: 'Generation started'
        });
    } catch (error) {
        console.error('[Backend /generate] ERROR:', error);
        res.status(500).json({ error: 'Failed to start generation' });
    }
});

// List all jobs for a user
conceptsRouter.get('/jobs', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.sub || req.query.userId as string;

        if (!userId) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }

        console.log('[Backend /jobs] Listing jobs for user:', userId);

        const result = await docClient.send(new ScanCommand({
            TableName: JOBS_TABLE,
            FilterExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId,
            },
        }));

        const jobs = (result.Items || []).map(item => ({
            jobId: item.jobId,
            status: item.status,
            subject: item.subject,
            createdAt: item.createdAt,
            conceptCount: item.conceptCount,
            sessionId: item.sessionId
        }));

        // Sort by createdAt desc
        jobs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        res.json({ jobs });
    } catch (error) {
        console.error('[Backend /jobs] ERROR:', error);
        res.status(500).json({ error: 'Failed to list jobs' });
    }
});

// Get job status
conceptsRouter.get('/jobs/:jobId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { jobId } = req.params;
        const userId = req.user?.sub || req.query.userId as string;

        console.log('[Backend /jobs/:jobId] Checking status:', { jobId, userId });

        const result = await docClient.send(new GetCommand({
            TableName: JOBS_TABLE,
            Key: { jobId, userId },
        }));

        if (!result.Item) {
            console.log('[Backend /jobs/:jobId] Job not found:', { jobId, userId });
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        console.log('[Backend /jobs/:jobId] Job found:', {
            jobId: result.Item.jobId,
            status: result.Item.status,
            sessionId: result.Item.sessionId,
            conceptCount: result.Item.conceptCount,
        });

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
        console.error('[Backend /jobs/:jobId] ERROR:', error);
        res.status(500).json({ error: 'Failed to get job status' });
    }
});

