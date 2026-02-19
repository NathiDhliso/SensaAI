import { useState, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import type { LearningConcept, StudySession } from '@/shared/types/learning';
import { generateTransferChallenges } from '../../utils/question-generators';
import styles from './Verify.module.css';

interface FreeRecallTransferProps {
  concepts: LearningConcept[];
  session: StudySession;
  onComplete: () => void;
}

export function FreeRecallTransfer({ concepts, onComplete }: FreeRecallTransferProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [response, setResponse] = useState('');

  const challenges = useMemo(() => generateTransferChallenges(concepts), [concepts]);
  const current = challenges[currentIndex];

  const handleNext = () => {
    if (currentIndex < challenges.length - 1) {
      setCurrentIndex(i => i + 1);
      setResponse('');
    } else {
      onComplete();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Mastery Challenge</h2>
        <p>Apply what you've learned to new scenarios</p>
      </div>

      <div className={styles.progress}>
        {currentIndex + 1} of {challenges.length}
      </div>

      <div className={styles.card}>
        <h3>{current.scenario}</h3>
        <p className={styles.prompt}>{current.prompt}</p>
        
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Explain your approach..."
          rows={8}
          className={styles.textarea}
        />
        
        <div className={styles.requirements}>
          <p>Your answer should include:</p>
          <ul>
            {current.requirements.map((req, idx) => (
              <li key={idx}>{req}</li>
            ))}
          </ul>
        </div>
      </div>

      <button 
        onClick={handleNext}
        disabled={response.length < 50}
        className={styles.button}
      >
        {currentIndex < challenges.length - 1 ? 'Next Challenge' : 'Complete'}
        <ArrowRight size={20} />
      </button>
    </div>
  );
}
