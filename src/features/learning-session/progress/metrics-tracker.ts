/**
 * SensaAI Learning Velocity Metrics
 * 
 * Comprehensive tracking system for learning velocity, retention,
 * confusion rates, and spacing adherence.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SessionMetrics {
    /** Session ID */
    sessionId: string;
    /** Session start time */
    startTime: string;
    /** Session end time */
    endTime?: string;
    /** Concepts attempted */
    conceptsAttempted: number;
    /** Concepts mastered */
    conceptsMastered: number;
    /** Total time spent (minutes) */
    totalMinutes: number;
    /** Break count */
    breaksTaken: number;
    /** Total break time (minutes) */
    breakMinutes: number;
}

export interface ConceptMetric {
    /** Concept ID */
    conceptId: string;
    /** First attempt time */
    firstAttemptTime: string;
    /** Time to mastery (minutes) */
    timeToMastery?: number;
    /** Attempt count before mastery */
    attemptCount: number;
    /** Blank sheet test score (0-100) */
    blankSheetScore?: number;
    /** Required confusion drill */
    requiredConfusionDrill: boolean;
    /** Confusion drill passed */
    confusionDrillPassed?: boolean;
    /** 24-hour retention verified */
    retention24hVerified?: boolean;
    /** Review times (scheduled) */
    scheduledReviews: string[];
    /** Reviews completed on time */
    reviewsOnTime: number;
    /** Last recall timestamp for Knowledge Warmth tracking */
    lastRecallTimestamp?: string;
    /** Remediation attempts count for Mastery Branching */
    remediationAttempts?: number;
}

export interface LearningVelocityMetrics {
    /** User ID */
    userId: string;
    /** Total sessions */
    totalSessions: number;
    /** Session history */
    sessions: SessionMetrics[];
    /** Per-concept metrics */
    conceptMetrics: Map<string, ConceptMetric>;
    /** Overall stats */
    overall: {
        /** Total concepts mastered */
        totalMastered: number;
        /** Velocity: concepts per hour (quality-adjusted) */
        velocityPerHour: number;
        /** 24-hour retention rate */
        retentionRate24h: number;
        /** Confusion rate (% requiring drills) */
        confusionRate: number;
        /** Spacing adherence (% on schedule) */
        spacingAdherence: number;
        /** Cognitive load score (0-100) */
        cognitiveLoadScore: number;
    };
    /** Last updated */
    lastUpdated: string;
}

// ============================================================================
// DEFAULT METRICS
// ============================================================================

function createDefaultMetrics(userId: string = 'default'): LearningVelocityMetrics {
    return {
        userId,
        totalSessions: 0,
        sessions: [],
        conceptMetrics: new Map(),
        overall: {
            totalMastered: 0,
            velocityPerHour: 0,
            retentionRate24h: 100,
            confusionRate: 0,
            spacingAdherence: 100,
            cognitiveLoadScore: 100,
        },
        lastUpdated: new Date().toISOString(),
    };
}

// ============================================================================
// METRICS TRACKER CLASS
// ============================================================================

export class LearningMetricsTracker {
    private metrics: LearningVelocityMetrics;
    private storageKey = 'sensa-ai-learning-metrics';
    private currentSession: SessionMetrics | null = null;

    constructor(userId: string = 'default') {
        this.metrics = createDefaultMetrics(userId);
        this.loadFromStorage();
    }

