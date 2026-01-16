/**
 * Confidence Scoring System
 * 
 * Calculates trust scores for AI-generated content based on:
 * - Official documentation links (+50 points)
 * - Blueprint mapping (+30 points)
 * - Verifiable data points (+20 points)
 * 
 * Scores map to badges:
 * - 80-100: HIGH (green badge)
 * - 50-79: MEDIUM (yellow badge)
 * - 0-49: LOW (red badge)
 */

import type {
  ConfidenceScore,
  ConfidenceLevel,
  BlueprintMatch,
  LinkValidationResult,
  GroundingMetadata,
  ExamBlueprint,
  ExamObjective as _ExamObjective,
} from '../types/grounding.js';
import { CONFIDENCE_WEIGHTS } from '../types/grounding.js';

// ============================================================================
// TYPES
// ============================================================================

interface ScoreBreakdown {
  officialLinkScore: number;
  blueprintMatchScore: number;
  verifiableDataScore: number;
  total: number;
  details: string[];
}

interface ConceptData {
  title: string;
  description: string;
  officialSourceUrl?: string;
  linkValidation?: LinkValidationResult;
  blueprintObjectiveId?: string;
  hasCodeSnippet?: boolean;
  hasConcreteExample?: boolean;
  hasNumericData?: boolean;
  cliCommands?: string[];
  apiReferences?: string[];
}

