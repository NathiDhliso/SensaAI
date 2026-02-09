export type SubjectType = 'procedural' | 'conceptual' | 'cyclic' | 'perceptual';

export type SubjectTypeLabel = 'Procedural Mastery' | 'Conceptual Fluency' | 'Adaptive Integration' | 'Embodied Judgment';

export interface SubjectClassification {
 type: SubjectType;
 label: SubjectTypeLabel;
 goal: string;
 confidence: number;
 justification: string;
 hybridElements?: string[];
}

export interface ProceduralStage {
 id: string;
 verb: string;
 actions: string[];
}

export interface MasteryIndicator {
 stage: string;
 novice: string;
 expert: string;
}

export interface ProceduralStructure {
 coreObject: string;
 lifecycle: string;
 stages: ProceduralStage[];
 crossCuttingSkills: string[];
 masteryIndicators: MasteryIndicator[];
}

export interface CoreMove {
 id: string;
 verb: string;
 description: string;
}

export interface ApplicationPattern {
 situation: string;
 primaryMoves: string[];
 supportingMoves: string[];
}

export interface ProgressionMarker {
 move: string;
 novice: string;
 intermediate: string;
 expert: string;
}

export interface ConceptualStructure {
 coreChallenge: string;
 coreMoves: CoreMove[];
 applicationPatterns: ApplicationPattern[];
 progressionMarkers: ProgressionMarker[];
 integrationSkill: string;
}

export interface CycleNode {
 id: string;
 verb: string;
 description: string;
}

export interface CyclicStructure {
 fundamentalCycle: CycleNode[];
 noviceEntryPoint: string;
 loopCompletionCriteria: string;
 commonTraps: string[];
 metaAwarenessQuestions: string[];
}

export interface PerceptualLevel {
 level: number;
 label: string;
 description: string;
}

export interface PracticeStructure {
 level: number;
 exercises: string[];
}

export interface FailureMode {
 level: number;
 description: string;
}

export interface PerceptualStructure {
 expertVision: string;
 perceptualLadder: PerceptualLevel[];
 practiceStructures: PracticeStructure[];
 failureModes: FailureMode[];
 integrativeQuestion: string;
}

export type MacroStructure =
 | { type: 'procedural'; data: ProceduralStructure }
 | { type: 'conceptual'; data: ConceptualStructure }
 | { type: 'cyclic'; data: CyclicStructure }
 | { type: 'perceptual'; data: PerceptualStructure };

export interface ConnectiveTissue {
 gatewaySkill: string;
 integrativeSkill: string;
 capstoneDemo: string;
}

export interface MacroWorkflowResult {
 classification: SubjectClassification;
 macroStructure: MacroStructure;
 connectiveTissue: ConnectiveTissue;
}

export const SUBJECT_TYPE_META: Record<SubjectType, {
 label: SubjectTypeLabel;
 icon: string;
 color: string;
 description: string;
}> = {
 procedural: {
 label: 'Procedural Mastery',
 color: '#3b82f6',
 description: 'Execute a repeatable process on defined objects'
 },
 conceptual: {
 label: 'Conceptual Fluency',
 color: '#8b5cf6',
 description: 'Wield a toolkit of moves across unpredictable contexts'
 },
 cyclic: {
 label: 'Adaptive Integration',
 color: '#10b981',
 description: 'Fluidly combine modes based on context'
 },
 perceptual: {
 label: 'Embodied Judgment',
 color: '#f59e0b',
 description: 'Develop tacit discernment that transcends rules'
 }
};
