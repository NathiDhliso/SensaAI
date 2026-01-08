import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Palette,
  Brain,
  Trash2,
  Download,
  FileJson,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  BookOpen,
  Zap,
  Eye,
  BookOpenCheck,
  Volume2, VolumeX, Bot,
  Edit2
} from 'lucide-react';
import { SensaIcon } from '@/components/ui';
import { useThemeStore, type Theme } from '@/store/theme-store';
import { usePersonalizationStore } from '@/store/personalization-store';
import { useLearningStore } from '@/store/learning-store';
import { useGenerationStore } from '@/store/generation-store';

import { UI_TIMINGS } from '@/constants/ui-constants';
import { getAllPersonas } from '@/lib/ai/coach';
import styles from './Settings.module.css';

const PROFILE_STYLES = [
  { value: 'visual', label: 'Visual (Palace)', icon: <SensaIcon icon={Eye} variant="glow" />, desc: 'Diagrams, charts, and imagery' },
  { value: 'text', label: 'Text (Velocity)', icon: <SensaIcon icon={BookOpen} variant="glow" />, desc: 'Structured text and lists' },
] as const;

const PROFILE_MODES = [
  { value: 'burst', label: 'Burst (5m)', icon: <SensaIcon icon={Zap} variant="glow" />, desc: 'Short, intense sprints' },
  { value: 'deep', label: 'Deep (25m)', icon: <SensaIcon icon={Brain} variant="glow" />, desc: 'Thorough, immersive sessions' },
] as const;

