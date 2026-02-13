/**
 * CoachMessage - AI Coach Contextual Guidance Component
 * 
 * Displays personalized coaching messages during learning sessions
 * with optional voice playback.
 */
import { usePersonalizationStore } from '@/store/personalization-store';
import { getAllPersonas } from '@/features/ai-coach';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import styles from './CoachMessage.module.css';
interface CoachMessageProps {
 message: string;
 personaId?: string;
 compact?: boolean;
 className?: string;
}
export default function CoachMessage({
 message,
 personaId,
 compact = false,
 className = ''
}: CoachMessageProps) {
 const { selectedPersona } = usePersonalizationStore();
 const personas = getAllPersonas();
 const activePersonaId = personaId || selectedPersona;
 const persona = personas.find(p => p.id === activePersonaId) || personas[0];
 const { isScholarly } = useVisualTheme();
 if (!message) return null;
 return (
 <div className={`${styles.container} ${compact ? styles.compact : ''} ${className}`}>
 <div className={styles.header}>
 <div className={styles.personaInfo}>
 {!isScholarly && <span className={styles.emoji}>{persona.emoji}</span>}
 <span className={styles.name}>{persona.name}</span>
 </div>
 </div>
 <div className={styles.messageContent}>
 <p className={styles.message}>{message}</p>
 </div>
 </div>
 );
}
