import { useState, useRef, useCallback, useMemo } from 'react';
import { MapPin, GripVertical } from 'lucide-react';
import type { MarkerPosition } from '@/lib/google-maps';
import styles from './ConceptMarker.module.css';

interface ConceptMarkerProps {
  marker: MarkerPosition;
  isActive: boolean;
  onClick: () => void;
  scale?: number;
  hideTooltip?: boolean;
  editMode?: boolean;
  onDragEnd?: (conceptId: string, deltaX: number, deltaY: number) => void;
}

/**
 * Extract emoji from anchor string, or fall back to first letter
 */
function getMarkerIcon(anchor?: string, conceptName?: string): string {
  if (!anchor) return conceptName?.[0]?.toUpperCase() || '?';

  // Regex to find emoji in string (supports most emoji including compounds)
  const emojiMatch = anchor.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u);
  return emojiMatch ? emojiMatch[0] : anchor[0].toUpperCase();
}

/**
 * Get scale and z-index based on dependency tier
 */
function getTierStyles(tier?: 'Foundation' | 'Keystone' | 'Utility'): { tierScale: number; zIndex: number } {
  switch (tier) {
    case 'Foundation':
      return { tierScale: 1.4, zIndex: 30 };
    case 'Keystone':
      return { tierScale: 1.0, zIndex: 20 };
    case 'Utility':
      return { tierScale: 0.7, zIndex: 10 };
    default:
      return { tierScale: 1.0, zIndex: 20 };
  }
}

export default function ConceptMarker({
  marker,
  isActive,
  onClick,
  scale = 1,
  hideTooltip = false,
  editMode = false,
  onDragEnd,
}: ConceptMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });

  // Mnemonic-based rendering
  const markerIcon = useMemo(
    () => getMarkerIcon(marker.mnemonic?.anchor, marker.conceptName),
    [marker.mnemonic?.anchor, marker.conceptName]
  );

  const { tierScale, zIndex } = useMemo(
    () => getTierStyles(marker.mnemonic?.tier),
    [marker.mnemonic?.tier]
  );

  // Extract anchor name without emoji for hover label
  const hoverLabel = useMemo(() => {
    if (marker.mnemonic?.anchor) {
      // Remove emoji from anchor for display text
      return marker.mnemonic.anchor.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
    }
    return marker.conceptName;
  }, [marker.mnemonic?.anchor, marker.conceptName]);

  // Tier-based CSS class
  const tierClass = marker.mnemonic?.tier
    ? styles[`marker${marker.mnemonic.tier}`] || ''
    : '';

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setDragOffset({ x: 0, y: 0 });

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [editMode]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;

    if (onDragEnd && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      onDragEnd(marker.conceptId, deltaX, deltaY);
    }

    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, [isDragging, onDragEnd, marker.conceptId]);

  if (!marker.visible) return null;

  const showLabel = isActive || isHovered;
  const combinedScale = scale * tierScale;

  return (
    <div
      className={`${styles.marker} ${tierClass} ${isActive ? styles.markerActive : ''} ${isHovered ? styles.markerHovered : ''} ${editMode ? styles.markerEditable : ''} ${isDragging ? styles.markerDragging : ''}`}
      style={{
        left: marker.x + dragOffset.x,
        top: marker.y + dragOffset.y,
        transform: `translate(-50%, -50%) scale(${combinedScale})`,
        cursor: editMode ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        zIndex,
      }}
      onClick={editMode ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {editMode && (
        <div className={styles.dragHandle}>
          <GripVertical size={12} />
        </div>
      )}
      <div className={styles.markerPin}>
        {marker.mnemonic ? (
          <span className={styles.markerEmoji}>{markerIcon}</span>
        ) : (
          <>
            <MapPin size={20} />
            <span className={styles.markerNumber}>
              {markerIcon}
            </span>
          </>
        )}
      </div>

      {!hideTooltip && showLabel && (
        <div className={styles.markerLabel}>
          {marker.mnemonic ? (
            <strong>{hoverLabel}</strong>
          ) : (
            marker.conceptName
          )}
        </div>
      )}
    </div>
  );
}
