/**
 * Grounding Types for Hybrid Grounding System
 * 
 * These types support the Blueprint-First Grounding strategy
 * for hallucination-free, exam-accurate content generation.
 */
// ============================================
// EXAM BLUEPRINT TYPES (Layer 1: The Skeleton)
// ============================================
export interface ExamBlueprint {
 examCode: string; // e.g., "AZ-104"
 examName: string; // e.g., "Microsoft Azure Administrator"
 lastUpdated: string; // ISO date string
 sourceUrl: string; // Official skills measured URL
 version: string; // e.g., "AZ-104-v2026.01"
 objectives: ExamObjective[];
}
export interface ExamObjective {
 id: string; // e.g., "2.1"
 title: string; // e.g., "Manage role-based access control"
 weight: string; // e.g., "15-20%"
 parentId?: string; // For hierarchical objectives
 skills: string[]; // Specific skills under this objective
 subObjectives?: ExamObjective[];
}
// ============================================
// LINK VALIDATION TYPES (Layer 2: The Truth)
// ============================================
export interface LinkValidationResult {
 url: string;
 valid: boolean;
 reason?: string;
 checkedAt: string;
 statusCode?: number;
 redirectedTo?: string;
}
export interface ValidationCache {
 url: string;
 valid: boolean;
 checkedAt: string;
 ttlSeconds: number; // 86400 = 24 hours
 statusCode?: number;
}
export const VALID_DOCUMENTATION_DOMAINS = [
 'learn.microsoft.com',
 'docs.microsoft.com',
 'docs.aws.amazon.com',
 'cloud.google.com',
 'docs.oracle.com',
 'kubernetes.io',
 'developer.hashicorp.com',
 'docs.docker.com',
 'docs.github.com',
 'developer.salesforce.com'
] as const;
export type ValidDocumentationDomain = typeof VALID_DOCUMENTATION_DOMAINS[number];
// ============================================
// CONFIDENCE SCORING TYPES (Layer 3: The Trust)
// ============================================
export interface ConfidenceScore {
 total: number; // 0-100
 breakdown: {
 officialLink: number; // 0-50
 blueprintMapping: number; // 0-30
 verifiableData: number; // 0-20
 };
 level: ConfidenceLevel;
}
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export const CONFIDENCE_THRESHOLDS = {
 high: 80,
 medium: 50,
 low: 0
} as const;
export const CONFIDENCE_WEIGHTS = {
 officialLink: 50,
 blueprintMapping: 30,
 verifiableData: 20
} as const;
// ============================================
// GROUNDED CONCEPT TYPES
// ============================================
export interface GroundingMetadata {
 blueprintVersion: string; // e.g., "AZ-104-v2026.01"
 blueprintSource: string; // URL to official skills page
 generatedAt: string; // ISO date string
 officialSource: string; // URL to official documentation
 blueprintMapping: string; // e.g., "Objective 2.1: Manage RBAC (15-20%)"
 confidenceScore: ConfidenceScore;
 verificationStatus: VerificationStatus;
 warnings?: string[];
}
export type VerificationStatus = 'verified' | 'partial' | 'unverified' | 'stale';
export interface ContentMetadata {
 generatedAt: string;
 modelVersion: string;
 promptVersion: string;
 groundingSource: 'llm-only' | 'blueprint-grounded';
 blueprintVersion?: string;
}
// ============================================
// USER FEEDBACK TYPES
// ============================================
export type FlagType = 'broken-link' | 'outdated' | 'incorrect' | 'not-on-exam';
export interface ContentFlag {
 id: string;
 conceptId: string;
 conceptName: string;
 type: FlagType;
 details?: string;
 userId: string;
 examCode?: string;
 timestamp: string;
 status: FlagStatus;
 resolution?: FlagResolution;
}
export type FlagStatus = 'pending' | 'processing' | 'resolved' | 'dismissed';
export interface FlagResolution {
 resolvedAt: string;
 resolvedBy: string;
 action: 'regenerated' | 'updated' | 'removed' | 'verified-accurate' | 'no-action';
 notes?: string;
}
// ============================================
// BLUEPRINT MATCHING TYPES
// ============================================
export interface BlueprintMatch {
 objective: ExamObjective;
 relevanceScore: number; // 0-100
 matchedSkills: string[];
 isDirectMatch: boolean;
}
export interface BlueprintCoverage {
 examCode: string;
 totalObjectives: number;
 coveredObjectives: number;
 coveragePercentage: number;
 uncoveredObjectives: ExamObjective[];
 conceptToObjectiveMap: Map<string, BlueprintMatch>;
}
// ============================================
// STALENESS CHECK TYPES
// ============================================
export interface StalenessCheck {
 conceptBlueprintVersion: string;
 currentBlueprintVersion: string;
 isStale: boolean;
 daysSinceGeneration: number;
 recommendation: StalenessRecommendation;
}
export type StalenessRecommendation = 
 | 'current'
 | 'review-recommended'
 | 'regeneration-required'
 | 'critical-update-needed';
// ============================================
// GROUNDING CONTEXT FOR GENERATION
// ============================================
export interface GroundingContext {
 blueprint: ExamBlueprint;
 targetObjective?: ExamObjective;
 additionalContext?: string;
 strictMode: boolean; // If true, reject concepts outside blueprint
}
export function buildGroundingPrompt(context: GroundingContext): string {
 const { blueprint, targetObjective } = context;
 let prompt = `
## EXAM GROUNDING CONTEXT (${blueprint.examCode})
Blueprint Source: ${blueprint.sourceUrl}
Last Updated: ${blueprint.lastUpdated}
Blueprint Version: ${blueprint.version}
`;
 if (targetObjective) {
 prompt += `
This concept MUST map to:
- Objective ${targetObjective.id}: ${targetObjective.title}
- Exam Weight: ${targetObjective.weight}
- Related Skills: ${targetObjective.skills.join(', ')}
`;
 } else {
 prompt += `
OFFICIAL OBJECTIVES:
${blueprint.objectives.map(o => 
 `${o.id}. ${o.title} (${o.weight})\n Skills: ${o.skills.join(', ')}`
).join('\n\n')}
`;
 }
 prompt += `
REQUIREMENTS:
1. Every concept MUST map to one of these objectives
2. Include "blueprintMapping": "Objective X.X: Title (Weight%)" in output
3. Include "officialSource": URL to official documentation
4. Flag anything outside objectives with [Beyond Scope]
5. Use terminology from the official objective description
`;
 return prompt;
}