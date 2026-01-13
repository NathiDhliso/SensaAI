import { useState } from 'react';
import { Check, Lightbulb } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import { renderShapeOrIcon } from '@/components/ui';
import SpeedReaderBar from '@/components/ui/SpeedReaderBar';

import styles from './ConceptCard.module.css';

interface ConceptCardProps {
  conceptId: string;
  onComplete: () => void;
}

export default function ConceptCard({ conceptId, onComplete }: ConceptCardProps) {
  const [activeTab, setActiveTab] = useState<'why' | 'how' | 'details'>('why');
  const { getConceptStatus, getConcepts } = useLearningStore();

  const concepts = getConcepts();
  const concept = concepts.find(c => c.id === conceptId);
  if (!concept) return null;

  const status = getConceptStatus(conceptId);
  const isCompleted = status === 'completed';

  const handleComplete = () => {
    if (!isCompleted) {
      onComplete();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.conceptHeader}>
        {renderShapeOrIcon(concept.icon, '2xl', styles.conceptIcon)}
        <div className={styles.conceptInfo}>
          <div className={styles.titleRow}>
            <h1 className={styles.conceptName}>{concept.name}</h1>
            {concept.cognitiveLevel && (
              <span className={`${styles.bloomBadge} ${styles[concept.cognitiveLevel]}`}>
                {concept.cognitiveLevel.toUpperCase()}
              </span>
            )}
          </div>
          <p className={styles.metaphor}>{concept.metaphor}</p>
        </div>
        {isCompleted && (
          <div className={styles.completedBadge}>
            <Check size={16} />
          </div>
        )}
      </div>

      {/* Speed Reader Timer - encourages 2-minute pace */}
      <div className={styles.speedReaderSection}>
        <SpeedReaderBar
          conceptId={conceptId}
          targetTimeSeconds={120}
          paused={isCompleted}
        />
      </div>

      <p className={styles.hookSentence}>{concept.hookSentence}</p>

      {concept.logicalConnection && (
        <div className={styles.connectionBadge}>
          <Lightbulb size={14} />
          <span>{concept.logicalConnection}</span>
        </div>
      )}

      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'why' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('why')}
        >
          Why
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'how' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('how')}
        >
          How
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'details' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'why' && (
          <div className={styles.whyContent}>
            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>Why You Need This</h3>
              <p className={styles.cardText}>{concept.whyYouNeed}</p>
            </div>
            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>Real-World Example</h3>
              <p className={styles.cardText}>{concept.realWorldExample}</p>
            </div>
          </div>
        )}

        {activeTab === 'how' && (
          <div className={styles.howContent}>
            {concept.howToUse ? (
              <ol className={styles.stepList}>
                {concept.howToUse.map((step, index) => (
                  <li key={index} className={styles.stepItem}>
                    <span className={styles.stepNum}>{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        )}

        {activeTab === 'details' && (
          <div className={styles.detailsContent}>
            <p className={styles.technicalText}>{concept.technicalDetails}</p>
            {concept.prerequisites && concept.prerequisites.length > 0 && (
              <div className={styles.prereqSection}>
                <h4 className={styles.prereqTitle}>Prerequisites</h4>
                <div className={styles.prereqList}>
                  {concept.prerequisites?.map((prereq, idx) => (
                    <span key={idx} className={styles.prereqBadge}>{prereq}</span>
                  ))}
                </div>
              </div>
            )}
            {concept.commonPitfalls && concept.commonPitfalls.length > 0 && (
              <div className={styles.pitfallsSection}>
                <h4 className={styles.pitfallsTitle}>Critical Clarifications</h4>
                <ul className={styles.pitfallsList}>
                  {concept.commonPitfalls.map((pitfall, idx) => (
                    <li key={idx} className={styles.pitfallItem}>
                      <Lightbulb size={14} className={styles.pitfallIcon} />
                      <span>{pitfall}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.actionBar}>
        {isCompleted ? (
          <div className={styles.masteredStatus}>
            <Check size={18} />
            <span>Mastered</span>
          </div>
        ) : (
          <button className={styles.actionButton} onClick={handleComplete}>
            {concept.actionButtonText || 'Mark as Complete'}
          </button>
        )}
      </div>
    </div>
  );
}
