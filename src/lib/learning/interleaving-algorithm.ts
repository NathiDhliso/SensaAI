/**
 * SensaAI Interleaving Algorithm
 * 
 * Implements concept selection with tier balance and weighted prioritization.
 * Target distribution: Foundation 40%, Keystone 35%, Utility 25%
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

import type { LearningConcept } from '@/lib/types/learning';

// ============================================================================
// TYPES
// ============================================================================

export type ConceptTier = 'Foundation' | 'Keystone' | 'Utility';

export interface TierBalance {
    Foundation: number;
    Keystone: number;
    Utility: number;
}

export interface PriorityWeights {
    /** Weight for prerequisite completion */
    prerequisite: number;
    /** Weight for interleaving (avoiding same tier) */
    interleaving: number;
    /** Weight for tier balance */
    tierBalance: number;
}

export interface ContextBridge {
    /** Previous concept for context */
    fromConcept: LearningConcept | null;
    /** Next concept being introduced */
    toConcept: LearningConcept;
    /** Transition message */
    transitionMessage: string;
}

export interface InterleavingConfig {
    /** Target tier distribution */
    targetBalance: TierBalance;
    /** Priority weights */
    weights: PriorityWeights;
    /** Maximum consecutive same-tier concepts */
    maxConsecutiveSameTier: number;
    /** Whether interleaving is active */
    isActive: boolean;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: InterleavingConfig = {
    targetBalance: {
        Foundation: 0.40,
        Keystone: 0.35,
        Utility: 0.25,
    },
    weights: {
        prerequisite: 0.40,
        interleaving: 0.30,
        tierBalance: 0.30,
    },
    maxConsecutiveSameTier: 2,
    isActive: true,
};

// ============================================================================
// INTERLEAVING ALGORITHM CLASS
// ============================================================================

export class InterleavingAlgorithm {
    private config: InterleavingConfig;
    private recentTiers: ConceptTier[] = [];
    private completedConcepts: Set<string> = new Set();
    private tierCounts: TierBalance = { Foundation: 0, Keystone: 0, Utility: 0 };

