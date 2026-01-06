/**
 * StudyLayout - Unified Study Command Center Layout
 * 
 * Phase 0.4: Creates a shared layout wrapper for all learning-related routes.
 * This component will serve as the foundation for the unified /study/:subjectId
 * route structure in Phase 2.1.
 * 
 * @see SILVER_BULLET_LEARNING_ARCHITECTURE.md
 */

import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Map,
  Zap,
  BarChart3,
  ChevronDown,
  Settings,
  Brain
} from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import { usePersonalizationStore } from '@/store/personalization-store';
import { getRecommendedTab } from '@/lib/learning/profile-detector';
import { LifecycleNavigator } from '@/components/learning';
import styles from './StudyLayout.module.css';

export type StudyTab = 'overview' | 'learn' | 'palace' | 'sprint' | 'reference';

interface StudyLayoutProps {
  /** Current active tab */
  activeTab: StudyTab;
  /** Callback when tab changes */
  onTabChange?: (tab: StudyTab) => void;
  /** Optional subject name override */
  subjectName?: string;
  /** Child content to render in main area */
  children: ReactNode;
  /** Whether to show the lifecycle navigator */
  showLifecycleNav?: boolean;
  /** Custom header actions (right side) */
  headerActions?: ReactNode;
}

interface TabConfig {
  id: StudyTab;
  label: string;
  icon: typeof BookOpen;
  description: string;
  color: string;
}

const TABS: TabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: BarChart3,
    description: 'Progress & insights',
    color: 'var(--color-primary-amethyst)'
  },
  {
    id: 'learn',
    label: 'Velocity',
    icon: Zap,
    description: 'Active Learning Engine',
    color: 'var(--color-phase-prepare)'
  },
  {
    id: 'palace',
    label: 'Palace',
    icon: Map,
    description: 'Memory anchors',
    color: 'var(--color-secondary-amber)'
  },

  {
    id: 'sprint',
    label: 'Sprint',
    icon: Zap,
    description: 'Exam readiness',
    color: 'var(--color-accent-coral)'
  },
];

/**
 * StudyLayout provides a consistent wrapper for all study-related pages.
 * 
 * Features:
 * - Tab navigation (Overview, Learn, Palace, Sprint)
 * - Lifecycle progress bar
 * - Session info header
 * - Cognitive load indicator
 */
