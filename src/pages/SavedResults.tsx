import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Download, BookOpen, Cloud, HardDrive, Upload, Search, Eye, X, Sparkles, Target, GraduationCap, FileJson } from 'lucide-react';
import { storageManager, importFromFile } from '@/lib/storage';
import { localFileStorage } from '@/lib/storage';
import type { SavedResult } from '@/lib/storage';
import { useParseAndLoadContent } from '@/lib/content-loader';
import { UI_TIMINGS } from '@/constants/ui-constants';
import styles from './SavedResults.module.css';

export default function SavedResults() {
  const navigate = useNavigate();
  const [results, setResults] = useState<SavedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'subject' | 'quality'>('date');
  const [previewResult, setPreviewResult] = useState<SavedResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parseAndLoad = useParseAndLoadContent();

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const savedResults = await storageManager.listResults();
      setResults(savedResults);
    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this result?')) return;

    setDeletingId(id);
    try {
      await storageManager.deleteResult(id);
      setResults(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to delete result:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadText = (result: SavedResult) => {
    localFileStorage.downloadTextFile(result);
  };

  const handleDownloadBackup = (result: SavedResult) => {
    localFileStorage.downloadAsJSON(result);
  };

  const handlePreviewLearning = (result: SavedResult) => {
    setPreviewResult(result);
  };

  const handleConfirmLearning = () => {
    if (!previewResult) return;
    
    const parseResult = parseAndLoad(previewResult.fullDocument);

    if (!parseResult.success) {
      alert(`Failed to load content: ${parseResult.error}`);
      setPreviewResult(null);
      return;
    }

    setPreviewResult(null);
    navigate('/learn');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const filteredResults = useMemo(() => {
    let filtered = results;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.subject.toLowerCase().includes(query) ||
        r.pass1Data.domain.toLowerCase().includes(query) ||
        r.pass1Data.roleScope.toLowerCase().includes(query)
      );
    }

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
        case 'subject':
          return a.subject.localeCompare(b.subject);
        case 'quality':
          return b.validation.completeness - a.validation.completeness;
        default:
          return 0;
      }
    });

    return filtered;
  }, [results, searchQuery, sortBy]);

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);

    try {
      const importResult = await importFromFile(file);

      if (importResult.success && importResult.result) {
        await storageManager.saveResult(importResult.result);
        await loadResults();
      } else {
        setImportError(importResult.error || 'Failed to import file');
        setTimeout(() => setImportError(null), UI_TIMINGS.TOAST_LONG);
      }
    } catch {
      setImportError('Failed to import file');
      setTimeout(() => setImportError(null), UI_TIMINGS.TOAST_LONG);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getQualityColor = (value: number): string => {
    if (value >= 90) return styles.qualityExcellent;
    if (value >= 80) return styles.qualityGood;
    if (value >= 70) return styles.qualityFair;
    return styles.qualityPoor;
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <button onClick={() => navigate('/')} className={styles.backButton}>
          <ArrowLeft className={styles.backIcon} />
          Back to Home
        </button>

        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Saved Results</h1>
            <p className={styles.subtitle}>
              {filteredResults.length} of {results.length} {results.length === 1 ? 'result' : 'results'}
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              onClick={handleImportClick}
              className={styles.importButton}
              disabled={importing}
            >
              <Upload size={16} />
              {importing ? 'Importing...' : 'Import File'}
            </button>
            {storageManager.isCloudEnabled() ? (
              <div className={styles.cloudBadge}>
                <Cloud size={16} />
                Cloud Sync Enabled
              </div>
            ) : (
              <div className={styles.localHint}>
                <HardDrive size={14} />
                Files saved to Downloads folder
              </div>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />

        {importError && (
          <div className={styles.errorBanner}>
            {importError}
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className={styles.filterBar}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by subject, domain, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'subject' | 'quality')}
              className={styles.sortSelect}
            >
              <option value="date">Sort by Date</option>
              <option value="subject">Sort by Subject</option>
              <option value="quality">Sort by Quality</option>
            </select>
          </div>
        )}

        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading saved results...</p>
          </div>
        ) : results.length === 0 ? (
          <div className={styles.emptyState}>
            <HardDrive size={48} className={styles.emptyIcon} />
            <h2>No saved results yet</h2>
            <p>Generate and save your first chart to see it here</p>
            <button onClick={() => navigate('/')} className={styles.primaryButton}>
              Generate Chart
            </button>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className={styles.emptyState}>
            <Search size={48} className={styles.emptyIcon} />
            <h2>No results match "{searchQuery}"</h2>
            <p>Try a different search term or clear the filter</p>
            <button onClick={() => setSearchQuery('')} className={styles.primaryButton}>
              Clear Search
            </button>
          </div>
        ) : (
          <div className={styles.resultsGrid}>
            {filteredResults.map((result) => (
              <div key={result.id} className={styles.resultCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>{result.subject}</h3>
                    <p className={styles.cardDate}>{formatDate(result.generatedAt)}</p>
                  </div>
                  <div className={styles.storageBadges}>
                    {result.savedLocally && (
                      <span className={styles.localBadge} title="Saved locally">
                        <HardDrive size={14} />
                      </span>
                    )}
                    {result.savedToCloud && (
                      <span className={styles.cloudBadge} title="Saved to cloud">
                        <Cloud size={14} />
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.cardContent}>
                  <div className={styles.metaInfo}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Domain</span>
                      <span className={styles.metaValue}>{result.pass1Data.domain}</span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Concepts</span>
                      <span className={styles.metaValue}>{result.pass1Data.concepts.length}</span>
                    </div>
                  </div>

                  <div className={styles.qualityMetrics}>
                    <div className={styles.metricBadge}>
                      <span className={styles.metricLabel}>Quality</span>
                      <span className={`${styles.metricValue} ${getQualityColor(result.validation.completeness)}`}>
                        {result.validation.completeness}%
                      </span>
                    </div>
                    <div className={styles.metricBadge}>
                      <span className={styles.metricLabel}>Lifecycle</span>
                      <span className={`${styles.metricValue} ${getQualityColor(result.validation.lifecycleConsistency)}`}>
                        {result.validation.lifecycleConsistency}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <button
                    onClick={() => navigate(`/results/${result.id}`)}
                    className={styles.viewButton}
                    title="View full result"
                  >
                    <Eye size={16} />
                    View
                  </button>
                  <button
                    onClick={() => handlePreviewLearning(result)}
                    className={styles.learnButton}
                    title="Start learning"
                  >
                    <BookOpen size={16} />
                    Learn
                  </button>
                  <button
                    onClick={() => handleDownloadText(result)}
                    className={styles.downloadButton}
                    title="Download as text file"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => handleDownloadBackup(result)}
                    className={styles.backupButton}
                    title="Download backup (JSON) - can be re-imported later"
                  >
                    <FileJson size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(result.id)}
                    className={styles.deleteButton}
                    disabled={deletingId === result.id}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Learning Preview Modal */}
        {previewResult && (
          <div className={styles.previewOverlay} onClick={() => setPreviewResult(null)}>
            <div className={styles.previewModal} onClick={e => e.stopPropagation()}>
              <button 
                className={styles.previewCloseButton} 
                onClick={() => setPreviewResult(null)}
              >
                <X size={20} />
              </button>
              
              <div className={styles.previewHeader}>
                <Sparkles className={styles.previewIcon} />
                <h2>{previewResult.subject}</h2>
                <p className={styles.previewDomain}>{previewResult.pass1Data.domain}</p>
              </div>

              <div className={styles.previewStats}>
                <div className={styles.previewStat}>
                  <Target className={styles.previewStatIcon} />
                  <span className={styles.previewStatValue}>{previewResult.pass1Data.concepts.length}</span>
                  <span className={styles.previewStatLabel}>Concepts</span>
                </div>
                <div className={styles.previewStat}>
                  <GraduationCap className={styles.previewStatIcon} />
                  <span className={styles.previewStatValue}>~{Math.ceil(previewResult.pass1Data.concepts.length * 3)}</span>
                  <span className={styles.previewStatLabel}>Min Est.</span>
                </div>
              </div>

              <div className={styles.previewConceptList}>
                <h4>Concepts you'll learn:</h4>
                <ul>
                  {previewResult.pass1Data.concepts.slice(0, 5).map((concept, i) => (
                    <li key={i}>{concept}</li>
                  ))}
                  {previewResult.pass1Data.concepts.length > 5 && (
                    <li className={styles.previewMore}>
                      +{previewResult.pass1Data.concepts.length - 5} more
                    </li>
                  )}
                </ul>
              </div>

              <div className={styles.previewActions}>
                <button 
                  className={styles.previewCancelButton}
                  onClick={() => setPreviewResult(null)}
                >
                  Cancel
                </button>
                <button 
                  className={styles.previewStartButton}
                  onClick={handleConfirmLearning}
                >
                  <BookOpen size={18} />
                  Start Learning
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
