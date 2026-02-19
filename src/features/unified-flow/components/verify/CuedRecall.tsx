import { useState, useMemo } from 'react';
import { HelpCircle, ArrowRight } from 'lucide-react';
import type { LearningConcept, StudySession } from '@/shared/types/learning';
import { generateCuedQuestions } from '../../utils/question-generators';
import styles from './Verify.module.css';

interface CuedRecallProps {
  concepts: LearningConcept[];
  session: StudySession;
  onComplete: () => void;
}

export function CuedRecall({ concepts, onComplete }: CuedRecallProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [showHint, setShowHint] = useState(false);

  const questions = useMemo(() => generateCuedQuestions(concepts), [concepts]);
  const current = questions[currentIndex];

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setResponse('');
      setShowHint(false);
    } else {
      onComplete();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Recall Challenge</h2>
        <p>Try to recall without hints first</p>
      </div>

      <div className={styles.progress}>
        {currentIndex + 1} of {questions.length}
      </div>

      <div className={styles.card}>
        <p className={styles.cue}>{current.cue}</p>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Your answer..."
          rows={6}
          className={styles.textarea}
        />
        
        {!showHint && (
          <button 
            className={styles.hintButton}
            onClick={() => setShowHint(true)}
          >
            <HelpCircle size={16} />
            Need a hint?
          </button>
        )}
        
        {showHint && (
          <div className={styles.hint}>
            <p>{current.hint}</p>
          </div>
        )}
      </div>

      <button onClick={handleNext} className={styles.button}>
        {currentIndex < questions.length - 1 ? 'Next' : 'Complete'}
        <ArrowRight size={20} />
      </button>
    </div>
  );
}
