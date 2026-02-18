import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn,
  ArrowLeft,
  CheckCircle,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Target,
  AlertTriangle,
  Star,
  Zap,
} from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import type { ULCPattern, ULCCell } from '@/features/content-generation/parsers/ulc-detector';
import { getULCStats } from '@/features/content-generation/parsers/ulc-detector';
import styles from './OverviewMapView.module.css';

interface OverviewMapViewProps {
  concepts: LearningConcept[];
  ulcPattern: ULCPattern | null;
  onComplete: () => void;
}

type ViewMode = 'macro' | 'micro';

interface SelectedCell {
  objectIndex: number;
  verbIndex: number;
}

export default function OverviewMapView({
  concepts,
  ulcPattern,
  onComplete,
}: OverviewMapViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('macro');
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  const pattern = ulcPattern && ulcPattern.detected ? ulcPattern : null;

  const conceptById = useMemo(() => {
    const map = new Map<string, LearningConcept>();
    concepts.forEach(c => map.set(c.id, c));
    return map;
  }, [concepts]);

  const handleCellClick = (objectIndex: number, verbIndex: number) => {
    if (!pattern) return;
    const cell = pattern.matrix[objectIndex]?.[verbIndex];
    if (!cell?.conceptId) return;
    setSelectedCell({ objectIndex, verbIndex });
    setViewMode('micro');
  };

  const handleBackToMacro = () => {
    setViewMode('macro');
    setSelectedCell(null);
  };

  const handleNavigateVerb = (direction: 'prev' | 'next') => {
    if (!selectedCell || !pattern) return;
    const total = pattern.verbs.length;
    const newVerbIndex =
      direction === 'next'
        ? (selectedCell.verbIndex + 1) % total
        : (selectedCell.verbIndex - 1 + total) % total;
    const cell = pattern.matrix[selectedCell.objectIndex]?.[newVerbIndex];
    if (cell?.conceptId) {
      setSelectedCell({ ...selectedCell, verbIndex: newVerbIndex });
    }
  };

  if (!pattern) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.iconWrapper}><Sparkles size={28} /></div>
            <div>
              <h2 className={styles.title}>Overview</h2>
              <p className={styles.subtitle}>No ULC pattern detected</p>
            </div>
          </div>
          <motion.button
            onClick={onComplete}
            className={styles.completeButton}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <CheckCircle size={18} />
            Complete Overview
          </motion.button>
        </div>
        <div className={styles.macroView}>
          <p className={styles.noPatternText}>
            This subject does not follow a Universal Learning Cycle pattern. Total concepts: {concepts.length}
          </p>
        </div>
      </div>
    );
  }

  const stats = getULCStats(pattern);
  const currentCell =
    selectedCell != null
      ? pattern.matrix[selectedCell.objectIndex]?.[selectedCell.verbIndex]
      : null;
  const currentConcept =
    currentCell?.conceptId ? conceptById.get(currentCell.conceptId) : undefined;

  return (
    <div className={styles.container}>
      <div className={styles.backgroundGradient} />

      <div className={styles.header}>
        <div className={styles.headerContent}>
          <motion.div
            className={styles.iconWrapper}
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles size={28} />
          </motion.div>
          <div>
            <h2 className={styles.title}>
              {viewMode === 'macro' ? 'Universal Learning Cycle' : 'Deep Dive'}
            </h2>
            <p className={styles.subtitle}>
              {viewMode === 'macro'
                ? `${pattern.objects.length} resources × ${pattern.verbs.join(' → ')}`
                : `${currentCell?.verb} × ${currentCell?.object}`}
            </p>
          </div>
        </div>
        <motion.button
          onClick={onComplete}
          className={styles.completeButton}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <CheckCircle size={18} />
          Complete Overview
        </motion.button>
      </div>

      {stats.totalCells > 0 && (
        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.completionPercent}%</span>
            <span className={styles.statLabel}>Complete</span>
          </div>
          <div className={styles.statsProgressWrap}>
            <div className={styles.statsProgressFill} style={{ width: `${stats.completionPercent}%` }} />
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.masteredCells}</span>
            <span className={styles.statLabel}>Mastered</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.objectsCompleted}/{pattern.objects.length}</span>
            <span className={styles.statLabel}>Resources</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.verbsCompleted}/{pattern.verbs.length}</span>
            <span className={styles.statLabel}>Actions</span>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {viewMode === 'macro' && (
          <motion.div
            key="macro"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className={styles.macroView}
          >
            <ULCMacroView pattern={pattern} onCellClick={handleCellClick} />
          </motion.div>
        )}

        {viewMode === 'micro' && selectedCell != null && currentCell && (
          <motion.div
            key={`micro-${selectedCell.objectIndex}-${selectedCell.verbIndex}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className={styles.microView}
          >
            <MicroView
              pattern={pattern}
              objectIndex={selectedCell.objectIndex}
              verbIndex={selectedCell.verbIndex}
              cell={currentCell}
              concept={currentConcept}
              onBack={handleBackToMacro}
              onNavigateVerb={handleNavigateVerb}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ULCMacroView({
  pattern,
  onCellClick,
}: {
  pattern: ULCPattern;
  onCellClick: (objectIndex: number, verbIndex: number) => void;
}) {
  return (
    <div className={styles.ulcContainer}>
      <motion.div
        className={styles.ulcLegend}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className={styles.legendIcon}>
          <Layers size={24} />
        </div>
        <div className={styles.legendContent}>
          <p>{pattern.explanation}</p>
        </div>
      </motion.div>

      <div className={styles.ulcMatrix} role="grid">
        <div className={styles.matrixHeader} role="row">
          <div className={styles.matrixCorner}>
            <span className={styles.cornerLabel}>Resources</span>
          </div>
          {pattern.verbs.map((verb, index) => (
            <motion.div
              key={verb}
              className={styles.matrixVerb}
              role="columnheader"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
            >
              <span className={styles.verbNumber}>Step {index + 1}</span>
              <span className={styles.verbName}>{verb}</span>
            </motion.div>
          ))}
        </div>

        {pattern.matrix.map((row, rowIndex) => (
          <motion.div
            key={rowIndex}
            className={styles.matrixRow}
            role="row"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: rowIndex * 0.1, duration: 0.4 }}
          >
            <div className={styles.matrixObject} role="rowheader">
              <span className={styles.objectIcon}>◆</span>
              <span className={styles.objectName}>{pattern.objects[rowIndex]}</span>
            </div>
            {row.map((cell, cellIndex) => {
              const hasContent = !!cell.conceptId;
              const statusClass = !hasContent
                ? styles.cellEmpty
                : cell.status === 'mastered'
                ? styles.cellMastered
                : cell.status === 'learning'
                ? styles.cellLearning
                : styles.cellFilled;

              return (
                <motion.button
                  key={cellIndex}
                  className={`${styles.matrixCell} ${statusClass}`}
                  onClick={() => hasContent && onCellClick(rowIndex, cellIndex)}
                  disabled={!hasContent}
                  role="gridcell"
                  aria-label={
                    hasContent
                      ? `${cell.verb} ${cell.object}: ${cell.conceptName}`
                      : `${cell.verb} ${cell.object}: empty`
                  }
                  whileHover={hasContent ? { scale: 1.05, y: -4 } : {}}
                  whileTap={hasContent ? { scale: 0.95 } : {}}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (rowIndex + cellIndex) * 0.05, duration: 0.3 }}
                >
                  {!hasContent ? (
                    <span className={styles.emptyIndicator}>—</span>
                  ) : (
                    <div className={styles.cellContent}>
                      <div className={styles.cellStatusRow}>
                        {cell.status === 'mastered' && <Star size={12} className={styles.cellStatusIcon} />}
                        {cell.status === 'learning' && <Zap size={12} className={styles.cellStatusIcon} />}
                        {cell.status === 'not-started' && <ZoomIn size={12} className={styles.cellStatusIcon} />}
                        <span className={styles.cellStatusLabel}>
                          {cell.status === 'mastered'
                            ? 'Mastered'
                            : cell.status === 'learning'
                            ? 'In Progress'
                            : 'Explore'}
                        </span>
                      </div>
                      <span className={styles.cellConceptName}>{cell.conceptName}</span>
                    </div>
                  )}
                  <div className={styles.cellGlow} />
                </motion.button>
              );
            })}
          </motion.div>
        ))}
      </div>

      <motion.div
        className={styles.ulcHint}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <Sparkles size={16} />
        <p>Click any cell to explore the concept in depth</p>
      </motion.div>
    </div>
  );
}

function MicroView({
  pattern,
  objectIndex,
  verbIndex,
  cell,
  concept,
  onBack,
  onNavigateVerb,
}: {
  pattern: ULCPattern;
  objectIndex: number;
  verbIndex: number;
  cell: ULCCell;
  concept: LearningConcept | undefined;
  onBack: () => void;
  onNavigateVerb: (direction: 'prev' | 'next') => void;
}) {
  const [activeSection, setActiveSection] = useState<'overview' | 'steps' | 'details'>('overview');

  const prevVerbIndex = (verbIndex - 1 + pattern.verbs.length) % pattern.verbs.length;
  const nextVerbIndex = (verbIndex + 1) % pattern.verbs.length;
  const prevCell = pattern.matrix[objectIndex]?.[prevVerbIndex];
  const nextCell = pattern.matrix[objectIndex]?.[nextVerbIndex];
  const hasPrev = prevVerbIndex !== verbIndex && !!prevCell?.conceptId;
  const hasNext = nextVerbIndex !== verbIndex && !!nextCell?.conceptId;

  return (
    <div className={styles.microContainer}>
      <div className={styles.microNav}>
        <motion.button
          onClick={onBack}
          className={styles.backButton}
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={16} />
          Back to Matrix
        </motion.button>

        <div className={styles.verbNavigator}>
          <motion.button
            className={`${styles.verbNavBtn} ${!hasPrev ? styles.verbNavDisabled : ''}`}
            onClick={() => hasPrev && onNavigateVerb('prev')}
            disabled={!hasPrev}
            whileHover={hasPrev ? { x: -2 } : {}}
          >
            <ChevronLeft size={16} />
            {hasPrev ? prevCell?.verb : ''}
          </motion.button>

          <div className={styles.verbNavCurrent}>
            <span className={styles.verbNavObject}>{cell.object}</span>
            <div className={styles.verbNavDots}>
              {pattern.verbs.map((_, i) => (
                <div
                  key={i}
                  className={`${styles.verbNavDot} ${i === verbIndex ? styles.verbNavDotActive : ''}`}
                />
              ))}
            </div>
          </div>

          <motion.button
            className={`${styles.verbNavBtn} ${!hasNext ? styles.verbNavDisabled : ''}`}
            onClick={() => hasNext && onNavigateVerb('next')}
            disabled={!hasNext}
            whileHover={hasNext ? { x: 2 } : {}}
          >
            {hasNext ? nextCell?.verb : ''}
            <ChevronRight size={16} />
          </motion.button>
        </div>
      </div>

      <motion.div
        className={styles.microHeader}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.microTitle}>
          <span className={styles.microVerb}>{cell.verb}</span>
          <span className={styles.microSeparator}>×</span>
          <span className={styles.microObject}>{cell.object}</span>
        </div>
        {concept && <h3 className={styles.microConceptName}>{concept.name}</h3>}
        <div className={styles.microMeta}>
          <span
            className={`${styles.microStatus} ${
              cell.status === 'mastered'
                ? styles.statusMastered
                : cell.status === 'learning'
                ? styles.statusLearning
                : styles.statusNotStarted
            }`}
          >
            {cell.status === 'mastered'
              ? '★ Mastered'
              : cell.status === 'learning'
              ? '⚡ In Progress'
              : '○ Not Started'}
          </span>
          {concept?.lifecyclePhase && (
            <span className={styles.microPhase}>{concept.lifecyclePhase}</span>
          )}
        </div>
      </motion.div>

      <div className={styles.sectionTabs}>
        <button
          className={`${styles.sectionTab} ${activeSection === 'overview' ? styles.sectionTabActive : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          <BookOpen size={14} />
          Overview
        </button>
        <button
          className={`${styles.sectionTab} ${activeSection === 'steps' ? styles.sectionTabActive : ''}`}
          onClick={() => setActiveSection('steps')}
        >
          <Target size={14} />
          Steps
        </button>
        <button
          className={`${styles.sectionTab} ${activeSection === 'details' ? styles.sectionTabActive : ''}`}
          onClick={() => setActiveSection('details')}
        >
          <AlertTriangle size={14} />
          Details
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSection === 'overview' && (
          <motion.div
            key="overview"
            className={styles.sectionContent}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <OverviewSection concept={concept} cell={cell} />
          </motion.div>
        )}
        {activeSection === 'steps' && (
          <motion.div
            key="steps"
            className={styles.sectionContent}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <StepsSection concept={concept} cell={cell} />
          </motion.div>
        )}
        {activeSection === 'details' && (
          <motion.div
            key="details"
            className={styles.sectionContent}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <DetailsSection concept={concept} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className={styles.microFooter}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <button onClick={onBack} className={styles.backButtonLarge}>
          <ArrowLeft size={18} />
          Return to Matrix
        </button>
      </motion.div>
    </div>
  );
}

function OverviewSection({
  concept,
  cell,
}: {
  concept: LearningConcept | undefined;
  cell: ULCCell;
}) {
  if (!concept) {
    return (
      <div className={styles.emptySection}>
        <p>No concept data available for {cell.verb} × {cell.object}.</p>
      </div>
    );
  }

  return (
    <div className={styles.overviewGrid}>
      {concept.hookSentence && (
        <div className={styles.overviewCard}>
          <span className={styles.overviewCardLabel}>Why it matters</span>
          <p className={styles.overviewCardText}>{concept.hookSentence}</p>
        </div>
      )}
      {concept.whyYouNeed && (
        <div className={styles.overviewCard}>
          <span className={styles.overviewCardLabel}>Why you need this</span>
          <p className={styles.overviewCardText}>{concept.whyYouNeed}</p>
        </div>
      )}
      {concept.metaphor && (
        <div className={styles.overviewCard}>
          <span className={styles.overviewCardLabel}>Think of it as</span>
          <p className={styles.overviewCardText}>{concept.metaphor}</p>
        </div>
      )}
      {concept.shape?.simpleCore && (
        <div className={styles.overviewCard}>
          <span className={styles.overviewCardLabel}>Simple core</span>
          <p className={styles.overviewCardText}>{concept.shape.simpleCore}</p>
        </div>
      )}
      {concept.shape?.analogicalModel && (
        <div className={styles.overviewCard}>
          <span className={styles.overviewCardLabel}>Analogy</span>
          <p className={styles.overviewCardText}>{concept.shape.analogicalModel}</p>
        </div>
      )}
      {concept.shape?.highStakesExample && (
        <div className={styles.overviewCard}>
          <span className={styles.overviewCardLabel}>High-stakes example</span>
          <p className={styles.overviewCardText}>{concept.shape.highStakesExample}</p>
        </div>
      )}
      {concept.keyPoints && concept.keyPoints.length > 0 && (
        <div className={`${styles.overviewCard} ${styles.overviewCardFull}`}>
          <span className={styles.overviewCardLabel}>Key points</span>
          <ul className={styles.keyPointsList}>
            {concept.keyPoints.map((point, i) => (
              <li key={i} className={styles.keyPoint}>{point}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StepsSection({
  concept,
  cell,
}: {
  concept: LearningConcept | undefined;
  cell: ULCCell;
}) {
  if (!concept) {
    return (
      <div className={styles.emptySection}>
        <p>No step data available for {cell.verb} × {cell.object}.</p>
      </div>
    );
  }

  const hasHowToUse = concept.howToUse && concept.howToUse.length > 0;
  const hasExecution = !!cell.howSteps;
  const hasWorkedExample = !!(concept.workedExample?.steps && concept.workedExample.steps.length > 0);

  if (!hasHowToUse && !hasExecution && !hasWorkedExample) {
    return (
      <div className={styles.emptySection}>
        <p>No step-by-step procedures recorded yet for this concept.</p>
      </div>
    );
  }

  return (
    <div className={styles.stepsContainer}>
      {hasExecution && (
        <div className={styles.stepsGroup}>
          <span className={styles.stepsGroupLabel}>Execution</span>
          <div className={styles.executionBlock}>{cell.howSteps}</div>
        </div>
      )}
      {hasHowToUse && (
        <div className={styles.stepsGroup}>
          <span className={styles.stepsGroupLabel}>How to use</span>
          <div className={styles.howSteps}>
            {concept.howToUse!.map((step, i) => (
              <motion.div
                key={i}
                className={styles.howStep}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
              >
                <span className={styles.stepNumber}>{i + 1}</span>
                <span className={styles.stepText}>{step}</span>
                {i < concept.howToUse!.length - 1 && <div className={styles.stepConnector} />}
              </motion.div>
            ))}
          </div>
        </div>
      )}
      {hasWorkedExample && (
        <div className={styles.stepsGroup}>
          <span className={styles.stepsGroupLabel}>Worked example</span>
          <div className={styles.workedExample}>
            <p className={styles.workedProblem}>{concept.workedExample!.problem}</p>
            <div className={styles.howSteps}>
              {concept.workedExample!.steps.map((step, i) => (
                <div key={i} className={styles.howStep}>
                  <span className={styles.stepNumber}>{i + 1}</span>
                  <span className={styles.stepText}>{step}</span>
                  {i < concept.workedExample!.steps.length - 1 && (
                    <div className={styles.stepConnector} />
                  )}
                </div>
              ))}
            </div>
            {concept.workedExample!.solution && (
              <p className={styles.workedSolution}>
                <strong>Solution:</strong> {concept.workedExample!.solution}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailsSection({ concept }: { concept: LearningConcept | undefined }) {
  if (!concept) {
    return (
      <div className={styles.emptySection}>
        <p>No detail data available.</p>
      </div>
    );
  }

  const hasPitfalls = concept.commonPitfalls && concept.commonPitfalls.length > 0;
  const hasPatternRecognition = !!concept.shape?.patternRecognition;
  const hasEliminationLogic = !!concept.shape?.eliminationLogic;
  const hasTechnical = !!concept.technicalDetails;

  if (!hasPitfalls && !hasPatternRecognition && !hasEliminationLogic && !hasTechnical) {
    return (
      <div className={styles.emptySection}>
        <p>No additional details recorded for this concept.</p>
      </div>
    );
  }

  return (
    <div className={styles.detailsContainer}>
      {hasTechnical && (
        <div className={styles.detailCard}>
          <span className={styles.detailCardLabel}>Technical details</span>
          <p className={styles.detailCardText}>{concept.technicalDetails}</p>
        </div>
      )}
      {hasPatternRecognition && (
        <div className={styles.detailCard}>
          <span className={styles.detailCardLabel}>Pattern recognition</span>
          <p className={styles.detailQuestion}>{concept.shape!.patternRecognition!.question}</p>
          <p className={styles.detailAnswer}>{concept.shape!.patternRecognition!.answer}</p>
        </div>
      )}
      {hasEliminationLogic && (
        <div className={styles.detailCard}>
          <span className={styles.detailCardLabel}>Elimination logic</span>
          <p className={styles.detailCardText}>{concept.shape!.eliminationLogic}</p>
        </div>
      )}
      {hasPitfalls && (
        <div className={styles.detailCard}>
          <span className={styles.detailCardLabel}>Common pitfalls</span>
          <ul className={styles.pitfallsList}>
            {concept.commonPitfalls!.map((pitfall, i) => (
              <li key={i} className={styles.pitfallItem}>
                <AlertTriangle size={12} className={styles.pitfallIcon} />
                {pitfall}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
