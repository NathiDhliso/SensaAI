/**
 * Cost Optimization Analyzer
 * Real-time tracking of generation, audit, and update costs.
 * Shows cost per learner, identifies optimization opportunities,
 * projects savings, and alerts when costs exceed thresholds.
 */

import { useState } from 'react';
import { useCostReport, useCostOptimizations, useCostPerLearner } from '../hooks/useCostOptimization';
import type { CostBreakdown, CostOptimization, CostAlert } from '../types/enhancements';
import styles from './CostOptimizationAnalyzer.module.css';

interface CostPerLearnerSubject {
  subject: string;
  costPerLearner: number;
  learnerCount: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  generation: 'var(--primary, #3b82f6)',
  audit: 'var(--color-warning, #f59e0b)',
  update: 'var(--color-success, #22c55e)',
  storage: '#8b5cf6',
  compute: '#f97316',
};

function CostBreakdownChart({ breakdown }: { breakdown: CostBreakdown[] }) {
  const maxCost = Math.max(...breakdown.map((b) => b.costUsd), 1);

  return (
    <div className={styles.breakdownChart}>
      {breakdown.map((item) => (
        <div key={item.category} className={styles.breakdownRow}>
          <span className={styles.breakdownLabel}>{item.category}</span>
          <div className={styles.breakdownBarContainer}>
            <div
              className={styles.breakdownBar}
              style={{
                width: `${(item.costUsd / maxCost) * 100}%`,
                background: CATEGORY_COLORS[item.category] ?? 'var(--primary)',
              }}
            />
            <span className={styles.breakdownValue}>${item.costUsd.toFixed(2)}</span>
          </div>
          <span className={styles.breakdownPercent}>{item.percentage.toFixed(0)}%</span>
          <span className={styles.breakdownDetails}>{item.details}</span>
        </div>
      ))}
    </div>
  );
}

function OptimizationCard({ optimization }: { optimization: CostOptimization }) {
  const effortColors = {
    low: 'var(--color-success, #22c55e)',
    medium: 'var(--color-warning, #f59e0b)',
    high: 'var(--color-error, #ef4444)',
  };

  return (
    <div className={styles.optimizationCard}>
      <div className={styles.optimizationHeader}>
        <h4 className={styles.optimizationTitle}>{optimization.title}</h4>
        <span className={styles.savingsBadge}>
          Save ${optimization.estimatedSavingsUsd.toFixed(2)} ({optimization.estimatedSavingsPercentage}%)
        </span>
      </div>
      <p className={styles.optimizationDesc}>{optimization.description}</p>
      <div className={styles.optimizationMeta}>
        <span className={styles.effortBadge} style={{ color: effortColors[optimization.effort] }}>
          {optimization.effort} effort
        </span>
        <span className={styles.categoryBadge} style={{ color: CATEGORY_COLORS[optimization.category] }}>
          {optimization.category}
        </span>
      </div>
      <div className={styles.optimizationRec}>
        <strong>Recommendation:</strong> {optimization.recommendation}
      </div>
      <div className={styles.optimizationImpl}>
        <strong>Implementation:</strong> {optimization.implementation}
      </div>
    </div>
  );
}

function AlertItem({ alert }: { alert: CostAlert }) {
  const severityColors = {
    info: 'var(--primary, #3b82f6)',
    warning: 'var(--color-warning, #f59e0b)',
    critical: 'var(--color-error, #ef4444)',
  };

  return (
    <div
      className={styles.alertItem}
      style={{ borderLeftColor: severityColors[alert.severity] }}
    >
      <div className={styles.alertHeader}>
        <span className={styles.alertType}>{alert.type.replace(/-/g, ' ')}</span>
        <span className={styles.alertSeverity} style={{ color: severityColors[alert.severity] }}>
          {alert.severity}
        </span>
      </div>
      <p className={styles.alertMessage}>{alert.message}</p>
      <span className={styles.alertTime}>
        {new Date(alert.timestamp).toLocaleString()}
      </span>
    </div>
  );
}

