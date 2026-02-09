import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Cloud, X, Check, Download, Calendar, BookOpen, RefreshCw, CheckCircle2, AlertCircle, Layers, FileJson, FileText } from 'lucide-react';
import { storageManager } from '@/features/content-storage';
import type { SavedResult } from '@/features/content-storage/types';
import type { ParsedConcept } from '@/features/content-generation/parsers/types';
import { parseContent } from '@/features/content-generation/parsers/json-parser';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { getMetricsTracker } from '@/features/learning-session/progress/metrics-tracker';
import { formatSafeDate } from '@/shared/utils/utils';
import styles from './CloudLibraryModal.module.css';

interface CloudLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

type FilterTab = 'all' | 'downloaded' | 'cloud-only';
type SortOption = 'date' | 'subject' | 'domain';

interface ToastState {
    message: string;
    type: 'success' | 'error';
    visible: boolean;
}

// Knowledge Warmth Badge Component
// Displays 🔥 Hot → 🧊 Cold based on last recall timestamp
function WarmthBadge({ subjectId }: { subjectId: string }) {
    const tracker = getMetricsTracker();
    const warmth = tracker.getKnowledgeWarmth(subjectId);

    const config = {
        hot: { emoji: '🔥', label: 'Hot', className: styles.warmthHot },
        warm: { emoji: '🌡️', label: 'Warm', className: styles.warmthWarm },
        cool: { emoji: '❄️', label: 'Cool', className: styles.warmthCool },
        cold: { emoji: '🧊', label: 'Cold', className: styles.warmthCold },
    };

    const { emoji, label, className } = config[warmth];

    return (
        <span className={`${styles.warmthBadge} ${className}`} title={`Knowledge Warmth: ${label}`}>
            {emoji}
        </span>
    );
}

