import { useMemo } from 'react';
import MicroLearningLoopController from '@/components/learning/MicroLearningLoopController';
import type { LearningConcept, StudySession } from '@/shared/types/learning';

interface InterleavedAcquisitionProps {
  concepts: LearningConcept[];
  session: StudySession;
  onComplete: () => void;
}

function shuffleByPhase(concepts: LearningConcept[]): LearningConcept[] {
  const byPhase: Record<string, LearningConcept[]> = {};
  concepts.forEach(c => {
    const phase = c.lifecyclePhase || 'DELIVER';
    if (!byPhase[phase]) byPhase[phase] = [];
    byPhase[phase].push(c);
  });
  
  const result: LearningConcept[] = [];
  const phases = Object.keys(byPhase);
  let maxLength = Math.max(...Object.values(byPhase).map(arr => arr.length));
  
  for (let i = 0; i < maxLength; i++) {
    phases.forEach(phase => {
      if (byPhase[phase][i]) {
        result.push(byPhase[phase][i]);
      }
    });
  }
  
  return result;
}

export function InterleavedAcquisition({ concepts, onComplete }: InterleavedAcquisitionProps) {
  const interleaved = useMemo(() => shuffleByPhase(concepts), [concepts]);
  
  return (
    <MicroLearningLoopController
      concept={interleaved[0]}
      allConcepts={interleaved}
      complexityScore={7}
      userVelocity={1.2}
      onLoopComplete={() => onComplete()}
      onSkip={() => {}}
    />
  );
}
