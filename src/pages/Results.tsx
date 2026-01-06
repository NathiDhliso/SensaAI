import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Copy, CheckCircle2, BookOpen, Save, FolderDown, AlertTriangle, Zap } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useGenerationStore } from '@/store/generation-store';
import { LifecycleNavigator } from '@/components/learning';
import { storageManager, type SavedResult } from '@/lib/storage';
import { useParseAndLoadContent } from '@/lib/content-loader';
import { QUALITY_THRESHOLDS, UI_TIMINGS } from '@/constants/ui-constants';
import styles from './Results.module.css';

export default function Results() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);
  const [loadingLearn, setLoadingLearn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

            {/* Velocity Learning - SensaAI Learning Engine */}
            <button
              onClick={() => navigate(`/velocity/${loadedResult?.id || id || 'current'}`)}
              className={styles.velocityButton}
            >
              <Zap className={styles.buttonIcon} />
              Velocity Learning
            </button>


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

              {/* Concepts List */}
              <div className={styles.conceptsList}>
                {displayPass1Data.concepts.slice(0, 8).map((concept, idx) => (
                  <span key={idx} className={styles.conceptTag}>
                    <span className={styles.conceptTagIcon}>💡</span>
                    {concept}
                  </span>
                ))}
                {displayPass1Data.concepts.length > 8 && (
                  <span className={styles.conceptTag}>
                    +{displayPass1Data.concepts.length - 8} more
                  </span>
                )}
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



          <div className={styles.contentCard}>
            <h2 className={styles.sectionTitle}>Generated Content</h2>
            <pre className={styles.contentPre}>{displayDocument}</pre>
          </div>
        </main>
      </div>


    </div>
  );
}
