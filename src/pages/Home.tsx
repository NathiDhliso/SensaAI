import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Archive, Sparkles, Clock, Zap, Cloud, Upload, ShieldCheck, FileText, X } from 'lucide-react';
import { SensaShape } from '@/components/ui';
import type { SensaShapeType } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { useGenerationStore } from '@/store/generation-store';
import { useUIStore } from '@/store/ui-store';
import { CloudLibraryModal } from '@/components/storage/CloudLibraryModal';
import { CATEGORY_COLORS, DIFFICULTY_COLORS } from '@/shared/constants/theme-colors';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import styles from './Home.module.css';

const SUBJECT_CATEGORIES = [
  {
    id: 'cloud',
    name: 'Cloud & DevOps',
    shapeType: 'nebula' as SensaShapeType,
    color: CATEGORY_COLORS.cloud,
    subjects: [
      { name: 'AWS Solutions Architect', difficulty: 'Advanced', hours: 40 },
      { name: 'Azure Administrator', difficulty: 'Intermediate', hours: 35 },
      { name: 'Kubernetes', difficulty: 'Advanced', hours: 30 },
      { name: 'Docker Fundamentals', difficulty: 'Beginner', hours: 15 },
      { name: 'Terraform', difficulty: 'Intermediate', hours: 25 },
    ],
  },
  {
    id: 'data',
    name: 'Data & AI',
    shapeType: 'synapse' as SensaShapeType,
    color: CATEGORY_COLORS.data,
    subjects: [
      { name: 'Machine Learning Fundamentals', difficulty: 'Intermediate', hours: 35 },
      { name: 'Python for Data Science', difficulty: 'Beginner', hours: 20 },
      { name: 'SQL Mastery', difficulty: 'Beginner', hours: 15 },
      { name: 'Power BI', difficulty: 'Intermediate', hours: 20 },
      { name: 'Data Engineering', difficulty: 'Advanced', hours: 40 },
    ],
  },
  {
    id: 'dev',
    name: 'Development',
    shapeType: 'construct' as SensaShapeType,
    color: CATEGORY_COLORS.dev,
    subjects: [
      { name: 'React & TypeScript', difficulty: 'Intermediate', hours: 30 },
      { name: 'Node.js Backend', difficulty: 'Intermediate', hours: 25 },
      { name: 'System Design', difficulty: 'Advanced', hours: 35 },
      { name: 'REST API Design', difficulty: 'Beginner', hours: 15 },
      { name: 'GraphQL', difficulty: 'Intermediate', hours: 20 },
    ],
  },
  {
    id: 'security',
    name: 'Cybersecurity',
    shapeType: 'bastion' as SensaShapeType,
    color: CATEGORY_COLORS.security,
    subjects: [
      { name: 'CompTIA Security+', difficulty: 'Intermediate', hours: 30 },
      { name: 'Network Security', difficulty: 'Advanced', hours: 35 },
      { name: 'Ethical Hacking', difficulty: 'Advanced', hours: 40 },
      { name: 'CISSP Fundamentals', difficulty: 'Expert', hours: 60 },
      { name: 'Penetration Testing', difficulty: 'Advanced', hours: 45 },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    shapeType: 'prism' as SensaShapeType,
    color: CATEGORY_COLORS.business,
    subjects: [
      { name: 'PMP Certification', difficulty: 'Advanced', hours: 40 },
      { name: 'Agile & Scrum', difficulty: 'Beginner', hours: 15 },
      { name: 'Business Analysis', difficulty: 'Intermediate', hours: 25 },
      { name: 'Product Management', difficulty: 'Intermediate', hours: 30 },
      { name: 'Financial Analysis', difficulty: 'Advanced', hours: 35 },
    ],
  }
];

const DIFFICULTY_LEVELS = {
  Beginner: { color: DIFFICULTY_COLORS.Beginner, shapeType: 'seed' as SensaShapeType, label: '~15-20 hrs' },
  Intermediate: { color: DIFFICULTY_COLORS.Intermediate, shapeType: 'sprout' as SensaShapeType, label: '~25-35 hrs' },
  Advanced: { color: DIFFICULTY_COLORS.Advanced, shapeType: 'bloom' as SensaShapeType, label: '~40-50 hrs' },
  Expert: { color: DIFFICULTY_COLORS.Expert, shapeType: 'crown' as SensaShapeType, label: '~60+ hrs' },
};

export default function Home() {
  const [subject, setSubject] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCloudLibrary, setShowCloudLibrary] = useState(false);
  const [blueprintFile, setBlueprintFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  /* Hooks & Store */
  const { openSettingsPanel } = useUIStore();
  const { recentSubjects, setPendingFile } = useGenerationStore();

  /* Derived State */
  const allSubjects = useMemo(() => {
    return SUBJECT_CATEGORIES.flatMap(cat => cat.subjects.map(sub => ({
      ...sub,
      category: cat.name
    })));
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (!subject.trim()) return [];
    return allSubjects.filter(s =>
      s.name.toLowerCase().includes(subject.toLowerCase())
    ).slice(0, 5);
  }, [subject, allSubjects]);

  const handleSelectSuggestion = (name: string) => {
    setSubject(name);
    setShowSuggestions(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBlueprintFile(file);
      setPendingFile(file);
    }
  };

  const handleRemoveFile = () => {
    setBlueprintFile(null);
    setPendingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = () => {
    if (subject.trim()) {
      setShowSuggestions(false);
      navigate(`/generate/${encodeURIComponent(subject)}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.heroWrapper}>
        <motion.div
          className={`${styles.heroContent} ${!subject ? styles.idle : ''}`}
          transition={{ duration: 0.3 }}
        >
          {/* Reactive Sensa Shape - Wakes up on input */}
          <div className={styles.heroIcon}>
            <SensaShape
              type="nebula"
              size="xl"
              animate={true}
            />
          </div>

          <div className={styles.inputSection}>
            <div className={styles.inputWrapper}>
              <Search
                className={styles.searchIcon}
                style={{
                  color: subject.length > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  filter: subject.length > 0 ? 'drop-shadow(0 0 8px var(--color-primary))' : 'none'
                }}
              />
              <input
                type="text"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), UI_TIMINGS.BLUR_DELAY)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="Enter any subject to learn..."
                className={styles.input}
                autoFocus
              />
              <AnimatePresence>
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <motion.div
                    className={styles.suggestionsDropdown}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {filteredSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        className={styles.suggestionItem}
                        onMouseDown={() => handleSelectSuggestion(s.name)}
                      >
                        <div className={styles.suggestionMain}>
                          <Sparkles size={14} />
                          <span>{s.name}</span>
                        </div>
                        <div className={styles.suggestionMeta}>
                          <span
                            className={styles.difficultyBadge}
                            style={{
                              background: DIFFICULTY_LEVELS[s.difficulty as keyof typeof DIFFICULTY_LEVELS]?.color + '20',
                              color: DIFFICULTY_LEVELS[s.difficulty as keyof typeof DIFFICULTY_LEVELS]?.color
                            }}
                          >
                            <SensaShape
                              type={DIFFICULTY_LEVELS[s.difficulty as keyof typeof DIFFICULTY_LEVELS]?.shapeType}
                              size="sm"
                              animate={false}
                            />
                            {s.difficulty}
                          </span>
                          <span className={styles.hoursBadge}>
                            <Clock size={12} /> {s.hours}h
                          </span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Blueprint Upload Section */}
            <div className={styles.blueprintSection}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.json,.txt"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="blueprint-upload"
              />

              {blueprintFile ? (
                <div className={styles.blueprintAttached}>
                  <div className={styles.blueprintInfo}>
                    <ShieldCheck size={16} className={styles.verifiedIcon} />
                    <FileText size={14} />
                    <span className={styles.blueprintName}>{blueprintFile.name}</span>
                    <span className={styles.groundedBadge}>GROUNDED</span>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className={styles.removeBlueprint}
                    aria-label="Remove blueprint"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={styles.uploadBlueprintButton}
                >
                  <Upload size={14} />
                  <span>Attach Exam Blueprint (Optional)</span>
                  <span className={styles.uploadHint}>PDF or JSON for verified content</span>
                </button>
              )}
            </div>
          </div>

          {/* Grounding Status Indicator */}
          <div className={styles.groundingStatus}>
            {blueprintFile ? (
              <div className={styles.groundedStatus}>
                <ShieldCheck size={14} />
                <span>Blueprint Grounded — Content will be verified against official objectives</span>
              </div>
            ) : (
              <div className={styles.ungroundedStatus}>
                <span>Standard Mode — AI knowledge only, verify against official docs</span>
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={!subject.trim()}
            className={styles.generateButton}
          >
            <Zap size={18} />
            Generate Learning System
          </button>

          {recentSubjects && recentSubjects.length > 0 && (
            <div className={styles.recentSection}>
              <div className={styles.recentTags}>
                <span className={styles.recentLabel}>Recent:</span>
                {recentSubjects.map((item: string) => (
                  <button
                    key={item}
                    onClick={() => setSubject(item)}
                    className={styles.recentTag}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <div className={styles.actionButtons}>
          <button onClick={() => setShowCloudLibrary(true)} className={styles.cloudLibraryButton}>
            <Cloud size={18} />
            Cloud Library
          </button>
          <button onClick={() => navigate('/library')} className={styles.savedButton}>
            <Archive size={18} />
            Saved Results
          </button>
          <button onClick={openSettingsPanel} className={styles.settingsButton}>
            Settings
          </button>
        </div>

        {/* Cloud Library Modal */}
        <CloudLibraryModal
          isOpen={showCloudLibrary}
          onClose={() => setShowCloudLibrary(false)}
          onUpdate={() => { }}
        />
      </div>
    </div >
  );
}
