/**
 * Comparative Analysis Auditor
 * Compares content versions to detect regressions, quality drops,
 * and coverage losses. Helps curators decide whether new content
 * is actually better than the previous version.
 */

import { useState } from 'react';
import { useLatestComparison, useComparisonHistory } from '../hooks/useComparativeAnalysis';
import type { VersionComparison, Regression, Improvement } from '../types/enhancements';
import styles from './ComparativeAnalysisAuditor.module.css';

const VERDICT_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  better: { label: 'Improved', color: 'var(--color-success, #22c55e)', icon: '↑' },
  worse: { label: 'Regressed', color: 'var(--color-error, #ef4444)', icon: '↓' },
  mixed: { label: 'Mixed Results', color: 'var(--color-warning, #f59e0b)', icon: '↕' },
  equivalent: { label: 'Equivalent', color: 'var(--muted-foreground, #888)', icon: '=' },
};

const RECOMMENDATION_CONFIG: Record<string, { label: string; color: string }> = {
  'keep-current': { label: 'Keep Current Version', color: 'var(--color-success, #22c55e)' },
  rollback: { label: 'Rollback Recommended', color: 'var(--color-error, #ef4444)' },
  'partial-rollback': { label: 'Partial Rollback', color: 'var(--color-warning, #f59e0b)' },
  'needs-review': { label: 'Needs Manual Review', color: 'var(--primary, #3b82f6)' },
};

function RegressionItem({ regression }: { regression: Regression }) {
  const severityClass = styles[`severity${regression.severity.charAt(0).toUpperCase()}${regression.severity.slice(1)}`];
  
  return (
    <div className={`${styles.regressionItem} ${severityClass ?? ''}`}>
      <div className={styles.regressionHeader}>
        <span className={styles.regressionType}>{regression.type.replace(/-/g, ' ')}</span>
        <span className={`${styles.severityBadge} ${severityClass ?? ''}`}>{regression.severity}</span>
      </div>
      <p className={styles.regressionDesc}>{regression.description}</p>
      <div className={styles.regressionValues}>
        <span className={styles.valueOld}>Before: {String(regression.previousValue)}</span>
        <span className={styles.valueArrow}>→</span>
        <span className={styles.valueNew}>After: {String(regression.currentValue)}</span>
      </div>
      {regression.affectedConcepts.length > 0 && (
        <div className={styles.affectedConcepts}>
          <span className={styles.affectedLabel}>
            Affected: {regression.affectedConcepts.length} concept{regression.affectedConcepts.length > 1 ? 's' : ''}
          </span>
        </div>
      )}
      <p className={styles.suggestedAction}>
        <strong>Suggested:</strong> {regression.suggestedAction}
      </p>
    </div>
  );
}

function ImprovementItem({ improvement }: { improvement: Improvement }) {
  return (
    <div className={styles.improvementItem}>
      <div className={styles.improvementHeader}>
        <span className={styles.improvementType}>{improvement.type}</span>
        <span className={`${styles.impactBadge} ${styles[improvement.impact] ?? ''}`}>
          {improvement.impact} impact
        </span>
      </div>
      <p className={styles.improvementDesc}>{improvement.description}</p>
      <div className={styles.regressionValues}>
        <span className={styles.valueOld}>Before: {String(improvement.previousValue)}</span>
        <span className={styles.valueArrow}>→</span>
        <span className={styles.valueNewGood}>After: {String(improvement.currentValue)}</span>
      </div>
    </div>
  );
}

