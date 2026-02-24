import { Router, Request, Response } from 'express';
import { logger } from '../../../shared/utils/logger.js';
import { validate, GenerateSchema, RepairSchema, ConceptUpdateSchema, UserdataUpsertSchema, UserdataBatchSchema } from '../../../shared/validation/schemas.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, UpdateCommand, QueryCommandOutput, ScanCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
export const conceptsRouter = Router();
interface AuthenticatedRequest extends Request {
    user?: { sub: string; email: string; role?: string };
}
// AWS clients - configured for us-east-1
const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1'
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const lambdaClient = new LambdaClient({
    region: process.env.AWS_REGION || 'us-east-1'
});
// Table and function names
const CONCEPTS_TABLE = process.env.CONCEPTS_TABLE || 'sensaai-concepts-dev';
const JOBS_TABLE = process.env.JOBS_TABLE || 'sensaai-jobs-dev';
const GENERATE_FUNCTION = process.env.GENERATE_LAMBDA || 'sensaai-generate-concepts-dev';
const LEGACY_TIER_MAP: Record<string, string> = {
    'foundation': 'root',
    'keystone': 'trunk',
    'utility': 'leaf'
};
function remapTier(tier: string | undefined): string {
    if (!tier) return 'leaf';
    return LEGACY_TIER_MAP[tier] || tier;
}

