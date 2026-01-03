import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Archive, Sparkles, Clock, BookOpen, TrendingUp, ChevronRight, Zap } from 'lucide-react';
import { SensaShape } from '@/components/ui';
import type { SensaShapeType } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { useGenerationStore } from '@/store/generation-store';
import { useUIStore } from '@/store/ui-store';
import { useLearningStore } from '@/store/learning-store';
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const { recentSubjects, bedrockConfig } = useGenerationStore();
  const { openSettingsPanel } = useUIStore();
  const { currentSession, getConcepts } = useLearningStore();

  const concepts = getConcepts();
  const progress = currentSession?.progress;
  const hasProgress = concepts.length > 0 && (progress?.completedConcepts?.length ?? 0) > 0;
  const progressPercent = concepts.length > 0
    ? Math.round(((progress?.completedConcepts?.length ?? 0) / concepts.length) * 100)
    : 0;

  const filteredSuggestions = useMemo(() => {
    if (!subject.trim()) return [];
    const query = subject.toLowerCase();
    const matches: Array<{ name: string; difficulty: string; hours: number; category: string }> = [];

    SUBJECT_CATEGORIES.forEach(cat => {
      cat.subjects.forEach(s => {
        if (s.name.toLowerCase().includes(query)) {
          matches.push({ ...s, category: cat.name });
        }
      });
    });

    return matches.slice(0, 5);
  }, [subject]);

  const handleGenerate = () => {
    if (subject.trim()) {
      setShowSuggestions(false);
      if (bedrockConfig) {
        // Navigate directly to Generate page - diagnostic will happen after Pass 1 completes
        navigate(`/generate/${encodeURIComponent(subject)}`);
      } else {
        // No credentials - prompt to configure
        openSettingsPanel();
      }
    }
  };

  const handleSelectSuggestion = (name: string) => {
    setSubject(name);
    setShowSuggestions(false);
  };

  const selectedCategoryData = selectedCategory
    ? SUBJECT_CATEGORIES.find(c => c.id === selectedCategory)
    : null;

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>SensaAI</h1>
          <p className={styles.subtitle}>
            Turn any subject into a structured learning system
          </p>
        </div>

        {hasProgress && (
          <motion.div
            className={styles.progressCard}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.progressInfo}>
              <TrendingUp size={20} />
              <div>
                <strong>Continue Learning</strong>
                <p>{progress?.completedConcepts?.length ?? 0} of {concepts.length} concepts mastered</p>
              </div>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progressPercent}% ` }}
              />
            </div>
            <button
              className={styles.continueButton}
              onClick={() => navigate('/study/current')}
            >
              Continue <ChevronRight size={16} />
            </button>
          </motion.div>
        )}

        <div className={styles.card}>
          <div className={styles.inputSection}>
            <label className={styles.label}>What do you want to master?</label>
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
          </div>

          <button
            onClick={handleGenerate}
            disabled={!subject.trim()}
            className={styles.generateButton}
          >
            <Zap size={18} />
            Generate Learning System
          </button>

          {!bedrockConfig && (
            <div className={styles.infoBox}>
              <span>AWS credentials required. </span>
              <button onClick={openSettingsPanel} className={styles.settingsLink}>
                Configure in Settings
              </button>
            </div>
          )}

          <div className={styles.categoriesSection}>
            <p className={styles.categoriesLabel}>Or explore by category:</p>
            <div className={styles.categoryTabs}>
              {SUBJECT_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`${styles.categoryTab} ${selectedCategory === cat.id ? styles.categoryTabActive : ''} `}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  style={{ '--cat-color': cat.color } as React.CSSProperties}
                >
                  <SensaShape type={cat.shapeType} size="md" />
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            <AnimatePresence>
              {selectedCategoryData && (
                <motion.div
                  className={styles.categorySubjects}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {selectedCategoryData.subjects.map((s, idx) => (
                    <button
                      key={idx}
                      className={styles.subjectCard}
                      onClick={() => {
                        setSubject(s.name);
                        setSelectedCategory(null);
                      }}
                    >
                      <div className={styles.subjectName}>{s.name}</div>
                      <div className={styles.subjectMeta}>
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
                          <Clock size={12} /> ~{s.hours} hrs
                        </span>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Difficulty Legend */}
          <div className={styles.legend}>
            <div className={styles.legendTitle}>Difficulty Levels</div>
            <div className={styles.legendGrid}>
              {Object.entries(DIFFICULTY_LEVELS).map(([level, config]) => (
                <div key={level} className={styles.legendItem}>
                  <span className={styles.legendIcon} style={{ color: config.color }}>
                    <SensaShape type={config.shapeType} size="sm" />
                  </span>
                  <span className={styles.legendLabel}>{level}</span>
                  <span className={styles.legendHours}>{config.label}</span>
                </div>
              ))}
            </div>
          </div>

          {recentSubjects.length > 0 && (
            <div className={styles.recentSection}>
              <div className={styles.recentTags}>
                <span className={styles.recentLabel}>Recent:</span>
                {recentSubjects.map((item) => (
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

        <div className={styles.actionButtons}>
          <button onClick={() => navigate('/study/current')} className={styles.learnButton}>
            <BookOpen size={18} />
            Learning Journey
          </button>
          <button onClick={() => navigate('/library')} className={styles.savedButton}>
            <Archive size={18} />
            Saved Results
          </button>
          <button onClick={openSettingsPanel} className={styles.settingsButton}>
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
