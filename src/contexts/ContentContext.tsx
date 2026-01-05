import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LearningStage, LearningConcept } from '@/lib/types/learning';
import { loadContent } from '@/lib/content-adapter/dynamic-content-loader';

interface ContentContextType {
    stages: LearningStage[];
    concepts: LearningConcept[];
    isLoading: boolean;
    error: string | null;
    reloadContent: () => Promise<void>;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export function ContentProvider({ children }: { children: ReactNode }) {
    const [stages, setStages] = useState<LearningStage[]>([]);
    const [concepts, setConcepts] = useState<LearningConcept[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initial content load
    // In a real app, this filename might be configurable via env vars or another config
    const CONTENT_URL = '/PL_300_1766515561801-c6ara0akv.json';

    const fetchContent = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await loadContent(CONTENT_URL);
            setStages(data.stages);
            setConcepts(data.concepts);
        } catch (err) {
            console.error('Failed to load content context:', err);
            setError(err instanceof Error ? err.message : 'Unknown error loading content');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchContent();
    }, []);

    return (
        <ContentContext.Provider value={{ stages, concepts, isLoading, error, reloadContent: fetchContent }}>
            {children}
        </ContentContext.Provider>
    );
}

export function useContent() {
    const context = useContext(ContentContext);
    if (context === undefined) {
        throw new Error('useContent must be used within a ContentProvider');
    }
    return context;
}
