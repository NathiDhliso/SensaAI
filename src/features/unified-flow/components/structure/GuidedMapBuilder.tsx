import ConceptMapBuilder from '@/components/learning/activities/ConceptMapBuilder';
import type { LearningConcept, StudySession } from '@/shared/types/learning';

interface GuidedMapBuilderProps {
  concepts: LearningConcept[];
  session: StudySession;
  onComplete: () => void;
}

export function GuidedMapBuilder({ concepts, session, onComplete }: GuidedMapBuilderProps) {
  return (
    <ConceptMapBuilder
      concepts={concepts}
      mode="guided"
      onComplete={() => onComplete()}
      subjectName={session.subjectId}
    />
  );
}
