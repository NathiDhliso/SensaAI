/**
 * PredictionSkeleton Component
 * 
 * ORIENT Phase - Medium Energy Variant (Moderate Working Memory)
 * Cognitive Goal: Build prediction schema
 * Method: Scaffolded predictions with structure
 * 
 * Neuroscience: Medium WM allows prediction without full generation.
 * Provides structure to reduce cognitive load while still engaging prediction.
 */

import { useState } from 'react';
import { Lightbulb, ArrowRight } from 'lucide-react';
import type { LearningConcept, StudySession } from '@/shared/types/learning';
import styles from './Orient.module.css';

interface PredictionSkeletonProps {
  concepts: LearningConcept[];
  session: StudySession;
  onComplete: () => void;
}

const PREDICTION_OPTIONS = [
  { value: '', label: 'Make a prediction...' },
  { value: 'setup', label: 'Setting up or configuring' },
  { value: 'action', label: 'Taking an action' },
  { value: 'monitoring', label: 'Checking or verifying' },
  { value: 'troubleshooting', label: 'Fixing problems' },
  { value: 'security', label: 'Security or permissions' },
  { value: 'optimization', label: 'Improving performance' }
];

export function PredictionSkeleton({
  concepts,
  onComplete
}: PredictionSkeletonProps) {
  const [predictions, setPredictions] = useState<Record<string, string>>({});
  
  // Check if user has made predictions for at least half the concepts
  const predictionCount = Object.values(predictions).filter(p => p !== '').length;
  const requiredPredictions = Math.ceil(concepts.length / 2);
  const canContinue = predictionCount >= requiredPredictions;

  return (
    <div className={styles.orientContainer}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <Lightbulb className={styles.icon} />
        </div>
        <h2 className={styles.title}>What Do You Expect?</h2>
        <p className={styles.subtitle}>
          Here's the structure we'll cover. What do you think each part means?
          Making predictions helps your brain prepare to learn.
        </p>
      </div>

      <div className={styles.content}>
        {concepts.map((concept) => (
          <div key={concept.id} className={styles.conceptPreview}>
            <div className={styles.conceptHeader}>
              {concept.icon && (
                <span className={styles.conceptIcon}>{concept.icon}</span>
              )}
              <h3 className={styles.conceptName}>{concept.name}</h3>
            </div>
            
            {concept.hookSentence && (
              <p className={styles.hook}>{concept.hookSentence}</p>
            )}
            
            <div className={styles.predictionPrompt}>
              <label htmlFor={`prediction-${concept.id}`}>
                What do you expect this concept covers?
              </label>
              <select
                id={`prediction-${concept.id}`}
                className={styles.predictionSelect}
                value={predictions[concept.id] || ''}
                onChange={(e) => setPredictions({
                  ...predictions,
                  [concept.id]: e.target.value
                })}
                aria-label={`Prediction for ${concept.name}`}
              >
                {PREDICTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <button
          className={styles.continueButton}
          onClick={onComplete}
          disabled={!canContinue}
          aria-label="Continue to learning"
        >
          Continue to Learning
          <ArrowRight className={styles.buttonIcon} />
        </button>
        {!canContinue && (
          <p className={styles.hint}>
            Make predictions for at least {requiredPredictions} concepts to continue
            ({predictionCount}/{requiredPredictions})
          </p>
        )}
      </div>
    </div>
  );
}