export function CloudLibraryModal({ isOpen, onClose, onUpdate }: CloudLibraryModalProps) {
    const navigate = useNavigate();
    const [results, setResults] = useState<SavedResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
    const [sortBy, setSortBy] = useState<SortOption>('date');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [batchProcessing, setBatchProcessing] = useState(false);
    const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Keyboard accessibility - Escape to close
    useEscapeKey(onClose, isOpen);

    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ message, type, visible: true });
        setTimeout(() => {
            setToast(prev => ({ ...prev, visible: false }));
        }, UI_TIMINGS.TOAST_MEDIUM);
    }, []);

    // Focus search input when modal opens
    // Defined before useEffect to satisfy block-scoped variable usage
    const loadResults = useCallback(async () => {
        setLoading(true);
        try {
            const allResults = await storageManager.listResults();
            setResults(allResults);
        } catch (error) {
            console.error('Failed to load library:', error);
            showToast('Failed to load library', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        if (isOpen) {
            loadResults();
            // Focus search after a brief delay for animation
            const timer = setTimeout(() => {
                searchInputRef.current?.focus();
            }, UI_TIMINGS.BLUR_DELAY);
            return () => clearTimeout(timer);
        }
    }, [isOpen, loadResults]);
    // Reset selection when filter changes
    useEffect(() => {
        setSelectedItems(new Set());
    }, [activeFilter]);




    const handleRefresh = async () => {
        setLoading(true);
        setSelectedItems(new Set());
        await loadResults();
        showToast('Library refreshed', 'success');
    };

    const handleDownload = async (result: SavedResult) => {
        setProcessingId(result.id);
        try {
            await storageManager.loadResult(result.id);
            await loadResults();
            onUpdate();
            showToast(`Downloaded "${result.subject}"`, 'success');
        } catch (error) {
            console.error('Failed to download:', error);
            showToast('Download failed', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleExportJson = async (result: SavedResult) => {
        setProcessingId(result.id);
        try {
            // Must fetch full result first as list only has metadata
            const fullResult = await storageManager.loadResult(result.id);
            if (!fullResult) throw new Error('Failed to load full result');

            // Use octet-stream to force download
            const blob = new Blob([JSON.stringify(fullResult, null, 2)], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);

            const safeSubject = (result.subject || 'untitled')
                .replace(/[^a-z0-9]+/gi, '-')
                .replace(/^-+|-+$/g, '')
                .toLowerCase();

            const a = document.createElement('a');
            a.href = url;
            a.download = `sensa-${safeSubject || 'export'}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast('Exported JSON successfully', 'success');
        } catch (error) {
            console.error('Failed to export:', error);
            showToast('Export failed', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleExportText = async (result: SavedResult) => {
        setProcessingId(result.id);
        try {
            const fullResult = await storageManager.loadResult(result.id);
            if (!fullResult || !fullResult.fullDocument) throw new Error('Failed to load full result');

            const parseResult = parseContent(fullResult.fullDocument);

            let content = '';

            if (parseResult.success) {
                const fullData = parseResult.data;
                // 1. Format content
                content += `SUBJECT: ${fullResult.subject.toUpperCase()}\n`;
                content += `DOMAIN: ${fullResult.pass1Data.domain}\n`;
                content += `GENERATED: ${formatSafeDate(fullResult.generatedAt)}\n`;
                content += `=================================================\n\n`;
                content += `[ CONCEPTS & MNEMONICS ]\n\n`;

                const concepts = fullData.concepts as ParsedConcept[];

                if (concepts && Array.isArray(concepts)) {
                    concepts.forEach((c: ParsedConcept, i: number) => {
                        content += `${i + 1}. ${c.name.toUpperCase()}\n`;
                        const tier = c.tier || (c.mnemonic && c.mnemonic.tier) || 'Uncategorized';
                        const displayTier = tier.charAt(0).toUpperCase() + tier.slice(1);
                        content += `   Tier: ${displayTier}\n`;

                        const def = c.phase1?.microMetaphor || c.phase1?.hookSentence || "No definition";
                        content += `   Definition: ${def}\n`;

                        if (c.mnemonic) {
                            content += `   ---------------------------------------------\n`;
                            content += `   Anchor: ${c.mnemonic.anchor}\n`;
                            content += `   Story: ${c.mnemonic.story}\n`;
                        }
                        content += `\n`;
                    });
                }
            } else {
                // Fallback: Export raw markdown
                content = fullResult.fullDocument;
            }

            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const safeSubject = (result.subject || 'untitled').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
            const a = document.createElement('a');
            a.href = url;
            a.download = `sensa-${safeSubject}-content.txt`;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);

            showToast('Exported Text successfully', 'success');
        } catch (error) {
            console.error('Failed to export text:', error);
            showToast('Export failed', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleBatchDownload = async () => {
        if (selectedItems.size === 0) return;

        setBatchProcessing(true);
        const itemsToDownload = results.filter(r => selectedItems.has(r.id) && !r.savedLocally);
        let successCount = 0;

        for (const result of itemsToDownload) {
            try {
                await storageManager.loadResult(result.id);
                successCount++;
            } catch (error) {
                console.error(`Failed to download ${result.id}:`, error);
            }
        }

        await loadResults();
        onUpdate();
        setSelectedItems(new Set());
        setBatchProcessing(false);
        showToast(`Downloaded ${successCount} of ${itemsToDownload.length} items`, successCount > 0 ? 'success' : 'error');
    };

    const toggleItemSelection = (id: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        const selectableItems = filteredResults.filter(r => !r.savedLocally);
        if (selectedItems.size === selectableItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(selectableItems.map(r => r.id)));
        }
    };

    const filteredResults = useMemo(() => {
        // 1. Deduplicate by grouping identical items
        const uniqueMap = new Map<string, SavedResult>();

        results.forEach(r => {
            const dateStr = formatSafeDate(r.generatedAt);
            const key = `${r.subject}|${r.pass1Data.domain}|${dateStr}`;

            const existing = uniqueMap.get(key);

            if (!existing) {
                uniqueMap.set(key, r);
            } else {
                if (r.savedLocally && !existing.savedLocally) {
                    uniqueMap.set(key, r);
                }
            }
        });

        let filtered = Array.from(uniqueMap.values());

        // 2. Apply filter tab
        switch (activeFilter) {
            case 'downloaded':
                filtered = filtered.filter(r => r.savedLocally);
                break;
            case 'cloud-only':
                filtered = filtered.filter(r => !r.savedLocally);
                break;
        }

        // 3. Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(r =>
                r.subject.toLowerCase().includes(query) ||
                r.pass1Data.domain.toLowerCase().includes(query)
            );
        }

        // 4. Sort
        return filtered.sort((a, b) => {
            switch (sortBy) {
                case 'subject':
                    return a.subject.localeCompare(b.subject);
                case 'domain':
                    return a.pass1Data.domain.localeCompare(b.pass1Data.domain);
                case 'date':
                default: {
                    const safeTime = (d: string) => /^\d+$/.test(d) ? Number(d) : (new Date(d).getTime() || 0);
                    return safeTime(b.generatedAt) - safeTime(a.generatedAt);
                }
            }
        });
    }, [results, searchQuery, activeFilter, sortBy]);

    // Compute stats
    const stats = useMemo(() => {
        const total = results.length;
        const downloaded = results.filter(r => r.savedLocally).length;
        const cloudOnly = total - downloaded;
        return { total, downloaded, cloudOnly };
    }, [results]);

    const selectableCount = filteredResults.filter(r => !r.savedLocally).length;

    if (!isOpen) return null;

    return (
        <div
            className={styles.overlay}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cloud-library-title"
        >
            <div
                ref={modalRef}
                className={styles.modal}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        <div className={styles.headerIconWrapper}>
                            <Cloud size={24} className={styles.headerIcon} />
                        </div>
                        <div>
                            <h2 id="cloud-library-title">Cloud Library</h2>
                        </div>
                    </div>
                    <div className={styles.headerActions}>
                        <button
                            onClick={handleRefresh}
                            className={styles.refreshButton}
                            disabled={loading}
                            title="Refresh library"
                            aria-label="Refresh library"
                        >
                            <RefreshCw size={18} className={loading ? styles.spinning : ''} />
                        </button>
                        <button
                            onClick={onClose}
                            className={styles.closeButton}
                            aria-label="Close modal"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className={styles.statsBar}>
                    <div className={styles.statItem}>
                        <Layers size={14} />
                        <span>{stats.total} Total</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statItem}>
                        <CheckCircle2 size={14} className={styles.statSuccess} />
                        <span>{stats.downloaded} Downloaded</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statItem}>
                        <Cloud size={14} className={styles.statCloud} />
                        <span>{stats.cloudOnly} Cloud Only</span>
                    </div>
                </div>

                {/* Toolbar */}
                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search subjects or domains..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                            aria-label="Search subjects"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className={styles.clearSearch}
                                aria-label="Clear search"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className={styles.toolbarRight}>
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as SortOption)}
                            className={styles.sortSelect}
                            aria-label="Sort by"
                        >
                            <option value="date">Recent</option>
                            <option value="subject">A-Z Subject</option>
                            <option value="domain">A-Z Domain</option>
                        </select>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className={styles.filterTabs}>
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={`${styles.filterTab} ${activeFilter === 'all' ? styles.filterTabActive : ''}`}
                    >
                        <Layers size={14} />
                        All
                    </button>
                    <button
                        onClick={() => setActiveFilter('downloaded')}
                        className={`${styles.filterTab} ${activeFilter === 'downloaded' ? styles.filterTabActive : ''}`}
                    >
                        <Check size={14} />
                        Downloaded
                    </button>
                    <button
                        onClick={() => setActiveFilter('cloud-only')}
                        className={`${styles.filterTab} ${activeFilter === 'cloud-only' ? styles.filterTabActive : ''}`}
                    >
                        <Cloud size={14} />
                        Cloud Only
                    </button>
                </div>

                {/* Batch Actions (when items selected) */}
                {selectableCount > 0 && activeFilter !== 'downloaded' && (
                    <div className={styles.batchBar}>
                        <label className={styles.selectAllLabel}>
                            <input
                                type="checkbox"
                                checked={selectedItems.size === selectableCount && selectableCount > 0}
                                onChange={toggleSelectAll}
                                className={styles.checkbox}
                            />
                            Select All ({selectableCount})
                        </label>
                        {selectedItems.size > 0 && (
                            <button
                                onClick={handleBatchDownload}
                                disabled={batchProcessing}
                                className={styles.batchDownloadButton}
                            >
                                {batchProcessing ? (
                                    <>
                                        <div className={styles.spinnerSmall} />
                                        Downloading...
                                    </>
                                ) : (
                                    <>
                                        <Download size={14} />
                                        Download {selectedItems.size} Items
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}

                {/* List Container */}
                <div className={styles.listContainer}>
                    {loading ? (
                        <div className={styles.loadingState}>
                            <div className={styles.skeletonList}>
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className={styles.skeletonItem}>
                                        <div className={styles.skeletonContent}>
                                            <div className={styles.skeletonTitle} />
                                            <div className={styles.skeletonMeta} />
                                        </div>
                                        <div className={styles.skeletonButton} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : filteredResults.length === 0 ? (
                        <div className={styles.emptyState}>
                            {searchQuery ? (
                                <>
                                    <Search size={48} className={styles.emptyIcon} />
                                    <h3>No matches found</h3>
                                    <p>Try a different search term</p>
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className={styles.emptyAction}
                                    >
                                        Clear Search
                                    </button>
                                </>
                            ) : activeFilter === 'downloaded' ? (
                                <>
                                    <Download size={48} className={styles.emptyIcon} />
                                    <h3>No downloaded items</h3>
                                    <p>Download items from your cloud library to access them offline</p>
                                </>
                            ) : activeFilter === 'cloud-only' ? (
                                <>
                                    <CheckCircle2 size={48} className={styles.emptyIconSuccess} />
                                    <h3>All synced!</h3>
                                    <p>All your cloud items are downloaded locally</p>
                                </>
                            ) : (
                                <>
                                    <Cloud size={48} className={styles.emptyIcon} />
                                    <h3>Library is empty</h3>
                                    <p>Generate your first learning material to get started</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className={styles.list} role="list">
                            {filteredResults.map(result => (
                                <div
                                    key={result.id}
                                    className={`${styles.listItem} ${selectedItems.has(result.id) ? styles.listItemSelected : ''}`}
                                    onMouseEnter={() => setHoveredItem(result.id)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                    role="listitem"
                                >
                                    {/* Selection checkbox (only for non-downloaded items) */}
                                    {!result.savedLocally && activeFilter !== 'downloaded' && (
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.has(result.id)}
                                            onChange={() => toggleItemSelection(result.id)}
                                            className={styles.itemCheckbox}
                                            aria-label={`Select ${result.subject}`}
                                        />
                                    )}

                                    <div className={styles.itemInfo}>
                                        <div className={styles.itemTitleRow}>
                                            <h3>{result.subject}</h3>
                                            {/* Knowledge Warmth Indicator */}
                                            {result.savedLocally && (
                                                <WarmthBadge subjectId={result.id} />
                                            )}
                                        </div>
                                        <div className={styles.itemMeta}>
                                            <span className={styles.metaDomain}>
                                                <BookOpen size={12} />
                                                {result.pass1Data.domain}
                                            </span>
                                            <span className={styles.metaDivider}>•</span>
                                            <span className={styles.metaDate}>
                                                <Calendar size={12} />
                                                {formatSafeDate(result.generatedAt)}
                                            </span>
                                            <span className={styles.metaDivider}>•</span>
                                            <span className={styles.metaAuthor} style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
                                                ✨ Sensa AI
                                            </span>
                                        </div>

                                        {/* Expanded details on hover */}
                                        {hoveredItem === result.id && (
                                            <div className={styles.itemDetails}>
                                                <span>{result.pass1Data.concepts.length} concepts</span>
                                                <span>•</span>
                                                <span>{result.validation.completeness}% quality</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.itemActions}>
                                        {result.savedLocally ? (
                                            <>
                                                <div className={styles.statusBadge}>
                                                    <span className={styles.syncedText}>
                                                        <CheckCircle2 size={16} />
                                                        Synced
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleExportJson(result)}
                                                    className={styles.openButton}
                                                    style={{ backgroundColor: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', marginRight: '0.5rem' }}
                                                    disabled={processingId === result.id}
                                                    title="Export JSON file"
                                                >
                                                    {processingId === result.id ? (
                                                        <div className={styles.spinnerSmall} />
                                                    ) : (
                                                        <FileJson size={16} />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleExportText(result)}
                                                    className={styles.openButton}
                                                    style={{ backgroundColor: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', marginRight: '0.5rem' }}
                                                    disabled={processingId === result.id}
                                                    title="Export Text file"
                                                >
                                                    {processingId === result.id ? (
                                                        <div className={styles.spinnerSmall} />
                                                    ) : (
                                                        <FileText size={16} />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onClose();
                                                        navigate(`/launchpad/${result.id}`);
                                                    }}
                                                    className={styles.openButton}
                                                    title="Open in Launchpad"
                                                >
                                                    <BookOpen size={16} />
                                                    Open
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleDownload(result)}
                                                className={styles.downloadButton}
                                                disabled={processingId === result.id || batchProcessing}
                                                aria-label={`Download ${result.subject}`}
                                            >
                                                {processingId === result.id ? (
                                                    <div className={styles.spinnerSmall} />
                                                ) : (
                                                    <Download size={16} />
                                                )}
                                                Download
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Toast Notification */}
                {toast.visible && (
                    <div className={`${styles.toast} ${styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]}`}>
                        {toast.type === 'success' ? (
                            <CheckCircle2 size={16} />
                        ) : (
                            <AlertCircle size={16} />
                        )}
                        {toast.message}
                    </div>
                )}
            </div>
        </div>
    );
}