    // ─── PERSISTENCE ──────────────────────────────────────────────────────────

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.metrics = {
                    ...data,
                    conceptMetrics: new Map(Object.entries(data.conceptMetrics || {})),
                };
            }
        } catch (e) {
            console.warn('[MetricsTracker] Failed to load from storage:', e);
        }
    }

    private saveToStorage(): void {
        try {
            const data = {
                ...this.metrics,
                conceptMetrics: Object.fromEntries(this.metrics.conceptMetrics),
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            console.warn('[MetricsTracker] Failed to save to storage:', e);
        }
    }

    // ─── SESSION MANAGEMENT ───────────────────────────────────────────────────

    /**
     * Start a new learning session
     */
    startSession(): SessionMetrics {
        this.currentSession = {
            sessionId: `session-${Date.now()}`,
            startTime: new Date().toISOString(),
            conceptsAttempted: 0,
            conceptsMastered: 0,
            totalMinutes: 0,
            breaksTaken: 0,
            breakMinutes: 0,
        };
        return this.currentSession;
    }

    /**
     * End the current session
     */
    endSession(): SessionMetrics | null {
        if (!this.currentSession) return null;

        this.currentSession.endTime = new Date().toISOString();
        this.currentSession.totalMinutes = Math.round(
            (new Date().getTime() - new Date(this.currentSession.startTime).getTime()) / 60000
        );

        this.metrics.sessions.push(this.currentSession);
        this.metrics.totalSessions++;
        this.recalculateOverallMetrics();
        this.saveToStorage();

        const session = this.currentSession;
        this.currentSession = null;
        return session;
    }

    /**
     * Record a break taken
     */
    recordBreak(durationMinutes: number): void {
        if (this.currentSession) {
            this.currentSession.breaksTaken++;
            this.currentSession.breakMinutes += durationMinutes;
        }
    }

    // ─── CONCEPT TRACKING ─────────────────────────────────────────────────────

    /**
     * Record concept attempt
     */
    recordConceptAttempt(conceptId: string): void {
        if (this.currentSession) {
            this.currentSession.conceptsAttempted++;
        }

        if (!this.metrics.conceptMetrics.has(conceptId)) {
            this.metrics.conceptMetrics.set(conceptId, {
                conceptId,
                firstAttemptTime: new Date().toISOString(),
                attemptCount: 1,
                requiredConfusionDrill: false,
                scheduledReviews: [],
                reviewsOnTime: 0,
            });
        } else {
            const metric = this.metrics.conceptMetrics.get(conceptId)!;
            metric.attemptCount++;
        }
    }

    /**
     * Record concept mastery
     */
    recordConceptMastery(
        conceptId: string,
        blankSheetScore?: number
    ): void {
        if (this.currentSession) {
            this.currentSession.conceptsMastered++;
        }

        const metric = this.metrics.conceptMetrics.get(conceptId);
        if (metric) {
            const firstAttempt = new Date(metric.firstAttemptTime);
            metric.timeToMastery = Math.round(
                (Date.now() - firstAttempt.getTime()) / 60000
            );
            if (blankSheetScore !== undefined) {
                metric.blankSheetScore = blankSheetScore;
            }
        }

        this.metrics.overall.totalMastered++;
        this.saveToStorage();
    }

    /**
     * Record confusion drill requirement
     */
    recordConfusionDrill(conceptId: string, passed: boolean): void {
        const metric = this.metrics.conceptMetrics.get(conceptId);
        if (metric) {
            metric.requiredConfusionDrill = true;
            metric.confusionDrillPassed = passed;
        }
        this.recalculateOverallMetrics();
        this.saveToStorage();
    }

    /**
     * Record 24-hour retention verification
     */
    recordRetentionVerification(conceptId: string, passed: boolean): void {
        const metric = this.metrics.conceptMetrics.get(conceptId);
        if (metric) {
            metric.retention24hVerified = passed;
        }
        this.recalculateOverallMetrics();
        this.saveToStorage();
    }

    /**
     * Record scheduled review
     */
    recordScheduledReview(conceptId: string, reviewDate: string, onTime: boolean): void {
        const metric = this.metrics.conceptMetrics.get(conceptId);
        if (metric) {
            metric.scheduledReviews.push(reviewDate);
            if (onTime) {
                metric.reviewsOnTime++;
            }
        }
        this.recalculateOverallMetrics();
        this.saveToStorage();
    }

    // ─── METRICS CALCULATION ──────────────────────────────────────────────────

    /**
     * Recalculate overall metrics
     */
    private recalculateOverallMetrics(): void {
        const concepts = Array.from(this.metrics.conceptMetrics.values());

        // Velocity: concepts mastered per hour
        const totalHours = this.metrics.sessions.reduce(
            (sum, s) => sum + (s.totalMinutes - s.breakMinutes) / 60,
            0
        );
        this.metrics.overall.velocityPerHour = totalHours > 0
            ? Math.round((this.metrics.overall.totalMastered / totalHours) * 10) / 10
            : 0;

        // Retention rate
        const retentionChecked = concepts.filter(c => c.retention24hVerified !== undefined);
        if (retentionChecked.length > 0) {
            const passed = retentionChecked.filter(c => c.retention24hVerified).length;
            this.metrics.overall.retentionRate24h = Math.round(
                (passed / retentionChecked.length) * 100
            );
        }

        // Confusion rate
        if (concepts.length > 0) {
            const required = concepts.filter(c => c.requiredConfusionDrill).length;
            this.metrics.overall.confusionRate = Math.round(
                (required / concepts.length) * 100
            );
        }

        // Spacing adherence
        const totalReviews = concepts.reduce((sum, c) => sum + c.scheduledReviews.length, 0);
        const onTimeReviews = concepts.reduce((sum, c) => sum + c.reviewsOnTime, 0);
        if (totalReviews > 0) {
            this.metrics.overall.spacingAdherence = Math.round(
                (onTimeReviews / totalReviews) * 100
            );
        }

        // Cognitive load score (based on break patterns)
        const sessions = this.metrics.sessions;
        if (sessions.length > 0) {
            const avgSessionMinutes = sessions.reduce((s, a) => s + a.totalMinutes, 0) / sessions.length;
            const avgBreaks = sessions.reduce((s, a) => s + a.breaksTaken, 0) / sessions.length;
            // Optimal: 25-45 min sessions with 1-2 breaks
            const sessionScore = avgSessionMinutes >= 25 && avgSessionMinutes <= 45 ? 100 :
                Math.max(0, 100 - Math.abs(35 - avgSessionMinutes) * 2);
            const breakScore = avgBreaks >= 1 && avgBreaks <= 3 ? 100 :
                avgBreaks < 1 ? 70 : Math.max(0, 100 - (avgBreaks - 3) * 15);
            this.metrics.overall.cognitiveLoadScore = Math.round((sessionScore + breakScore) / 2);
        }

        this.metrics.lastUpdated = new Date().toISOString();
    }

    // ─── GETTERS ──────────────────────────────────────────────────────────────

    /**
     * Get current velocity metrics
     */
    getMetrics(): LearningVelocityMetrics {
        return this.metrics;
    }

    /**
     * Get current session metrics
     */
    getCurrentSession(): SessionMetrics | null {
        return this.currentSession;
    }

    /**
     * Get trend data for the last N sessions
     */
    getTrend(sessionCount: number = 5): {
        velocityTrend: number[];
        retentionTrend: number[];
    } {
        const recent = this.metrics.sessions.slice(-sessionCount);
        return {
            velocityTrend: recent.map(s =>
                s.totalMinutes > 0 ? (s.conceptsMastered / (s.totalMinutes / 60)) : 0
            ),
            retentionTrend: [], // Would need retention data per session
        };
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics = createDefaultMetrics(this.metrics.userId);
        this.currentSession = null;
        this.saveToStorage();
    }

    // ─── KNOWLEDGE WARMTH ────────────────────────────────────────────────────

    /**
     * Record a recall attempt (for Knowledge Warmth tracking)
     */
    recordRecallAttempt(conceptId: string): void {
        const metric = this.metrics.conceptMetrics.get(conceptId);
        if (metric) {
            metric.lastRecallTimestamp = new Date().toISOString();
        } else {
            // Create new metric if doesn't exist
            this.metrics.conceptMetrics.set(conceptId, {
                conceptId,
                firstAttemptTime: new Date().toISOString(),
                attemptCount: 1,
                requiredConfusionDrill: false,
                scheduledReviews: [],
                reviewsOnTime: 0,
                lastRecallTimestamp: new Date().toISOString(),
            });
        }
        this.saveToStorage();
    }

    /**
     * Get knowledge warmth level for a concept
     * Hot (🔥): < 24h | Warm (🌡️): 1-3 days | Cool (❄️): 3-7 days | Cold (🧊): > 7 days
     */
    getKnowledgeWarmth(conceptId: string): 'hot' | 'warm' | 'cool' | 'cold' {
        const metric = this.metrics.conceptMetrics.get(conceptId);
        if (!metric?.lastRecallTimestamp) {
            return 'cold'; // Never recalled = cold
        }

        const lastRecall = new Date(metric.lastRecallTimestamp);
        const now = new Date();
        const hoursSinceRecall = (now.getTime() - lastRecall.getTime()) / (1000 * 60 * 60);

        if (hoursSinceRecall < 24) return 'hot';
        if (hoursSinceRecall < 72) return 'warm';
        if (hoursSinceRecall < 168) return 'cool';
        return 'cold';
    }

    /**
     * Get all concept warmth levels (for library display)
     */
    getAllConceptWarmth(): Map<string, 'hot' | 'warm' | 'cool' | 'cold'> {
        const warmthMap = new Map<string, 'hot' | 'warm' | 'cool' | 'cold'>();
        for (const conceptId of this.metrics.conceptMetrics.keys()) {
            warmthMap.set(conceptId, this.getKnowledgeWarmth(conceptId));
        }
        return warmthMap;
    }

    /**
     * Record remediation attempt for Mastery Branching
     */
    recordRemediationAttempt(conceptId: string): void {
        const metric = this.metrics.conceptMetrics.get(conceptId);
        if (metric) {
            metric.remediationAttempts = (metric.remediationAttempts || 0) + 1;
        }
        this.saveToStorage();
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let metricsTrackerInstance: LearningMetricsTracker | null = null;

export function getMetricsTracker(userId?: string): LearningMetricsTracker {
    if (!metricsTrackerInstance) {
        metricsTrackerInstance = new LearningMetricsTracker(userId);
    }
    return metricsTrackerInstance;
}

export default LearningMetricsTracker;
