/**
 * SensaAI Spacing Engine
 * 
 * Implements spaced repetition scheduling for the Learning Velocity Engine.
 * Uses interval sequence [1, 3, 7, 14, 30] days with confusion pair adjustments.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ScheduledReview {
    /** Unique review ID */
    id: string;
    /** Concept ID to review */
    conceptId: string;
    /** Concept name for display */
    conceptName: string;
    /** When the review is due */
    dueDate: string;
    /** Current interval index in the sequence */
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
    /** Base interval sequence in days */
    intervalSequence: number[];
    /** Multiplier for concepts with confusion pairs */
    confusionPairMultiplier: number;
    /** Maximum interval in days */
    maxInterval: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: SpacingConfig = {
    intervalSequence: [1, 3, 7, 14, 30],
    confusionPairMultiplier: 0.7,
    maxInterval: 30,
};

// ============================================================================
// SPACING ENGINE CLASS
// ============================================================================

export class SpacingEngine {
    private reviews: Map<string, ScheduledReview> = new Map();
    private config: SpacingConfig;
    private storageKey = 'sensa-ai-spacing-reviews';

    constructor(config: Partial<SpacingConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.loadFromStorage();
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
            console.warn('[SpacingEngine] Failed to load from storage:', e);
        }
    }

    private saveToStorage(): void {
        try {
            const data = Array.from(this.reviews.values());
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            console.warn('[SpacingEngine] Failed to save to storage:', e);
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
        };

        this.reviews.set(conceptId, review);
        this.saveToStorage();

        return review;
    }

    /**
     * Record review result and update scheduling
     */
    recordReviewResult(conceptId: string, success: boolean): ScheduledReview | null {
        const review = this.reviews.get(conceptId);
        if (!review) return null;

        const now = new Date();
        review.lastReviewDate = now.toISOString();
        review.lastReviewResult = success ? 'success' : 'fail';

        if (success) {
            review.successCount++;
            // Progress to next interval
            review.intervalIndex = Math.min(
                review.intervalIndex + 1,
                this.config.intervalSequence.length - 1
            );
            review.intervalDays = this.config.intervalSequence[review.intervalIndex];
        } else {
            review.failCount++;
            // Reset to first interval
            review.intervalIndex = 0;
            review.intervalDays = this.config.intervalSequence[0];
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
     * Get a specific review by concept ID
     */
    getReview(conceptId: string): ScheduledReview | undefined {
        return this.reviews.get(conceptId);
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
            adherencePercent,
        };
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
