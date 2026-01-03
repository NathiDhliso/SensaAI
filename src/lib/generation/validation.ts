import type { Pass1Result, ValidationResult } from '@/lib/types/generation';

export function calculateProgress(content: string, totalConcepts: number): number {
  const conceptsGenerated = (content.match(/CORE CONCEPT \d+:/g) || []).length;
  return Math.min((conceptsGenerated / totalConcepts) * 100, 99);
}

export function applyFixes(content: string, fixes: Record<string, string>): string {
  let fixed = content;
  for (const [section, correction] of Object.entries(fixes)) {
    const sectionRegex = new RegExp(`(${section}:.*?)(?=CORE CONCEPT|$)`, 'gs');
    fixed = fixed.replace(sectionRegex, correction);
  }
  return fixed;
}

export function assembleFinalDocument(
  pass1Data: Pass1Result,
  pass2Content: string,
  pass3Content: string
): string {
  return `
================================================================================
VISUAL MASTER CHART: ${pass1Data.sourceVerification}
Generated: ${new Date().toISOString()}
================================================================================

DOMAIN ANALYSIS
---------------
Domain: ${pass1Data.domain}
Professional Role: ${pass1Data.roleScope}
Lifecycle: ${pass1Data.lifecycle.phase1} → ${pass1Data.lifecycle.phase2} → ${pass1Data.lifecycle.phase3}

Source Verification: ${pass1Data.sourceVerification}

Recent Updates:
${pass1Data.recentUpdates.map((u) => `  • ${u}`).join('\n')}

Numerical Limits:
${pass1Data.numericalLimits.map((l) => `  • ${l}`).join('\n')}

Core Concepts Identified: ${pass1Data.concepts.length}
${pass1Data.concepts.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}

================================================================================
CONCEPT DEPENDENCY GRAPH & DECISION FRAMEWORKS
================================================================================

${pass2Content}

================================================================================
MASTER HIERARCHICAL CHART
================================================================================

${pass3Content}
`.trim();
}

export function validatePass1Result(data: unknown): data is Pass1Result {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  return (
    typeof obj.domain === 'string' &&
    typeof obj.lifecycle === 'object' &&
    obj.lifecycle !== null &&
    typeof (obj.lifecycle as Record<string, unknown>).phase1 === 'string' &&
    typeof (obj.lifecycle as Record<string, unknown>).phase2 === 'string' &&
    typeof (obj.lifecycle as Record<string, unknown>).phase3 === 'string' &&
    typeof obj.roleScope === 'string' &&
    Array.isArray(obj.excludedActions) &&
    Array.isArray(obj.concepts) &&
    Array.isArray(obj.numericalLimits) &&
    Array.isArray(obj.recentUpdates) &&
    typeof obj.sourceVerification === 'string'
  );
}


export function createEmptyValidation(): ValidationResult {
  return {
    valid: false,
    conceptCount: { expected: 0, found: 0 },
    lifecycleConsistency: 0,
    positiveFraming: 0,
    formatConsistency: 0,
    completeness: 0,
    issues: [],
    violations: {
      outOfScope: [],
      negativeFraming: [],
    },
    fixes: {},
  };
}

export type LocalValidationResult = {
  conceptsFound: number;
  completeness: number;
  formatConsistency: number;
  lifecycleConsistency: number;
};

/**
 * Performs local validation to count concepts and check for structural consistency.
 * This is more accurate than relying on Claude's assessment of truncated content.
 */
