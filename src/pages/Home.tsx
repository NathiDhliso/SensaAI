import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Archive, Sparkles, Clock, Zap, Cloud, Calendar } from 'lucide-react';
import { SensaShape } from '@/components/ui';
import type { SensaShapeType } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { useGenerationStore } from '@/store/generation-store';
import { useUIStore } from '@/store/ui-store';
import { usePersonalizationStore } from '@/store/personalization-store';
import { CloudLibraryModal } from '@/components/storage/CloudLibraryModal';
import { CATEGORY_COLORS, DIFFICULTY_COLORS } from '@/constants/theme-colors';
import { UI_TIMINGS } from '@/constants/ui-constants';
import styles from './Home.module.css';

const SUBJECT_CATEGORIES = [
  {
    id: 'cloud',
    name: 'Cloud & DevOps',
    shapeType: 'nebula' as SensaShapeType,
    color: CATEGORY_COLORS.cloud,
    subjects: [
      { name: 'Cloud Architecture', difficulty: 'Advanced', hours: 40 },
      { name: 'Container Orchestration', difficulty: 'Advanced', hours: 30 },
      { name: 'Infrastructure as Code', difficulty: 'Intermediate', hours: 25 },
      { name: 'CI/CD Pipelines', difficulty: 'Intermediate', hours: 20 },
      { name: 'Serverless Computing', difficulty: 'Beginner', hours: 15 },
    ],
  },
  {
    id: 'data',
    name: 'Data & AI',
    shapeType: 'synapse' as SensaShapeType,
    color: CATEGORY_COLORS.data,
    subjects: [
      { name: 'Machine Learning', difficulty: 'Intermediate', hours: 35 },
      { name: 'Data Visualization', difficulty: 'Beginner', hours: 20 },
      { name: 'Database Design', difficulty: 'Intermediate', hours: 25 },
      { name: 'Big Data Analytics', difficulty: 'Advanced', hours: 40 },
      { name: 'Artificial Intelligence', difficulty: 'Advanced', hours: 45 },
    ],
  },
  {
    id: 'dev',
    name: 'Development',
    shapeType: 'construct' as SensaShapeType,
    color: CATEGORY_COLORS.dev,
    subjects: [
      { name: 'Frontend Frameworks', difficulty: 'Intermediate', hours: 30 },
      { name: 'Backend Systems', difficulty: 'Intermediate', hours: 25 },
      { name: 'System Architecture', difficulty: 'Advanced', hours: 35 },
      { name: 'API Design', difficulty: 'Beginner', hours: 15 },
      { name: 'Mobile Development', difficulty: 'Intermediate', hours: 25 },
    ],
  },
  {
    id: 'security',
    name: 'Cybersecurity',
    shapeType: 'bastion' as SensaShapeType,
    color: CATEGORY_COLORS.security,
    subjects: [
      { name: 'Network Security', difficulty: 'Intermediate', hours: 30 },
      { name: 'Penetration Testing', difficulty: 'Advanced', hours: 40 },
      { name: 'Security Compliance', difficulty: 'Advanced', hours: 35 },
      { name: 'Cryptography', difficulty: 'Advanced', hours: 25 },
      { name: 'Incident Response', difficulty: 'Intermediate', hours: 20 },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    shapeType: 'prism' as SensaShapeType,
    color: CATEGORY_COLORS.business,
    subjects: [
      { name: 'Project Management', difficulty: 'Advanced', hours: 40 },
      { name: 'Business Analysis', difficulty: 'Intermediate', hours: 25 },
      { name: 'Product Strategy', difficulty: 'Intermediate', hours: 30 },
      { name: 'Financial Modeling', difficulty: 'Advanced', hours: 35 },
      { name: 'Agile Methodologies', difficulty: 'Beginner', hours: 15 },
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
  const [context, setContext] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCloudLibrary, setShowCloudLibrary] = useState(false);
  const navigate = useNavigate();

  /* Hooks & Store */
  const { openSettingsPanel } = useUIStore();
  // Using explicit cast to avoid type inference issues with store intersection types
  const { recentSubjects } = useGenerationStore() as any;

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

  const handleGenerate = () => {
    if (subject.trim()) {
      setShowSuggestions(false);
      // Navigate directly to Generate page with optional context
      const queryParams = context.trim() ? `?context=${encodeURIComponent(context.trim())}` : '';
      navigate(`/generate/${encodeURIComponent(subject)}${queryParams}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.heroWrapper}>
        <div className={styles.heroContent}>
          <SensaShape type="nebula" size="xl" className={styles.heroIcon} />

          <div className={styles.inputSection}>
            <div className={styles.inputWrapper}>
              <Search className={styles.searchIcon} />
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
                placeholder="e.g., AWS Solutions Architect, Python, PMP..."
                className={styles.input}
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

            {/* [NEW] Context Input */}
            <div className={styles.contextInputWrapper}>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Target Exam / Context (Optional) - e.g. AZ-104, NCLEX, High School AP"
                className={styles.contextInput}
              />
            </div>
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
        </div>

        {/* Semester Countdown Widget */}
        <div className={styles.semesterCountdown}>
          <div className={styles.countdownHeader}>
            <Calendar size={18} />
            <span>Semester Progress</span>
          </div>

          {(() => {
            const { semesterStartDate } = usePersonalizationStore();

            if (!semesterStartDate) {
              return (
                <div className={styles.countdownContent} style={{ alignItems: 'center', textAlign: 'center' }}>
                  <p className={styles.countdownMessage} style={{ marginBottom: '0.5rem' }}>
                    Set your semester start date to track progress.
                  </p>
                  <button
                    onClick={openSettingsPanel}
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-accent)',
                      background: 'none',
                      border: '1px solid var(--color-accent)',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '1rem',
                      cursor: 'pointer'
                    }}
                  >
                    Configure Schedule
                  </button>
                </div>
              );
            }

            const start = new Date(semesterStartDate);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const currentWeek = Math.ceil(diffDays / 7);
            const totalWeeks = 16; // Standard semester
            const weeksLeft = Math.max(0, totalWeeks - currentWeek);
            const progressPercent = Math.min(100, Math.max(0, (currentWeek / totalWeeks) * 100));

            return (
              <div className={styles.countdownContent}>
                <div className={styles.countdownStat}>
                  <span className={styles.countdownNumber}>{weeksLeft}</span>
                  <span className={styles.countdownLabel}>weeks left</span>
                </div>
                <div className={styles.countdownBar}>
                  <div className={styles.countdownFill} style={{ width: `${progressPercent}%` }} />
                </div>
                <p className={styles.countdownMessage}>
                  📅 Week {currentWeek} of {totalWeeks} — {currentWeek < 8 ? 'Build your foundations!' : 'Time to consolidate!'}
                </p>
              </div>
            );
          })()}
        </div>

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
    </div>
  );
}
