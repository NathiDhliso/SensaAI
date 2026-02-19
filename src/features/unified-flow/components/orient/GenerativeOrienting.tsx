/**
 * GenerativeOrienting Component
 * 
 * ORIENT Phase - High Energy Variant (High Working Memory)
 * Cognitive Goal: Full generative schema building
 * Method: Scout + predict + question generation
 * 
 * Neuroscience: High WM enables deep generative processing.
 * Full exploration creates strongest encoding foundation.
 */

import { useState } from 'react';
import { Compass, Lightbulb, HelpCircle, ArrowRight } from 'lucide-react';
import type { LearningConcept, StudySession } from '@/shared/types/learning';
import styles from './Orient.module.css';

interface GenerativeOrientingProps {
  concepts: LearningConcept[];
  session: StudySession;
  onComplete: () => void;
}

type TabType = 'scout' | 'predict' | 'question';

export function GenerativeOrienting({
  concepts,
  onComplete
}: GenerativeOrientingProps) {
  const [activeTab, setActiveTab] = useState<TabType>('scout');
  const [scoutNotes, setScoutNotes] = useState<Record<string, string>>({});
  const [predictions, setPredictions] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<Record<string, string[]>>({});
  
  // Check if user has engaged with each tab
  const hasScoutNotes = Object.values(scoutNotes).some(n => n.trim().length > 0);
  const hasPredictions = Object.values(predictions).some(p => p.trim().length > 0);
  const hasQuestions = Object.values(questions).some(q => q.length > 0);
  
  const canContinue = hasScoutNotes && hasPredictions && hasQuestions;

  const addQuestion = (conceptId: string) => {
    const currentQuestions = questions[conceptId] || [];
    setQuestions({
      ...questions,
      [conceptId]: [...currentQuestions, '']
    });
  };

  const updateQuestion = (conceptId: string, index: number, value: string) => {
    const currentQuestions = questions[conceptId] || [];
    const updated = [...currentQuestions];
    updated[index] = value;
    setQuestions({
      ...questions,
      [conceptId]: updated
    });
  };

  const removeQuestion = (conceptId: string, index: number) => {
    const currentQuestions = questions[conceptId] || [];
    const updated = currentQuestions.filter((_, i) => i !== index);
    setQuestions({
      ...questions,
      [conceptId]: updated
    });
  };

  return (
    <div className={styles.orientContainer}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <Compass className={styles.icon} />
        </div>
        <h2 className={styles.title}>Scout the Territory</h2>
        <p className={styles.subtitle}>
          Explore the concepts, make predictions, and generate questions.
          This deep engagement creates the strongest foundation for learning.
        </p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'scout' ? styles.active : ''}`}
          onClick={() => setActiveTab('scout')}
          aria-label="Scout tab"
        >
          <Compass style={{ width: 16, height: 16, display: 'inline', marginRight: 4 }} />
          Scout
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'predict' ? styles.active : ''}`}
          onClick={() => setActiveTab('predict')}
          aria-label="Predict tab"
        >
          <Lightbulb style={{ width: 16, height: 16, display: 'inline', marginRight: 4 }} />
          Predict
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'question' ? styles.active : ''}`}
          onClick={() => setActiveTab('question')}
          aria-label="Question tab"
        >
          <HelpCircle style={{ width: 16, height: 16, display: 'inline', marginRight: 4 }} />
          Question
        </button>
      </div>

      <div className={styles.content}>
        {/* Scout Tab */}
        {activeTab === 'scout' && (
          <>
            <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-secondary, #666)' }}>
              Survey the concepts. What patterns do you notice?
            </p>
            {concepts.map((concept) => (
              <div key={concept.id} className={styles.scoutCard}>
                <h3 className={styles.conceptName}>{concept.name}</h3>
                {concept.hookSentence && (
                  <p className={styles.hook}>{concept.hookSentence}</p>
                )}
                <textarea
                  className={styles.responseArea}
                  placeholder="Your observations, connections, patterns..."
                  value={scoutNotes[concept.id] || ''}
                  onChange={(e) => setScoutNotes({
                    ...scoutNotes,
                    [concept.id]: e.target.value
                  })}
                  rows={3}
                  aria-label={`Scout notes for ${concept.name}`}
                />
              </div>
            ))}
          </>
        )}

        {/* Predict Tab */}
        {activeTab === 'predict' && (
          <>
            <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-secondary, #666)' }}>
              Based on your scouting, predict what each concept will teach.
            </p>
            {concepts.map((concept) => (
              <div key={concept.id} className={styles.predictionCard}>
                <h3 className={styles.conceptName}>{concept.name}</h3>
                <textarea
                  className={styles.responseArea}
                  placeholder="What do you think this concept covers? How might it work?"
                  value={predictions[concept.id] || ''}
                  onChange={(e) => setPredictions({
                    ...predictions,
                    [concept.id]: e.target.value
                  })}
                  rows={3}
                  aria-label={`Prediction for ${concept.name}`}
                />
              </div>
            ))}
          </>
        )}

        {/* Question Tab */}
        {activeTab === 'question' && (
          <>
            <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-secondary, #666)' }}>
              Generate questions you want answered.
            </p>
            {concepts.map((concept) => (
              <div key={concept.id} className={styles.predictionCard}>
                <h3 className={styles.conceptName}>{concept.name}</h3>
                {(questions[concept.id] || []).map((question, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      className={styles.responseArea}
                      style={{ flex: 1, padding: '0.5rem' }}
                      placeholder="What question do you have?"
                      value={question}
                      onChange={(e) => updateQuestion(concept.id, index, e.target.value)}
                      aria-label={`Question ${index + 1} for ${concept.name}`}
                    />
                    <button
                      onClick={() => removeQuestion(concept.id, index)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'var(--color-error, #d32f2f)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      aria-label="Remove question"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addQuestion(concept.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--color-primary, #1976d2)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginTop: '0.5rem'
                  }}
                  aria-label={`Add question for ${concept.name}`}
                >
                  + Add Question
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      <div className={styles.footer}>
        <button
          className={styles.continueButton}
          onClick={onComplete}
          disabled={!canContinue}
          aria-label="Begin learning"
        >
          Begin Learning
          <ArrowRight className={styles.buttonIcon} />
        </button>
        {!canContinue && (
          <p className={styles.hint}>
            Complete all three tabs to continue
            {!hasScoutNotes && ' • Scout'}
            {!hasPredictions && ' • Predict'}
            {!hasQuestions && ' • Question'}
          </p>
        )}
      </div>
    </div>
  );
}