interface ScoringContext {
  blueprint?: ExamBlueprint;
  validatedLinks: Map<string, LinkValidationResult>;
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate the official link component of the score
 */
function scoreOfficialLink(
  concept: ConceptData,
  context: ScoringContext
): { score: number; detail: string } {
  if (!concept.officialSourceUrl) {
    return { score: 0, detail: 'No official source linked' };
  }

  // Check if we have a cached validation result
  const validation = concept.linkValidation || 
    context.validatedLinks.get(concept.officialSourceUrl);

  if (!validation) {
    // Link exists but not validated yet - give partial credit
    return { 
      score: Math.floor(CONFIDENCE_WEIGHTS.officialLink * 0.5), 
      detail: 'Official source linked (validation pending)' 
    };
  }

  if (validation.valid) {
    return { 
      score: CONFIDENCE_WEIGHTS.officialLink, 
      detail: `Verified official source: ${validation.url}` 
    };
  }

  if (!validation.valid && validation.statusCode) {
    return { 
      score: Math.floor(CONFIDENCE_WEIGHTS.officialLink * 0.3), 
      detail: `Link validation failed (HTTP ${validation.statusCode})` 
    };
  }

  return { score: 0, detail: 'Link validation failed' };
}

/**
 * Calculate the blueprint mapping component of the score
 */
function scoreBlueprintMapping(
  concept: ConceptData,
  context: ScoringContext
): { score: number; detail: string; match?: BlueprintMatch } {
  if (!context.blueprint) {
    return { score: 0, detail: 'No blueprint available for this exam' };
  }

  if (!concept.blueprintObjectiveId) {
    return { score: 0, detail: 'Content not mapped to blueprint objective' };
  }

  // Find the matching objective
  const match = findBlueprintMatch(
    concept.blueprintObjectiveId,
    context.blueprint
  );

  if (!match) {
    return { 
      score: 0, 
      detail: `Objective ${concept.blueprintObjectiveId} not found in blueprint` 
    };
  }

  return {
    score: CONFIDENCE_WEIGHTS.blueprintMapping,
    detail: `Mapped to: ${match.objective.id} - ${match.objective.title}`,
    match,
  };
}

/**
 * Calculate the verifiable data component of the score
 */
function scoreVerifiableData(concept: ConceptData): { score: number; detail: string } {
  let score = 0;
  const details: string[] = [];

  // Code snippets that can be verified
  if (concept.hasCodeSnippet) {
    score += 5;
    details.push('Contains verifiable code snippet');
  }

  // CLI commands (easily testable)
  if (concept.cliCommands && concept.cliCommands.length > 0) {
    score += 5;
    details.push(`Includes ${concept.cliCommands.length} CLI command(s)`);
  }

  // API references (can be checked against docs)
  if (concept.apiReferences && concept.apiReferences.length > 0) {
    score += 5;
    details.push(`References ${concept.apiReferences.length} API(s)`);
  }

  // Concrete examples (not abstract fluff)
  if (concept.hasConcreteExample) {
    score += 3;
    details.push('Contains concrete example');
  }

  // Numeric data (specific numbers are verifiable)
  if (concept.hasNumericData) {
    score += 2;
    details.push('Includes verifiable numeric data');
  }

  // Cap at max weight
  score = Math.min(score, CONFIDENCE_WEIGHTS.verifiableData);

  return {
    score,
    detail: details.length > 0 
      ? details.join('; ') 
      : 'No verifiable data points detected',
  };
}

/**
 * Find a blueprint match by objective ID
 */
function findBlueprintMatch(
  objectiveId: string,
  blueprint: ExamBlueprint
): BlueprintMatch | null {
  // Search through objectives
  for (const objective of blueprint.objectives) {
    if (objective.id === objectiveId) {
      return {
        objective: objective,
        relevanceScore: 100,
        matchedSkills: objective.skills || [],
        isDirectMatch: true,
      };
    }

    // Search sub-objectives
    if (objective.subObjectives) {
      for (const sub of objective.subObjectives) {
        if (sub.id === objectiveId) {
          return {
            objective: sub,
            relevanceScore: 90,
            matchedSkills: sub.skills || [],
            isDirectMatch: false,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Convert numeric score to confidence level
 */
function scoreToLevel(score: number): ConfidenceLevel {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

/**
 * Get badge color for confidence level
 */
function levelToColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'high': return '#22c55e'; // green-500
    case 'medium': return '#eab308'; // yellow-500
    case 'low': return '#ef4444'; // red-500
    default: return '#6b7280'; // gray-500
  }
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Calculate comprehensive confidence score for a concept
 */
export function calculateConfidence(
  concept: ConceptData,
  context: ScoringContext = { validatedLinks: new Map() }
): ConfidenceScore {
  const breakdown: ScoreBreakdown = {
    officialLinkScore: 0,
    blueprintMatchScore: 0,
    verifiableDataScore: 0,
    total: 0,
    details: [],
  };

  // Score each component
  const linkResult = scoreOfficialLink(concept, context);
  breakdown.officialLinkScore = linkResult.score;
  breakdown.details.push(linkResult.detail);

  const blueprintResult = scoreBlueprintMapping(concept, context);
  breakdown.blueprintMatchScore = blueprintResult.score;
  breakdown.details.push(blueprintResult.detail);

  const dataResult = scoreVerifiableData(concept);
  breakdown.verifiableDataScore = dataResult.score;
  breakdown.details.push(dataResult.detail);

  // Calculate total
  breakdown.total = 
    breakdown.officialLinkScore + 
    breakdown.blueprintMatchScore + 
    breakdown.verifiableDataScore;

  // Cap at 100
  breakdown.total = Math.min(100, breakdown.total);

  const level = scoreToLevel(breakdown.total);

  return {
    total: breakdown.total,
    breakdown: {
      officialLink: breakdown.officialLinkScore,
      blueprintMapping: breakdown.blueprintMatchScore,
      verifiableData: breakdown.verifiableDataScore,
    },
    level,
  };
}

/**
 * Build tooltip text for confidence badge
 */
function _buildTooltip(breakdown: ScoreBreakdown, level: ConfidenceLevel): string {
  const lines = [
    `Confidence: ${level} (${breakdown.total}/100)`,
    '',
    `📎 Official Source: ${breakdown.officialLinkScore}/${CONFIDENCE_WEIGHTS.officialLink}`,
    `📋 Blueprint Match: ${breakdown.blueprintMatchScore}/${CONFIDENCE_WEIGHTS.blueprintMapping}`,
    `✓ Verifiable Data: ${breakdown.verifiableDataScore}/${CONFIDENCE_WEIGHTS.verifiableData}`,
  ];

  return lines.join('\n');
}

// ============================================================================
// BATCH SCORING
// ============================================================================

/**
 * Calculate confidence scores for multiple concepts
 */
export function calculateBatchConfidence(
  concepts: ConceptData[],
  context: ScoringContext
): Map<string, ConfidenceScore> {
  const results = new Map<string, ConfidenceScore>();

  for (const concept of concepts) {
    const score = calculateConfidence(concept, context);
    results.set(concept.title, score);
  }

  return results;
}

/**
 * Get aggregate confidence for a set of concepts
 */
export function getAggregateConfidence(
  scores: ConfidenceScore[]
): { average: number; level: ConfidenceLevel; distribution: Record<ConfidenceLevel, number> } {
  if (scores.length === 0) {
    return { 
      average: 0, 
      level: 'low', 
      distribution: { high: 0, medium: 0, low: 0 } 
    };
  }

  const total = scores.reduce((sum, s) => sum + s.total, 0);
  const average = Math.round(total / scores.length);

  const distribution: Record<ConfidenceLevel, number> = {
    high: scores.filter(s => s.level === 'high').length,
    medium: scores.filter(s => s.level === 'medium').length,
    low: scores.filter(s => s.level === 'low').length,
  };

  return {
    average,
    level: scoreToLevel(average),
    distribution,
  };
}

// ============================================================================
// GROUNDING METADATA BUILDER
// ============================================================================

/**
 * Build complete grounding metadata for a concept
 */
export function buildGroundingMetadata(
  concept: ConceptData,
  blueprint: ExamBlueprint | undefined,
  linkValidation: LinkValidationResult | undefined
): GroundingMetadata {
  const context: ScoringContext = {
    blueprint,
    validatedLinks: new Map(),
  };

  if (linkValidation && concept.officialSourceUrl) {
    context.validatedLinks.set(concept.officialSourceUrl, linkValidation);
  }

  const confidence = calculateConfidence(concept, context);

  let blueprintMatch: BlueprintMatch | undefined;
  if (blueprint && concept.blueprintObjectiveId) {
    blueprintMatch = findBlueprintMatch(concept.blueprintObjectiveId, blueprint) || undefined;
  }

  return {
    generatedAt: new Date().toISOString(),
    blueprintVersion: blueprint?.version || 'unknown',
    blueprintSource: blueprint?.sourceUrl || '',
    officialSource: concept.officialSourceUrl || '',
    blueprintMapping: blueprintMatch 
      ? `${blueprintMatch.objective.id} - ${blueprintMatch.objective.title}`
      : 'No mapping',
    confidenceScore: confidence,
    verificationStatus: linkValidation?.valid ? 'verified' : 'unverified',
    warnings: linkValidation?.valid ? undefined : ['Link validation pending or failed'],
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ScoreBreakdown,
  ConceptData,
  ScoringContext,
  scoreToLevel,
  levelToColor,
  findBlueprintMatch,
};
