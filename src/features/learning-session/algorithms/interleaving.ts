/**
 * SensaAI Interleaving Algorithm
 * 
 * Implements concept selection with tier balance and weighted prioritization.
 * Target distribution: Trunk ~15%, Branch ~35%, Leaf ~50%
 * 
 * PRACTICE MODES:
 * - Blocked: Master one concept before moving on (easier but less transfer)
 * - Mixed: Interleave concepts from different tiers (harder but better retention)
 * - Progressive: Start blocked, transition to mixed as mastery builds
 */
import type { LearningConcept } from '@/shared/types/learning';
// ============================================================================
// TYPES
// ============================================================================
export type ConceptTier = 'Trunk' | 'Branch' | 'Leaf';
export interface TierBalance {
 Trunk: number;
 Branch: number;
 Leaf: number;
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
 /** Practice mode: blocked, mixed, or progressive */
 practiceMode: 'blocked' | 'mixed' | 'progressive';
 /** For progressive mode: concepts mastered before switching to mixed */
 progressiveThreshold: number;
 /** Interleaving ratio for mixed mode (0.0-1.0, higher = more interleaving) */
 interleavingRatio: number;
}
// ============================================================================
// DEFAULT CONFIG
// ============================================================================
const DEFAULT_CONFIG: InterleavingConfig = {
 targetBalance: {
 Trunk: 0.15,
 Branch: 0.35,
 Leaf: 0.50
 },
 weights: {
 prerequisite: 0.40,
 interleaving: 0.30,
 tierBalance: 0.30
 },
 maxConsecutiveSameTier: 2,
 isActive: true,
 practiceMode: 'mixed', // Default to mixed for better transfer
 progressiveThreshold: 5, // Switch to mixed after 5 concepts
 interleavingRatio: 0.7, // 70% interleaved, 30% blocked
};
// ============================================================================
// INTERLEAVING ALGORITHM CLASS
// ============================================================================
export class InterleavingAlgorithm {
 private config: InterleavingConfig;
 private recentTiers: ConceptTier[] = [];
 private completedConcepts: Set<string> = new Set();
 private tierCounts: TierBalance = { Trunk: 0, Branch: 0, Leaf: 0 };
 constructor(config: Partial<InterleavingConfig> = {}) {
 this.config = { ...DEFAULT_CONFIG, ...config };
 }
 /**
 * Get the tier of a concept based on its properties
 */
 getConceptTier(concept: LearningConcept): ConceptTier {
 // Use implicit root tier or mnemonic tier
 const t = concept.tier || concept.mnemonic?.tier;
 if (t) {
 const pascal = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
 return pascal as ConceptTier;
 }
 // Otherwise, infer from position/importance
 // This is a simplified heuristic
 if (concept.order && concept.order <= 5) {
 return 'Trunk';
 }
 if (concept.order && concept.order <= 10) {
 return 'Branch';
 }
 return 'Leaf';
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
 allConcepts: LearningConcept[]
 ): number {
 const requiredNames = new Set<string>();
 if (concept.prerequisites) {
 concept.prerequisites.forEach(p => requiredNames.add(p.toLowerCase()));
 }
 if (concept.connections) {
 concept.connections
 .filter(c => c.type === 'requires')
 .forEach(c => requiredNames.add(c.target.toLowerCase()));
 }
 if (concept.mnemonic?.parentId && !this.completedConcepts.has(concept.mnemonic.parentId)) {
 return 0.3;
 }
 if (requiredNames.size === 0) return 1.0;
 const allMet = Array.from(requiredNames).every(req => {
 const match = allConcepts.find(c => c.name.toLowerCase() === req || c.id === req);
 return match ? this.completedConcepts.has(match.id) : true;
 });
 if (!allMet) return 0.2;
 const od = concept.outdegree ?? 0;
 return od > 0 ? Math.min(1.0 + od * 0.02, 1.15) : 1.0;
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
 score: this.calculatePriority(concept, allConcepts)
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
 const conn = from.connections?.find(
 c => c.target.toLowerCase() === to.name.toLowerCase()
 );
 const reverseConn = to.connections?.find(
 c => c.target.toLowerCase() === from.name.toLowerCase()
 );
 if (to.logicalConnection && to.logicalConnection.length > 10) {
 transitionMessage = to.logicalConnection;
 } else if (conn) {
 const verbMap: Record<string, string> = {
 'requires': `${to.name} requires ${from.name} — let's build on that foundation.`,
 'enables': `${from.name} enables ${to.name} — time to unlock this next layer.`,
 'is-part-of': `${to.name} is part of ${from.name} — let's zoom in.`,
 'is-type-of': `${to.name} is a type of ${from.name} — a specific variant.`,
 'causes': `${from.name} causes ${to.name} — let's follow the chain.`,
 'constrains': `${from.name} constrains ${to.name} — understanding the boundaries.`,
 };
 transitionMessage = verbMap[conn.type] || `Building on ${from.name}, let's explore ${to.name}.`;
 } else if (reverseConn && reverseConn.type === 'requires') {
 transitionMessage = `${from.name} requires ${to.name} — solidifying the foundation.`;
 } else {
 const fromTier = this.getConceptTier(from);
 if (fromTier === toTier) {
 transitionMessage = `Building on ${from.name}, let's explore ${to.name}.`;
 } else {
 transitionMessage = `Now shifting from ${fromTier} to ${toTier}: ${to.name}.`;
 }
 }
 }
 return {
 fromConcept: from,
 toConcept: to,
 transitionMessage
 };
 }
 /**
 * Get current tier distribution
 */
 getTierDistribution(): TierBalance & { total: number } {
 const total = Object.values(this.tierCounts).reduce((a, b) => a + b, 0);
 return {
 ...this.tierCounts,
 total
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
 this.tierCounts = { Trunk: 0, Branch: 0, Leaf: 0 };
 }
 // ─── MIXED PRACTICE MODES ─────────────────────────────────────────────────
 /**
 * Set practice mode.
 * - 'blocked': Master one concept at a time (easier, less transfer)
 * - 'mixed': Interleave concepts across tiers (harder, better retention)
 * - 'progressive': Start blocked, switch to mixed after threshold
 */
 setPracticeMode(mode: InterleavingConfig['practiceMode']): void {
 this.config.practiceMode = mode;
 }
 /**
 * Get a mixed practice session.
 * 
 * Research shows mixed practice leads to better long-term retention
 * and transfer, even though blocked practice feels easier.
 * 
 * @param concepts Available concepts to choose from
 * @param sessionSize Number of concepts to include
 * @returns Interleaved concept sequence
 */
 getMixedPracticeSession(
 concepts: LearningConcept[],
 sessionSize: number = 7
 ): LearningConcept[] {
 // Force mixed mode temporarily
 const originalMode = this.config.practiceMode;
 this.config.practiceMode = 'mixed';
 this.config.isActive = true;
 const session = this.getInterleavedSession(concepts, sessionSize);
 // Restore original mode
 this.config.practiceMode = originalMode;
 return session;
 }
 /**
 * Get a progressive practice session.
 * 
 * Starts with blocked practice (easier, builds confidence),
 * then transitions to mixed practice (harder, better transfer)
 * after the learner has mastered a threshold of concepts.
 * 
 * @param concepts Available concepts to choose from
 * @param sessionSize Number of concepts to include
 * @returns Concept sequence with progressive interleaving
 */
 getProgressiveSession(
 concepts: LearningConcept[],
 sessionSize: number = 7
 ): { concepts: LearningConcept[]; mode: 'blocked' | 'mixed' } {
 const masteredCount = this.completedConcepts.size;
 // Determine current effective mode
 const effectiveMode: 'blocked' | 'mixed' =
 masteredCount < this.config.progressiveThreshold
 ? 'blocked'
 : 'mixed';
 // Apply mode
 this.config.isActive = effectiveMode === 'mixed';
 const session: LearningConcept[] = [];
 const available = [...concepts].filter(c => !this.completedConcepts.has(c.id));
 for (let i = 0; i < sessionSize && available.length > 0; i++) {
 let next: LearningConcept | null;
 if (effectiveMode === 'blocked') {
 // In blocked mode, prefer same tier as last concept
 const lastTier = this.recentTiers[this.recentTiers.length - 1];
 const sameTier = available.filter(c => this.getConceptTier(c) === lastTier);
 if (sameTier.length > 0 && lastTier) {
 next = sameTier[0];
 } else {
 next = available[0];
 }
 } else {
 // In mixed mode, use full interleaving
 next = this.selectNext(available, concepts);
 }
 if (!next) break;
 session.push(next);
 this.markCompleted(next);
 // Remove from available
 const idx = available.findIndex(c => c.id === next!.id);
 if (idx !== -1) available.splice(idx, 1);
 }
 return { concepts: session, mode: effectiveMode };
 }
 /**
 * Get practice mode recommendation based on learner progress.
 */
 getRecommendedMode(): { mode: 'blocked' | 'mixed'; reason: string } {
 const masteredCount = this.completedConcepts.size;
 if (masteredCount < 3) {
 return {
 mode: 'blocked',
 reason: 'Start with blocked practice to build foundational confidence.'
 };
 }
 if (masteredCount < this.config.progressiveThreshold) {
 return {
 mode: 'blocked',
 reason: `Continue blocked practice until ${this.config.progressiveThreshold} concepts mastered.`
 };
 }
 return {
 mode: 'mixed',
 reason: 'Ready for mixed practice! Interleaving will strengthen long-term retention.'
 };
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
