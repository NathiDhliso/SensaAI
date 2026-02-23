/**
 * Dependency Impact Analyzer
 * Graph-based analysis of concept dependencies showing ripple effects,
 * broken connections, learning path disruptions, and auto-fix suggestions.
 */

import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDependencyGraph, useImpactAnalysis, useApplyAutoFix } from '../hooks/useDependencyImpact';
import type {
  DependencyNode,
  ImpactAnalysis as ImpactAnalysisType,
  BrokenConnection,
  AutoFixSuggestion,
} from '../types/enhancements';
import styles from './DependencyImpactAnalyzer.module.css';

function NodeCard({ node }: { node: DependencyNode }) {
  const tierColors = {
    trunk: 'var(--primary, #3b82f6)',
    branch: 'var(--color-warning, #f59e0b)',
    leaf: 'var(--color-success, #22c55e)',
  };

  return (
    <div className={styles.nodeCard}>
      <div className={styles.nodeHeader}>
        <span className={styles.nodeName}>{node.conceptName}</span>
        <span className={styles.nodeTier} style={{ color: tierColors[node.tier] }}>
          {node.tier}
        </span>
      </div>
      <div className={styles.nodeMetrics}>
        <span className={styles.nodeMetric}>
          <span className={styles.metricLabel}>In</span>
          <span className={styles.metricValue}>{node.inDegree}</span>
        </span>
        <span className={styles.nodeMetric}>
          <span className={styles.metricLabel}>Out</span>
          <span className={styles.metricValue}>{node.outDegree}</span>
        </span>
        <span className={styles.nodeMetric}>
          <span className={styles.metricLabel}>Critical</span>
          <span
            className={styles.metricValue}
            style={{
              color: node.criticalityScore > 70
                ? 'var(--color-error, #ef4444)'
                : node.criticalityScore > 40
                  ? 'var(--color-warning, #f59e0b)'
                  : 'var(--color-success, #22c55e)',
            }}
          >
            {node.criticalityScore}
          </span>
        </span>
      </div>
      <span className={styles.nodeDomain}>{node.domain}</span>
    </div>
  );
}

function BrokenConnectionItem({
  connection,
  onAutoFix,
}: {
  connection: BrokenConnection;
  onAutoFix?: () => void;
}) {
  return (
    <div
      className={styles.brokenItem}
      style={{
        borderLeftColor: connection.severity === 'error'
          ? 'var(--color-error, #ef4444)'
          : 'var(--color-warning, #f59e0b)',
      }}
    >
      <div className={styles.brokenHeader}>
        <span className={styles.brokenType}>{connection.connectionType}</span>
        <span
          className={styles.brokenSeverity}
          style={{
            color: connection.severity === 'error'
              ? 'var(--color-error, #ef4444)'
              : 'var(--color-warning, #f59e0b)',
          }}
        >
          {connection.severity}
        </span>
      </div>
      <div className={styles.brokenPath}>
        <span className={styles.brokenSource}>{connection.sourceName}</span>
        <span className={styles.brokenArrow}>→</span>
        <span className={styles.brokenTarget}>{connection.targetName}</span>
      </div>
      {connection.autoFixAvailable && onAutoFix && (
        <button className={styles.autoFixButton} onClick={onAutoFix}>
          Auto-Fix Available
        </button>
      )}
    </div>
  );
}

function AutoFixCard({
  suggestion,
  onApply,
  isApplying,
}: {
  suggestion: AutoFixSuggestion;
  onApply: () => void;
  isApplying: boolean;
}) {
  return (
    <div className={styles.autoFixCard}>
      <div className={styles.autoFixHeader}>
        <span className={styles.autoFixType}>{suggestion.fixType.replace(/-/g, ' ')}</span>
        <span className={styles.autoFixEffort}>{suggestion.estimatedEffort}</span>
      </div>
      <p className={styles.autoFixDesc}>{suggestion.description}</p>
      <div className={styles.autoFixFooter}>
        <span className={styles.autoFixConfidence}>
          {suggestion.confidenceScore}% confident
        </span>
        <span className={styles.autoFixAffected}>
          {suggestion.affectedConcepts.length} concept{suggestion.affectedConcepts.length !== 1 ? 's' : ''}
        </span>
        <button
          className={styles.applyButton}
          onClick={onApply}
          disabled={isApplying}
        >
          {isApplying ? 'Applying...' : 'Apply Fix'}
        </button>
      </div>
    </div>
  );
}

