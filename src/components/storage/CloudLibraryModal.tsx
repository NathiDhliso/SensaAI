import { useState, useEffect, useMemo } from 'react';
import { Search, Cloud, X, Check, Download } from 'lucide-react';
import { storageManager } from '@/lib/storage';
import type { SavedResult } from '@/lib/storage';
import styles from './CloudLibraryModal.module.css';

interface CloudLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function CloudLibraryModal({ isOpen, onClose, onUpdate }: CloudLibraryModalProps) {
    const [results, setResults] = useState<SavedResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadResults();
        }
    }, [isOpen]);

    const loadResults = async () => {
        setLoading(true);
        try {
            const allResults = await storageManager.listResults();
            setResults(allResults);
        } catch (error) {
            console.error('Failed to load library:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (result: SavedResult) => {
        setProcessingId(result.id);
        try {
            // Loading the result triggers a fetch from cloud and auto-save-to-local
            // because of the logic inside storageManager.loadResult()
            await storageManager.loadResult(result.id);
            await loadResults();
            onUpdate();
        } catch (error) {
            console.error('Failed to download:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const filteredResults = useMemo(() => {
        // 1. Deduplicate by grouping identical items
        const uniqueMap = new Map<string, SavedResult>();

        results.forEach(r => {
            // Create a unique key based on visible metadata
            const dateStr = new Date(r.generatedAt).toLocaleDateString();
            const key = `${r.subject}|${r.pass1Data.domain}|${dateStr}`;

            const existing = uniqueMap.get(key);

            if (!existing) {
                uniqueMap.set(key, r);
            } else {
                // If we have a duplicate, prefer the one that is saved locally
                if (r.savedLocally && !existing.savedLocally) {
                    uniqueMap.set(key, r);
                }
            }
        });

        let filtered = Array.from(uniqueMap.values());

        // 2. Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(r =>
                r.subject.toLowerCase().includes(query) ||
                r.pass1Data.domain.toLowerCase().includes(query)
            );
        }

        // 3. Sort by date desc
        return filtered.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    }, [results, searchQuery]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        <Cloud size={24} className={styles.headerIcon} />
                        <div>
                            <h2>Cloud Library</h2>
                            <p>Browse and download cloud subjects</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Search subjects..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                </div>

                <div className={styles.listContainer}>
                    {loading ? (
                        <div className={styles.loadingState}>
                            <div className={styles.spinner} />
                            <p>Loading library...</p>
                        </div>
                    ) : filteredResults.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No results found</p>
                        </div>
                    ) : (
                        <div className={styles.list}>
                            {filteredResults.map(result => (
                                <div key={result.id} className={styles.listItem}>
                                    <div className={styles.itemInfo}>
                                        <h3>{result.subject}</h3>
                                        <div className={styles.itemMeta}>
                                            <span>{result.pass1Data.domain}</span>
                                            <span>•</span>
                                            <span>{new Date(result.generatedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className={styles.itemActions}>
                                        {result.savedLocally ? (
                                            <div className={styles.statusBadge}>
                                                <span className={styles.syncedText}>
                                                    <Check size={16} /> Downloaded
                                                </span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleDownload(result)}
                                                className={styles.downloadButton}
                                                disabled={processingId === result.id}
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
            </div>
        </div>
    );
}
