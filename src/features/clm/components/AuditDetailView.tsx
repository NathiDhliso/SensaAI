/**
 * Audit Detail View
 * View audit findings with diff visualization
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuditDetail } from '../hooks/useAudits';
import { useApproveFindings, useRejectFindings, useExecuteFindings } from '../hooks/useFindings';
import { FindingCard } from './FindingCard';
import styles from './AuditDetailView.module.css';
import { logger } from '@/shared/utils/logger';

export function AuditDetailView() {
  const { auditId } = useParams<{ auditId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useAuditDetail(auditId);
  const [selectedFindings, setSelectedFindings] = useState<string[]>([]);

  const approveFindings = useApproveFindings();
  const rejectFindings = useRejectFindings();
  const executeFindings = useExecuteFindings();

  const handleSelectFinding = (findingId: string) => {
    setSelectedFindings((prev) =>
      prev.includes(findingId)
        ? prev.filter((id) => id !== findingId)
        : [...prev, findingId]
    );
  };

  const handleSelectAll = () => {
    if (!data) return;
    const pendingFindings = data.findings.filter((f) => f.status === 'pending');
    if (selectedFindings.length === pendingFindings.length) {
      setSelectedFindings([]);
    } else {
      setSelectedFindings(pendingFindings.map((f) => f.findingId));
    }
  };

  const handleBatchApprove = async () => {
    if (!auditId || selectedFindings.length === 0) return;
    try {
      await approveFindings.mutateAsync({
        auditId,
        findingIds: selectedFindings,
      });
      setSelectedFindings([]);
    } catch (err) {
      logger.error('Failed to approve findings:', err);
    }
  };

  const handleBatchReject = async () => {
    if (!auditId || selectedFindings.length === 0) return;
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    try {
      await rejectFindings.mutateAsync({
        auditId,
        findingIds: selectedFindings,
        reason,
      });
      setSelectedFindings([]);
    } catch (err) {
      logger.error('Failed to reject findings:', err);
    }
  };

  const handleExecute = async () => {
    if (!auditId || !data) return;
    const approvedFindings = data.findings
      .filter((f) => f.status === 'approved')
      .map((f) => f.findingId);

    if (approvedFindings.length === 0) {
      alert('No approved findings to execute');
      return;
    }

    if (!confirm(`Execute ${approvedFindings.length} approved findings?`)) {
      return;
    }

    try {
      await executeFindings.mutateAsync({
        auditId,
        findingIds: approvedFindings,
      });
      alert('Findings executed successfully!');
    } catch (err) {
      logger.error('Failed to execute findings:', err);
      alert('Failed to execute findings');
    }
  };

  if (error) {
    return (
      <div className={styles.error}>
        <p>Failed to load audit details</p>
        <p className={styles.errorDetail}>{(error as Error).message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading audit details...</p>
      </div>
    );
  }

  if (!data) {
    return <div className={styles.error}>Audit not found</div>;
  }

  const { audit, findings } = data;
  const pendingCount = findings.filter((f) => f.status === 'pending').length;
  const approvedCount = findings.filter((f) => f.status === 'approved').length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/curator/audits')}>
          <svg className={styles.backIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Queue
        </button>
      </div>

      <div className={styles.auditInfo}>
        <div>
          <h1 className={styles.title}>{audit.subject} Audit</h1>
          <p className={styles.subtitle}>
            {audit.auditType} • {new Date(audit.createdAt).toLocaleString()}
          </p>
        </div>
        <span className={`${styles.statusBadge} ${styles[audit.status]}`}>
          {audit.status}
        </span>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{findings.length}</span>
          <span className={styles.statLabel}>Total Findings</span>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statValue} ${styles.warning}`}>{pendingCount}</span>
          <span className={styles.statLabel}>Pending Review</span>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statValue} ${styles.success}`}>{approvedCount}</span>
          <span className={styles.statLabel}>Approved</span>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statValue} ${styles.danger}`}>{audit.highSeverityCount}</span>
          <span className={styles.statLabel}>High Severity</span>
        </div>
      </div>

      {selectedFindings.length > 0 && (
        <div className={styles.batchActions}>
          <span className={styles.batchCount}>{selectedFindings.length} selected</span>
          <div className={styles.batchButtons}>
            <button
              className={`${styles.batchButton} ${styles.approve}`}
              onClick={handleBatchApprove}
              disabled={approveFindings.isPending}
            >
              Approve Selected
            </button>
            <button
              className={`${styles.batchButton} ${styles.reject}`}
              onClick={handleBatchReject}
              disabled={rejectFindings.isPending}
            >
              Reject Selected
            </button>
          </div>
        </div>
      )}

      {approvedCount > 0 && (
        <div className={styles.executeSection}>
          <button
            className={styles.executeButton}
            onClick={handleExecute}
            disabled={executeFindings.isPending}
          >
            Execute {approvedCount} Approved Findings
          </button>
        </div>
      )}

      <div className={styles.findingsHeader}>
        <h2 className={styles.findingsTitle}>Findings</h2>
        {pendingCount > 0 && (
          <button className={styles.selectAllButton} onClick={handleSelectAll}>
            {selectedFindings.length === pendingCount ? 'Deselect All' : 'Select All Pending'}
          </button>
        )}
      </div>

      <div className={styles.findingsList}>
        {findings.map((finding) => (
          <FindingCard
            key={finding.findingId}
            finding={finding}
            auditId={auditId!}
            selected={selectedFindings.includes(finding.findingId)}
            onSelect={handleSelectFinding}
          />
        ))}
      </div>
    </div>
  );
}
