/**
 * StudyLayout - Unified Study Command Center Layout
 * 
 * Phase 0.4: Creates a shared layout wrapper for all learning-related routes.
 * This component will serve as the foundation for the unified /study/:subjectId
 * route structure in Phase 2.1.
 * 
 * @see SILVER_BULLET_LEARNING_ARCHITECTURE.md
 */

import { useState, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  LayoutDashboard,
  Zap,
  ChevronDown,
  Settings,
  Brain,
  Home
} from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import { useUIStore } from '@/store/ui-store';

import styles from './StudyLayout.module.css';

export type StudyTab = 'overview' | 'learn' | 'reference';

interface StudyLayoutProps {
  /** Current active tab */
  activeTab: StudyTab;
  /** Callback when tab changes */
  onTabChange?: (tab: StudyTab) => void;
  /** Optional subject name override */
  subjectName?: string;
  /** Child content to render in main area */
  children: ReactNode;

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
    icon: LayoutDashboard,
    description: 'Structure & Progress',
    color: 'var(--color-phase-explore)'
  },
  {
    id: 'learn',
    label: 'Velocity',
    icon: Zap,
    description: 'Active Learning Engine',
    color: 'var(--color-phase-prepare)'
  },



];

/**
 * StudyLayout provides a consistent wrapper for all study-related pages.
 * 
 * Features:
 * - Tab navigation (Overview, Velocity Learning)
 * - Session info header
 * - Cognitive load indicator
 */
export function StudyLayout({
  activeTab,
  onTabChange,
  subjectName,
  children,

  headerActions
}: StudyLayoutProps) {
  const navigate = useNavigate();
  const [isTabMenuOpen, setIsTabMenuOpen] = useState(false);

  const {
    getSession,
    getCognitiveLoadLevel,
  } = useLearningStore();

  const session = getSession();
  const cognitiveLevel = getCognitiveLoadLevel();



  const displaySubject = subjectName || session?.subject || 'Study Session';

  const handleTabClick = useCallback((tab: StudyTab) => {
    if (onTabChange) {
      onTabChange(tab);
    }
    setIsTabMenuOpen(false);
  }, [onTabChange]);

  const handleBack = useCallback(() => {
    // Always go home - prevents returning to generate page which causes duplicates
    navigate('/');
  }, [navigate]);

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
          <button onClick={() => navigate('/')} className={styles.homeButton} aria-label="Go home">
            <Home size={18} />
          </button>

          <div className={styles.titleGroup}>
            <h1 className={styles.title}>{displaySubject}</h1>
            <span className={styles.sessionMode}>
              {session?.mode === 'explore' ? 'Explore Mode' : 'Learning Mode'}
            </span>
          </div>
        </div>

        <div className={styles.headerCenter}>
          {/* Desktop Tab Navigation */}
          <nav className={styles.tabNav} role="tablist">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabClick(tab.id)}
                  className={`${styles.tabButton} ${isActive ? styles.tabActive : ''}`}
                  style={{ '--tab-color': tab.color } as React.CSSProperties}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
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
            onClick={() => useUIStore.getState().openSettingsPanel()}
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>



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
