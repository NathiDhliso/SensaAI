import { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import {
 X,
 Sun,
 Moon,
 Monitor,
 Palette,
 Sparkles,
 GraduationCap,
 Bot,
 Edit2,
 Volume2,
 VolumeX,
 Zap,
 Shuffle,
 Calendar,
 FileJson,
 Download,
 Trash2,
 AlertTriangle,
 ChevronDown,
 ChevronUp,
 RefreshCw
} from 'lucide-react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { useUIStore } from '@/store/ui-store';
import { useThemeStore, type Theme, type VisualTheme } from '@/store/theme-store';
import { usePersonalizationStore, type PracticeMode } from '@/store/personalization-store';
import { useLearningStore } from '@/store/learning-store';
import { useGenerationStore } from '@/store/generation-store';
import { getAllPersonas, getPersonaResponse } from '@/features/ai-coach';
import { MetaphorToggle } from '@/features/personalization';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import { toast } from '@/shared/utils/toast';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import styles from './SettingsPanel.module.css';
export default function SettingsPanel() {
 const panelRef = useRef<HTMLDivElement>(null);
 const triggerRef = useRef<HTMLElement | null>(null);
 const [isExiting, setIsExiting] = useState(false);
 const [showPersonas, setShowPersonas] = useState(false);
 const [showDangerZone, setShowDangerZone] = useState(false);
 const [confirmClear, setConfirmClear] = useState<string | null>(null);
 const { isSettingsPanelOpen, closeSettingsPanel } = useUIStore();
 const { theme, setTheme, visualTheme, setVisualTheme } = useThemeStore();
 const { isScholarly } = useVisualTheme();
 const {
 selectedPersona,
 setSelectedPersona,
 coachVoiceEnabled,
 setCoachVoiceEnabled,
 coachIntensity,
 setCoachIntensity,
 resetOnboarding,
 stressFreeMode,
 setStressFreeMode,
 semesterStartDate,
 setSemesterStartDate,
 practiceMode,
 setPracticeMode
 } = usePersonalizationStore();
 const {
 resetProgress,
 clearSession,
 currentSession
 } = useLearningStore();
 const progress = currentSession?.progress;
 const personas = getAllPersonas();
 const activePersona = personas.find(p => p.id === selectedPersona) || personas[0];
 useEffect(() => {
 if (isSettingsPanelOpen) {
 triggerRef.current = document.activeElement as HTMLElement;
 }
 }, [isSettingsPanelOpen]);
 const handleClose = useCallback(() => {
 setIsExiting(true);
 setTimeout(() => {
 closeSettingsPanel();
 setIsExiting(false);
 triggerRef.current?.focus();
 }, UI_TIMINGS.PANEL_EXIT_DELAY);
 }, [closeSettingsPanel]);
 useClickOutside(panelRef, handleClose, isSettingsPanelOpen);
 useEscapeKey(handleClose, isSettingsPanelOpen);
 useEffect(() => {
 if (isSettingsPanelOpen && panelRef.current) {
 const firstFocusable = panelRef.current.querySelector<HTMLElement>(
 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
 );
 firstFocusable?.focus();
 }
 }, [isSettingsPanelOpen]);
 const handleClearData = (type: string) => {
 if (confirmClear === type) {
 switch (type) {
 case 'progress':
 resetProgress();
 toast.success('Progress cleared');
 break;
 case 'all':
 resetProgress();
 clearSession();
 resetOnboarding();
 useGenerationStore.setState({ results: [] });
 toast.success('All data reset');
 break;
 }
 setConfirmClear(null);
 } else {
 setConfirmClear(type);
 setTimeout(() => setConfirmClear(null), UI_TIMINGS.TOAST_MEDIUM);
 }
 };
 const handleExportData = () => {
 const data = {
 theme,
 personalization: usePersonalizationStore.getState(),
 learning: {
 progress
 },
 generation: {
 results: useGenerationStore.getState().results
 },
 exportedAt: new Date().toISOString()
 };
 const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `sensa-backup-${new Date().toISOString().split('T')[0]}.json`;
 a.click();
 URL.revokeObjectURL(url);
 toast.success('Data exported');
 };
 const handleVoicePreview = () => {
 const sampleMessage = getPersonaResponse(selectedPersona, 'prime', 'intro');
 if ('speechSynthesis' in window) {
 window.speechSynthesis.cancel();
 const utterance = new SpeechSynthesisUtterance(sampleMessage);
 utterance.rate = 1;
 utterance.pitch = 1;
 window.speechSynthesis.speak(utterance);
 } else {
 toast.info(`"${sampleMessage}"`);
 }
 };
 const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
 { value: 'light', icon: Sun, label: 'Light' },
 { value: 'dark', icon: Moon, label: 'Dark' },
 { value: 'system', icon: Monitor, label: 'System' }
 ];
 const visualThemeOptions: { value: VisualTheme; icon: typeof Sparkles; label: string; desc: string }[] = [
 { value: 'playful', icon: Sparkles, label: 'Playful', desc: 'Friendly and approachable' },
 { value: 'scholarly', icon: GraduationCap, label: 'Scholarly', desc: 'Refined and structured' }
 ];
 const practiceModes: { value: PracticeMode; label: string; desc: string }[] = [
 { value: 'blocked', label: 'Blocked', desc: 'One topic at a time' },
 { value: 'mixed', label: 'Mixed', desc: 'Random topics' },
 { value: 'progressive', label: 'Progressive', desc: 'Start blocked, add mixing' }
 ];
 if (!isSettingsPanelOpen) return null;
 return createPortal(
 <>
 <div className={styles.overlay} aria-hidden="true" />
 <div
 ref={panelRef}
 className={`${styles.panel} ${isExiting ? styles.panelExiting : ''}`}
 role="dialog"
 aria-modal="true"
 aria-labelledby="settings-panel-title"
 >
 <header className={styles.panelHeader}>
 <h2 id="settings-panel-title" className={styles.panelTitle}>Settings</h2>
 <button onClick={handleClose} className={styles.closeButton} aria-label="Close settings">
 <X size={18} />
 </button>
 </header>
 <div className={styles.panelContent}>
 <section className={styles.section}>
 <div className={styles.sectionHeader}>
 <Palette className={styles.sectionIcon} />
 <h3 className={styles.sectionTitle}>Appearance</h3>
 </div>
 <div className={styles.settingRow}>
 <div className={styles.settingInfo}>
 <span className={styles.settingLabel}>Theme</span>
 <span className={styles.settingDesc}>Choose your color scheme</span>
 </div>
 <div className={styles.themeToggle}>
 {themeOptions.map(({ value, icon: Icon, label }) => (
 <button
 key={value}
 onClick={() => setTheme(value)}
 className={`${styles.themeOption} ${theme === value ? styles.themeOptionActive : ''}`}
 title={label}
 >
 <Icon size={16} />
 <span>{label}</span>
 </button>
 ))}
 </div>
 </div>
 <div className={styles.settingRow}>
 <div className={styles.settingInfo}>
 <span className={styles.settingLabel}>Visual Style</span>
 <span className={styles.settingDesc}>Choose your interface style</span>
 </div>
 <div className={styles.themeToggle}>
 {visualThemeOptions.map(({ value, icon: Icon, label, desc }) => (
 <button
 key={value}
 onClick={() => setVisualTheme(value)}
 className={`${styles.themeOption} ${visualTheme === value ? styles.themeOptionActive : ''}`}
 title={desc}
 >
 <Icon size={16} />
 <span>{label}</span>
 </button>
 ))}
 </div>
 </div>
 </section>
 <section className={styles.section}>
 <div className={styles.sectionHeader}>
 <Bot className={styles.sectionIcon} />
 <h3 className={styles.sectionTitle}>AI Companion</h3>
 </div>
 <div className={styles.settingRow}>
 <div className={styles.compactPersonaRow}>
 <div className={styles.personaPreview}>
 {!isScholarly && <span className={styles.personaEmoji}>{activePersona.emoji}</span>}
 <div>
 <span className={styles.personaName}>{activePersona.name}</span>
 <span className={styles.personaTagline}>{activePersona.tagline}</span>
 </div>
 </div>
 <button
 className={styles.editButton}
 onClick={() => setShowPersonas(!showPersonas)}
 >
 <Edit2 size={14} />
 {showPersonas ? 'Close' : 'Change'}
 </button>
 </div>
 {showPersonas && (
 <div className={styles.personaGrid}>
 {personas.map((persona) => (
 <button
 key={persona.id}
 onClick={() => {
 setSelectedPersona(persona.id);
 setShowPersonas(false);
 }}
 className={`${styles.optionButton} ${selectedPersona === persona.id ? styles.optionActive : ''}`}
 >
 {!isScholarly && <span>{persona.emoji}</span>}
 <span>{persona.name}</span>
 </button>
 ))}
 </div>
 )}
 </div>
 <div className={styles.settingRow}>
 <div className={styles.voiceRow}>
 <button
 onClick={() => setCoachVoiceEnabled(!coachVoiceEnabled)}
 className={`${styles.optionButton} ${coachVoiceEnabled ? styles.optionActive : ''}`}
 aria-pressed={coachVoiceEnabled}
 >
 {coachVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
 <span>Voice {coachVoiceEnabled ? 'On' : 'Off'}</span>
 </button>
 <button onClick={handleVoicePreview} className={styles.linkButton}>
 Preview
 </button>
 </div>
 </div>
 <div className={styles.settingRow}>
 <div className={styles.settingInfo}>
 <span className={styles.settingLabel}>Coach Intensity</span>
 <span className={styles.settingDesc}>How often and how intensely the coach intervenes</span>
 </div>
 <div className={styles.intensityRow}>
 <input
 type="range"
 min="1"
 max="5"
 value={coachIntensity}
 onChange={(e) => setCoachIntensity(Number(e.target.value))}
 className={styles.intensitySlider}
 />
 <span className={styles.intensityValue}>{coachIntensity}/5</span>
 </div>
 </div>
 </section>
 <section className={styles.section}>
 <div className={styles.sectionHeader}>
 <Shuffle className={styles.sectionIcon} />
 <h3 className={styles.sectionTitle}>Practice Mode</h3>
 </div>
 <div className={styles.settingRow}>
 <div className={styles.settingInfo}>
 <span className={styles.settingLabel}>Concept Sequencing</span>
 <span className={styles.settingDesc}>How concepts are mixed during practice</span>
 </div>
 <div className={styles.themeToggle}>
 {practiceModes.map(({ value, label, desc }) => (
 <button
 key={value}
 onClick={() => setPracticeMode(value)}
 className={`${styles.themeOption} ${practiceMode === value ? styles.themeOptionActive : ''}`}
 title={desc}
 >
 <span>{label}</span>
 </button>
 ))}
 </div>
 </div>
 </section>
 <section className={styles.section}>
 <div className={styles.sectionHeader}>
 <Zap className={styles.sectionIcon} />
 <h3 className={styles.sectionTitle}>Cognitive Load</h3>
 </div>
 <div className={styles.settingRow}>
 <div className={styles.settingInfo}>
 <span className={styles.settingLabel}>Stress-Free Mode</span>
 <span className={styles.settingDesc}>Shorter AI explanations for easier reading</span>
 </div>
 <button
 onClick={() => setStressFreeMode(!stressFreeMode)}
 className={`${styles.optionButton} ${stressFreeMode ? styles.optionActive : ''}`}
 aria-pressed={stressFreeMode}
 >
 <Zap size={16} />
 <span>{stressFreeMode ? 'On' : 'Off'}</span>
 </button>
 </div>
 <MetaphorToggle compact showSettings />
 </section>
 <section className={styles.section}>
 <div className={styles.sectionHeader}>
 <Calendar className={styles.sectionIcon} />
 <h3 className={styles.sectionTitle}>Academic Schedule</h3>
 </div>
 <div className={styles.settingRow}>
 <div className={styles.settingInfo}>
 <span className={styles.settingLabel}>Semester Start Date</span>
 <span className={styles.settingDesc}>Track effective study weeks</span>
 </div>
 <input
 type="date"
 className={styles.dateInput}
 value={semesterStartDate || ''}
 onChange={(e) => setSemesterStartDate(e.target.value || null)}
 />
 </div>
 </section>
 <section className={styles.section}>
 <div className={styles.sectionHeader}>
 <FileJson className={styles.sectionIcon} />
 <h3 className={styles.sectionTitle}>Data</h3>
 </div>
 <div className={styles.dataRow}>
 <span className={styles.settingDesc}>
 {progress?.completedConcepts.length ?? 0} concepts &bull; {progress?.totalTimeSpentMinutes ?? 0}m studied
 </span>
 <button onClick={handleExportData} className={styles.linkButton} title="Export Data">
 <Download size={14} /> Export
 </button>
 </div>
 <button onClick={() => {
 resetOnboarding();
 toast.success('Onboarding reset');
 }} className={styles.linkButton}>
 <RefreshCw size={14} /> Retake onboarding
 </button>
 <button
 className={styles.dangerToggle}
 onClick={() => setShowDangerZone(!showDangerZone)}
 >
 <div className={styles.dangerToggleLeft}>
 <AlertTriangle size={14} />
 <span>Danger Zone</span>
 </div>
 {showDangerZone ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
 </button>
 {showDangerZone && (
 <div className={styles.dangerActions}>
 <button
 onClick={() => handleClearData('progress')}
 className={`${styles.dangerButton} ${confirmClear === 'progress' ? styles.dangerConfirm : ''}`}
 >
 <Trash2 size={14} />
 {confirmClear === 'progress' ? 'Confirm Clear' : 'Clear Progress'}
 </button>
 <button
 onClick={() => handleClearData('all')}
 className={`${styles.dangerButton} ${confirmClear === 'all' ? styles.dangerConfirm : ''}`}
 >
 <Trash2 size={14} />
 {confirmClear === 'all' ? 'Confirm Reset' : 'Reset App Data'}
 </button>
 </div>
 )}
 </section>
 </div>
 </div>
 </>,
 document.body
 );
}