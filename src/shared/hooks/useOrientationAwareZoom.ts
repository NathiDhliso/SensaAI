/**
 * Custom hook for orientation-aware zoom controls
 * 
 * Provides zoom functionality that adapts to screen orientation:
 * - Portrait: Allows more vertical zoom range
 * - Landscape: Allows more horizontal zoom range
 * - Smooth transitions between orientation changes
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getScreenOrientation, type ScreenOrientation } from '@/shared/utils/layout-utils';
interface ViewState {
 x: number;
 y: number;
 scale: number;
}
interface ZoomControls {
 view: ViewState;
 zoomIn: () => void;
 zoomOut: () => void;
 resetZoom: () => void;
 setView: (view: ViewState) => void;
 orientation: ScreenOrientation;
}
// Orientation-specific zoom limits
const ZOOM_LIMITS = {
 portrait: { min: 0.2, max: 2.0 },
 landscape: { min: 0.15, max: 1.8 }
};
// Default initial zoom
const DEFAULT_ZOOM = 0.35;
// Zoom step multiplier
const ZOOM_STEP = 1.2;
/**
 * Hook for orientation-aware zoom controls
 * @param initialZoom Initial zoom level (default: 0.35)
 * @returns Zoom controls and current view state
 */
export function useOrientationAwareZoom(initialZoom: number = DEFAULT_ZOOM): ZoomControls {
 const [orientation, setOrientation] = useState<ScreenOrientation>(getScreenOrientation());
 const [view, setView] = useState<ViewState>({
 x: 0,
 y: 0,
 scale: initialZoom
 });
 // Listen for orientation changes
 useEffect(() => {
 const handleOrientationChange = () => {
 const newOrientation = getScreenOrientation();
 setOrientation(newOrientation);
 // Adjust zoom if it exceeds new orientation's limits
 setView(prevView => {
 const limits = ZOOM_LIMITS[newOrientation];
 const clampedScale = Math.max(limits.min, Math.min(limits.max, prevView.scale));
 if (clampedScale !== prevView.scale) {
 return { ...prevView, scale: clampedScale };
 }
 return prevView;
 });
 };
 window.addEventListener('resize', handleOrientationChange);
 window.addEventListener('orientationchange', handleOrientationChange);
 return () => {
 window.removeEventListener('resize', handleOrientationChange);
 window.removeEventListener('orientationchange', handleOrientationChange);
 };
 }, []);
 // Get current zoom limits based on orientation
 const currentLimits = useMemo(() => ZOOM_LIMITS[orientation], [orientation]);
 // Zoom in handler
 const zoomIn = useCallback(() => {
 setView(prevView => ({
 ...prevView,
 scale: Math.min(prevView.scale * ZOOM_STEP, currentLimits.max)
 }));
 }, [currentLimits.max]);
 // Zoom out handler
 const zoomOut = useCallback(() => {
 setView(prevView => ({
 ...prevView,
 scale: Math.max(prevView.scale / ZOOM_STEP, currentLimits.min)
 }));
 }, [currentLimits.min]);
 // Reset zoom to default
 const resetZoom = useCallback(() => {
 setView({
 x: 0,
 y: 0,
 scale: DEFAULT_ZOOM
 });
 }, []);
 return {
 view,
 zoomIn,
 zoomOut,
 resetZoom,
 setView,
 orientation
 };
}