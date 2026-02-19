import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { LearningConcept, StudySession } from '@/shared/types/learning';
import styles from './Encode.module.css';

interface RetrievalPracticeProps {
  concepts: LearningConcept[];
  session: StudySession;
  onComplete: () => void;
}

export function RetrievalPractice({ concepts, session, onComplete }: RetrievalPracticeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [response, setResponse] = useState('');

  const completedConcepts = concepts.filter(c => 
    session.conceptsCompleted?.includes(c.id)
  );

  const reviewConcepts = completedConcepts.length > 0 ? completedConcepts : concepts.slice(0, 3);
  const current = reviewConcepts[currentIndex];

  const handleNext = () => {
    if (currentIndex < reviewConcepts.length - 1) {
      setCurrentIndex(i => i + 1);
      setResponse('');
    } else {
      onComplete();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Retrieval Practice</h2>
        <p>Retrieving strengthens memory more than re-reading</p>
      </div>

      <div className={styles.progress}>
        {currentIndex + 1} of {reviewConcepts.length}
      </div>

      <div className={styles.card}>
        <h3>{current.name}</h3>
        <p className={styles.prompt}>Without looking, what do you remember about this concept?</p>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Write what you remember..."
          rows={6}
          className={styles.textarea}
        />
      </div>

      <button onClick={handleNext} className={styles.button}>
        {currentIndex < reviewConcepts.length - 1 ? 'Next' : 'Complete'}
        <ArrowRight size={20} />
      </button>
    </div>
  );
}
