/**
 * Score Utilities - Handle edge cases and boundary conditions
 * 
 * Provides robust score normalization and validation to prevent
 * crashes and unpredictable behavior from invalid scores.
 */
export type ScoreStatus = 'mastered' | 'needs-review' | 'needs-learning';
/**
 * Normalize a score to a valid range [0, 1]
 * Handles null, undefined, NaN, and out-of-range values
 * 
 * @param score - Raw score value (can be any type)
 * @param defaultValue - Default value if score is invalid (default: 0)
 * @returns Normalized score in range [0, 1]
 */
export function normalizeScore(
 score: number | null | undefined,
 defaultValue: number = 0
): number {
 // Handle null/undefined
 if (score === null || score === undefined) {
 console.warn('[ScoreUtils] Score is null/undefined, using default:', defaultValue);
 return Math.max(0, Math.min(1, defaultValue));
 }
 // Handle NaN
 if (isNaN(score)) {
 console.warn('[ScoreUtils] Score is NaN, using default:', defaultValue);
 return Math.max(0, Math.min(1, defaultValue));
 }
 // Handle Infinity
 if (!isFinite(score)) {
 console.warn('[ScoreUtils] Score is Infinity, using default:', defaultValue);
 return Math.max(0, Math.min(1, defaultValue));
 }
 // Clamp to [0, 1] range
 const clamped = Math.max(0, Math.min(1, score));
 if (clamped !== score) {
 console.warn(`[ScoreUtils] Score ${score} clamped to ${clamped}`);
 }
 return clamped;
}
/**
 * Determine learning status based on normalized score
 * Uses explicit boundary conditions to avoid ambiguity
 * 
 * Boundaries:
 * - score >= 0.8: mastered
 * - 0.4 <= score < 0.8: needs-review
 * - score < 0.4: needs-learning
 * 
 * @param score - Raw score value
 * @param verified - Whether the answer was verified as correct (optional)
 * @returns Learning status
 */
export function determineStatus(
 score: number | null | undefined,
 verified?: boolean
): ScoreStatus {
 const normalized = normalizeScore(score);
 // Explicit boundary handling
 // Note: >= for upper bound, < for lower bound to avoid ambiguity
 if (normalized >= 0.8) {
 // High score, but if verification failed, downgrade to needs-review
 if (verified === false) {
 return 'needs-review';
 }
 return 'mastered';
 }
 if (normalized >= 0.4) {
 return 'needs-review';
 }
 return 'needs-learning';
}
/**
 * Calculate a composite score from multiple components
 * Handles missing or invalid component scores gracefully
 * 
 * @param components - Object with score components
 * @returns Normalized composite score [0, 1]
 */
export function calculateCompositeScore(components: {
 recall?: number;
 confidence?: number;
 speed?: number;
 accuracy?: number;
 weights?: {
 recall?: number;
 confidence?: number;
 speed?: number;
 accuracy?: number;
 };
}): number {
 const {
 recall,
 confidence,
 speed,
 accuracy,
 weights = {
 recall: 0.4,
 confidence: 0.3,
 speed: 0.15,
 accuracy: 0.15
 }
 } = components;
 let totalScore = 0;
 let totalWeight = 0;
 // Add each component if valid
 if (recall !== null && recall !== undefined && !isNaN(recall)) {
 totalScore += normalizeScore(recall) * (weights.recall || 0);
 totalWeight += weights.recall || 0;
 }
 if (confidence !== null && confidence !== undefined && !isNaN(confidence)) {
 totalScore += normalizeScore(confidence) * (weights.confidence || 0);
 totalWeight += weights.confidence || 0;
 }
 if (speed !== null && speed !== undefined && !isNaN(speed)) {
 totalScore += normalizeScore(speed) * (weights.speed || 0);
 totalWeight += weights.speed || 0;
 }
 if (accuracy !== null && accuracy !== undefined && !isNaN(accuracy)) {
 totalScore += normalizeScore(accuracy) * (weights.accuracy || 0);
 totalWeight += weights.accuracy || 0;
 }
 // Avoid division by zero
 if (totalWeight === 0) {
 console.warn('[ScoreUtils] No valid score components, returning 0');
 return 0;
 }
 // Normalize by actual weight used
 return totalScore / totalWeight;
}
/**
 * Validate score boundaries for testing
 * Returns true if score is exactly on a boundary
 */
export function isOnBoundary(score: number): boolean {
 const normalized = normalizeScore(score);
 return normalized === 0.4 || normalized === 0.8;
}
/**
 * Get human-readable status message
 */
export function getStatusMessage(status: ScoreStatus): string {
 switch (status) {
 case 'mastered':
 return 'Excellent! You\'ve mastered this concept.';
 case 'needs-review':
 return 'Good progress! Review this concept to solidify your understanding.';
 case 'needs-learning':
 return 'Let\'s learn this concept together.';
 }
}
/**
 * Format score as percentage string
 */
export function formatScore(score: number | null | undefined): string {
 const normalized = normalizeScore(score);
 return `${Math.round(normalized * 100)}%`;
}