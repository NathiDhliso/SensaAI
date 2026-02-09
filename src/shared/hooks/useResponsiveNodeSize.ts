/**
 * Custom hook for responsive node sizing based on zoom level and screen orientation
 * 
 * Automatically calculates node dimensions that adapt to:
 * - Current zoom level
 * - Screen orientation (portrait vs landscape)
 * - Node tier type
 */
import { useState, useEffect, useMemo } from 'react';
import { calculateNodeSize, getScreenOrientation, type ScreenOrientation, type TierType } from '@/shared/utils/layout-utils';
interface NodeSizeConfig {
 width: number;
 height: number;
 fontSize: number;
}
// Base node sizes (matching current implementation)
const BASE_SIZES: Record<TierType, number> = {
 root: 120,
 trunk: 140,
 leaf: 100
};
// Font size ranges for readability
const FONT_SIZE_RANGES: Record<TierType, { min: number; max: number; base: number }> = {
 root: { min: 11, max: 16, base: 13 },
 trunk: { min: 12, max: 18, base: 14 },
 leaf: { min: 10, max: 14, base: 11 }
};
/**
 * Hook to calculate responsive node size based on zoom and orientation
 * @param zoomLevel Current zoom scale (e.g., 0.35, 1.0, 1.5)
 * @param tier Node tier type
 * @returns Object with width, height, and fontSize
 */
export function useResponsiveNodeSize(
 zoomLevel: number,
 tier: TierType
): NodeSizeConfig {
 const [orientation, setOrientation] = useState<ScreenOrientation>(getScreenOrientation());
 // Listen for orientation changes
 useEffect(() => {
 const handleOrientationChange = () => {
 setOrientation(getScreenOrientation());
 };
 // Listen to both resize and orientationchange events
 window.addEventListener('resize', handleOrientationChange);
 window.addEventListener('orientationchange', handleOrientationChange);
 return () => {
 window.removeEventListener('resize', handleOrientationChange);
 window.removeEventListener('orientationchange', handleOrientationChange);
 };
 }, []);
 // Calculate dimensions based on current state
 const dimensions = useMemo(() => {
 const baseSize = BASE_SIZES[tier];
 const { width, height } = calculateNodeSize(baseSize, zoomLevel, orientation, tier);
 // Calculate responsive font size
 const fontRange = FONT_SIZE_RANGES[tier];
 // Font size inversely scales with zoom (larger when zoomed out for readability)
 const fontSizeMultiplier = Math.max(0.8, Math.min(1.5, 1 / Math.sqrt(zoomLevel)));
 const fontSize = Math.max(
 fontRange.min,
 Math.min(fontRange.max, fontRange.base * fontSizeMultiplier)
 );
 return {
 width: Math.round(width),
 height: Math.round(height),
 fontSize: Math.round(fontSize)
 };
 }, [zoomLevel, orientation, tier]);
 return dimensions;
}
/**
 * Hook to get all node sizes for all tiers at once
 * Useful for rendering multiple node types
 * @param zoomLevel Current zoom scale
 * @returns Object with sizes for all tiers
 */
export function useAllNodeSizes(zoomLevel: number): Record<TierType, NodeSizeConfig> {
 const rootSize = useResponsiveNodeSize(zoomLevel, 'root');
 const trunkSize = useResponsiveNodeSize(zoomLevel, 'trunk');
 const leafSize = useResponsiveNodeSize(zoomLevel, 'leaf');
 return {
 root: rootSize,
 trunk: trunkSize,
 leaf: leafSize
 };
}