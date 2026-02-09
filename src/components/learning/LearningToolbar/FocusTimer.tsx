/**
 * FocusTimer Component
 * 
 * A modal timer for Pomodoro-style focus sessions.
 * Now integrated with the focus-session store for unified session tracking.
 */
import { useEffect } from 'react';
import { X, Play, Pause, RotateCcw, Coffee } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import { FOCUS_SESSION_CONFIG } from '@/shared/constants/ui-constants';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import styles from './LearningToolbar.module.css';
interface FocusTimerProps {
 isOpen: boolean;
 onClose: () => void;
}
export function FocusTimer({ isOpen, onClose }: FocusTimerProps) {
 const { isScholarly } = useVisualTheme();
 const {
 isSessionActive,
 isPaused,
 sessionType,
 focusDurationMinutes,
 breakDurationMinutes,
 totalSessionsCompleted,
 getFormattedTimeRemaining,
 getProgressPercent,
 startFocusSession,
 pauseSession,
 resumeSession,
 startBreak,
 setFocusDuration,
 setBreakDuration
 } = useLearningStore();
 const isBreak = sessionType === 'break';
 const isRunning = isSessionActive && !isPaused;
 // Calculate circle progress
 const circumference = 2 * Math.PI * 90;
 const progress = getProgressPercent();
 const strokeDashoffset = circumference - (progress / 100) * circumference;
 // Request notification permission on mount
 useEffect(() => {
 if ('Notification' in window && Notification.permission === 'default') {
 Notification.requestPermission();
 }
 }, []);
 // Handle start button - starts session and closes modal
 const handleStart = () => {
 if (!isSessionActive) {
 startFocusSession();
 } else {
 resumeSession();
 }
 onClose(); // Close modal when session starts - session bar takes over
 };
 const handlePause = () => {
 pauseSession();
 };
 const handleReset = () => {
 // Reset by setting duration again
 if (isBreak) {
 setBreakDuration(breakDurationMinutes);
 } else {
 setFocusDuration(focusDurationMinutes);
 }
 };
 const handleSwitchMode = () => {
 if (isBreak) {
 startFocusSession();
 } else {
 startBreak();
 }
 };
 const handleFocusMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const val = parseInt(e.target.value) || FOCUS_SESSION_CONFIG.DEFAULT_FOCUS_MINUTES;
 setFocusDuration(val);
 };
 const handleBreakMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const val = parseInt(e.target.value) || FOCUS_SESSION_CONFIG.DEFAULT_BREAK_MINUTES;
 setBreakDuration(val);
 };
 if (!isOpen) return null;
 return (
 <div className={styles.overlay} onClick={onClose}>
 <div className={styles.modal} onClick={e => e.stopPropagation()}>
 <div className={styles.modalHeader}>
 <h2 className={styles.modalTitle}>
 {isBreak ? <Coffee size={20} /> : (isScholarly ? null : '')}
 {isBreak ? 'Break Time' : 'Focus Timer'}
 </h2>
 <button className={styles.closeButton} onClick={onClose}>
 <X size={20} />
 </button>
 </div>
 <div className={styles.modalContent}>
 <div className={styles.timerModal}>
 <div className={`${styles.timerCircle} ${isBreak ? styles.break : ''}`}>
 <svg viewBox="0 0 200 200">
 <circle className={styles.bg} cx="100" cy="100" r="90" />
 <circle
 className={styles.progress}
 cx="100"
 cy="100"
 r="90"
 strokeDasharray={circumference}
 strokeDashoffset={strokeDashoffset}
 />
 </svg>
 <div className={styles.timerTime}>
 <span className={styles.timerTimeValue}>
 {isSessionActive ? getFormattedTimeRemaining() : formatInitialTime()}
 </span>
 <span className={styles.timerTimeLabel}>
 {isBreak ? 'Break' : 'Focus'}
 </span>
 </div>
 </div>
 <div className={styles.timerControls}>
 <button
 className={styles.timerControlButton}
 onClick={handleReset}
 title="Reset"
 >
 <RotateCcw size={20} />
 </button>
 <button
 className={`${styles.timerControlButton} ${styles.primary}`}
 onClick={isRunning ? handlePause : handleStart}
 >
 {isRunning ? <Pause size={24} /> : <Play size={24} />}
 </button>
 <button
 className={styles.timerControlButton}
 onClick={handleSwitchMode}
 title={isBreak ? 'Start Focus' : 'Take Break'}
 >
 <Coffee size={20} />
 </button>
 </div>
 <div className={styles.timerSettings}>
 <div className={styles.timerSetting}>
 <span className={styles.timerSettingLabel}>Focus</span>
 <div className={styles.timerSettingValue}>
 <input
 type="number"
 min="1"
 max="60"
 value={focusDurationMinutes}
 onChange={handleFocusMinutesChange}
 className={styles.timerSettingInput}
 disabled={isRunning}
 />
 <span>min</span>
 </div>
 </div>
 <div className={styles.timerSetting}>
 <span className={styles.timerSettingLabel}>Break</span>
 <div className={styles.timerSettingValue}>
 <input
 type="number"
 min="1"
 max="30"
 value={breakDurationMinutes}
 onChange={handleBreakMinutesChange}
 className={styles.timerSettingInput}
 disabled={isRunning}
 />
 <span>min</span>
 </div>
 </div>
 <div className={styles.timerSetting}>
 <span className={styles.timerSettingLabel}>Sessions</span>
 <div className={styles.timerSettingValue}>
 <strong>{totalSessionsCompleted}</strong>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 // Helper to format initial time before session starts
 function formatInitialTime() {
 const seconds = isBreak ? breakDurationMinutes * 60 : focusDurationMinutes * 60;
 const mins = Math.floor(seconds / 60);
 const secs = seconds % 60;
 return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
 }
}