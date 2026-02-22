import { Router, Request, Response } from 'express';
import { DynamoDBClient, DescribeEndpointsCommand } from '@aws-sdk/client-dynamodb';
export const healthRouter = Router();
const startTime = Date.now();
// Liveness probe
healthRouter.get('/', (_req: Request, res: Response) => {
 res.json({
 status: 'healthy',
 uptime: Math.floor((Date.now() - startTime) / 1000),
 timestamp: new Date().toISOString()
 });
});
// Readiness probe (check dependencies)
healthRouter.get('/ready', async (_req: Request, res: Response) => {
 const checks = {
 database: await checkDatabase(),
 redis: await checkRedis(),
 bedrock: await checkBedrock()
 };
 const allHealthy = Object.values(checks).every((c) => c.healthy);
 res.status(allHealthy ? 200 : 503).json({
 status: allHealthy ? 'ready' : 'not ready',
 checks,
 timestamp: new Date().toISOString()
 });
});
async function checkDatabase(): Promise<{ healthy: boolean; latency?: number }> {
 const start = Date.now();
 try {
 const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
 await client.send(new DescribeEndpointsCommand({}));
 return { healthy: true, latency: Date.now() - start };
 } catch {
 return { healthy: false, latency: Date.now() - start };
 }
}
async function checkRedis(): Promise<{ healthy: boolean; latency?: number }> {
 // Redis is not currently used in this architecture — report as N/A
 return { healthy: true, latency: 0 };
}
async function checkBedrock(): Promise<{ healthy: boolean }> {
 // Bedrock is accessed on-demand, just check credentials exist
 const hasCredentials = !!(
 process.env.AWS_ACCESS_KEY_ID ||
 process.env.AWS_ROLE_ARN
 );
 return { healthy: hasCredentials };
}