export function StudyLayout({
  activeTab,
  onTabChange,
  subjectName,
  children,
  showLifecycleNav = true,
  headerActions
}: StudyLayoutProps) {
  const navigate = useNavigate();
  const [isTabMenuOpen, setIsTabMenuOpen] = useState(false);

  const {
    getSession,
    getConcepts,
    getCognitiveLoadLevel
  } = useLearningStore();

  // Get inferred learning profile for personalized tab recommendations
  const inferredProfile = usePersonalizationStore(s => s.inferredProfile);
  const recommendedTab = getRecommendedTab(inferredProfile);

  const session = getSession();
  const concepts = getConcepts();
  const cognitiveLevel = getCognitiveLoadLevel();
  const progress = session?.progress;

  // Calculate progress for lifecycle navigator
  const lifecycleProgress = useMemo(() => {
    const progressData = concepts.reduce((acc, concept) => {
      // Determine phase based on lifecycle presence
      const hasPhase1 = !!concept.lifecycle?.phase1;
      const hasPhase2 = !!concept.lifecycle?.phase2;
      const hasPhase3 = !!concept.lifecycle?.phase3;
      const isCompleted = progress?.completedConcepts.includes(concept.id) ?? false;

      // Count concepts by phase (simplified - assumes all concepts have all phases)
      if (hasPhase1) {
        acc.phase1.total++;
        if (isCompleted) acc.phase1.completed++;
      }
      if (hasPhase2) {
        acc.phase2.total++;
        if (isCompleted) acc.phase2.completed++;
      }
      if (hasPhase3) {
        acc.phase3.total++;
        if (isCompleted) acc.phase3.completed++;
      }
      return acc;
    }, {
      phase1: { total: 0, completed: 0 },
      phase2: { total: 0, completed: 0 },
      phase3: { total: 0, completed: 0 },
    });

    return progressData;
  }, [concepts, progress?.completedConcepts]);

  // Default lifecycle labels
  const lifecycleLabels = {
    phase1: 'PREPARE',
    phase2: 'MODEL',
    phase3: 'DELIVER',
  };

  const displaySubject = subjectName || session?.subject || 'Study Session';

  const handleTabClick = useCallback((tab: StudyTab) => {
    if (onTabChange) {
      onTabChange(tab);
    }
    setIsTabMenuOpen(false);
  }, [onTabChange]);

  const location = useLocation();

  const handleBack = useCallback(() => {
    // Check if there is history to go back to
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate, location]);

  const activeTabConfig = TABS.find(t => t.id === activeTab) || TABS[0];

  // Cognitive load indicator color
  const cognitiveColor = {
    low: 'var(--color-success)',
    optimal: 'var(--color-phase-model)',
    high: 'var(--color-warning)',
    overload: 'var(--color-error)',
  }[cognitiveLevel];

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={handleBack} className={styles.backButton} aria-label="Back to home">
            <ArrowLeft size={18} />
          </button>

          <div className={styles.titleGroup}>
            <h1 className={styles.title}>{displaySubject}</h1>
            <span className={styles.sessionMode}>
              {session?.mode === 'sprint' ? 'Sprint Mode' :
                session?.mode === 'explore' ? 'Explore Mode' : 'Learning Mode'}
            </span>
          </div>
        </div>

        <div className={styles.headerCenter}>
          {/* Desktop Tab Navigation */}
          <nav className={styles.tabNav} role="tablist">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isRecommended = recommendedTab === tab.id && !isActive;

              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabClick(tab.id)}
                  className={`${styles.tabButton} ${isActive ? styles.tabActive : ''} ${isRecommended ? styles.tabRecommended : ''}`}
                  style={{ '--tab-color': tab.color } as React.CSSProperties}
                  title={isRecommended ? 'Recommended for you' : undefined}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                  {isRecommended && <span className={styles.recommendedBadge}>★</span>}
                </button>
              );
            })}
          </nav>

          {/* Mobile Tab Dropdown */}
          <div className={styles.tabDropdown}>
            <button
              className={styles.tabDropdownTrigger}
              onClick={() => setIsTabMenuOpen(!isTabMenuOpen)}
              aria-expanded={isTabMenuOpen}
            >
              <activeTabConfig.icon size={16} />
              <span>{activeTabConfig.label}</span>
              <ChevronDown size={14} className={isTabMenuOpen ? styles.rotated : ''} />
            </button>

            <AnimatePresence>
              {isTabMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={styles.tabDropdownMenu}
                >
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`${styles.tabDropdownItem} ${activeTab === tab.id ? styles.active : ''}`}
                      >
                        <Icon size={16} style={{ color: tab.color }} />
                        <div className={styles.tabDropdownItemText}>
                          <span className={styles.tabDropdownLabel}>{tab.label}</span>
                          <span className={styles.tabDropdownDesc}>{tab.description}</span>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className={styles.headerRight}>
          {/* Cognitive Load Indicator */}
          <div
            className={styles.cognitiveIndicator}
            title={`Cognitive Load: ${cognitiveLevel}`}
            style={{ '--cognitive-color': cognitiveColor } as React.CSSProperties}
          >
            <Brain size={16} />
            <span className={styles.cognitiveLevel}>{cognitiveLevel}</span>
          </div>

          {headerActions}

          <button
            className={styles.settingsButton}
            onClick={() => navigate('/settings')}
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Lifecycle Progress Bar */}
      {showLifecycleNav && concepts.length > 0 && (
        <LifecycleNavigator
          labels={lifecycleLabels}
          progress={lifecycleProgress}
          compact={true}
        />
      )}

      {/* Main Content */}
      <main className={styles.main}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className={styles.content}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default StudyLayout;
