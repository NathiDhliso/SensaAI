import { createContext, useState, type ReactNode } from 'react';
import type { LearningStage, LearningConcept } from '@/lib/types/learning';

interface ContentContextType {
    stages: LearningStage[];
    concepts: LearningConcept[];
    isLoading: boolean;
    error: string | null;
    setContent: (stages: LearningStage[], concepts: LearningConcept[]) => void;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export function ContentProvider({ children }: { children: ReactNode }) {
    const [stages, setStages] = useState<LearningStage[]>([]);
    const [concepts, setConcepts] = useState<LearningConcept[]>([]);
    // @ts-expect-error - Unused but kept for future use
    const [isLoading, setIsLoading] = useState(false);
    // @ts-expect-error - Unused but kept for future use
    const [error, setError] = useState<string | null>(null);

    const setContent = (newStages: LearningStage[], newConcepts: LearningConcept[]) => {
        setStages(newStages);
        setConcepts(newConcepts);
    };

    return (
        <ContentContext.Provider value={{ stages, concepts, isLoading, error, setContent }}>
            {children}
        </ContentContext.Provider>
    );
}

export { ContentContext };
