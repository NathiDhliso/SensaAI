/**
 * Content Editor - Edit and manage learning concepts
 * Allows curators to manually edit concept content, TRACES, and metadata
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, X, ArrowLeft, AlertCircle } from 'lucide-react';
import type { ParsedConcept } from '@/features/content-generation/parsers/types';
import { conceptsApi } from '@/shared/api/concepts';
import { useAuthStore } from '@/store/auth-store';
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
    } catch (error) {
      logger.error('Failed to save:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
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
                    disabled={!hasChanges || saving}
                    className={styles.saveButton}
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

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
