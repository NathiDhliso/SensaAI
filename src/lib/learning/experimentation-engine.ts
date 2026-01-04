/**
 * SensaAI Experimentation Engine
 * 
 * A/B testing and cohort management for learning parameters.
 * Enables data-driven optimization of spacing intervals, 
 * confusion thresholds, and loop durations.
 * 
 * Requirements: Task 15 (Experimentation and analytics)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Experiment {
    id: string;
    name: string;
    description: string;
    status: 'draft' | 'running' | 'paused' | 'complete';
    startDate?: string;
    endDate?: string;
    variants: ExperimentVariant[];
    metrics: ExperimentMetric[];
    targetSampleSize: number;
    currentSampleSize: number;
}

export interface ExperimentVariant {
    id: string;
    name: string;
    description: string;
    weight: number;  // 0-100, percentage of traffic
    config: Record<string, unknown>;
}

export interface ExperimentMetric {
    name: string;
    type: 'primary' | 'secondary' | 'guardrail';
    aggregation: 'mean' | 'sum' | 'count' | 'percentage';
}

export interface CohortAssignment {
    userId: string;
    experimentId: string;
    variantId: string;
    assignedAt: string;
}

export interface ExperimentResult {
    experimentId: string;
    variantId: string;
    metrics: Record<string, number>;
    sampleSize: number;
    confidence: number;
}

// ============================================================================
// BUILT-IN EXPERIMENTS
// ============================================================================

export const DEFAULT_EXPERIMENTS: Experiment[] = [
    {
        id: 'spacing-intervals-v1',
        name: 'Spacing Interval Optimization',
        description: 'Test different spaced repetition intervals for retention',
        status: 'draft',
        variants: [
            {
                id: 'control',
                name: 'Standard Intervals',
                description: 'Default [1, 3, 7, 14, 30] day intervals',
                weight: 50,
                config: { intervals: [1, 3, 7, 14, 30] },
            },
            {
                id: 'aggressive',
                name: 'Aggressive Spacing',
                description: 'Faster progression [1, 2, 5, 10, 21] days',
                weight: 25,
                config: { intervals: [1, 2, 5, 10, 21] },
            },
            {
                id: 'conservative',
                name: 'Conservative Spacing',
                description: 'Slower progression [1, 4, 10, 21, 45] days',
                weight: 25,
                config: { intervals: [1, 4, 10, 21, 45] },
            },
        ],
        metrics: [
            { name: 'retention_rate_7d', type: 'primary', aggregation: 'mean' },
            { name: 'concepts_mastered', type: 'secondary', aggregation: 'sum' },
            { name: 'user_satisfaction', type: 'guardrail', aggregation: 'mean' },
        ],
        targetSampleSize: 1000,
        currentSampleSize: 0,
    },
    {
        id: 'confusion-threshold-v1',
        name: 'Confusion Threshold Optimization',
        description: 'Test different thresholds for triggering confusion drills',
        status: 'draft',
        variants: [
            {
                id: 'control',
                name: '60% Threshold',
                description: 'Default 60% similarity threshold',
                weight: 50,
                config: { threshold: 0.6 },
            },
            {
                id: 'sensitive',
                name: '50% Threshold',
                description: 'More sensitive triggering',
                weight: 25,
                config: { threshold: 0.5 },
            },
            {
                id: 'relaxed',
                name: '70% Threshold',
                description: 'Less sensitive triggering',
                weight: 25,
                config: { threshold: 0.7 },
            },
        ],
        metrics: [
            { name: 'confusion_rate', type: 'primary', aggregation: 'mean' },
            { name: 'drill_completion_rate', type: 'secondary', aggregation: 'mean' },
            { name: 'user_frustration', type: 'guardrail', aggregation: 'mean' },
        ],
        targetSampleSize: 500,
        currentSampleSize: 0,
    },
    {
        id: 'loop-duration-v1',
        name: 'Loop Duration Optimization',
        description: 'Test different micro-learning loop durations',
        status: 'draft',
        variants: [
            {
                id: 'control',
                name: '60-180s Adaptive',
                description: 'Default adaptive range',
                weight: 50,
                config: { minSeconds: 60, maxSeconds: 180 },
            },
            {
                id: 'shorter',
                name: '45-120s Adaptive',
                description: 'Shorter, more frequent loops',
                weight: 25,
                config: { minSeconds: 45, maxSeconds: 120 },
            },
            {
                id: 'longer',
                name: '90-240s Adaptive',
                description: 'Longer, deeper loops',
                weight: 25,
                config: { minSeconds: 90, maxSeconds: 240 },
            },
        ],
        metrics: [
            { name: 'mastery_rate', type: 'primary', aggregation: 'mean' },
            { name: 'session_completion_rate', type: 'secondary', aggregation: 'mean' },
            { name: 'user_engagement', type: 'guardrail', aggregation: 'mean' },
        ],
        targetSampleSize: 500,
        currentSampleSize: 0,
    },
];

// ============================================================================
// EXPERIMENTATION ENGINE
// ============================================================================

export class ExperimentationEngine {
    private experiments: Map<string, Experiment> = new Map();
    private assignments: Map<string, CohortAssignment[]> = new Map();
    private storageKey = 'sensa-ai-experiments';

    constructor() {
        this.loadFromStorage();
        // Initialize with default experiments if empty
        if (this.experiments.size === 0) {
            DEFAULT_EXPERIMENTS.forEach(exp => this.experiments.set(exp.id, exp));
        }
    }

    // ─── PERSISTENCE ──────────────────────────────────────────────────────────

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.experiments = new Map(Object.entries(data.experiments || {}));
                this.assignments = new Map(Object.entries(data.assignments || {}));
            }
        } catch (e) {
            console.warn('[ExperimentationEngine] Failed to load:', e);
        }
    }

    private saveToStorage(): void {
        try {
            const data = {
                experiments: Object.fromEntries(this.experiments),
                assignments: Object.fromEntries(this.assignments),
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            console.warn('[ExperimentationEngine] Failed to save:', e);
        }
    }

    // ─── COHORT ASSIGNMENT ────────────────────────────────────────────────────

    /**
     * Assign user to experiment variant
     */
    assignToExperiment(userId: string, experimentId: string): CohortAssignment | null {
        const experiment = this.experiments.get(experimentId);
        if (!experiment || experiment.status !== 'running') return null;

        // Check existing assignment
        const userAssignments = this.assignments.get(userId) || [];
        const existing = userAssignments.find(a => a.experimentId === experimentId);
        if (existing) return existing;

        // Randomly assign based on variant weights
        const variant = this.selectVariant(experiment.variants);
        const assignment: CohortAssignment = {
            userId,
            experimentId,
            variantId: variant.id,
            assignedAt: new Date().toISOString(),
        };

        userAssignments.push(assignment);
        this.assignments.set(userId, userAssignments);

        // Update sample size
        experiment.currentSampleSize++;
        this.experiments.set(experimentId, experiment);

        this.saveToStorage();
        return assignment;
    }

    /**
     * Select variant based on weights
     */
    private selectVariant(variants: ExperimentVariant[]): ExperimentVariant {
        const rand = Math.random() * 100;
        let cumulative = 0;

        for (const variant of variants) {
            cumulative += variant.weight;
            if (rand <= cumulative) return variant;
        }

        return variants[0]; // Fallback
    }

    /**
     * Get user's variant config for experiment
     */
    getVariantConfig(userId: string, experimentId: string): Record<string, unknown> | null {
        const userAssignments = this.assignments.get(userId) || [];
        const assignment = userAssignments.find(a => a.experimentId === experimentId);
        if (!assignment) return null;

        const experiment = this.experiments.get(experimentId);
        if (!experiment) return null;

        const variant = experiment.variants.find(v => v.id === assignment.variantId);
        return variant?.config || null;
    }

    // ─── EXPERIMENT MANAGEMENT ────────────────────────────────────────────────

    /**
     * Get all experiments
     */
    getExperiments(): Experiment[] {
        return Array.from(this.experiments.values());
    }

    /**
     * Get running experiments
     */
    getRunningExperiments(): Experiment[] {
        return this.getExperiments().filter(e => e.status === 'running');
    }

    /**
     * Start an experiment
     */
    startExperiment(experimentId: string): boolean {
        const experiment = this.experiments.get(experimentId);
        if (!experiment) return false;

        experiment.status = 'running';
        experiment.startDate = new Date().toISOString();
        this.experiments.set(experimentId, experiment);
        this.saveToStorage();
        return true;
    }

    /**
     * Stop an experiment
     */
    stopExperiment(experimentId: string): boolean {
        const experiment = this.experiments.get(experimentId);
        if (!experiment) return false;

        experiment.status = 'complete';
        experiment.endDate = new Date().toISOString();
        this.experiments.set(experimentId, experiment);
        this.saveToStorage();
        return true;
    }

    // ─── RESULTS ──────────────────────────────────────────────────────────────

    /**
     * Record metric for analysis
     */
    recordMetric(userId: string, experimentId: string, metricName: string, _value: number): void {
        // In production, this would send to analytics backend
        console.log(`[Experiment] ${experimentId} - ${metricName}: ${_value} for user ${userId}`);
    }

    /**
     * Get experiment results (placeholder for analytics integration)
     */
    getResults(_experimentId: string): ExperimentResult[] {
        // In production, this would query analytics backend
        return [];
    }
}

