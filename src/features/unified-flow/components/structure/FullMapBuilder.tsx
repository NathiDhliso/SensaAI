import ConceptMapBuilder from '@/components/learning/activities/ConceptMapBuilder';
import { useLearningStore } from '@/store/learning-store';
import type { LearningConcept, StudySession, ConceptMapData } from '@/shared/types/learning';

interface FullMapBuilderProps {
  concepts: LearningConcept[];
  session: StudySession;
  onComplete: () => void;
}

export function FullMapBuilder({ concepts, onComplete }: FullMapBuilderProps) {
  const { markSessionMapBuilt, currentSession } = useLearningStore();

  const handleComplete = (data: ConceptMapData) => {
    markSessionMapBuilt(data);
    onComplete();
  };

  return (
    <ConceptMapBuilder
      concepts={concepts}
      mode="free"
      onComplete={handleComplete}
      subjectName={currentSession?.subject}
    />
  );
}
