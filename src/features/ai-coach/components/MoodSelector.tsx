/**
 * MoodSelector - Pre-Session Mood Selection Modal
 * 
 * Allows users to select their current mood/energy level before starting
 * a learning session. The AI Coach will adjust its messaging based on this.
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { usePersonalizationStore } from '@/store/personalization-store';
import { getAllPersonas } from '@/features/ai-coach';
import styles from './MoodSelector.module.css';

export type Mood = 'pumped' | 'good' | 'okay' | 'struggling' | 'tired';

interface MoodOption {
  id: Mood;
  emoji: string;
  label: string;
  description: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  {
    id: 'pumped',
    emoji: '🔥',
    label: 'Pumped',
    description: 'Ready to crush it!',
  },
  {
    id: 'good',
    emoji: '😊',
    label: 'Good',
    description: 'Feeling focused',
  },
  {
    id: 'okay',
    emoji: '😐',
    label: 'Okay',
    description: 'Could use motivation',
  },
  {
    id: 'struggling',
    emoji: '😓',
    label: 'Struggling',
    description: 'Need encouragement',
  },
  {
    id: 'tired',
    emoji: '😴',
    label: 'Tired',
    description: 'Need gentle guidance',
  },
];

interface MoodSelectorProps {
  onSelect: (mood: Mood) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function MoodSelector({ onSelect, onClose, isOpen }: MoodSelectorProps) {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const { selectedPersona } = usePersonalizationStore();
  const personas = getAllPersonas();
  const activePersona = personas.find(p => p.id === selectedPersona) || personas[0];

  if (!isOpen) return null;

  const handleSelect = (mood: Mood) => {
    setSelectedMood(mood);
  };

  const handleContinue = () => {
    if (selectedMood) {
      onSelect(selectedMood);
    }
  };

  const handleSkip = () => {
    onSelect('good'); // Default mood
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button onClick={onClose} className={styles.closeButton} aria-label="Close">
          <X size={20} />
        </button>

        <div className={styles.header}>
          <span className={styles.coachEmoji}>{activePersona.emoji}</span>
          <h2 className={styles.title}>How are you feeling today?</h2>
          <p className={styles.subtitle}>
            {activePersona.name} will adjust their coaching style to match your energy.
          </p>
        </div>

        <div className={styles.moodGrid}>
          {MOOD_OPTIONS.map((mood) => (
            <button
              key={mood.id}
              onClick={() => handleSelect(mood.id)}
              className={`${styles.moodCard} ${selectedMood === mood.id ? styles.moodCardActive : ''}`}
            >
              <span className={styles.moodEmoji}>{mood.emoji}</span>
              <div className={styles.moodInfo}>
                <span className={styles.moodLabel}>{mood.label}</span>
                <span className={styles.moodDescription}>{mood.description}</span>
              </div>
              {selectedMood === mood.id && (
                <div className={styles.checkmark}>✓</div>
              )}
            </button>
          ))}
        </div>

        <div className={styles.actions}>
          <button
            onClick={handleSkip}
            className={styles.skipButton}
          >
            Skip
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedMood}
            className={styles.continueButton}
          >
            Start Learning Session
          </button>
        </div>
      </div>
    </div>
  );
}
