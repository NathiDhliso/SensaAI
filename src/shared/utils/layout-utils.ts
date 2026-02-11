/**
 * Layout Utilities for Concept Map Visualization
 * 
 * Provides collision detection, overlap resolution, and responsive sizing
 * calculations for the SensaSynopticView component.
 */
export interface NodePosition {
 id: string;
 x: number;
 y: number;
 radius: number;
}
export interface NodeDimensions {
 width: number;
 height: number;
}
export type ScreenOrientation = 'portrait' | 'landscape';
export type TierType = 'trunk' | 'branch' | 'leaf';
/**
 * Detect if two circular nodes overlap
 * @param node1 First node with position and radius
 * @param node2 Second node with position and radius
 * @param minDistance Minimum distance between node edges (default: 0)
 * @returns true if nodes overlap or are too close
 */
export function nodesOverlap(
 node1: { x: number; y: number; radius: number },
 node2: { x: number; y: number; radius: number },
 minDistance: number = 0
): boolean {
 const dx = node2.x - node1.x;
 const dy = node2.y - node1.y;
 const distance = Math.sqrt(dx * dx + dy * dy);
 const minAllowedDistance = node1.radius + node2.radius + minDistance;
 return distance < minAllowedDistance;
}
/**
 * Calculate optimal node size based on zoom level and screen orientation
 * @param baseSize Base size in pixels
 * @param zoomLevel Current zoom scale (e.g., 0.35, 1.0, 1.5)
 * @param orientation Screen orientation
 * @param tier Node tier type
 * @returns Object with width and height
 */
export function calculateNodeSize(
 baseSize: number,
 zoomLevel: number,
 orientation: ScreenOrientation,
 tier: TierType
): NodeDimensions {
 // Inverse scaling: as zoom increases, base size can decrease slightly
 // This prevents nodes from becoming too large when zoomed in
 const zoomFactor = 1 / Math.sqrt(Math.max(zoomLevel, 0.1));
 // Orientation multipliers
 const orientationMultipliers = {
 portrait: { width: 0.85, height: 1.15 }, // Taller nodes
 landscape: { width: 1.15, height: 0.85 } // Wider nodes
 };
 const multiplier = orientationMultipliers[orientation];
 // Tier-specific size adjustments
 const tierMultipliers: Record<TierType, number> = {
 trunk: 1.0,
 branch: 1.17,
 leaf: 0.83
 };
 const tierFactor = tierMultipliers[tier];
 // Calculate final dimensions
 const width = baseSize * zoomFactor * multiplier.width * tierFactor;
 const height = baseSize * zoomFactor * multiplier.height * tierFactor;
 return { width, height };
}
/**
 * Resolve node overlaps using force-directed approach
 * Iteratively pushes overlapping nodes apart until no overlaps remain
 * @param nodes Array of nodes with positions and radii
 * @param maxIterations Maximum number of iterations to prevent infinite loops
 * @param minSpacing Minimum spacing between node edges
 * @returns Array of nodes with adjusted positions
 */
export function resolveOverlaps(
 nodes: NodePosition[],
 maxIterations: number = 100,
 minSpacing: number = 150
): NodePosition[] {
 if (nodes.length === 0) return nodes;
 // Create mutable copy
 const adjustedNodes = nodes.map(n => ({ ...n }));
 for (let iteration = 0; iteration < maxIterations; iteration++) {
 let hasOverlap = false;
 // Check all pairs of nodes
 for (let i = 0; i < adjustedNodes.length; i++) {
 for (let j = i + 1; j < adjustedNodes.length; j++) {
 const node1 = adjustedNodes[i];
 const node2 = adjustedNodes[j];
 if (nodesOverlap(node1, node2, minSpacing)) {
 hasOverlap = true;
 // Calculate repulsion vector
 const dx = node2.x - node1.x;
 const dy = node2.y - node1.y;
 const distance = Math.sqrt(dx * dx + dy * dy);
 // Avoid division by zero
 if (distance < 0.1) {
 // Nodes are at same position, push in random direction
 const angle = Math.random() * 2 * Math.PI;
 node2.x += Math.cos(angle) * 10;
 node2.y += Math.sin(angle) * 10;
 continue;
 }
 // Calculate how much to push apart
 const minAllowedDistance = node1.radius + node2.radius + minSpacing;
 const overlap = minAllowedDistance - distance;
 // Normalize direction vector
 const nx = dx / distance;
 const ny = dy / distance;
 // Push both nodes apart (half the overlap each)
 const pushDistance = overlap / 2;
 node1.x -= nx * pushDistance;
 node1.y -= ny * pushDistance;
 node2.x += nx * pushDistance;
 node2.y += ny * pushDistance;
 }
 }
 }
 // If no overlaps detected, we're done
 if (!hasOverlap) {
 break;
 }
 }
 return adjustedNodes;
}
/**
 * Get current screen orientation
 * @returns 'portrait' or 'landscape'
 */
export function getScreenOrientation(): ScreenOrientation {
 if (typeof window === 'undefined') return 'landscape';
 // Use matchMedia for reliable orientation detection
 const isPortrait = window.matchMedia('(orientation: portrait)').matches;
 return isPortrait ? 'portrait' : 'landscape';
}
/**
 * Calculate distance between two points
 * @param x1 First point x coordinate
 * @param y1 First point y coordinate
 * @param x2 Second point x coordinate
 * @param y2 Second point y coordinate
 * @returns Euclidean distance
 */
export function calculateDistance(
 x1: number,
 y1: number,
 x2: number,
 y2: number
): number {
 const dx = x2 - x1;
 const dy = y2 - y1;
 return Math.sqrt(dx * dx + dy * dy);
}
/**
 * Constrain a point within canvas boundaries
 * @param x X coordinate
 * @param y Y coordinate
 * @param canvasSize Canvas dimension
 * @param margin Margin from edges
 * @returns Constrained coordinates
 */
export function constrainToCanvas(
 x: number,
 y: number,
 canvasSize: number,
 margin: number = 100
): { x: number; y: number } {
 return {
 x: Math.max(margin, Math.min(canvasSize - margin, x)),
 y: Math.max(margin, Math.min(canvasSize - margin, y))
 };
}
