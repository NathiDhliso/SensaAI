/**
 * Finding Card
 * Display individual finding with diff visualization
 */

import { useState } from 'react';
import { useApproveFindings, useRejectFindings } from '../hooks/useFindings';
import type { AuditFindingRecord } from '../types';
import styles from './FindingCard.module.css';
import { logger } from '@/shared/utils/logger';

interface FindingCardProps {
  finding: AuditFindingRecord;
  auditId: string;
  selected: boolean;
  onSelect: (findingId: string) => void;
}

export function FindingCard({ finding, auditId, selected, onSelect }: FindingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const approveFindings = useApproveFindings();
  const rejectFindings = useRejectFindings();

  const handleApprove = async () => {
    try {
      await approveFindings.mutateAsync({
        auditId,
        findingIds: [finding.findingId],
      });
    } catch (err) {
      logger.error('Failed to approve finding:', err);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    try {
      await rejectFindings.mutateAsync({
        auditId,
        findingIds: [finding.findingId],
        reason,
      });
    } catch (err) {
      logger.error('Failed to reject finding:', err);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const isPending = finding.status === 'pending';

  return (
    <div className={`${styles.card} ${selected ? styles.selected : ''}`}>
      <div className={styles.header}>
        {isPending && (
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={selected}
            onChange={() => onSelect(finding.findingId)}
          />
        )}

        <div className={styles.headerInfo}>
          <h3 className={styles.conceptName}>{finding.conceptName}</h3>
          <p className={styles.issueType}>{finding.issueType?.replace(/-/g, ' ') || 'Unknown Issue'}</p>
        </div>

        <div className={styles.badges}>
          <span className={`${styles.severityBadge} ${styles[finding.severity]}`}>
            {finding.severity}
          </span>
          <span className={`${styles.confidenceBadge} ${getConfidenceClass(finding.confidenceScore)}`}>
            {finding.confidenceScore}% confidence
          </span>
          <span className={`${styles.statusBadge} ${styles[finding.status]}`}>
            {finding.status}
          </span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.operation}>
          <span className={styles.operationLabel}>Operation:</span>
          <span className={`${styles.operationValue} ${finding.operation ? styles[finding.operation.toLowerCase()] : ''}`}>
            {finding.operation || 'Unknown'}
          </span>
          {finding.fieldPath && (
            <span className={styles.fieldPath}>→ {finding.fieldPath}</span>
          )}
        </div>

        <p className={styles.reasoning}>{finding.reasoning}</p>

        <button
          className={styles.expandButton}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Hide' : 'Show'} Diff
          <svg
            className={`${styles.expandIcon} ${expanded ? styles.expanded : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className={styles.diff}>
            <div className={styles.diffSection}>
              <div className={styles.diffHeader}>
                <span className={styles.diffLabel}>Current Value</span>
                <span className={styles.diffType}>
                  {finding.currentValue === null ? 'missing' : typeof finding.currentValue}
                </span>
              </div>
              <pre className={`${styles.diffContent} ${styles.old}`}>
                {formatValue(finding.currentValue)}
              </pre>
            </div>

            <div className={styles.diffArrow}>→</div>

            <div className={styles.diffSection}>
              <div className={styles.diffHeader}>
                <span className={styles.diffLabel}>Proposed Value</span>
                <span className={styles.diffType}>
                  {finding.proposedValue === null ? 'null' : typeof finding.proposedValue}
                </span>
              </div>
              <pre className={`${styles.diffContent} ${styles.new}`}>
                {formatValue(finding.proposedValue)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {isPending && (
        <div className={styles.actions}>
          <button
            className={`${styles.actionButton} ${styles.approve}`}
            onClick={handleApprove}
            disabled={approveFindings.isPending}
          >
            Approve
          </button>
          <button
            className={`${styles.actionButton} ${styles.reject}`}
            onClick={handleReject}
            disabled={rejectFindings.isPending}
          >
            Reject
          </button>
        </div>
      )}

      {finding.status === 'rejected' && finding.rejectionReason && (
        <div className={styles.rejectionReason}>
          <strong>Rejection Reason:</strong> {finding.rejectionReason}
        </div>
      )}
    </div>
  );
}

function getConfidenceClass(score: number): string {
  if (score >= 90) return 'high';
  if (score >= 75) return 'medium';
  return 'low';
}
