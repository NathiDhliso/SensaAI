import { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Sun,
    Moon,
    Monitor,
    Palette,
    Brain,
    Settings,
} from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useUIStore } from '@/store/ui-store';
import { useThemeStore, type Theme } from '@/store/theme-store';
import { useLearningStore } from '@/store/learning-store';
// import { usePersonalizationStore, type FamiliarSystem } from '@/store/personalization-store'; // Keeping for now if needed, but likely unused
import { UI_TIMINGS } from '@/constants/ui-constants';
import styles from './SettingsPanel.module.css';


const PROFILE_STYLES = [
    { value: 'visual', label: 'Visual (Palace)', icon: '👁️' },
    { value: 'text', label: 'Text (Velocity)', icon: '📝' },
] as const;

const PROFILE_MODES = [
    { value: 'burst', label: 'Burst (5m)', icon: '⚡' },
    { value: 'deep', label: 'Deep (25m)', icon: '🧠' },
] as const;



export default function SettingsPanel() {
    const panelRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);
    const [isExiting, setIsExiting] = useState(false);

    const { isSettingsPanelOpen, closeSettingsPanel } = useUIStore();
    const { theme, setTheme } = useThemeStore();
    const { learningProfile, setLearningProfile } = useLearningStore();

    // Store the trigger element for focus return
    useEffect(() => {
        if (isSettingsPanelOpen) {
            triggerRef.current = document.activeElement as HTMLElement;
        }
    }, [isSettingsPanelOpen]);

    // Handle closing with animation
    const handleClose = useCallback(() => {
        setIsExiting(true);
        setTimeout(() => {
            closeSettingsPanel();
            setIsExiting(false);
            // Return focus to trigger
            triggerRef.current?.focus();
        }, UI_TIMINGS.PANEL_EXIT_DELAY);
    }, [closeSettingsPanel]);

    // Hooks for closing
    useClickOutside(panelRef, handleClose, isSettingsPanelOpen);
    useEscapeKey(handleClose, isSettingsPanelOpen);

    // Focus trap - focus first focusable element on open
    useEffect(() => {
        if (isSettingsPanelOpen && panelRef.current) {
            const firstFocusable = panelRef.current.querySelector<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            firstFocusable?.focus();
        }
    }, [isSettingsPanelOpen]);

    const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
        { value: 'light', icon: Sun, label: 'Light' },
        { value: 'dark', icon: Moon, label: 'Dark' },
        { value: 'system', icon: Monitor, label: 'System' },
    ];

    if (!isSettingsPanelOpen) return null;

    return createPortal(
        <>
            <div
                className={styles.overlay}
                aria-hidden="true"
            />
            <div
                ref={panelRef}
                className={`${styles.panel} ${isExiting ? styles.panelExiting : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-panel-title"
            >
                <header className={styles.panelHeader}>
                    <h2 id="settings-panel-title" className={styles.panelTitle}>
                        Settings
                    </h2>
                    <button
                        onClick={handleClose}
                        className={styles.closeButton}
                        aria-label="Close settings"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className={styles.panelContent}>
                    {/* Appearance */}
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
                    </section>

                    {/* Learning Profile (Stop Guessing) */}
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <Brain className={styles.sectionIcon} />
                            <h3 className={styles.sectionTitle}>Learning Profile</h3>
                        </div>

                        {/* Visual vs Text */}
                        <div className={styles.settingRow}>
                            <div className={styles.settingInfo}>
                                <span className={styles.settingLabel}>Primary Style</span>
                                <span className={styles.settingDesc}>How do you prefer to learn?</span>
                            </div>
                            <div className={styles.optionGrid}>
                                {PROFILE_STYLES.map(({ value, label, icon }) => (
                                    <button
                                        key={value}
                                        onClick={() => setLearningProfile({ style: value as 'visual' | 'text' })}
                                        className={`${styles.optionButton} ${learningProfile?.style === value ? styles.optionActive : ''}`}
                                    >
                                        <span>{icon}</span>
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Burst vs Deep */}
                        <div className={styles.settingRow}>
                            <div className={styles.settingInfo}>
                                <span className={styles.settingLabel}>Focus Mode</span>
                                <span className={styles.settingDesc}>Short sprints or deep dives?</span>
                            </div>
                            <div className={styles.optionGrid}>
                                {PROFILE_MODES.map(({ value, label, icon }) => (
                                    <button
                                        key={value}
                                        onClick={() => setLearningProfile({ mode: value as 'burst' | 'deep' })}
                                        className={`${styles.optionButton} ${learningProfile?.mode === value ? styles.optionActive : ''}`}
                                    >
                                        <span>{icon}</span>
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer Actions */}
                <div className={styles.panelFooter}>
                    <button
                        onClick={() => {
                            handleClose();
                            setTimeout(() => window.location.href = '/settings', UI_TIMINGS.PANEL_EXIT_DELAY);
                        }}
                        className={styles.advancedButton}
                    >
                        <Settings size={14} />
                        Advanced Settings
                    </button>
                </div>
            </div>
        </>,
        document.body
    );
}
