import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, Users, Layers, Globe, Clock, SortAsc } from 'lucide-react';
import { conceptsApi } from '@/shared/api/concepts';
import type { PublicJobSummary } from '@/features/content-storage/types';
import styles from './CommunityLibrary.module.css';

type SortKey = 'date' | 'subject' | 'concepts';

const SORT_OPTIONS: { value: SortKey; label: string; icon: typeof Clock }[] = [
  { value: 'date', label: 'Recent', icon: Clock },
  { value: 'concepts', label: 'Most Concepts', icon: Layers },
  { value: 'subject', label: 'A–Z', icon: SortAsc },
];

export default function CommunityLibrary() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<PublicJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date');

  useEffect(() => {
    loadPublicContent();
  }, []);

  const loadPublicContent = async () => {
    setLoading(true);
    try {
      const response = await conceptsApi.listPublic();
      setJobs(response.jobs);
    } catch (error) {
      console.error('Failed to load community content:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = useMemo(() => {
    let filtered = jobs;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(j => j.subject.toLowerCase().includes(query));
    }
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date': return b.createdAt - a.createdAt;
        case 'subject': return a.subject.localeCompare(b.subject);
        case 'concepts': return b.conceptCount - a.conceptCount;
        default: return 0;
      }
    });
  }, [jobs, searchQuery, sortBy]);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderIcon}>
            <Globe size={20} />
          </div>
          <div>
            <h1 className={styles.pageTitle}>Community</h1>
            <p className={styles.pageSubtitle}>
              {loading ? 'Loading...' : `${jobs.length} shared learning ${jobs.length === 1 ? 'system' : 'systems'}`}
            </p>
          </div>
        </div>

        {!loading && jobs.length > 0 && (
          <div className={styles.filterBar}>
            <div className={styles.searchBox}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.sortPills}>
              {SORT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  className={`${styles.sortPill} ${sortBy === value ? styles.sortPillActive : ''}`}
                  onClick={() => setSortBy(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className={styles.skeletonGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonMeta} />
                <div className={styles.skeletonButton} />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className={styles.emptyState}>
            <Users size={40} className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>No shared content yet</h2>
            <p className={styles.emptyText}>Be the first to share your learning system with the community</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className={styles.emptyState}>
            <Search size={40} className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>No results for &ldquo;{searchQuery}&rdquo;</h2>
            <p className={styles.emptyText}>Try a different search term</p>
          </div>
        ) : (
          <div className={styles.resultsGrid}>
            {filteredJobs.map((job) => (
              <button
                key={job.jobId}
                className={styles.resultCard}
                onClick={() => navigate(`/launchpad/${job.jobId}`, { state: { ownerId: job.ownerId, community: true } })}
              >
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{job.subject}</h3>
                  <div className={styles.cardMeta}>
                    <span className={styles.conceptCount}>
                      <Layers size={11} />
                      {job.conceptCount} concepts
                    </span>
                    <span className={styles.cardDate}>{formatDate(job.createdAt)}</span>
                  </div>
                </div>
                <div className={styles.cardCta}>
                  <BookOpen size={14} />
                  Explore
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
