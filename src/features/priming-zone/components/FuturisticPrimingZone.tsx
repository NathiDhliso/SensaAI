/**
 * Futuristic Priming Zone - Main Container
 * The immersive glassmorphism entry point for the ULC Matrix
 * Dynamically detects and displays ULC patterns from generated content
 */

import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import GlassMatrixTable from './GlassMatrixTable';
import PrimingDrillDownCard from './PrimingDrillDownCard';
import type { ConceptMatrix, MatrixCell } from '../types';
import { detectULCPattern } from '../detector';
import { azureBlueprint } from '../azure-blueprint';
import styles from './FuturisticPrimingZone.module.css';

interface FuturisticPrimingZoneProps {
  onClose?: () => void;
  /** Optional: Provide pre-built matrix (for testing) */
  matrix?: ConceptMatrix;
  /** Dynamic: Provide learning concepts to detect pattern */
  concepts?: LearningConcept[];
}

export default function FuturisticPrimingZone({
  onClose,
  matrix: providedMatrix,
  concepts,
}: FuturisticPrimingZoneProps) {
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null);
  const [detectedMatrix, setDetectedMatrix] = useState<ConceptMatrix | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Detect ULC pattern from concepts
  useEffect(() => {
    if (concepts && concepts.length > 0) {
      setIsDetecting(true);
      const detected = detectULCPattern(concepts);
      setDetectedMatrix(detected);
      setIsDetecting(false);
    }
  }, [concepts]);

  // Use provided matrix, detected matrix, or fallback to Azure blueprint
  const activeMatrix = providedMatrix || detectedMatrix || azureBlueprint;

  const handleCellClick = (cell: MatrixCell) => {
    setSelectedCell(cell);
  };

  const handleCloseDrillDown = () => {
    setSelectedCell(null);
  };

  // Show detection state
  if (isDetecting) {
    return (
      <div className={styles.primingZone}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.titleSection}>
              <h1 className={styles.title}>Analyzing Pattern...</h1>
              <p className={styles.subtitle}>Detecting ULC structure</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show no pattern detected
  if (concepts && !detectedMatrix) {
    return (
      <div className={styles.primingZone}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.titleSection}>
              <AlertCircle size={28} />
              <div>
                <h1 className={styles.title}>No ULC Pattern Detected</h1>
                <p className={styles.subtitle}>
                  This content doesn't follow a Universal Life Cycle structure
                </p>
              </div>
            </div>
            {onClose && (
              <button onClick={onClose} className={styles.closeButton}>
                <X size={24} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.primingZone}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>Futuristic Priming Zone</h1>
            <p className={styles.subtitle}>
              {activeMatrix.domain} • Integrated ULC Matrix
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className={styles.closeButton}
              aria-label="Close Priming Zone"
            >
              <X size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Matrix Table */}
      <div className={styles.matrixContainer}>
        <GlassMatrixTable
          matrix={activeMatrix}
          onCellClick={handleCellClick}
          selectedCell={selectedCell}
        />
      </div>

      {/* Drill-Down Card (Z-Axis) */}
      {selectedCell && (
        <PrimingDrillDownCard
          cell={selectedCell}
          onClose={handleCloseDrillDown}
        />
      )}
    </div>
  );
}
