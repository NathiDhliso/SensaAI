import { useMemo, useState, useEffect, useRef } from 'react';
import { Share2, Check } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import { CONFETTI_COLORS } from '@/shared/constants/theme-colors';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import type { CelebrationData, LearningConcept } from '@/shared/types/learning';
import styles from './CelebrationModal.module.css';
interface CelebrationModalProps {
 data: CelebrationData;
 onContinue: () => void;
 onTakeBreak: () => void;
}
const seededRandom = (seed: number) => {
 const x = Math.sin(seed) * 10000;
 return x - Math.floor(x);
};
const generateConfetti = () => {
 return Array.from({ length: 50 }, (_, i) => {
 const seed = i * 1000;
 return {
 id: i,
 left: `${seededRandom(seed) * 100}%`,
 delay: `${seededRandom(seed + 1) * 2}s`,
 color: CONFETTI_COLORS[Math.floor(seededRandom(seed + 2) * CONFETTI_COLORS.length)],
 size: seededRandom(seed + 3) * 8 + 6,
 rotation: seededRandom(seed + 4) * 360,
 isCircle: seededRandom(seed + 5) > 0.5
 };
 });
};
const CONFETTI_PIECES = generateConfetti();
export default function CelebrationModal({ data, onContinue, onTakeBreak }: CelebrationModalProps) {
 const getConcepts = useLearningStore(s => s.getConcepts);
 const concepts = getConcepts();
 const { isScholarly: _isScholarly } = useVisualTheme();
 const confettiPieces = CONFETTI_PIECES;
 const [autoDismissCountdown, setAutoDismissCountdown] = useState(4);
 const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
 // Auto-dismiss after countdown (pause on hover)
 const [isPaused, setIsPaused] = useState(false);
 useEffect(() => {
 if (isPaused) return;
 timerRef.current = setInterval(() => {
 setAutoDismissCountdown(prev => {
 if (prev <= 1) {
 onContinue();
 return 0;
 }
 return prev - 1;
 });
 }, 1000);
 return () => {
 if (timerRef.current) clearInterval(timerRef.current);
 };
 }, [isPaused, onContinue]);
 const completedConceptNames = useMemo(() => {
 if (!data.conceptsCompleted) return [];
 return data.conceptsCompleted
 .map(id => concepts.find((c: LearningConcept) => c.id === id)?.name)
 .filter(Boolean)
 .slice(0, 6);
 }, [data.conceptsCompleted, concepts]);
 const [shared, setShared] = useState(false);
 const handleShare = async () => {
 const shareText = `I just completed "${data.title}" on SensaAI. ${data.conceptsCompleted?.length || 0} concepts mastered. #LearningJourney`;
 // Try native share API first
 if (navigator.share) {
 try {
 await navigator.share({
 title: 'SensaAI Achievement',
 text: shareText
 });
 setShared(true);
 setTimeout(() => setShared(false), UI_TIMINGS.TOAST_SHORT);
 return;
 } catch {
 // User cancelled or share failed, fall through to clipboard
 }
 }
 // Fallback to clipboard
 try {
 await navigator.clipboard.writeText(shareText);
 setShared(true);
 setTimeout(() => setShared(false), UI_TIMINGS.TOAST_SHORT);
 } catch {
 // Clipboard failed silently
 }
 };
 return (
 <div
 className={styles.overlay}
 onMouseEnter={() => setIsPaused(true)}
 onMouseLeave={() => setIsPaused(false)}
 >
 <div className={styles.modal}>
 <div className={styles.confettiContainer}>
 {confettiPieces.map(piece => (
 <div
 key={piece.id}
 className={styles.confetti}
 style={{
 left: piece.left,
 animationDelay: piece.delay,
 backgroundColor: piece.color,
 width: piece.size,
 height: piece.size,
 borderRadius: piece.isCircle ? '50%' : '0',
 transform: `rotate(${piece.rotation}deg)`
 }}
 />
 ))}
 </div>
 <div className={`${styles.badgeContainer} ${data.type === 'course' ? styles.badgeCourse : ''}`}>
 <svg className={styles.badgeIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
 </svg>
 </div>
 <h2 className={styles.title}>{data.title}</h2>
 <p className={styles.message}>{data.message}</p>
 {(data.conceptsCompleted || data.timeSpent) && (
 <div className={styles.stats}>
 {data.conceptsCompleted && (
 <div className={styles.stat}>
 <div className={styles.statValue}>{data.conceptsCompleted.length}</div>
 <div className={styles.statLabel}>Concepts Mastered</div>
 </div>
 )}
 {data.timeSpent !== undefined && data.timeSpent > 0 && (
 <div className={styles.stat}>
 <div className={styles.statValue}>{data.timeSpent}</div>
 <div className={styles.statLabel}>Minutes Invested</div>
 </div>
 )}
 </div>
 )}
 {completedConceptNames.length > 0 && (
 <div className={styles.conceptList}>
 {completedConceptNames.map((name, i) => (
 <span key={i} className={styles.conceptTag}>{name}</span>
 ))}
 </div>
 )}
 <div className={styles.actions}>
 <button className={styles.breakButton} onClick={onTakeBreak}>
 Take a break
 </button>
 <button className={styles.continueButton} onClick={onContinue}>
 {data.type === 'course' ? 'View Certificate' : `Continue${!isPaused && autoDismissCountdown > 0 ? ` (${autoDismissCountdown}s)` : ''}`}
 </button>
 </div>
 <button className={styles.shareButton} onClick={handleShare}>
 {shared ? <Check size={16} /> : <Share2 size={16} />}
 {shared ? 'Copied!' : 'Share achievement'}
 </button>
 {/* Auto-dismiss indicator */}
 {!isPaused && autoDismissCountdown > 0 && (
 <div className={styles.autoDismissHint}>
 Continuing automatically... (hover to pause)
 </div>
 )}
 </div>
 </div>
 );
}
