/**
 * ConceptChunks - Miller's Law compliant concept grouping
 * 
 * Groups concepts by tier (Foundation/Keystone/Utility) to reduce cognitive load.
 * Shows 7±2 items at a time with expandable sections.
 * 
 * Research: Miller (1956) - "The Magical Number Seven, Plus or Minus Two"
 */

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Layers, Gem, Wrench, Play } from 'lucide-react';
import type { LearningConcept } from '@/lib/types/learning';
import { renderShapeOrIcon } from '@/components/ui';
import styles from './ConceptChunks.module.css';

export interface ConceptChunksProps {
  /** All concepts to display */
  concepts: LearningConcept[];
  /** Maximum items to show per chunk before collapsing */
  maxVisiblePerChunk?: number;
  /** Callback when concept is clicked */
  onConceptClick?: (conceptId: string) => void;
  /** Callback when "Start Learning" is clicked for a chunk */
  onStartChunk?: (tier: string, conceptIds: string[]) => void;
  /** Show start learning buttons */
  showStartButtons?: boolean;
}

interface TierConfig {
  key: 'Foundation' | 'Keystone' | 'Utility';
  label: string;
  icon: typeof Layers;
  color: string;
  bgColor: string;
  description: string;
}

const TIER_CONFIG: TierConfig[] = [
  {
    key: 'Foundation',
    label: 'Foundation',
    icon: Layers,
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.1)',
    description: 'Core concepts with 4+ dependents. Learn these first.',
  },
  {
    key: 'Keystone',
    label: 'Keystone',
    icon: Gem,
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    description: 'Bridge concepts connecting foundations to utilities.',
  },
  {
    key: 'Utility',
    label: 'Utility',
    icon: Wrench,
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    description: 'Practical tools and techniques. Build on prerequisites.',
  },
];

export function ConceptChunks({
  concepts,
  maxVisiblePerChunk = 5,
  onConceptClick,
  onStartChunk,
  showStartButtons = true,
}: ConceptChunksProps) {
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set(['Foundation']));

  // Group concepts by tier
  const groupedConcepts = useMemo(() => {
    const groups: Record<string, LearningConcept[]> = {
      Foundation: [],
      Keystone: [],
      Utility: [],
    };

    concepts.forEach(concept => {
      const tier = concept.mnemonic?.tier || 'Utility';
      if (groups[tier]) {
        groups[tier].push(concept);
      } else {
        groups.Utility.push(concept);
      }
    });

    return groups;
  }, [concepts]);

  // Calculate summary stats
  const stats = useMemo(() => ({
    total: concepts.length,
    foundation: groupedConcepts.Foundation.length,
    keystone: groupedConcepts.Keystone.length,
    utility: groupedConcepts.Utility.length,
  }), [concepts.length, groupedConcepts]);

  const toggleTier = (tier: string) => {
    setExpandedTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) {
        next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  };

  const handleStartChunk = (tier: TierConfig) => {
    const conceptIds = groupedConcepts[tier.key].map(c => c.id);
    onStartChunk?.(tier.key, conceptIds);
  };

  return (
    <div className={styles.container}>
      {/* Summary Bar */}
      <div className={styles.summaryBar}>
        <span className={styles.summaryLabel}>
          <strong>{stats.total}</strong> concepts organized by learning priority
        </span>
        <div className={styles.summaryStats}>
          <span className={styles.statBadge} style={{ color: '#FFD700' }}>
            {stats.foundation} Foundation
          </span>
          <span className={styles.statBadge} style={{ color: '#8B5CF6' }}>
            {stats.keystone} Keystone
          </span>
          <span className={styles.statBadge} style={{ color: '#F59E0B' }}>
            {stats.utility} Utility
          </span>
        </div>
      </div>

      {/* Tier Chunks */}
      <div className={styles.chunks}>
        {TIER_CONFIG.map(tier => {
          const tierConcepts = groupedConcepts[tier.key];
          const isExpanded = expandedTiers.has(tier.key);
          const hasMore = tierConcepts.length > maxVisiblePerChunk;
          const visibleConcepts = isExpanded
            ? tierConcepts
            : tierConcepts.slice(0, maxVisiblePerChunk);

          if (tierConcepts.length === 0) return null;

          return (
            <div
              key={tier.key}
              className={styles.chunk}
              style={{
                '--tier-color': tier.color,
                '--tier-bg': tier.bgColor,
              } as React.CSSProperties}
            >
              {/* Chunk Header */}
              <div
                className={styles.chunkHeader}
                onClick={() => toggleTier(tier.key)}
                aria-expanded={isExpanded}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    toggleTier(tier.key);
                    e.preventDefault();
                  }
                }}
              >
                <div className={styles.chunkTitle}>
                  <tier.icon size={20} className={styles.tierIcon} />
                  <span className={styles.tierLabel}>{tier.label}</span>
                  <span className={styles.tierCount}>({tierConcepts.length})</span>
                </div>
                <div className={styles.chunkActions}>
                  {showStartButtons && (
                    <button
                      className={styles.startButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartChunk(tier);
                      }}
                      title={`Start learning ${tier.label} concepts`}
                    >
                      <Play size={14} />
                      Start
                    </button>
                  )}
                  {hasMore && (
                    isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />
                  )}
                </div>
              </div>

              {/* Tier Description */}
              <p className={styles.tierDescription}>{tier.description}</p>

              {/* Concept List */}
              <div className={styles.conceptList}>
                {visibleConcepts.map(concept => (
                  <button
                    key={concept.id}
                    className={styles.conceptItem}
                    onClick={() => onConceptClick?.(concept.id)}
                    title={concept.metaphor || concept.name}
                  >
                    <span className={styles.conceptIcon}>
                      {renderShapeOrIcon(concept.icon || '💡', 'sm')}
                    </span>
                    <span className={styles.conceptName}>{concept.name}</span>
                    {concept.mnemonic?.dependsOn && concept.mnemonic.dependsOn.length > 0 && (
                      <span className={styles.dependencyBadge}>
                        ↑{concept.mnemonic.dependsOn.length}
                      </span>
                    )}
                  </button>
                ))}

                {/* Show More / Show Less */}
                {hasMore && (
                  <button
                    className={styles.toggleButton}
                    onClick={() => toggleTier(tier.key)}
                  >
                    {isExpanded
                      ? `Show less`
                      : `+${tierConcepts.length - maxVisiblePerChunk} more`
                    }
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Learning Tip */}
      <div className={styles.learningTip}>
        <strong>💡 Tip:</strong> Start with Foundation concepts - they unlock the most connections.
      </div>
    </div>
  );
}

export default ConceptChunks;
