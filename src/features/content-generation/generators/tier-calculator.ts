/**
 * Tier calculation utilities for Mind Palace Floor Plan layout.
 * Determines concept importance based on dependency count.
 */
export type Tier = 'Root' | 'Trunk' | 'Leaf';
/**
 * Tier thresholds based on dependent count.
 * These values determine how concepts are classified:
 * - Foundation: Core concepts many others depend on (bedrock)
 * - Keystone: Major functional blocks (workers)
 * - Utility: Specialized tools/add-ons (accessories)
 * 
 * Thresholds are set relatively low to ensure good distribution
 * even with smaller graphs or sparse dependency data.
 */
export const TIER_THRESHOLDS = {
 ROOT: 4,
 TRUNK: 2
} as const;
/**
 * Treemap weighting based on tier.
 * Foundation concepts get 4x the visual area of Utility concepts.
 */
export const TIER_WEIGHTS = {
 Root: 4,
 Trunk: 2,
 Leaf: 1
} as const;
/**
 * Calculate tier based on how many concepts depend on this one.
 * Higher dependent count = more foundational = larger visual presence.
 * 
 * @param dependentCount - Number of concepts that depend on this one
 * @returns The calculated tier
 */
export function calculateTier(dependentCount: number): Tier {
 if (dependentCount >= TIER_THRESHOLDS.ROOT) return 'Root';
 if (dependentCount >= TIER_THRESHOLDS.TRUNK) return 'Trunk';
 return 'Leaf';
}
/**
 * Get treemap weight for a tier.
 * Used by d3-hierarchy to size rectangles in Floor Plan view.
 * 
 * @param tier - The tier to get weight for
 * @returns Weight multiplier for treemap sizing
 */
export function getTierWeight(tier: Tier): number {
 return TIER_WEIGHTS[tier];
}
/**
 * Calculate centrality score (0-1) based on total connections.
 * Higher score = more central/important in the graph.
 * 
 * @param totalConnections - Sum of dependent + dependency counts
 * @param maxConnections - Maximum connections in the graph
 * @returns Normalized centrality score 0-1
 */
export function calculateCentralityScore(
 totalConnections: number,
 maxConnections: number
): number {
 if (maxConnections === 0) return 0;
 return Math.min(1, totalConnections / maxConnections);
}