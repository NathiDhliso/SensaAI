/**
 * Learning Health Formula Service
 *
 * Computes the 5 learner-only Q variables that feed the Learning Health Equation:
 * I = min(h, Q_k × Q_r × Q_c × Q_f × Q_p)
 *
 * Every signal measured here is about THE LEARNER — not the AI, not the platform.
 * Subject-type awareness adapts the *labels* and *weights*, not the intent.
 */
import type { SubjectType } from '@/shared/types/macro-workflow';
import type { HealthVariable } from '@/shared/constants/sensa-flow-constants';

// ============================================================================
// Inputs — all signals are learner-observable
// ============================================================================

export type QMetricInputs = {
    // Prior knowledge & prediction signals (Q_k)
    completedConcepts: number;
    totalConcepts: number;
    guessCount: number; // predictions made during Scout phase

    // Recall signals (Q_r)
    blankSheetScore: number;
    quizAccuracy: number;

    // Connection signals (Q_c)
    mapNodeCount: number;
    mapConnectionCount: number;

    // Process signals (Q_p)
    consecutiveCorrect: number;
    consecutiveErrors: number;
    cycleCompletions: number;
    timeSpentMs: number;
    targetDurationMs: number;

    // Spacing signals (Q_f)
    avgResponseTimeMs: number;
};

// ============================================================================
// Output — 5 learner-only Q variables
// ============================================================================

export type LearnerQMetrics = {
    Q_k: number;
    Q_r: number;
    Q_c: number;
    Q_f: number;
    Q_p: number;
    labels: {
        Q_k: string;
        Q_r: string;
        Q_c: string;
        Q_f: string;
        Q_p: string;
    };
};

/** @deprecated Use LearnerQMetrics instead */
export type TypeAwareQMetrics = {
    Q_f: number;
    Q_M: number;
    Q_P: number;
    labels: {
        Q_f: string;
        Q_M: string;
        Q_P: string;
    };
};

// ============================================================================
// Clamping Utility
// ============================================================================

function clamp(v: number): number {
    return Math.max(0, Math.min(1, v));
}

// ============================================================================
// Subject-Type-Aware Q Calculation
// ============================================================================

function calculateProceduralQ(inputs: QMetricInputs): LearnerQMetrics {
    const completionRate = inputs.totalConcepts > 0
        ? inputs.completedConcepts / inputs.totalConcepts : 0;

    // Q_k: Prior knowledge — how well the learner's existing knowledge aligns
    const predictionAccuracy = inputs.guessCount > 0
        ? clamp(inputs.guessCount * 0.15) : 0.3; // baseline if no predictions yet
    const Q_k = clamp(predictionAccuracy * 0.6 + completionRate * 0.4);

    // Q_r: Recall — genuine unprompted retrieval quality
    const Q_r = clamp(inputs.blankSheetScore * 0.6 + inputs.quizAccuracy * 0.4);

    // Q_c: Connection — concept linking quality
    const connectionDensity = inputs.mapNodeCount > 0
        ? clamp(inputs.mapConnectionCount / Math.max(1, inputs.mapNodeCount * 2)) : 0;
    const Q_c = clamp(connectionDensity * 0.7 + completionRate * 0.3);

    // Q_f: Spacing — for now, use response time improvement as a proxy
    // (full spacing engine integration is a future enhancement)
    const latencyFactor = inputs.avgResponseTimeMs > 0
        ? clamp(1 - (inputs.avgResponseTimeMs / 30000)) : 0.5;
    const continuity = inputs.consecutiveCorrect / Math.max(1, inputs.completedConcepts);
    const Q_f = clamp(latencyFactor * 0.4 + continuity * 0.6);

    // Q_p: Process — learning loop fidelity (Test→Encode→Verify completion)
    const handsOnRatio = inputs.timeSpentMs > 0
        ? Math.min(1, inputs.timeSpentMs / inputs.targetDurationMs) : 0;
    const errorPenalty = inputs.consecutiveErrors > 0
        ? clamp(1 - inputs.consecutiveErrors * 0.15) : 1.0;
    const Q_p = clamp(handsOnRatio * 0.5 + errorPenalty * 0.3 + (inputs.cycleCompletions > 0 ? 0.2 : 0));

    return {
        Q_k, Q_r, Q_c, Q_f, Q_p,
        labels: {
            Q_k: 'Baseline Alignment',
            Q_r: 'Checkpoint Recall',
            Q_c: 'Stage Linking',
            Q_f: 'Repetition Quality',
            Q_p: 'Step Completion'
        }
    };
}

