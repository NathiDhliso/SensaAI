/**
 * AI JSON Edit Guardian
 * Validates direct JSON edits through AI analysis before saving.
 * Surfaces risk warnings, structural issues, and provides an approval/override workflow.
 */

import { useState, useCallback } from 'react';
import {
  useValidateEdit,
  useGuardianConfig,
  useUpdateGuardianConfig,
  useValidationHistory,
  useOverrideGuardian,
} from '../hooks/useGuardian';
import type { JsonEditValidation, GuardianAction } from '../types/enhancements';
import styles from './AIJsonGuardian.module.css';

/* ---------- Sub-components ---------- */

function ActionBadge({ action }: { action: GuardianAction }) {
  const config: Record<GuardianAction, { color: string; label: string }> = {
    approve: { color: 'var(--color-success, #22c55e)', label: 'APPROVED' },
    warn: { color: 'var(--color-warning, #f59e0b)', label: 'WARNING' },
    block: { color: 'var(--color-error, #ef4444)', label: 'BLOCKED' },
    'suggest-fix': { color: 'var(--primary, #3b82f6)', label: 'FIX SUGGESTED' },
  };
  const { color, label } = config[action];
  return (
    <span className={styles.riskBadge} style={{ color, borderColor: color }}>
      {label}
    </span>
  );
}

function RiskItem({
  risk,
}: {
  risk: JsonEditValidation['aiAnalysis']['risks'][number];
}) {
  const sevColors: Record<string, string> = {
    critical: '#dc2626',
    error: 'var(--color-error, #ef4444)',
    warning: 'var(--color-warning, #f59e0b)',
    info: 'var(--primary, #3b82f6)',
  };
  return (
    <div
      className={styles.issueCard}
      style={{ borderLeftColor: sevColors[risk.severity] ?? 'var(--border, #222)' }}
    >
      <div className={styles.issueHeader}>
        <span className={styles.issuePath}>{risk.affectedField}</span>
        <span className={styles.issueSeverity} style={{ color: sevColors[risk.severity] }}>
          {risk.severity}
        </span>
      </div>
      <p className={styles.issueMessage}>{risk.description}</p>
      <span className={styles.issueType}>{risk.type.replace(/-/g, ' ')}</span>
    </div>
  );
}

function SuggestionCard({
  suggestion,
}: {
  suggestion: JsonEditValidation['aiAnalysis']['suggestions'][number];
}) {
  return (
    <div className={styles.diffCard}>
      <p className={styles.diffExplanation}>{suggestion.description}</p>
      <div className={styles.diffBody}>
        <div className={styles.diffAfter}>
          <span className={styles.diffLabel}>Suggested Value</span>
          <pre className={styles.diffPre}>
            {JSON.stringify(suggestion.suggestedValue, null, 2)}
          </pre>
        </div>
      </div>
      <div className={styles.suggestionMeta}>
        <span className={styles.suggestionReasoning}>{suggestion.reasoning}</span>
        <span className={styles.suggestionConfidence}>{suggestion.confidence}% confidence</span>
      </div>
    </div>
  );
}

function ValidationResultRow({
  result,
}: {
  result: JsonEditValidation['validationResults'][number];
}) {
  return (
    <div className={styles.validationRow}>
      <span
        className={styles.validationIcon}
        style={{
          color: result.passed
            ? 'var(--color-success, #22c55e)'
            : 'var(--color-error, #ef4444)',
        }}
      >
        {result.passed ? '✓' : '✗'}
      </span>
      <span className={styles.validationRule}>{result.rule}</span>
      <span className={styles.validationMessage}>{result.message}</span>
      {result.autoFixAvailable && (
        <span className={styles.autoFixTag}>auto-fix</span>
      )}
    </div>
  );
}

function HistoryRow({ validation }: { validation: JsonEditValidation }) {
  const actionColor: Record<GuardianAction, string> = {
    approve: 'var(--color-success, #22c55e)',
    warn: 'var(--color-warning, #f59e0b)',
    block: 'var(--color-error, #ef4444)',
    'suggest-fix': 'var(--primary, #3b82f6)',
  };

  return (
    <div className={styles.historyRow}>
      <span className={styles.historyConceptName}>{validation.conceptName}</span>
      <span className={styles.historyEditor}>{validation.editor.slice(0, 8)}</span>
      <span className={styles.historyStatus} style={{ color: actionColor[validation.overallAction] }}>
        {validation.overallAction}
      </span>
      <span className={styles.historyDate}>
        {new Date(validation.timestamp).toLocaleDateString()}
      </span>
    </div>
  );
}

