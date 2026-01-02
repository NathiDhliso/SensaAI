import { useState } from 'react';
import { X, Zap, Settings, Activity, Eye, Sparkles, Lock, Unlock } from 'lucide-react';
import type { MarkerPosition } from '@/lib/google-maps';
import styles from './ConceptTooltip.module.css';

interface ConceptTooltipProps {
  marker: MarkerPosition;
  onClose: () => void;
  onViewDetails?: () => void;
}

export default function ConceptTooltip({ marker, onClose, onViewDetails }: ConceptTooltipProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);

  const phase1Label = marker.lifecycleLabels?.phase1 || 'Phase 1';
  const phase2Label = marker.lifecycleLabels?.phase2 || 'Phase 2';
  const phase3Label = marker.lifecycleLabels?.phase3 || 'Phase 3';

  const hasMnemonic = !!marker.mnemonic;

  // Extract anchor name without emoji for display - "The Night Guard" style
  const anchorDisplayName = (() => {
    const name = marker.mnemonic?.anchor
      ?.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
      .trim() || '';
    return name.startsWith('The ') ? name : `The ${name}`;
  })();

  // Extract emoji for prominent display
  const anchorEmoji = marker.mnemonic?.anchor
    ?.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u)?.[0] || '🎯';

  // Handle reveal with animation
  const handleReveal = () => {
    setIsRevealing(true);
    // Delay the full reveal for dramatic effect
    setTimeout(() => {
      setIsRevealed(true);
      setIsRevealing(false);
    }, 600);
  };

  return (
    <div className={styles.tooltipOverlay}>
      <div className={`${styles.tooltip} ${isRevealed ? styles.tooltipRevealed : ''}`}>
        <button className={styles.closeButton} onClick={onClose}>
          <X size={16} />
        </button>

        {/* THE STORY REVEAL EXPERIENCE */}
        {hasMnemonic && !isRevealed ? (
          <>
            {/* Top Section: The Mnemonic Character */}
            <div className={styles.anchorHeader}>
              <span className={styles.anchorEmoji}>{anchorEmoji}</span>
              <div className={styles.anchorInfo}>
                <h3 className={styles.anchorTitle}>{anchorDisplayName}</h3>
                <span className={styles.tierBadge} data-tier={marker.mnemonic?.tier}>
                  {marker.mnemonic?.tier === 'Foundation' ? '🏔️ Foundation' :
                   marker.mnemonic?.tier === 'Keystone' ? '🎭 Keystone' :
                   '🔧 Utility'}
                </span>
              </div>
            </div>

            {/* The Story Block - Core of the Experience */}
            <blockquote className={styles.storyBlock}>
              <p>"{marker.mnemonic?.story}"</p>
              {marker.mnemonic?.parentName && (
                <cite className={styles.parentLink}>
                  → Connected to: {marker.mnemonic.parentName}
                </cite>
              )}
            </blockquote>

            {/* Middle Section: The Mystery - Blurred Concept */}
            <div className={`${styles.mysterySection} ${isRevealing ? styles.revealing : ''}`}>
              <div className={styles.mysteryLabel}>
                <Lock size={14} />
                <span>What does this represent?</span>
              </div>
              <div className={styles.blurredContent}>
                <span className={styles.blurredText}>{marker.conceptName}</span>
              </div>
            </div>

            {/* Reveal Button - The Call to Action */}
            <button
              className={`${styles.revealButton} ${isRevealing ? styles.revealing : ''}`}
              onClick={handleReveal}
              disabled={isRevealing}
            >
              {isRevealing ? (
                <>
                  <Sparkles size={16} className={styles.sparkleAnim} />
                  Revealing...
                </>
              ) : (
                <>
                  <Unlock size={16} />
                  Reveal the Concept
                </>
              )}
            </button>
          </>
        ) : (
          <>
            {/* POST-REVEAL: The Full Answer */}
            {hasMnemonic && (
              <div className={styles.revealedHeader}>
                <span className={styles.miniEmoji}>{anchorEmoji}</span>
                <span className={styles.revealedMapping}>
                  {anchorDisplayName} =
                </span>
              </div>
            )}

            {/* Concept Name - The Payoff */}
            <h3 className={styles.title}>{marker.conceptName}</h3>

            {/* Lifecycle Phases - Technical Details */}
            <div className={styles.lifecycleGrid}>
              <div className={styles.phaseCard}>
                <div className={styles.phaseHeader}>
                  <Zap size={14} className={styles.phase1Icon} />
                  <span>{phase1Label}</span>
                </div>
                <ul className={styles.phaseList}>
                  {marker.lifecycle.phase1.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.phaseCard}>
                <div className={styles.phaseHeader}>
                  <Settings size={14} className={styles.phase2Icon} />
                  <span>{phase2Label}</span>
                </div>
                <ul className={styles.phaseList}>
                  {marker.lifecycle.phase2.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.phaseCard}>
                <div className={styles.phaseHeader}>
                  <Activity size={14} className={styles.phase3Icon} />
                  <span>{phase3Label}</span>
                </div>
                <ul className={styles.phaseList}>
                  {marker.lifecycle.phase3.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {onViewDetails && (
              <button className={styles.detailsButton} onClick={onViewDetails}>
                <Eye size={14} />
                View in Sidebar
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

