import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
 Trash2,
 Search,
 BookOpen,
 Upload,
 ArrowLeft,
 Eye,
 Cloud,
 Sparkles
} from 'lucide-react';
import { storageManager, importFromFile } from '@/features/content-storage';
import type { SavedResult } from '@/features/content-storage/types';
// import type { SavedResult } from '@/features/content-storage'; // Assuming types are exported from index or specifically
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { toast } from '@/shared/utils/toast';
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
 const handleCleanupDuplicates = async () => {
 if (!confirm('This will keep only the latest version of each subject and DELETE all older duplicates. Continue?')) return;
 setLoading(true);
 let deletedCount = 0;
 try {
 // Group by normalized subject
 const groups = new Map<string, SavedResult[]>();
 results.forEach(r => {
 const key = (r.subject || 'untitled').trim().toLowerCase();
 const group = groups.get(key) || [];
 group.push(r);
 groups.set(key, group);
 });
 // Find duplicates
 const removalPromises: Promise<boolean>[] = [];
 for (const [_, group] of groups.entries()) {
 if (group.length > 1) {
 // Sort by date descending (newest first)
 group.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
 // Keep the first (newest), delete the rest
 const toDelete = group.slice(1);
 toDelete.forEach(item => {
 removalPromises.push(storageManager.deleteResult(item.id));
 });
 deletedCount += toDelete.length;
 }
 }
 if (deletedCount > 0) {
 await Promise.all(removalPromises);
 await loadResults();
 toast.success(`Cleanup complete! Removed ${deletedCount} duplicate(s).`);
 } else {
 toast.info('Your library is already clean! No duplicates found.');
 }
 } catch (err) {
 console.error('Cleanup failed:', err);
 toast.error('Failed to clean up duplicates.');
 } finally {
 setLoading(false);
 }
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
 // r.pass1Data.roleScope.toLowerCase().includes(query) // roleScope might not exist on all pass1Data versions
 (r.pass1Data as { roleScope?: string }).roleScope?.toLowerCase().includes(query)
 );
 }
 filtered = [...filtered].sort((a, b) => {
 switch (sortBy) {
 case 'date': {
 const safeTime = (d: string) => /^\d+$/.test(d) ? Number(d) : (new Date(d).getTime() || 0);
 return safeTime(b.generatedAt) - safeTime(a.generatedAt);
 }
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
 const parsed = /^\d+$/.test(dateString) ? new Date(Number(dateString)) : new Date(dateString);
 if (isNaN(parsed.getTime())) return 'Unknown';
 return parsed.toLocaleDateString('en-US', {
 year: 'numeric',
 month: 'short',
 day: 'numeric',
 hour: '2-digit',
 minute: '2-digit'
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
 onClick={handleCleanupDuplicates}
 className={styles.importButton} // reusing style for now, or create new one
 style={{ backgroundColor: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', marginRight: '0.5rem' }}
 title="Remove duplicate subjects"
 >
 <Sparkles size={16} />
 Cleanup
 </button>
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
 <h3 className={styles.cardTitle}>
 {result.subject}
 {result.alias && (
 <span style={{
 marginLeft: '0.5rem',
 fontSize: '0.7rem',
 padding: '2px 6px',
 background: 'var(--color-accent-muted)',
 borderRadius: '4px',
 fontFamily: 'monospace',
 color: 'var(--color-accent)'
 }}>
 {result.alias}
 </span>
 )}
 </h3>
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
 <span className={`${styles.metricValue} ${getQualityColor(
 Math.round(
 (result.validation.completeness * 0.3 +
 result.validation.lifecycleConsistency * 0.3 +
 result.validation.formatConsistency * 0.2 +
 result.validation.positiveFraming * 0.2)
 )
 )}`}>
 {Math.round(
 (result.validation.completeness * 0.3 +
 result.validation.lifecycleConsistency * 0.3 +
 result.validation.formatConsistency * 0.2 +
 result.validation.positiveFraming * 0.2)
 )}%
 </span>
 </div>
 <div className={styles.metricBadge}>
 <span className={styles.metricLabel}>Completeness</span>
 <span className={`${styles.metricValue} ${getQualityColor(result.validation.completeness)}`}>
 {result.validation.completeness}%
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