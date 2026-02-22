/**
 * Learner Feedback Integration
 * Analyzes learner performance data to identify struggling concepts,
 * common errors, and generates AI-powered clarification suggestions.
 * Features a heatmap view showing problem concepts at a glance.
 */

import { useState } from 'react';
import { useLearnerFeedback, useGenerateClarifications } from '../hooks/useLearnerFeedback';
import type {
  LearnerPerformanceData,
  HeatmapCell,
  ClarificationSuggestion,
} from '../types/enhancements';
import styles from './LearnerFeedbackPanel.module.css';

type ViewMode = 'heatmap' | 'table' | 'clarifications';

function getMasteryColor(score: number): string {
  if (score >= 80) return 'var(--color-success, #22c55e)';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return 'var(--color-warning, #f59e0b)';
  if (score >= 20) return '#f97316';
  return 'var(--color-error, #ef4444)';
}

function getMasteryBg(score: number): string {
  if (score >= 80) return 'rgba(34, 197, 94, 0.15)';
  if (score >= 60) return 'rgba(132, 204, 22, 0.15)';
  if (score >= 40) return 'rgba(245, 158, 11, 0.15)';
  if (score >= 20) return 'rgba(249, 115, 22, 0.15)';
  return 'rgba(239, 68, 68, 0.15)';
}

