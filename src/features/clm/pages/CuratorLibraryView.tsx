import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    BookOpen,
    Cloud,
    Globe,
    Activity,
    GitBranch,
    RefreshCw,
    Trash2
} from 'lucide-react';
import { storageManager } from '@/features/content-storage';
import { conceptsApi } from '@/shared/api/concepts';
import { useAuthStore } from '@/store/auth-store';
import type { SavedResult } from '@/features/content-storage/types';
import { toast } from '@/shared/utils/toast';
import styles from '@/pages/MasteryDashboard.module.css';
import { logger } from '@/shared/utils/logger';

export default function CuratorLibraryView() {
    const navigate = useNavigate();
    const userId = useAuthStore(s => s.user?.id) || '';
    const [results, setResults] = useState<SavedResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'subject' | 'quality'>('date');
    const [showBroken, setShowBroken] = useState(false);

    useEffect(() => {
        loadResults();
    }, []);

    const loadResults = async () => {
        setLoading(true);
        try {
            const allResults = await storageManager.listResults();
            setResults(allResults);
        } catch (error) {
            logger.error('Failed to load results:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredResults = useMemo(() => {
        let filtered = results;

        // Separate broken (0-concept) generations
        if (!showBroken) {
            filtered = filtered.filter(r => r.pass1Data.concepts.length > 0);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(r =>
                r.subject.toLowerCase().includes(query) ||
                r.pass1Data.domain.toLowerCase().includes(query) ||
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
    }, [results, searchQuery, sortBy, showBroken]);

    const brokenCount = useMemo(
        () => results.filter(r => r.pass1Data.concepts.length === 0).length,
        [results]
    );

    const handleDeleteJob = async (result: SavedResult) => {
        if (!confirm(`Delete "${result.subject}" (${formatDate(result.generatedAt)})? This cannot be undone.`)) return;
        setDeletingId(result.id);
        try {
            const success = await conceptsApi.deleteJob(result.id, userId);
            if (success) {
                setResults(prev => prev.filter(r => r.id !== result.id));
                toast.success('Deleted successfully');
            } else {
                toast.error('Failed to delete');
            }
        } catch {
            toast.error('Failed to delete');
        } finally {
            setDeletingId(null);
        }
    };

    const handleCleanupBroken = async () => {
        const broken = results.filter(r => r.pass1Data.concepts.length === 0);
        if (broken.length === 0) return;
        if (!confirm(`Delete ${broken.length} broken generation${broken.length > 1 ? 's' : ''} (0 concepts)? This cannot be undone.`)) return;

        let deleted = 0;
        for (const b of broken) {
            try {
                const success = await conceptsApi.deleteJob(b.id, userId);
                if (success) deleted++;
            } catch { /* continue */ }
        }
        setResults(prev => prev.filter(r => r.pass1Data.concepts.length > 0));
        toast.success(`Cleaned up ${deleted} broken generation${deleted !== 1 ? 's' : ''}`);
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

    /** Compute a composite health label from validation metrics */
    const getHealthLabel = (result: SavedResult): { label: string; color: string } => {
        const score = Math.round(
            (result.validation.completeness * 0.3 +
                result.validation.lifecycleConsistency * 0.3 +
                result.validation.formatConsistency * 0.2 +
                result.validation.positiveFraming * 0.2)
        );
        if (score >= 90) return { label: 'Healthy', color: 'var(--color-leaf)' };
        if (score >= 75) return { label: 'Good', color: 'var(--color-branch)' };
        if (score >= 60) return { label: 'Needs Review', color: '#f59e0b' };
        return { label: 'At Risk', color: '#ef4444' };
    };

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Library Preview</h1>
                        <p className={styles.subtitle}>
                            Preview generated content and manage community sharing
                        </p>
                    </div>
                </div>

                {!loading && results.length > 0 && (
                    <>
                    {brokenCount > 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.75rem 1rem', marginBottom: '1rem',
                            background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '0.5rem', fontSize: '0.875rem', color: '#ef4444',
                        }}>
                            <span>
                                <strong>{brokenCount}</strong> broken generation{brokenCount !== 1 ? 's' : ''} (0 concepts) found.
                                {!showBroken && ' Hidden from view.'}
                            </span>
                            <span style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => setShowBroken(!showBroken)}
                                    style={{
                                        padding: '0.25rem 0.5rem', fontSize: '0.8125rem',
                                        background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '0.25rem', color: '#ef4444', cursor: 'pointer',
                                    }}
                                >
                                    {showBroken ? 'Hide' : 'Show'}
                                </button>
                                <button
                                    onClick={handleCleanupBroken}
                                    style={{
                                        padding: '0.25rem 0.5rem', fontSize: '0.8125rem',
                                        background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '0.25rem', color: '#ef4444', cursor: 'pointer',
                                    }}
                                >
                                    Delete All Broken
                                </button>
                            </span>
                        </div>
                    )}
                    <div className={styles.filterBar}>
                        <div className={styles.searchBox}>
                            <Search size={18} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search content..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
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
                    </>
                )}

                {loading ? (
                    <div className={styles.loadingState}>
                        <div className={styles.spinner} />
                        <p>Loading catalog...</p>
                    </div>
                ) : results.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Cloud size={48} className={styles.emptyIcon} />
                        <h2>No content generated yet</h2>
                        <p>Use the Content Generator to create new learning materials</p>
                    </div>
                ) : filteredResults.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Search size={48} className={styles.emptyIcon} />
                        <h2>No results match "{searchQuery}"</h2>
                        <button onClick={() => setSearchQuery('')} className={styles.primaryButton}>
                            Clear Search
                        </button>
                    </div>
                ) : (
                    <div className={styles.resultsGrid}>
                        {filteredResults.map((result) => {
                            const health = getHealthLabel(result);
                            const isBroken = result.pass1Data.concepts.length === 0;
                            return (
                            <div
                                key={result.id}
                                className={styles.resultCard}
                                style={isBroken ? { opacity: 0.6, borderColor: 'rgba(239, 68, 68, 0.3)' } : undefined}
                            >
                                <div className={styles.cardHeader}>
                                    <div>
                                        <h3 className={styles.cardTitle}>
                                            {result.subject}
                                            {result.alias && (
                                                <span className={styles.aliasBadge}>
                                                    {result.alias}
                                                </span>
                                            )}
                                        </h3>
                                        <p className={styles.cardDate}>{formatDate(result.generatedAt)}</p>
                                    </div>
                                    <span
                                        title="Content health status"
                                        style={{
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            background: `color-mix(in srgb, ${health.color} 18%, transparent)`,
                                            color: health.color,
                                            border: `1px solid color-mix(in srgb, ${health.color} 30%, transparent)`,
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {health.label}
                                    </span>
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
                                        onClick={() => navigate(`/curator/preview/${result.id}`)}
                                        className={styles.learnButton}
                                        title="Preview content with curator tools"
                                    >
                                        <BookOpen size={16} />
                                        Preview
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setTogglingId(result.id);
                                            try {
                                                const newVal = !result.isPublic;
                                                await conceptsApi.togglePublic(userId, result.id, newVal);
                                                setResults(prev => prev.map(r => r.id === result.id ? { ...r, isPublic: newVal } : r));
                                                toast.success(newVal ? 'Shared to Community Library' : 'Removed from Community Library');
                                            } catch {
                                                toast.error('Failed to update visibility');
                                            } finally {
                                                setTogglingId(null);
                                            }
                                        }}
                                        className={`${styles.viewButton} ${result.isPublic ? styles.publicActive : ''}`}
                                        disabled={togglingId === result.id}
                                        title={result.isPublic ? 'Public - Click to unpublish' : 'Private - Click to share to library'}
                                        style={{ color: result.isPublic ? 'var(--color-success)' : undefined, border: result.isPublic ? '1px solid var(--color-success)' : undefined }}
                                    >
                                        <Globe size={16} />
                                        {result.isPublic ? 'Shared' : 'Share'}
                                    </button>
                                    <button
                                        onClick={() => navigate(`/curator/health?subject=${encodeURIComponent(result.subject)}&sessionId=${encodeURIComponent(result.id)}`)}
                                        className={styles.viewButton}
                                        title="View content health details"
                                    >
                                        <Activity size={16} />
                                        Health
                                    </button>
                                    <button
                                        onClick={() => navigate(`/curator/dependencies?subject=${encodeURIComponent(result.subject)}&sessionId=${encodeURIComponent(result.id)}`)}
                                        className={styles.viewButton}
                                        title="View dependency impact analysis"
                                    >
                                        <GitBranch size={16} />
                                        Deps
                                    </button>
                                    <button
                                        onClick={() => navigate(`/curator/regeneration?subject=${encodeURIComponent(result.subject)}&sessionId=${encodeURIComponent(result.id)}`)}
                                        className={styles.viewButton}
                                        title="View regeneration recommendations"
                                    >
                                        <RefreshCw size={16} />
                                        Regen
                                    </button>
                                    <button
                                        onClick={() => handleDeleteJob(result)}
                                        className={styles.viewButton}
                                        disabled={deletingId === result.id}
                                        title="Delete this generation"
                                        style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                    >
                                        <Trash2 size={16} />
                                        {deletingId === result.id ? '…' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        );})}
                    </div>
                )}
            </div>
        </div>
    );
}
