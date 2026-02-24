export interface BlueprintAlignedStep {
  verb: string;
  atomicStep: string;
  instantiation: string;
}

export interface DrillDownAction {
  trick: string;
  chain: string[];
  steps: string[];
  blueprintSteps?: BlueprintAlignedStep[];
  commonPitfalls?: string[];
  highStakesExample?: string;
  warnings?: string[];
  eliminationLogic?: string;
  examContext?: {
    examObjective: string;
    questionTypes: string[];
    examTip: string;
  };
}

export interface LeafRow {
  conceptId: string;
  conceptName: string;
  actions: Record<string, DrillDownAction | null>;
  cellConceptIds: Record<string, string>;
}

export interface BranchRow {
  conceptId: string;
  conceptName: string;
  children: LeafRow[];
}

export interface MatrixConcept {
  conceptId: string;
  conceptName: string;
  isParent: boolean;
  branches: BranchRow[];
  children: LeafRow[];
  actions?: Record<string, DrillDownAction | null>;
  cellConceptIds?: Record<string, string>;
}

export interface MatrixPayload {
  subject: string;
  verbs: string[];
  matrix: MatrixConcept[];
}

export interface SelectedCell {
  conceptId: string;
  realConceptId: string;
  conceptName: string;
  verb: string;
  action: DrillDownAction;
  isMastered: boolean;
}
