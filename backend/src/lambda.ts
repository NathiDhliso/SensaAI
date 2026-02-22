/**
 * Lambda Entry Point
 *
 * Wraps the Express app with serverless-http so the entire Express backend
 * runs inside a single AWS Lambda function — zero server costs.
 *
 * Deployed behind API Gateway: ANY /api/v1/{proxy+}
 *
 * Cold start is ~150-300ms; subsequent invocations reuse the Express instance.
 */
import 'dotenv/config';
import serverlessHttp from 'serverless-http';
import { createApp } from './core/app.js';

const app = createApp();

// serverless-http adapts API Gateway v2 HTTP API payload (format 2.0)
// to Node.js IncomingMessage / ServerResponse so Express works unchanged.
export const handler = serverlessHttp(app, {
    // Forward cookies through API Gateway
    binary: ['image/*', 'application/pdf', 'application/octet-stream'],
});
