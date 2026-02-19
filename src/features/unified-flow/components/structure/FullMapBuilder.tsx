import ConceptMapBuilder from '@/components/learning/activities/ConceptMapBuilder';
import type { LearningConcept, StudySession } from '@/shared/types/learning';

interface FullMapBuilderProps {
  concepts: LearningConcept[];
  session: StudySession;
  onComplete: () => void;
}

export function FullMapBuilder({ concepts, session, onComplete }: FullMapBuilderProps) {
  return (
    <ConceptMapBuilder
      concepts={concepts}
      mode="free"
      onComplete={() => onComplete()}
      subjectName={session.subjectId}
    />
  );
}
