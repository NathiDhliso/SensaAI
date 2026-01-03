import type { DynamicLifecycle } from '@/lib/types/generation';

export const DYNAMIC_LIFECYCLE_PROMPT = `You are an expert curriculum designer. Analyze the given subject and determine the optimal 3-phase operational lifecycle that best captures how professionals work with this content.

SUBJECT: [SUBJECT]

TASK: Generate a custom lifecycle with 3 action verbs that authentically represent the workflow for this specific subject.

GUIDELINES:
1. Each phase should be a single ACTION VERB in CAPS (e.g., PROVISION, ANALYZE, DESIGN)
2. Phase 1 = Foundation/Setup/Preparation phase
3. Phase 2 = Core Action/Implementation/Execution phase  
4. Phase 3 = Verification/Monitoring/Evaluation phase
5. Verbs should be specific to the subject domain, not generic
6. Consider what practitioners actually DO in this field

EXAMPLES OF GOOD LIFECYCLES:
- Azure Administrator: PROVISION → CONFIGURE → MONITOR
- Power BI Data Analyst: PREPARE → MODEL → DELIVER
- Software Developer: DEFINE → IMPLEMENT → DEBUG
- Accountant: RECOGNIZE → MEASURE → DISCLOSE
- Doctor: ASSESS → TREAT → MONITOR
- Project Manager: INITIATE → EXECUTE → CLOSE
- Data Engineer: INGEST → TRANSFORM → ORCHESTRATE
- Security Analyst: DETECT → INVESTIGATE → RESPOND
- UX Designer: RESEARCH → DESIGN → VALIDATE
- Machine Learning Engineer: COLLECT → TRAIN → DEPLOY

RESPOND IN EXACTLY THIS JSON FORMAT (no markdown, no extra text):
{
  "domain": "<detected domain category>",
  "roleScope": "<specific professional role title>",
  "phase1": "<VERB>",
  "phase2": "<VERB>",
  "phase3": "<VERB>",
  "phase1Description": "<what this phase covers in 10 words or less>",
  "phase2Description": "<what this phase covers in 10 words or less>",
  "phase3Description": "<what this phase covers in 10 words or less>",
  "justification": "<1-2 sentences explaining why these verbs fit this subject>",
  "excludedActions": ["<action outside this role's scope>", "<another excluded action>", "<third excluded action>"]
}`;

export function createLifecycleAnalysisPrompt(subject: string): string {
  return DYNAMIC_LIFECYCLE_PROMPT.replace('[SUBJECT]', subject);
}

export function parseLifecycleResponse(response: string): DynamicLifecycle | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.phase1 || !parsed.phase2 || !parsed.phase3) {
      return null;
    }

    return {
      domain: parsed.domain || 'General',
      roleScope: parsed.roleScope || 'Professional',
      phase1: parsed.phase1.toUpperCase(),
      phase2: parsed.phase2.toUpperCase(),
      phase3: parsed.phase3.toUpperCase(),
      phase1Description: parsed.phase1Description || '',
      phase2Description: parsed.phase2Description || '',
      phase3Description: parsed.phase3Description || '',
      justification: parsed.justification || '',
      excludedActions: parsed.excludedActions || [],
    };
  } catch (error) {
    console.error('Failed to parse lifecycle response:', error);
    return null;
  }
}

export function createLifecycleScopePrompt(lifecycle: DynamicLifecycle, subject: string): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DYNAMIC LIFECYCLE ENFORCEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: ${subject}
Domain: ${lifecycle.domain}
Professional Role: ${lifecycle.roleScope}

AUTHORIZED LIFECYCLE:
${lifecycle.phase1} (${lifecycle.phase1Description}) →
${lifecycle.phase2} (${lifecycle.phase2Description}) →
${lifecycle.phase3} (${lifecycle.phase3Description})

Justification: ${lifecycle.justification}

OUT OF SCOPE - DO NOT INCLUDE:
${lifecycle.excludedActions.map((action) => `  - ${action}`).join('\n')}

Every core concept MUST use the authorized lifecycle phases:
- Phase 1: ${lifecycle.phase1}
- Phase 2: ${lifecycle.phase2}
- Phase 3: ${lifecycle.phase3}

No exceptions. These verbs replace any default lifecycle phases.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();
}

export function getDefaultLifecycle(subject: string): DynamicLifecycle {
  return {
    domain: 'General',
    roleScope: 'Professional',
    phase1: 'FOUNDATION',
    phase2: 'ACTION',
    phase3: 'VERIFICATION',
    phase1Description: 'Establish prerequisites and setup',
    phase2Description: 'Execute core activities',
    phase3Description: 'Validate and verify outcomes',
    justification: `Generic lifecycle for ${subject} following setup, execution, and validation pattern.`,
    excludedActions: [],
  };
}
