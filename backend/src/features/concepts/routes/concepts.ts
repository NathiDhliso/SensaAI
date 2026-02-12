import { Router, Request, Response } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, QueryCommandOutput, ScanCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { v4 as uuidv4 } from 'uuid';
export const conceptsRouter = Router();
interface AuthenticatedRequest extends Request {
 user?: { sub: string; email: string };
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
const CONCEPTS_TABLE = process.env.CONCEPTS_TABLE || 'sensapbl-concepts-pilot';
const JOBS_TABLE = process.env.JOBS_TABLE || 'sensapbl-jobs-pilot';
const GENERATE_FUNCTION = process.env.GENERATE_LAMBDA || 'sensapbl-generate-concepts-pilot';
const LEGACY_TIER_MAP: Record<string, string> = {
 'foundation': 'root',
 'keystone': 'trunk',
 'utility': 'leaf'
};
function remapTier(tier: string | undefined): string {
 if (!tier) return 'leaf';
 return LEGACY_TIER_MAP[tier] || tier;
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
 ExclusiveStartKey: parseCursor(cursor)
 }));
 if (result.Items?.length === 0 && !tier) {
 console.log(`[Backend /concepts] GSI returned 0 items (unfiltered). Falling back to main table with PK='${gsi1pk}'`);
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
 console.log(`[Backend /concepts] Main table found ${mainTableResult.Items.length} items`);
 result.Items = mainTableResult.Items;
 result.LastEvaluatedKey = mainTableResult.LastEvaluatedKey;
 } else {
 console.log(`[Backend /concepts] Main table also returned 0 items`);
 }
 } else {
 console.log(`[Backend /concepts] Query returned ${result.Items?.length ?? 0} items for tier='${tier || 'all'}'`);
 }
 const concepts = (result.Items || []).map(item => ({
 id: item.conceptId,
 name: item.name,
 tier: remapTier(item.tier),
 stageId: item.stageId,
 description: item.description,
 keyPoints: item.keyPoints || [],
 prerequisiteWeight: parseFloat(item.prerequisiteWeight) || 0.5,
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
 outdegree: item.outdegree || 0
 }));
 res.json({
 concepts,
 nextCursor: createCursor(result.LastEvaluatedKey),
 hasMore: !!result.LastEvaluatedKey,
 count: concepts.length
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
 const { subject, context, trunks } = req.body;
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
 ...(trunks && { trunks }),
 })
 });
 const invokeCommand = new InvokeCommand({
 FunctionName: GENERATE_FUNCTION,
 InvocationType: 'Event', // Async: don't wait for Lambda to finish
 Payload: Buffer.from(payload)
 });
 console.log('[Backend /generate] Invoking Lambda:', GENERATE_FUNCTION);
 try {
 const invokeResponse = await lambdaClient.send(invokeCommand);
 console.log('[Backend /generate] Lambda invoke response:', {
 StatusCode: invokeResponse.StatusCode,
 FunctionError: invokeResponse.FunctionError
 });
 if (invokeResponse.FunctionError) {
 console.error('[Backend /generate] Lambda returned error:', invokeResponse.FunctionError);
 throw new Error(`Lambda invocation failed: ${invokeResponse.FunctionError}`);
 }
 } catch (lambdaError: any) {
 console.error('[Backend /generate] Lambda invocation error:', lambdaError);
 // Mark job as failed
 await docClient.send(new PutCommand({
 TableName: JOBS_TABLE,
 Item: {
 jobId,
 userId,
 sessionId,
 subject,
 status: 'failed',
 error: `Lambda invocation failed: ${lambdaError.message}`,
 createdAt: Math.floor(Date.now() / 1000),
 expiresAt: Math.floor(Date.now() / 1000) + 86400
 }
 }));
 throw lambdaError;
 }
 console.log(`[Backend /generate] Lambda invoked asynchronously for jobId: ${jobId}, sessionId: ${sessionId}`);
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
 } catch (error: any) {
 console.error('[Backend /jobs] ERROR:', error);
 // Debug logging
 try {
 const fs = await import('fs');
 fs.appendFileSync('debug_jobs_error.txt', `[${new Date().toISOString()}] ${error.message}\nStack: ${error.stack}\n`);
 } catch (e) { console.error('Failed to write debug log', e); }
 res.status(500).json({ error: 'Failed to list jobs', details: error.message });
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
 Key: { jobId, userId }
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
 console.error('[Backend /jobs/:jobId] ERROR:', error);
 res.status(500).json({ error: 'Failed to get job status' });
 }
});
// Repair a single concept via Lambda
conceptsRouter.post('/repair', async (req: AuthenticatedRequest, res: Response) => {
 try {
 const userId = req.user?.sub || 'anonymous';
 const { subject, conceptName, issue } = req.body;
 console.log('[Backend /repair] Request received:', { subject, conceptName, issue, userId });
 if (!subject || !conceptName || !issue) {
 console.log('[Backend /repair] ERROR: subject, conceptName, and issue are required');
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
 console.log('[Backend /repair] Invoking Lambda:', GENERATE_FUNCTION);
 try {
 const invokeResponse = await lambdaClient.send(invokeCommand);
 console.log('[Backend /repair] Lambda invoke response:', {
 StatusCode: invokeResponse.StatusCode,
 FunctionError: invokeResponse.FunctionError
 });
 if (invokeResponse.FunctionError) {
 console.error('[Backend /repair] Lambda returned error:', invokeResponse.FunctionError);
 throw new Error(`Lambda repair failed: ${invokeResponse.FunctionError}`);
 }
 // Parse Lambda response
 const responsePayload = invokeResponse.Payload ?
 JSON.parse(Buffer.from(invokeResponse.Payload).toString()) : null;
 if (!responsePayload || responsePayload.statusCode !== 200) {
 console.error('[Backend /repair] Lambda returned non-200:', responsePayload);
 throw new Error(`Lambda repair failed with status: ${responsePayload?.statusCode}`);
 }
 const lambdaBody = JSON.parse(responsePayload.body);
 console.log('[Backend /repair] Repair completed successfully');
 res.json(lambdaBody.concept);
 } catch (lambdaError: any) {
 console.error('[Backend /repair] Lambda invocation error:', lambdaError);
 throw lambdaError;
 }
 } catch (error) {
 console.error('[Backend /repair] ERROR:', error);
 res.status(500).json({ error: 'Failed to repair concept' });
 }
});
conceptsRouter.delete('/:jobId', async (req: AuthenticatedRequest, res: Response) => {
 try {
 const { jobId } = req.params;
 const userId = req.user?.sub || req.query.userId as string;
 if (!userId) {
 res.status(400).json({ error: 'userId is required' });
 return;
 }
 console.log('[Backend DELETE /concepts/:jobId] Deleting:', { jobId, userId });
 let sessionId = jobId;
 const jobResult = await docClient.send(new GetCommand({
 TableName: JOBS_TABLE,
 Key: { jobId, userId }
 }));
 if (jobResult.Item?.sessionId) {
 sessionId = jobResult.Item.sessionId;
 }
 console.log('[Backend DELETE] Resolved sessionId:', sessionId);
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
 console.warn('[Backend DELETE] Metadata cleanup warning:', metaErr);
 }
 await docClient.send(new DeleteCommand({
 TableName: JOBS_TABLE,
 Key: { jobId, userId }
 }));
 console.log(`[Backend DELETE] Complete - job: ${jobId}, concepts: ${conceptsDeleted}`);
 res.json({ success: true, deletedJobId: jobId, conceptsDeleted });
 } catch (error) {
 console.error('[Backend DELETE /concepts/:jobId] ERROR:', error);
 res.status(500).json({ error: 'Failed to delete job' });
 }
});
