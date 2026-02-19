/**
 * Futuristic Priming Zone (Integrated ULC Matrix)
 * Type definitions for the 3D drill-down matrix system
 * 
 * STRICT RULE: NO HARDCODED DATA
 * All content must be dynamically parsed from LearningConcept[] payload
 */

/**
 * The 3 Universal Life Cycle Actions (X-Axis)
 * These are dynamically extracted from the subject's lifecycle phases
 * or inferred from concept names/lifecycle data
 */
export type UniversalAction = string; // e.g., 'CREATE', 'CONFIGURE', 'MONITOR' or 'IDENTIFY', 'ISOLATE', 'ANALYZE'

/**
 * ULC Verb Configuration
 * Defines the 3 verbs for a specific discipline
 */
export interface ULCVerbs {
  verb1: string;
  verb2: string;
  verb3: string;
}

/**
 * A single atomic concept in the hierarchy
 * Supports nested drill-down (e.g., Storage -> Storage Account -> Access Keys)
 */
export interface AtomicConcept {
  id: string;
  name: string;
  tier: 'trunk' | 'branch' | 'leaf';
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
 * The complete Priming Matrix Data structure
 * This is what gets passed to the FuturisticPrimingZone component
 */
export interface PrimingMatrixData {
  /** The 3 ULC verbs for this discipline */
  verbs: ULCVerbs;
  
  /** Root concepts (Y-Axis rows) with hierarchical nesting */
  concepts: AtomicConcept[];
  
  /** All matrix cells (action × concept intersections) */
  cells: MatrixCell[];
  
  /** Metadata */
  domain: string; // e.g., "Azure Administration", "Human Anatomy", "Tennis"
  subjectId: string;
  generatedAt: string;
}

/**
 * Matrix Node for drill-down content
 * Represents a single intersection point with its priming data
 */
export interface MatrixNode {
  conceptId: string;
  conceptName: string;
  verb: string;
  primingCard: PrimingCard;
}

/**
 * Drill-down content structure
 * Used for parsing and displaying the Z-axis content
 */
export interface DrillDownContent {
  trick: string;
  chain: string[];
  steps: string[];
}
