import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, BookOpen, Users, Layers } from 'lucide-react';
import { conceptsApi } from '@/shared/api/concepts';
import type { PublicJobSummary } from '@/features/content-storage/types';
import styles from './CommunityLibrary.module.css';

export default function CommunityLibrary() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<PublicJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'subject' | 'concepts'>('date');

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
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.createdAt - a.createdAt;
        case 'subject':
          return a.subject.localeCompare(b.subject);
        case 'concepts':
          return b.conceptCount - a.conceptCount;
        default:
          return 0;
      }
    });
    return filtered;
  }, [jobs, searchQuery, sortBy]);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <button onClick={() => navigate('/library')} className={styles.backButton}>
          <ArrowLeft className={styles.backIcon} />
          Back to Library
        </button>

        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Community Library</h1>
            <p className={styles.subtitle}>
              {filteredJobs.length} shared {filteredJobs.length === 1 ? 'subject' : 'subjects'}
            </p>
          </div>
        </div>

        {!loading && jobs.length > 0 && (
          <div className={styles.filterBar}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search community subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'subject' | 'concepts')}
              className={styles.sortSelect}
              title="Sort results"
            >
              <option value="date">Sort by Date</option>
              <option value="subject">Sort by Subject</option>
              <option value="concepts">Sort by Concepts</option>
            </select>
          </div>
        )}

        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading community content...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className={styles.emptyState}>
            <Users size={48} className={styles.emptyIcon} />
            <h2>No shared content yet</h2>
            <p>Be the first to share your learning system with the community</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className={styles.emptyState}>
            <Search size={48} className={styles.emptyIcon} />
            <h2>No results match &ldquo;{searchQuery}&rdquo;</h2>
            <p>Try a different search term</p>
          </div>
        ) : (
          <div className={styles.resultsGrid}>
            {filteredJobs.map((job) => (
              <div key={job.jobId} className={styles.resultCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>{job.subject}</h3>
                    <div className={styles.cardMeta}>
                      <span>{formatDate(job.createdAt)}</span>
                      <span className={styles.conceptCount}>
                        <Layers size={12} />
                        {job.conceptCount} concepts
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button
                    onClick={() => navigate(`/launchpad/${job.jobId}`)}
                    className={styles.viewButton}
                    title="View this learning system"
                  >
                    <BookOpen size={16} />
                    Explore
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
