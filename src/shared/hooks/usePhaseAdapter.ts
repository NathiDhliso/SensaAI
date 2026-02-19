/**
 * Phase Adapter System
 * Maps (Phase + Mood) → Component + Completion Handler
 * 
 * This separates phase logic (what cognitive goal) from method selection (how to achieve it).
 */

import type { LearnerMood, StudySession } from '@/shared/types/learning';

// ============================================================================
// Phase Types (New Unified Flow)
// ============================================================================

export type UnifiedPhase =
  | 'IDLE'           // No active session
  | 'PRIME'          // Intent setting + context retrieval
  | 'ORIENT'         // Schema priming (activate or build)
  | 'STRUCTURE'      // Schema building (externalize mental model)
  | 'ENCODE'         // Memory formation (encoding or retrieval)
  | 'VERIFY'         // Consolidation (testing effect)
  | 'COMPLETE';      // Session end + consolidation handoff

// ============================================================================
// Adapter Types
// ============================================================================

export interface PhaseComponentProps {
  concepts: any[]; // LearningConcept[] - using any to avoid circular dependency
  session: StudySession;
  onComplete: () => void;
  onProgress?: (data: any) => void;
}

export interface PhaseAdapter {
  phase: UnifiedPhase;
  componentName: string; // Name of component to render (for dynamic import)
  completionHandler: (session: StudySession) => Partial<StudySession>;
  skipCondition?: (session: StudySession) => boolean;
}

// ============================================================================
// Phase Adapter Hook
// ============================================================================

/**
 * Returns the appropriate adapter for the given phase and mood.
 * This determines which component variant to show and how to handle completion.
 */
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
        completionHandler: () => ({
          // Primer should already be set by the modal
        })
      };
      
    case 'ORIENT':
      return getOrientAdapter(mood);
      
    case 'STRUCTURE':
      return getStructureAdapter(mood);
      
    case 'ENCODE':
      return getEncodeAdapter(mood);
      
    case 'VERIFY':
      return getVerifyAdapter(mood);
      
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
// ORIENT Phase Adapters
// ============================================================================

function getOrientAdapter(mood: LearnerMood): PhaseAdapter {
  const isTired = mood === 'tired';
  const isPumped = mood === 'pumped' || mood === 'good';
  
  if (isTired) {
    return {
      phase: 'ORIENT',
      componentName: 'PriorKnowledgeActivation',
      completionHandler: (session) => ({
        phaseProgress: {
          ...session.phaseProgress,
          orientCompleted: true
        },
        adaptations: {
          ...session.adaptations,
          orientMode: 'prior-knowledge'
        }
      })
    };
  }
  
  if (isPumped) {
    return {
      phase: 'ORIENT',
      componentName: 'GenerativeOrienting',
      completionHandler: (session) => ({
        phaseProgress: {
          ...session.phaseProgress,
          orientCompleted: true
        },
        adaptations: {
          ...session.adaptations,
          orientMode: 'generative'
        }
      })
    };
  }
  
  // Medium energy (okay, struggling)
  return {
    phase: 'ORIENT',
    componentName: 'PredictionSkeleton',
    completionHandler: (session) => ({
      phaseProgress: {
        ...session.phaseProgress,
        orientCompleted: true
      },
      adaptations: {
        ...session.adaptations,
        orientMode: 'prediction-skeleton'
      }
    })
  };
}

// ============================================================================
// STRUCTURE Phase Adapters
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
  
  // Medium energy
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

// ============================================================================
// ENCODE Phase Adapters
// ============================================================================

function getEncodeAdapter(mood: LearnerMood): PhaseAdapter {
  const isTired = mood === 'tired';
  const isPumped = mood === 'pumped' || mood === 'good';
  
  if (isTired) {
    // Tired users: retrieval if prior progress, minimal encoding if new
    return {
      phase: 'ENCODE',
      componentName: 'TiredEncode', // Will choose between retrieval/minimal based on progress
      completionHandler: (session) => {
        const hasPriorProgress = session.conceptsCompleted.length > 0;
        return {
          phaseProgress: {
            ...session.phaseProgress,
            encodeStarted: true
          },
          adaptations: {
            ...session.adaptations,
            encodeMode: hasPriorProgress ? 'retrieval' : 'minimal-encoding'
          }
        };
      }
    };
  }
  
  if (isPumped) {
    return {
      phase: 'ENCODE',
      componentName: 'InterleavedAcquisition',
      completionHandler: (session) => ({
        phaseProgress: {
          ...session.phaseProgress,
          encodeStarted: true
        },
        adaptations: {
          ...session.adaptations,
          encodeMode: 'interleaved'
        }
      })
    };
  }
  
  // Medium energy
  return {
    phase: 'ENCODE',
    componentName: 'StandardAcquisition',
    completionHandler: (session) => ({
      phaseProgress: {
        ...session.phaseProgress,
        encodeStarted: true
      },
      adaptations: {
        ...session.adaptations,
        encodeMode: 'standard'
      }
    })
  };
}

// ============================================================================
// VERIFY Phase Adapters
// ============================================================================

function getVerifyAdapter(mood: LearnerMood): PhaseAdapter {
  const isTired = mood === 'tired';
  const isPumped = mood === 'pumped' || mood === 'good';
  
  if (isTired) {
    return {
      phase: 'VERIFY',
      componentName: 'RecognitionTasks',
      completionHandler: (session) => ({
        phaseProgress: {
          ...session.phaseProgress,
          verifyCompleted: true
        },
        adaptations: {
          ...session.adaptations,
          verifyMode: 'recognition'
        }
      })
    };
  }
  
  if (isPumped) {
    return {
      phase: 'VERIFY',
      componentName: 'FreeRecallTransfer',
      completionHandler: (session) => ({
        phaseProgress: {
          ...session.phaseProgress,
          verifyCompleted: true
        },
        adaptations: {
          ...session.adaptations,
          verifyMode: 'free-recall'
        }
      })
    };
  }
  
  // Medium energy
  return {
    phase: 'VERIFY',
    componentName: 'CuedRecall',
    completionHandler: (session) => ({
      phaseProgress: {
        ...session.phaseProgress,
        verifyCompleted: true
      },
      adaptations: {
        ...session.adaptations,
        verifyMode: 'cued-recall'
      }
    })
  };
}
