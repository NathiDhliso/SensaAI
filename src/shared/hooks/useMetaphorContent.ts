/**
 * useMetaphorContent Hook
 * 
 * Filters and adapts learning content based on user metaphor preferences.
 * Reduces cognitive load by showing only the content types the user prefers.
 */
import { useMemo } from 'react';
import { usePersonalizationStore } from '@/store/personalization-store';
import type { LearningConcept } from '@/shared/types/learning';
interface AdaptedContent {
 /** Core explanation - always shown */
 coreExplanation: string | null;
 /** Analogical explanation - controlled by showAnalogies */
 analogicalModel: string | null;
 /** Hook sentence - fallback content */
 hookSentence: string | null;
 /** Whether metaphors are enabled */
 metaphorsEnabled: boolean;
 /** Complexity level for metaphors */
 metaphorComplexity: 'simple' | 'rich';
}
/**
 * Adapts concept content based on user metaphor preferences
 */
export function useMetaphorContent(concept: LearningConcept | null): AdaptedContent {
 const { metaphorSettings } = usePersonalizationStore();
 return useMemo(() => {
 if (!concept) {
 return {
 coreExplanation: null,
 analogicalModel: null,
 hookSentence: null,
 metaphorsEnabled: false,
 metaphorComplexity: 'simple'
 };
 }
 const {
 showAnalogies,
 metaphorComplexity
 } = metaphorSettings;
 // Core explanation (always shown) - priority order
 const coreExplanation = 
 concept.shape?.simpleCore || 
 concept.hookSentence || 
 concept.whyYouNeed || 
 null;
 // Visual anchor (emoji/icon) - only if enabled
 
 // Analogical model - only if enabled and complexity matches
 let analogicalModel: string | null = null;
 if (showAnalogies && concept.shape?.analogicalModel) {
 if (metaphorComplexity === 'simple') {
 // For simple complexity, try to extract just the core metaphor
 const fullAnalogy = concept.shape.analogicalModel;
 // Look for patterns like "Think of X like Y:" and extract the Y part
 const simpleMatch = fullAnalogy.match(/think of .+ like (.+?)[:\.]/i);
 analogicalModel = simpleMatch ? simpleMatch[1] : fullAnalogy;
 } else {
 // Rich complexity - show full analogical model
 analogicalModel = concept.shape.analogicalModel;
 }
 }
 // Hook sentence as fallback
 const hookSentence = concept.hookSentence || null;
 return {
 coreExplanation,
 analogicalModel,
 hookSentence,
 metaphorsEnabled: showAnalogies,
 metaphorComplexity
 };
 }, [concept, metaphorSettings]);
}
/**
 * Formats content for display based on metaphor preferences
 */
export function useFormattedContent(concept: LearningConcept | null): {
 primaryText: string;
 secondaryText: string | null;
 visualElement: string | null;
 hasMetaphors: boolean;
} {
 const adaptedContent = useMetaphorContent(concept);
 return useMemo(() => {
 const {
 coreExplanation,
 analogicalModel,
 hookSentence,
 metaphorsEnabled
 } = adaptedContent;
 // Primary text - always the core explanation
 const primaryText = coreExplanation || hookSentence || 'No content available';
 // Secondary text - analogical model if enabled
 const secondaryText = analogicalModel;
 // Visual element - anchor if enabled
 const visualElement = visualAnchor;
 return {
 primaryText,
 secondaryText,
 hasMetaphors: metaphorsEnabled && !!analogicalModel
 };
 }, [adaptedContent]);
}
/**
 * Hook for components that need to know if they should show metaphor-related UI
 */
export function useMetaphorSettings() {
 const { metaphorSettings, updateMetaphorSettings, trackMetaphorUsage } = usePersonalizationStore();
 return {
 settings: metaphorSettings,
 updateSettings: updateMetaphorSettings,
 trackUsage: trackMetaphorUsage,
 isEnabled: metaphorSettings.metaphorSettings.showAnalogies
 };
}