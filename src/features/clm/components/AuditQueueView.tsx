/**
 * Audit Queue View
 * List and filter audits, trigger on-demand audits for generated concept JSON.
 *
 * Audit types:
 *  - schema:   Validate JSON structure matches the concept schema
 *  - content:  AI-driven accuracy/correctness check against exam objectives
 *  - coverage: Ensure every exam objective has at least one concept
 *  - quality:  Assess pedagogical quality, framing, and difficulty spread
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudits, useTriggerAudit } from '../hooks/useAudits';
import { storageManager } from '../../content-storage/manager';
import type { AuditStatus, AuditType } from '../types';
import styles from './AuditQueueView.module.css';

const ALL_AUDIT_TYPES: { value: AuditType; label: string; description: string }[] = [
  { value: 'schema', label: 'Schema', description: 'Validate JSON structure' },
  { value: 'content', label: 'Content', description: 'Accuracy against exam objectives' },
  { value: 'coverage', label: 'Coverage', description: 'Objective coverage completeness' },
  { value: 'quality', label: 'Quality', description: 'Pedagogical quality & framing' },
];

export function AuditQueueView() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState<AuditStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  // Trigger audit state
  const [showTriggerPanel, setShowTriggerPanel] = useState(false);
  const [selectedAuditTypes, setSelectedAuditTypes] = useState<AuditType[]>([
    'schema', 'content', 'coverage', 'quality',
  ]);
  const [triggerPriority, setTriggerPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [cachedNotice, setCachedNotice] = useState<string | null>(null);
  const triggerAudit = useTriggerAudit();

  // Load available subjects from generated content
  useEffect(() => {
    let cancelled = false;
    storageManager.listResults().then((results) => {
      if (cancelled) return;
      const subjects = [...new Set(results.map((r) => r.subject).filter(Boolean))];
      setAvailableSubjects(subjects);
      if (subjects.length > 0 && !subject) {
        setSubject(subjects[0]);
      }
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, error } = useAudits({
    subject: subject || undefined,
    status,
    page,
    limit: 20,
  });

  const handleAuditClick = (auditId: string) => {
    navigate(`/curator/audits/${auditId}`);
  };

  const toggleAuditType = (type: AuditType) => {
    setSelectedAuditTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleTriggerSubmit = async (force = false) => {
    if (!subject || selectedAuditTypes.length === 0) return;
    setCachedNotice(null);
    try {
      const result = await triggerAudit.mutateAsync({
        subject,
        auditTypes: selectedAuditTypes,
        priority: triggerPriority,
        force,
      });
      // If the result came from cache, show notice instead of closing
      if (result?._cached && result._cachedAt) {
        const hoursAgo = Math.round((Date.now() - result._cachedAt) / 3_600_000);
        setCachedNotice(
          `Already audited ${hoursAgo < 1 ? 'less than an hour' : `${hoursAgo}h`} ago ` +
          `(no content changes since). Results are in the queue below.`
        );
      } else {
        setShowTriggerPanel(false);
        setCachedNotice(null);
      }
    } catch {
      // Error handled by React Query — mutation state shows in UI
    }
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
        <button
          className={styles.triggerButton}
          onClick={() => setShowTriggerPanel(!showTriggerPanel)}
          disabled={availableSubjects.length === 0}
        >
          <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Trigger Audit
        </button>
      </div>

      {/* ---- Trigger Audit Panel ---- */}
      {showTriggerPanel && (
        <div className={styles.triggerPanel}>
          <h3 className={styles.triggerPanelTitle}>New Audit</h3>
          <p className={styles.triggerPanelDesc}>
            Run AI-powered checks on the generated concept JSON for <strong>{subject}</strong>.
            Select which audit types to include.
          </p>

          <div className={styles.auditTypeGrid}>
            {ALL_AUDIT_TYPES.map((type) => (
              <label key={type.value} className={styles.auditTypeOption}>
                <input
                  type="checkbox"
                  checked={selectedAuditTypes.includes(type.value)}
                  onChange={() => toggleAuditType(type.value)}
                />
                <div>
                  <span className={styles.auditTypeLabel}>{type.label}</span>
                  <span className={styles.auditTypeDesc}>{type.description}</span>
                </div>
              </label>
            ))}
          </div>

          <div className={styles.triggerPanelRow}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Priority</label>
              <select
                className={styles.filterSelect}
                value={triggerPriority}
                onChange={(e) => setTriggerPriority(e.target.value as 'low' | 'medium' | 'high')}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className={styles.triggerPanelActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowTriggerPanel(false)}
              >
                Cancel
              </button>
              <button
                className={styles.submitTriggerButton}
                onClick={() => handleTriggerSubmit(false)}
                disabled={triggerAudit.isPending || selectedAuditTypes.length === 0}
              >
                {triggerAudit.isPending ? 'Triggering…' : `Run ${selectedAuditTypes.length} Audit${selectedAuditTypes.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>

          {cachedNotice && (
            <div className={styles.cachedNotice}>
              <p>{cachedNotice}</p>
              <button
                className={styles.forceRerunButton}
                onClick={() => handleTriggerSubmit(true)}
                disabled={triggerAudit.isPending}
              >
                Force Re-run
              </button>
            </div>
          )}

          {triggerAudit.isError && (
            <p className={styles.triggerError}>
              Failed to trigger audit: {(triggerAudit.error as Error).message}
            </p>
          )}
        </div>
      )}

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Subject</label>
          <select
            className={styles.filterSelect}
            value={subject}
            onChange={(e) => { setSubject(e.target.value); setPage(1); }}
          >
            {availableSubjects.length === 0 && (
              <option value="">No generated content</option>
            )}
            {availableSubjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
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
            {(!data?.audits || data.audits.length === 0) && (
              <div className={styles.emptyState}>
                <p>No audits found for <strong>{subject}</strong>.</p>
                <p className={styles.emptyHint}>
                  Click <strong>Trigger Audit</strong> above to run an AI-powered review of your generated concepts.
                </p>
              </div>
            )}
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
