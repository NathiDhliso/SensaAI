/**
 * CoachMessage - AI Coach Contextual Guidance Component
 * 
 * Displays personalized coaching messages during learning sessions
 * with optional voice playback.
 */

import { Volume2, VolumeX } from 'lucide-react';
import { usePersonalizationStore } from '@/store/personalization-store';
import { getAllPersonas } from '@/features/ai-coach';
import { useVoice } from '@/features/ai-coach/voice/useVoice';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import styles from './CoachMessage.module.css';

interface CoachMessageProps {
  message: string;
  /** Optional: Override the active persona */
  personaId?: string;
  /** Show voice play button */
  showVoiceButton?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Additional CSS class */
  className?: string;
}

export default function CoachMessage({
  message,
  personaId,
  showVoiceButton = true,
  compact = false,
  className = '',
}: CoachMessageProps) {
  const { selectedPersona, coachVoiceEnabled } = usePersonalizationStore();
  const personas = getAllPersonas();
  const activePersonaId = personaId || selectedPersona;
  const persona = personas.find(p => p.id === activePersonaId) || personas[0];
  
  const { play, isPlaying, isLoading } = useVoice();
  const { isScholarly } = useVisualTheme();

  const handlePlayVoice = async () => {
    if (!coachVoiceEnabled) {
      return;
    }
    
    try {
      await play(message);
    } catch (error) {
      console.error('Voice playback failed:', error);
    }
  };

  if (!message) return null;

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''} ${className}`}>
      <div className={styles.header}>
        <div className={styles.personaInfo}>
          {!isScholarly && <span className={styles.emoji}>{persona.emoji}</span>}
          <span className={styles.name}>{persona.name}</span>
        </div>
        
        {showVoiceButton && coachVoiceEnabled && (
          <button
            onClick={handlePlayVoice}
            disabled={isLoading}
            className={`${styles.voiceButton} ${isPlaying ? styles.voiceButtonActive : ''}`}
            title={isPlaying ? 'Playing...' : 'Play voice'}
            aria-label={isPlaying ? 'Stop voice' : 'Play voice'}
          >
            {isPlaying ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        )}
      </div>

      <div className={styles.messageContent}>
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  );
}
