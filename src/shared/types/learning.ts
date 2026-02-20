
// ============================================================================
// Mnemonic & Dependency Types
// ============================================================================
export interface MnemonicContext {
    anchor: string;
    story: string;
    tier?: 'trunk' | 'branch' | 'leaf';
    parentName?: string;
    parentId?: string;
    dependsOn?: string[];
    imageUrl?: string;
}
export interface DependencyEdge {
    id: string;
    source: string;
    target: string;
    relationship: 'requires' | 'enables' | 'is-part-of' | 'is-type-of' | 'causes' | 'constrains';
    weight: number;
}
export interface DependencyMetrics {
    conceptId: string;
    conceptName: string;
    dependentCount: number;
    dependencyCount: number;
    totalConnections: number;
    calculatedTier: 'trunk' | 'branch' | 'leaf';
    centralityScore: number;
    clusterGroup: string;
}
export interface SubjectGraphNode {
    id: string;
    name: string;
    stageId: string;
    metrics: DependencyMetrics;
}
export interface SubjectGraphStats {
    totalNodes: number;
    totalEdges: number;
    trunkCount: number;
    branchCount: number;
    leafCount: number;
    centralHub: string;
}
export interface SubjectGraph {
    subjectId: string;
    generatedAt: string;
    nodes: SubjectGraphNode[];
    edges: DependencyEdge[];
    stats: SubjectGraphStats;
}
// ============================================================================
// Lifecycle Types 
// ============================================================================
export interface ConceptLifecyclePhase {
    title: string;
    steps: string[];
}
export interface ConceptLifecycle {
    phase1: ConceptLifecyclePhase;
    phase2: ConceptLifecyclePhase;
    phase3: ConceptLifecyclePhase;
}
// ============================================================================
// Session Types
// ============================================================================
export interface SessionPrimer {
    reason: string;
    action: string;
    reward: string;
}
export type StudyGoal = 'learn-new' | 'review' | 'velocity' | 'explore';
export type SessionDuration = 15 | 30 | 45 | 60;

/**
 * Learner mood → bandwidth ceiling mapping.
 * From the original Learning Health Monitor spec:
 * - energized → 1.0 (45 min, challenging concepts first)
 * - neutral   → 0.8 (30 min, balanced mix)
 * - tired     → 0.6 (15 min, spaced review only)
 * - stressed  → 0.4 (15 min, free exploration, easy wins)
 */
export type LearnerMood = 'pumped' | 'good' | 'okay' | 'struggling' | 'tired';
export const MOOD_H_MAP: Record<LearnerMood, number> = {
    pumped: 1.0,
    good: 0.9,
    okay: 0.75,
    struggling: 0.5,
    tired: 0.6
};

/**
 * Learning Health Equation variables — measures the LEARNER only.
 * I = min(h, Q_k × Q_r × Q_c × Q_f × Q_p)
 */
