/**
 * Curator Preview - Content Preview with Management Tools
 * Shows content as learners see it, plus curator-specific actions
 * and integrated CLM enhancement panels
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2, AlertTriangle, CheckCircle, ExternalLink, ArrowLeft,
  Heart, GitCompare, RefreshCw, MessageSquare, Link2, DollarSign } from 'lucide-react';
import { conceptsApi } from '@/shared/api/concepts';
import { useAuthStore } from '@/store/auth-store';
import type { ParsedConcept } from '@/features/content-generation/parsers/types';
import styles from './CuratorPreview.module.css';
import { logger } from '@/shared/utils/logger';

// Lazy-load enhancement panels (only loaded when tab is active)
const GenerationHealthMonitor = lazy(() => import('../components/GenerationHealthMonitor').then(m => ({ default: m.GenerationHealthMonitor })));
const ComparativeAnalysisAuditor = lazy(() => import('../components/ComparativeAnalysisAuditor').then(m => ({ default: m.ComparativeAnalysisAuditor })));
const SmartRegenerationRecommender = lazy(() => import('../components/SmartRegenerationRecommender').then(m => ({ default: m.SmartRegenerationRecommender })));
const LearnerFeedbackPanel = lazy(() => import('../components/LearnerFeedbackPanel').then(m => ({ default: m.LearnerFeedbackPanel })));
const DependencyImpactAnalyzer = lazy(() => import('../components/DependencyImpactAnalyzer').then(m => ({ default: m.DependencyImpactAnalyzer })));
const CostOptimizationAnalyzer = lazy(() => import('../components/CostOptimizationAnalyzer').then(m => ({ default: m.CostOptimizationAnalyzer })));

const ENHANCEMENT_TABS = [
  { id: 'health', label: 'Health', icon: Heart },
  { id: 'compare', label: 'Compare', icon: GitCompare },
  { id: 'regeneration', label: 'Regen', icon: RefreshCw },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'dependencies', label: 'Dependencies', icon: Link2 },
  { id: 'costs', label: 'Costs', icon: DollarSign },
] as const;

type EnhancementTab = typeof ENHANCEMENT_TABS[number]['id'];

export default function CuratorPreview() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [concepts, setConcepts] = useState<ParsedConcept[]>([]);
  const [conceptCount, setConceptCount] = useState(0);
  const [showActions, setShowActions] = useState(true);
  const [activeEnhancement, setActiveEnhancement] = useState<EnhancementTab | null>(null);

  useEffect(() => {
    if (subjectId) {
      loadContent();
    }
  }, [subjectId]);

  const loadContent = async () => {
    if (!subjectId || !user?.id) return;
    
    setLoading(true);
    try {
      const response = await conceptsApi.getPublicContent(user.id, subjectId);
      setSubject(response.subject);
      setConcepts(response.concepts);
      setConceptCount(response.conceptCount);
    } catch (error) {
      logger.error('Failed to load content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAsLearner = () => {
    navigate(`/launchpad/${subjectId}`, { state: { ownerId: user?.id } });
  };

  const handleEdit = () => {
    // Navigate to edit interface with concept data
    navigate(`/curator/edit/${subjectId}`, {
      state: {
        subject,
        concepts,
        conceptCount
      }
    });
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${subject}"? This cannot be undone.`)) return;
    
    try {
      if (user?.id) {
        await conceptsApi.deleteJob(subjectId!, user.id);
        navigate('/curator/library');
      }
    } catch (error) {
      logger.error('Failed to delete:', error);
    }
  };

  const handleRunAudit = async () => {
    if (!subjectId || !user?.id) return;
    
    try {
      // Trigger audit via CLM API
      const { clmApi } = await import('@/features/clm/api/clm-client');
      await clmApi.triggerAudit({
        subject,
        auditTypes: ['schema', 'content', 'coverage', 'quality'],
        priority: 'high'
      });
      
      // Navigate to audit queue to see results
      navigate('/curator/audits');
    } catch (error) {
      logger.error('Failed to trigger audit:', error);
    }
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
      {/* Curator Toolbar */}
      <div className={styles.toolbar}>
        <button onClick={() => navigate('/curator/library')} className={styles.backButton}>
          <ArrowLeft size={16} />
          Back to Library
        </button>

        <div className={styles.toolbarActions}>
          <button onClick={() => setShowActions(!showActions)} className={styles.toggleButton}>
            <Eye size={16} />
            {showActions ? 'Hide' : 'Show'} Tools
          </button>
        </div>
      </div>

      {/* Curator Actions Panel */}
      {showActions && (
        <div className={styles.actionsPanel}>
          <div className={styles.actionsPanelHeader}>
            <h3 className={styles.actionsPanelTitle}>Curator Actions</h3>
            <span className={styles.actionsPanelBadge}>Preview Mode</span>
          </div>

          <div className={styles.actionsGrid}>
            <button onClick={handleViewAsLearner} className={styles.actionCard}>
              <ExternalLink size={20} />
              <div className={styles.actionCardContent}>
                <span className={styles.actionCardTitle}>View as Learner</span>
                <span className={styles.actionCardDesc}>See the learner experience</span>
              </div>
            </button>

            <button onClick={handleEdit} className={styles.actionCard}>
              <Edit size={20} />
              <div className={styles.actionCardContent}>
                <span className={styles.actionCardTitle}>Edit Content</span>
                <span className={styles.actionCardDesc}>Modify concepts and structure</span>
              </div>
            </button>

            <button onClick={handleRunAudit} className={styles.actionCard}>
              <AlertTriangle size={20} />
              <div className={styles.actionCardContent}>
                <span className={styles.actionCardTitle}>Run Audit</span>
                <span className={styles.actionCardDesc}>Check quality and coverage</span>
              </div>
            </button>

            <button onClick={handleDelete} className={`${styles.actionCard} ${styles.actionCardDanger}`}>
              <Trash2 size={20} />
              <div className={styles.actionCardContent}>
                <span className={styles.actionCardTitle}>Delete Content</span>
                <span className={styles.actionCardDesc}>Permanently remove</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Enhancement Tabs */}
      <div className={styles.enhancementBar}>
        {ENHANCEMENT_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`${styles.enhancementTab} ${activeEnhancement === id ? styles.enhancementTabActive : ''}`}
            onClick={() => setActiveEnhancement(activeEnhancement === id ? null : id)}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Enhancement Panel */}
      {activeEnhancement && (
        <div className={styles.enhancementPanel}>
          <Suspense fallback={<div className={styles.enhancementLoading}>Loading...</div>}>
            {activeEnhancement === 'health' && <GenerationHealthMonitor />}
            {activeEnhancement === 'compare' && <ComparativeAnalysisAuditor />}
            {activeEnhancement === 'regeneration' && <SmartRegenerationRecommender />}
            {activeEnhancement === 'feedback' && <LearnerFeedbackPanel />}
            {activeEnhancement === 'dependencies' && <DependencyImpactAnalyzer />}
            {activeEnhancement === 'costs' && <CostOptimizationAnalyzer />}
          </Suspense>
        </div>
      )}

      {/* Content Preview */}
      <div className={styles.preview}>
        <div className={styles.previewHeader}>
          <h1 className={styles.previewTitle}>{subject}</h1>
          <div className={styles.previewMeta}>
            <span className={styles.previewMetaItem}>
              <CheckCircle size={14} />
              {conceptCount} concepts
            </span>
            <span className={styles.previewMetaItem}>
              {trunks.length} trunks · {branches.length} branches · {leaves.length} leaves
            </span>
          </div>
        </div>

        {/* Concept Structure */}
        <div className={styles.structure}>
          <h2 className={styles.structureTitle}>Content Structure</h2>
          
          {trunks.map((trunk) => {
            const trunkBranches = branches.filter(b => b.parentName === trunk.name);
            
            return (
              <div key={trunk.name} className={styles.trunkSection}>
                <div className={styles.trunkHeader}>
                  <span className={styles.trunkBadge}>Trunk</span>
                  <h3 className={styles.trunkName}>{trunk.name}</h3>
                </div>

                <div className={styles.branchList}>
                  {trunkBranches.map((branch) => {
                    const branchLeaves = leaves.filter(l => l.parentName === branch.name);
                    
                    return (
                      <div key={branch.name} className={styles.branchSection}>
                        <div className={styles.branchHeader}>
                          <span className={styles.branchBadge}>Branch</span>
                          <h4 className={styles.branchName}>{branch.name}</h4>
                          <span className={styles.leafCount}>{branchLeaves.length} leaves</span>
                        </div>

                        <div className={styles.leafList}>
                          {branchLeaves.map((leaf) => (
                            <div key={leaf.name} className={styles.leafItem}>
                              <span className={styles.leafBadge}>Leaf</span>
                              <span className={styles.leafName}>{leaf.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