/* ---------- Main Component ---------- */

export function AIJsonGuardian() {
  const [conceptId, setConceptId] = useState('');
  const [fieldPath, setFieldPath] = useState('');
  const [originalValue, setOriginalValue] = useState('');
  const [proposedValue, setProposedValue] = useState('');
  const [activeTab, setActiveTab] = useState<'validate' | 'history' | 'config'>('validate');

  const validateMutation = useValidateEdit();
  const overrideMutation = useOverrideGuardian();
  const { data: configData } = useGuardianConfig();
  const updateConfig = useUpdateGuardianConfig();
  const { data: historyData } = useValidationHistory();

  const analysis = validateMutation.data;

  const handleValidate = useCallback(() => {
    if (!conceptId || !fieldPath || !proposedValue) return;
    try {
      const parsedOriginal = originalValue ? JSON.parse(originalValue) : null;
      const parsedProposed = JSON.parse(proposedValue);
      validateMutation.mutate({
        conceptId,
        fieldPath,
        originalValue: parsedOriginal,
        proposedValue: parsedProposed,
      });
    } catch {
      // JSON parse error handled inline
    }
  }, [conceptId, fieldPath, originalValue, proposedValue, validateMutation]);

  const handleOverride = useCallback(() => {
    if (!analysis) return;
    overrideMutation.mutate({
      editId: analysis.editId,
      overrideReason: 'Manual override by curator',
    });
  }, [analysis, overrideMutation]);

  const isProposedValid = (() => {
    if (!proposedValue) return true;
    try {
      JSON.parse(proposedValue);
      return true;
    } catch {
      return false;
    }
  })();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>AI Edit Guardian</h1>
        <p className={styles.subtitle}>
          AI validates JSON edits before saving to prevent invalid content
        </p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(['validate', 'history', 'config'] as const).map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'validate' ? 'Validate Edit' : tab === 'history' ? 'History' : 'Configuration'}
          </button>
        ))}
      </div>

      {/* --- Validate Tab --- */}
      {activeTab === 'validate' && (
        <div className={styles.validatePanel}>
          <div className={styles.inputRow}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Concept ID</label>
              <input
                type="text"
                placeholder="e.g. concept-abc-123"
                value={conceptId}
                onChange={(e) => setConceptId(e.target.value)}
                className={styles.textInput}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Field Path</label>
              <input
                type="text"
                placeholder="e.g. question.text"
                value={fieldPath}
                onChange={(e) => setFieldPath(e.target.value)}
                className={styles.textInput}
              />
            </div>
          </div>

          <div className={styles.editorRow}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Original Value (JSON)</label>
              <textarea
                className={styles.jsonEditor}
                rows={8}
                value={originalValue}
                onChange={(e) => setOriginalValue(e.target.value)}
                placeholder="Original value (optional)"
                spellCheck={false}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Proposed Value (JSON)</label>
              <textarea
                className={`${styles.jsonEditor} ${!isProposedValid ? styles.jsonError : ''}`}
                rows={8}
                value={proposedValue}
                onChange={(e) => setProposedValue(e.target.value)}
                placeholder="New proposed value"
                spellCheck={false}
              />
              {!isProposedValid && <span className={styles.jsonParseError}>Invalid JSON syntax</span>}
            </div>
          </div>

          <button
            className={styles.validateButton}
            onClick={handleValidate}
            disabled={!conceptId || !fieldPath || !proposedValue || !isProposedValid || validateMutation.isPending}
          >
            {validateMutation.isPending ? 'Validating...' : 'Validate with AI'}
          </button>

          {/* Results */}
          {analysis && (
            <div className={styles.resultsSection}>
              <div className={styles.resultHeader}>
                <h2 className={styles.resultTitle}>Validation Result</h2>
                <ActionBadge action={analysis.overallAction} />
              </div>

              {/* AI Analysis Verdict */}
              <div
                className={styles.verdictCard}
                style={{
                  borderColor: analysis.aiAnalysis.isValid
                    ? 'var(--color-success, #22c55e)'
                    : 'var(--color-error, #ef4444)',
                }}
              >
                <span
                  className={styles.verdictStatus}
                  style={{
                    color: analysis.aiAnalysis.isValid
                      ? 'var(--color-success, #22c55e)'
                      : 'var(--color-error, #ef4444)',
                  }}
                >
                  {analysis.aiAnalysis.isValid ? 'Valid Edit' : 'Invalid Edit'}
                </span>
                <p className={styles.verdictExplanation}>{analysis.aiAnalysis.reasoning}</p>
                <div className={styles.verdictMeta}>
                  <span>Confidence: {analysis.aiAnalysis.confidence}%</span>
                  <span>Accuracy: {analysis.aiAnalysis.factualAccuracy}%</span>
                  <span>Schema: {analysis.aiAnalysis.schemaCompliance ? '✓' : '✗'}</span>
                  <span>Semantic: {analysis.aiAnalysis.semanticConsistency ? '✓' : '✗'}</span>
                </div>
              </div>

              {/* Risks */}
              {analysis.aiAnalysis.risks.length > 0 && (
                <div className={styles.issuesSection}>
                  <h3 className={styles.sectionTitle}>
                    Risks ({analysis.aiAnalysis.risks.length})
                  </h3>
                  {analysis.aiAnalysis.risks.map((risk, i) => (
                    <RiskItem key={i} risk={risk} />
                  ))}
                </div>
              )}

              {/* Validation Results */}
              {analysis.validationResults.length > 0 && (
                <div className={styles.issuesSection}>
                  <h3 className={styles.sectionTitle}>Validation Rules</h3>
                  {analysis.validationResults.map((result, i) => (
                    <ValidationResultRow key={i} result={result} />
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {analysis.aiAnalysis.suggestions.length > 0 && (
                <div className={styles.fixesSection}>
                  <h3 className={styles.sectionTitle}>AI Suggestions</h3>
                  {analysis.aiAnalysis.suggestions.map((suggestion, i) => (
                    <SuggestionCard key={i} suggestion={suggestion} />
                  ))}
                </div>
              )}

              {/* Override action */}
              {analysis.requiresApproval && (
                <div className={styles.actionsRow}>
                  <button
                    className={styles.overrideButton}
                    onClick={handleOverride}
                    disabled={overrideMutation.isPending}
                  >
                    {overrideMutation.isPending ? 'Overriding...' : 'Override & Save Anyway'}
                  </button>
                  <span className={styles.overrideWarning}>
                    Override will be logged for audit review
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- History Tab --- */}
      {activeTab === 'history' && (
        <div className={styles.historyPanel}>
          <div className={styles.historyHeader}>
            <span className={styles.historyCol}>Concept</span>
            <span className={styles.historyCol}>Editor</span>
            <span className={styles.historyCol}>Action</span>
            <span className={styles.historyCol}>Date</span>
          </div>
          {historyData && historyData.validations.length > 0 ? (
            historyData.validations.map((v) => (
              <HistoryRow key={v.editId} validation={v} />
            ))
          ) : (
            <p className={styles.emptyState}>No validation history yet</p>
          )}
        </div>
      )}

      {/* --- Config Tab --- */}
      {activeTab === 'config' && configData && (
        <div className={styles.configPanel}>
          <div className={styles.configRow}>
            <label className={styles.configLabel}>Guardian enabled</label>
            <button
              className={`${styles.toggle} ${configData.enabled ? styles.toggleOn : ''}`}
              onClick={() =>
                updateConfig.mutate({
                  enabled: !configData.enabled,
                })
              }
            >
              {configData.enabled ? 'On' : 'Off'}
            </button>
          </div>
          <div className={styles.configRow}>
            <label className={styles.configLabel}>Strict mode (block on any warning)</label>
            <button
              className={`${styles.toggle} ${configData.strictMode ? styles.toggleOn : ''}`}
              onClick={() =>
                updateConfig.mutate({
                  strictMode: !configData.strictMode,
                })
              }
            >
              {configData.strictMode ? 'On' : 'Off'}
            </button>
          </div>
          <div className={styles.configRow}>
            <label className={styles.configLabel}>Auto-approve threshold</label>
            <span className={styles.configValue}>{configData.autoApproveThreshold}%</span>
          </div>
          <div className={styles.configRow}>
            <label className={styles.configLabel}>Required approval fields</label>
            <span className={styles.configValue}>
              {configData.requireApprovalFor.length > 0
                ? configData.requireApprovalFor.join(', ')
                : 'None'}
            </span>
          </div>
          <div className={styles.configRow}>
            <label className={styles.configLabel}>Bypass roles</label>
            <span className={styles.configValue}>
              {configData.bypassForRoles.length > 0
                ? configData.bypassForRoles.join(', ')
                : 'None'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