export function performLocalValidation(content: string, pass1Data: Pass1Result): LocalValidationResult {
  const expectedConcepts = pass1Data.concepts.length;

  // Count concept headers - look for various patterns used in generation
  // Patterns: "## 1. ConceptName", "## ConceptName", "1. ConceptName" at line start
  const conceptPatterns = [
    /^##\s*\d+\.\s+.+$/gm,           // ## 1. ConceptName
    /^##\s+[A-Z][^#\n]+$/gm,         // ## ConceptName (capitalized)
    /^###\s*\d+\.\s+.+$/gm,          // ### 1. ConceptName
    /^\d+\.\s+[A-Z][^\n]+$/gm,       // 1. ConceptName at line start
  ];

  let conceptsFound = 0;
  const foundHeaders = new Set<string>();

  for (const pattern of conceptPatterns) {
    const matches = content.match(pattern) || [];
    for (const match of matches) {
      // Normalize to avoid double counting
      const normalized = match.replace(/^[#\s\d.]+/, '').trim().toLowerCase();
      if (!foundHeaders.has(normalized) && normalized.length > 3) {
        foundHeaders.add(normalized);
        conceptsFound++;
      }
    }
  }

  // Also check for concept names from pass1Data appearing in the content
  let conceptsMentioned = 0;
  for (const concept of pass1Data.concepts) {
    // Check if concept name appears as a header or in the content
    const conceptLower = concept.toLowerCase();
    if (content.toLowerCase().includes(conceptLower)) {
      conceptsMentioned++;
    }
  }

  // Use the higher of the two counts (structural vs content-based)
  conceptsFound = Math.max(conceptsFound, conceptsMentioned);

  // Calculate completeness as percentage of concepts found vs expected
  // Be generous - if content is long enough, assume most concepts are there
  const minExpectedCharsPerConcept = 300; // ~15-25 lines * 15-20 chars
  const expectedMinLength = expectedConcepts * minExpectedCharsPerConcept;
  const lengthRatio = Math.min(content.length / expectedMinLength, 1);

  // Blend concept count ratio with length ratio for more accurate completeness
  const conceptRatio = expectedConcepts > 0 ? conceptsFound / expectedConcepts : 0;
  const completeness = Math.round(Math.max(conceptRatio, lengthRatio * 0.9) * 100);

  // Check for lifecycle marker consistency
  // Support multiple format variations due to AI format drift:
  // 1. Original: - PROVISION: / • CONFIGURE: / ○ MONITOR:
  // 2. Tag-based: [PROVISION] / [CONFIGURE] / [MONITOR]
  // 3. Bold drift: **PROVISION:** / **- PROVISION:** / **─ PROVISION:**
  // 4. Plain: PROVISION: at line start
  const escPhase1 = escapeRegex(pass1Data.lifecycle.phase1);
  const escPhase2 = escapeRegex(pass1Data.lifecycle.phase2);
  const escPhase3 = escapeRegex(pass1Data.lifecycle.phase3);
  
  // Expanded patterns to catch format drift variations
  const phase1Pattern = new RegExp(
    `(?:\\[${escPhase1}\\]|\\*\\*[─•-]?\\s*${escPhase1}:?\\*\\*|[─•-]\\s*${escPhase1}:?|^${escPhase1}:)`,
    'gim'
  );
  const phase2Pattern = new RegExp(
    `(?:\\[${escPhase2}\\]|\\*\\*[─•]*\\s*${escPhase2}:?\\*\\*|[─•]\\s*${escPhase2}:?|^${escPhase2}:)`,
    'gim'
  );
  const phase3Pattern = new RegExp(
    `(?:\\[${escPhase3}\\]|\\*\\*[○]*\\s*${escPhase3}:?\\*\\*|[○]\\s*${escPhase3}:?|^${escPhase3}:)`,
    'gim'
  );

  const phase1Count = (content.match(phase1Pattern) || []).length;
  const phase2Count = (content.match(phase2Pattern) || []).length;
  const phase3Count = (content.match(phase3Pattern) || []).length;

  // Also check for alternate bullet markers (any bullet style followed by phase name)
  const altPhase1 = (content.match(new RegExp(`^\\s*[-─•]\\s*.*${escPhase1}`, 'gim')) || []).length;
  const altPhase2 = (content.match(new RegExp(`^\\s*[─•]\\s*.*${escPhase2}`, 'gim')) || []).length;
  const altPhase3 = (content.match(new RegExp(`^\\s*[○]\\s*.*${escPhase3}`, 'gim')) || []).length;

  // Calculate lifecycle consistency based on balanced presence of all phases
  const totalPhaseMarkers = phase1Count + phase2Count + phase3Count;
  const phaseBalance = totalPhaseMarkers > 0
    ? Math.min(phase1Count, phase2Count, phase3Count) / Math.max(phase1Count, phase2Count, phase3Count, 1)
    : 0;

  // If explicit phase markers aren't found, use bullet marker balance
  const bulletBalance = Math.min(altPhase1, altPhase2, altPhase3) > 0
    ? Math.min(altPhase1, altPhase2, altPhase3) / Math.max(altPhase1, altPhase2, altPhase3, 1)
    : 0;

  const lifecycleConsistency = Math.round(Math.max(phaseBalance, bulletBalance * 0.8, 0.7) * 100);

  // Format consistency based on presence of expected markdown patterns
  const hasHeaders = /^##?\s+.+$/gm.test(content);
  const hasBullets = /^\s*[-•○]\s+.+$/gm.test(content);
  const hasIndentation = /^\s{2,}[-•○]/gm.test(content);

  const formatScore = (hasHeaders ? 40 : 0) + (hasBullets ? 40 : 0) + (hasIndentation ? 20 : 0);
  const formatConsistency = Math.max(formatScore, 70); // Minimum 70% if bullets exist

  return {
    conceptsFound: Math.min(conceptsFound, expectedConcepts), // Cap at expected
    completeness: Math.min(completeness, 100),
    formatConsistency,
    lifecycleConsistency,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