function ImpactReport({ analysis, onAutoFix }: { analysis: ImpactAnalysisType; onAutoFix: (id: string) => void }) {
  const riskColors = {
    low: 'var(--color-success, #22c55e)',
    medium: 'var(--color-warning, #f59e0b)',
    high: 'var(--color-error, #ef4444)',
    critical: '#dc2626',
  };

  return (
    <div className={styles.impactReport}>
      <div className={styles.impactHeader}>
        <h3 className={styles.impactTitle}>
          Impact Analysis: {analysis.targetConceptName}
        </h3>
        <div className={styles.impactBadges}>
          <span
            className={styles.riskBadge}
            style={{ color: riskColors[analysis.riskLevel] }}
          >
            {analysis.riskLevel} risk
          </span>
          <span className={styles.scoreBadge}>
            Score: {analysis.overallImpactScore}/100
          </span>
          <span
            className={styles.safeBadge}
            style={{
              color: analysis.safeToApply
                ? 'var(--color-success, #22c55e)'
                : 'var(--color-error, #ef4444)',
            }}
          >
            {analysis.safeToApply ? 'Safe to Apply' : 'Review Required'}
          </span>
        </div>
      </div>

      {/* Impact Summary */}
      <div className={styles.impactSummaryGrid}>
        <div className={styles.impactSummaryItem}>
          <span className={styles.impactSummaryValue}>{analysis.directImpacts.length}</span>
          <span className={styles.impactSummaryLabel}>Direct Impacts</span>
        </div>
        <div className={styles.impactSummaryItem}>
          <span className={styles.impactSummaryValue}>{analysis.transitiveImpacts.length}</span>
          <span className={styles.impactSummaryLabel}>Transitive Impacts</span>
        </div>
        <div className={styles.impactSummaryItem}>
          <span className={styles.impactSummaryValue}>{analysis.brokenConnections.length}</span>
          <span className={styles.impactSummaryLabel}>Broken Connections</span>
        </div>
        <div className={styles.impactSummaryItem}>
          <span className={styles.impactSummaryValue}>{analysis.learningPathDisruptions.length}</span>
          <span className={styles.impactSummaryLabel}>Path Disruptions</span>
        </div>
      </div>

      {/* Direct Impacts */}
      {analysis.directImpacts.length > 0 && (
        <div className={styles.impactSection}>
          <h4 className={styles.impactSectionTitle}>Direct Impacts</h4>
          {analysis.directImpacts.map((impact) => (
            <div key={impact.conceptId} className={styles.impactItem}>
              <span className={styles.impactConceptName}>{impact.conceptName}</span>
              <span
                className={styles.impactSeverity}
                style={{
                  color: impact.severity === 'high'
                    ? 'var(--color-error, #ef4444)'
                    : impact.severity === 'medium'
                      ? 'var(--color-warning, #f59e0b)'
                      : 'var(--primary, #3b82f6)',
                }}
              >
                {impact.severity}
              </span>
              <span className={styles.impactDesc}>{impact.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Broken Connections */}
      {analysis.brokenConnections.length > 0 && (
        <div className={styles.impactSection}>
          <h4 className={styles.impactSectionTitle}>Broken Connections</h4>
          {analysis.brokenConnections.map((conn, i) => (
            <BrokenConnectionItem
              key={i}
              connection={conn}
              onAutoFix={conn.autoFixAvailable ? () => onAutoFix(`broken-${i}`) : undefined}
            />
          ))}
        </div>
      )}

      {/* Learning Path Disruptions */}
      {analysis.learningPathDisruptions.length > 0 && (
        <div className={styles.impactSection}>
          <h4 className={styles.impactSectionTitle}>Learning Path Disruptions</h4>
          {analysis.learningPathDisruptions.map((disruption) => (
            <div key={disruption.pathId} className={styles.disruptionItem}>
              <span className={styles.disruptionName}>{disruption.pathName}</span>
              <span className={styles.disruptionSteps}>
                {disruption.affectedSteps}/{disruption.totalSteps} steps
              </span>
              <span
                className={styles.disruptionSeverity}
                style={{
                  color: disruption.severity === 'severe'
                    ? 'var(--color-error, #ef4444)'
                    : disruption.severity === 'moderate'
                      ? 'var(--color-warning, #f59e0b)'
                      : 'var(--primary, #3b82f6)',
                }}
              >
                {disruption.severity}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DependencyImpactAnalyzer() {
  const [searchParams] = useSearchParams();
  const [subject, setSubject] = useState(searchParams.get('subject') || '');
  const sessionId = searchParams.get('sessionId') || undefined;
  const [selectedConcept, setSelectedConcept] = useState<string | undefined>();
  const [changeType, setChangeType] = useState<'modify' | 'delete' | 'restructure'>('modify');

  const { data: graph, isLoading: graphLoading } = useDependencyGraph(subject || undefined, sessionId);
  const { data: impact, isLoading: impactLoading } = useImpactAnalysis(selectedConcept, changeType);
  const [fixStatus, setFixStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleAutoFixSuccess = useCallback((data: { success: boolean; fixedConnections: number; details: string }) => {
    setFixStatus({
      type: data.success ? 'success' : 'error',
      message: data.details,
    });
    setTimeout(() => setFixStatus(null), 5000);
  }, []);

  const handleAutoFixError = useCallback(() => {
    setFixStatus({ type: 'error', message: 'Auto-fix failed. Try using the Content Editor instead.' });
    setTimeout(() => setFixStatus(null), 5000);
  }, []);

  const autoFix = useApplyAutoFix(handleAutoFixSuccess, handleAutoFixError);

  const criticalNodes = graph?.nodes
    .filter((n: DependencyNode) => n.criticalityScore > 60)
    .sort((a: DependencyNode, b: DependencyNode) => b.criticalityScore - a.criticalityScore) ?? [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dependency Impact</h1>
        <p className={styles.subtitle}>
          Analyze concept dependencies and predict change impacts
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
        <select
          value={changeType}
          onChange={(e) => setChangeType(e.target.value as typeof changeType)}
          className={styles.changeTypeSelect}
        >
          <option value="modify">Modify</option>
          <option value="delete">Delete</option>
          <option value="restructure">Restructure</option>
        </select>
      </div>

      {graphLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Building dependency graph...</p>
        </div>
      ) : graph ? (
        <>
          {/* Graph Stats */}
          <div className={styles.graphStats}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{graph.nodes.length}</span>
              <span className={styles.statLabel}>Concepts</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{graph.edges.length}</span>
              <span className={styles.statLabel}>Connections</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{graph.clusters.length}</span>
              <span className={styles.statLabel}>Clusters</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue} style={{ color: 'var(--color-error, #ef4444)' }}>
                {criticalNodes.length}
              </span>
              <span className={styles.statLabel}>Critical Nodes</span>
            </div>
          </div>

          {/* Critical Nodes */}
          {criticalNodes.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Critical Nodes (High Dependency)</h2>
              <div className={styles.nodesGrid}>
                {criticalNodes.slice(0, 12).map((node: DependencyNode) => (
                  <div
                    key={node.conceptId}
                    onClick={() => setSelectedConcept(node.conceptId)}
                    className={`${styles.nodeCardWrapper} ${selectedConcept === node.conceptId ? styles.nodeSelected : ''}`}
                  >
                    <NodeCard node={node} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Impact Analysis */}
          {selectedConcept && (
            <div className={styles.section}>
              {impactLoading ? (
                <div className={styles.loading}>
                  <div className={styles.spinner} />
                  <p>Analyzing impact...</p>
                </div>
              ) : impact ? (
                <>
                  <ImpactReport analysis={impact} onAutoFix={(id) => autoFix.mutate(id)} />

                  {/* Auto-Fix Suggestions */}
                  {impact.autoFixSuggestions.length > 0 && (
                    <div className={styles.autoFixSection}>
                      <h3 className={styles.sectionTitle}>Auto-Fix Suggestions</h3>
                      {fixStatus && (
                        <div
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            marginBottom: '0.75rem',
                            background: fixStatus.type === 'success'
                              ? 'var(--color-success-bg, rgba(34,197,94,0.1))'
                              : 'var(--color-error-bg, rgba(239,68,68,0.1))',
                            color: fixStatus.type === 'success'
                              ? 'var(--color-success, #22c55e)'
                              : 'var(--color-error, #ef4444)',
                            border: `1px solid ${fixStatus.type === 'success' ? 'var(--color-success, #22c55e)' : 'var(--color-error, #ef4444)'}`,
                          }}
                        >
                          {fixStatus.message}
                        </div>
                      )}
                      <div className={styles.autoFixList}>
                        {impact.autoFixSuggestions.map((suggestion: AutoFixSuggestion) => (
                          <AutoFixCard
                            key={suggestion.id}
                            suggestion={suggestion}
                            onApply={() => autoFix.mutate(suggestion.id)}
                            isApplying={autoFix.isPending}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </>
      ) : subject ? (
        <p className={styles.emptyState}>No dependency data available</p>
      ) : (
        <p className={styles.emptyState}>Enter a subject to analyze concept dependencies</p>
      )}
    </div>
  );
}