function mapConceptItem(item: Record<string, unknown>) {
    return {
        id: item.conceptId,
        name: item.name,
        tier: remapTier(item.tier as string | undefined),
        stageId: item.stageId || 'PREPARE',
        description: item.description,
        parentName: item.parentName || null,
        trunkDomain: item.trunkDomain || '',
        treeLevel: item.treeLevel || item.tier || 'leaf',
        order: item.order ?? item.displayOrder ?? 0,
        keyPoints: item.keyPoints || [],
        prerequisiteWeight: parseFloat(item.prerequisiteWeight as string) || 0.5,
        displayProperties: item.displayProperties || {},
        mnemonic: item.mnemonic || {},
        phase1: item.phase1 || {},
        phase2: item.phase2 || [],
        phase3: item.phase3 || {},
        shape: item.shape || {},
        criticalDistinctions: item.criticalDistinctions || [],
        designBoundaries: item.designBoundaries || [],
        examFocus: item.examFocus || [],
        dependencies: item.dependencies || [],
        connections: item.connections || [],
        outdegree: item.outdegree || 0,
        whyYouNeed: item.whyYouNeed || '',
        technicalDetails: item.technicalDetails || '',
        workedExample: item.workedExample || {},
        cognitiveLevel: item.cognitiveLevel || 'understand',
        commonPitfalls: item.commonPitfalls || [],
        perspectives: item.perspectives || [],
        blueprintSteps: item.blueprintSteps || [],
        examContext: item.examContext || {},
        scoring: item.scoring || {},
    };
}
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
// Query concepts with pagination (also dispatches action-based queries)
conceptsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.sub;
        const action = req.query.action as string | undefined;

        // --- Action dispatch: get_job_progress ---
        if (action === 'get_job_progress') {
            const jobId = req.query.jobId as string;
            if (!userId || !jobId) {
                res.status(400).json({ error: 'userId and jobId are required' });
                return;
            }
            const jobResult = await docClient.send(new GetCommand({
                TableName: JOBS_TABLE,
                Key: { jobId, userId }
            }));
            const item = jobResult.Item;
            if (!item) {
                res.status(404).json({ error: 'Job not found' });
                return;
            }
            res.json({
                jobId,
                sessionId: item.sessionId,
                subject: item.subject,
                status: item.status || 'unknown',
                conceptCount: Number(item.conceptCount || 0),
                latestConcept: item.latestConcept || '',
                updatedAt: Number(item.updatedAt || 0),
                error: item.error,
            });
            return;
        }

        // --- Action dispatch: get_latest_concepts ---
        if (action === 'get_latest_concepts') {
            const sessionId = req.query.sessionId as string;
            const afterOrder = parseInt(req.query.afterOrder as string) || 0;
            const latestLimit = Math.min(parseInt(req.query.limit as string) || 10, 50);
            if (!userId || !sessionId) {
                res.status(400).json({ error: 'userId and sessionId are required' });
                return;
            }
            const pk = `USER#${userId}#SESSION#${sessionId}`;
            const latestResult = await docClient.send(new QueryCommand({
                TableName: CONCEPTS_TABLE,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
                FilterExpression: 'displayOrder > :afterOrder',
                ExpressionAttributeValues: {
                    ':pk': pk,
                    ':skPrefix': 'TIER#',
                    ':afterOrder': afterOrder
                },
                Limit: latestLimit,
                ScanIndexForward: true
            }));
            const latestConcepts = (latestResult.Items || []).map(item => ({
                ...mapConceptItem(item as Record<string, unknown>),
                displayOrder: item.displayOrder || 0,
            }));
            res.json({
                concepts: latestConcepts,
                count: latestConcepts.length,
                hasMore: !!latestResult.LastEvaluatedKey,
            });
            return;
        }

        // --- Action dispatch: toggle_public ---
        if (action === 'toggle_public') {
            const jobId = req.query.jobId as string;
            const isPublic = req.query.isPublic === 'true';
            if (!userId || !jobId) {
                res.status(400).json({ error: 'userId and jobId are required' });
                return;
            }
            try {
                await docClient.send(new UpdateCommand({
                    TableName: JOBS_TABLE,
                    Key: { jobId, userId },
                    UpdateExpression: 'SET isPublic = :val',
                    ExpressionAttributeValues: { ':val': isPublic },
                    ConditionExpression: 'attribute_exists(jobId)'
                }));
                res.json({ jobId, isPublic });
            } catch (error: unknown) {
                if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
                    res.status(404).json({ error: 'Job not found' });
                } else {
                    logger.error('[Backend toggle_public] Error:', error);
                    res.status(500).json({ error: 'Failed to toggle public status' });
                }
            }
            return;
        }

        // --- Action dispatch: list_public ---
        if (action === 'list_public') {
            try {
                const scanResult = await docClient.send(new ScanCommand({
                    TableName: JOBS_TABLE,
                    FilterExpression: 'isPublic = :true AND #status = :completed',
                    ExpressionAttributeNames: { '#status': 'status' },
                    ExpressionAttributeValues: { ':true': true, ':completed': 'completed' }
                }));
                const jobs = (scanResult.Items || []).map(item => ({
                    jobId: item.jobId,
                    subject: item.subject,
                    createdAt: Number(item.createdAt || 0),
                    conceptCount: Number(item.conceptCount || 0),
                    sessionId: item.sessionId,
                    ownerId: item.userId,
                    isPublic: true
                })).sort((a, b) => b.createdAt - a.createdAt);
                res.json({ jobs });
            } catch (error) {
                logger.error('[Backend list_public] Error:', error);
                res.status(500).json({ error: 'Failed to list public content' });
            }
            return;
        }

        // --- Action dispatch: get_public_content ---
        if (action === 'get_public_content') {
            const jobId = req.query.jobId as string;
            const ownerId = req.query.ownerId as string;
            if (!jobId || !ownerId) {
                res.status(400).json({ error: 'jobId and ownerId are required' });
                return;
            }
            try {
                const jobResult = await docClient.send(new GetCommand({
                    TableName: JOBS_TABLE,
                    Key: { jobId, userId: ownerId }
                }));
                const job = jobResult.Item;
                const isOwner = userId === ownerId;
                if (!job || (!job.isPublic && !isOwner)) {
                    res.status(404).json({ error: 'Public content not found' });
                    return;
                }
                const sessionId = job.sessionId || jobId;
                const pk = `USER#${ownerId}#SESSION#${sessionId}`;
                const conceptsResult = await docClient.send(new QueryCommand({
                    TableName: CONCEPTS_TABLE,
                    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
                    ExpressionAttributeValues: { ':pk': pk, ':skPrefix': 'TIER#' }
                }));
                const concepts = (conceptsResult.Items || []).map(mapConceptItem);
                res.json({
                    jobId,
                    subject: job.subject,
                    ownerId,
                    conceptCount: concepts.length,
                    concepts,
                    classification: job.classification
                });
            } catch (error) {
                logger.error('[Backend get_public_content] Error:', error);
                res.status(500).json({ error: 'Failed to get public content' });
            }
            return;
        }

        // --- Default: query concepts with pagination ---
        const sessionId = req.query.sessionId as string;
        const tier = req.query.tier as string | undefined;
        const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
        const cursor = req.query.cursor as string | undefined;
        if (!userId || !sessionId) {
            res.status(400).json({ error: 'userId and sessionId are required' });
            return;
        }
        const gsi1pk = `USER#${userId}#SESSION#${sessionId}`;
        logger.debug(`[Backend /concepts] Querying PK: '${gsi1pk}' for Tier: '${tier || 'all'}'`);
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
            ExclusiveStartKey: parseCursor(cursor)
        }));
        if (result.Items?.length === 0 && !tier) {
            logger.debug(`[Backend /concepts] GSI returned 0 items (unfiltered). Falling back to main table with PK='${gsi1pk}'`);
            const mainTableResult = await docClient.send(new QueryCommand({
                TableName: CONCEPTS_TABLE,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
                ExpressionAttributeValues: {
                    ':pk': gsi1pk,
                    ':skPrefix': 'TIER#'
                },
                Limit: limit,
                ConsistentRead: true
            }));
            if (mainTableResult.Items && mainTableResult.Items.length > 0) {
                logger.debug(`[Backend /concepts] Main table found ${mainTableResult.Items.length} items`);
                result.Items = mainTableResult.Items;
                result.LastEvaluatedKey = mainTableResult.LastEvaluatedKey;
            } else {
                logger.debug(`[Backend /concepts] Main table also returned 0 items`);
            }
        } else {
            logger.debug(`[Backend /concepts] Query returned ${result.Items?.length ?? 0} items for tier='${tier || 'all'}'`);
        }
        const concepts = (result.Items || []).map(mapConceptItem);
        res.json({
            concepts,
            nextCursor: createCursor(result.LastEvaluatedKey),
            hasMore: !!result.LastEvaluatedKey,
            count: concepts.length
        });
    } catch (error) {
        logger.error('Concepts query error:', error);
        res.status(500).json({ error: 'Failed to query concepts' });
    }
});
// Start async concept generation via Lambda
conceptsRouter.post('/generate', validate(GenerateSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.sub || 'anonymous';
        const { subject, context, trunks, action, jobId: reqJobId } = req.body;

        // Always ensure sessionId exists - generate one if not provided
        const sessionId = req.body.sessionId || uuidv4();

        logger.debug(`[Backend /generate] Request received [action=${action || 'generate'}]:`, { subject, userId, sessionId });

        if (!subject) {
            logger.debug('[Backend /generate] Subject is required');
            res.status(400).json({ error: 'Subject is required' });
            return;
        }

        const jobId = reqJobId || uuidv4();
        const isSyncAction = action === 'classify_only' || action === 'suggest_structure';

        if (!isSyncAction) {
            // ── SERVER-SIDE DEDUP GUARD ──
            // Reject if there's already an in_progress job for the same subject + user.
            // This prevents duplicate generations from concurrent tabs / rapid clicks.
            try {
                const existingJobs = await docClient.send(new ScanCommand({
                    TableName: JOBS_TABLE,
                    FilterExpression: 'userId = :userId AND subject = :subject AND #s = :status',
                    ExpressionAttributeNames: { '#s': 'status' },
                    ExpressionAttributeValues: {
                        ':userId': userId,
                        ':subject': subject,
                        ':status': 'in_progress',
                    },
                }));
                if (existingJobs.Items && existingJobs.Items.length > 0) {
                    const existingJob = existingJobs.Items[0];
                    logger.warn(`[Backend /generate] Duplicate blocked — in_progress job ${existingJob.jobId} already exists for ${subject}`);
                    res.json({
                        jobId: existingJob.jobId,
                        sessionId: existingJob.sessionId,
                        status: 'in_progress',
                        message: 'Generation already in progress for this subject',
                        deduplicated: true,
                    });
                    return;
                }
            } catch (dedupError) {
                // Log but don't block — better to allow a potential duplicate than fail entirely
                logger.warn('[Backend /generate] Dedup check failed, proceeding:', dedupError);
            }

            logger.debug('[Backend /generate] Creating async job record...', jobId);
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
        }

        const payload = JSON.stringify({
            body: JSON.stringify({
                subject,
                userId,
                sessionId,
                jobId,
                context,
                action: action || 'generate',
                role: (req as AuthenticatedRequest).user?.role,
                ...(trunks && { trunks }),
            })
        });

        const invokeCommand = new InvokeCommand({
            FunctionName: GENERATE_FUNCTION,
            InvocationType: isSyncAction ? 'RequestResponse' : 'Event',
            Payload: Buffer.from(payload)
        });

        logger.debug(`[Backend /generate] Invoking Lambda (${isSyncAction ? 'Sync' : 'Async'}):`, GENERATE_FUNCTION);

        try {
            const invokeResponse = await lambdaClient.send(invokeCommand);

            if (isSyncAction) {
                // Synchronous response handling
                const responsePayload = invokeResponse.Payload ?
                    JSON.parse(Buffer.from(invokeResponse.Payload).toString()) : null;

                if (!responsePayload || responsePayload.statusCode >= 400) {
                    logger.error('[Backend /generate] Lambda sync error:', responsePayload);
                    res.status(responsePayload?.statusCode || 500).json(
                        JSON.parse(responsePayload?.body || '{"error": "Synchronous action failed"}')
                    );
                    return;
                }

                const lambdaBody = JSON.parse(responsePayload.body);
                res.json(lambdaBody);
                return;
            }

            // Async/Event response handling
            if (invokeResponse.FunctionError) {
                logger.error('[Backend /generate] Lambda returned error:', invokeResponse.FunctionError);
                throw new Error(`Lambda invocation failed: ${invokeResponse.FunctionError}`);
            }
        } catch (lambdaError: unknown) {
            logger.error('[Backend /generate] Lambda invocation error:', lambdaError);
            if (!isSyncAction) {
                // Mark job as failed for async actions
                await docClient.send(new PutCommand({
                    TableName: JOBS_TABLE,
                    Item: {
                        jobId,
                        userId,
                        sessionId,
                        subject,
                        status: 'failed',
                        error: `Lambda invocation failed: ${lambdaError instanceof Error ? lambdaError.message : String(lambdaError)}`,
                        createdAt: Math.floor(Date.now() / 1000),
                        expiresAt: Math.floor(Date.now() / 1000) + 86400
                    }
                }));
            }
            throw lambdaError;
        }

        logger.debug(`[Backend /generate] Lambda invoked asynchronously for jobId: ${jobId}`);
        res.json({
            jobId,
            sessionId,
            status: 'in_progress',
            message: 'Generation started'
        });
    } catch (error) {
        logger.error('[Backend /generate] ERROR:', error);
        res.status(500).json({ error: 'Failed to start generation' });
    }
});
// List all jobs for a user
conceptsRouter.get('/jobs', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }
        logger.debug('[Backend /jobs] Listing jobs for user:', userId);
        const result = await docClient.send(new ScanCommand({
            TableName: JOBS_TABLE,
            FilterExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            }
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
    } catch (error: unknown) {
        logger.error('[Backend /jobs] ERROR:', error);
        res.status(500).json({ error: 'Failed to list jobs' });
    }
});