function HeatmapView({ cells }: { cells: HeatmapCell[] }) {
  const domains = [...new Set(cells.map((c) => c.domain))];

  return (
    <div className={styles.heatmapContainer}>
      {domains.map((domain) => {
        const domainCells = cells.filter((c) => c.domain === domain);
        return (
          <div key={domain} className={styles.heatmapDomain}>
            <h3 className={styles.heatmapDomainTitle}>{domain}</h3>
            <div className={styles.heatmapGrid}>
              {domainCells.map((cell) => (
                <div
                  key={cell.conceptId}
                  className={styles.heatmapCell}
                  style={{ background: getMasteryBg(cell.masteryScore) }}
                  title={`${cell.conceptName}: ${cell.masteryScore}% mastery, ${cell.learnerCount} learners`}
                >
                  <span
                    className={styles.heatmapScore}
                    style={{ color: getMasteryColor(cell.masteryScore) }}
                  >
                    {cell.masteryScore}
                  </span>
                  <span className={styles.heatmapConcept}>{cell.conceptName}</span>
                  <span className={styles.heatmapLearners}>{cell.learnerCount} learners</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div className={styles.heatmapLegend}>
        <span className={styles.legendLabel}>Mastery:</span>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--color-error, #ef4444)' }} />
          0-20%
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#f97316' }} />
          21-40%
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--color-warning, #f59e0b)' }} />
          41-60%
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#84cc16' }} />
          61-80%
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--color-success, #22c55e)' }} />
          81-100%
        </div>
      </div>
    </div>
  );
}

function ProblemConceptsTable({ concepts }: { concepts: LearnerPerformanceData[] }) {
  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <span className={styles.tableCol}>Concept</span>
        <span className={styles.tableColSmall}>Domain</span>
        <span className={styles.tableColSmall}>Avg Mastery</span>
        <span className={styles.tableColSmall}>Struggling</span>
        <span className={styles.tableColSmall}>Attempts</span>
        <span className={styles.tableColSmall}>Top Error</span>
      </div>
      {concepts.map((concept) => (
        <div key={concept.conceptId} className={styles.tableRow}>
          <span className={styles.tableCol}>
            <span className={styles.conceptName}>{concept.conceptName}</span>
            <span className={styles.conceptLearners}>{concept.learnerCount} learners</span>
          </span>
          <span className={styles.tableColSmall}>
            <span className={styles.domainTag}>{concept.domain}</span>
          </span>
          <span className={styles.tableColSmall}>
            <span
              className={styles.masteryValue}
              style={{ color: getMasteryColor(concept.averageMasteryScore) }}
            >
              {concept.averageMasteryScore.toFixed(0)}%
            </span>
          </span>
          <span className={styles.tableColSmall}>
            <span className={styles.strugglePercent}>
              {concept.consistentlyStruggledBy}%
            </span>
          </span>
          <span className={styles.tableColSmall}>{concept.attemptsToMastery.toFixed(1)}</span>
          <span className={styles.tableColSmall}>
            {concept.commonErrors[0] ? (
              <span className={styles.errorType} title={concept.commonErrors[0].description}>
                {concept.commonErrors[0].errorType}
              </span>
            ) : (
              <span className={styles.noError}>—</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function ClarificationsView({
  suggestions,
  onGenerate,
  isGenerating,
}: {
  suggestions: ClarificationSuggestion[];
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className={styles.clarificationsContainer}>
      <div className={styles.clarificationsHeader}>
        <p className={styles.clarificationsDesc}>
          AI-generated clarification suggestions based on learner error patterns
        </p>
        <button
          className={styles.generateButton}
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Clarifications'}
        </button>
      </div>

      {suggestions.length > 0 ? (
        <div className={styles.clarificationsList}>
          {suggestions.map((s) => (
            <div key={s.conceptId} className={styles.clarificationCard}>
              <div className={styles.clarificationHeader}>
                <h4 className={styles.clarificationConcept}>{s.conceptName}</h4>
                <span className={styles.clarificationConfidence}>
                  {s.confidenceScore}% confidence
                </span>
              </div>

              <div className={styles.clarificationComparison}>
                <div className={styles.currentExplanation}>
                  <span className={styles.explanationLabel}>Current</span>
                  <p className={styles.explanationText}>{s.currentExplanation}</p>
                </div>
                <div className={styles.suggestedExplanation}>
                  <span className={styles.explanationLabel}>Suggested</span>
                  <p className={styles.explanationText}>{s.suggestedExplanation}</p>
                </div>
              </div>

              <p className={styles.clarificationReasoning}>
                <strong>Reasoning:</strong> {s.reasoning}
              </p>
              {s.basedOnErrors.length > 0 && (
                <div className={styles.baseErrors}>
                  <span className={styles.baseErrorsLabel}>Based on errors:</span>
                  {s.basedOnErrors.map((err, i) => (
                    <span key={i} className={styles.errorTag}>{err}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.emptyState}>
          Click &ldquo;Generate Clarifications&rdquo; to get AI suggestions for struggling concepts
        </p>
      )}
    </div>
  );
}

export function LearnerFeedbackPanel() {
  const [subject, setSubject] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap');
  const [clarifications, setClarifications] = useState<ClarificationSuggestion[]>([]);

  const { data: report, isLoading } = useLearnerFeedback(subject || undefined);
  const generateMutation = useGenerateClarifications();

  const handleGenerateClarifications = () => {
    if (!report || !subject) return;
    const problemIds = report.problemConcepts
      .filter((c) => c.averageMasteryScore < 50)
      .map((c) => c.conceptId);

    generateMutation.mutate(
      { subject, conceptIds: problemIds },
      { onSuccess: (data) => setClarifications(data) }
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Learner Feedback</h1>
        <p className={styles.subtitle}>
          Analyze learner performance and identify content improvement opportunities
        </p>
      </div>

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Enter subject..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={styles.subjectInput}
        />

        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewButton} ${viewMode === 'heatmap' ? styles.viewActive : ''}`}
            onClick={() => setViewMode('heatmap')}
          >
            Heatmap
          </button>
          <button
            className={`${styles.viewButton} ${viewMode === 'table' ? styles.viewActive : ''}`}
            onClick={() => setViewMode('table')}
          >
            Problem Concepts
          </button>
          <button
            className={`${styles.viewButton} ${viewMode === 'clarifications' ? styles.viewActive : ''}`}
            onClick={() => setViewMode('clarifications')}
          >
            Clarifications
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Analyzing learner performance data...</p>
        </div>
      ) : report ? (
        <>
          {/* Summary Stats */}
          <div className={styles.summaryRow}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryValue}>{report.totalLearners}</span>
              <span className={styles.summaryLabel}>Total Learners</span>
            </div>
            <div className={styles.summaryCard}>
              <span
                className={styles.summaryValue}
                style={{ color: getMasteryColor(report.overallMasteryAverage) }}
              >
                {report.overallMasteryAverage.toFixed(0)}%
              </span>
              <span className={styles.summaryLabel}>Avg Mastery</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryValue} style={{ color: 'var(--color-error, #ef4444)' }}>
                {report.problemConcepts.filter((c) => c.averageMasteryScore < 40).length}
              </span>
              <span className={styles.summaryLabel}>Struggling Concepts</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryValue}>{report.heatmapData.length}</span>
              <span className={styles.summaryLabel}>Total Concepts</span>
            </div>
          </div>

          {/* View Content */}
          {viewMode === 'heatmap' && <HeatmapView cells={report.heatmapData} />}
          {viewMode === 'table' && <ProblemConceptsTable concepts={report.problemConcepts} />}
          {viewMode === 'clarifications' && (
            <ClarificationsView
              suggestions={report.clarificationSuggestions.length > 0 ? report.clarificationSuggestions : clarifications}
              onGenerate={handleGenerateClarifications}
              isGenerating={generateMutation.isPending}
            />
          )}
        </>
      ) : subject ? (
        <p className={styles.emptyState}>No learner data available for this subject</p>
      ) : (
        <p className={styles.emptyState}>Enter a subject to view learner performance feedback</p>
      )}
    </div>
  );
}
