/**
 * PriorKnowledgeActivation Component
 * 
 * ORIENT Phase - Tired Variant (Low Working Memory)
 * Cognitive Goal: Activate existing schemas
 * Method: Retrieval cues for prior knowledge
 * 
 * Neuroscience: Low WM capacity requires activating existing schemas
 * rather than building new ones. Reduces competing demands on working memory.
 */

import { useState } from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';
import type { LearningConcept, StudySession } from '@/shared/types/learning';
import styles from './Orient.module.css';

interface PriorKnowledgeActivationProps {
  concepts: LearningConcept[];
  session: StudySession;
  onComplete: () => void;
}

export function PriorKnowledgeActivation({
  concepts,
  onComplete
}: PriorKnowledgeActivationProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  
  // Show first 3 concepts for activation (avoid overwhelming)
  const conceptsToActivate = concepts.slice(0, 3);
  
  // Check if user has engaged with at least one concept
  const hasEngaged = Object.values(responses).some(r => r.trim().length > 0);

  return (
    <div className={styles.orientContainer}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <BookOpen className={styles.icon} />
        </div>
        <h2 className={styles.title}>Let's Connect to What You Know</h2>
        <p className={styles.subtitle}>
          Before we dive in, let's activate your existing knowledge.
          This helps your brain prepare to learn new information.
        </p>
      </div>

      <div className={styles.content}>
        {conceptsToActivate.map((concept) => (
          <div key={concept.id} className={styles.retrievalPrompt}>
            <h3 className={styles.conceptName}>{concept.name}</h3>
            <p className={styles.promptText}>
              What do you already know about {concept.name}?
            </p>
            <textarea
              className={styles.responseArea}
              value={responses[concept.id] || ''}
              onChange={(e) => setResponses({
                ...responses,
                [concept.id]: e.target.value
              })}
              placeholder="Any prior experience, related concepts, or questions..."
              rows={3}
              aria-label={`Your knowledge about ${concept.name}`}
            />
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <button
          className={styles.continueButton}
          onClick={onComplete}
          disabled={!hasEngaged}
          aria-label="Continue to next phase"
        >
          Continue
          <ArrowRight className={styles.buttonIcon} />
        </button>
        {!hasEngaged && (
          <p className={styles.hint}>
            Share what you know about at least one concept to continue
          </p>
        )}
      </div>
    </div>
  );
}
