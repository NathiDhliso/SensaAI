export interface DrillDownAction {
  trick: string;
  chain: string[];
  steps: string[];
}

export interface MatrixSubConcept {
  conceptId: string;
  conceptName: string;
  actions: Record<string, DrillDownAction | null>;
}

export interface MatrixConcept {
  conceptId: string;
  conceptName: string;
  subConcepts?: MatrixSubConcept[];
  actions?: Record<string, DrillDownAction | null>;
}

export interface MatrixPayload {
  subject: string;
  verbs: string[];
  matrix: MatrixConcept[];
}

export interface SelectedCell {
  conceptId: string;
  conceptName: string;
  verb: string;
  action: DrillDownAction;
  isMastered: boolean;
}
