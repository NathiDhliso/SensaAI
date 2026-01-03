/**
 * DependencyBarChart - Horizontal bar chart showing concepts sorted by dependentCount
 * 
 * Renders a sidebar with bars representing how many other concepts depend on each one.
 * Clicking a bar highlights that concept in the graph/floor plan.
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { SubjectGraph } from '@/lib/types/learning';
import type { LearningConcept } from '@/lib/types/learning';
import styles from './DependencyBarChart.module.css';

export interface DependencyBarChartProps {
    /** Dependency graph data */
    graph: SubjectGraph;
    /** Concepts for emoji lookup */
    concepts: LearningConcept[];
    /** Currently selected concept ID */
    selectedConceptId?: string;
    /** Callback when a bar is clicked */
    onConceptClick?: (conceptId: string) => void;
    /** Maximum bars to show (default: 15) */
    maxBars?: number;
}

/**
 * Get tier color
 */
function getTierColor(tier: string | undefined): string {
    switch (tier) {
        case 'Foundation': return '#10b981';
        case 'Keystone': return '#8b5cf6';
        case 'Utility': return '#f59e0b';
        default: return '#6b7280';
    }
}

/**
 * Extract emoji from anchor string
 */
function extractEmoji(anchor: string | undefined): string {
    if (!anchor) return '📦';
    const match = anchor.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu);
    return match?.[0] || '📦';
}

/**
 * DependencyBarChart component
 */
export function DependencyBarChart({
    graph,
    concepts,
    selectedConceptId,
    onConceptClick,
    maxBars = 15,
}: DependencyBarChartProps) {
    // Build concept map for emoji lookup
    const conceptMap = useMemo(() => {
        const map = new Map<string, LearningConcept>();
        concepts.forEach(c => map.set(c.id, c));
        return map;
    }, [concepts]);

    // Sort nodes by dependentCount descending
    const sortedNodes = useMemo(() => {
        return [...graph.nodes]
            .sort((a, b) => b.metrics.dependentCount - a.metrics.dependentCount)
            .slice(0, maxBars);
    }, [graph.nodes, maxBars]);

    // Find max for scaling
    const maxDependents = useMemo(() => {
        return Math.max(...sortedNodes.map(n => n.metrics.dependentCount), 1);
    }, [sortedNodes]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Dependencies</h3>
                <span className={styles.subtitle}>Concepts others depend on</span>
            </div>

            <div className={styles.barList}>
                {sortedNodes.map((node, index) => {
                    const concept = conceptMap.get(node.id);
                    const emoji = extractEmoji(concept?.mnemonic?.anchor);
                    const tier = node.metrics.calculatedTier;
                    const color = getTierColor(tier);
                    const percentage = (node.metrics.dependentCount / maxDependents) * 100;
                    const isSelected = node.id === selectedConceptId;

                    return (
                        <motion.div
                            key={node.id}
                            className={`${styles.barItem} ${isSelected ? styles.selected : ''}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => onConceptClick?.(node.id)}
                            whileHover={{ scale: 1.02, x: 4 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className={styles.barInfo}>
                                <span className={styles.emoji}>{emoji}</span>
                                <span className={styles.name} title={node.name}>
                                    {node.name.length > 18 ? node.name.slice(0, 18) + '...' : node.name}
                                </span>
                            </div>

                            <div className={styles.barWrapper}>
                                <div className={styles.barTrack}>
                                    <motion.div
                                        className={styles.barFill}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        transition={{ duration: 0.6, delay: index * 0.03 }}
                                        style={{ backgroundColor: color }}
                                    />
                                </div>
                                <span className={styles.count}>
                                    {node.metrics.dependentCount}
                                </span>
                            </div>

                            {/* Tier indicator dot */}
                            <div
                                className={styles.tierDot}
                                style={{ backgroundColor: color }}
                                title={tier}
                            />
                        </motion.div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className={styles.legend}>
                <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ backgroundColor: '#10b981' }} />
                    <span>Foundation</span>
                </div>
                <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ backgroundColor: '#8b5cf6' }} />
                    <span>Keystone</span>
                </div>
                <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ backgroundColor: '#f59e0b' }} />
                    <span>Utility</span>
                </div>
            </div>
        </div>
    );
}

export default DependencyBarChart;
