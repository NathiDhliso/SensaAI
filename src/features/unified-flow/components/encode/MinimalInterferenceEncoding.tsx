import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { LearningConcept, StudySession } from '@/shared/types/learning';
import styles from './Encode.module.css';

interface MinimalInterferenceEncodingProps {
  concepts: LearningConcept[];
  session: StudySession;
  onComplete: () => void;
}

export function MinimalInterferenceEncoding({ concepts, onComplete }: MinimalInterferenceEncodingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = concepts[currentIndex];

  const handleNext = () => {
    if (currentIndex < concepts.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.progress}>
        {currentIndex + 1} of {concepts.length}
      </div>

      <div className={styles.minimalCard}>
        <h2>{current.name}</h2>
        <p className={styles.hook}>{current.hookSentence}</p>
        <p className={styles.why}>{current.whyYouNeed}</p>
        
        {current.metaphor && (
          <div className={styles.metaphor}>
            <span className={styles.icon}>💡</span>
            <p>{current.metaphor}</p>
          </div>
        )}
      </div>

      <button onClick={handleNext} className={styles.button}>
        {currentIndex < concepts.length - 1 ? 'Continue' : 'Complete'}
        <ArrowRight size={20} />
      </button>
    </div>
  );
}
