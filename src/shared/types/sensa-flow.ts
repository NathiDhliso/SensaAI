/**
 * SENSA v2.0 Flow Types
 * 
 * Maps to Learning Health Equation: I = min(h, Q_k × Q_r × Q_c × Q_f × Q_p)
 */
import type { ConceptMapData } from './learning';
// ============================================================================
// Core Type Aliases
// ============================================================================
/** Concept tier classification */
export type TierType = 'trunk' | 'branch' | 'leaf';
/** SENSA v2.0 learning flow phases */
export type SensaPhase = 'see' | 'explore' | 'note' | 'study' | 'apply' | 'complete';
/** Dependency edge types */
export type EdgeType = 'prerequisite' | 'optional' | 'related';
/** Lifecycle phase from AI output */
export type LifecyclePhase = 'PHASE_1' | 'PHASE_2' | 'PHASE_3';
// ============================================================================
// Dependency Graph Types (from AI output)
// ============================================================================
export interface DependencyGraphNode {
 id: string;
 name: string;
 tier: TierType;
 lifecycle: LifecyclePhase;
 x?: number; // Optional layout position
 y?: number;
}
export interface DependencyGraphEdge {
 from: string;
 to: string;
 strength: number; // 0.3-1.0, how critical is this dependency
 type: EdgeType;
}
export interface DependencyGraph {
 nodes: DependencyGraphNode[];
 edges: DependencyGraphEdge[];
}
// ============================================================================
// Equation Metadata Types (from AI output)
// ============================================================================
export interface QualityComponents {
 [key: string]: number; // Each component is 0-1
}
export interface QualityScore {
 score: number;
 components: QualityComponents;
 reasoning: string;
 improvementAreas: string[];
}
export interface BaselineMastery {
 value: number;
 calculation: string;
 interpretation: string;
}
export interface EquationMetadata {
 Q_k: QualityScore;
 Q_r: QualityScore;
 Q_c: QualityScore;
 Q_f: QualityScore;
 Q_p: QualityScore;
 I_baseline: BaselineMastery;
}
// ============================================================================
// SENSA Flow State Machine
// ============================================================================
export interface SensaFlowState {
 phase: SensaPhase;
 h: number;
 Q_k: number;
 Q_r: number;
 Q_c: number;
 Q_f: number;
 Q_p: number;
 I: number;
 userGuesses: Map<string, string>;
 conceptMap: ConceptMapData | null;
 synthesisScore: number;
 flowModeCompleted: boolean;
 startedAt: Date;
 completedSteps: SensaPhase[];
 timePerStep: Partial<Record<SensaPhase, number>>;
}
export interface ValidationResult {
 guessAccuracy: number; // 0-100
 correctPredictions: string[];
 incorrectPredictions: Array<{
 conceptId: string;
 userGuess: string;
 actualConnection: string;
 }>;
}
// ============================================================================
// Enhanced AI Response Types (Full Structure)
// ============================================================================
export interface EnhancedConceptFields {
 tier: TierType;
 dependencies: string[];
 outdegree: number;
}
export interface ConfusionPair {
 id: string;
 conceptA: string;
 conceptB: string;
 distinctionKey: string;
 whenToUseA: string;
 whenToUseB: string;
}
export interface TierDistribution {
 trunk: number;
 branch: number;
 leaf: number;
 total: number;
}
// ============================================================================
// Mastery Challenge Result
// ============================================================================
export interface MasteryChallengeResult {
 passed: boolean;
 synthesisScore: number;
 flowModeCompleted: boolean;
 Q_f: number;
}
