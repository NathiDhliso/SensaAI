
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const JOBS_TABLE = process.env.JOBS_TABLE || 'sensapbl-jobs-pilot';
const userId = 'dev-user';

async function testScan() {
    console.log(`Scanning table: ${JOBS_TABLE} for userId: ${userId}`);
    try {
        const result = await docClient.send(new ScanCommand({
            TableName: JOBS_TABLE,
            FilterExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId,
            },
        }));
        console.log('Success:', result.Items?.length, 'items found');
    } catch (error: any) {
        console.error('SCAN FAILED:', error);
        console.error('Msg:', error.message);
        console.error('Code:', error.name);
    }
}

testScan();
