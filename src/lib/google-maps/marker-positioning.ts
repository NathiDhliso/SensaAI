import { normalizeHeading } from './street-view-loader';
import type { PlacedConcept, PlacementSlot } from '../types/palace';
import type { MnemonicContext } from '../types/learning';

export interface MarkerPosition {
  conceptId: string;
  conceptName: string;
  x: number;
  y: number;
  heading: number;
  pitch: number;
  visible: boolean;
  lifecycle: {
    phase1: string[];
    phase2: string[];
    phase3: string[];
  };
  slotLocation?: string;
  lifecycleLabels?: {
    phase1: string;
    phase2: string;
    phase3: string;
  };
  /** Memory Palace mnemonic context for tier-scaled rendering */
  mnemonic?: MnemonicContext;
}

export interface PositionConfig {
  containerWidth: number;
  containerHeight: number;
  currentHeading: number;
  currentPitch: number;
  fov: number;
  buildingHeading?: number;
}

export function calculateMarkerPositions(
  placements: PlacedConcept[],
  slots: PlacementSlot[],
  config: PositionConfig
): MarkerPosition[] {
  const { containerWidth, containerHeight, currentHeading, currentPitch, fov, buildingHeading = 0 } = config;
  const halfFov = fov / 2;

  return placements.map((concept, index) => {
    const slot = slots.find(s => s.id === concept.slotId);

    const slotHeadingOffset = slot?.headingOffset ?? (index * 30 - 60);
    const slotPitch = slot?.pitch ?? 0;

    const absoluteHeading = normalizeHeading(buildingHeading + slotHeadingOffset);
    const relativeHeading = normalizeHeading(absoluteHeading - currentHeading);
    const adjustedHeading = relativeHeading > 180 ? relativeHeading - 360 : relativeHeading;

    const visible = Math.abs(adjustedHeading) <= halfFov + 20;

    const x = ((adjustedHeading + halfFov) / fov) * containerWidth;

    const pitchDiff = slotPitch - currentPitch;
    const y = (containerHeight / 2) - (pitchDiff / 45) * (containerHeight / 2);

    return {
      conceptId: concept.conceptId,
      conceptName: concept.conceptName,
      x: Math.max(20, Math.min(containerWidth - 20, x)),
      y: Math.max(40, Math.min(containerHeight - 40, y)),
      heading: absoluteHeading,
      pitch: slotPitch,
      visible,
      lifecycle: concept.lifecycle,
      slotLocation: slot?.location,
      mnemonic: concept.mnemonic,
    };
  });
}

export function getMarkerScale(relativeHeading: number): number {
  const absHeading = Math.abs(relativeHeading);
  if (absHeading > 90) return 0.6;
  if (absHeading > 60) return 0.8;
  if (absHeading > 30) return 0.9;
  return 1;
}