// Maximum time a job can stay in_progress before being considered stale.
// Lambda has a 15-min hard timeout; add buffer for cold starts + DynamoDB writes.
const MAX_JOB_AGE_SECONDS = 20 * 60; // 20 minutes

// Get the most recent active (in_progress) job for this user.
// Used by the frontend recovery hook to resume polling after browser refresh/close.
// Also auto-marks stale jobs as failed so the frontend doesn't poll forever.
conceptsRouter.get('/jobs/active', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        // Scan for in_progress jobs belonging to this user
        const result = await docClient.send(new ScanCommand({
            TableName: JOBS_TABLE,
            FilterExpression: 'userId = :userId AND #s = :status',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: {
                ':userId': userId,
                ':status': 'in_progress'
            }
        }));
        const activeJobs = result.Items || [];

        if (activeJobs.length === 0) {
            res.json({ activeJob: null });
            return;
        }

        // Sort by createdAt desc — most recent first
        activeJobs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        const newest = activeJobs[0];
        const nowSeconds = Math.floor(Date.now() / 1000);
        const jobAgeSeconds = nowSeconds - (newest.createdAt || nowSeconds);

        // If the job has been in_progress longer than the Lambda timeout,
        // it almost certainly crashed without updating DynamoDB. Mark it failed.
        if (jobAgeSeconds > MAX_JOB_AGE_SECONDS) {
            logger.warn('[Backend /jobs/active] Marking stale job as failed:', {
                jobId: newest.jobId,
                ageMinutes: Math.floor(jobAgeSeconds / 60)
            });
            await docClient.send(new PutCommand({
                TableName: JOBS_TABLE,
                Item: {
                    ...newest,
                    status: 'failed',
                    error: 'Job timed out — the generation process did not complete within the expected window. Please try again.',
                    updatedAt: nowSeconds
                }
            }));
            res.json({
                activeJob: {
                    jobId: newest.jobId,
                    sessionId: newest.sessionId,
                    subject: newest.subject,
                    status: 'failed',
                    error: 'Job timed out — the generation process did not complete within the expected window. Please try again.',
                    conceptCount: Number(newest.conceptCount || 0),
                    createdAt: newest.createdAt
                }
            });
            return;
        }

        res.json({
            activeJob: {
                jobId: newest.jobId,
                sessionId: newest.sessionId,
                subject: newest.subject,
                status: newest.status,
                conceptCount: Number(newest.conceptCount || 0),
                latestConcept: newest.latestConcept || '',
                createdAt: newest.createdAt,
                updatedAt: newest.updatedAt
            }
        });
    } catch (error) {
        logger.error('[Backend /jobs/active] ERROR:', error);
        res.status(500).json({ error: 'Failed to check active jobs' });
    }
});

