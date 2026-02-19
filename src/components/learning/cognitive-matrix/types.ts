export interface DrillDownAction {
  trick: string;
  chain: string[];
  steps: string[];
}

export interface LeafRow {
  conceptId: string;
  conceptName: string;
  actions: Record<string, DrillDownAction | null>;
  cellConceptIds: Record<string, string>;
}

export interface MatrixConcept {
  conceptId: string;
  conceptName: string;
  isParent: boolean;
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