// ============================================================================
// LEARNING ANALYTICS
// ============================================================================

export interface StrugglePattern {
    conceptId: string;
    conceptName: string;
    attemptCount: number;
    averageScore: number;
    lastAttempt: string;
}

export interface OptimalLearningTime {
    dayOfWeek: number;
    hourOfDay: number;
    averagePerformance: number;
}

export interface PersonalizedInsight {
    type: 'strength' | 'struggle' | 'recommendation';
    message: string;
    data?: Record<string, unknown>;
}

export class LearningAnalytics {
    /**
     * Identify concepts where user struggles
     */
    static identifyStrugglePatterns(
        _conceptAttempts: { conceptId: string; score: number; timestamp: string }[]
    ): StrugglePattern[] {
        // Placeholder - would analyze attempt patterns
        return [];
    }

    /**
     * Find optimal learning times based on performance
     */
    static findOptimalLearningTimes(
        _sessions: { startTime: string; performance: number }[]
    ): OptimalLearningTime[] {
        // Placeholder - would analyze time-of-day patterns
        return [];
    }

    /**
     * Generate personalized insights
     */
    static generateInsights(
        _metrics: Record<string, number>,
        _patterns: StrugglePattern[]
    ): PersonalizedInsight[] {
        // Placeholder - would generate AI-powered insights
        return [];
    }
}

// ============================================================================
// SINGLETON
// ============================================================================

let experimentationInstance: ExperimentationEngine | null = null;

export function getExperimentationEngine(): ExperimentationEngine {
    if (!experimentationInstance) {
        experimentationInstance = new ExperimentationEngine();
    }
    return experimentationInstance;
}

export default ExperimentationEngine;
