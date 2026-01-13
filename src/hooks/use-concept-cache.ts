/**
 * Concept Cache Hook
 * 
 * Provides on-demand lazy loading of concepts by tier from IndexedDB.
 * Prevents browser memory crashes by only loading concepts as needed.
 */

import { useState, useCallback, useEffect } from 'react';
import { indexedDBStorage } from '@/lib/storage/indexed-db-storage';
import type { ParsedConcept } from '@/lib/content-adapter/types';

interface ConceptCacheState {
    /** Concepts organized by tier */
    conceptsByTier: Record<string, ParsedConcept[]>;
    /** Loading states per tier */
    loading: Record<string, boolean>;
    /** Error states per tier */
    errors: Record<string, string | null>;
    /** Whether the cache has been initialized */
    initialized: boolean;
}

interface ConceptCacheActions {
    /** Load concepts for a specific tier */
    loadTier: (tier: string) => Promise<ParsedConcept[]>;
    /** Load all tiers (use sparingly!) */
    loadAllTiers: () => Promise<void>;
    /** Clear the cache */
    clearCache: () => void;
    /** Get concepts for a tier (returns empty if not loaded) */
    getConceptsForTier: (tier: string) => ParsedConcept[];
    /** Check if a tier is loaded */
    isTierLoaded: (tier: string) => boolean;
}

const TIERS = ['foundation', 'keystone', 'utility'] as const;

/**
 * Hook for lazy loading concepts from IndexedDB cache
 */
export function useConceptCache(subjectId: string | undefined): ConceptCacheState & ConceptCacheActions {
    const [state, setState] = useState<ConceptCacheState>({
        conceptsByTier: {},
        loading: {},
        errors: {},
        initialized: false,
    });

    // Load a specific tier on-demand
    const loadTier = useCallback(async (tier: string): Promise<ParsedConcept[]> => {
        if (!subjectId) return [];

        const normalizedTier = tier.toLowerCase();

        // Return cached if already loaded
        if (state.conceptsByTier[normalizedTier]) {
            return state.conceptsByTier[normalizedTier];
        }

        // Set loading state
        setState(prev => ({
            ...prev,
            loading: { ...prev.loading, [normalizedTier]: true },
            errors: { ...prev.errors, [normalizedTier]: null },
        }));

        try {
            const concepts = await indexedDBStorage.loadConceptsByTier(subjectId, normalizedTier);

            setState(prev => ({
                ...prev,
                conceptsByTier: { ...prev.conceptsByTier, [normalizedTier]: concepts },
                loading: { ...prev.loading, [normalizedTier]: false },
            }));

            return concepts;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load concepts';

            setState(prev => ({
                ...prev,
                loading: { ...prev.loading, [normalizedTier]: false },
                errors: { ...prev.errors, [normalizedTier]: errorMessage },
            }));

            return [];
        }
    }, [subjectId, state.conceptsByTier]);

    // Load all tiers (use sparingly for memory-constrained devices)
    const loadAllTiers = useCallback(async () => {
        if (!subjectId) return;

        for (const tier of TIERS) {
            await loadTier(tier);
        }
    }, [subjectId, loadTier]);

    // Clear the cache
    const clearCache = useCallback(() => {
        setState({
            conceptsByTier: {},
            loading: {},
            errors: {},
            initialized: false,
        });
    }, []);

    // Get concepts for a tier (returns empty array if not loaded)
    const getConceptsForTier = useCallback((tier: string): ParsedConcept[] => {
        return state.conceptsByTier[tier.toLowerCase()] || [];
    }, [state.conceptsByTier]);

    // Check if a tier is loaded
    const isTierLoaded = useCallback((tier: string): boolean => {
        return tier.toLowerCase() in state.conceptsByTier;
    }, [state.conceptsByTier]);

    // Check if cache exists when subjectId changes
    useEffect(() => {
        if (!subjectId) return;

        const checkCacheExists = async () => {
            const _hasCache = await indexedDBStorage.hasConceptsCache(subjectId);
            setState(prev => ({ ...prev, initialized: true }));
            // Cache existence is tracked internally, no side effects needed
        };

        checkCacheExists();
    }, [subjectId]);

    return {
        ...state,
        loadTier,
        loadAllTiers,
        clearCache,
        getConceptsForTier,
        isTierLoaded,
    };
}

/**
 * Get total concept count across all loaded tiers
 */
export function getTotalConceptCount(conceptsByTier: Record<string, ParsedConcept[]>): number {
    return Object.values(conceptsByTier).reduce((sum, concepts) => sum + concepts.length, 0);
}

/**
 * Get tier counts from loaded concepts
 */
export function getTierCounts(conceptsByTier: Record<string, ParsedConcept[]>): Record<string, number> {
    return {
        foundation: conceptsByTier.foundation?.length || 0,
        keystone: conceptsByTier.keystone?.length || 0,
        utility: conceptsByTier.utility?.length || 0,
    };
}
