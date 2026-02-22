/**
 * Analytics Dashboard
 * View content health metrics and change history
 */

import { useState } from 'react';
import { useAnalytics, useRecentChanges } from '../hooks/useAnalytics';
import styles from './AnalyticsDashboard.module.css';

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  });

  const { data: analytics, isLoading: analyticsLoading } = useAnalytics(
    dateRange.start,
    dateRange.end
  );

  const { data: recentChanges, isLoading: changesLoading } = useRecentChanges(7);

  const handleDateRangeChange = (range: 'week' | 'month' | 'quarter') => {
    const end = new Date();
    const start = new Date();

    switch (range) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setDate(start.getDate() - 30);
        break;
      case 'quarter':
        start.setDate(start.getDate() - 90);
        break;
    }

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Analytics</h1>
        <div className={styles.dateRangeButtons}>
          <button
            className={styles.rangeButton}
            onClick={() => handleDateRangeChange('week')}
          >
            Last 7 Days
          </button>
          <button
            className={styles.rangeButton}
            onClick={() => handleDateRangeChange('month')}
          >
            Last 30 Days
          </button>
          <button
            className={styles.rangeButton}
            onClick={() => handleDateRangeChange('quarter')}
          >
            Last 90 Days
          </button>
        </div>
      </div>

      {analyticsLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading analytics...</p>
        </div>
      ) : analytics ? (
        <>
          <div className={styles.metrics}>
            <div className={styles.metricCard}>
              <div className={styles.metricIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className={styles.metricContent}>
                <span className={styles.metricValue}>{analytics.totalChanges}</span>
                <span className={styles.metricLabel}>Total Changes</span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className={styles.metricContent}>
                <span className={styles.metricValue}>
                  ${((analytics.totalChanges * 0.10) / 1.50 * 100).toFixed(0)}
                </span>
                <span className={styles.metricLabel}>Est. Cost Savings</span>
                <span className={styles.metricSubtext}>vs full regeneration</span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className={styles.metricContent}>
                <span className={styles.metricValue}>
                  {Object.keys(analytics.changesByCurator || {}).length}
                </span>
                <span className={styles.metricLabel}>Active Curators</span>
              </div>
            </div>
          </div>

          <div className={styles.charts}>
            <div className={styles.chartCard}>
              <h2 className={styles.chartTitle}>Changes by Operation</h2>
              <div className={styles.barChart}>
                {Object.entries(analytics.changesByOperation || {}).map(([operation, count]) => (
                  <div key={operation} className={styles.barItem}>
                    <span className={styles.barLabel}>{operation}</span>
                    <div className={styles.barContainer}>
                      <div
                        className={`${styles.bar} ${styles[operation.toLowerCase()]}`}
                        style={{
                          width: `${(count / Math.max(...Object.values(analytics.changesByOperation))) * 100}%`,
                        }}
                      />
                      <span className={styles.barValue}>{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.chartCard}>
              <h2 className={styles.chartTitle}>Changes by Curator</h2>
              <div className={styles.barChart}>
                {Object.entries(analytics.changesByCurator || {}).map(([curator, count]) => (
                  <div key={curator} className={styles.barItem}>
                    <span className={styles.barLabel}>{curator}</span>
                    <div className={styles.barContainer}>
                      <div
                        className={styles.bar}
                        style={{
                          width: `${(count / Math.max(...Object.values(analytics.changesByCurator))) * 100}%`,
                        }}
                      />
                      <span className={styles.barValue}>{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className={styles.recentChanges}>
        <h2 className={styles.sectionTitle}>Recent Changes</h2>
        {changesLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
          </div>
        ) : recentChanges && recentChanges.changes.length > 0 ? (
          <div className={styles.changesList}>
            {recentChanges.changes.map((change) => (
              <div key={change.changeId} className={styles.changeItem}>
                <div className={styles.changeHeader}>
                  <span className={`${styles.operationBadge} ${styles[change.operation.toLowerCase()]}`}>
                    {change.operation}
                  </span>
                  <span className={styles.changeTime}>
                    {new Date(change.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className={styles.changeContent}>
                  <h3 className={styles.changeConcept}>{change.conceptName}</h3>
                  <p className={styles.changeReason}>{change.changeReason}</p>
                  {change.fieldPath && (
                    <span className={styles.changeField}>Field: {change.fieldPath}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>No recent changes</p>
        )}
      </div>
    </div>
  );
}