export interface LearningHealthEquation {
    /** Cognitive bandwidth ceiling (mood-dependent, 0.4–1.0) */
    h: number;
    /** Prior knowledge alignment (context-relative, 0–1) */
    Q_k: number;
    /** Recall quality — genuine unprompted retrieval (0–1) */
    Q_r: number;
    /** Connection quality — concept linking, not isolated facts (0–1) */
    Q_c: number;
    /** Frequency/spacing quality — spaced repetition adherence (0–1) */
    Q_f: number;
    /** Process quality — learning loop fidelity (0–1) */
    Q_p: number;
    /** Information absorbed into long-term memory (0–1) */
    I: number;
}
export interface SessionRecommendation {
    action: string;
    estimatedMinutes: number;
}
export type LifecyclePhaseKey = 'phase1' | 'phase2' | 'phase3';
export interface EnhancedCognitiveMetrics {
    currentLoad: number;
    consecutiveCorrect: number;
    consecutiveErrors: number;
    avgResponseTimeMs: number;
    phaseLoadBalance: { prepare: number, model: number, deliver: number };
    confusionDrillAccuracy: number;
    conceptRevisits: number;
    uninterruptedConceptStreak: number;
    averageConceptTime: number;
    flowStateMinutes: number;
}
export interface WorkedExample {
    problem: string;
    solution: string;
    steps: string[];
}
// ============================================================================
// Learning Concept Types
// ============================================================================
export interface CreatorPerspective {
    label: string;
    blueprint: string;
    steps: string[];
}
export interface ShapeContent {
    simpleCore?: string;
    highStakesExample?: string;
    analogicalModel?: string;
    patternRecognition?: {
        question: string;
        answer: string;
    };
    eliminationLogic?: string;
}
export interface LearningConcept {
    id: string;
    name: string;
    stageId: string;
    order: number;
    icon?: string;
    // ========== SENSA v2.0 TREE SYSTEM (REQUIRED) ==========
    /**
    * Tree-level classification declared by the LLM.
    * - trunk: Main exam domain/objective — top-level container
    * - branch: Sub-topic within a trunk — groups related knowledge
    * - leaf: Granular testable concept — exam-level detail
    */
    tier: 'trunk' | 'branch' | 'leaf';
    parentName?: string;
    trunkDomain?: string;
    /**
    * Bloom's Taxonomy Level (Phase 2 Cognitive Model)
    */
    cognitiveLevel?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
    /**
    * The Lifecycle Phase this concept belongs to (Spatial Dimension).
    * - PREPARE: Foundation/Setup (Phase 1)
    * - MODEL: Core Action/Implementation (Phase 2)
    * - DELIVER: Verification/Output (Phase 3)
    */
    lifecyclePhase: 'PREPARE' | 'MODEL' | 'DELIVER';
    /**
    * Array of concept IDs this concept depends on.
    * Foundation concepts typically have empty arrays.
    */
    dependencies: string[];
    /**
    * Count of concepts that depend on THIS concept.
    * Calculated from other concepts' dependencies arrays.
    */
    outdegree: number;
    /**
    * Common Pitfalls / Critical Distinguishements (Phase 2)
    */
    commonPitfalls?: string[];
    connections?: Array<{
        target: string;
        type: 'requires' | 'enables' | 'is-part-of' | 'is-type-of' | 'causes' | 'constrains';
    }>;
    // ========== END SENSA v2.0 ==========
    // Core Content
    hookSentence?: string;
    whyYouNeed?: string;
    howToUse?: string[];
    technicalDetails?: string;
    metaphor?: string;
    workedExample?: WorkedExample;
    realWorldExample?: string;
    visualElement?: string;
    actionButtonText?: string;
    // Metadata
    mnemonic?: MnemonicContext;
    lifecycle?: ConceptLifecycle;
    // SHAPE Content (SensaAI Generated)
    shape?: ShapeContent;
    prerequisites?: string[];
    keyPoints?: string[];
    perspectives?: CreatorPerspective[];
}
// ============================================================================
// Learning Stage Types
// ============================================================================
export interface LearningStage {
    id: string;
    // Required core fields
    title: string;
    description: string;
    icon: string;
    celebrationTitle: string;
    celebrationMessage: string;
    // Extended fields for content generation
    order?: number;
    name?: string;
    metaphor?: string;
    metaphorDescription?: string;
    concepts?: string[];
    narrativeBridge?: string;
}
export interface UserProgress {
    currentStageId: string;
    currentConceptId: string;
    completedConcepts: string[];
    completedStages: string[];
    conceptsLearnedToday: number;
    lastSessionDate: string;
    totalTimeSpentMinutes: number;
    sessionStartTime: number | null;
    // Attempt tracking for infinite loop prevention
    conceptAttempts: Record<string, number>; // conceptId -> attempt count
    conceptScores: Record<string, number>; // conceptId -> last score
    conceptStatuses: Record<string, 'not-started' | 'in-progress' | 'needs-review' | 'mastered' | 'skipped'>;
    maxAttemptsPerConcept: number; // Default: 3
}
export interface CelebrationData {
    type: 'stage' | 'course';
    title: string;
    message: string;
    conceptsCompleted: string[];
    timeSpent?: number;
    badgeIcon?: string;
}
// ============================================================================
// Unified Progressive Flow Types
// ============================================================================