function calculateConceptualQ(inputs: QMetricInputs): LearnerQMetrics {
    const completionRate = inputs.totalConcepts > 0
        ? inputs.completedConcepts / inputs.totalConcepts : 0;

    // Q_k: Prior knowledge — predictions and context recognition
    const predictionAccuracy = inputs.guessCount > 0
        ? clamp(inputs.guessCount * 0.12) : 0.3;
    const Q_k = clamp(predictionAccuracy * 0.5 + completionRate * 0.5);

    // Q_r: Recall — transfer recognition from blank sheet and novel scenarios
    const Q_r = clamp(inputs.blankSheetScore * 0.7 + inputs.quizAccuracy * 0.3);

    // Q_c: Connection — cross-concept transfer and linking
    const transferRate = inputs.mapConnectionCount > 0
        ? clamp(inputs.mapConnectionCount / Math.max(1, inputs.totalConcepts)) : 0;
    const Q_c = clamp(transferRate * 0.6 + completionRate * 0.4);

    // Q_f: Spacing — move fluency and context switching
    const contextSwitch = inputs.consecutiveErrors === 0
        ? 1.0 : clamp(1 - inputs.consecutiveErrors * 0.15);
    const Q_f = clamp(inputs.quizAccuracy * 0.5 + contextSwitch * 0.5);

    // Q_p: Process — case work completion fidelity
    const caseWork = completionRate;
    const reflectionDepth = inputs.guessCount > 0 ? clamp(inputs.guessCount * 0.1) : 0;
    const Q_p = clamp(caseWork * 0.6 + reflectionDepth * 0.4);

    return {
        Q_k, Q_r, Q_c, Q_f, Q_p,
        labels: {
            Q_k: 'Context Recognition',
            Q_r: 'Transfer Recall',
            Q_c: 'Move Linking',
            Q_f: 'Move Fluency',
            Q_p: 'Case Completion'
        }
    };
}

function calculateCyclicQ(inputs: QMetricInputs): LearnerQMetrics {
    const completionRate = inputs.totalConcepts > 0
        ? inputs.completedConcepts / inputs.totalConcepts : 0;

    // Q_k: Prior knowledge — baseline confidence going into cycles
    const Q_k = clamp(completionRate * 0.5 + (inputs.guessCount > 0 ? 0.3 : 0.2) + (inputs.consecutiveCorrect > 0 ? 0.2 : 0));

    // Q_r: Recall — insight per cycle
    const Q_r = clamp(inputs.blankSheetScore * 0.5 + inputs.quizAccuracy * 0.5);

    // Q_c: Connection — loop quality and topology
    const loopQuality = inputs.mapConnectionCount > 0
        ? clamp(inputs.mapConnectionCount / Math.max(1, inputs.mapNodeCount * 1.5)) : 0;
    const Q_c = clamp(loopQuality * 0.6 + completionRate * 0.4);

    // Q_f: Spacing — cycle momentum
    const cycleRate = inputs.cycleCompletions > 0
        ? clamp(inputs.cycleCompletions / Math.max(1, inputs.totalConcepts * 0.3)) : 0;
    const momentum = inputs.consecutiveCorrect > 0
        ? clamp(inputs.consecutiveCorrect * 0.15) : 0;
    const Q_f = clamp(cycleRate * 0.5 + momentum * 0.5);

    // Q_p: Process — full cycle execution
    const fullCycles = completionRate;
    const Q_p = clamp(fullCycles * 0.5 + loopQuality * 0.5);

    return {
        Q_k, Q_r, Q_c, Q_f, Q_p,
        labels: {
            Q_k: 'Cycle Readiness',
            Q_r: 'Insight per Cycle',
            Q_c: 'Loop Topology',
            Q_f: 'Cycle Momentum',
            Q_p: 'Loop Execution'
        }
    };
}

