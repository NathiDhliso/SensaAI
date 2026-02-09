import type { SubjectType } from '@/shared/types/macro-workflow';

const G_BASELINES: Record<SubjectType, number> = {
 procedural: 0.85,
 conceptual: 0.80,
 cyclic: 0.75,
 perceptual: 0.70
};

const G_FALLBACK = 0.60;

export function calculateGBaseline(
 subjectType?: SubjectType,
 classificationConfidence?: number
): number {
 if (!subjectType) return G_FALLBACK;
 const base = G_BASELINES[subjectType];
 const confidence = classificationConfidence ?? 0.8;
 return base * Math.max(0.5, confidence);
}

export type QMetricInputs = {
 completedConcepts: number;
 totalConcepts: number;
 consecutiveCorrect: number;
 consecutiveErrors: number;
 avgResponseTimeMs: number;
 mapNodeCount: number;
 mapConnectionCount: number;
 guessCount: number;
 cycleCompletions: number;
 blankSheetScore: number;
 quizAccuracy: number;
 timeSpentMs: number;
 targetDurationMs: number;
};

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

function clamp(v: number): number {
 return Math.max(0, Math.min(1, v));
}

function calculateProceduralQ(inputs: QMetricInputs): TypeAwareQMetrics {
 const completionRate = inputs.totalConcepts > 0
 ? inputs.completedConcepts / inputs.totalConcepts : 0;
 const continuity = inputs.consecutiveCorrect / Math.max(1, inputs.completedConcepts);
 const Q_f = clamp(completionRate * 0.6 + continuity * 0.4);

 const checkpointPass = inputs.quizAccuracy;
 const retention = inputs.blankSheetScore;
 const Q_M = clamp(checkpointPass * 0.5 + retention * 0.5);

 const handsOnRatio = inputs.timeSpentMs > 0
 ? Math.min(1, inputs.timeSpentMs / inputs.targetDurationMs) : 0;
 const practiceDepth = inputs.mapConnectionCount > 0
 ? clamp(inputs.mapConnectionCount / Math.max(1, inputs.mapNodeCount * 2)) : 0;
 const Q_P = clamp(handsOnRatio * 0.5 + practiceDepth * 0.3 + (inputs.guessCount > 0 ? 0.2 : 0));

 return {
 Q_f, Q_M, Q_P,
 labels: {
 Q_f: 'Stage Completion Flow',
 Q_M: 'Checkpoint Mastery',
 Q_P: 'Hands-on Practice'
 }
 };
}

function calculateConceptualQ(inputs: QMetricInputs): TypeAwareQMetrics {
 const moveFluency = inputs.quizAccuracy;
 const contextSwitch = inputs.consecutiveErrors === 0
 ? 1.0 : clamp(1 - inputs.consecutiveErrors * 0.15);
 const Q_f = clamp(moveFluency * 0.5 + contextSwitch * 0.5);

 const novelSuccess = inputs.blankSheetScore;
 const transferRate = inputs.mapConnectionCount > 0
 ? clamp(inputs.mapConnectionCount / Math.max(1, inputs.totalConcepts)) : 0;
 const Q_M = clamp(novelSuccess * 0.6 + transferRate * 0.4);

 const caseWork = inputs.completedConcepts > 0
 ? clamp(inputs.completedConcepts / inputs.totalConcepts) : 0;
 const reflectionDepth = inputs.guessCount > 0 ? clamp(inputs.guessCount * 0.1) : 0;
 const Q_P = clamp(caseWork * 0.6 + reflectionDepth * 0.4);

 return {
 Q_f, Q_M, Q_P,
 labels: {
 Q_f: 'Move Fluency',
 Q_M: 'Transfer & Recognition',
 Q_P: 'Deliberate Case Work'
 }
 };
}

function calculateCyclicQ(inputs: QMetricInputs): TypeAwareQMetrics {
 const cycleRate = inputs.cycleCompletions > 0
 ? clamp(inputs.cycleCompletions / Math.max(1, inputs.totalConcepts * 0.3)) : 0;
 const momentum = inputs.consecutiveCorrect > 0
 ? clamp(inputs.consecutiveCorrect * 0.15) : 0;
 const Q_f = clamp(cycleRate * 0.5 + momentum * 0.5);

 const insightPerCycle = inputs.blankSheetScore;
 const metaAwareness = inputs.quizAccuracy;
 const Q_M = clamp(insightPerCycle * 0.5 + metaAwareness * 0.5);

 const fullCycles = inputs.completedConcepts > 0
 ? clamp(inputs.completedConcepts / inputs.totalConcepts) : 0;
 const loopQuality = inputs.mapConnectionCount > 0
 ? clamp(inputs.mapConnectionCount / Math.max(1, inputs.mapNodeCount * 1.5)) : 0;
 const Q_P = clamp(fullCycles * 0.5 + loopQuality * 0.5);

 return {
 Q_f, Q_M, Q_P,
 labels: {
 Q_f: 'Cycle Momentum',
 Q_M: 'Insight per Cycle',
 Q_P: 'Loop Execution'
 }
 };
}

