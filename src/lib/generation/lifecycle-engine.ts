import type { DynamicLifecycle } from '@/lib/types/generation';

export function validateLifecycleConsistency(
  content: string,
  lifecycle: DynamicLifecycle
): { isValid: boolean; missingPhases: string[] } {
  const missingPhases: string[] = [];

  if (!content.includes(lifecycle.phase1)) {
    missingPhases.push(lifecycle.phase1);
  }
  if (!content.includes(lifecycle.phase2)) {
    missingPhases.push(lifecycle.phase2);
  }
  if (!content.includes(lifecycle.phase3)) {
    missingPhases.push(lifecycle.phase3);
  }

  return {
    isValid: missingPhases.length === 0,
    missingPhases,
  };
}
