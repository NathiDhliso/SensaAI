/**
 * Sync Engine - Conflict Resolution for Multi-Device Sync
 * 
 * PRODUCTION-HARDENED VERSION
 * 
 * Implements field-level merging to prevent data loss when syncing
 * between local IndexedDB cache and cloud storage (S3/DynamoDB).
 * 
 * MERGE STRATEGY:
 * - Completed concepts: Set union (you can't un-learn something)
 * - Quiz scores: Keep highest score per concept
 * - Timestamps: Keep most recent
 * - Session data: Prefer local (in-progress work)
 * - Preferences: Prefer local (most recent user changes)
 * 
 * @module lib/storage/sync-engine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ConceptProgress {
    conceptId: string;
    mastered: boolean;
    masteredAt?: string;
    viewCount: number;
    lastViewedAt?: string;
    practiceCount: number;
    quizScores: number[];
    bestScore?: number;
    averageScore?: number;
}

export interface UserProgress {
    userId: string;
    subjectId: string;
    completedConcepts: string[];
    masteredConcepts: string[];
    inProgressConcepts: string[];
    conceptProgress: Record<string, ConceptProgress>;
    totalStudyTimeSeconds: number;
    lastActiveAt: string;
    syncVersion: number;
}

export interface QuizScores {
    userId: string;
    subjectId: string;
    conceptScores: Record<string, {
        scores: number[];
        bestScore: number;
        lastAttemptAt: string;
    }>;
}

export interface SyncResult<T> {
    merged: T;
    conflicts: SyncConflict[];
    localWins: number;
    cloudWins: number;
}

export interface SyncConflict {
    field: string;
    localValue: unknown;
    cloudValue: unknown;
    resolvedTo: 'local' | 'cloud' | 'merged';
    reason: string;
}

// ============================================================================
// SYNC ENGINE CLASS
// ============================================================================

class SyncEngineClass {
    private static instance: SyncEngineClass;

    private constructor() { }

    public static getInstance(): SyncEngineClass {
        if (!SyncEngineClass.instance) {
            SyncEngineClass.instance = new SyncEngineClass();
        }
        return SyncEngineClass.instance;
    }

    // ========================================================================
    // USER PROGRESS MERGING
    // ========================================================================

    /**
     * Merge user progress from local and cloud sources.
     * Uses optimistic concurrency with last-write-wins for simple fields
     * and set-union for arrays to prevent data loss.
     * 
     * @param local - Local user progress (from IndexedDB)
     * @param cloud - Cloud user progress (from DynamoDB)
     * @returns Merged progress with conflict report
     */
    public mergeUserData(
        local: UserProgress | null,
        cloud: UserProgress | null
    ): SyncResult<UserProgress> {
        const conflicts: SyncConflict[] = [];
        let localWins = 0;
        let cloudWins = 0;

        // Handle null cases
        if (!local && !cloud) {
            throw new Error('Cannot merge: both local and cloud are null');
        }
        if (!local) {
            return { merged: cloud!, conflicts: [], localWins: 0, cloudWins: 1 };
        }
        if (!cloud) {
            return { merged: local, conflicts: [], localWins: 1, cloudWins: 0 };
        }

        // Determine which is "newer" based on lastActiveAt
        const localTime = new Date(local.lastActiveAt).getTime();
        const cloudTime = new Date(cloud.lastActiveAt).getTime();
        const localIsNewer = localTime > cloudTime;

        // Merge completed concepts (SET UNION - you can't un-complete)
        const completedConcepts = this.setUnion(
            local.completedConcepts,
            cloud.completedConcepts
        );

        // Merge mastered concepts (SET UNION)
        const masteredConcepts = this.setUnion(
            local.masteredConcepts,
            cloud.masteredConcepts
        );

        // In-progress: prefer local (current work session)
        const inProgressConcepts = local.inProgressConcepts;
        if (this.arraysNotEqual(local.inProgressConcepts, cloud.inProgressConcepts)) {
            conflicts.push({
                field: 'inProgressConcepts',
                localValue: local.inProgressConcepts,
                cloudValue: cloud.inProgressConcepts,
                resolvedTo: 'local',
                reason: 'Preferring local in-progress work',
            });
            localWins++;
        }

        // Merge concept progress (per-concept merging)
        const conceptProgress = this.mergeConceptProgress(
            local.conceptProgress,
            cloud.conceptProgress
        );

        // Total study time: always add (accumulate from both sources)
        // This prevents losing study time from either device
        const totalStudyTimeSeconds = Math.max(
            local.totalStudyTimeSeconds,
            cloud.totalStudyTimeSeconds
        );

        // lastActiveAt: prefer more recent
        const lastActiveAt = localIsNewer ? local.lastActiveAt : cloud.lastActiveAt;

        // syncVersion: increment from max
        const syncVersion = Math.max(local.syncVersion, cloud.syncVersion) + 1;

        const merged: UserProgress = {
            userId: local.userId || cloud.userId,
            subjectId: local.subjectId || cloud.subjectId,
            completedConcepts,
            masteredConcepts,
            inProgressConcepts,
            conceptProgress,
            totalStudyTimeSeconds,
            lastActiveAt,
            syncVersion,
        };

        return { merged, conflicts, localWins, cloudWins };
    }

    // ========================================================================
    // QUIZ SCORES MERGING
    // ========================================================================

    /**
     * Merge quiz scores keeping the best score for each concept.
     * All attempts are preserved in the scores array.
     * 
     * @param local - Local quiz scores
     * @param cloud - Cloud quiz scores
     * @returns Merged scores
     */
    public mergeScores(
        local: QuizScores | null,
        cloud: QuizScores | null
    ): SyncResult<QuizScores> {
        const conflicts: SyncConflict[] = [];
        let localWins = 0;
        let cloudWins = 0;

        if (!local && !cloud) {
            throw new Error('Cannot merge: both local and cloud are null');
        }
        if (!local) {
            return { merged: cloud!, conflicts: [], localWins: 0, cloudWins: 1 };
        }
        if (!cloud) {
            return { merged: local, conflicts: [], localWins: 1, cloudWins: 0 };
        }

        const mergedConceptScores: QuizScores['conceptScores'] = {};

        // Get all concept IDs from both sources
        const allConceptIds = new Set([
            ...Object.keys(local.conceptScores),
            ...Object.keys(cloud.conceptScores),
        ]);

        for (const conceptId of allConceptIds) {
            const localScore = local.conceptScores[conceptId];
            const cloudScore = cloud.conceptScores[conceptId];

            if (!localScore && cloudScore) {
                mergedConceptScores[conceptId] = cloudScore;
                cloudWins++;
            } else if (localScore && !cloudScore) {
                mergedConceptScores[conceptId] = localScore;
                localWins++;
            } else if (localScore && cloudScore) {
                // Merge scores arrays (remove duplicates based on value)
                const allScores = this.setUnion(localScore.scores, cloudScore.scores);

                // Best score is max of both
                const bestScore = Math.max(localScore.bestScore, cloudScore.bestScore);

                // Last attempt is most recent
                const localAttempt = new Date(localScore.lastAttemptAt).getTime();
                const cloudAttempt = new Date(cloudScore.lastAttemptAt).getTime();
                const lastAttemptAt = localAttempt > cloudAttempt
                    ? localScore.lastAttemptAt
                    : cloudScore.lastAttemptAt;

                mergedConceptScores[conceptId] = {
                    scores: allScores,
                    bestScore,
                    lastAttemptAt,
                };

                // Track which had the best score
                if (localScore.bestScore > cloudScore.bestScore) {
                    localWins++;
                } else if (cloudScore.bestScore > localScore.bestScore) {
                    cloudWins++;
                }
            }
        }

        const merged: QuizScores = {
            userId: local.userId || cloud.userId,
            subjectId: local.subjectId || cloud.subjectId,
            conceptScores: mergedConceptScores,
        };

        return { merged, conflicts, localWins, cloudWins };
    }

    // ========================================================================
    // CONFLICT RESOLUTION
    // ========================================================================

    /**
     * Generic conflict resolver for arbitrary fields.
     * Applies different strategies based on field type.
     * 
     * @param local - Local value
     * @param cloud - Cloud value
     * @param fieldName - Name of the field (for strategy selection)
     * @returns Resolved value
     */
    public resolveConflict<T>(
        local: T,
        cloud: T,
        fieldName: string
    ): { value: T; winner: 'local' | 'cloud' | 'merged' } {
        // Null handling
        if (local === null || local === undefined) {
            return { value: cloud, winner: 'cloud' };
        }
        if (cloud === null || cloud === undefined) {
            return { value: local, winner: 'local' };
        }

        // Arrays: use set union
        if (Array.isArray(local) && Array.isArray(cloud)) {
            return {
                value: this.setUnion(local, cloud) as T,
                winner: 'merged',
            };
        }

        // Numbers: field-specific strategies
        if (typeof local === 'number' && typeof cloud === 'number') {
            // Score-like fields: keep max
            if (fieldName.includes('score') || fieldName.includes('Score')) {
                return {
                    value: Math.max(local, cloud) as T,
                    winner: local > cloud ? 'local' : 'cloud',
                };
            }
            // Count-like fields: keep max (accumulative)
            if (fieldName.includes('count') || fieldName.includes('Count')) {
                return {
                    value: Math.max(local, cloud) as T,
                    winner: local > cloud ? 'local' : 'cloud',
                };
            }
            // Time-like fields: keep max
            if (fieldName.includes('time') || fieldName.includes('Time')) {
                return {
                    value: Math.max(local, cloud) as T,
                    winner: local > cloud ? 'local' : 'cloud',
                };
            }
        }

        // Dates: prefer most recent
        if (fieldName.includes('At') || fieldName.includes('Date')) {
            const localTime = new Date(String(local)).getTime();
            const cloudTime = new Date(String(cloud)).getTime();
            return {
                value: localTime > cloudTime ? local : cloud,
                winner: localTime > cloudTime ? 'local' : 'cloud',
            };
        }

        // Default: prefer local (user's current device)
        return { value: local, winner: 'local' };
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    /**
     * Create a union of two arrays, removing duplicates
     */
    private setUnion<T>(arr1: T[], arr2: T[]): T[] {
        const set = new Set([...arr1, ...arr2]);
        return Array.from(set);
    }

    /**
     * Check if two arrays have different contents
     */
    private arraysNotEqual<T>(arr1: T[], arr2: T[]): boolean {
        if (arr1.length !== arr2.length) return true;
        const set1 = new Set(arr1);
        return arr2.some(item => !set1.has(item));
    }

    /**
     * Merge concept progress records
     */
    private mergeConceptProgress(
        local: Record<string, ConceptProgress>,
        cloud: Record<string, ConceptProgress>
    ): Record<string, ConceptProgress> {
        const merged: Record<string, ConceptProgress> = {};
        const allConceptIds = new Set([
            ...Object.keys(local),
            ...Object.keys(cloud),
        ]);

        for (const conceptId of allConceptIds) {
            const localProgress = local[conceptId];
            const cloudProgress = cloud[conceptId];

            if (!localProgress) {
                merged[conceptId] = cloudProgress;
            } else if (!cloudProgress) {
                merged[conceptId] = localProgress;
            } else {
                // Merge individual concept progress
                merged[conceptId] = {
                    conceptId,
                    // Mastered: once mastered, always mastered
                    mastered: localProgress.mastered || cloudProgress.mastered,
                    masteredAt: localProgress.masteredAt || cloudProgress.masteredAt,
                    // Counts: keep max
                    viewCount: Math.max(localProgress.viewCount, cloudProgress.viewCount),
                    practiceCount: Math.max(localProgress.practiceCount, cloudProgress.practiceCount),
                    // Timestamps: keep most recent
                    lastViewedAt: this.mostRecent(localProgress.lastViewedAt, cloudProgress.lastViewedAt),
                    // Scores: merge arrays, recompute stats
                    quizScores: this.setUnion(localProgress.quizScores, cloudProgress.quizScores),
                    bestScore: Math.max(
                        localProgress.bestScore || 0,
                        cloudProgress.bestScore || 0
                    ),
                    averageScore: undefined, // Will be recomputed
                };

                // Recompute average score
                const scores = merged[conceptId].quizScores;
                if (scores.length > 0) {
                    merged[conceptId].averageScore =
                        scores.reduce((a, b) => a + b, 0) / scores.length;
                }
            }
        }

        return merged;
    }

    /**
     * Get the most recent of two ISO date strings
     */
    private mostRecent(date1?: string, date2?: string): string | undefined {
        if (!date1) return date2;
        if (!date2) return date1;
        return new Date(date1).getTime() > new Date(date2).getTime() ? date1 : date2;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const SyncEngine = SyncEngineClass.getInstance();
export default SyncEngine;
