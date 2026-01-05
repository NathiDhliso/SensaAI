
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import { useAuthStore } from '@/store/auth-store';
import type { SavedResult, StorageProvider } from './types';

export class CloudStorage implements StorageProvider {
  private s3Client: S3Client | null = null;
  private ddbClient: DynamoDBDocumentClient | null = null;
  private bucketName: string | null = null;
  private tableName: string | null = null;
  private readonly region = import.meta.env.VITE_AWS_REGION || 'us-east-1';

  constructor() {
    this.initClients();
  }

  private initClients() {
    this.bucketName = import.meta.env.VITE_AWS_S3_BUCKET_NAME || null;
    this.tableName = import.meta.env.VITE_AWS_DYNAMODB_TABLE_NAME || null;

    // Strategy 1: Cognito Identity Pool (Production / Secure)
    // Requires VITE_COGNITO_IDENTITY_POOL_ID and VITE_COGNITO_USER_POOL_ID in .env
    const identityPoolId = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID;
    const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;

    if (identityPoolId && userPoolId) {
      console.log('🔐 CloudStorage: Using Cognito Identity Pool');

      const credentials = () => {
        const idToken = useAuthStore.getState().tokens?.idToken;

        // If we have a token, use it for authenticated access
        if (idToken) {
          return fromCognitoIdentityPool({
            clientConfig: { region: this.region },
            identityPoolId,
            logins: {
              [`cognito-idp.${this.region}.amazonaws.com/${userPoolId}`]: idToken
            }
          })();
        }

        // Otherwise, attempt unauthenticated (guest) access
        // This requires "Enable access to unauthenticated identities" in Cognito Identity Pool settings
        return fromCognitoIdentityPool({
          clientConfig: { region: this.region },
          identityPoolId,
          // No logins map needed for guest access
        })();
      };

      this.s3Client = new S3Client({ region: this.region, credentials });
      const ddb = new DynamoDBClient({ region: this.region, credentials });
      this.ddbClient = DynamoDBDocumentClient.from(ddb);
      return;
    }

    // Strategy 2: Direct Keys (Development Only)
    const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
    const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey) {
      console.log('🔧 CloudStorage: Using .env Keys (Dev Mode)');
      const credentials = { accessKeyId, secretAccessKey };

      this.s3Client = new S3Client({ region: this.region, credentials });
      const ddb = new DynamoDBClient({ region: this.region, credentials });
      this.ddbClient = DynamoDBDocumentClient.from(ddb);
    }
  }

  isConfigured(): boolean {
    return !!(this.s3Client && this.ddbClient && this.bucketName && this.tableName);
  }

  async saveResult(result: SavedResult): Promise<{ success: boolean; path?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Cloud storage not configured' };
    }

    try {
      // 1. Upload full document to S3
      const s3Key = `results/${result.id}.json`;
      await this.s3Client!.send(new PutObjectCommand({
        Bucket: this.bucketName!,
        Key: s3Key,
        Body: JSON.stringify(result),
        ContentType: 'application/json'
      }));

      // 2. Save metadata to DynamoDB
      // We strip the heavy 'fullDocument' from the metadata table to keep it light
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { fullDocument, ...metadata } = result;

      await this.ddbClient!.send(new PutCommand({
        TableName: this.tableName!,
        Item: {
          ...metadata,
          s3Key: s3Key,
          updatedAt: new Date().toISOString()
        }
      }));

      return {
        success: true,
        path: `s3://${this.bucketName}/${s3Key}`
      };

    } catch (error) {
      console.error('Cloud save failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown cloud error'
      };
    }
  }

  async loadResult(id: string): Promise<SavedResult | null> {
    if (!this.isConfigured()) return null;

    try {
      // 1. Get metadata from DynamoDB to find S3 key
      const ddbResult = await this.ddbClient!.send(new GetCommand({
        TableName: this.tableName!,
        Key: { id }
      }));

      if (!ddbResult.Item) return null;

      const s3Key = ddbResult.Item.s3Key || `results/${id}.json`;

      // 2. Download full JSON from S3
      const s3Response = await this.s3Client!.send(new GetObjectCommand({
        Bucket: this.bucketName!,
        Key: s3Key
      }));

      if (!s3Response.Body) return null;

      const bodyContents = await s3Response.Body.transformToString();
      const fullResult = JSON.parse(bodyContents) as SavedResult;

      return {
        ...fullResult,
        savedToCloud: true,
        cloudUrl: `s3://${this.bucketName}/${s3Key}`
      };

    } catch (error) {
      console.error('Cloud load failed:', error);
      return null;
    }
  }

  async deleteResult(id: string): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      // 1. Delete from DynamoDB
      await this.ddbClient!.send(new DeleteCommand({
        TableName: this.tableName!,
        Key: { id }
      }));

      // 2. Delete from S3 (best effort)
      const s3Key = `results/${id}.json`;
      await this.s3Client!.send(new DeleteObjectCommand({
        Bucket: this.bucketName!,
        Key: s3Key
      }));

      return true;
    } catch (error) {
      console.error('Cloud delete failed:', error);
      return false;
    }
  }

  async findLatestBySubject(subject: string): Promise<SavedResult | null> {
    if (!this.isConfigured()) return null;

    try {
      // Scan for subject match (Note: In production with >1k items, use a GSI)
      const result = await this.ddbClient!.send(new ScanCommand({
        TableName: this.tableName!,
        FilterExpression: 'subject = :s',
        ExpressionAttributeValues: {
          ':s': subject
        }
      }));

      if (!result.Items || result.Items.length === 0) return null;

      // Sort by date descending
      const results = result.Items as SavedResult[];
      results.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

      // Return the newest one, but we MUST fetch the full document from S3 first
      // because list/scan results usually exclude the heavy 'fullDocument'
      const newest = results[0];
      return await this.loadResult(newest.id);

    } catch (error) {
      console.error('Cloud search failed:', error);
      return null;
    }
  }

  async listResults(): Promise<SavedResult[]> {
    if (!this.isConfigured()) return [];

    try {
      // Scan DynamoDB for all results (metadata only)
      // In production, you'd want to Query by userId index instead of Scan
      const result = await this.ddbClient!.send(new ScanCommand({
        TableName: this.tableName!
      }));

      if (!result.Items) return [];

      // Return metadata-only results
      // Note: These won't have 'fullDocument' until loaded individually
      return result.Items as SavedResult[];
    } catch (error) {
      console.error('Cloud list failed:', error);
      return [];
    }
  }
}

export const cloudStorage = new CloudStorage();
