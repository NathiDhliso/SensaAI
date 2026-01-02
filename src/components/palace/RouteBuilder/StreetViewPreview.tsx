import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Check, RotateCcw, AlertTriangle, MapPin, Trash2, Settings2, Wand2 } from 'lucide-react';
import { createStreetViewPanorama } from '@/lib/google-maps';
import type { CustomPlacement } from './types';
import styles from './StreetViewPreview.module.css';

interface StreetViewPreviewProps {
  isOpen: boolean;
  coordinates: { lat: number; lng: number };
  locationName: string;
  panoId?: string;
  onConfirm: (heading: number, placements: CustomPlacement[]) => void;
  onCancel: () => void;
  onReject: () => void;
  maxPlacements?: number;
}

// Auto-generated placement positions (relative to base heading)
const AUTO_PLACEMENTS = [
  { label: 'Front Center', headingOffset: 0, pitch: 0 },
  { label: 'Front Left', headingOffset: -45, pitch: 0 },
  { label: 'Front Right', headingOffset: 45, pitch: 0 },
  { label: 'Left Side', headingOffset: -90, pitch: 0 },
  { label: 'Right Side', headingOffset: 90, pitch: 0 },
  { label: 'Behind', headingOffset: 180, pitch: 0 },
];

const PLACEMENT_LABELS = [
  'Spot 1',
  'Spot 2', 
  'Spot 3',
  'Spot 4',
  'Spot 5',
  'Spot 6',
];

