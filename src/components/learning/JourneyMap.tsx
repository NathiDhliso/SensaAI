import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import { renderShapeOrIcon } from '@/components/ui';
import styles from './JourneyMap.module.css';

interface JourneyMapProps {
  onConceptClick?: (conceptId: string) => void;
}

/**
 * Extract emoji from anchor string
 */
function getAnchorEmoji(anchor?: string): string | null {
  if (!anchor) return null;
  const match = anchor.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u);
  return match ? match[0] : null;
}

/**
 * Extract anchor name without emoji
 */
function getAnchorName(anchor?: string): string | null {
  if (!anchor) return null;
  const name = anchor.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
  return name.startsWith('The ') ? name : `The ${name}`;
}

export default function JourneyMap({ onConceptClick }: JourneyMapProps) {
  const { currentSession, getStageStatus, getConceptStatus, getStages, getConcepts } = useLearningStore();

  const stages = useMemo(() => getStages(), [getStages]);
  const concepts = useMemo(() => getConcepts(), [getConcepts]);
  const currentConceptRef = useRef<HTMLDivElement>(null);
  const completedCount = currentSession?.progress?.completedConcepts?.length ?? 0;
  const totalCount = concepts.length;

  const [expandedStages, setExpandedStages] = useState<Set<string>>(() => {
    const currentStage = stages.find(s => getStageStatus(s.id) === 'current');
    return new Set(currentStage ? [currentStage.id] : []);
  });

  useEffect(() => {
    if (currentConceptRef.current) {
      currentConceptRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }
  }, [currentSession?.progress?.currentConceptId]);

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  };

  const handleConceptClick = (conceptId: string) => {
    const status = getConceptStatus(conceptId);
    if (status !== 'locked' && onConceptClick) {
      onConceptClick(conceptId);
    }
  };

  const stageData = useMemo(() => {
    return [...stages].reverse().map(stage => {
      const status = getStageStatus(stage.id);
      const stageConcepts = concepts.filter(c => c.stageId === stage.id);
      const completedInStage = stageConcepts.filter(c => getConceptStatus(c.id) === 'completed').length;

      return { stage, status, stageConcepts, completedInStage };
    });
  }, [stages, concepts, getStageStatus, getConceptStatus]);

  if (stages.length === 0 || concepts.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🏗️</div>
        <p className={styles.emptyText}>Generate content to start building your knowledge</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.scaffolding}>
        <div className={styles.buildingFrame}>
          {stageData.map(({ stage, status, stageConcepts, completedInStage }) => {
            const isExpanded = expandedStages.has(stage.id);

            const floorClass = [
              styles.floor,
              status === 'completed' && styles.floorCompleted,
              status === 'current' && styles.floorCurrent,
              status === 'locked' && styles.floorLocked,
              !isExpanded && styles.floorCollapsed,
            ].filter(Boolean).join(' ');

            return (
              <div key={stage.id} className={floorClass}>
                <button
                  className={styles.floorHeader}
                  onClick={() => toggleStage(stage.id)}
                >
                  <span className={styles.expandIcon}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                  <span className={styles.floorNumber}>{stage.order}</span>
                  <span className={styles.floorName}>{stage.name}</span>
                  <span className={styles.floorProgress}>
                    {completedInStage}/{stageConcepts.length}
                  </span>
                </button>
                {isExpanded && (
                  <div className={styles.floorContent}>
                    <div className={styles.blocks}>
                      {stageConcepts.map((concept) => {
                        const conceptStatus = getConceptStatus(concept.id);
                        const isCurrent = concept.id === currentSession?.progress?.currentConceptId;
                        
                        // Mnemonic-first display
                        const emoji = getAnchorEmoji(concept.mnemonic?.anchor);
                        const anchorName = getAnchorName(concept.mnemonic?.anchor);
                        const hasMnemonic = !!concept.mnemonic;
                        
                        // Tier-based styling
                        const tierClass = concept.mnemonic?.tier 
                          ? styles[`block${concept.mnemonic.tier}`] 
                          : '';
                        
                        const blockClass = [
                          styles.block,
                          conceptStatus === 'completed' && styles.blockCompleted,
                          conceptStatus === 'current' && styles.blockCurrent,
                          conceptStatus === 'available' && styles.blockAvailable,
                          conceptStatus === 'locked' && styles.blockLocked,
                          tierClass,
                        ].filter(Boolean).join(' ');

                        return (
                          <div
                            key={concept.id}
                            ref={isCurrent ? currentConceptRef : null}
                            className={blockClass}
                            onClick={() => handleConceptClick(concept.id)}
                            title={hasMnemonic ? `${anchorName} → ${concept.name}` : concept.name}
                          >
                            {/* Show emoji or icon */}
                            {emoji ? (
                              <span className={styles.blockEmoji}>{emoji}</span>
                            ) : (
                              renderShapeOrIcon(concept.icon, 'sm', styles.blockIcon)
                            )}
                            
                            {/* Primary: Mnemonic name, Secondary: Technical name */}
                            {hasMnemonic ? (
                              <div className={styles.blockLabels}>
                                <span className={styles.blockPrimary}>{anchorName}</span>
                                <span className={styles.blockSecondary}>{concept.name}</span>
                              </div>
                            ) : (
                              <span className={styles.blockName}>{concept.name}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className={styles.foundation}>
          <span>🏗️ Your Knowledge Foundation</span>
        </div>
      </div>
      <div className={styles.progressPanel}>
        <div className={styles.progressRing}>
          <svg viewBox="0 0 100 100">
            <circle
              className={styles.progressBg}
              cx="50"
              cy="50"
              r="45"
            />
            <circle
              className={styles.progressFill}
              cx="50"
              cy="50"
              r="45"
              strokeDasharray={`${(completedCount / totalCount) * 283} 283`}
            />
          </svg>
          <div className={styles.progressText}>
            <span className={styles.progressCount}>{completedCount}</span>
            <span className={styles.progressTotal}>/{totalCount}</span>
          </div>
        </div>
        <div className={styles.progressLabel}>Concepts Mastered</div>
      </div>
    </div>
  );
}