// Get job status
conceptsRouter.get('/jobs/:jobId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { jobId } = req.params;
        const userId = req.user?.sub;
        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const result = await docClient.send(new GetCommand({
            TableName: JOBS_TABLE,
            Key: { jobId, userId }
        }));
        if (!result.Item) {
            logger.debug('[Backend /jobs/:jobId] Job not found:', { jobId, userId });
            res.status(404).json({ error: 'Job not found' });
            return;
        }
        logger.debug('[Backend /jobs/:jobId] Job found:', {
            jobId: result.Item.jobId,
            status: result.Item.status,
            sessionId: result.Item.sessionId,
            conceptCount: result.Item.conceptCount
        });
        res.json({
            jobId: result.Item.jobId,
            userId: result.Item.userId,
            sessionId: result.Item.sessionId,
            subject: result.Item.subject,
            status: result.Item.status,
            conceptCount: result.Item.conceptCount,
            error: result.Item.error,
            classification: result.Item.classification
        });
    } catch (error) {
        logger.error('[Backend /jobs/:jobId] ERROR:', error);
        res.status(500).json({ error: 'Failed to get job status' });
    }
});
// Repair a single concept via Lambda
conceptsRouter.post('/repair', validate(RepairSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.sub || 'anonymous';
        const { subject, conceptName, issue } = req.body;
        logger.debug('[Backend /repair] Request received:', { subject, conceptName, issue, userId });
        if (!subject || !conceptName || !issue) {
            logger.debug('[Backend /repair] subject, conceptName, and issue are required');
            res.status(400).json({ error: 'subject, conceptName, and issue are required' });
            return;
        }
        const payload = JSON.stringify({
            body: JSON.stringify({
                action: 'repair',
                subject,
                conceptName,
                issue,
                userId
            })
        });
        const invokeCommand = new InvokeCommand({
            FunctionName: GENERATE_FUNCTION,
            InvocationType: 'RequestResponse', // Synchronous: wait for Lambda to finish
            Payload: Buffer.from(payload)
        });
        logger.debug('[Backend /repair] Invoking Lambda:', GENERATE_FUNCTION);
        try {
            const invokeResponse = await lambdaClient.send(invokeCommand);
            logger.debug('[Backend /repair] Lambda invoke response:', {
                StatusCode: invokeResponse.StatusCode,
                FunctionError: invokeResponse.FunctionError
            });
            if (invokeResponse.FunctionError) {
                logger.error('[Backend /repair] Lambda returned error:', invokeResponse.FunctionError);
                throw new Error(`Lambda repair failed: ${invokeResponse.FunctionError}`);
            }
            // Parse Lambda response
            const responsePayload = invokeResponse.Payload ?
                JSON.parse(Buffer.from(invokeResponse.Payload).toString()) : null;
            if (!responsePayload || responsePayload.statusCode !== 200) {
                logger.error('[Backend /repair] Lambda returned non-200:', responsePayload);
                throw new Error(`Lambda repair failed with status: ${responsePayload?.statusCode}`);
            }
            const lambdaBody = JSON.parse(responsePayload.body);
            logger.debug('[Backend /repair] Repair completed successfully');
            res.json(lambdaBody.concept);
        } catch (lambdaError: unknown) {
            logger.error('[Backend /repair] Lambda invocation error:', lambdaError);
            throw lambdaError;
        }
    } catch (error) {
        logger.error('[Backend /repair] ERROR:', error);
        res.status(500).json({ error: 'Failed to repair concept' });
    }
});
// Update a single concept (curator editing)
conceptsRouter.put('/:sessionId/concept/:conceptId', validate(ConceptUpdateSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.sub;
        const { sessionId, conceptId } = req.params;
        const { tier, ...updates } = req.body;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        if (!tier) {
            res.status(400).json({ error: 'tier is required to locate the concept' });
            return;
        }

        const pk = `USER#${userId}#SESSION#${sessionId}`;
        const sk = `TIER#${tier}#${conceptId}`;

        // Build dynamic UpdateExpression from provided fields
        const expressionParts: string[] = ['#updatedAt = :now'];
        const exprNames: Record<string, string> = { '#updatedAt': 'updatedAt' };
        const exprValues: Record<string, unknown> = { ':now': Math.floor(Date.now() / 1000) };

        const allowedFields = [
            'name', 'description', 'keyPoints', 'phase1', 'phase2', 'phase3',
            'mnemonic', 'shape', 'whyYouNeed', 'cognitiveLevel', 'commonPitfalls',
            'technicalDetails', 'workedExample', 'perspectives', 'blueprintSteps',
            'examContext', 'scoring', 'connections', 'dependencies',
        ];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                expressionParts.push(`#${field} = :${field}`);
                exprNames[`#${field}`] = field;
                exprValues[`:${field}`] = updates[field];
            }
        }

        logger.debug('[Backend PUT concept] Updating:', { pk, sk, fields: Object.keys(updates) });

        const result = await docClient.send(new UpdateCommand({
            TableName: CONCEPTS_TABLE,
            Key: { PK: pk, SK: sk },
            UpdateExpression: 'SET ' + expressionParts.join(', '),
            ExpressionAttributeNames: exprNames,
            ExpressionAttributeValues: exprValues,
            ConditionExpression: 'attribute_exists(PK)',
            ReturnValues: 'ALL_NEW',
        }));

        if (!result.Attributes) {
            res.status(404).json({ error: 'Concept not found' });
            return;
        }

        logger.debug('[Backend PUT concept] Updated successfully:', conceptId);
        res.json({ status: 'ok', concept: result.Attributes });
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
            res.status(404).json({ error: 'Concept not found' });
            return;
        }
        logger.error('[Backend PUT concept] ERROR:', error);
        res.status(500).json({ error: 'Failed to update concept' });
    }
});

