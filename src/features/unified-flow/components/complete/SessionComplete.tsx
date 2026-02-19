import { CheckCircle } from 'lucide-react';
import type { LearningConcept, StudySession } from '@/shared/types/learning';
import styles from './Complete.module.css';

interface SessionCompleteProps {
  concepts: LearningConcept[];
  session: StudySession;
  onComplete: () => void;
}

function getMethodDescription(adaptations: any): string {
  const methods = [];
  
  if (adaptations?.orientMode === 'prior-knowledge') {
    methods.push('prior knowledge activation');
  } else if (adaptations?.orientMode === 'generative') {
    methods.push('generative orienting');
  }
  
  if (adaptations?.encodeMode === 'retrieval') {
    methods.push('retrieval practice');
  } else if (adaptations?.encodeMode === 'interleaved') {
    methods.push('interleaved learning');
  }
  
  return methods.length > 0 ? methods.join(', ') : 'standard learning';
}

export function SessionComplete({ session, onComplete }: SessionCompleteProps) {
  return (
    <div className={styles.container}>
      <div className={styles.celebration}>
        <CheckCircle size={64} className={styles.icon} />
        <h2>Session Complete!</h2>
      </div>

      <div className={styles.summary}>
        <h3>What You Accomplished</h3>
        <ul>
          <li>
            <strong>Concepts covered:</strong> {session.conceptsCompleted?.length || 0}
          </li>
          <li>
            <strong>Learning method:</strong> {getMethodDescription(session.adaptations)}
          </li>
        </ul>
      </div>

      <div className={styles.consolidation}>
        <h3>What Happens Next</h3>
        <p>
          Your brain will consolidate these concepts while you sleep, 
          making new connections and strengthening memories. You might 
          wake up with new questions or insights — that's your brain working!
        </p>
        
        <div className={styles.sleepTip}>
          <span className={styles.sleepIcon}>💤</span>
          <p>
            Getting good sleep tonight will help lock in what you learned. 
            Your brain replays and strengthens these memories during sleep.
          </p>
        </div>
      </div>

      <button onClick={onComplete} className={styles.button}>
        Finish
      </button>
    </div>
  );
}
