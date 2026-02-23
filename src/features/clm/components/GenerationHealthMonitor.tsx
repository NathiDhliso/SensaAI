/**
 * Generation Health Monitor
 * Dashboard widget showing generation health scores, diagnostics,
 * and alerts for issues like low concept counts, insufficient domain
 * coverage, near-timeout executions, and token utilization.
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAggregateHealth, useRecentHealthReports, useGenerationHealth } from '../hooks/useHealthMonitor';
import type { GenerationHealthReport, HealthStatus, GenerationHealthDiagnostic } from '../types/enhancements';
import styles from './GenerationHealthMonitor.module.css';

const STATUS_CONFIG: Record<HealthStatus, { label: string; color: string; icon: string }> = {
  healthy: { label: 'Healthy', color: 'var(--color-success, #22c55e)', icon: '✓' },
  warning: { label: 'Warning', color: 'var(--color-warning, #f59e0b)', icon: '⚠' },
  critical: { label: 'Critical', color: 'var(--color-error, #ef4444)', icon: '✕' },
  unknown: { label: 'Unknown', color: 'var(--muted-foreground, #888)', icon: '?' },
};

function getScoreStatus(score: number): HealthStatus {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'warning';
  if (score > 0) return 'critical';
  return 'unknown';
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const status = getScoreStatus(score);
  const config = STATUS_CONFIG[status];

  return (
    <svg width={size} height={size} className={styles.scoreRing}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border, #222)"
        strokeWidth={4}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={config.color}
        strokeWidth={4}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--foreground, #fff)"
        fontSize={size * 0.25}
        fontWeight="bold"
      >
        {score}
      </text>
    </svg>
  );
}

function DiagnosticItem({ diagnostic }: { diagnostic: GenerationHealthDiagnostic }) {
  const severityStyles: Record<string, string> = {
    info: styles.severityInfo,
    warning: styles.severityWarning,
    error: styles.severityError,
  };

  return (
    <div className={`${styles.diagnosticItem} ${severityStyles[diagnostic.severity] ?? ''}`}>
      <div className={styles.diagnosticHeader}>
        <span className={`${styles.diagnosticBadge} ${severityStyles[diagnostic.severity] ?? ''}`}>
          {diagnostic.category.replace(/-/g, ' ')}
        </span>
        <span className={styles.diagnosticSeverity}>{diagnostic.severity}</span>
      </div>
      <p className={styles.diagnosticMessage}>{diagnostic.message}</p>
      <p className={styles.diagnosticAction}>
        <strong>Action:</strong> {diagnostic.suggestedAction}
      </p>
    </div>
  );
}

function HealthReportCard({ report }: { report: GenerationHealthReport }) {
  const [expanded, setExpanded] = useState(false);
  const status = getScoreStatus(report.healthScore.overall);
  const config = STATUS_CONFIG[status];

  return (
    <div className={styles.reportCard}>
      <div className={styles.reportHeader} onClick={() => setExpanded(!expanded)}>
        <div className={styles.reportInfo}>
          <h3 className={styles.reportSubject}>{report.subject}</h3>
          <span className={styles.reportTime}>
            {new Date(report.timestamp).toLocaleString()}
          </span>
        </div>
        <div className={styles.reportScore}>
          <ScoreRing score={report.healthScore.overall} size={48} />
          <span className={styles.statusLabel} style={{ color: config.color }}>
            {config.icon} {config.label}
          </span>
        </div>
        <span className={styles.expandIcon}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className={styles.reportDetails}>
          <div className={styles.metricsGrid}>
            <MetricTile
              label="Concepts"
              value={report.conceptCount}
              baseline={report.expectedConceptBaseline}
              status={report.lowConceptCount ? 'critical' : 'healthy'}
            />
            <MetricTile
              label="Domains"
              value={report.domainCount}
              baseline={report.expectedDomainMinimum}
              status={report.insufficientDomains ? 'critical' : 'healthy'}
            />
            <MetricTile
              label="Execution"
              value={`${(report.executionTimeMs / 1000).toFixed(1)}s`}
              baseline={`${(report.timeoutThresholdMs / 1000).toFixed(0)}s limit`}
              status={report.nearTimeout ? 'warning' : 'healthy'}
            />
            <MetricTile
              label="Tokens"
              value={report.tokensUsed.toLocaleString()}
              baseline={`${report.tokenLimit.toLocaleString()} limit`}
              status={report.tokensUsed / report.tokenLimit > 0.9 ? 'warning' : 'healthy'}
            />
          </div>

          {report.diagnostics.length > 0 && (
            <div className={styles.diagnostics}>
              <h4 className={styles.diagnosticsTitle}>
                Diagnostics ({report.diagnostics.length})
              </h4>
              {report.diagnostics.map((d) => (
                <DiagnosticItem key={d.id} diagnostic={d} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricTile({
  label,
  value,
  baseline,
  status,
}: {
  label: string;
  value: string | number;
  baseline: string | number;
  status: HealthStatus;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <div className={styles.metricTile}>
      <span className={styles.metricTileLabel}>{label}</span>
      <span className={styles.metricTileValue} style={{ color: config.color }}>
        {value}
      </span>
      <span className={styles.metricTileBaseline}>
        Baseline: {baseline}
      </span>
    </div>
  );
}

export function GenerationHealthMonitor() {
  const [searchParams] = useSearchParams();
  const focusedSubject = searchParams.get('subject') || undefined;
  const focusedSessionId = searchParams.get('sessionId') || undefined;
  const { data: focusedHealth, isLoading: focusedLoading } = useGenerationHealth(focusedSubject, focusedSessionId);
  const { data: aggregate, isLoading: aggLoading } = useAggregateHealth();
  const { data: recentReports, isLoading: reportsLoading } = useRecentHealthReports(10);

  const isLoading = aggLoading || reportsLoading || focusedLoading;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Generation Health Monitor</h1>
        <p className={styles.subtitle}>
          Real-time monitoring of content generation quality and performance
        </p>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Analyzing generation health...</p>
        </div>
      ) : (
        <>
          {/* Focused Subject Health (when navigated from Library) */}
          {focusedSubject && focusedHealth && (
            <div className={styles.reportsSection}>
              <h2 className={styles.sectionTitle}>Health: {focusedSubject}</h2>
              <HealthReportCard report={focusedHealth} />
            </div>
          )}

          {/* Aggregate Health Overview */}
          {aggregate && (
            <div className={styles.overviewSection}>
              <div className={styles.overviewCard}>
                <ScoreRing score={aggregate.overallScore} size={120} />
                <div className={styles.overviewText}>
                  <h2 className={styles.overviewTitle}>Overall Health Score</h2>
                  <p className={styles.overviewAlerts}>
                    {aggregate.alertCount} active alert{aggregate.alertCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className={styles.subjectScores}>
                {aggregate.subjectScores.map((s) => {
                  const st = getScoreStatus(s.score);
                  return (
                    <div key={s.subject} className={styles.subjectScoreItem}>
                      <ScoreRing score={s.score} size={40} />
                      <span className={styles.subjectName}>{s.subject}</span>
                      <span
                        className={styles.subjectStatus}
                        style={{ color: STATUS_CONFIG[st].color }}
                      >
                        {STATUS_CONFIG[st].label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Health Reports */}
          <div className={styles.reportsSection}>
            <h2 className={styles.sectionTitle}>Recent Generation Reports</h2>
            {recentReports && recentReports.reports.length > 0 ? (
              <div className={styles.reportsList}>
                {recentReports.reports.map((report) => (
                  <HealthReportCard key={report.generationId} report={report} />
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>No health reports available yet</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