    constructor(config: Partial<InterleavingConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Get the tier of a concept based on its properties
     */
    getConceptTier(concept: LearningConcept): ConceptTier {
        // Use mnemonic tier if available
        if (concept.mnemonic?.tier) {
            return concept.mnemonic.tier as ConceptTier;
        }

        // Otherwise, infer from position/importance
        // This is a simplified heuristic
        if (concept.order && concept.order <= 5) {
            return 'Foundation';
        }
        if (concept.order && concept.order <= 10) {
            return 'Keystone';
        }
        return 'Utility';
    }

    /**
     * Calculate priority score for a concept
     */
    calculatePriority(
        concept: LearningConcept,
        allConcepts: LearningConcept[]
    ): number {
        const tier = this.getConceptTier(concept);
        let score = 0;

        // 1. Prerequisite score (40%)
        const prereqScore = this.calculatePrerequisiteScore(concept, allConcepts);
        score += prereqScore * this.config.weights.prerequisite;

        // 2. Interleaving score (30%)
        const interleaveScore = this.calculateInterleavingScore(tier);
        score += interleaveScore * this.config.weights.interleaving;

        // 3. Tier balance score (30%)
        const balanceScore = this.calculateTierBalanceScore(tier);
        score += balanceScore * this.config.weights.tierBalance;

        return score;
    }

    /**
     * Calculate prerequisite score
     * Higher score for concepts whose prerequisites are complete
     */
    private calculatePrerequisiteScore(
        concept: LearningConcept,
        _allConcepts: LearningConcept[]
    ): number {
        // If no mnemonic parent, concept is independent
        if (!concept.mnemonic?.parentId) {
            return 1.0;
        }

        // Check if parent is completed
        if (this.completedConcepts.has(concept.mnemonic.parentId)) {
            return 1.0;
        }

        // Parent not complete - lower priority
        return 0.3;
    }

    /**
     * Calculate interleaving score
     * Higher score for different tier from recent concepts
     */
    private calculateInterleavingScore(tier: ConceptTier): number {
        if (!this.config.isActive || this.recentTiers.length === 0) {
            return 0.5;
        }

        const recentSameTier = this.recentTiers.filter(t => t === tier).length;

        // Avoid too many consecutive same-tier concepts
        if (recentSameTier >= this.config.maxConsecutiveSameTier) {
            return 0.1; // Strong penalty
        }

        // Prefer different tier
        if (this.recentTiers[this.recentTiers.length - 1] !== tier) {
            return 1.0;
        }

        return 0.5;
    }

    /**
     * Calculate tier balance score
     * Higher score for underrepresented tiers
     */
    private calculateTierBalanceScore(tier: ConceptTier): number {
        const total = Object.values(this.tierCounts).reduce((a, b) => a + b, 0);
        if (total === 0) return 0.5;

        const currentRatio = this.tierCounts[tier] / total;
        const targetRatio = this.config.targetBalance[tier];

        // If current ratio is below target, higher priority
        if (currentRatio < targetRatio) {
            return 1.0 - (currentRatio / targetRatio);
        }

        // If current ratio is above target, lower priority
        return 0.3;
    }

    /**
     * Select next concept from available options
     */
    selectNext(
        availableConcepts: LearningConcept[],
        allConcepts: LearningConcept[]
    ): LearningConcept | null {
        if (availableConcepts.length === 0) return null;

        // Filter out completed concepts
        const remaining = availableConcepts.filter(
            c => !this.completedConcepts.has(c.id)
        );

        if (remaining.length === 0) return null;

        // Score all concepts
        const scored = remaining.map(concept => ({
            concept,
            score: this.calculatePriority(concept, allConcepts),
        }));

        // Sort by score (highest first)
        scored.sort((a, b) => b.score - a.score);

        return scored[0].concept;
    }

    /**
     * Mark concept as completed and update tracking
     */
    markCompleted(concept: LearningConcept): void {
        const tier = this.getConceptTier(concept);

        this.completedConcepts.add(concept.id);
        this.tierCounts[tier]++;
        this.recentTiers.push(tier);

        // Keep only last N recent tiers
        if (this.recentTiers.length > 5) {
            this.recentTiers.shift();
        }
    }

    /**
     * Get interleaved session of concepts
     */
    getInterleavedSession(
        concepts: LearningConcept[],
        sessionSize: number = 7
    ): LearningConcept[] {
        const session: LearningConcept[] = [];
        const available = [...concepts];

        for (let i = 0; i < sessionSize && available.length > 0; i++) {
            const next = this.selectNext(available, concepts);
            if (!next) break;

            session.push(next);
            this.markCompleted(next);

            // Remove from available
            const idx = available.findIndex(c => c.id === next.id);
            if (idx !== -1) available.splice(idx, 1);
        }

        return session;
    }

    /**
     * Create context bridge between two concepts
     */
    createContextBridge(
        from: LearningConcept | null,
        to: LearningConcept
    ): ContextBridge {
        const toTier = this.getConceptTier(to);

        let transitionMessage = '';

        if (!from) {
            transitionMessage = `Let's start with ${to.name}, a ${toTier} concept.`;
        } else {
            const fromTier = this.getConceptTier(from);

            if (fromTier === toTier) {
                transitionMessage = `Building on ${from.name}, let's explore ${to.name}.`;
            } else {
                transitionMessage = `Now shifting from ${fromTier} to ${toTier}: ${to.name}.`;
            }
        }

        return {
            fromConcept: from,
            toConcept: to,
            transitionMessage,
        };
    }

    /**
     * Get current tier distribution
     */
    getTierDistribution(): TierBalance & { total: number } {
        const total = Object.values(this.tierCounts).reduce((a, b) => a + b, 0);
        return {
            ...this.tierCounts,
            total,
        };
    }

    /**
     * Activate or deactivate interleaving
     */
    setActive(active: boolean): void {
        this.config.isActive = active;
    }

    /**
     * Reset algorithm state
     */
    reset(): void {
        this.recentTiers = [];
        this.completedConcepts.clear();
        this.tierCounts = { Foundation: 0, Keystone: 0, Utility: 0 };
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let interleavingInstance: InterleavingAlgorithm | null = null;

export function getInterleavingAlgorithm(
    config?: Partial<InterleavingConfig>
): InterleavingAlgorithm {
    if (!interleavingInstance) {
        interleavingInstance = new InterleavingAlgorithm(config);
    }
    return interleavingInstance;
}

export default InterleavingAlgorithm;