function calculatePerceptualQ(inputs: QMetricInputs): LearnerQMetrics {
    const completionRate = inputs.totalConcepts > 0
        ? inputs.completedConcepts / inputs.totalConcepts : 0;

    // Q_k: Prior knowledge — pattern recognition baseline
    const Q_k = clamp(completionRate * 0.4 + (inputs.guessCount > 0 ? 0.3 : 0.2) + (inputs.consecutiveCorrect > 3 ? 0.3 : inputs.consecutiveCorrect * 0.1));

    // Q_r: Recall — discrimination accuracy
    const Q_r = clamp(inputs.quizAccuracy * 0.5 + inputs.blankSheetScore * 0.5);

    // Q_c: Connection — perceptual depth, exposure to patterns
    const exposureRate = completionRate;
    const Q_c = clamp(exposureRate * 0.5 + (inputs.mapConnectionCount > 0 ? clamp(inputs.mapConnectionCount / Math.max(1, inputs.mapNodeCount * 1.5)) : 0) * 0.5);

    // Q_f: Spacing — latency improvement
    const latencyImprovement = inputs.avgResponseTimeMs > 0
        ? clamp(1 - (inputs.avgResponseTimeMs / 30000)) : 0;
    const Q_f = clamp(latencyImprovement * 0.5 + completionRate * 0.5);

    // Q_p: Process — drill completion and feedback integration
    const drillCount = completionRate;
    const feedbackIntegration = inputs.consecutiveCorrect > 0
        ? clamp(inputs.consecutiveCorrect * 0.12) : 0;
    const Q_p = clamp(drillCount * 0.5 + feedbackIntegration * 0.5);

    return {
        Q_k, Q_r, Q_c, Q_f, Q_p,
        labels: {
            Q_k: 'Pattern Baseline',
            Q_r: 'Discrimination Accuracy',
            Q_c: 'Pattern Linking',
            Q_f: 'Pattern Exposure',
            Q_p: 'Perception Drills'
        }
    };
}

// ============================================================================
// Public API
// ============================================================================

export function calculateLearnerMetrics(
    subjectType: SubjectType | undefined,
    inputs: QMetricInputs
): LearnerQMetrics {
    switch (subjectType) {
        case 'procedural': return calculateProceduralQ(inputs);
        case 'conceptual': return calculateConceptualQ(inputs);
        case 'cyclic': return calculateCyclicQ(inputs);
        case 'perceptual': return calculatePerceptualQ(inputs);
        default: return calculateProceduralQ(inputs);
    }
}

/** @deprecated Use calculateLearnerMetrics instead */
export function calculateTypeAwareMetrics(
    subjectType: SubjectType | undefined,
    inputs: QMetricInputs
): TypeAwareQMetrics {
    const learner = calculateLearnerMetrics(subjectType, inputs);
    // Map new vars back to old shape for legacy callers
    return {
        Q_f: learner.Q_f,
        Q_M: learner.Q_r, // Q_r is closest to old Q_M
        Q_P: learner.Q_p, // Q_p is closest to old Q_P
        labels: {
            Q_f: learner.labels.Q_f,
            Q_M: learner.labels.Q_r,
            Q_P: learner.labels.Q_p
        }
    };
}

// ============================================================================
// Learner Recommendations (all actionable by the learner)
// ============================================================================

export function getLearnerRecommendation(
    subjectType: SubjectType | undefined,
    weakestVar: HealthVariable,
    metrics: LearnerQMetrics
): string {
    const label = metrics.labels[weakestVar];

    const recs: Record<SubjectType, Record<HealthVariable, string>> = {
        procedural: {
            Q_k: `Your ${label} could improve. Before diving into new material, preview the concept list and make predictions.`,
            Q_r: `Your ${label} is low. Practice recalling without prompts — try the Blank Sheet test.`,
            Q_c: `Your ${label} needs work. Focus on linking stages together in your concept map, not just listing them.`,
            Q_f: `Your ${label} is low. Review concepts you've already seen before learning new ones.`,
            Q_p: `Your ${label} is low. Complete all three phases (Test → Encode → Verify) without skipping.`
        },
        conceptual: {
            Q_k: `Your ${label} could improve. Spend more time in the Scout phase predicting how concepts relate.`,
            Q_r: `Your ${label} is low. Practice applying different moves to varied scenarios from memory.`,
            Q_c: `Your ${label} needs work. Focus on recognising which move fits which situation and linking across concepts.`,
            Q_f: `Your ${label} is low. Practice switching between concepts to strengthen adaptive recall.`,
            Q_p: `Your ${label} is low. Work through more case studies and complete each application pattern fully.`
        },
        cyclic: {
            Q_k: `Your ${label} could improve. Review where you are in the cycle before starting a new iteration.`,
            Q_r: `Your ${label} is low. At each cycle end, reflect on what changed — quality over speed.`,
            Q_c: `Your ${label} needs work. Map the connections between cycle phases, not just the content.`,
            Q_f: `Your ${label} is low. Focus on completing full cycles rather than partial ones.`,
            Q_p: `Your ${label} is low. Execute more complete loops and track your improvement each time.`
        },
        perceptual: {
            Q_k: `Your ${label} could improve. Before drills, preview the pattern categories you'll encounter.`,
            Q_r: `Your ${label} is low. Practice distinguishing between similar cases without hints.`,
            Q_c: `Your ${label} needs work. Link similar patterns together and note what makes each unique.`,
            Q_f: `Your ${label} is low. Increase your exposure to examples — repetition builds perception.`,
            Q_p: `Your ${label} is low. Do more deliberate perception drills with immediate feedback.`
        }
    };

    const type = subjectType ?? 'procedural';
    return recs[type][weakestVar] ?? 'Keep practicing to improve your weakest area.';
}

