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
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Database,
  Eye,
  Hammer,
  HardHat,
  ChefHat,
  Plane,
  Stethoscope,
  Trophy,
  Leaf,
  EyeOff
} from 'lucide-react';
import { SensaIcon } from '@/components/ui';
import { useThemeStore, type Theme } from '@/store/theme-store';
import { usePersonalizationStore, type FamiliarSystem } from '@/store/personalization-store';
import { useLearningStore } from '@/store/learning-store';
import { useGenerationStore } from '@/store/generation-store';
import { usePalaceStore } from '@/store/palace-store';
import { UI_TIMINGS } from '@/constants/ui-constants';
import type { BedrockConfig } from '@/lib/generation/claude-client';
import styles from './Settings.module.css';

const LEARNING_STYLES = [
  { value: 'visual', label: 'Visual', icon: <SensaIcon icon={Eye} variant="glow" />, desc: 'Diagrams, charts, and imagery' },
  { value: 'practical', label: 'Practical', icon: <SensaIcon icon={Hammer} variant="glow" />, desc: 'Hands-on examples and exercises' },
  { value: 'theoretical', label: 'Theoretical', icon: <SensaIcon icon={BookOpen} variant="glow" />, desc: 'Deep concepts and principles' },
] as const;

const FAMILIAR_SYSTEMS = [
  { value: 'construction', label: 'Construction', icon: <SensaIcon icon={HardHat} /> },
  { value: 'cooking', label: 'Cooking', icon: <SensaIcon icon={ChefHat} /> },
  { value: 'travel', label: 'Travel', icon: <SensaIcon icon={Plane} /> },
  { value: 'healthcare', label: 'Healthcare', icon: <SensaIcon icon={Stethoscope} /> },
  { value: 'sports', label: 'Sports', icon: <SensaIcon icon={Trophy} /> },
  { value: 'nature', label: 'Nature', icon: <SensaIcon icon={Leaf} /> },
] as const;

