import ConceptMapBuilder from '@/components/learning/activities/ConceptMapBuilder';
import { useLearningStore } from '@/store/learning-store';
import type { LearningConcept, StudySession, ConceptMapData } from '@/shared/types/learning';

interface GuidedMapBuilderProps {
  concepts: LearningConcept[];
  session: StudySession;
  onComplete: () => void;
}

export function GuidedMapBuilder({ concepts, onComplete }: GuidedMapBuilderProps) {
  const { markSessionMapBuilt, currentSession } = useLearningStore();

  const handleComplete = (data: ConceptMapData) => {
    markSessionMapBuilt(data);
    onComplete();
  };

  return (
    <ConceptMapBuilder
      concepts={concepts}
      mode="guided"
      onComplete={handleComplete}
      subjectName={currentSession?.subject}
    />
  );
}