export default function Settings() {
  const navigate = useNavigate();

  // Theme
  const { theme, setTheme } = useThemeStore();

  // Personalization
  const {
    selectedPersona,
    setSelectedPersona,
    coachVoiceEnabled,
    setCoachVoiceEnabled,
    coachIntensity,
    setCoachIntensity,
    bionicReading,
    setBionicReading,
    resetOnboarding
  } = usePersonalizationStore();
  const personas = getAllPersonas();
  const activePersona = personas.find(p => p.id === selectedPersona) || personas[0];

  // Learning
  const {
    resetProgress,
    clearSession,
    currentSession,
    getSession,
    learningProfile,
    setLearningProfile
  } = useLearningStore();
  const progress = currentSession?.progress;
  const customContent = getSession();

  // Generation
  const { results } = useGenerationStore();

  // Local state
  const [showPersonas, setShowPersonas] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [confirmClear, setConfirmClear] = useState<string | null>(null);



  const handleClearData = (type: string) => {
    if (confirmClear === type) {
      switch (type) {
        case 'progress':
          resetProgress();
          break;
        case 'results':
          (useGenerationStore.setState as any)({ results: [] });
          break;
        case 'all':
          resetProgress();
          clearSession();
          resetOnboarding();
          (useGenerationStore.setState as any)({ results: [] });
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
      personalization: {
        // preferredLearningStyle, // Deprecated
        // familiarSystem, // Deprecated
        // onboardingComplete,
      },
      learning: {
        progress,
        customContent,
      },
      generation: {
        results,
      },
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensa-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };



  const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          <ArrowLeft className={styles.backIcon} />
          Back
        </button>

        <div className={styles.card}>
          <h1 className={styles.title}>Settings</h1>

          {/* Appearance Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Palette className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Appearance</h2>
            </div>
            <div className={styles.themeToggle}>
              {themeOptions.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`${styles.themeOption} ${theme === value ? styles.themeOptionActive : ''}`}
                  title={label}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Learning Profile Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Brain className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Learning Profile</h2>
            </div>

            {/* Visual vs Text */}
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Primary Style</span>
                <span className={styles.settingDesc}>How do you prefer to learn?</span>
              </div>
              <div className={styles.optionGrid}>
                {PROFILE_STYLES.map(({ value, label, icon, desc }) => (
                  <button
                    key={value}
                    onClick={() => setLearningProfile({ style: value as 'visual' | 'text' })}
                    className={`${styles.optionButton} ${learningProfile?.style === value ? styles.optionActive : ''}`}
                    title={desc}
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
                {PROFILE_MODES.map(({ value, label, icon, desc }) => (
                  <button
                    key={value}
                    onClick={() => setLearningProfile({ mode: value as 'burst' | 'deep' })}
                    className={`${styles.optionButton} ${learningProfile?.mode === value ? styles.optionActive : ''}`}
                    title={desc}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Toggles */}
            <div className={styles.togglesGrid} style={{ marginTop: '1.5rem' }}>
              <button
                onClick={() => setBionicReading(!bionicReading)}
                className={`${styles.toggleButton} ${bionicReading ? styles.toggleActive : ''}`}
                aria-pressed={bionicReading}
              >
                <BookOpenCheck size={16} />
                <span>Bionic Reading</span>
              </button>
            </div>

            <button
              onClick={() => {
                resetOnboarding();
                // navigate('/study/current'); // Optional: redirect if desired
              }}
              className={styles.linkButton}
              style={{ marginTop: '1rem' }}
            >
              <RefreshCw size={14} />
              Retake onboarding quiz
            </button>
          </div>

          {/* AI Companion Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Bot className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>AI Companion</h2>
            </div>

            {/* Compact Persona Selector */}
            <div className={styles.settingRow}>
              <div className={styles.compactPersonaRow}>
                <div className={styles.personaPreview}>
                  <span className={styles.personaEmoji}>{activePersona.emoji}</span>
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
                  {showPersonas ? 'Close' : 'Change Coach'}
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
                      className={`${styles.personaCard} ${selectedPersona === persona.id ? styles.personaCardActive : ''}`}
                    >
                      <span className={styles.personaEmoji}>{persona.emoji}</span>
                      <div className={styles.personaInfo}>
                        <span className={styles.personaName}>{persona.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.settingRow}>
              <div className={styles.flexRow}>
                <div className={styles.voiceControls}>
                  <button
                    onClick={() => setCoachVoiceEnabled(!coachVoiceEnabled)}
                    className={`${styles.toggleButton} ${coachVoiceEnabled ? styles.toggleActive : ''}`}
                    aria-pressed={coachVoiceEnabled}
                  >
                    {coachVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    <span>Voice</span>
                  </button>
                </div>
                <div className={styles.intensityRow}>
                  <span className={styles.intensityLabel}>Intensity</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={coachIntensity}
                    onChange={(e) => setCoachIntensity(Number(e.target.value))}
                    className={styles.intensitySlider}
                  />
                  <span className={styles.intensityValue}>{coachIntensity}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Data Management Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <FileJson className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Data Management</h2>
            </div>

            <div className={styles.dataStatsCompact}>
              <div className={styles.statItem}>
                <strong>{progress?.completedConcepts.length ?? 0}</strong> Concepts
              </div>
              <div className={styles.statSeparator}>•</div>
              <div className={styles.statItem}>
                <strong>{progress?.totalTimeSpentMinutes ?? 0}m</strong> Studied
              </div>
              <button onClick={handleExportData} className={styles.iconButton} title="Export Data">
                <Download size={16} />
              </button>
            </div>

            <button
              className={styles.dangerZoneHeader}
              onClick={() => setShowDangerZone(!showDangerZone)}
            >
              <div className={styles.flexCenter}>
                <AlertTriangle size={16} className={styles.dangerIcon} />
                <span>Danger Zone</span>
              </div>
              {showDangerZone ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showDangerZone && (
              <div className={styles.dangerActions}>
                <button
                  onClick={() => handleClearData('progress')}
                  className={`${styles.dangerButton} ${confirmClear === 'progress' ? styles.dangerConfirm : ''}`}
                >
                  <Trash2 size={14} />
                  {confirmClear === 'progress' ? 'Confirm Clear Progress' : 'Clear Progress'}
                </button>
                {/* <button
                  onClick={() => handleClearData('results')}
                  className={`${styles.dangerButton} ${confirmClear === 'results' ? styles.dangerConfirm : ''}`}
                >
                  <Trash2 size={14} />
                  {confirmClear === 'results' ? 'Confirm Clear Results' : 'Clear Results'}
                </button> */}

                <button
                  onClick={() => handleClearData('all')}
                  className={`${styles.dangerButton} ${confirmClear === 'all' ? styles.dangerConfirm : ''}`}
                >
                  <Trash2 size={14} />
                  {confirmClear === 'all' ? 'Confirm Reset App' : 'Reset App Data'}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
