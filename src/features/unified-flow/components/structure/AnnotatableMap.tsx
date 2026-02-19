import { useState, useMemo } from 'react';
import type { LearningConcept, StudySession } from '@/shared/types/learning';
import styles from './Structure.module.css';

interface AnnotatableMapProps {
  concepts: LearningConcept[];
  session: StudySession;
  onComplete: () => void;
}

export function AnnotatableMap({ concepts, onComplete }: AnnotatableMapProps) {
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  const [viewedConcepts, setViewedConcepts] = useState<Set<string>>(new Set());

  const preBuiltMap = useMemo(() => {
    return concepts.map((c, idx) => ({
      id: c.id,
      name: c.name,
      tier: c.tier || 'leaf',
      x: 200 + (idx % 3) * 250,
      y: 100 + Math.floor(idx / 3) * 150
    }));
  }, [concepts]);

  const handleView = (conceptId: string) => {
    setViewedConcepts(prev => new Set(prev).add(conceptId));
  };

  const canComplete = viewedConcepts.size >= Math.min(3, concepts.length);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Your Learning Map</h2>
        <p>Explore the pre-built map and add your notes</p>
      </div>

      <div className={styles.mapView}>
        <svg width="800" height="600" className={styles.svg}>
          {preBuiltMap.map(node => (
            <g key={node.id}>
              <rect
                x={node.x - 60}
                y={node.y - 20}
                width="120"
                height="40"
                fill={viewedConcepts.has(node.id) ? 'var(--color-accent)' : 'var(--color-surface)'}
                stroke="var(--color-border)"
                strokeWidth="2"
                rx="4"
                onClick={() => handleView(node.id)}
                style={{ cursor: 'pointer' }}
              />
              <text
                x={node.x}
                y={node.y + 5}
                textAnchor="middle"
                fill="var(--color-text)"
                fontSize="14"
                onClick={() => handleView(node.id)}
                style={{ cursor: 'pointer', pointerEvents: 'none' }}
              >
                {node.name}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className={styles.annotationPanel}>
        <h3>Your Notes</h3>
        {concepts.slice(0, 5).map(concept => (
          <div key={concept.id} className={styles.annotationField}>
            <label>{concept.name}</label>
            <textarea
              value={annotations[concept.id] || ''}
              onChange={(e) => setAnnotations({
                ...annotations,
                [concept.id]: e.target.value
              })}
              placeholder="Add your thoughts..."
              rows={2}
            />
          </div>
        ))}
      </div>

      <button 
        onClick={onComplete}
        disabled={!canComplete}
        className={styles.continueButton}
      >
        Continue to Learning
      </button>
    </div>
  );
}
