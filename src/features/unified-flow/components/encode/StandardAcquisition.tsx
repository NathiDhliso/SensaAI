import MicroLearningLoopController from '@/components/learning/MicroLearningLoopController';
import type { LearningConcept, StudySession } from '@/shared/types/learning';

interface StandardAcquisitionProps {
  concepts: LearningConcept[];
  session: StudySession;
  onComplete: () => void;
}

export function StandardAcquisition({ concepts, onComplete }: StandardAcquisitionProps) {
  return (
    <MicroLearningLoopController
      concept={concepts[0]}
      allConcepts={concepts}
      complexityScore={5}
      userVelocity={1.0}
      onLoopComplete={() => onComplete()}
      onSkip={() => {}}
    />
  );
}
