/**
 * Futuristic Priming Zone (Integrated ULC Matrix)
 * Type definitions for the 3D drill-down matrix system
 */

/**
 * The 3 Universal Actions (X-Axis)
 */
export type UniversalAction = 'CREATE' | 'CONFIGURE' | 'MONITOR';

/**
 * A single atomic concept in the hierarchy
 * Supports nested drill-down (e.g., Storage -> Storage Account -> Access Keys)
 */
export interface AtomicConcept {
  id: string;
  name: string;
  children?: AtomicConcept[];
}

/**
 * The Priming Card - The Z-Axis drill-down content
 * STRICT: Must contain exactly 3 sections
 */
export interface PrimingCard {
  /** 🧠 The Trick: Mental model/pattern for schema construction */
  trick: {
    title: string;
    content: string;
  };
  
  /** 🔗 The Chain: Prerequisites that MUST exist */
  chain: {
    title: string;
    constraints: string[];
  };
  
  /** ⚡ Atomic Steps: Exact execution steps */
  steps: {
    title: string;
    actions: string[];
  };
}

/**
 * A single cell in the matrix intersection
 */
export interface MatrixCell {
  action: UniversalAction;
  conceptId: string;
  conceptPath: string[]; // e.g., ['Storage', 'Storage Account', 'Access Keys']
  primingCard: PrimingCard;
}

/**
 * The complete Concept Matrix structure
 */
export interface ConceptMatrix {
  /** Root concepts (Y-Axis rows) */
  concepts: AtomicConcept[];
  
  /** All matrix cells (action × concept intersections) */
  cells: MatrixCell[];
  
  /** Metadata */
  domain: string; // e.g., "Azure Administration"
  version: string;
}
