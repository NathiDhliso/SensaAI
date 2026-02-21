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
 Zap,
 Shuffle,
 Calendar,
 LogOut,
 User,
 Save,
 Loader2
} from 'lucide-react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { useUIStore } from '@/store/ui-store';
import { useThemeStore, type Theme, type VisualTheme } from '@/store/theme-store';
import { usePersonalizationStore, type PracticeMode } from '@/store/personalization-store';
import { useAuthStore } from '@/store/auth-store';
import { getAllPersonas } from '@/features/ai-coach';
import { MetaphorToggle } from '@/features/personalization';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import { toast } from '@/shared/utils/toast';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { authSessionApi } from '@/shared/api/client';
import styles from './SettingsPanel.module.css';

interface ProfileFormState {
 name: string;
 givenName: string;
 familyName: string;
 phoneNumber: string;
 preferredUsername: string;
}

function toProfileForm(user?: {
 name?: string;
 givenName?: string;
 familyName?: string;
 phoneNumber?: string;
 preferredUsername?: string;
} | null): ProfileFormState {
 return {
 name: user?.name || '',
 givenName: user?.givenName || '',
 familyName: user?.familyName || '',
 phoneNumber: user?.phoneNumber || '',
 preferredUsername: user?.preferredUsername || ''
 };
}

export default function SettingsPanel() {
 const panelRef = useRef<HTMLDivElement>(null);
 const triggerRef = useRef<HTMLElement | null>(null);
 const { user, isAuthenticated, logout } = useAuthStore();
 const [isExiting, setIsExiting] = useState(false);
 const [showPersonas, setShowPersonas] = useState(false);
 const [profileForm, setProfileForm] = useState<ProfileFormState>(() => toProfileForm(user));
 const [isProfileLoading, setIsProfileLoading] = useState(false);
 const [isProfileSaving, setIsProfileSaving] = useState(false);
 const { isSettingsPanelOpen, closeSettingsPanel } = useUIStore();
 const { theme, setTheme, visualTheme, setVisualTheme } = useThemeStore();
 const { isScholarly } = useVisualTheme();
 const {
 selectedPersona,
 setSelectedPersona,
 coachIntensity,
 setCoachIntensity,
 stressFreeMode,
 setStressFreeMode,
 semesterStartDate,
 setSemesterStartDate,
 practiceMode,
 setPracticeMode
 } = usePersonalizationStore();
 const personas = getAllPersonas();
 const activePersona = personas.find(p => p.id === selectedPersona) || personas[0];
 useEffect(() => {
 if (isSettingsPanelOpen) {
 triggerRef.current = document.activeElement as HTMLElement;
 }
 }, [isSettingsPanelOpen]);

 useEffect(() => {
 if (!isSettingsPanelOpen) return;
 if (!isAuthenticated || !user) return;

 setProfileForm(toProfileForm(user));
 setIsProfileLoading(true);

 authSessionApi.getProfile()
 .then((response) => {
 setProfileForm(toProfileForm(response.user));
 useAuthStore.setState({ user: response.user });
 })
 .catch((error) => {
 console.error('[Settings] Failed to load profile:', error);
 })
 .finally(() => {
 setIsProfileLoading(false);
 });
 }, [isSettingsPanelOpen, isAuthenticated, user]);

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
  const handleProfileChange = (field: keyof ProfileFormState, value: string) => {
 setProfileForm((prev) => ({ ...prev, [field]: value }));
 };

 const handleSaveProfile = async () => {
 try {
 setIsProfileSaving(true);
 const payload = {
 name: profileForm.name.trim(),
 givenName: profileForm.givenName.trim(),
 familyName: profileForm.familyName.trim(),
 phoneNumber: profileForm.phoneNumber.trim(),
 preferredUsername: profileForm.preferredUsername.trim()
 };
 const response = await authSessionApi.updateProfile(payload);
 setProfileForm(toProfileForm(response.user));
 useAuthStore.setState({ user: response.user });
 toast.success('Profile updated');
 } catch (error) {
 console.error('[Settings] Failed to update profile:', error);
 toast.error('Failed to update profile');
 } finally {
 setIsProfileSaving(false);
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
 {isAuthenticated && user && (
 <section className={styles.section}>
 <div className={styles.sectionHeader}>
 <User className={styles.sectionIcon} />
 <h3 className={styles.sectionTitle}>Account</h3>
 </div>
 <div className={styles.accountCard}>
 <div className={styles.accountInfo}>
 <div className={styles.accountAvatar}>
 {(user.name || user.email || '?').charAt(0).toUpperCase()}
 </div>
 <div className={styles.accountDetails}>
 {user.name && (
 <span className={styles.accountName}>{user.name}</span>
 )}
 <span className={styles.accountEmail}>{user.email}</span>
 </div>
 </div>
 <button
 onClick={() => logout()}
 className={styles.logoutButton}
 >
 <LogOut size={14} />
 Sign Out
 </button>
 </div>
 <div className={styles.profileGrid}>
 <div className={styles.profileField}>
 <label className={styles.profileLabel}>Display Name</label>
 <input
 type="text"
 className={styles.profileInput}
 value={profileForm.name}
 onChange={(e) => handleProfileChange('name', e.target.value)}
 disabled={isProfileLoading || isProfileSaving}
 />
 </div>
 <div className={styles.profileField}>
 <label className={styles.profileLabel}>First Name</label>
 <input
 type="text"
 className={styles.profileInput}
 value={profileForm.givenName}
 onChange={(e) => handleProfileChange('givenName', e.target.value)}
 disabled={isProfileLoading || isProfileSaving}
 />
 </div>
 <div className={styles.profileField}>
 <label className={styles.profileLabel}>Last Name</label>
 <input
 type="text"
 className={styles.profileInput}
 value={profileForm.familyName}
 onChange={(e) => handleProfileChange('familyName', e.target.value)}
 disabled={isProfileLoading || isProfileSaving}
 />
 </div>
 <div className={styles.profileField}>
 <label className={styles.profileLabel}>Phone Number</label>
 <input
 type="tel"
 className={styles.profileInput}
 value={profileForm.phoneNumber}
 onChange={(e) => handleProfileChange('phoneNumber', e.target.value)}
 placeholder="+1234567890"
 disabled={isProfileLoading || isProfileSaving}
 />
 </div>
 <div className={styles.profileField}>
 <label className={styles.profileLabel}>Username</label>
 <input
 type="text"
 className={styles.profileInput}
 value={profileForm.preferredUsername}
 onChange={(e) => handleProfileChange('preferredUsername', e.target.value)}
 disabled={isProfileLoading || isProfileSaving}
 />
 </div>
 </div>
 <div className={styles.profileActions}>
 <button
 onClick={handleSaveProfile}
 className={styles.saveProfileButton}
 disabled={isProfileLoading || isProfileSaving}
 >
 {isProfileSaving ? <Loader2 size={14} className={styles.spinning} /> : <Save size={14} />}
 {isProfileSaving ? 'Saving...' : 'Save Profile'}
 </button>
 </div>
 </section>
 )}
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
 </div>
 </div>
 </>,
 document.body
 );
}