/**
 * Phase progress tracking for unified flow.
 * Replaces scattered flags (scouted, previewed, overviewViewed, mapBuilt, mastered)
 */
export interface PhaseProgress {
    orientCompleted: boolean;
    structureCompleted: boolean;
    encodeStarted: boolean;
    verifyCompleted: boolean;
}

/**
 * Adaptation modes for each phase.
 * Tracks which cognitive method was used based on mood/energy level.
 */
export type OrientMode = 
    | 'prior-knowledge'      // Tired: Activate existing schemas
    | 'prediction-skeleton'  // Medium: Scaffolded predictions
    | 'generative';          // High: Full scout + predict + questions

export type StructureMode =
    | 'annotate'    // Tired: Read + annotate pre-built map
    | 'guided'      // Medium: Guided construction with hints
    | 'full';       // High: Full generative construction

export type EncodeMode =
    | 'retrieval'           // Tired (returning): Spaced repetition
    | 'minimal-encoding'    // Tired (new): Low-interference presentation
    | 'standard'            // Medium: Elaboration prompts
    | 'interleaved';        // High: Mixed concepts

export type VerifyMode =
    | 'recognition'   // Tired: Multiple choice, "did you see this?"
    | 'cued-recall'   // Medium: Hints available
    | 'free-recall';  // High: No cues, transfer tasks

export interface PhaseAdaptations {
    orientMode?: OrientMode;
    structureMode?: StructureMode;
    encodeMode?: EncodeMode;
    verifyMode?: VerifyMode;
}

export interface StudySession {
    id: string;
    subjectId: string;
    startedAt: string;
    endedAt?: string;
    goal: StudyGoal;
    targetConcepts: string[];
    targetPhases: LifecyclePhaseKey[];
    targetDuration: number;
    conceptsCompleted: string[];
    phasesCompleted: Record<string, LifecyclePhaseKey[]>;
    confusionDrillsCompleted: number;
    metrics: EnhancedCognitiveMetrics;
    breaksTaken: number;
    isActive: boolean;
    goalAchieved: boolean;
    // SENSA Phase 0: See
    primer: SessionPrimer | null;
    
    // ========== UNIFIED PROGRESSIVE FLOW ==========
    /** Universal phase completion tracking */
    phaseProgress: PhaseProgress;
    /** Method tracking (which variant was used) */
    adaptations: PhaseAdaptations;
    
    // ========== DEPRECATED (keep for migration, remove after 30 days) ==========
    /** @deprecated Use phaseProgress.orientCompleted instead */
    scouted: boolean;
    /** @deprecated Use phaseProgress.orientCompleted instead */
    previewed: boolean;
    /** @deprecated Use phaseProgress.structureCompleted instead */
    mapBuilt: boolean;
    conceptMap?: ConceptMapData | null;
    /** @deprecated No longer used */
    mapReconstructed: boolean;
    /** @deprecated Use phaseProgress.verifyCompleted instead */
    mastered: boolean;
    /** @deprecated Use phaseProgress.orientCompleted instead */
    overviewViewed: boolean;
    
    // Step 3: The Guess (Priming) - User predictions per concept
    predictions: Record<string, string>;
    // ========== MOMENTUM CHECKPOINT SYSTEM ==========
    /** Number of times we've offered a checkpoint this session */
    checkpointOffers: number;
    /** Timestamp of last checkpoint offer (ISO string) */
    lastCheckpointAt: string | null;
    /** Whether user is currently detected in flow state */
    isInFlowState: boolean;
    /** Timestamp when time toast was shown (to prevent re-showing) */
    timeToastShownAt: string | null;
    // ========== AI COACH PERSONALIZATION ==========
    /** User's current mood for AI Coach response adjustment */
    mood?: 'pumped' | 'good' | 'okay' | 'struggling' | 'tired';
    // ========== LEARNING HEALTH EQUATION PERSISTENCE ==========
    /** Persisted equation values so refresh doesn't lose learning progress */
    equation?: LearningHealthEquation;
}
export interface ConceptMapData {
    nodes: { id: string; conceptId: string; conceptName: string; x: number; y: number }[];
    connections: { id: string; fromId: string; toId: string; label: string }[];
}
