import { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import type { LearningConcept, StudySession } from '@/shared/types/learning';
import { generateMCQuestions } from '../../utils/question-generators';
import styles from './Verify.module.css';

interface RecognitionTasksProps {
  concepts: LearningConcept[];
  session: StudySession;
  onComplete: () => void;
}

export function RecognitionTasks({ concepts, onComplete }: RecognitionTasksProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const questions = useMemo(() => generateMCQuestions(concepts), [concepts]);
  const current = questions[currentIndex];

  const handleSelect = (optionIndex: number) => {
    setSelectedOption(optionIndex);
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(i => i + 1);
        setSelectedOption(null);
      } else {
        onComplete();
      }
    }, 500);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Quick Recognition Check</h2>
        <p>Testing strengthens memory, even when it feels easy</p>
      </div>

      <div className={styles.progress}>
        {currentIndex + 1} of {questions.length}
      </div>

      <div className={styles.card}>
        <p className={styles.question}>{current.question}</p>
        <div className={styles.options}>
          {current.options.map((option, idx) => (
            <button
              key={idx}
              className={`${styles.option} ${selectedOption === idx ? styles.selected : ''}`}
              onClick={() => handleSelect(idx)}
            >
              {option}
              {selectedOption === idx && <Check size={20} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
