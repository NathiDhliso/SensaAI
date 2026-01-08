import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, BookOpen, Upload, Search, Eye, FileJson, Cloud } from 'lucide-react';
import { storageManager, importFromFile } from '@/lib/storage';
import type { SavedResult } from '@/lib/storage';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const allResults = await storageManager.listResults();
      setResults(allResults);
    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this result? This cannot be undone.')) return;

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

  const handleDownloadBackup = (result: SavedResult) => {
    // Create ephemeral download link
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.subject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
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
              {/* Cloud Status Indicator */}
              <div className={styles.cloudIndicator} title="Cloud Sync Active">
                <Cloud size={14} style={{ color: 'var(--color-success)' }} />
                <span>Cloud Active</span>
              </div>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'subject' | 'quality')}
              className={styles.sortSelect}
              title="Sort results"
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
            <Cloud size={48} className={styles.emptyIcon} />
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
                    onClick={() => navigate(`/launchpad/${result.id}`)}
                    className={styles.viewButton}
                    title="View analytics & readiness"
                  >
                    <Eye size={16} />
                    View
                  </button>
                  <button
                    onClick={() => navigate(`/study/${result.id}?tab=learn`)}
                    className={styles.learnButton}
                    title="Start learning"
                  >
                    <BookOpen size={16} />
                    Learn
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


      </div>
    </div>
  );
}