/** @deprecated Use getLearnerRecommendation instead */
export function getTypeAwareRecommendation(
    subjectType: SubjectType | undefined,
    weakestVar: 'G' | 'Q_P' | 'Q_M' | 'Q_f',
    _metrics: TypeAwareQMetrics
): string {
    // Map old variable names to new ones for backwards compatibility
    const varMap: Record<string, HealthVariable> = {
        'G': 'Q_k', // G was closest to platform, but map to Q_k as fallback
        'Q_P': 'Q_p',
        'Q_M': 'Q_r',
        'Q_f': 'Q_f'
    };
    const newVar = varMap[weakestVar] ?? 'Q_k';
    const learnerMetrics = {
        Q_k: 0.5, Q_r: _metrics.Q_M, Q_c: 0.5, Q_f: _metrics.Q_f, Q_p: _metrics.Q_P,
        labels: { Q_k: 'Prior Knowledge', Q_r: _metrics.labels.Q_M, Q_c: 'Connections', Q_f: _metrics.labels.Q_f, Q_p: _metrics.labels.Q_P }
    };
    return getLearnerRecommendation(subjectType, newVar, learnerMetrics);
}

// ============================================================================
// Feedback Signals (kept for blueprint mismatch detection)
// ============================================================================

export type FeedbackSignal = {
    isStrugglingWithBlueprint: boolean;
    gAdjustment: number;
    suggestion: string | null;
    confidence: number;
};

export function detectBlueprintMismatch(
    subjectType: SubjectType | undefined,
    metrics: LearnerQMetrics,
    sessionCount: number
): FeedbackSignal {
    if (!subjectType || sessionCount < 2) {
        return { isStrugglingWithBlueprint: false, gAdjustment: 0, suggestion: null, confidence: 0 };
    }

    const avgQ = (metrics.Q_k + metrics.Q_r + metrics.Q_c + metrics.Q_f + metrics.Q_p) / 5;
    const effort = metrics.Q_p;

    if (avgQ < 0.3 && effort > 0.5) {
        const suggestions: Record<SubjectType, string> = {
            procedural: 'Your learning signals suggest this might not be a purely procedural subject. Consider if the concepts require more flexible application patterns.',
            conceptual: 'Low transfer rates suggest this subject might have a more structured sequence than expected. Consider a procedural or cyclic approach.',
            cyclic: 'Cycle completion is low despite effort. This subject may not have a natural iterative loop — consider procedural or perceptual approaches.',
            perceptual: 'Pattern recognition is struggling. This subject may require more explicit structure — consider procedural or conceptual approaches.'
        };

        return {
            isStrugglingWithBlueprint: true,
            gAdjustment: -0.1,
            suggestion: suggestions[subjectType],
            confidence: Math.min(1, (0.5 - avgQ) * 2 + (effort - 0.5))
        };
    }

    if (avgQ > 0.6 && effort > 0.4) {
        return {
            isStrugglingWithBlueprint: false,
            gAdjustment: 0.05,
            suggestion: null,
            confidence: avgQ
        };
    }

    return { isStrugglingWithBlueprint: false, gAdjustment: 0, suggestion: null, confidence: 0 };
}

// ============================================================================
// G Baseline — kept as internal platform metric, NOT in learner equation
// ============================================================================

const G_BASELINES: Record<SubjectType, number> = {
    procedural: 0.85,
    conceptual: 0.80,
    cyclic: 0.75,
    perceptual: 0.70
};
const G_FALLBACK = 0.60;

/** @deprecated G is no longer part of the learner equation. Kept for internal platform analytics only. */
export function calculateGBaseline(
    subjectType?: SubjectType,
    classificationConfidence?: number
): number {
    if (!subjectType) return G_FALLBACK;
    const base = G_BASELINES[subjectType];
    const confidence = classificationConfidence ?? 0.8;
    return base * Math.max(0.5, confidence);
}
