/**
 * Cloud Storage - SOURCE OF TRUTH
 * 
 * All generated content is stored in AWS S3 (fullDocument) and DynamoDB (metadata).
 * This is the authoritative storage layer - all other storage is just caching.
 * 
 * Storage Hierarchy:
 * - Cloud Storage (S3 + DynamoDB) = SOURCE OF TRUTH
 * - IndexedDB = Offline cache for faster loading
 * - LocalStorage = UI preferences only (theme, settings)
 * 
 * When to use:
 * - Saving new generated content
 * - Loading content when online
 * - Syncing across devices
 */
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import { useAuthStore } from '@/store/auth-store';
import { SyncEngine } from '@/features/content-storage/sync/sync-engine';
import type { SavedResult, StorageProvider } from '../types';
import type { UserProgress, QuizScores } from '@/features/content-storage/sync/sync-engine';
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
 const credentials = () => {
 // Note: Tokens are now in HttpOnly cookies managed by the backend
 // We use the isAuthenticated flag to determine if user is logged in
 const { isAuthenticated } = useAuthStore.getState();
 // If authenticated, use authenticated identity access
 // The actual token validation happens server-side
 if (isAuthenticated) {
 return fromCognitoIdentityPool({
 clientConfig: { region: this.region },
 identityPoolId,
 // For HttpOnly cookie auth, we use standard identity pool access
 // Authentication is verified by the API gateway/Lambda, not the browser SDK
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
 const credentials = { accessKeyId, secretAccessKey };
 this.s3Client = new S3Client({ region: this.region, credentials });
 const ddb = new DynamoDBClient({ region: this.region, credentials });
 this.ddbClient = DynamoDBDocumentClient.from(ddb);
 }
 }
 isConfigured(): boolean {
 const configured = !!(this.s3Client && this.ddbClient && this.bucketName && this.tableName);
 if (!configured) {
 console.warn('[CloudStorage] Not configured. Check:', {
 hasS3Client: !!this.s3Client,
 hasDdbClient: !!this.ddbClient,
 bucketName: this.bucketName || 'MISSING',
 tableName: this.tableName || 'MISSING'
 });
 }
 return configured;
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
 const safeTime = (d: string) => {
 if (/^\d+$/.test(d)) return Number(d);
 const t = new Date(d).getTime();
 return isNaN(t) ? 0 : t;
 };
 results.sort((a, b) => safeTime(b.generatedAt) - safeTime(a.generatedAt));
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
 // ========================================================================
 // SYNC ENGINE INTEGRATION - User Progress Syncing
 // ========================================================================
 /**
 * Sync user progress between local and cloud storage.
 * Uses SyncEngine to merge data without loss.
 * 
 * @param userId - User identifier
 * @param subjectId - Subject identifier
 * @param localProgress - Local user progress from IndexedDB
 * @returns Merged progress data
 */
 async syncUserProgress(
 userId: string,
 subjectId: string,
 localProgress: UserProgress | null
 ): Promise<UserProgress | null> {
 if (!this.isConfigured()) {
 console.warn('[CloudStorage] Cannot sync - not configured');
 return localProgress;
 }
 try {
 // 1. Load cloud progress
 const cloudProgress = await this.loadUserProgress(userId, subjectId);
 // 2. If no local data, return cloud data
 if (!localProgress) {
 return cloudProgress;
 }
 // 3. If no cloud data, upload local data
 if (!cloudProgress) {
 await this.saveUserProgress(userId, subjectId, localProgress);
 return localProgress;
 }
 // 4. Merge using SyncEngine
 const { merged } = SyncEngine.mergeUserData(localProgress, cloudProgress);
 // 5. Save merged data back to cloud
 await this.saveUserProgress(userId, subjectId, merged);
 return merged;
 } catch (error) {
 console.error('[CloudStorage] Sync failed:', error);
 // Return local data as fallback
 return localProgress;
 }
 }
 /**
 * Load user progress from DynamoDB
 */
 private async loadUserProgress(
 userId: string,
 subjectId: string
 ): Promise<UserProgress | null> {
 if (!this.isConfigured()) return null;
 try {
 const result = await this.ddbClient!.send(new GetCommand({
 TableName: this.tableName!,
 Key: {
 pk: `USER#${userId}`,
 sk: `PROGRESS#${subjectId}`
 }
 }));
 return result.Item as UserProgress | null;
 } catch (error) {
 console.error('[CloudStorage] Load progress failed:', error);
 return null;
 }
 }
 /**
 * Save user progress to DynamoDB
 */
 private async saveUserProgress(
 userId: string,
 subjectId: string,
 progress: UserProgress
 ): Promise<void> {
 if (!this.isConfigured()) return;
 try {
 await this.ddbClient!.send(new PutCommand({
 TableName: this.tableName!,
 Item: {
 pk: `USER#${userId}`,
 sk: `PROGRESS#${subjectId}`,
 ...progress,
 updatedAt: new Date().toISOString()
 }
 }));
 } catch (error) {
 console.error('[CloudStorage] Save progress failed:', error);
 }
 }
 /**
 * Sync quiz scores between local and cloud
 */
 async syncQuizScores(
 userId: string,
 subjectId: string,
 localScores: QuizScores | null
 ): Promise<QuizScores | null> {
 if (!this.isConfigured()) {
 return localScores;
 }
 try {
 const cloudScores = await this.loadQuizScores(userId, subjectId);
 if (!localScores) return cloudScores;
 if (!cloudScores) {
 await this.saveQuizScores(userId, subjectId, localScores);
 return localScores;
 }
 const { merged } = SyncEngine.mergeScores(localScores, cloudScores);
 await this.saveQuizScores(userId, subjectId, merged);
 return merged;
 } catch (error) {
 console.error('[CloudStorage] Score sync failed:', error);
 return localScores;
 }
 }
 private async loadQuizScores(
 userId: string,
 subjectId: string
 ): Promise<QuizScores | null> {
 if (!this.isConfigured()) return null;
 try {
 const result = await this.ddbClient!.send(new GetCommand({
 TableName: this.tableName!,
 Key: {
 pk: `USER#${userId}`,
 sk: `SCORES#${subjectId}`
 }
 }));
 return result.Item as QuizScores | null;
 } catch (error) {
 console.error('[CloudStorage] Load scores failed:', error);
 return null;
 }
 }
 private async saveQuizScores(
 userId: string,
 subjectId: string,
 scores: QuizScores
 ): Promise<void> {
 if (!this.isConfigured()) return;
 try {
 await this.ddbClient!.send(new PutCommand({
 TableName: this.tableName!,
 Item: {
 pk: `USER#${userId}`,
 sk: `SCORES#${subjectId}`,
 ...scores,
 updatedAt: new Date().toISOString()
 }
 }));
 } catch (error) {
 console.error('[CloudStorage] Save scores failed:', error);
 }
 }
}
export const cloudStorage = new CloudStorage();
