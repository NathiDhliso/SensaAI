/**
 * A/B Testing Dashboard
 * Framework for testing content variants with traffic splitting,
 * metric tracking, statistical significance analysis, and
 * automatic winner selection.
 */

import { useState } from 'react';
import { useABTests, useABTestDetail, useStartABTest, usePauseABTest, useCompleteABTest } from '../hooks/useABTesting';
import type { ABTest, ABTestStatus, MetricComparison } from '../types/enhancements';
import styles from './ABTestingDashboard.module.css';

const STATUS_CONFIG: Record<ABTestStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'var(--muted-foreground, #888)' },
  running: { label: 'Running', color: 'var(--color-success, #22c55e)' },
  paused: { label: 'Paused', color: 'var(--color-warning, #f59e0b)' },
  completed: { label: 'Completed', color: 'var(--primary, #3b82f6)' },
  cancelled: { label: 'Cancelled', color: 'var(--color-error, #ef4444)' },
};

function MetricRow({ metric }: { metric: MetricComparison }) {
  const winnerColor = metric.winner === 'A'
    ? 'var(--primary, #3b82f6)'
    : metric.winner === 'B'
      ? 'var(--color-success, #22c55e)'
      : 'var(--muted-foreground, #888)';

  return (
    <div className={styles.metricRow}>
      <span className={styles.metricName}>{metric.metric.replace(/-/g, ' ')}</span>
      <span className={styles.metricValueA}>{metric.variantAValue.toFixed(2)}</span>
      <span className={styles.metricValueB}>{metric.variantBValue.toFixed(2)}</span>
      <span
        className={styles.metricDiff}
        style={{
          color: metric.percentChange > 0
            ? 'var(--color-success, #22c55e)'
            : metric.percentChange < 0
              ? 'var(--color-error, #ef4444)'
              : 'var(--muted-foreground, #888)',
        }}
      >
        {metric.percentChange > 0 ? '+' : ''}{metric.percentChange.toFixed(1)}%
      </span>
      <span className={styles.metricPValue}>
        p={metric.pValue.toFixed(4)}
      </span>
      <span className={styles.metricSignificance}>
        {metric.isSignificant ? (
          <span className={styles.significantBadge} style={{ color: winnerColor }}>
            {metric.winner === 'tie' ? 'Tie' : `${metric.winner} wins`}
          </span>
        ) : (
          <span className={styles.notSignificant}>Not significant</span>
        )}
      </span>
    </div>
  );
}

function TestCard({
  test,
  onSelect,
}: {
  test: ABTest;
  onSelect: (id: string) => void;
}) {
  const statusConfig = STATUS_CONFIG[test.status];
  const progress = test.minimumSampleSize > 0
    ? Math.min(100, (test.currentSampleSize / test.minimumSampleSize) * 100)
    : 0;

  return (
    <div className={styles.testCard} onClick={() => onSelect(test.testId)}>
      <div className={styles.testCardHeader}>
        <div>
          <h3 className={styles.testName}>{test.name}</h3>
          <span className={styles.testSubject}>{test.subject}</span>
        </div>
        <span className={styles.statusBadge} style={{ color: statusConfig.color }}>
          {statusConfig.label}
        </span>
      </div>
      <p className={styles.testDesc}>{test.description}</p>

      <div className={styles.variantsRow}>
        <div className={styles.variantInfo}>
          <span className={styles.variantLabel}>A: {test.variantA.name}</span>
          <span className={styles.variantLearners}>{test.variantA.learnerCount} learners</span>
        </div>
        <span className={styles.trafficSplit}>
          {100 - test.trafficSplit}% / {test.trafficSplit}%
        </span>
        <div className={styles.variantInfo}>
          <span className={styles.variantLabel}>B: {test.variantB.name}</span>
          <span className={styles.variantLearners}>{test.variantB.learnerCount} learners</span>
        </div>
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <span className={styles.progressLabel}>
          {test.currentSampleSize} / {test.minimumSampleSize} samples ({progress.toFixed(0)}%)
        </span>
      </div>

      {test.results && (
        <div className={styles.resultsPreview}>
          <span className={styles.winnerLabel}>
            Winner: <strong style={{ color: test.results.winner === 'inconclusive' ? 'var(--muted-foreground)' : 'var(--color-success, #22c55e)' }}>
              {test.results.winner === 'inconclusive' ? 'Inconclusive' : `Variant ${test.results.winner}`}
            </strong>
          </span>
          <span className={styles.confidenceLevel}>
            {test.results.confidenceLevel}% confidence
          </span>
        </div>
      )}
    </div>
  );
}

