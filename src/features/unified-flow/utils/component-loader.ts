/**
 * Component Loader for Unified Progressive Flow
 * 
 * Dynamically loads phase components based on adapter component names.
 * Uses lazy loading for performance optimization.
 */

import { lazy, type ComponentType } from 'react';
import type { PhaseComponentProps } from '@/shared/hooks/usePhaseAdapter';

// Lazy load ORIENT components
const PriorKnowledgeActivation = lazy(() => 
  import('../components/orient/PriorKnowledgeActivation').then(m => ({ 
    default: m.PriorKnowledgeActivation 
  }))
);

const PredictionSkeleton = lazy(() => 
  import('../components/orient/PredictionSkeleton').then(m => ({ 
    default: m.PredictionSkeleton 
  }))
);

const GenerativeOrienting = lazy(() => 
  import('../components/orient/GenerativeOrienting').then(m => ({ 
    default: m.GenerativeOrienting 
  }))
);

// Lazy load STRUCTURE components
const AnnotatableMap = lazy(() => 
  import('../components/structure/AnnotatableMap').then(m => ({ 
    default: m.AnnotatableMap 
  }))
);

const GuidedMapBuilder = lazy(() => 
  import('../components/structure/GuidedMapBuilder').then(m => ({ 
    default: m.GuidedMapBuilder 
  }))
);

const FullMapBuilder = lazy(() => 
  import('../components/structure/FullMapBuilder').then(m => ({ 
    default: m.FullMapBuilder 
  }))
);

// Lazy load ENCODE components
const RetrievalPractice = lazy(() => 
  import('../components/encode/RetrievalPractice').then(m => ({ 
    default: m.RetrievalPractice 
  }))
);

const MinimalInterferenceEncoding = lazy(() => 
  import('../components/encode/MinimalInterferenceEncoding').then(m => ({ 
    default: m.MinimalInterferenceEncoding 
  }))
);

const StandardAcquisition = lazy(() => 
  import('../components/encode/StandardAcquisition').then(m => ({ 
    default: m.StandardAcquisition 
  }))
);

const InterleavedAcquisition = lazy(() => 
  import('../components/encode/InterleavedAcquisition').then(m => ({ 
    default: m.InterleavedAcquisition 
  }))
);

// Lazy load VERIFY components
const RecognitionTasks = lazy(() => 
  import('../components/verify/RecognitionTasks').then(m => ({ 
    default: m.RecognitionTasks 
  }))
);

const CuedRecall = lazy(() => 
  import('../components/verify/CuedRecall').then(m => ({ 
    default: m.CuedRecall 
  }))
);

const FreeRecallTransfer = lazy(() => 
  import('../components/verify/FreeRecallTransfer').then(m => ({ 
    default: m.FreeRecallTransfer 
  }))
);

// Lazy load COMPLETE component
const SessionComplete = lazy(() => 
  import('../components/complete/SessionComplete').then(m => ({ 
    default: m.SessionComplete 
  }))
);

// Component map for dynamic loading
const componentMap: Record<string, ComponentType<PhaseComponentProps> | null> = {
  // ORIENT Phase
  'PriorKnowledgeActivation': PriorKnowledgeActivation,
  'PredictionSkeleton': PredictionSkeleton,
  'GenerativeOrienting': GenerativeOrienting,
  
  // STRUCTURE Phase
  'AnnotatableMap': AnnotatableMap,
  'GuidedMapBuilder': GuidedMapBuilder,
  'ConceptMapBuilder': FullMapBuilder,
  
  // ENCODE Phase
  'TiredEncode': RetrievalPractice,
  'MinimalInterferenceEncoding': MinimalInterferenceEncoding,
  'StandardAcquisition': StandardAcquisition,
  'InterleavedAcquisition': InterleavedAcquisition,
  
  // VERIFY Phase
  'RecognitionTasks': RecognitionTasks,
  'CuedRecall': CuedRecall,
  'FreeRecallTransfer': FreeRecallTransfer,
  
  // COMPLETE Phase
  'SessionComplete': SessionComplete,
  
  // Other
  'IntentSettingModal': null,
};

/**
 * Gets a component by name.
 * Returns null if component is not yet implemented.
 */
export function getComponent(
  componentName: string
): ComponentType<PhaseComponentProps> | null {
  return componentMap[componentName] || null;
}

/**
 * Checks if a component is available.
 */
export function isComponentAvailable(componentName: string): boolean {
  return componentMap[componentName] !== null;
}

/**
 * Gets list of available component names.
 */
export function getAvailableComponents(): string[] {
  return Object.keys(componentMap).filter(name => componentMap[name] !== null);
}

/**
 * Feature flag configuration for unified flow.
 */
export const UNIFIED_FLOW_CONFIG = {
  enabled: import.meta.env.VITE_UNIFIED_FLOW_ENABLED === 'true',
  phases: {
    ORIENT: true,
    STRUCTURE: true,
    ENCODE: true,
    VERIFY: true,
  }
};

/**
 * Checks if unified flow should be used for a given phase.
 */
export function shouldUseUnifiedFlow(phase: string): boolean {
  if (!UNIFIED_FLOW_CONFIG.enabled) return false;
  
  const phaseKey = phase.toUpperCase() as keyof typeof UNIFIED_FLOW_CONFIG.phases;
  return UNIFIED_FLOW_CONFIG.phases[phaseKey] || false;
}
