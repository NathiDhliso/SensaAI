/**
 * SensaAI Spacing Engine
 * 
 * Implements spaced repetition scheduling for the Learning Velocity Engine.
 * Supports both fixed intervals [1, 3, 7, 14, 30] and SM-2 adaptive algorithm.
 * 
 * SM-2 Algorithm (SuperMemo 2):
 * - Adapts intervals based on individual forgetting curves
 * - Uses 0-5 quality ratings to adjust ease factor
 * - More difficult concepts get shorter intervals
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
import { userdataApi } from '@/shared/api/userdata';
import { getCurrentUserId, fireAndForget } from '@/shared/api/cloud-sync';
import { logger } from '@/shared/utils/logger';
// ============================================================================
// TYPES
// ============================================================================
/**
 * SM-2 Quality Rating (0-5)
 * 0: Complete blackout, no memory
 * 1: Incorrect, but upon seeing correct answer, remembered
 * 2: Incorrect, but correct answer seemed easy to recall
 * 3: Correct with serious difficulty
 * 4: Correct after hesitation
 * 5: Correct with perfect recall
 */
export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;
export type DecayStatus = 'fresh' | 'fading' | 'forgotten';
export interface ScheduledReview {
    /** Unique review ID */
    id: string;
    /** Concept ID to review */
    conceptId: string;
    /** Concept name for display */
    conceptName: string;
    /** When the review is due */
    dueDate: string;
    /** Current interval index in the sequence (for fixed mode) */
    intervalIndex: number;
    /** Current interval in days */
    intervalDays: number;
    /** Number of successful reviews */
    successCount: number;
    /** Number of failed reviews */
    failCount: number;
    /** Whether concept has confusion pairs (affects interval) */
    hasConfusionPairs: boolean;
    /** Priority score for ordering (higher = more urgent) */
    priority: number;
    /** Last review date */
    lastReviewDate?: string;
    /** Last review result */
    lastReviewResult?: 'success' | 'fail';
    // ─── SM-2 ALGORITHM FIELDS ─────────────────────────────────────────────
    /** SM-2 Ease Factor (1.3-2.5, default 2.5). Lower = harder concept */
    easeFactor: number;
    /** SM-2 Last quality rating (0-5) */
    lastQuality?: SM2Quality;
    /** SM-2 Consecutive correct repetitions (resets on fail) */
    repetitions: number;
}
export interface SpacingMetrics {
    /** Total concepts being tracked */
    totalConcepts: number;
    /** Concepts due for review today */
    dueToday: number;
    /** Concepts overdue */
    overdue: number;
    /** Average retention rate */
    retentionRate: number;
    /** Spacing adherence percentage */
    adherencePercent: number;
}
export interface SpacingConfig {
    /** Base interval sequence in days (for fixed mode) */
    intervalSequence: number[];
    /** Multiplier for concepts with confusion pairs */
    confusionPairMultiplier: number;
    /** Maximum interval in days */
    maxInterval: number;
    /** Use SM-2 adaptive algorithm instead of fixed intervals */
    useSM2: boolean;
    /** SM-2 default ease factor for new concepts (2.5 recommended) */
    defaultEaseFactor: number;
    /** SM-2 minimum ease factor (1.3 recommended) */
    minEaseFactor: number;
}
// ============================================================================
// DEFAULT CONFIG
// ============================================================================
const DEFAULT_CONFIG: SpacingConfig = {
    intervalSequence: [1, 3, 7, 14, 30],
    confusionPairMultiplier: 0.7,
    maxInterval: 365, // SM-2 can go longer
    useSM2: true, // Enable SM-2 by default
    defaultEaseFactor: 2.5,
    minEaseFactor: 1.3
};
// ============================================================================
// SPACING ENGINE CLASS
// ============================================================================
export class SpacingEngine {
    private reviews: Map<string, ScheduledReview> = new Map();
    private config: SpacingConfig;
    private storageKey = 'sensa-ai-spacing-reviews';
    /** Track the last-changed conceptId so saveToStorage can sync just that one */
    private lastChangedConceptId: string | null = null;

