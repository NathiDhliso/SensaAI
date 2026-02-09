import { useState } from 'react';
import { X, Battery, BatteryFull, BatteryLow } from 'lucide-react';
import { usePersonalizationStore } from '@/store/personalization-store';
import { getAllPersonas, MOOD_OPTIONS, type Mood } from '@/features/ai-coach';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import styles from './MoodSelector.module.css';
export type { Mood };
const BATTERY_ICONS: Record<string, React.ReactNode> = {
 energized: <BatteryFull size={20} />,
 neutral: <Battery size={20} />,
 tired: <BatteryLow size={20} />
};
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
 const { isScholarly } = useVisualTheme();
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
 onSelect('neutral');
 };
 return (
 <div className={styles.overlay}>
 <div className={styles.modal}>
 <button onClick={onClose} className={styles.closeButton} aria-label="Close">
 <X size={20} />
 </button>
 <div className={styles.header}>
 {!isScholarly && <span className={styles.coachEmoji}>{activePersona.emoji}</span>}
 <h2 className={styles.title}>{isScholarly ? 'Set Focus Level' : 'Set Your Cognitive Battery'}</h2>
 <p className={styles.subtitle}>
 {activePersona.name} will unlock features based on your current focus level.
 </p>
 </div>
 <div className={styles.moodGrid}>
 {MOOD_OPTIONS.map((mood) => (
 <button
 key={mood.id}
 onClick={() => handleSelect(mood.id)}
 className={`${styles.moodCard} ${selectedMood === mood.id ? styles.moodCardActive : ''}`}
 >
 {!isScholarly && <span className={styles.moodEmoji}>{mood.emoji}</span>}
 <div className={styles.moodInfo}>
 <span className={styles.moodLabel}>{mood.label}</span>
 <span className={styles.moodDescription}>{mood.description}</span>
 <span className={styles.bandwidthTag}>
 {BATTERY_ICONS[mood.id]}
 {mood.bandwidthLabel}
 </span>
 </div>
 {selectedMood === mood.id && (
 <div className={styles.checkmark}></div>
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
 Start Session
 </button>
 </div>
 </div>
 </div>
 );
}