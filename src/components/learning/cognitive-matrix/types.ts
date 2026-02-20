export interface ShapeLenses {
  simpleCore?: string;
  highStakesExample?: string;
  analogicalModel?: string;
  patternRecognition?: { question: string; answer: string };
  eliminationLogic?: string;
}

export interface Phase3Data {
  tool?: string;
  metrics?: string[];
}

export interface CreatorPerspective {
  label: string;
  blueprint: string;
  steps: string[];
}

export interface DrillDownAction {
  trick: string;
  chain: string[];
  steps: string[];
  shape?: ShapeLenses;
  phase3?: Phase3Data;
  perspectives?: CreatorPerspective[];
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