    constructor(config: Partial<SpacingConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.loadFromStorage();
        // Async: merge with cloud data after localStorage loads
        this.initFromCloud();
    }
    // ─── PERSISTENCE ──────────────────────────────────────────────────────────
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored) as ScheduledReview[];
                data.forEach(review => this.reviews.set(review.conceptId, review));
            }
        } catch (e) {
            logger.warn('[SpacingEngine] Failed to load from storage:', e);
        }
    }
    private saveToStorage(): void {
        try {
            const data = Array.from(this.reviews.values());
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            logger.warn('[SpacingEngine] Failed to save to storage:', e);
        }
        // Fire-and-forget cloud sync for the changed review
        if (this.lastChangedConceptId) {
            const review = this.reviews.get(this.lastChangedConceptId);
            if (review) {
                const userId = getCurrentUserId();
                if (userId) {
                    fireAndForget(
                        () => userdataApi.put(userId, `REVIEW#${review.conceptId}`, review),
                        'saveReview'
                    );
                }
            }
            this.lastChangedConceptId = null;
        }
    }

    // ─── CLOUD SYNC ───────────────────────────────────────────────────────────
    /**
     * Load reviews from cloud and merge with local data.
     * Cloud data wins for the same concept if it has more reviews (higher successCount + failCount).
     */
    private async initFromCloud(): Promise<void> {
        const userId = getCurrentUserId();
        if (!userId) return; // Not logged in yet
        try {
            const response = await userdataApi.getAll(userId, 'REVIEW#');
            if (!response.items || response.items.length === 0) {
                // No cloud data — push local data up
                if (this.reviews.size > 0) {
                    await this.syncAllToCloud();
                }
                return;
            }
            let merged = 0;
            for (const item of response.items) {
                const review = item.data as ScheduledReview;
                if (!review?.conceptId) continue;
                
                // Convert string values back to numbers for DynamoDB compatibility
                if (typeof review.easeFactor === 'string') {
                    review.easeFactor = parseFloat(review.easeFactor);
                }
                if (typeof review.priority === 'string') {
                    review.priority = parseFloat(review.priority);
                }
                
                const local = this.reviews.get(review.conceptId);
                const cloudTotal = (review.successCount || 0) + (review.failCount || 0);
                const localTotal = local ? (local.successCount + local.failCount) : 0;
                // Cloud wins if it has more review history
                if (!local || cloudTotal > localTotal) {
                    this.reviews.set(review.conceptId, review);
                    merged++;
                }
            }
            if (merged > 0) {
                logger.debug(`[SpacingEngine] Merged ${merged} reviews from cloud`);
                // Save merged state back to localStorage
                try {
                    const data = Array.from(this.reviews.values());
                    localStorage.setItem(this.storageKey, JSON.stringify(data));
                } catch { /* non-critical */ }
            }
            // Push any local-only reviews to cloud
            await this.syncAllToCloud();
        } catch (e) {
            logger.warn('[SpacingEngine] Cloud sync failed (non-blocking):', e);
        }
    }

    /**
     * Batch-write all reviews to cloud.
     */
    async syncAllToCloud(): Promise<void> {
        const userId = getCurrentUserId();
        if (!userId) return;
        
        // Convert float values to strings for DynamoDB compatibility
        const items = Array.from(this.reviews.values()).map(review => ({
            dataKey: `REVIEW#${review.conceptId}`,
            data: {
                ...review,
                easeFactor: review.easeFactor.toString(),
                priority: review.priority.toString(),
            } as unknown,
        }));
        
        if (items.length === 0) return;
        try {
            await userdataApi.batchPut(userId, items);
            logger.debug(`[SpacingEngine] Synced ${items.length} reviews to cloud`);
        } catch (e) {
            logger.warn('[SpacingEngine] Batch sync to cloud failed:', e);
        }
    }
    // ─── SCHEDULING ───────────────────────────────────────────────────────────
    /**
    * Schedule initial review for a newly mastered concept
    */
    scheduleInitialReview(
        conceptId: string,
        conceptName: string,
        hasConfusionPairs: boolean = false
    ): ScheduledReview {
        const now = new Date();
        let intervalDays = this.config.intervalSequence[0]; // 1 day
        // Apply confusion pair multiplier
        if (hasConfusionPairs) {
            intervalDays = Math.round(intervalDays * this.config.confusionPairMultiplier);
        }
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + intervalDays);
        const review: ScheduledReview = {
            id: `review-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            conceptId,
            conceptName,
            dueDate: dueDate.toISOString(),
            intervalIndex: 0,
            intervalDays,
            successCount: 0,
            failCount: 0,
            hasConfusionPairs,
            priority: this.calculatePriority(dueDate, hasConfusionPairs),
            lastReviewDate: now.toISOString(),
            lastReviewResult: 'success',
            // SM-2 fields
            easeFactor: this.config.defaultEaseFactor,
            repetitions: 0
        };
        this.reviews.set(conceptId, review);
        this.lastChangedConceptId = conceptId;
        this.saveToStorage();
        return review;
    }
    /**
    * Record review result and update scheduling (legacy method, uses fixed intervals)
    * @deprecated Use recordReviewWithQuality for SM-2 algorithm
    */
    recordReviewResult(conceptId: string, success: boolean): ScheduledReview | null {
        // Map success/fail to SM-2 quality: success = 4, fail = 1
        return this.recordReviewWithQuality(conceptId, success ? 4 : 1);
    }
    /**
    * Record review with SM-2 quality rating (0-5)
    * 
    * SM-2 Algorithm:
    * - quality >= 3: correct response, advance interval
    * - quality < 3: incorrect, reset repetitions
    * - Ease factor adjusts based on quality
    * 
    * @param conceptId The concept being reviewed
    * @param quality SM-2 quality rating (0-5)
    * @returns Updated review or null if not found
    */
    recordReviewWithQuality(conceptId: string, quality: SM2Quality): ScheduledReview | null {
        const review = this.reviews.get(conceptId);
        if (!review) return null;
        const now = new Date();
        review.lastReviewDate = now.toISOString();
        review.lastQuality = quality;
        // Determine success (quality >= 3 counts as success in SM-2)
        const success = quality >= 3;
        review.lastReviewResult = success ? 'success' : 'fail';
        if (this.config.useSM2) {
            // ─── SM-2 ALGORITHM ────────────────────────────────────────────────
            if (quality >= 3) {
                // Correct response
                review.successCount++;
                review.repetitions++;
                // Calculate interval based on repetition number
                if (review.repetitions === 1) {
                    review.intervalDays = 1;
                } else if (review.repetitions === 2) {
                    review.intervalDays = 6;
                } else {
                    review.intervalDays = Math.round(review.intervalDays * review.easeFactor);
                }
                // Cap at max interval
                review.intervalDays = Math.min(review.intervalDays, this.config.maxInterval);
            } else {
                // Incorrect response - reset
                review.failCount++;
                review.repetitions = 0;
                review.intervalDays = 1;
            }
            // Adjust ease factor based on quality
            // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
            const adjustment = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
            review.easeFactor = Math.max(
                this.config.minEaseFactor,
                review.easeFactor + adjustment
            );
            // Track interval index for backwards compatibility
            review.intervalIndex = Math.min(
                review.repetitions,
                this.config.intervalSequence.length - 1
            );
        } else {
            // ─── FIXED INTERVAL MODE (legacy) ─────────────────────────────────
            if (success) {
                review.successCount++;
                review.repetitions++;
                review.intervalIndex = Math.min(
                    review.intervalIndex + 1,
                    this.config.intervalSequence.length - 1
                );
                review.intervalDays = this.config.intervalSequence[review.intervalIndex];
            } else {
                review.failCount++;
                review.repetitions = 0;
                review.intervalIndex = 0;
                review.intervalDays = this.config.intervalSequence[0];
            }
        }
        // Apply confusion pair multiplier if applicable
        if (review.hasConfusionPairs) {
            review.intervalDays = Math.round(
                review.intervalDays * this.config.confusionPairMultiplier
            );
        }
        // Calculate new due date
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + review.intervalDays);
        review.dueDate = dueDate.toISOString();
        review.priority = this.calculatePriority(dueDate, review.hasConfusionPairs);
        this.reviews.set(conceptId, review);
        this.lastChangedConceptId = conceptId;
        this.saveToStorage();
        return review;
    }
    /**
    * Calculate priority score for a review
    * Higher = more urgent
    */
    private calculatePriority(dueDate: Date, hasConfusionPairs: boolean): number {
        const now = new Date();
        const daysUntilDue = Math.floor(
            (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        // Base priority: inverse of days until due
        let priority = 100 - Math.max(0, daysUntilDue);
        // Boost priority for overdue
        if (daysUntilDue < 0) {
            priority += Math.abs(daysUntilDue) * 10;
        }
        // Boost priority for confusion pairs
        if (hasConfusionPairs) {
            priority += 15;
        }
        return Math.max(0, priority);
    }
    // ─── QUERYING ─────────────────────────────────────────────────────────────
    /**
    * Get all reviews due today or earlier
    */
    getDueReviews(): ScheduledReview[] {
        const now = new Date();
        now.setHours(23, 59, 59, 999); // End of today
        return Array.from(this.reviews.values())
            .filter(review => new Date(review.dueDate) <= now)
            .sort((a, b) => b.priority - a.priority);
    }
    /**
    * Get overdue reviews
    */
    getOverdueReviews(): ScheduledReview[] {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        return Array.from(this.reviews.values())
            .filter(review => new Date(review.dueDate) < startOfToday)
            .sort((a, b) => b.priority - a.priority);
    }
    /**
    * Get upcoming reviews for the next N days
    */
    getUpcomingReviews(days: number = 7): ScheduledReview[] {
        const now = new Date();
        const futureDate = new Date(now);
        futureDate.setDate(futureDate.getDate() + days);
        return Array.from(this.reviews.values())
            .filter(review => {
                const due = new Date(review.dueDate);
                return due > now && due <= futureDate;
            })
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }

    /**
    * Get spacing metrics
    */
    getMetrics(): SpacingMetrics {
        const all = Array.from(this.reviews.values());
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        const dueToday = all.filter(r => {
            const due = new Date(r.dueDate);
            return due >= startOfToday && due <= endOfToday;
        }).length;
        const overdue = all.filter(r => new Date(r.dueDate) < startOfToday).length;
        // Calculate retention rate
        const totalReviews = all.reduce((sum, r) => sum + r.successCount + r.failCount, 0);
        const successfulReviews = all.reduce((sum, r) => sum + r.successCount, 0);
        const retentionRate = totalReviews > 0
            ? Math.round((successfulReviews / totalReviews) * 100)
            : 100;
        // Calculate adherence (reviews done on time)
        const reviewedOnTime = all.filter(r => r.lastReviewResult === 'success').length;
        const adherencePercent = all.length > 0
            ? Math.round((reviewedOnTime / all.length) * 100)
            : 100;
        return {
            totalConcepts: all.length,
            dueToday: dueToday + overdue,
            overdue,
            retentionRate,
            adherencePercent
        };
    }
    // ─── DECAY & KNOWLEDGE HEALTH ───────────────────────────────────────────
    /**
     * Get the decay status of a specific concept.
     * Compares time elapsed since last review against the scheduled interval.
     *
     * - 'fresh':     < 50% of interval has elapsed
     * - 'fading':    50%-100% of interval has elapsed (due soon or today)
     * - 'forgotten': > 100% of interval has elapsed (overdue)
     *
     * Returns 'fresh' if the concept is not tracked.
     */
    getDecayStatus(conceptId: string): DecayStatus {
        const review = this.reviews.get(conceptId);
        if (!review || !review.lastReviewDate) return 'fresh';
        const now = Date.now();
        const lastReview = new Date(review.lastReviewDate).getTime();
        const intervalMs = review.intervalDays * 24 * 60 * 60 * 1000;
        const elapsed = now - lastReview;
        const ratio = intervalMs > 0 ? elapsed / intervalMs : 0;
        if (ratio > 1.0) return 'forgotten';
        if (ratio > 0.5) return 'fading';
        return 'fresh';
    }
    /**
     * Get review data for a specific concept
     */
    getReview(conceptId: string): ScheduledReview | undefined {
        return this.reviews.get(conceptId);
    }
    /**
     * Get knowledge health as a percentage.
     * Returns the % of all tracked concepts currently in 'fresh' state.
     * Returns null if no concepts are tracked yet.
     */
    getKnowledgeHealthPercent(): number | null {
        const all = Array.from(this.reviews.values());
        if (all.length === 0) return null;
        const freshCount = all.filter(r => this.getDecayStatus(r.conceptId) === 'fresh').length;
        return Math.round((freshCount / all.length) * 100);
    }
    // ─── INTERLEAVING ─────────────────────────────────────────────────────────
    /**
    * Get interleaved review session
    * Mixes different concept types for better retention
    */
    getInterleavedSession(maxConcepts: number = 10): ScheduledReview[] {
        const due = this.getDueReviews();
        if (due.length <= maxConcepts) return due;
        // Separate by confusion pair status for variety
        const withConfusion = due.filter(r => r.hasConfusionPairs);
        const withoutConfusion = due.filter(r => !r.hasConfusionPairs);
        const result: ScheduledReview[] = [];
        let i = 0, j = 0;
        // Interleave the two groups
        while (result.length < maxConcepts && (i < withConfusion.length || j < withoutConfusion.length)) {
            if (i < withConfusion.length && (j >= withoutConfusion.length || result.length % 2 === 0)) {
                result.push(withConfusion[i++]);
            } else if (j < withoutConfusion.length) {
                result.push(withoutConfusion[j++]);
            }
        }
        return result;
    }
    // ─── CLEANUP ──────────────────────────────────────────────────────────────
    /**
    * Remove a concept from scheduling
    */
    removeReview(conceptId: string): void {
        this.reviews.delete(conceptId);
        this.saveToStorage();
    }
    /**
    * Clear all reviews
    */
    clearAll(): void {
        this.reviews.clear();
        this.saveToStorage();
    }
}
// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
let spacingEngineInstance: SpacingEngine | null = null;
export function getSpacingEngine(config?: Partial<SpacingConfig>): SpacingEngine {
    if (!spacingEngineInstance) {
        spacingEngineInstance = new SpacingEngine(config);
    }
    return spacingEngineInstance;
}
export default SpacingEngine;
