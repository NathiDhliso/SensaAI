import { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Sun,
    Moon,
    Monitor,
    Palette,
    Brain,
    RefreshCw,
    Settings,
} from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useUIStore } from '@/store/ui-store';
import { useThemeStore, type Theme } from '@/store/theme-store';
import { usePersonalizationStore, type FamiliarSystem } from '@/store/personalization-store';
import { UI_TIMINGS } from '@/constants/ui-constants';
import styles from './SettingsPanel.module.css';


const LEARNING_STYLES = [
    { value: 'visual', label: 'Visual', icon: '👁️' },
    { value: 'practical', label: 'Practical', icon: '🛠️' },
    { value: 'theoretical', label: 'Theoretical', icon: '📚' },
] as const;

const FAMILIAR_SYSTEMS = [
    { value: 'construction', label: 'Construction', icon: '🏗️' },
    { value: 'cooking', label: 'Cooking', icon: '👨‍🍳' },
    { value: 'travel', label: 'Travel', icon: '✈️' },
    { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
    { value: 'sports', label: 'Sports', icon: '⚽' },
    { value: 'nature', label: 'Nature', icon: '🌿' },
] as const;

export default function SettingsPanel() {
    const panelRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);
    const [isExiting, setIsExiting] = useState(false);

    const { isSettingsPanelOpen, closeSettingsPanel } = useUIStore();
    const { theme, setTheme } = useThemeStore();
    const {
        preferredLearningStyle,
        familiarSystem,
        onboardingComplete,
        resetOnboarding,
    } = usePersonalizationStore();
    const updateLearningStyle = usePersonalizationStore(s => s.completeOnboarding);
    const updateFamiliarSystem = usePersonalizationStore(s => s.updateFamiliarSystem);

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

                    {/* Learning Preferences */}
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <Brain className={styles.sectionIcon} />
                            <h3 className={styles.sectionTitle}>Learning</h3>
                        </div>

                        <div className={styles.settingRow}>
                            <div className={styles.settingInfo}>
                                <span className={styles.settingLabel}>Learning Style</span>
                            </div>
                            <div className={styles.optionGrid}>
                                {LEARNING_STYLES.map(({ value, label, icon }) => (
                                    <button
                                        key={value}
                                        onClick={() => {
                                            if (onboardingComplete && familiarSystem) {
                                                updateLearningStyle(
                                                    usePersonalizationStore.getState().chosenRole || 'learner',
                                                    familiarSystem,
                                                    value
                                                );
                                            }
                                        }}
                                        className={`${styles.optionButton} ${preferredLearningStyle === value ? styles.optionActive : ''}`}
                                    >
                                        <span>{icon}</span>
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.settingRow}>
                            <div className={styles.settingInfo}>
                                <span className={styles.settingLabel}>Familiar System</span>
                            </div>
                            <div className={styles.optionGrid}>
                                {FAMILIAR_SYSTEMS.map(({ value, label, icon }) => (
                                    <button
                                        key={value}
                                        onClick={() => updateFamiliarSystem(value as FamiliarSystem)}
                                        className={`${styles.optionButton} ${familiarSystem === value ? styles.optionActive : ''}`}
                                    >
                                        <span>{icon}</span>
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {onboardingComplete && (
                            <button onClick={resetOnboarding} className={styles.linkButton}>
                                <RefreshCw size={14} />
                                Retake onboarding quiz
                            </button>
                        )}
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
