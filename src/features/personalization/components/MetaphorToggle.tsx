/**
 * MetaphorToggle Component
 * 
 * Provides instant control over visual metaphors and analogies.
 * Reduces cognitive load by letting users choose their preferred learning style.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Settings, Lightbulb } from 'lucide-react';
import { usePersonalizationStore, type MetaphorSettings } from '@/store/personalization-store';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
import styles from './MetaphorToggle.module.css';
interface MetaphorToggleProps {
 /** Compact mode for header placement */
 compact?: boolean;
 /** Show detailed settings panel */
 showSettings?: boolean;
 /** Callback when settings change */
 onSettingsChange?: (settings: MetaphorSettings) => void;
}
export default function MetaphorToggle({ 
 compact = false, 
 showSettings = false,
 onSettingsChange 
}: MetaphorToggleProps) {
 const { 
 metaphorSettings, 
 updateMetaphorSettings,
 trackMetaphorUsage 
 } = usePersonalizationStore();
 const { isScholarly } = useVisualTheme();
 const [showPanel, setShowPanel] = useState(false);
 const [settings, setSettings] = useState<MetaphorSettings>(metaphorSettings);
 // Sync with store
 useEffect(() => {
 setSettings(metaphorSettings);
 }, [metaphorSettings]);
 const handleQuickToggle = () => {
 const newSettings = {
 ...settings,
 showAnalogies: !settings.showAnalogies,
 };
 setSettings(newSettings);
 updateMetaphorSettings(newSettings);
 onSettingsChange?.(newSettings);
 // Track usage for analytics
 trackMetaphorUsage('quick_toggle', newSettings.showAnalogies ? 'enabled' : 'disabled');
 };
 const handleSettingChange = (key: keyof MetaphorSettings, value: MetaphorSettings[keyof MetaphorSettings]) => {
 const newSettings = { ...settings, [key]: value };
 setSettings(newSettings);
 updateMetaphorSettings(newSettings);
 onSettingsChange?.(newSettings);
 trackMetaphorUsage('setting_change', `${key}:${value}`);
 };
 const isMetaphorsEnabled = settings.showAnalogies;
 if (compact) {
 return (
 <div className={styles.compactToggle}>
 <button
 className={`${styles.toggleButton} ${isMetaphorsEnabled ? styles.enabled : styles.disabled}`}
 onClick={handleQuickToggle}
 title={isMetaphorsEnabled ? 'Hide metaphors' : 'Show metaphors'}
 >
 {isMetaphorsEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
 <span className={styles.toggleLabel}>
 {isMetaphorsEnabled ? 'Metaphors ON' : 'Metaphors OFF'}
 </span>
 </button>
 {showSettings && (
 <button
 className={styles.settingsButton}
 onClick={() => setShowPanel(!showPanel)}
 title="Metaphor settings"
 >
 <Settings size={14} />
 </button>
 )}
 <AnimatePresence>
 {showPanel && (
 <motion.div
 className={styles.settingsPanel}
 initial={{ opacity: 0, y: -10, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: -10, scale: 0.95 }}
 transition={{ duration: 0.2 }}
 >
 <div className={styles.panelHeader}>
 <Lightbulb size={16} />
 <span>Learning Style</span>
 </div>
 <div className={styles.settingGroup}>
 <label className={styles.settingLabel}>
 <input
 type="checkbox"
 checked={settings.showAnalogies}
 onChange={(e) => handleSettingChange('showAnalogies', e.target.checked)}
 />
 <span>{isScholarly ? 'Visual anchors' : 'Visual anchors ( icons)'}</span>
 </label>
 <label className={styles.settingLabel}>
 <input
 type="checkbox"
 checked={settings.showAnalogies}
 onChange={(e) => handleSettingChange('showAnalogies', e.target.checked)}
 />
 <span>Analogies ("like a calculator")</span>
 </label>
 </div>
 <div className={styles.settingGroup}>
 <span className={styles.groupTitle}>Metaphor Style</span>
 <label className={styles.radioLabel}>
 <input
 type="radio"
 name="complexity"
 checked={settings.metaphorComplexity === 'simple'}
 onChange={() => handleSettingChange('metaphorComplexity', 'simple')}
 />
 <span>{isScholarly ? 'Simple' : 'Simple (Key )'}</span>
 </label>
 <label className={styles.radioLabel}>
 <input
 type="radio"
 name="complexity"
 checked={settings.metaphorComplexity === 'rich'}
 onChange={() => handleSettingChange('metaphorComplexity', 'rich')}
 />
 <span>Rich (Master key with timer)</span>
 </label>
 </div>
 <div className={styles.settingGroup}>
 <label className={styles.settingLabel}>
 <input
 type="checkbox"
 checked={settings.allowCustomMetaphors}
 onChange={(e) => handleSettingChange('allowCustomMetaphors', e.target.checked)}
 />
 <span>Allow custom metaphors</span>
 </label>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
 }
 // Full toggle component for settings page
 return (
 <div className={styles.fullToggle}>
 <div className={styles.toggleHeader}>
 <div className={styles.toggleIcon}>
 <Lightbulb size={24} />
 </div>
 <div>
 <h3>Visual Learning Aids</h3>
 <p>Control how concepts are presented to match your learning style</p>
 </div>
 <button
 className={`${styles.masterToggle} ${isMetaphorsEnabled ? styles.enabled : styles.disabled}`}
 onClick={handleQuickToggle}
 >
 {isMetaphorsEnabled ? <Eye size={20} /> : <EyeOff size={20} />}
 </button>
 </div>
 <div className={styles.settingsGrid}>
 <div className={styles.settingCard}>
 <h4>Visual Anchors</h4>
 <p>Show visual metaphors for concepts</p>
 <label className={styles.switch}>
 <input
 type="checkbox"
 checked={settings.showAnalogies}
 onChange={(e) => handleSettingChange('showAnalogies', e.target.checked)}
 />
 <span className={styles.slider}></span>
 </label>
 <div className={styles.example}>
 {settings.showAnalogies ? (
 <span>{isScholarly ? 'Addition Abacus' : 'Addition Abacus '}</span>
 ) : (
 <span>Addition Addition</span>
 )}
 </div>
 </div>
 <div className={styles.settingCard}>
 <h4>Analogies</h4>
 <p>Include "like a..." explanations in learning content</p>
 <label className={styles.switch}>
 <input
 type="checkbox"
 checked={settings.showAnalogies}
 onChange={(e) => handleSettingChange('showAnalogies', e.target.checked)}
 />
 <span className={styles.slider}></span>
 </label>
 <div className={styles.example}>
 {settings.showAnalogies ? (
 <span>"Think of it like a calculator..."</span>
 ) : (
 <span>Direct explanation only</span>
 )}
 </div>
 </div>
 <div className={styles.settingCard}>
 <h4>Metaphor Complexity</h4>
 <p>Choose simple or detailed metaphors</p>
 <div className={styles.radioGroup}>
 <label className={styles.radioOption}>
 <input
 type="radio"
 name="complexity"
 checked={settings.metaphorComplexity === 'simple'}
 onChange={() => handleSettingChange('metaphorComplexity', 'simple')}
 />
 <span>Simple</span>
 <div className={styles.radioExample}>{isScholarly ? 'Key' : 'Key '}</div>
 </label>
 <label className={styles.radioOption}>
 <input
 type="radio"
 name="complexity"
 checked={settings.metaphorComplexity === 'rich'}
 onChange={() => handleSettingChange('metaphorComplexity', 'rich')}
 />
 <span>Rich</span>
 <div className={styles.radioExample}>{isScholarly ? 'Master key with timer' : 'Master key with timer '}</div>
 </label>
 </div>
 </div>
 <div className={styles.settingCard}>
 <h4>Custom Metaphors</h4>
 <p>Create your own metaphors for concepts</p>
 <label className={styles.switch}>
 <input
 type="checkbox"
 checked={settings.allowCustomMetaphors}
 onChange={(e) => handleSettingChange('allowCustomMetaphors', e.target.checked)}
 />
 <span className={styles.slider}></span>
 </label>
 <div className={styles.example}>
 {settings.allowCustomMetaphors ? (
 <span>Right-click "Change metaphor"</span>
 ) : (
 <span>Use system metaphors only</span>
 )}
 </div>
 </div>
 </div>
 <div className={styles.previewSection}>
 <h4>Preview</h4>
 <div className={styles.previewCard}>
 <div className={styles.conceptPreview}>
 {settings.showAnalogies && !isScholarly && <span className={styles.anchor}></span>}
 <span className={styles.conceptName}>Addition</span>
 </div>
 {settings.showAnalogies && (
 <p className={styles.analogyPreview}>
 {settings.metaphorComplexity === 'simple' 
 ? "Like using a calculator to combine numbers"
 : "Like using an ancient abacus where each bead represents a unit, and moving beads combines quantities to show the total sum"
 }
 </p>
 )}
 </div>
 </div>
 </div>
 );
}