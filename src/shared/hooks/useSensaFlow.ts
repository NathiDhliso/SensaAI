/**
 * useSensaFlow Hook
 * 
 * State machine for SENSA v2.0 5-step flow with
 * Universal Learning Equation tracking.
 * 
 * I = min(h, G × Q_f × Q_M × Q_P)
 */
import { useState, useCallback, useMemo } from 'react';
import type { SensaPhase, DependencyGraph, ValidationResult, EquationMetadata } from '@/shared/types/sensa-flow';
import type { ConceptMapData, StudySession } from '@/shared/types/learning';
import type { SubjectType } from '@/shared/types/macro-workflow';
import {
 calculateMasteryIndex,
 hasMastery,
 findWeakestVariable
} from '@/shared/constants/sensa-flow-constants';
import {
 calculateGBaseline,
 calculateTypeAwareMetrics,
 detectBlueprintMismatch,
 getTypeAwareRecommendation,
 type TypeAwareQMetrics,
 type QMetricInputs,
 type FeedbackSignal
} from '@/shared/services/blueprint-formula';
// ============================================================================
// Types
// ============================================================================
export interface SensaFlowState {
 phase: SensaPhase;
 G: number;
 Q_P: number;
 Q_M: number;
 Q_f: number;
 I: number;
 subjectType: SubjectType | undefined;
 gBaseline: number;
 typeAwareMetrics: TypeAwareQMetrics | null;
 feedbackSignal: FeedbackSignal | null;
 userGuesses: Map<string, string>;
 conceptMap: ConceptMapData | null;
 validationResult: ValidationResult | null;
 synthesisScore: number;
 flowModeCompleted: boolean;
 equationMetadata: EquationMetadata | null;
 dependencyGraph: DependencyGraph | null;
 startedAt: Date;
 completedSteps: SensaPhase[];
 timePerStep: Partial<Record<SensaPhase, number>>;
}
export interface SensaFlowActions {
 setPhase: (phase: SensaPhase) => void;
 updateG: (value: number) => void;
 updateQP: (delta: number) => void;
 updateQM: (delta: number) => void;
 updateQf: (value: number) => void;
 initializeFromClassification: (subjectType: SubjectType | undefined, confidence?: number) => void;
 updateTypeAwareMetrics: (inputs: QMetricInputs) => void;
 completeExplore: (guesses: Map<string, string>) => void;
 completeNote: (mapData: ConceptMapData, validation?: ValidationResult) => void;
 completeStudy: (reconstructionScore: number) => void;
 completeApply: (synthesisScore: number, flowModeCompleted: boolean, Q_f: number) => void;
 setEquationMetadata: (metadata: EquationMetadata) => void;
 setDependencyGraph: (graph: DependencyGraph) => void;
 reset: () => void;
 syncFromStore: (session: StudySession) => void;
}
export interface UseSensaFlowReturn extends SensaFlowState, SensaFlowActions {
 isComplete: boolean;
 hasMastered: boolean;
 weakestVariable: { variable: 'G' | 'Q_P' | 'Q_M' | 'Q_f'; value: number };
 recommendation: string;
 progressPercent: number;
 qLabels: { Q_f: string; Q_M: string; Q_P: string };
}
// ============================================================================
// Initial State
// ============================================================================
const createInitialState = (): SensaFlowState => ({
 phase: 'see',
 G: 1.0,
 Q_P: 0.0,
 Q_M: 0.0,
 Q_f: 0.0,
 I: 0.0,
 subjectType: undefined,
 gBaseline: 1.0,
 typeAwareMetrics: null,
 feedbackSignal: null,
 userGuesses: new Map(),
 conceptMap: null,
 validationResult: null,
 synthesisScore: 0,
 flowModeCompleted: false,
 equationMetadata: null,
 dependencyGraph: null,
 startedAt: new Date(),
 completedSteps: [],
 timePerStep: {}
});
// ============================================================================
// Hook
// ============================================================================
export function useSensaFlow(): UseSensaFlowReturn {
 const [state, setState] = useState<SensaFlowState>(createInitialState);
 // =========================================================================
 // Phase Transitions
 // =========================================================================
 const setPhase = useCallback((phase: SensaPhase) => {
 setState(prev => {
 // Record time for previous step
 const prevPhase = prev.phase;
 const now = new Date();
 const elapsed = (now.getTime() - prev.startedAt.getTime()) / 60000; // minutes
 return {
 ...prev,
 phase,
 completedSteps: prev.completedSteps.includes(prevPhase)
 ? prev.completedSteps
 : [...prev.completedSteps, prevPhase],
 timePerStep: {
 ...prev.timePerStep,
 [prevPhase]: elapsed
 }
 };
 });
 }, []);
 // =========================================================================
 // Equation Updates
 // =========================================================================
 const updateG = useCallback((value: number) => {
 setState(prev => {
 const G = Math.max(0, Math.min(1.5, value)); // Cap at 1.5
 const I = calculateMasteryIndex(G, prev.Q_P, prev.Q_M, prev.Q_f);
 return { ...prev, G, I };
 });
 }, []);
 const updateQP = useCallback((delta: number) => {
 setState(prev => {
 const Q_P = Math.max(0, Math.min(1, prev.Q_P + delta));
 const I = calculateMasteryIndex(prev.G, Q_P, prev.Q_M, prev.Q_f);
 return { ...prev, Q_P, I };
 });
 }, []);
 const updateQM = useCallback((delta: number) => {
 setState(prev => {
 const Q_M = Math.max(0, Math.min(1, prev.Q_M + delta));
 const I = calculateMasteryIndex(prev.G, prev.Q_P, Q_M, prev.Q_f);
 return { ...prev, Q_M, I };
 });
 }, []);
 const updateQf = useCallback((value: number) => {
 setState(prev => {
 const Q_f = Math.max(0, Math.min(1, value));
 const I = calculateMasteryIndex(prev.G, prev.Q_P, prev.Q_M, Q_f);
 return { ...prev, Q_f, I };
 });
 }, []);
 const initializeFromClassification = useCallback((subjectType: SubjectType | undefined, confidence?: number) => {
 setState(prev => {
 const gBaseline = calculateGBaseline(subjectType, confidence);
 const G = gBaseline;
 const I = calculateMasteryIndex(G, prev.Q_P, prev.Q_M, prev.Q_f);
 return { ...prev, subjectType, gBaseline, G, I };
 });
 }, []);
 const updateTypeAwareMetrics = useCallback((inputs: QMetricInputs) => {
 setState(prev => {
 const metrics = calculateTypeAwareMetrics(prev.subjectType, inputs);
 const Q_f = metrics.Q_f;
 const Q_M = metrics.Q_M;
 const Q_P = metrics.Q_P;
 const G = prev.gBaseline + (prev.feedbackSignal?.gAdjustment ?? 0);
 const I = calculateMasteryIndex(G, Q_P, Q_M, Q_f);
 const feedbackSignal = detectBlueprintMismatch(prev.subjectType, metrics, G, prev.completedSteps.length);
 return { ...prev, Q_f, Q_M, Q_P, G, I, typeAwareMetrics: metrics, feedbackSignal };
 });
 }, []);
 // =========================================================================
 // Step Completions
 // =========================================================================
 const completeExplore = useCallback((guesses: Map<string, string>) => {
 setState(prev => {
 // Guessing boosts both Q_P and Q_M
 const guessBonus = Math.min(guesses.size * 0.05, 0.25); // Up to 0.25
 const Q_P = Math.min(1, prev.Q_P + 0.2 + guessBonus);
 const Q_M = Math.min(1, prev.Q_M + 0.15 + guessBonus);
 const I = calculateMasteryIndex(prev.G, Q_P, Q_M, prev.Q_f);
 return {
 ...prev,
 userGuesses: guesses,
 Q_P,
 Q_M,
 I,
 phase: 'note' as SensaPhase,
 completedSteps: [...prev.completedSteps, 'explore']
 };
 });
 }, []);
 const completeNote = useCallback((mapData: ConceptMapData, validation?: ValidationResult) => {
 setState(prev => {
 // Map building significantly boosts Q_P and Q_M
 const nodeBonus = Math.min(mapData.nodes.length * 0.02, 0.2);
 const connBonus = Math.min(mapData.connections.length * 0.03, 0.2);
 const accuracyBonus = validation ? (validation.guessAccuracy / 100) * 0.15 : 0;
 const Q_P = Math.min(1, prev.Q_P + 0.25 + nodeBonus);
 const Q_M = Math.min(1, prev.Q_M + 0.3 + connBonus + accuracyBonus);
 const I = calculateMasteryIndex(prev.G, Q_P, Q_M, prev.Q_f);
 return {
 ...prev,
 conceptMap: mapData,
 validationResult: validation || null,
 Q_P,
 Q_M,
 I,
 phase: 'study' as SensaPhase,
 completedSteps: [...prev.completedSteps, 'note']
 };
 });
 }, []);
 const completeStudy = useCallback((reconstructionScore: number) => {
 setState(prev => {
 // Study phase finalizes Q_P and Q_M before synthesis
 const studyBonus = reconstructionScore * 0.25;
 const Q_P = Math.min(1, prev.Q_P + studyBonus);
 const Q_M = Math.min(1, prev.Q_M + studyBonus);
 const I = calculateMasteryIndex(prev.G, Q_P, Q_M, prev.Q_f);
 return {
 ...prev,
 Q_P,
 Q_M,
 I,
 phase: 'apply' as SensaPhase,
 completedSteps: [...prev.completedSteps, 'study']
 };
 });
 }, []);
 const completeApply = useCallback((synthesisScore: number, flowModeCompleted: boolean, Q_f: number) => {
 setState(prev => {
 const I = calculateMasteryIndex(prev.G, prev.Q_P, prev.Q_M, Q_f);
 return {
 ...prev,
 synthesisScore,
 flowModeCompleted,
 Q_f,
 I,
 phase: 'complete' as SensaPhase,
 completedSteps: [...prev.completedSteps, 'apply']
 };
 });
 }, []);
 // =========================================================================
 // Metadata Setters
 // =========================================================================
 const setEquationMetadata = useCallback((metadata: EquationMetadata) => {
 setState(prev => ({ ...prev, equationMetadata: metadata }));
 }, []);
 const setDependencyGraph = useCallback((graph: DependencyGraph) => {
 setState(prev => ({ ...prev, dependencyGraph: graph }));
 }, []);
 // =========================================================================
 // Utilities
 // =========================================================================
 const reset = useCallback(() => {
 setState(createInitialState());
 }, []);
 const syncFromStore = useCallback((studySession: StudySession) => {
 if (!studySession) return;
 setState(prev => {
 let phase: SensaPhase = 'see';
 const completedSteps: SensaPhase[] = [];
 // 1. Explore Phase logic
 if (studySession.scouted || studySession.previewed) {
 if (!completedSteps.includes('see')) completedSteps.push('see');
 phase = 'explore';
 }
 // 2. Note Phase logic
 // If we have previewed, we are theoretically ready for Note
 if (studySession.previewed) {
 // If we finished explore, mark it
 if (!completedSteps.includes('explore')) completedSteps.push('explore');
 phase = 'note';
 }
 // 3. Study Phase logic
 if (studySession.mapBuilt) {
 if (!completedSteps.includes('note')) completedSteps.push('note');
 phase = 'study';
 }
 // 4. Apply Phase logic
 if (studySession.mapReconstructed) {
 if (!completedSteps.includes('study')) completedSteps.push('study');
 phase = 'apply';
 }
 // 5. Complete Phase logic
 if (studySession.mastered) {
 if (!completedSteps.includes('apply')) completedSteps.push('apply');
 phase = 'complete';
 }
 // Only update if changes found to avoid loops
 if (prev.phase === phase && prev.completedSteps.length === completedSteps.length) {
 return prev;
 }
 return {
 ...prev,
 phase,
 completedSteps
 };
 });
 }, []);
 // =========================================================================
 // Computed Properties
 // =========================================================================
 const isComplete = state.phase === 'complete';
 const hasMastered = hasMastery(state.I);
 const weakestVariable = useMemo(() =>
 findWeakestVariable(state.G, state.Q_P, state.Q_M, state.Q_f),
 [state.G, state.Q_P, state.Q_M, state.Q_f]
 );
 const recommendation = useMemo(() => {
 if (state.typeAwareMetrics) {
 return getTypeAwareRecommendation(state.subjectType, weakestVariable.variable, state.typeAwareMetrics);
 }
 const recs: Record<string, string> = {
 G: 'Improve your learning environment and focus.',
 Q_P: 'Revisit the Explore phase to better understand structure.',
 Q_M: 'Rebuild your concept map with more connections.',
 Q_f: 'Practice more with Flow Mode speed drills.'
 };
 return recs[weakestVariable.variable];
 }, [weakestVariable, state.typeAwareMetrics, state.subjectType]);
 const qLabels = useMemo(() => {
 if (state.typeAwareMetrics) return state.typeAwareMetrics.labels;
 return { Q_f: 'Flow Quality', Q_M: 'Mastery Quality', Q_P: 'Practice Quality' };
 }, [state.typeAwareMetrics]);
 const progressPercent = useMemo(() => {
 const phaseOrder: SensaPhase[] = ['see', 'explore', 'note', 'study', 'apply', 'complete'];
 const currentIndex = phaseOrder.indexOf(state.phase);
 return ((currentIndex + 1) / phaseOrder.length) * 100;
 }, [state.phase]);
 // =========================================================================
 // Return
 // =========================================================================
 return {
 ...state,
 setPhase,
 updateG,
 updateQP,
 updateQM,
 updateQf,
 initializeFromClassification,
 updateTypeAwareMetrics,
 completeExplore,
 completeNote,
 completeStudy,
 completeApply,
 setEquationMetadata,
 setDependencyGraph,
 reset,
 syncFromStore,
 isComplete,
 hasMastered,
 weakestVariable,
 recommendation,
 progressPercent,
 qLabels
 };
}
export default useSensaFlow;
