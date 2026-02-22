/**
 * DynamoDB Client Configuration for CLM System
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// Table names
export const TABLES = {
  AUDITS: process.env.CLM_AUDITS_TABLE || 'clm-audits',
  VERSIONS: process.env.CLM_VERSIONS_TABLE || 'clm-versions',
  CHANGELOG: process.env.CLM_CHANGELOG_TABLE || 'clm-changelog',
} as const;