export function CostOptimizationAnalyzer() {
  const [rangeDays, setRangeDays] = useState(30);
  const dateRange = (() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - rangeDays);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  })();

  const { data: costReport, isLoading: reportLoading } = useCostReport(dateRange.start, dateRange.end);
  const { data: optimizations, isLoading: optLoading } = useCostOptimizations();
  const { data: costPerLearner, isLoading: cplLoading } = useCostPerLearner();

  const isLoading = reportLoading || optLoading || cplLoading;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cost Optimization</h1>
        <p className={styles.subtitle}>
          Track costs, identify savings opportunities, and optimize spend
        </p>
        <div className={styles.controls} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setRangeDays(days)}
              className={styles.rangeButton}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid var(--border, #e5e7eb)',
                cursor: 'pointer',
                fontWeight: rangeDays === days ? 600 : 400,
                background: rangeDays === days ? 'var(--primary, #3b82f6)' : 'transparent',
                color: rangeDays === days ? 'white' : 'inherit',
              }}
            >
              Last {days} Days
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Analyzing costs...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {costReport && (
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <span className={styles.summaryValue}>${costReport.totalCostUsd.toFixed(2)}</span>
                <span className={styles.summaryLabel}>Total Cost ({rangeDays}d)</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryValue}>${costReport.costPerLearner.toFixed(3)}</span>
                <span className={styles.summaryLabel}>Cost per Learner</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryValue} style={{ color: 'var(--color-success, #22c55e)' }}>
                  ${optimizations?.totalPotentialSavings.toFixed(2) ?? '0.00'}
                </span>
                <span className={styles.summaryLabel}>Potential Savings</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryValue}>${costReport.projections.nextMonthEstimate.toFixed(2)}</span>
                <span className={styles.summaryLabel}>Next Month Est.</span>
              </div>
            </div>
          )}

          {/* Cost Breakdown */}
          {costReport && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Cost Breakdown</h2>
              <CostBreakdownChart breakdown={costReport.breakdown} />
            </div>
          )}

          {/* Cost per Learner by Subject */}
          {costPerLearner && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Cost per Learner by Subject</h2>
              <div className={styles.cplGrid}>
                {costPerLearner.bySubject.map((item: CostPerLearnerSubject) => (
                  <div key={item.subject} className={styles.cplCard}>
                    <span className={styles.cplSubject}>{item.subject}</span>
                    <span className={styles.cplValue}>${item.costPerLearner.toFixed(3)}</span>
                    <span className={styles.cplLearners}>{item.learnerCount} learners</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optimization Opportunities */}
          {optimizations && optimizations.optimizations.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Optimization Opportunities</h2>
              <div className={styles.optimizationsList}>
                {optimizations.optimizations.map((opt: CostOptimization) => (
                  <OptimizationCard key={opt.id} optimization={opt} />
                ))}
              </div>
            </div>
          )}

          {/* Alerts */}
          {costReport && costReport.alerts.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Cost Alerts</h2>
              <div className={styles.alertsList}>
                {costReport.alerts.map((alert: CostAlert) => (
                  <AlertItem key={alert.id} alert={alert} />
                ))}
              </div>
            </div>
          )}

          {/* Projections */}
          {costReport && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Projections</h2>
              <div className={styles.projectionsGrid}>
                <div className={styles.projectionCard}>
                  <span className={styles.projectionValue}>
                    ${costReport.projections.nextMonthEstimate.toFixed(2)}
                  </span>
                  <span className={styles.projectionLabel}>Next Month</span>
                </div>
                <div className={styles.projectionCard}>
                  <span className={styles.projectionValue}>
                    ${costReport.projections.nextQuarterEstimate.toFixed(2)}
                  </span>
                  <span className={styles.projectionLabel}>Next Quarter</span>
                </div>
                <div className={styles.projectionCard}>
                  <span className={styles.projectionValue}>
                    ${costReport.projections.annualEstimate.toFixed(2)}
                  </span>
                  <span className={styles.projectionLabel}>Annual</span>
                </div>
              </div>
              <div className={styles.assumptions}>
                <h4 className={styles.assumptionsTitle}>Assumptions</h4>
                <ul className={styles.assumptionsList}>
                  {costReport.projections.assumptions.map((a: string, i: number) => (
                    <li key={i} className={styles.assumptionItem}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
