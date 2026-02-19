/**
 * Phase Adapter System
 * Maps Phase → Component + Completion Handler
 *
 * Core learning loop: STRUCTURE (Concept Map) → ULC_MASTERY (ULC Matrix)
 */

import type { LearnerMood, StudySession } from '@/shared/types/learning';

// ============================================================================
// Phase Types
// ============================================================================

export type UnifiedPhase =
  | 'IDLE'          // No active session
  | 'PRIME'         // Intent setting + context retrieval
  | 'STRUCTURE'     // Concept Map building (mandatory first step)
  | 'ULC_MASTERY'   // ULC matrix practice (verb × object systematic loop)
  | 'COMPLETE';     // Session end + consolidation handoff

// ============================================================================
// Adapter Types
// ============================================================================

export interface PhaseComponentProps {
  concepts: any[];
  session: StudySession;
  onComplete: () => void;
  onProgress?: (data: any) => void;
}

export interface PhaseAdapter {
  phase: UnifiedPhase;
  componentName: string;
  completionHandler: (session: StudySession) => Partial<StudySession>;
  skipCondition?: (session: StudySession) => boolean;
}

// ============================================================================
// Phase Adapter Hook
// ============================================================================

export function usePhaseAdapter(
  phase: UnifiedPhase,
  mood: LearnerMood
): PhaseAdapter | null {
  switch (phase) {
    case 'IDLE':
      return null;

    case 'PRIME':
      return {
        phase: 'PRIME',
        componentName: 'IntentSettingModal',
        completionHandler: () => ({})
      };

    case 'STRUCTURE':
      return getStructureAdapter(mood);

    case 'ULC_MASTERY':
      return {
        phase: 'ULC_MASTERY',
        componentName: 'ULCPracticeController',
        completionHandler: (session) => ({
          phaseProgress: {
            ...session.phaseProgress,
            ulcMasteryCompleted: true
          }
        })
      };

    case 'COMPLETE':
      return {
        phase: 'COMPLETE',
        componentName: 'SessionComplete',
        completionHandler: () => ({
          isActive: false,
          endedAt: new Date().toISOString()
        })
      };

    default:
      return null;
  }
}

// ============================================================================
// STRUCTURE Phase Adapters (mood-aware map building)
// ============================================================================

function getStructureAdapter(mood: LearnerMood): PhaseAdapter {
  const isTired = mood === 'tired';
  const isPumped = mood === 'pumped' || mood === 'good';

  if (isTired) {
    return {
      phase: 'STRUCTURE',
      componentName: 'AnnotatableMap',
      completionHandler: (session) => ({
        phaseProgress: {
          ...session.phaseProgress,
          structureCompleted: true
        },
        adaptations: {
          ...session.adaptations,
          structureMode: 'annotate'
        }
      })
    };
  }

  if (isPumped) {
    return {
      phase: 'STRUCTURE',
      componentName: 'ConceptMapBuilder',
      completionHandler: (session) => ({
        phaseProgress: {
          ...session.phaseProgress,
          structureCompleted: true
        },
        adaptations: {
          ...session.adaptations,
          structureMode: 'full'
        }
      })
    };
  }

  return {
    phase: 'STRUCTURE',
    componentName: 'GuidedMapBuilder',
    completionHandler: (session) => ({
      phaseProgress: {
        ...session.phaseProgress,
        structureCompleted: true
      },
      adaptations: {
        ...session.adaptations,
        structureMode: 'guided'
      }
    })
  };
}
