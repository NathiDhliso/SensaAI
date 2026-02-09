export interface SavedResult {
 id: string;
 subject: string;
 alias?: string; // 3 letters + 2 digits version identifier
 generatedAt: string;
 fullDocument: string;
 pass1Data: {
 domain: string;
 roleScope: string;
 lifecycle: {
 phase1: string;
 phase2: string;
 phase3: string;
 };
 concepts: string[];
 };
 validation: {
 lifecycleConsistency: number;
 positiveFraming: number;
 formatConsistency: number;
 completeness: number;
 };
 examObjectives?: string[];
 savedLocally: boolean;
 savedToCloud?: boolean;
 cloudUrl?: string;
 localFilePath?: string;
}
export interface StorageProvider {
 saveResult(result: SavedResult): Promise<{ success: boolean; path?: string; error?: string }>;
 loadResult(id: string): Promise<SavedResult | null>;
 deleteResult(id: string): Promise<boolean>;
 listResults(): Promise<SavedResult[]>;
 findLatestBySubject?(subject: string): Promise<SavedResult | null>;
}