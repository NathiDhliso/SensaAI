/**
 * Smart Regeneration Recommender
 * AI-powered decision engine that recommends the optimal update strategy:
 * full regeneration, surgical updates, partial regeneration, or no action.
 * Shows cost/time estimates, confidence scores, and domain-level analysis.
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRegenerationRecommendation, useExecuteRegeneration, useRegenerationStatus } from '../hooks/useRegeneration';
import type { StrategyOption, DomainRegenerationAnalysis, UpdateStrategy, RegenerationRecommendation } from '../types/enhancements';
import styles from './SmartRegenerationRecommender.module.css';

const STRATEGY_CONFIG: Record<UpdateStrategy, { label: string; icon: string; color: string }> = {
  'full-regeneration': { label: 'Full Regeneration', icon: '🔄', color: 'var(--color-error, #ef4444)' },
  'surgical-update': { label: 'Surgical Update', icon: '🔧', color: 'var(--color-success, #22c55e)' },
  'partial-regeneration': { label: 'Partial Regeneration', icon: '⚡', color: 'var(--color-warning, #f59e0b)' },
  'no-action': { label: 'No Action Needed', icon: '✓', color: 'var(--primary, #3b82f6)' },
};

function StrategyCard({
  option,
  isRecommended,
  onExecute,
  isExecuting,
}: {
  option: StrategyOption;
  isRecommended: boolean;
  onExecute: () => void;
  isExecuting: boolean;
}) {
  const config = STRATEGY_CONFIG[option.strategy];

  return (
    <div className={`${styles.strategyCard} ${isRecommended ? styles.recommended : ''}`}>
      {isRecommended && <span className={styles.recommendedBadge}>Recommended</span>}
      <div className={styles.strategyHeader}>
        <span className={styles.strategyIcon}>{config.icon}</span>
        <h3 className={styles.strategyName} style={{ color: config.color }}>
          {config.label}
        </h3>
      </div>
      <p className={styles.strategyDesc}>{option.description}</p>

      <div className={styles.estimatesGrid}>
        <div className={styles.estimate}>
          <span className={styles.estimateLabel}>Cost</span>
          <span className={styles.estimateValue}>${option.estimatedCostUsd.toFixed(2)}</span>
        </div>
        <div className={styles.estimate}>
          <span className={styles.estimateLabel}>Time</span>
          <span className={styles.estimateValue}>{option.estimatedTimeMinutes}m</span>
        </div>
        <div className={styles.estimate}>
          <span className={styles.estimateLabel}>Tokens</span>
          <span className={styles.estimateValue}>{option.estimatedTokens.toLocaleString()}</span>
        </div>
        <div className={styles.estimate}>
          <span className={styles.estimateLabel}>Risk</span>
          <span className={`${styles.estimateValue} ${styles[`risk${option.riskLevel.charAt(0).toUpperCase()}${option.riskLevel.slice(1)}`] ?? ''}`}>
            {option.riskLevel}
          </span>
        </div>
      </div>

      <div className={styles.confidenceBar}>
        <div className={styles.confidenceTrack}>
          <div
            className={styles.confidenceFill}
            style={{ width: `${option.confidenceScore}%`, background: config.color }}
          />
        </div>
        <span className={styles.confidenceLabel}>{option.confidenceScore}% confidence</span>
      </div>

      <div className={styles.prosConsGrid}>
        <div className={styles.prosSection}>
          <h4 className={styles.prosTitle}>Pros</h4>
          <ul className={styles.prosList}>
            {option.pros.map((pro, i) => (
              <li key={i} className={styles.proItem}>{pro}</li>
            ))}
          </ul>
        </div>
        <div className={styles.consSection}>
          <h4 className={styles.consTitle}>Cons</h4>
          <ul className={styles.consList}>
            {option.cons.map((con, i) => (
              <li key={i} className={styles.conItem}>{con}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.strategyFooter}>
        <span className={styles.affectedCount}>
          {option.affectedConceptCount} concepts affected
        </span>
        <button
          className={`${styles.executeButton} ${isRecommended ? styles.executePrimary : ''}`}
          onClick={onExecute}
          disabled={isExecuting}
        >
          {isExecuting ? 'Executing...' : `Execute ${config.label}`}
        </button>
      </div>
    </div>
  );
}

function DomainAnalysisRow({ domain }: { domain: DomainRegenerationAnalysis }) {
  return (
    <div className={styles.domainRow}>
      <div className={styles.domainInfo}>
        <span className={styles.domainName}>{domain.domain}</span>
        <span className={styles.domainConcepts}>{domain.conceptCount} concepts</span>
      </div>
      <div className={styles.domainMetrics}>
        <div className={styles.domainMetric}>
          <span className={styles.domainMetricLabel}>Staleness</span>
          <div className={styles.miniBar}>
            <div
              className={styles.miniBarFill}
              style={{
                width: `${domain.staleness}%`,
                background: domain.staleness > 60
                  ? 'var(--color-error, #ef4444)'
                  : domain.staleness > 30
                    ? 'var(--color-warning, #f59e0b)'
                    : 'var(--color-success, #22c55e)',
              }}
            />
          </div>
          <span className={styles.domainMetricValue}>{domain.staleness}%</span>
        </div>
        <div className={styles.domainMetric}>
          <span className={styles.domainMetricLabel}>Quality</span>
          <div className={styles.miniBar}>
            <div
              className={styles.miniBarFill}
              style={{
                width: `${domain.qualityScore}%`,
                background: domain.qualityScore >= 70
                  ? 'var(--color-success, #22c55e)'
                  : domain.qualityScore >= 40
                    ? 'var(--color-warning, #f59e0b)'
                    : 'var(--color-error, #ef4444)',
              }}
            />
          </div>
          <span className={styles.domainMetricValue}>{domain.qualityScore}%</span>
        </div>
      </div>
      <span
        className={`${styles.domainStatus} ${domain.needsRegeneration ? styles.needsRegen : styles.okStatus}`}
      >
        {domain.needsRegeneration ? 'Needs Regen' : 'OK'}
      </span>
    </div>
  );
}

export function SmartRegenerationRecommender() {
  const [searchParams] = useSearchParams();
  const [subject, setSubject] = useState(searchParams.get('subject') || '');
  const sessionId = searchParams.get('sessionId') || undefined;
  const [activeJobId, setActiveJobId] = useState<string | undefined>();

  const { data: recommendation, isLoading } = useRegenerationRecommendation(subject || undefined, sessionId) as {
    data: RegenerationRecommendation | undefined;
    isLoading: boolean;
  };
  const executeMutation = useExecuteRegeneration();
  const { data: jobStatus } = useRegenerationStatus(activeJobId);

  const handleExecute = (strategy: string, domains?: string[]) => {
    if (!subject) return;

    // No-action doesn't need a real job — just confirm
    if (strategy === 'no-action') {
      executeMutation.mutate(
        { subject, strategy, domains: [] },
        { onSuccess: () => { /* no job to track */ } }
      );
      return;
    }

    // For surgical-update: pass only the weak domains
    // For partial-regeneration: pass the bottom-half domains sorted by quality
    let targetDomains = domains;
    if (!targetDomains && recommendation) {
      if (strategy === 'surgical-update') {
        targetDomains = recommendation.domainAnalysis
          .filter((d: DomainRegenerationAnalysis) => d.needsRegeneration)
          .map((d: DomainRegenerationAnalysis) => d.domain);
      } else if (strategy === 'partial-regeneration') {
        const sorted = [...recommendation.domainAnalysis].sort(
          (a: DomainRegenerationAnalysis, b: DomainRegenerationAnalysis) => a.qualityScore - b.qualityScore
        );
        targetDomains = sorted.slice(0, Math.ceil(sorted.length / 2)).map((d: DomainRegenerationAnalysis) => d.domain);
      }
    }

    executeMutation.mutate(
      { subject, strategy, domains: targetDomains },
      { onSuccess: (result: unknown) => {
        const res = result as { jobId: string; estimatedTimeMinutes: number };
        if (res.jobId && res.jobId !== 'no-action') {
          setActiveJobId(res.jobId);
        }
      }}
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Smart Regeneration</h1>
        <p className={styles.subtitle}>
          AI-powered recommendations for optimal content update strategy
        </p>
      </div>

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Enter subject to analyze..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={styles.subjectInput}
        />
      </div>

      {/* Active Job Status */}
      {activeJobId && jobStatus && (
        <div className={styles.jobStatusBanner}>
          <div className={styles.jobStatusHeader}>
            <span className={styles.jobStatusLabel}>Regeneration In Progress</span>
            <span className={styles.jobStatusState}>{jobStatus.status}</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${jobStatus.progress}%` }} />
          </div>
          <p className={styles.jobStatusMessage}>{jobStatus.message}</p>
        </div>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Analyzing content and generating recommendations...</p>
        </div>
      ) : recommendation ? (
        <>
          {/* Main Recommendation */}
          <div className={styles.mainRec}>
            <div className={styles.mainRecHeader}>
              <span className={styles.mainRecIcon}>
                {STRATEGY_CONFIG[recommendation.recommendedStrategy].icon}
              </span>
              <div>
                <h2 className={styles.mainRecTitle}>
                  Recommended: {STRATEGY_CONFIG[recommendation.recommendedStrategy].label}
                </h2>
                <p className={styles.mainRecReasoning}>{recommendation.reasoning}</p>
              </div>
              <span className={styles.mainRecConfidence}>
                {recommendation.confidence}% confidence
              </span>
            </div>
          </div>

          {/* Strategy Options */}
          <div className={styles.strategiesSection}>
            <h2 className={styles.sectionTitle}>Available Strategies</h2>
            <div className={styles.strategiesGrid}>
              {recommendation.strategies.map((option) => (
                <StrategyCard
                  key={option.strategy}
                  option={option}
                  isRecommended={option.strategy === recommendation.recommendedStrategy}
                  onExecute={() => handleExecute(option.strategy)}
                  isExecuting={executeMutation.isPending}
                />
              ))}
            </div>
          </div>

          {/* Domain Analysis */}
          <div className={styles.domainSection}>
            <h2 className={styles.sectionTitle}>Domain Analysis</h2>
            <div className={styles.domainList}>
              {recommendation.domainAnalysis.map((domain) => (
                <DomainAnalysisRow key={domain.domain} domain={domain} />
              ))}
            </div>
          </div>

          {/* Impact Estimate */}
          <div className={styles.impactSection}>
            <h2 className={styles.sectionTitle}>Estimated Impact</h2>
            <div className={styles.impactGrid}>
              <div className={styles.impactItem}>
                <span className={styles.impactValue}>{recommendation.estimatedImpact.conceptsAffected}</span>
                <span className={styles.impactLabel}>Concepts Affected</span>
              </div>
              <div className={styles.impactItem}>
                <span className={styles.impactValue}>{recommendation.estimatedImpact.learnersAffected}</span>
                <span className={styles.impactLabel}>Learners Affected</span>
              </div>
              <div className={styles.impactItem}>
                <span className={styles.impactValue}>{recommendation.estimatedImpact.estimatedDowntimeMinutes}m</span>
                <span className={styles.impactLabel}>Est. Downtime</span>
              </div>
              <div className={styles.impactItem}>
                <span className={styles.impactValue}>{recommendation.estimatedImpact.learningPathDisruption}</span>
                <span className={styles.impactLabel}>Path Disruption</span>
              </div>
            </div>
          </div>
        </>
      ) : subject ? (
        <p className={styles.emptyState}>No recommendation data available</p>
      ) : (
        <p className={styles.emptyState}>Enter a subject to get AI-powered regeneration recommendations</p>
      )}
    </div>
  );
}