export function StreetViewPreview({
  isOpen,
  coordinates,
  locationName,
  panoId,
  onConfirm,
  onCancel,
  onReject,
  maxPlacements = 6,
}: StreetViewPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [currentPitch, setCurrentPitch] = useState(0);
  const [baseHeading, setBaseHeading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isCustomizeMode, setIsCustomizeMode] = useState(false);
  const [placements, setPlacements] = useState<CustomPlacement[]>([]);

  // Generate automatic placements based on the current heading
  const generateAutoPlacements = useCallback((_heading: number): CustomPlacement[] => {
    return AUTO_PLACEMENTS.map((p, idx) => ({
      id: `auto-placement-${idx}`,
      label: p.label,
      headingOffset: p.headingOffset,
      pitch: p.pitch,
    }));
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsCustomizeMode(false);
      setPlacements([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    setIsLoading(true);
    setError(null);

    const initPanorama = async () => {
      // Wait for container to have dimensions
      let retries = 0;
      const maxRetries = 10;
      while (retries < maxRetries) {
        const container = containerRef.current;
        if (container && container.offsetWidth > 0 && container.offsetHeight > 0) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }

      const container = containerRef.current;
      if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
        setError('Preview container not ready');
        setIsLoading(false);
        return;
      }

      try {
        const panorama = createStreetViewPanorama({
          container: container,
          lat: coordinates.lat,
          lng: coordinates.lng,
          heading: 0,
          panoId,
        });

        if (panorama) {
          panoramaRef.current = panorama;
          
          panorama.addListener('pov_changed', () => {
            const pov = panorama.getPov();
            setCurrentHeading(pov.heading || 0);
            setCurrentPitch(pov.pitch || 0);
          });

          panorama.addListener('status_changed', () => {
            const status = panorama.getStatus();
            if (status === google.maps.StreetViewStatus.OK) {
              setIsLoading(false);
            } else {
              setError('Street View is not available at this exact location');
              setIsLoading(false);
            }
          });

          setTimeout(() => setIsLoading(false), 1500);
        } else {
          setError('Failed to load Street View');
          setIsLoading(false);
        }
      } catch (err) {
        setError('Failed to initialize Street View');
        setIsLoading(false);
      }
    };

    initPanorama();

    return () => {
      if (panoramaRef.current) {
        google.maps.event.clearInstanceListeners(panoramaRef.current);
        panoramaRef.current = null;
      }
    };
  }, [isOpen, coordinates, panoId]);

  // Quick confirm - auto-generate placements and confirm immediately
  const handleQuickConfirm = () => {
    const autoPlacements = generateAutoPlacements(currentHeading);
    onConfirm(currentHeading, autoPlacements);
  };

  // Enter customize mode to manually adjust placements
  const handleEnterCustomizeMode = () => {
    setBaseHeading(currentHeading);
    setPlacements(generateAutoPlacements(currentHeading));
    setIsCustomizeMode(true);
  };

  const handleAddPlacement = useCallback(() => {
    if (placements.length >= maxPlacements) return;
    
    const headingOffset = currentHeading - baseHeading;
    const newPlacement: CustomPlacement = {
      id: `placement-${Date.now()}`,
      label: PLACEMENT_LABELS[placements.length] || `Spot ${placements.length + 1}`,
      headingOffset,
      pitch: currentPitch,
    };
    setPlacements(prev => [...prev, newPlacement]);
  }, [placements.length, maxPlacements, currentHeading, baseHeading, currentPitch]);

  const handleRemovePlacement = (id: string) => {
    setPlacements(prev => prev.filter(p => p.id !== id));
  };

  const handleGoToPlacement = (placement: CustomPlacement) => {
    if (panoramaRef.current) {
      panoramaRef.current.setPov({
        heading: baseHeading + placement.headingOffset,
        pitch: placement.pitch,
      });
    }
  };

  const handleFinalConfirm = () => {
    onConfirm(baseHeading, placements);
  };

  const resetView = () => {
    if (panoramaRef.current) {
      panoramaRef.current.setPov({ heading: isCustomizeMode ? baseHeading : 0, pitch: 0 });
    }
  };

  const handleBack = () => {
    setIsCustomizeMode(false);
    setPlacements([]);
  };

  if (!isOpen) return null;

  return (
    <div 
      className={styles.overlay}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <motion.div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h3 className={styles.title}>
              {isCustomizeMode ? 'Customize Placement Spots' : 'Confirm Location'}
            </h3>
            <p className={styles.subtitle}>{locationName}</p>
          </div>
          <button className={styles.closeButton} onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.streetViewWrapper}>
            <div 
              className={styles.streetViewContainer} 
              ref={containerRef}
            >
              {isLoading && (
                <div className={styles.loading}>
                  <div className={styles.spinner} />
                  <span>Loading Street View...</span>
                </div>
              )}
              {error && (
                <div className={styles.error}>
                  <AlertTriangle size={32} />
                  <span>{error}</span>
                </div>
              )}
              {isCustomizeMode && (
                <div className={styles.crosshair}>
                  <MapPin size={24} />
                </div>
              )}
            </div>

            {isCustomizeMode && (
              <div className={styles.placementsSidebar}>
                <div className={styles.placementsHeader}>
                  <span>Placement Spots ({placements.length}/{maxPlacements})</span>
                </div>
                <div className={styles.placementsList}>
                  {placements.map((p, idx) => (
                    <div key={p.id} className={styles.placementItem}>
                      <button
                        className={styles.placementGoTo}
                        onClick={() => handleGoToPlacement(p)}
                      >
                        <span className={styles.placementNum}>{idx + 1}</span>
                        <span className={styles.placementLabel}>{p.label}</span>
                      </button>
                      <button
                        className={styles.placementRemove}
                        onClick={() => handleRemovePlacement(p.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {placements.length < maxPlacements && (
                  <button
                    className={styles.addPlacementBtn}
                    onClick={handleAddPlacement}
                  >
                    <MapPin size={16} />
                    Add Custom Spot
                  </button>
                )}
              </div>
            )}
          </div>

          <div className={styles.instructions}>
            {isCustomizeMode ? (
              <p>
                <strong>Customize:</strong> Click on spots in the list to preview them. Remove or add custom spots as needed.
              </p>
            ) : (
              <p>
                <strong>Tip:</strong> Look around to find the best starting view. 6 memory spots will be auto-generated around this view.
              </p>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          {isCustomizeMode ? (
            <>
              <button className={styles.resetButton} onClick={handleBack}>
                Back
              </button>
              <div className={styles.footerRight}>
                <button className={styles.resetButton} onClick={resetView}>
                  <RotateCcw size={16} />
                  Reset View
                </button>
                <button
                  className={styles.confirmButton}
                  onClick={handleFinalConfirm}
                  disabled={placements.length < 1}
                >
                  <Check size={16} />
                  Confirm ({placements.length} spots)
                </button>
              </div>
            </>
          ) : (
            <>
              <button className={styles.rejectButton} onClick={onReject}>
                <AlertTriangle size={16} />
                Wrong Location
              </button>
              <div className={styles.footerRight}>
                <button className={styles.resetButton} onClick={handleEnterCustomizeMode}>
                  <Settings2 size={16} />
                  Customize Spots
                </button>
                <button
                  className={styles.confirmButton}
                  onClick={handleQuickConfirm}
                  disabled={isLoading || !!error}
                >
                  <Wand2 size={16} />
                  Confirm Location
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
