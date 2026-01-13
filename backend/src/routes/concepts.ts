import { Router, Request, Response } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, QueryCommandOutput } from '@aws-sdk/lib-dynamodb';
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

        const gsi1pk = `USER#${userId} #SESSION#${sessionId} `;

        const result: QueryCommandOutput = await docClient.send(new QueryCommand({
            TableName: CONCEPTS_TABLE,
            IndexName: 'tier-index',
            KeyConditionExpression: tier
                ? 'GSI1PK = :pk AND begins_with(GSI1SK, :tier)'
                : 'GSI1PK = :pk',
            ExpressionAttributeValues: tier
                ? { ':pk': gsi1pk, ':tier': `TIER#${tier} ` }
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
        const { subject, sessionId, context } = req.body;

        if (!subject) {
            res.status(400).json({ error: 'Subject is required' });
            return;
        }

        const jobId = uuidv4();
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

        await lambdaClient.send(invokeCommand);

        console.log(`✅ Lambda invoked asynchronously for jobId: ${jobId} `);

        res.json({
            jobId,
            sessionId,
            status: 'in_progress',
            message: 'Generation started'
        });
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