conceptsRouter.delete('/:jobId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { jobId } = req.params;
        const userId = req.user?.sub;
        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        let sessionId = jobId;
        const jobResult = await docClient.send(new GetCommand({
            TableName: JOBS_TABLE,
            Key: { jobId, userId }
        }));
        if (jobResult.Item?.sessionId) {
            sessionId = jobResult.Item.sessionId;
        }
        logger.debug('[Backend DELETE] Resolved sessionId:', sessionId);
        const conceptsPK = `USER#${userId}#SESSION#${sessionId}`;
        let conceptsDeleted = 0;
        let lastEvaluatedKey: Record<string, unknown> | undefined;
        do {
            const queryResult = await docClient.send(new QueryCommand({
                TableName: CONCEPTS_TABLE,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: { ':pk': conceptsPK },
                ProjectionExpression: 'PK, SK',
                ExclusiveStartKey: lastEvaluatedKey
            }));
            const items = queryResult.Items || [];
            if (items.length > 0) {
                const chunks: Record<string, unknown>[][] = [];
                for (let i = 0; i < items.length; i += 25) {
                    chunks.push(items.slice(i, i + 25));
                }
                for (const chunk of chunks) {
                    await docClient.send(new BatchWriteCommand({
                        RequestItems: {
                            [CONCEPTS_TABLE]: chunk.map(item => ({
                                DeleteRequest: { Key: { PK: item.PK, SK: item.SK } }
                            }))
                        }
                    }));
                    conceptsDeleted += chunk.length;
                }
            }
            lastEvaluatedKey = queryResult.LastEvaluatedKey as Record<string, unknown> | undefined;
        } while (lastEvaluatedKey);
        try {
            const userPK = `USER#${userId}`;
            const subjectSK = `SUBJECT#${sessionId}`;
            await docClient.send(new DeleteCommand({
                TableName: CONCEPTS_TABLE,
                Key: { PK: userPK, SK: subjectSK }
            }));
        } catch (metaErr) {
            logger.warn('[Backend DELETE] Metadata cleanup warning:', metaErr);
        }
        await docClient.send(new DeleteCommand({
            TableName: JOBS_TABLE,
            Key: { jobId, userId }
        }));
        logger.debug(`[Backend DELETE] Complete - job: ${jobId}, concepts: ${conceptsDeleted}`);
        res.json({ success: true, deletedJobId: jobId, conceptsDeleted });
    } catch (error) {
        logger.error('[Backend DELETE /concepts/:jobId] ERROR:', error);
        res.status(500).json({ error: 'Failed to delete job' });
    }
});