function calculatePerceptualQ(inputs: QMetricInputs): TypeAwareQMetrics {
 const exposureRate = inputs.completedConcepts > 0
 ? clamp(inputs.completedConcepts / inputs.totalConcepts) : 0;
 const latencyImprovement = inputs.avgResponseTimeMs > 0
 ? clamp(1 - (inputs.avgResponseTimeMs / 30000)) : 0;
 const Q_f = clamp(exposureRate * 0.5 + latencyImprovement * 0.5);

 const discrimination = inputs.quizAccuracy;
 const perceptualDepth = inputs.blankSheetScore;
 const Q_M = clamp(discrimination * 0.5 + perceptualDepth * 0.5);

 const drillCount = inputs.completedConcepts > 0
 ? clamp(inputs.completedConcepts / inputs.totalConcepts) : 0;
 const feedbackIntegration = inputs.consecutiveCorrect > 0
 ? clamp(inputs.consecutiveCorrect * 0.12) : 0;
 const Q_P = clamp(drillCount * 0.5 + feedbackIntegration * 0.5);

 return {
 Q_f, Q_M, Q_P,
 labels: {
 Q_f: 'Pattern Exposure',
 Q_M: 'Discrimination Accuracy',
 Q_P: 'Perception Drills'
 }
 };
}

export function calculateTypeAwareMetrics(
 subjectType: SubjectType | undefined,
 inputs: QMetricInputs
): TypeAwareQMetrics {
 switch (subjectType) {
 case 'procedural': return calculateProceduralQ(inputs);
 case 'conceptual': return calculateConceptualQ(inputs);
 case 'cyclic': return calculateCyclicQ(inputs);
 case 'perceptual': return calculatePerceptualQ(inputs);
 default: return calculateProceduralQ(inputs);
 }
}

export type FeedbackSignal = {
 isStrugglingWithBlueprint: boolean;
 gAdjustment: number;
 suggestion: string | null;
 confidence: number;
};

export function detectBlueprintMismatch(
 subjectType: SubjectType | undefined,
 metrics: TypeAwareQMetrics,
 _G: number,
 sessionCount: number
): FeedbackSignal {
 if (!subjectType || sessionCount < 2) {
 return { isStrugglingWithBlueprint: false, gAdjustment: 0, suggestion: null, confidence: 0 };
 }

 const avgQ = (metrics.Q_f + metrics.Q_M + metrics.Q_P) / 3;
 const effort = metrics.Q_P;

 if (avgQ < 0.3 && effort > 0.5) {
 const suggestions: Record<SubjectType, string> = {
 procedural: 'Your mastery scores suggest this might not be a purely procedural subject. Consider if the concepts require more flexible application patterns (conceptual) rather than sequential stages.',
 conceptual: 'Low transfer rates suggest this subject might have a more structured sequence than expected. Consider if a procedural or cyclic approach would fit better.',
 cyclic: 'Cycle completion is low despite effort. This subject may not have a natural iterative loop — consider if it is more procedural or perceptual.',
 perceptual: 'Pattern recognition is struggling. This subject may require more explicit structure — consider if a procedural or conceptual framework would help.'
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

export function getTypeAwareRecommendation(
 subjectType: SubjectType | undefined,
 weakestVar: 'G' | 'Q_f' | 'Q_M' | 'Q_P',
 metrics: TypeAwareQMetrics
): string {
 const label = metrics.labels[weakestVar === 'G' ? 'Q_f' : weakestVar];

 const recs: Record<SubjectType, Record<string, string>> = {
 procedural: {
 G: 'The generated content structure may not match this subject well. Try regenerating with more context.',
 Q_f: `Your ${label} is low. Focus on completing stages in order — don't skip ahead.`,
 Q_M: `Your ${label} needs work. Review the checkpoint questions and practice the blank sheet test.`,
 Q_P: `Your ${label} is low. Spend more time on hands-on practice and map building.`
 },
 conceptual: {
 G: 'The concept toolkit may be incomplete. Try regenerating with more specific context.',
 Q_f: `Your ${label} is low. Practice applying different moves to varied scenarios.`,
 Q_M: `Your ${label} needs work. Focus on recognizing which move fits which situation.`,
 Q_P: `Your ${label} is low. Work through more case studies and application patterns.`
 },
 cyclic: {
 G: 'The cycle structure may not capture the real iteration pattern. Try regenerating.',
 Q_f: `Your ${label} is low. Focus on completing full cycles rather than partial ones.`,
 Q_M: `Your ${label} needs work. Reflect on what you learn each cycle — quality over speed.`,
 Q_P: `Your ${label} is low. Execute more complete loops and track your improvement.`
 },
 perceptual: {
 G: 'The perceptual ladder may not match the real skill progression. Try regenerating.',
 Q_f: `Your ${label} is low. Increase your exposure to examples and patterns.`,
 Q_M: `Your ${label} needs work. Practice distinguishing between similar cases.`,
 Q_P: `Your ${label} is low. Do more deliberate perception drills with feedback.`
 }
 };

 const type = subjectType ?? 'procedural';
 return recs[type][weakestVar] ?? 'Keep practicing to improve your weakest area.';
}
