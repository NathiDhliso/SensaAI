/**
 * useSensaFlow Hook
 * 
 * State machine for SENSA v2.0 5-step flow with
 * Learning Health Equation tracking.
 * 
 * I = min(h, Q_k × Q_r × Q_c × Q_f × Q_p)
 * Measures ONLY the learner — not the AI, not the platform.
 */
import { useState, useCallback, useMemo } from 'react';
import type { SensaPhase, DependencyGraph, ValidationResult, EquationMetadata } from '@/shared/types/sensa-flow';
import type { ConceptMapData, StudySession, LearnerMood } from '@/shared/types/learning';
import { MOOD_H_MAP } from '@/shared/types/learning';
import type { SubjectType } from '@/shared/types/macro-workflow';
import {
    calculateHealthIndex,
    hasHealthyLearning,
    findWeakestVariable,
    type HealthVariable
} from '@/shared/constants/sensa-flow-constants';
import {
    calculateLearnerMetrics,
    detectBlueprintMismatch,
    getLearnerRecommendation,
    type LearnerQMetrics,
    type QMetricInputs,
    type FeedbackSignal
} from '@/shared/services/blueprint-formula';
// ============================================================================
// Types
// ============================================================================
export interface SensaFlowState {
    phase: SensaPhase;
    /** Mood-dependent cognitive bandwidth ceiling (0.4–1.0) */
    h: number;
    /** Prior knowledge alignment (0–1) */
    Q_k: number;
    /** Recall quality (0–1) */
    Q_r: number;
    /** Connection quality (0–1) */
    Q_c: number;
    /** Frequency/spacing quality (0–1) */
    Q_f: number;
    /** Process quality — learning loop fidelity (0–1) */
    Q_p: number;
    /** Learning health index (0–1) */
    I: number;
    subjectType: SubjectType | undefined;
    learnerMetrics: LearnerQMetrics | null;
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
    /** Set h from mood selection at session start */
    initializeH: (mood: LearnerMood) => void;
    updateQk: (delta: number) => void;
    updateQr: (delta: number) => void;
    updateQc: (delta: number) => void;
    updateQf: (value: number) => void;
    updateQp: (delta: number) => void;
    initializeSubjectType: (subjectType: SubjectType | undefined) => void;
    updateLearnerMetrics: (inputs: QMetricInputs) => void;
    completeExplore: (guesses: Map<string, string>) => void;
    completeNote: (mapData: ConceptMapData, validation?: ValidationResult) => void;
    completeStudy: (reconstructionScore: number) => void;
    completeApply: (synthesisScore: number, flowModeCompleted: boolean, Q_f: number) => void;
    setEquationMetadata: (metadata: EquationMetadata) => void;
    setDependencyGraph: (graph: DependencyGraph) => void;
    reset: () => void;
    syncFromStore: (session: StudySession) => void;
    // Deprecated — kept for migration compatibility
    /** @deprecated Use initializeH instead */
    updateG: (value: number) => void;
    /** @deprecated Use updateQp instead */
    updateQP: (delta: number) => void;
    /** @deprecated Use updateQr instead */
    updateQM: (delta: number) => void;
    /** @deprecated Use initializeSubjectType instead */
    initializeFromClassification: (subjectType: SubjectType | undefined, confidence?: number) => void;
    /** @deprecated Use updateLearnerMetrics instead */
    updateTypeAwareMetrics: (inputs: QMetricInputs) => void;
}
export interface UseSensaFlowReturn extends SensaFlowState, SensaFlowActions {
    isComplete: boolean;
    hasHealthyState: boolean;
    weakestVariable: { variable: HealthVariable; value: number };
    recommendation: string;
    progressPercent: number;
    qLabels: { Q_k: string; Q_r: string; Q_c: string; Q_f: string; Q_p: string };
    // Deprecated computed properties — kept for migration
    /** @deprecated Use hasHealthyState instead */
    hasMastered: boolean;
    /** @deprecated G is no longer in the learner equation */
    G: number;
    /** @deprecated Use Q_p instead */
    Q_P: number;
    /** @deprecated Use Q_r instead */
    Q_M: number;
    /** @deprecated */
    gBaseline: number;
    /** @deprecated Use learnerMetrics instead */
    typeAwareMetrics: LearnerQMetrics | null;
}
// ============================================================================
// Initial State
// ============================================================================
const createInitialState = (): SensaFlowState => ({
    phase: 'see',
    h: 1.0, // Will be set from mood on session start
    Q_k: 0.0,
    Q_r: 0.0,
    Q_c: 0.0,
    Q_f: 0.0,
    Q_p: 0.0,
    I: 0.0,
    subjectType: undefined,
    learnerMetrics: null,
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

/** Recalculate I from all current Q variables */
function recalcI(s: SensaFlowState): number {
    return calculateHealthIndex({ h: s.h, Q_k: s.Q_k, Q_r: s.Q_r, Q_c: s.Q_c, Q_f: s.Q_f, Q_p: s.Q_p });
}

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
            const prevPhase = prev.phase;
            const now = new Date();
            const elapsed = (now.getTime() - prev.startedAt.getTime()) / 60000;
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
    // Equation Updates — all learner-only
    // =========================================================================
    const initializeH = useCallback((mood: LearnerMood) => {
        setState(prev => {
            const h = MOOD_H_MAP[mood] ?? 1.0;
            const next = { ...prev, h };
            return { ...next, I: recalcI(next) };
        });
    }, []);
    const updateQk = useCallback((delta: number) => {
        setState(prev => {
            const Q_k = Math.max(0, Math.min(1, prev.Q_k + delta));
            const next = { ...prev, Q_k };
            return { ...next, I: recalcI(next) };
        });
    }, []);
    const updateQr = useCallback((delta: number) => {
        setState(prev => {
            const Q_r = Math.max(0, Math.min(1, prev.Q_r + delta));
            const next = { ...prev, Q_r };
            return { ...next, I: recalcI(next) };
        });
    }, []);
    const updateQc = useCallback((delta: number) => {
        setState(prev => {
            const Q_c = Math.max(0, Math.min(1, prev.Q_c + delta));
            const next = { ...prev, Q_c };
            return { ...next, I: recalcI(next) };
        });
    }, []);
    const updateQf = useCallback((value: number) => {
        setState(prev => {
            const Q_f = Math.max(0, Math.min(1, value));
            const next = { ...prev, Q_f };
            return { ...next, I: recalcI(next) };
        });
    }, []);
    const updateQp = useCallback((delta: number) => {
        setState(prev => {
            const Q_p = Math.max(0, Math.min(1, prev.Q_p + delta));
            const next = { ...prev, Q_p };
            return { ...next, I: recalcI(next) };
        });
    }, []);
    const initializeSubjectType = useCallback((subjectType: SubjectType | undefined) => {
        setState(prev => ({ ...prev, subjectType }));
    }, []);
    const updateLearnerMetrics = useCallback((inputs: QMetricInputs) => {
        setState(prev => {
            const metrics = calculateLearnerMetrics(prev.subjectType, inputs);
            const next = { ...prev, ...metrics, learnerMetrics: metrics };
            const feedbackSignal = detectBlueprintMismatch(prev.subjectType, metrics, prev.completedSteps.length);
            return { ...next, I: recalcI(next), feedbackSignal };
        });
    }, []);
    // =========================================================================
    // Step Completions
    // =========================================================================
    const completeExplore = useCallback((guesses: Map<string, string>) => {
        setState(prev => {
            const Q_p = Math.min(1, prev.Q_p + 0.1);
            const next = { ...prev, Q_p, userGuesses: guesses };
            return {
                ...next,
                I: recalcI(next),
                phase: 'note' as SensaPhase,
                completedSteps: [...prev.completedSteps, 'explore']
            };
        });
    }, []);
    const completeNote = useCallback((mapData: ConceptMapData, validation?: ValidationResult) => {
        setState(prev => {
            const Q_p = Math.min(1, prev.Q_p + 0.1);
            const next = { ...prev, Q_p, conceptMap: mapData, validationResult: validation || null };
            return {
                ...next,
                I: recalcI(next),
                phase: 'study' as SensaPhase,
                completedSteps: [...prev.completedSteps, 'note']
            };
        });
    }, []);
    const completeStudy = useCallback((_reconstructionScore: number) => {
        setState(prev => {
            const Q_p = Math.min(1, prev.Q_p + 0.1);
            const next = { ...prev, Q_p };
            return {
                ...next,
                I: recalcI(next),
                phase: 'apply' as SensaPhase,
                completedSteps: [...prev.completedSteps, 'study']
            };
        });
    }, []);
    const completeApply = useCallback((synthesisScore: number, flowModeCompleted: boolean, _Q_f: number) => {
        setState(prev => {
            const Q_p = Math.min(1, prev.Q_p + 0.1);
            const next = { ...prev, Q_p, synthesisScore, flowModeCompleted };
            return {
                ...next,
                I: recalcI(next),
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
            if (studySession.scouted || studySession.previewed) {
                if (!completedSteps.includes('see')) completedSteps.push('see');
                phase = 'explore';
            }
            if (studySession.previewed) {
                if (!completedSteps.includes('explore')) completedSteps.push('explore');
                phase = 'note';
            }
            if (studySession.mapBuilt) {
                if (!completedSteps.includes('note')) completedSteps.push('note');
                phase = 'study';
            }
            if (studySession.mapReconstructed) {
                if (!completedSteps.includes('study')) completedSteps.push('study');
                phase = 'apply';
            }
            if (studySession.mastered) {
                if (!completedSteps.includes('apply')) completedSteps.push('apply');
                phase = 'complete';
            }

            // Restore persisted equation values (survive refresh)
            const eq = studySession.equation;
            const equationUpdate = eq ? {
                h: eq.h,
                Q_k: eq.Q_k,
                Q_r: eq.Q_r,
                Q_c: eq.Q_c,
                Q_f: eq.Q_f,
                Q_p: eq.Q_p,
                I: eq.I
            } : {};

            // Restore concept map data if available
            const mapUpdate = studySession.conceptMap ? {
                conceptMap: studySession.conceptMap
            } : {};

            const conceptMapUnchanged = !studySession.conceptMap || prev.conceptMap === studySession.conceptMap;
            if (
                prev.phase === phase &&
                prev.completedSteps.length === completedSteps.length &&
                conceptMapUnchanged &&
                (!eq || (prev.h === eq.h && prev.Q_k === eq.Q_k && prev.Q_r === eq.Q_r && prev.Q_c === eq.Q_c && prev.Q_f === eq.Q_f && prev.Q_p === eq.Q_p && prev.I === eq.I))
            ) {
                return prev;
            }
            return {
                ...prev,
                ...equationUpdate,
                ...mapUpdate,
                phase,
                completedSteps
            };
        });
    }, []);
    // =========================================================================
    // Deprecated actions — kept for compilation, map to new API
    // =========================================================================
    const updateG = useCallback((_value: number) => {
        // G is no longer part of the learner equation. No-op.
    }, []);
    const updateQP = useCallback((delta: number) => { updateQp(delta); }, [updateQp]);
    const updateQM = useCallback((delta: number) => { updateQr(delta); }, [updateQr]);
    const initializeFromClassification = useCallback((subjectType: SubjectType | undefined, _confidence?: number) => {
        initializeSubjectType(subjectType);
    }, [initializeSubjectType]);
    const updateTypeAwareMetrics = useCallback((inputs: QMetricInputs) => {
        updateLearnerMetrics(inputs);
    }, [updateLearnerMetrics]);
    // =========================================================================
    // Computed Properties
    // =========================================================================
    const isComplete = state.phase === 'complete';
    const hasHealthyState = hasHealthyLearning(state.I);
    const hasMastered = hasHealthyState; // deprecated alias
    const weakestVariable = useMemo(() =>
        findWeakestVariable(state.Q_k, state.Q_r, state.Q_c, state.Q_f, state.Q_p),
        [state.Q_k, state.Q_r, state.Q_c, state.Q_f, state.Q_p]
    );
    const recommendation = useMemo(() => {
        if (state.learnerMetrics) {
            return getLearnerRecommendation(state.subjectType, weakestVariable.variable, state.learnerMetrics);
        }
        const recs: Record<HealthVariable, string> = {
            Q_k: 'Preview the concepts and make predictions before diving in.',
            Q_r: 'Practice recalling from memory without prompts.',
            Q_c: 'Add more connections between concepts in your map.',
            Q_f: 'Return to review concepts you learned before starting new ones.',
            Q_p: 'Complete each learning phase fully instead of skipping ahead.'
        };
        return recs[weakestVariable.variable];
    }, [weakestVariable, state.learnerMetrics, state.subjectType]);
    const qLabels = useMemo(() => {
        if (state.learnerMetrics) return state.learnerMetrics.labels;
        return {
            Q_k: 'Prior Knowledge',
            Q_r: 'Recall Quality',
            Q_c: 'Connection Quality',
            Q_f: 'Spacing Quality',
            Q_p: 'Process Quality'
        };
    }, [state.learnerMetrics]);
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
        // New API
        setPhase,
        initializeH,
        updateQk,
        updateQr,
        updateQc,
        updateQf,
        updateQp,
        initializeSubjectType,
        updateLearnerMetrics,
        completeExplore,
        completeNote,
        completeStudy,
        completeApply,
        setEquationMetadata,
        setDependencyGraph,
        reset,
        syncFromStore,
        // Deprecated API (for migration)
        updateG,
        updateQP,
        updateQM,
        initializeFromClassification,
        updateTypeAwareMetrics,
        // Computed
        isComplete,
        hasHealthyState,
        hasMastered,
        weakestVariable,
        recommendation,
        progressPercent,
        qLabels,
        // Deprecated computed properties
        G: 1.0, // G is no longer tracked, default to 1.0
        Q_P: state.Q_p,
        Q_M: state.Q_r,
        gBaseline: 1.0,
        typeAwareMetrics: state.learnerMetrics
    };
}
export default useSensaFlow;