// ==============================================================================
// S3 PRESIGNED UPLOAD URL
// ==============================================================================

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const CONTENT_BUCKET = process.env.CONTENT_BUCKET || '';

const ALLOWED_UPLOAD_TYPES = new Set([
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
]);
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50 MB

// Get a presigned URL for uploading a file to S3
conceptsRouter.post('/upload-url', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        if (!CONTENT_BUCKET) {
            logger.error('[Backend /upload-url] CONTENT_BUCKET env var not set');
            res.status(503).json({ error: 'Upload service not configured' });
            return;
        }

        const { fileName, contentType, fileSize } = req.body;
        if (!fileName || !contentType) {
            res.status(400).json({ error: 'fileName and contentType are required' });
            return;
        }
        if (!ALLOWED_UPLOAD_TYPES.has(contentType)) {
            res.status(400).json({ error: `Content type '${contentType}' is not allowed` });
            return;
        }
        if (fileSize && fileSize > MAX_UPLOAD_SIZE) {
            res.status(400).json({ error: `File size exceeds maximum of ${MAX_UPLOAD_SIZE / 1024 / 1024}MB` });
            return;
        }

        // Sanitize fileName to prevent path traversal
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `blueprints/${userId}/${Date.now()}_${safeName}`;

        const command = new PutObjectCommand({
            Bucket: CONTENT_BUCKET,
            Key: key,
            ContentType: contentType,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 min

        logger.debug('[Backend /upload-url] Generated presigned URL for:', { key, contentType });
        res.json({ url, key, bucket: CONTENT_BUCKET });
    } catch (error) {
        logger.error('[Backend /upload-url] ERROR:', error);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});

// ==============================================================================
// USER DATA ROUTES (spacing reviews, objectives, stats, preferences)
// ==============================================================================

const USERDATA_TABLE = process.env.USERDATA_TABLE || 'sensapbl-userdata-dev';

// Get user data items, optionally filtered by dataKey prefix
conceptsRouter.get('/userdata', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.sub;
        const prefix = req.query.prefix as string | undefined;
        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const queryParams = {
            TableName: USERDATA_TABLE,
            KeyConditionExpression: prefix
                ? 'userId = :uid AND begins_with(dataKey, :prefix)'
                : 'userId = :uid',
            ExpressionAttributeValues: prefix
                ? { ':uid': userId, ':prefix': prefix }
                : { ':uid': userId },
        };

        const result = await docClient.send(new QueryCommand(queryParams));
        const items = (result.Items || []).map(item => ({
            userId: item.userId,
            dataKey: item.dataKey,
            data: item.data,
            updatedAt: item.updatedAt || 0,
        }));
        res.json({ items, count: items.length });
    } catch (error) {
        logger.error('[Backend /userdata GET] ERROR:', error);
        res.status(500).json({ error: 'Failed to get user data' });
    }
});