export default function Settings() {
  const navigate = useNavigate();

  // Theme
  const { theme, setTheme } = useThemeStore();

  // Personalization
  const {
    preferredLearningStyle,
    familiarSystem,
    onboardingComplete,
    resetOnboarding,
    aphantasiaMode,
    setAphantasiaMode,
  } = usePersonalizationStore();
  const updateLearningStyle = usePersonalizationStore(s => s.completeOnboarding);
  const updateFamiliarSystem = usePersonalizationStore(s => s.updateFamiliarSystem);

  // Learning
  const { resetProgress, clearSession, currentSession, getSession } = useLearningStore();
  const progress = currentSession?.progress;
  const customContent = getSession();

  // Generation
  const { bedrockConfig, setBedrockConfig, clearBedrockConfig, results, recentSubjects } = useGenerationStore();

  // Palace
  const { clearPalace } = usePalaceStore();

  // Local state
  const [showAwsConfig, setShowAwsConfig] = useState(false);
  const [region, setRegion] = useState(bedrockConfig?.region || 'us-east-1');
  const [accessKeyId, setAccessKeyId] = useState(bedrockConfig?.accessKeyId || '');
  const [secretAccessKey, setSecretAccessKey] = useState(bedrockConfig?.secretAccessKey || '');
  const [showSecrets, setShowSecrets] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState<string | null>(null);

  const isEnvConfigured = import.meta.env.VITE_AWS_REGION &&
    import.meta.env.VITE_AWS_ACCESS_KEY_ID &&
    import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;

  const handleSaveAws = () => {
    if (region.trim() && accessKeyId.trim() && secretAccessKey.trim()) {
      const config: BedrockConfig = {
        region: region.trim(),
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      };
      setBedrockConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), UI_TIMINGS.TOAST_SHORT);
    }
  };

  const handleClearData = (type: string) => {
    if (confirmClear === type) {
      switch (type) {
        case 'progress':
          resetProgress();
          break;
        case 'results':
          useGenerationStore.setState({ results: [], recentSubjects: [] });
          break;
        case 'palace':
          clearPalace();
          break;
        case 'all':
          resetProgress();
          clearSession();
          resetOnboarding();
          clearPalace();
          useGenerationStore.setState({ results: [], recentSubjects: [] });
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
        preferredLearningStyle,
        familiarSystem,
        onboardingComplete,
      },
      learning: {
        progress,
        customContent,
      },
      generation: {
        results,
        recentSubjects,
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

  const maskSecret = (secret: string) =>
    secret ? `${secret.slice(0, 4)}${'•'.repeat(Math.max(0, secret.length - 8))}${secret.slice(-4)}` : '';

  const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <button onClick={() => navigate('/')} className={styles.backButton}>
          <ArrowLeft className={styles.backIcon} />
          Back to Home
        </button>

        <div className={styles.card}>
          <h1 className={styles.title}>Settings</h1>

          {/* Appearance Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Palette className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Appearance</h2>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Theme</span>
                <span className={styles.settingDesc}>Choose your preferred color scheme</span>
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
          </div>

          {/* Learning Preferences Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Brain className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Learning Preferences</h2>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Learning Style</span>
                <span className={styles.settingDesc}>How you prefer to learn new concepts</span>
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
                <span className={styles.settingDesc}>Metaphors used to explain concepts</span>
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

            {/* Aphantasia Mode Toggle */}
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Aphantasia Mode</span>
                <span className={styles.settingDesc}>
                  Replaces "Picture..." prompts with sequential/logical descriptions for those who can't visualize mentally
                </span>
              </div>
              <button
                onClick={() => setAphantasiaMode(!aphantasiaMode)}
                className={`${styles.toggleButton} ${aphantasiaMode ? styles.toggleActive : ''}`}
                aria-pressed={aphantasiaMode}
              >
                {aphantasiaMode ? <Eye size={16} /> : <EyeOff size={16} />}
                <span>{aphantasiaMode ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>

            {onboardingComplete && (
              <button
                onClick={() => {
                  resetOnboarding();
                  navigate('/study/current');
                }}
                className={styles.linkButton}
              >
                <RefreshCw size={14} />
                Retake onboarding quiz
              </button>
            )}
          </div>

          {/* Data Management Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Database className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Data Management</h2>
            </div>

            <div className={styles.dataStats}>
              <div className={styles.dataStat}>
                <span className={styles.dataValue}>{progress?.completedConcepts.length ?? 0}</span>
                <span className={styles.dataLabel}>Concepts Learned</span>
              </div>
              <div className={styles.dataStat}>
                <span className={styles.dataValue}>{results.length}</span>
                <span className={styles.dataLabel}>Saved Results</span>
              </div>
              <div className={styles.dataStat}>
                <span className={styles.dataValue}>{progress?.totalTimeSpentMinutes ?? 0}</span>
                <span className={styles.dataLabel}>Minutes Studied</span>
              </div>
            </div>

            <div className={styles.dataActions}>
              <button onClick={handleExportData} className={styles.actionButton}>
                <Download size={16} />
                Export Data
              </button>
            </div>

            <div className={styles.dangerZone}>
              <h3 className={styles.dangerTitle}>
                <AlertTriangle size={16} />
                Danger Zone
              </h3>
              <div className={styles.dangerActions}>
                <button
                  onClick={() => handleClearData('progress')}
                  className={`${styles.dangerButton} ${confirmClear === 'progress' ? styles.dangerConfirm : ''}`}
                >
                  <Trash2 size={14} />
                  {confirmClear === 'progress' ? 'Click again to confirm' : 'Clear Learning Progress'}
                </button>
                <button
                  onClick={() => handleClearData('results')}
                  className={`${styles.dangerButton} ${confirmClear === 'results' ? styles.dangerConfirm : ''}`}
                >
                  <Trash2 size={14} />
                  {confirmClear === 'results' ? 'Click again to confirm' : 'Clear Saved Results'}
                </button>
                <button
                  onClick={() => handleClearData('palace')}
                  className={`${styles.dangerButton} ${confirmClear === 'palace' ? styles.dangerConfirm : ''}`}
                >
                  <Trash2 size={14} />
                  {confirmClear === 'palace' ? 'Click again to confirm' : 'Reset Memory Palace'}
                </button>
                <button
                  onClick={() => handleClearData('all')}
                  className={`${styles.dangerButton} ${confirmClear === 'all' ? styles.dangerConfirm : ''}`}
                >
                  <Trash2 size={14} />
                  {confirmClear === 'all' ? 'Click again to confirm' : 'Reset All Data'}
                </button>
              </div>
            </div>
          </div>

          {/* AWS Configuration Section */}
          <div className={styles.section}>
            <button
              className={styles.collapsibleHeader}
              onClick={() => setShowAwsConfig(!showAwsConfig)}
            >
              <div className={styles.sectionHeader}>
                <Sparkles className={styles.sectionIcon} />
                <h2 className={styles.sectionTitle}>AI Configuration</h2>
                {(isEnvConfigured || bedrockConfig) && (
                  <span className={styles.configuredBadge}>
                    <CheckCircle2 size={14} />
                    Configured
                  </span>
                )}
              </div>
              {showAwsConfig ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {showAwsConfig && (
              <div className={styles.collapsibleContent}>
                {isEnvConfigured ? (
                  <div className={styles.envConfigured}>
                    <CheckCircle2 className={styles.envIcon} />
                    <div>
                      <strong>Configured via Environment</strong>
                      <p>Region: {import.meta.env.VITE_AWS_REGION}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className={styles.description}>
                      Configure AWS Bedrock credentials to enable AI-powered content generation.
                    </p>

                    <div className={styles.inputGroup}>
                      <label className={styles.label}>AWS Region</label>
                      <select
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className={styles.input}
                      >
                        <option value="us-east-1">US East (N. Virginia)</option>
                        <option value="us-west-2">US West (Oregon)</option>
                        <option value="eu-west-1">Europe (Ireland)</option>
                        <option value="eu-central-1">Europe (Frankfurt)</option>
                        <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                        <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                      </select>
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.label}>AWS Access Key ID</label>
                      <div className={styles.inputWrapper}>
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          value={showSecrets ? accessKeyId : maskSecret(accessKeyId)}
                          onChange={(e) => setAccessKeyId(e.target.value)}
                          placeholder="AKIA..."
                          className={styles.input}
                        />
                        <button
                          onClick={() => setShowSecrets(!showSecrets)}
                          className={styles.toggleButton}
                          type="button"
                        >
                          {showSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.label}>AWS Secret Access Key</label>
                      <div className={styles.inputWrapper}>
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          value={showSecrets ? secretAccessKey : maskSecret(secretAccessKey)}
                          onChange={(e) => setSecretAccessKey(e.target.value)}
                          placeholder="Secret key..."
                          className={styles.input}
                        />
                      </div>
                    </div>

                    <div className={styles.actions}>
                      <button
                        onClick={handleSaveAws}
                        disabled={!region.trim() || !accessKeyId.trim() || !secretAccessKey.trim()}
                        className={styles.saveButton}
                      >
                        {saved ? 'Saved!' : 'Save Credentials'}
                      </button>
                      {bedrockConfig && (
                        <button onClick={clearBedrockConfig} className={styles.clearButton}>
                          Clear
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* About Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <BookOpen className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>About</h2>
            </div>
            <p className={styles.aboutText}>
              <strong>SensaPBL</strong> uses AI to create structured learning materials with zero cognitive overhead.
              The multi-pass generation system ensures accuracy through domain analysis, dependency mapping, and quality validation.
            </p>
            <div className={styles.version}>Version 1.0.0</div>
          </div>
        </div>
      </div>
    </div>
  );
}