function TestDetail({
  testId,
  onBack,
}: {
  testId: string;
  onBack: () => void;
}) {
  const { data: test, isLoading } = useABTestDetail(testId);
  const startMutation = useStartABTest();
  const pauseMutation = usePauseABTest();
  const completeMutation = useCompleteABTest();

  if (isLoading || !test) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading test details...</p>
      </div>
    );
  }

  return (
    <div className={styles.detailContainer}>
      <button className={styles.backButton} onClick={onBack}>← Back to Tests</button>

      <div className={styles.detailHeader}>
        <div>
          <h2 className={styles.detailTitle}>{test.name}</h2>
          <p className={styles.detailDesc}>{test.description}</p>
        </div>
        <div className={styles.detailActions}>
          {test.status === 'draft' && (
            <button
              className={styles.actionButton}
              onClick={() => startMutation.mutate(testId)}
              disabled={startMutation.isPending}
            >
              Start Test
            </button>
          )}
          {test.status === 'running' && (
            <>
              <button
                className={styles.actionButtonSecondary}
                onClick={() => pauseMutation.mutate(testId)}
                disabled={pauseMutation.isPending}
              >
                Pause
              </button>
              <button
                className={styles.actionButton}
                onClick={() => completeMutation.mutate(testId)}
                disabled={completeMutation.isPending}
              >
                Complete Test
              </button>
            </>
          )}
          {test.status === 'paused' && (
            <button
              className={styles.actionButton}
              onClick={() => startMutation.mutate(testId)}
              disabled={startMutation.isPending}
            >
              Resume
            </button>
          )}
        </div>
      </div>

      {/* Results Table */}
      {test.results && (
        <div className={styles.resultsSection}>
          <h3 className={styles.sectionTitle}>Results</h3>

          <div className={styles.resultsSummary}>
            <div className={styles.resultCard}>
              <span className={styles.resultLabel}>Winner</span>
              <span className={styles.resultValue} style={{
                color: test.results.winner === 'inconclusive'
                  ? 'var(--muted-foreground)'
                  : 'var(--color-success, #22c55e)',
              }}>
                {test.results.winner === 'inconclusive' ? 'Inconclusive' : `Variant ${test.results.winner}`}
              </span>
            </div>
            <div className={styles.resultCard}>
              <span className={styles.resultLabel}>Statistical Significance</span>
              <span className={styles.resultValue}>p = {test.results.statisticalSignificance.toFixed(4)}</span>
            </div>
            <div className={styles.resultCard}>
              <span className={styles.resultLabel}>Confidence</span>
              <span className={styles.resultValue}>{test.results.confidenceLevel}%</span>
            </div>
            <div className={styles.resultCard}>
              <span className={styles.resultLabel}>Samples</span>
              <span className={styles.resultValue}>
                A: {test.results.sampleSizeA} | B: {test.results.sampleSizeB}
              </span>
            </div>
          </div>

          <div className={styles.metricsTable}>
            <div className={styles.metricsHeader}>
              <span>Metric</span>
              <span>Variant A</span>
              <span>Variant B</span>
              <span>Diff</span>
              <span>p-value</span>
              <span>Result</span>
            </div>
            {test.results.metricComparisons.map((m) => (
              <MetricRow key={m.metric} metric={m} />
            ))}
          </div>

          <div className={styles.recommendationBox}>
            <strong>Recommendation:</strong> {test.results.recommendation}
          </div>
        </div>
      )}
    </div>
  );
}

export function ABTestingDashboard() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const { data, isLoading } = useABTests(statusFilter);

  if (selectedTestId) {
    return (
      <div className={styles.container}>
        <TestDetail testId={selectedTestId} onBack={() => setSelectedTestId(null)} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>A/B Testing</h1>
        <p className={styles.subtitle}>
          Test content variants and measure learning outcomes
        </p>
      </div>

      <div className={styles.filterRow}>
        {(['all', 'running', 'completed', 'draft'] as const).map((s) => (
          <button
            key={s}
            className={`${styles.filterButton} ${(s === 'all' ? !statusFilter : statusFilter === s) ? styles.filterActive : ''}`}
            onClick={() => setStatusFilter(s === 'all' ? undefined : s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading tests...</p>
        </div>
      ) : data && data.tests.length > 0 ? (
        <div className={styles.testsList}>
          {data.tests.map((test) => (
            <TestCard key={test.testId} test={test} onSelect={setSelectedTestId} />
          ))}
        </div>
      ) : (
        <p className={styles.emptyState}>No A/B tests found</p>
      )}
    </div>
  );
}