// Upsert a single user data item
conceptsRouter.put('/userdata', validate(UserdataUpsertSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.sub;
        const { dataKey, data } = req.body;
        if (!userId || !dataKey || data === undefined) {
            res.status(400).json({ error: 'Authentication and dataKey and data are required' });
            return;
        }

        await docClient.send(new PutCommand({
            TableName: USERDATA_TABLE,
            Item: {
                userId,
                dataKey,
                data,
                updatedAt: Math.floor(Date.now() / 1000),
            }
        }));
        res.json({ status: 'ok', dataKey });
    } catch (error) {
        logger.error('[Backend /userdata PUT] ERROR:', error);
        res.status(500).json({ error: 'Failed to put user data' });
    }
});

// Batch upsert user data items
conceptsRouter.post('/userdata/batch', validate(UserdataBatchSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.sub;
        const items = req.body.items as { dataKey: string; data: unknown }[];
        if (!userId || !items || items.length === 0) {
            res.status(400).json({ error: 'Authentication and items are required' });
            return;
        }

        const now = Math.floor(Date.now() / 1000);
        // DynamoDB BatchWrite max is 25 items; chunk if needed
        const chunks: { dataKey: string; data: unknown }[][] = [];
        for (let i = 0; i < items.length; i += 25) {
            chunks.push(items.slice(i, i + 25));
        }
        for (const chunk of chunks) {
            await docClient.send(new BatchWriteCommand({
                RequestItems: {
                    [USERDATA_TABLE]: chunk.map(item => ({
                        PutRequest: {
                            Item: {
                                userId,
                                dataKey: item.dataKey,
                                data: item.data,
                                updatedAt: now,
                            }
                        }
                    }))
                }
            }));
        }
        res.json({ status: 'ok', count: items.length });
    } catch (error) {
        logger.error('[Backend /userdata/batch POST] ERROR:', error);
        res.status(500).json({ error: 'Failed to batch put user data' });
    }
});
