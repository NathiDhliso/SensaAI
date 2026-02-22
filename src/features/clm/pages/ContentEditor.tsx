/**
 * Content Editor - Edit and manage learning concepts
 * Allows curators to manually edit concept content, TRACES, and metadata
 * Integrated with AI Guardian for edit validation before save
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, X, ArrowLeft, AlertCircle, Shield, ShieldAlert, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import type { ParsedConcept } from '@/features/content-generation/parsers/types';
import { conceptsApi } from '@/shared/api/concepts';
import { useAuthStore } from '@/store/auth-store';
import { useValidateEdit, useGuardianConfig } from '@/features/clm/hooks/useGuardian';
import type { JsonEditValidation } from '@/features/clm/types/enhancements';
import styles from './ContentEditor.module.css';
import { logger } from '@/shared/utils/logger';

export default function ContentEditor() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore(state => state.user);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState('');
  const [concepts, setConcepts] = useState<ParsedConcept[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<ParsedConcept | null>(null);
  const [editedConcept, setEditedConcept] = useState<ParsedConcept | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Guardian state
  const [guardianResult, setGuardianResult] = useState<JsonEditValidation | null>(null);
  const [guardianExpanded, setGuardianExpanded] = useState(true);
  const [overrideReason, setOverrideReason] = useState('');
  const validateEdit = useValidateEdit();
  const { data: guardianConfig } = useGuardianConfig();

  useEffect(() => {
    // Try to get data from navigation state first
    if (location.state?.concepts) {
      setSubject(location.state.subject);
      setConcepts(location.state.concepts);
      setLoading(false);
    } else if (subjectId) {
      loadContent();
    }
  }, [subjectId, location.state]);

  const loadContent = async () => {
    if (!subjectId || !user?.id) return;
    
    setLoading(true);
    try {
      const response = await conceptsApi.getPublicContent(user.id, subjectId);
      setSubject(response.subject);
      setConcepts(response.concepts);
    } catch (error) {
      logger.error('Failed to load content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConcept = (concept: ParsedConcept) => {
    if (hasChanges && !confirm('You have unsaved changes. Discard them?')) {
      return;
    }
    setSelectedConcept(concept);
    setEditedConcept({ ...concept });
    setHasChanges(false);
  };

  const handleFieldChange = (field: keyof ParsedConcept, value: any) => {
    if (!editedConcept) return;
    setEditedConcept({ ...editedConcept, [field]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!editedConcept || !user?.id || !subjectId) return;

    // If Guardian is enabled and we don't have a validation result yet, validate first
    const guardianEnabled = guardianConfig?.enabled !== false;
    if (guardianEnabled && !guardianResult) {
      try {
        const result = await validateEdit.mutateAsync({
          conceptId: editedConcept.id,
          fieldPath: '*', // whole concept edit
          originalValue: selectedConcept,
          proposedValue: editedConcept,
        });
        setGuardianResult(result);

        // If blocked, don't save
        if (result.overallAction === 'block') {
          return;
        }

        // If requires approval, wait for override
        if (result.requiresApproval) {
          return;
        }

        // Auto-approved or warned — proceed to save
      } catch {
        // If Guardian fails, log warning and allow save
        logger.warn('Guardian validation failed, proceeding with save');
      }
    }

    // Proceed with actual save
    setSaving(true);
    try {
      await conceptsApi.updateConcept(
        user.id,
        subjectId,
        editedConcept.id,
        editedConcept.tier || 'leaf',
        editedConcept,
      );
      
      // Update local state
      setConcepts(prev => prev.map(c => 
        c.name === editedConcept.name ? editedConcept : c
      ));
      setSelectedConcept(editedConcept);
      setHasChanges(false);
      setGuardianResult(null);
      setOverrideReason('');
    } catch (error) {
      logger.error('Failed to save:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  /** Force save despite Guardian warnings/blocks */
  const handleForceOverride = async () => {
    if (!editedConcept || !user?.id || !subjectId) return;
    if (!overrideReason.trim()) {
      alert('Please provide a reason for overriding the Guardian');
      return;
    }

    setSaving(true);
    try {
      await conceptsApi.updateConcept(
        user.id,
        subjectId,
        editedConcept.id,
        editedConcept.tier || 'leaf',
        editedConcept,
      );

      setConcepts(prev => prev.map(c =>
        c.name === editedConcept.name ? editedConcept : c
      ));
      setSelectedConcept(editedConcept);
      setHasChanges(false);
      setGuardianResult(null);
      setOverrideReason('');
    } catch (error) {
      logger.error('Failed to save (override):', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDismissGuardian = () => {
    setGuardianResult(null);
    setOverrideReason('');
  };

  const handleCancel = () => {
    if (hasChanges && !confirm('Discard unsaved changes?')) {
      return;
    }
    setEditedConcept(selectedConcept ? { ...selectedConcept } : null);
    setHasChanges(false);
  };

  const handleBack = () => {
    if (hasChanges && !confirm('You have unsaved changes. Leave anyway?')) {
      return;
    }
    navigate(`/curator/preview/${subjectId}`);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading content...</div>
      </div>
    );
  }

  const trunks = concepts.filter(c => c.tier === 'trunk');
  const branches = concepts.filter(c => c.tier === 'branch');
  const leaves = concepts.filter(c => c.tier === 'leaf');

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button onClick={handleBack} className={styles.backButton}>
          <ArrowLeft size={16} />
          Back to Preview
        </button>
        <div className={styles.headerTitle}>
          <h1 className={styles.title}>Edit Content</h1>
          <p className={styles.subtitle}>{subject}</p>
        </div>
        {hasChanges && (
          <div className={styles.unsavedBadge}>
            <AlertCircle size={14} />
            Unsaved Changes
          </div>
        )}
      </div>

      <div className={styles.editorLayout}>
        {/* Concept List */}
        <div className={styles.conceptList}>
          <div className={styles.conceptListHeader}>
            <h2 className={styles.conceptListTitle}>Concepts</h2>
            <span className={styles.conceptCount}>{concepts.length} total</span>
          </div>

          <div className={styles.tierSection}>
            <div className={styles.tierHeader}>Trunks ({trunks.length})</div>
            {trunks.map(concept => (
              <button
                key={concept.name}
                onClick={() => handleSelectConcept(concept)}
                className={`${styles.conceptItem} ${selectedConcept?.name === concept.name ? styles.conceptItemActive : ''}`}
              >
                <span className={styles.tierBadge}>T</span>
                {concept.name}
              </button>
            ))}
          </div>

          <div className={styles.tierSection}>
            <div className={styles.tierHeader}>Branches ({branches.length})</div>
            {branches.map(concept => (
              <button
                key={concept.name}
                onClick={() => handleSelectConcept(concept)}
                className={`${styles.conceptItem} ${selectedConcept?.name === concept.name ? styles.conceptItemActive : ''}`}
              >
                <span className={styles.tierBadge}>B</span>
                {concept.name}
              </button>
            ))}
          </div>

          <div className={styles.tierSection}>
            <div className={styles.tierHeader}>Leaves ({leaves.length})</div>
            {leaves.map(concept => (
              <button
                key={concept.name}
                onClick={() => handleSelectConcept(concept)}
                className={`${styles.conceptItem} ${selectedConcept?.name === concept.name ? styles.conceptItemActive : ''}`}
              >
                <span className={styles.tierBadge}>L</span>
                {concept.name}
              </button>
            ))}
          </div>
        </div>

        {/* Editor Panel */}
        <div className={styles.editorPanel}>
          {!editedConcept ? (
            <div className={styles.emptyState}>
              <p>Select a concept to edit</p>
            </div>
          ) : (
            <>
              <div className={styles.editorHeader}>
                <h2 className={styles.editorTitle}>{editedConcept.name}</h2>
                <div className={styles.editorActions}>
                  <button
                    onClick={handleCancel}
                    disabled={!hasChanges}
                    className={styles.cancelButton}
                  >
                    <X size={16} />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges || saving || validateEdit.isPending}
                    className={styles.saveButton}
                  >
                    {validateEdit.isPending ? (
                      <Shield size={16} className={styles.spinIcon} />
                    ) : (
                      <Save size={16} />
                    )}
                    {validateEdit.isPending ? 'Validating...' : saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* Guardian Validation Panel */}
              {guardianResult && (
                <div className={`${styles.guardianPanel} ${styles[`guardian_${guardianResult.overallAction}`]}`}>
                  <div className={styles.guardianHeader} onClick={() => setGuardianExpanded(e => !e)}>
                    <div className={styles.guardianStatus}>
                      {guardianResult.overallAction === 'approve' && <ShieldCheck size={18} />}
                      {guardianResult.overallAction === 'warn' && <Shield size={18} />}
                      {(guardianResult.overallAction === 'block' || guardianResult.overallAction === 'suggest-fix') && <ShieldAlert size={18} />}
                      <span className={styles.guardianTitle}>
                        {guardianResult.overallAction === 'approve' && 'Guardian: Approved'}
                        {guardianResult.overallAction === 'warn' && 'Guardian: Warnings Found'}
                        {guardianResult.overallAction === 'block' && 'Guardian: Edit Blocked'}
                        {guardianResult.overallAction === 'suggest-fix' && 'Guardian: Fix Suggested'}
                      </span>
                      <span className={styles.guardianConfidence}>
                        {guardianResult.aiAnalysis.confidence}% confidence
                      </span>
                    </div>
                    {guardianExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>

                  {guardianExpanded && (
                    <div className={styles.guardianBody}>
                      <p className={styles.guardianReasoning}>{guardianResult.aiAnalysis.reasoning}</p>

                      {guardianResult.aiAnalysis.risks.length > 0 && (
                        <div className={styles.guardianRisks}>
                          <h4 className={styles.guardianSubtitle}>Risks</h4>
                          {guardianResult.aiAnalysis.risks.map((risk, i) => (
                            <div key={i} className={`${styles.guardianRisk} ${styles[`risk_${risk.severity}`]}`}>
                              <span className={styles.riskSeverity}>{risk.severity}</span>
                              <span className={styles.riskType}>{risk.type}</span>
                              <span className={styles.riskDesc}>{risk.description}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {guardianResult.aiAnalysis.suggestions.length > 0 && (
                        <div className={styles.guardianSuggestions}>
                          <h4 className={styles.guardianSubtitle}>Suggestions</h4>
                          {guardianResult.aiAnalysis.suggestions.map((sug, i) => (
                            <div key={i} className={styles.guardianSuggestion}>
                              <p>{sug.description}</p>
                              <small>{sug.reasoning}</small>
                            </div>
                          ))}
                        </div>
                      )}

                      {guardianResult.validationResults.filter(r => !r.passed).length > 0 && (
                        <div className={styles.guardianValidations}>
                          <h4 className={styles.guardianSubtitle}>Failed Checks</h4>
                          {guardianResult.validationResults.filter(r => !r.passed).map((v, i) => (
                            <div key={i} className={`${styles.guardianValidation} ${styles[`risk_${v.severity}`]}`}>
                              <span className={styles.riskSeverity}>{v.severity}</span>
                              <span>{v.message}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Override section for blocked/approval-required edits */}
                      {(guardianResult.overallAction === 'block' || guardianResult.requiresApproval) && (
                        <div className={styles.guardianOverride}>
                          <h4 className={styles.guardianSubtitle}>Override Guardian</h4>
                          <textarea
                            className={styles.overrideInput}
                            placeholder="Provide a reason for overriding this decision..."
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            rows={2}
                          />
                          <div className={styles.guardianActions}>
                            <button onClick={handleDismissGuardian} className={styles.cancelButton}>
                              Cancel Edit
                            </button>
                            <button
                              onClick={handleForceOverride}
                              disabled={!overrideReason.trim() || saving}
                              className={styles.overrideButton}
                            >
                              <ShieldAlert size={14} />
                              {saving ? 'Saving...' : 'Override & Save'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Dismiss for non-blocking results */}
                      {guardianResult.overallAction !== 'block' && !guardianResult.requiresApproval && (
                        <div className={styles.guardianActions}>
                          <button onClick={handleDismissGuardian} className={styles.cancelButton}>
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className={styles.editorContent}>
                {/* Basic Fields */}
                <div className={styles.formSection}>
                  <h3 className={styles.sectionTitle}>Basic Information</h3>
                  
                  <div className={styles.formField}>
                    <label className={styles.label}>Name</label>
                    <input
                      type="text"
                      value={editedConcept.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>Tier</label>
                    <select
                      value={editedConcept.tier}
                      onChange={(e) => handleFieldChange('tier', e.target.value)}
                      className={styles.select}
                    >
                      <option value="trunk">Trunk</option>
                      <option value="branch">Branch</option>
                      <option value="leaf">Leaf</option>
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>Parent</label>
                    <input
                      type="text"
                      value={editedConcept.parentName || ''}
                      onChange={(e) => handleFieldChange('parentName', e.target.value)}
                      className={styles.input}
                      placeholder="Parent concept name"
                    />
                  </div>
                </div>

                {/* Explanation */}
                <div className={styles.formSection}>
                  <h3 className={styles.sectionTitle}>Explanation</h3>
                  <textarea
                    value={(editedConcept as any).explanation || ''}
                    onChange={(e) => handleFieldChange('explanation' as any, e.target.value)}
                    className={styles.textarea}
                    rows={8}
                    placeholder="Concept explanation..."
                  />
                </div>

                {/* TRACES */}
                <div className={styles.formSection}>
                  <h3 className={styles.sectionTitle}>TRACES Connections</h3>
                  <div className={styles.tracesInfo}>
                    <p className={styles.infoText}>
                      TRACES editing coming soon. Use the audit system to automatically fix connection issues.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