function ComparisonCard({ comparison }: { comparison: VersionComparison }) {
  const [expanded, setExpanded] = useState(false);
  const verdict = VERDICT_CONFIG[comparison.overallVerdict] ?? VERDICT_CONFIG.equivalent;
  const recommendation = RECOMMENDATION_CONFIG[comparison.recommendation] ?? RECOMMENDATION_CONFIG['needs-review'];

  return (
    <div className={styles.comparisonCard}>
      <div className={styles.comparisonHeader} onClick={() => setExpanded(!expanded)}>
        <div className={styles.comparisonInfo}>
          <h3 className={styles.comparisonSubject}>{comparison.subject}</h3>
          <div className={styles.versionLabels}>
            <span className={styles.versionLabel}>
              v{comparison.previousVersion.timestamp.slice(0, 10)}
            </span>
            <span className={styles.versionArrow}>vs</span>
            <span className={styles.versionLabel}>
              v{comparison.currentVersion.timestamp.slice(0, 10)}
            </span>
          </div>
        </div>

        <div className={styles.verdictSection}>
          <span className={styles.verdictIcon} style={{ color: verdict.color }}>
            {verdict.icon}
          </span>
          <span className={styles.verdictLabel} style={{ color: verdict.color }}>
            {verdict.label}
          </span>
          <span className={styles.confidenceScore}>
            {comparison.confidenceScore}% confidence
          </span>
        </div>

        <span className={styles.expandIcon}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className={styles.comparisonDetails}>
          {/* Recommendation Banner */}
          <div className={styles.recommendationBanner} style={{ borderColor: recommendation.color }}>
            <span style={{ color: recommendation.color, fontWeight: 600 }}>
              {recommendation.label}
            </span>
          </div>

          {/* Version Stats Comparison */}
          <div className={styles.statsComparison}>
            <StatCompare
              label="Concepts"
              prev={comparison.previousVersion.conceptCount}
              curr={comparison.currentVersion.conceptCount}
            />
            <StatCompare
              label="Domains"
              prev={comparison.previousVersion.domainCount}
              curr={comparison.currentVersion.domainCount}
            />
            <StatCompare
              label="Quality"
              prev={comparison.previousVersion.qualityScore}
              curr={comparison.currentVersion.qualityScore}
              suffix="%"
            />
            <StatCompare
              label="Coverage"
              prev={comparison.previousVersion.coveragePercentage}
              curr={comparison.currentVersion.coveragePercentage}
              suffix="%"
            />
          </div>

          {/* Regressions */}
          {comparison.regressions.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>
                Regressions ({comparison.regressions.length})
              </h4>
              {comparison.regressions.map((r, i) => (
                <RegressionItem key={i} regression={r} />
              ))}
            </div>
          )}

          {/* Improvements */}
          {comparison.improvements.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitleGood}>
                Improvements ({comparison.improvements.length})
              </h4>
              {comparison.improvements.map((imp, i) => (
                <ImprovementItem key={i} improvement={imp} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCompare({
  label,
  prev,
  curr,
  suffix = '',
}: {
  label: string;
  prev: number;
  curr: number;
  suffix?: string;
}) {
  const diff = curr - prev;
  const isPositive = diff > 0;
  const isNegative = diff < 0;

  return (
    <div className={styles.statCompare}>
      <span className={styles.statLabel}>{label}</span>
      <div className={styles.statValues}>
        <span className={styles.statPrev}>{prev}{suffix}</span>
        <span className={styles.statArrow}>→</span>
        <span className={styles.statCurr}>{curr}{suffix}</span>
      </div>
      <span
        className={styles.statDiff}
        style={{
          color: isPositive
            ? 'var(--color-success, #22c55e)'
            : isNegative
              ? 'var(--color-error, #ef4444)'
              : 'var(--muted-foreground, #888)',
        }}
      >
        {isPositive ? '+' : ''}{diff}{suffix}
      </span>
    </div>
  );
}

export function ComparativeAnalysisAuditor() {
  const [selectedSubject, setSelectedSubject] = useState('');
  const { data: latestComparison, isLoading: latestLoading } = useLatestComparison(
    selectedSubject || undefined
  );
  const { data: history, isLoading: historyLoading } = useComparisonHistory(
    selectedSubject || undefined
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Comparative Analysis</h1>
        <p className={styles.subtitle}>
          Compare content versions to detect regressions and validate improvements
        </p>
      </div>

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Enter subject to compare..."
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className={styles.subjectInput}
        />
      </div>

      {latestLoading || historyLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Analyzing version differences...</p>
        </div>
      ) : (
        <>
          {latestComparison && (
            <div className={styles.latestSection}>
              <h2 className={styles.sectionHeading}>Latest Comparison</h2>
              <ComparisonCard comparison={latestComparison} />
            </div>
          )}

          {history && history.comparisons.length > 0 && (
            <div className={styles.historySection}>
              <h2 className={styles.sectionHeading}>
                Comparison History ({history.total})
              </h2>
              {history.comparisons.map((c, i) => (
                <ComparisonCard key={i} comparison={c} />
              ))}
            </div>
          )}

          {!latestComparison && !history?.comparisons.length && selectedSubject && (
            <p className={styles.emptyState}>
              No comparisons available for &ldquo;{selectedSubject}&rdquo;
            </p>
          )}

          {!selectedSubject && (
            <p className={styles.emptyState}>Enter a subject above to start comparing versions</p>
          )}
        </>
      )}
    </div>
  );
}
