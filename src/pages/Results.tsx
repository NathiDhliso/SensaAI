import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Copy, CheckCircle2, BookOpen, Save, FolderDown, Map, Plus, Network, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useGenerationStore } from '@/store/generation-store';
import { usePalaceStore } from '@/store/palace-store';
import { parseGeneratedContent } from '@/lib/content-adapter';
import { transformGeneratedContent } from '@/lib/content-adapter/transformer';
import { useParseAndLoadContent } from '@/lib/content-loader';
import { storageManager } from '@/lib/storage';
import type { SavedResult } from '@/lib/storage';
import { QUALITY_THRESHOLDS, UI_TIMINGS } from '@/constants/ui-constants';
import { RouteBuilder, GraphView, IntegratedLegend, ConceptInspector } from '@/components/palace';
import { LifecycleNavigator } from '@/components/learning';
import type { RouteBuilding } from '@/lib/types/palace';
import styles from './Results.module.css';

export default function Results() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);
  const [loadingLearn, setLoadingLearn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showRouteBuilder, setShowRouteBuilder] = useState(false);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [loadedResult, setLoadedResult] = useState<SavedResult | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fullDocument, validation, pass1Data, currentSubject } = useGenerationStore();

  // Load from storage if in-memory state is not available
  useEffect(() => {
    if (!fullDocument && id) {
      setIsLoadingResult(true);
      storageManager.loadResult(id).then(result => {
        if (result) {
          setLoadedResult(result);
        }
        setIsLoadingResult(false);
      });
    }
  }, [fullDocument, id]);

  // Use in-memory state or fallback to loaded result
  const displayDocument = fullDocument || loadedResult?.fullDocument || null;
  const displayValidation = validation || loadedResult?.validation || null;
  const displayPass1Data = useMemo(() => {
    if (pass1Data) return pass1Data;
    if (loadedResult?.pass1Data) {
      return {
        ...loadedResult.pass1Data,
        lifecycle: loadedResult.pass1Data.lifecycle
      };
    }
    return null;
  }, [pass1Data, loadedResult?.pass1Data]);
  const displaySubject = currentSubject || loadedResult?.subject || null;
  const parseAndLoad = useParseAndLoadContent();

  // Compute dependency graph for preview (memoized)
  const graphData = useMemo(() => {
    if (!displayDocument || !displayPass1Data) return null;

    try {
      const parseResult = parseGeneratedContent(displayDocument);
      if (!parseResult.success) return null;

      const transformed = transformGeneratedContent(parseResult.data, displayPass1Data.domain);

      // Only return if we have valid graph data
      if (transformed.dependencyGraph && transformed.concepts.length > 0) {
        return {
          graph: transformed.dependencyGraph,
          concepts: transformed.concepts,
        };
      }
    } catch (e) {
      console.warn('Failed to compute graph preview:', e);
    }
    return null;
  }, [displayDocument, displayPass1Data]);

  const handleCopy = async () => {
    if (displayDocument) {
      await navigator.clipboard.writeText(displayDocument);
      setCopied(true);
      setTimeout(() => setCopied(false), UI_TIMINGS.TOAST_SHORT);
    }
  };

  const handleDownload = () => {
    if (displayDocument && displaySubject) {
      const blob = new Blob([displayDocument], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${displaySubject.replace(/[^a-z0-9]/gi, '_')}_master_chart.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleStartLearning = () => {
    if (!displayDocument) return;

    setLoadingLearn(true);
    const result = parseAndLoad(displayDocument);

    if (!result.success) {
      alert(`Failed to load content: ${result.error}`);
      setLoadingLearn(false);
      return;
    }

    // Navigate to unified Study Command Center with subject ID
    // Use the loaded result id or current params id, fallback to 'current' for fresh generations
    const subjectId = loadedResult?.id || id || 'current';
    navigate(`/study/${subjectId}`);
  };

  const handleSaveResult = async () => {
    if (!displayDocument || !displaySubject || !displayPass1Data || !displayValidation) return;

    setSaving(true);
    try {
      const savedResult: SavedResult = {
        id: loadedResult?.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        subject: displaySubject,
        generatedAt: loadedResult?.generatedAt || new Date().toISOString(),
        fullDocument: displayDocument,
        pass1Data: {
          domain: displayPass1Data.domain,
          roleScope: displayPass1Data.roleScope,
          lifecycle: displayPass1Data.lifecycle,
          concepts: displayPass1Data.concepts,
        },
        validation: {
          lifecycleConsistency: displayValidation.lifecycleConsistency,
          positiveFraming: displayValidation.positiveFraming,
          formatConsistency: displayValidation.formatConsistency,
          completeness: displayValidation.completeness,
        },
        savedLocally: true,
      };

      const result = await storageManager.saveResult(savedResult);

      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), UI_TIMINGS.TOAST_MEDIUM);
      }
    } catch (error) {
      console.error('Failed to save result:', error);
      setError('Failed to save result. Please try again.');
      setTimeout(() => setError(null), UI_TIMINGS.TOAST_LONG);
    } finally {
      setSaving(false);
    }
  };

  const getMetricStatus = (value: number, threshold: number) => {
    return value >= threshold ? 'good' : 'warning';
  };

  const { createPalace, createCustomPalace } = usePalaceStore();

  const handleCreatePalace = () => {
    if (!displayDocument || !displayPass1Data) return;

    // Use transformer to generate layouts (Freeze & Bake)
    const parseResult = parseGeneratedContent(displayDocument);
    if (!parseResult.success) {
      setError(`Failed to parse content: ${parseResult.error}`);
      setTimeout(() => setError(null), UI_TIMINGS.TOAST_LONG);
      return;
    }

    // Generate Graph & Layout
    const transformed = transformGeneratedContent(parseResult.data, displayPass1Data.domain);
    const { stages, floorPlan, dependencyGraph } = transformed;

    if (!stages || stages.length === 0) {
      setError('No stages generated in content. Cannot create palace.');
      setTimeout(() => setError(null), UI_TIMINGS.TOAST_LONG);
      return;
    }

    // Helper to map transformed concepts to palace structure
    const mappedStages = stages.map(stage => ({
      id: stage.id,
      name: stage.name,
      concepts: transformed.concepts.filter(c => c.stageId === stage.id).map(c => ({
        id: c.id,
        name: c.name,
        lifecycle: c.lifecycle ? {
          phase1: c.lifecycle.phase1.steps,
          phase2: c.lifecycle.phase2.steps,
          phase3: c.lifecycle.phase3.steps
        } : { phase1: [], phase2: [], phase3: [] },
        mnemonic: c.mnemonic
      }))
    }));

    // Pass lifecycle labels from the generation results
    const lifecycleLabels = displayPass1Data.lifecycle ? {
      phase1: displayPass1Data.lifecycle.phase1,
      phase2: displayPass1Data.lifecycle.phase2,
      phase3: displayPass1Data.lifecycle.phase3,
    } : undefined;

    // Pass floorPlan and dependencyGraph to bake them into the palace
    createPalace(displaySubject || 'study', 'tech-campus', mappedStages, lifecycleLabels, floorPlan, dependencyGraph);
    navigate('/study/current?tab=palace');
  };

  const getPalaceStages = () => {
    if (!displayDocument || !displayPass1Data) return null;
    const parseResult = parseGeneratedContent(displayDocument);
    if (!parseResult.success) return null;

    const { learningPath, concepts } = parseResult.data;
    if (concepts.length === 0) return null;

    const numBuildings = Math.min(7, Math.max(learningPath.stages.length, 1));
    const conceptsPerBuilding = Math.ceil(concepts.length / numBuildings);

    return Array.from({ length: numBuildings }, (_, idx) => {
      const stageName = learningPath.stages[idx]?.name || `Stage ${idx + 1}`;
      const stageOrder = learningPath.stages[idx]?.order || idx + 1;

      const startIdx = idx * conceptsPerBuilding;
      const endIdx = Math.min(startIdx + conceptsPerBuilding, concepts.length);
      const buildingConcepts = concepts.slice(startIdx, endIdx);

      return {
        id: `stage-${stageOrder}`,
        name: stageName,
        concepts: buildingConcepts.map(concept => ({
          id: concept.id,
          name: concept.name,
          lifecycle: {
            phase1: [
              concept.phase1.prerequisite,
              ...concept.phase1.selection,
              concept.phase1.execution,
            ].filter(Boolean),
            phase2: concept.phase2 || [],
            phase3: [
              concept.phase3.tool,
              ...concept.phase3.metrics,
              concept.phase3.thresholds,
            ].filter(Boolean),
          },
          // Include mnemonic data for Memory Palace scavenger hunt experience
          mnemonic: concept.mnemonic ? {
            anchor: concept.mnemonic.anchor,
            story: concept.mnemonic.story,
            tier: concept.mnemonic.tier,
            parentName: concept.mnemonic.parentName,
            parentId: concept.mnemonic.parentId,
          } : undefined,
        })),
      };
    });
  };

  const handleCreateCustomPalace = (routeName: string, buildings: RouteBuilding[]) => {
    const stages = getPalaceStages();
    if (!stages) return;

    createCustomPalace(displaySubject || 'study', routeName, buildings, stages);
    setShowRouteBuilder(false);
    navigate('/study/current?tab=palace');
  };

  // Show loading state when fetching from storage
  if (isLoadingResult) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.emptyState}>
            <div className="loading-spinner" />
            <p>Loading saved result...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!displayDocument) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.emptyState}>
            <p>No results available. Generate a chart first.</p>
            <button onClick={() => navigate('/')} className={styles.primaryButton}>
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header Row */}
      <header className={styles.header}>
        <button onClick={() => navigate('/')} className={styles.backButton}>
          <ArrowLeft className={styles.backIcon} />
          Back
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Generation Complete</h1>
          <span className={styles.subtitle}>{displaySubject}</span>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="mx-8 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      )}

      {/* Lifecycle Navigator - Preview of the learning journey phases */}
      {displayPass1Data?.lifecycle && (
        <LifecycleNavigator
          labels={{
            phase1: displayPass1Data.lifecycle.phase1,
            phase2: displayPass1Data.lifecycle.phase2,
            phase3: displayPass1Data.lifecycle.phase3,
          }}
          progress={{
            phase1: { total: Math.ceil(displayPass1Data.concepts.length / 3), completed: 0 },
            phase2: { total: Math.ceil(displayPass1Data.concepts.length / 3), completed: 0 },
            phase3: { total: Math.ceil(displayPass1Data.concepts.length / 3), completed: 0 },
          }}
          compact
        />
      )}

      {/* Dashboard Layout */}
      <div className={styles.mainLayout}>
        {/* Sidebar - Metrics & Actions */}
        <aside className={styles.sidebar}>
          {/* Action Buttons */}
          <div className={styles.actionSection}>
            <button
              onClick={handleStartLearning}
              className={styles.learnButton}
              disabled={loadingLearn}
            >
              <BookOpen className={styles.buttonIcon} />
              {loadingLearn ? 'Loading...' : 'Start Learning'}
            </button>



            {/* Memory Palace Actions - consolidated from 3 buttons to 2 */}
            <div className={styles.palaceActionGroup}>
              <button
                onClick={handleCreatePalace}
                className={styles.palaceButton}
              >
                <Map className={styles.buttonIcon} />
                Enter Memory Palace
              </button>
              <button
                onClick={() => setShowRouteBuilder(true)}
                className={styles.customPalaceButton}
              >
                <Plus className={styles.buttonIcon} />
                Build Custom Route
              </button>
            </div>
            <button
              onClick={handleSaveResult}
              className={styles.saveButton}
              disabled={saving || saved}
            >
              {saved ? (
                <>
                  <CheckCircle2 className={styles.buttonIcon} />
                  Saved
                </>
              ) : (
                <>
                  <Save className={styles.buttonIcon} />
                  {saving ? 'Saving...' : 'Save Result'}
                </>
              )}
            </button>
            <div className={styles.actionRow}>
              <button onClick={handleCopy} className={styles.secondaryButton}>
                {copied ? <CheckCircle2 className={styles.buttonIcon} /> : <Copy className={styles.buttonIcon} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={handleDownload} className={styles.secondaryButton}>
                <Download className={styles.buttonIcon} />
                Download
              </button>
            </div>
          </div>

          {saved && (
            <div className={styles.saveHint}>
              <FolderDown className={styles.hintIcon} />
              <span>Saved to Downloads</span>
            </div>
          )}

          {/* Quality Metrics */}
          {displayValidation && (
            <div className={styles.metricsSection}>
              <h2 className={styles.sectionTitle}>Quality Metrics</h2>
              <div className={styles.metricsGrid}>
                <div className={`${styles.metricItem} ${getMetricStatus(displayValidation.lifecycleConsistency, QUALITY_THRESHOLDS.lifecycleConsistency) === 'good' ? styles.metricGood : styles.metricWarning}`}>
                  <span className={styles.metricLabel}>Lifecycle</span>
                  <span className={styles.metricValue}>{displayValidation.lifecycleConsistency}%</span>
                </div>
                <div className={`${styles.metricItem} ${getMetricStatus(displayValidation.positiveFraming, QUALITY_THRESHOLDS.positiveFraming) === 'good' ? styles.metricGood : styles.metricWarning}`}>
                  <span className={styles.metricLabel}>Framing</span>
                  <span className={styles.metricValue}>{displayValidation.positiveFraming}%</span>
                </div>
                <div className={`${styles.metricItem} ${getMetricStatus(displayValidation.formatConsistency, QUALITY_THRESHOLDS.formatConsistency) === 'good' ? styles.metricGood : styles.metricWarning}`}>
                  <span className={styles.metricLabel}>Format</span>
                  <span className={styles.metricValue}>{displayValidation.formatConsistency}%</span>
                </div>
                <div className={`${styles.metricItem} ${getMetricStatus(displayValidation.completeness, QUALITY_THRESHOLDS.completeness) === 'good' ? styles.metricGood : styles.metricWarning}`}>
                  <span className={styles.metricLabel}>Complete</span>
                  <span className={styles.metricValue}>{displayValidation.completeness}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Domain Analysis */}
          {displayPass1Data && (
            <div className={styles.detailsSection}>
              <h2 className={styles.sectionTitle}>Domain Analysis</h2>
              <div className={styles.detailsList}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Domain</span>
                  <span className={styles.detailValue}>{displayPass1Data.domain}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Role</span>
                  <span className={styles.detailValue}>{displayPass1Data.roleScope}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Lifecycle</span>
                  <span className={styles.detailValue}>
                    {displayPass1Data.lifecycle.phase1} → {displayPass1Data.lifecycle.phase2} → {displayPass1Data.lifecycle.phase3}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Concepts</span>
                  <span className={styles.detailValue}>{displayPass1Data.concepts.length} core</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Content Panel */}
        <main className={styles.contentPanel}>
          {displayPass1Data && (
            <div className={styles.conceptOverview}>
              <div className={styles.overviewHeader}>
                <div className={styles.overviewTitle}>
                  🎯 Learning Roadmap
                </div>
                <span className={styles.overviewCount}>
                  {displayPass1Data.concepts.length} concepts
                </span>
              </div>

              <div className={styles.quickStats}>
                <div className={styles.quickStat}>
                  <span className={styles.quickStatValue}>{displayPass1Data.concepts.length}</span>
                  <span className={styles.quickStatLabel}>Core Concepts</span>
                </div>
                <div className={styles.quickStat}>
                  <span className={styles.quickStatValue}>3</span>
                  <span className={styles.quickStatLabel}>Lifecycle Phases</span>
                </div>
                <div className={styles.quickStat}>
                  <span className={styles.quickStatValue}>~{Math.ceil(displayPass1Data.concepts.length * 5)}</span>
                  <span className={styles.quickStatLabel}>Est. Minutes</span>
                </div>
              </div>

              {/* Concept List - Simple Overview */}
              <div className={styles.conceptsList}>
                {displayPass1Data.concepts.map((concept, idx) => (
                  <span key={idx} className={styles.conceptTag}>
                    <span className={styles.conceptTagIcon}>💡</span>
                    {concept}
                  </span>
                ))}
              </div>

              <div className={styles.lifecycleFlow}>
                <span className={styles.lifecycleStep}>
                  <span>📋</span> {displayPass1Data.lifecycle.phase1}
                </span>
                <span className={styles.lifecycleArrow}>→</span>
                <span className={styles.lifecycleStep}>
                  <span>⚙️</span> {displayPass1Data.lifecycle.phase2}
                </span>
                <span className={styles.lifecycleArrow}>→</span>
                <span className={styles.lifecycleStep}>
                  <span>📊</span> {displayPass1Data.lifecycle.phase3}
                </span>
              </div>
            </div>
          )}

          {/* Dependency Graph Preview - Visual understanding of concept relationships */}
          {graphData && (
            <div className={styles.graphPreviewCard}>
              <div className={styles.graphHeader}>
                <div className={styles.graphTitle}>
                  <Network size={20} />
                  <span>Concept Network</span>
                </div>
                <div className="px-6 mb-4">
                  <IntegratedLegend lifecycle={displayPass1Data?.lifecycle ? {
                    phase1: displayPass1Data.lifecycle.phase1,
                    phase2: displayPass1Data.lifecycle.phase2,
                    phase3: displayPass1Data.lifecycle.phase3
                  } : undefined} />
                </div>
              </div>

              <div className={styles.graphContainer}>
                <GraphView
                  graph={graphData.graph}
                  concepts={graphData.concepts}
                  width={600}
                  height={350}
                  onNodeClick={(id) => {
                    setSelectedConceptId(id);
                  }}
                  selectedConceptId={selectedConceptId || undefined}
                />
              </div>
              <p className={styles.graphHint}>
                Select any node to reveal its Universal Lifecycle.
              </p>
            </div>
          )}

          {/* Concept Inspector - The "Silver Bullet" integration point */}
          {selectedConceptId && graphData && (() => {
            const concept = graphData.concepts.find(c => c.id === selectedConceptId);
            const node = graphData.graph.nodes.find(n => n.id === selectedConceptId);

            if (concept && node) {
              return (
                <div className="mb-6 animate-in slide-in-from-top-4 duration-300">
                  <ConceptInspector
                    concept={concept}
                    tier={node.metrics.calculatedTier}
                    onClose={() => setSelectedConceptId(null)}
                  />
                </div>
              );
            }
            return null;
          })()}

          <div className={styles.contentCard}>
            <h2 className={styles.sectionTitle}>Generated Content</h2>
            <pre className={styles.contentPre}>{displayDocument}</pre>
          </div>
        </main>
      </div>

      {/* Route Builder Modal */}
      <RouteBuilder
        isOpen={showRouteBuilder}
        onClose={() => setShowRouteBuilder(false)}
        onSave={handleCreateCustomPalace}
      />
    </div>
  );
}
