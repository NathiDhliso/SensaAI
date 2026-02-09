/**
 * SENSA v2.0 Flow Types
 * 
 * Maps to Universal Learning Equation: I = min(h, G × f(M(P(x))))
 */
import type { ConceptMapData } from './learning';
// ============================================================================
// Core Type Aliases
// ============================================================================
/** Concept tier classification */
export type TierType = 'root' | 'trunk' | 'leaf';
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
 score: number; // 0-1, the Q_P/Q_M/Q_f value
 components: QualityComponents;
 reasoning: string;
 improvementAreas: string[];
}
export interface GovernanceScore {
 score: number; // The G multiplier (typically 0.8-1.2)
 modifiers: {
 recency: number;
 authoritySource: number;
 domainComplexity: number;
 };
 reasoning: string;
}
export interface BaselineMastery {
 value: number; // I = G × Q_f × Q_M × Q_P
 calculation: string;
 interpretation: string;
}
export interface EquationMetadata {
 Q_P: QualityScore;
 Q_M: QualityScore;
 Q_f: QualityScore;
 G: GovernanceScore;
 I_baseline: BaselineMastery;
}
// ============================================================================
// SENSA Flow State Machine
// ============================================================================
export interface SensaFlowState {
 /** Current phase in the 5-step flow */
 phase: SensaPhase;
 /** Equation tracking: I = G × Q_f × Q_M × Q_P */
 G: number; // Generation quality factor (content quality)
 Q_P: number; // Practice quality (engagement)
 Q_M: number; // Mastery quality (concept scores)
 Q_f: number; // Flow quality (momentum tracking)
 I: number; // Information absorbed (calculated continuously)
 /** Step-specific data */
 userGuesses: Map<string, string>; // From Step 2: Explore
 conceptMap: ConceptMapData | null; // From Step 3: Note
 reconstructionScore: number; // From Step 4: Study
 synthesisScore: number; // From Step 5: Apply
 flowModeUnlocked: boolean; // Unlocked when synthesis ≥ 0.7
 /** Analytics */
 startedAt: Date;
 completedSteps: SensaPhase[];
 timePerStep: Record<SensaPhase, number>; // minutes per step
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
 root: number;
 trunk: number;
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
