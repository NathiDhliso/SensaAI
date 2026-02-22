/**
 * Audit Queue View
 * List and filter audits
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudits } from '../hooks/useAudits';
import type { AuditStatus } from '../types';
import styles from './AuditQueueView.module.css';

export function AuditQueueView() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('AZ-104');
  const [status, setStatus] = useState<AuditStatus | undefined>(undefined);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useAudits({
    subject,
    status,
    page,
    limit: 20,
  });

  const handleAuditClick = (auditId: string) => {
    navigate(`/curator/audits/${auditId}`);
  };

  if (error) {
    return (
      <div className={styles.error}>
        <p>Failed to load audits</p>
        <p className={styles.errorDetail}>{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Audit Queue</h1>
        <button className={styles.triggerButton}>
          <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Trigger Audit
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Subject</label>
          <select
            className={styles.filterSelect}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="AZ-104">AZ-104</option>
            <option value="AZ-900">AZ-900</option>
            <option value="AWS-SAA">AWS-SAA</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Status</label>
          <select
            className={styles.filterSelect}
            value={status || ''}
            onChange={(e) => setStatus(e.target.value as AuditStatus || undefined)}
          >
            <option value="">All</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading audits...</p>
        </div>
      ) : (
        <>
          <div className={styles.auditList}>
            {data?.audits.map((audit) => (
              <div
                key={audit.auditId}
                className={styles.auditCard}
                onClick={() => handleAuditClick(audit.auditId)}
              >
                <div className={styles.auditHeader}>
                  <div>
                    <h3 className={styles.auditSubject}>{audit.subject}</h3>
                    <p className={styles.auditType}>{audit.auditType}</p>
                  </div>
                  <span className={`${styles.statusBadge} ${styles[audit.status]}`}>
                    {audit.status}
                  </span>
                </div>

                <div className={styles.auditStats}>
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>Findings</span>
                    <span className={styles.statValue}>{audit.findingCount}</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>High Severity</span>
                    <span className={`${styles.statValue} ${styles.highSeverity}`}>
                      {audit.highSeverityCount}
                    </span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>Created</span>
                    <span className={styles.statValue}>
                      {new Date(audit.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data && data.total > data.limit && (
            <div className={styles.pagination}>
              <button
                className={styles.pageButton}
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {page} of {Math.ceil(data.total / data.limit)}
              </span>
              <button
                className={styles.pageButton}
                disabled={page >= Math.ceil(data.total / data.limit)}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
