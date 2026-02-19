import { lazy, type ComponentType } from 'react';
import type { PhaseComponentProps } from '@/shared/hooks/usePhaseAdapter';

const AnnotatableMap = lazy(() =>
  import('../components/structure/AnnotatableMap').then(m => ({ default: m.AnnotatableMap }))
);

const GuidedMapBuilder = lazy(() =>
  import('../components/structure/GuidedMapBuilder').then(m => ({ default: m.GuidedMapBuilder }))
);

const FullMapBuilder = lazy(() =>
  import('../components/structure/FullMapBuilder').then(m => ({ default: m.FullMapBuilder }))
);

const SessionComplete = lazy(() =>
  import('../components/complete/SessionComplete').then(m => ({ default: m.SessionComplete }))
);

const componentMap: Record<string, ComponentType<PhaseComponentProps> | null> = {
  'AnnotatableMap': AnnotatableMap,
  'GuidedMapBuilder': GuidedMapBuilder,
  'ConceptMapBuilder': FullMapBuilder,
  'SessionComplete': SessionComplete,
  'IntentSettingModal': null,
};

export function getComponent(
  componentName: string
): ComponentType<PhaseComponentProps> | null {
  return componentMap[componentName] || null;
}

export function isComponentAvailable(componentName: string): boolean {
  return componentMap[componentName] !== null;
}

export function getAvailableComponents(): string[] {
  return Object.keys(componentMap).filter(name => componentMap[name] !== null);
}
