/**
 * Multi-Phase Orchestrator
 * 
 * Orchestrates the 3-phase content generation process:
 * Phase 1: Domain Analysis → Phase 2: Content Generation → Phase 3: Validation
 * 
 * Each phase's output feeds into the next phase's prompt.
 * Validation occurs before progression to next phase.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { PHASE1_PROMPT } from '../prompts/phase1-domain-analysis.js';
import { PHASE2_PROMPT } from '../prompts/phase2-content-generation.js';
import { PHASE3_PROMPT } from '../prompts/phase3-validation.js';
import {
  hasCircularDefinition,
  isCompoundWord,
  hasCycle,
  validateDependencies,
  validateTierHierarchy
} from '../validation/content-validators.js';

// Types
export interface Phase1Input {
  subject: string;
  targetConceptCount?: number;
  focusAreas?: string[];
  context?: string; // User-provided exam objectives
}

export interface Phase1Output {
  domain: string;
  lifecycle: {
    phase1: string;
    phase2: string;
    phase3: string;
  };
  concepts: Array<{
    name: string;
    tier: 'foundation' | 'keystone' | 'utility';
    dependsOn: string[];
  }>;
}

export interface Phase2Input {
  concepts: Phase1Output['concepts'];
  lifecycle: Phase1Output['lifecycle'];
  batchSize?: number;
}

export interface Phase2Output {
  concepts: Array<{
    name: string;
    tier: 'foundation' | 'keystone' | 'utility';
    dependsOn: string[];
    cognitiveLevel: string;
    shape: {
      simpleCore: string;
      highStakesExample: string;
      analogicalModel: string;
      patternRecognition: {
        question: string;
        answer: string;
      };
      eliminationLogic: string;
    };
    lifecycle: {
      phase1: {
        hookSentence: string;
        prerequisite: string;
        execution: string;
      };
      phase2: string[];
      phase3: {
        tool: string;
        metrics: string[];
      };
    };
    mnemonic: {
      tier: 'foundation' | 'keystone' | 'utility';
      anchor: string;
      story: string;
      parentName?: string;
    };
    whyYouNeed: string;
    realWorldExample: string;
    commonPitfalls: string[];
  }>;
}

export interface Phase3Input {
  concepts: Phase2Output['concepts'];
}

export interface Phase3Output {
  valid: boolean;
  score: number;
  issues: Array<{
    conceptName: string;
    field: string;
    issue: string;
    severity: 'error' | 'warning';
    details: string;
  }>;
  confusionPairs: Array<{
    conceptA: string;
    conceptB: string;
    distinctionKey: string;
    whenToUseA: string;
    whenToUseB: string;
  }>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export async function executePhase1(input: Phase1Input): Promise<Phase1Output> {
  const userMessage = `Subject: ${input.subject}
Target Concept Count: ${input.targetConceptCount || 35}
${input.context ? `USER OBJECTIVES / CONTEXT (CRITICAL):
${input.context}
INSTRUCTION: Map concepts directly to these objectives.` : ''}
${input.focusAreas ? `Focus Areas: ${input.focusAreas.join(', ')}` : ''}

Generate the domain analysis following the instructions in the system prompt.`;

  const response = await callBedrock(PHASE1_PROMPT, userMessage);

  // Parse JSON response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Phase 1 did not return valid JSON');
  }

  const phase1Output: Phase1Output = JSON.parse(jsonMatch[0]);

  // Validate Phase 1 output
  const validation = validatePhase1Output(phase1Output);
  if (!validation.valid) {
    throw new Error(`Phase 1 validation failed: ${validation.errors.join(', ')}`);
  }

  return phase1Output;
}

/**
 * Execute Phase 2: Content Generation
 * Generates detailed educational content for each concept
 */
export async function executePhase2(input: Phase2Input): Promise<Phase2Output> {
  const batchSize = input.batchSize || 10;
  const allConcepts: Phase2Output['concepts'] = [];

  // Process concepts in batches
  for (let i = 0; i < input.concepts.length; i += batchSize) {
    const batch = input.concepts.slice(i, i + batchSize);

    const userMessage = `Lifecycle Phases:
- Phase 1: ${input.lifecycle.phase1}
- Phase 2: ${input.lifecycle.phase2}
- Phase 3: ${input.lifecycle.phase3}

Concepts to generate content for:
${JSON.stringify(batch, null, 2)}

Generate detailed educational content for these ${batch.length} concepts following the instructions in the system prompt.`;

    const response = await callBedrock(PHASE2_PROMPT, userMessage);

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Phase 2 batch ${i / batchSize + 1} did not return valid JSON`);
    }

    const batchOutput: Phase2Output = JSON.parse(jsonMatch[0]);
    allConcepts.push(...batchOutput.concepts);
  }

  const phase2Output: Phase2Output = { concepts: allConcepts };

  // Validate Phase 2 output
  const validation = validatePhase2Output(phase2Output);
  if (!validation.valid) {
    throw new Error(`Phase 2 validation failed: ${validation.errors.join(', ')}`);
  }

  return phase2Output;
}

/**
 * Execute Phase 3: Validation
 * Validates generated content and identifies issues
 */
export async function executePhase3(input: Phase3Input): Promise<Phase3Output> {
  const userMessage = `Concepts to validate:
${JSON.stringify(input.concepts, null, 2)}

Validate the content following the instructions in the system prompt.`;

  const response = await callBedrock(PHASE3_PROMPT, userMessage, 'haiku'); // Use cheaper model

  // Parse JSON response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Phase 3 did not return valid JSON');
  }

  const phase3Output: Phase3Output = JSON.parse(jsonMatch[0]);

  return phase3Output;
}

/**
 * Call Bedrock API with system prompt and user message
 */
async function callBedrock(
  systemPrompt: string,
  userMessage: string,
  model: 'sonnet' | 'haiku' = 'sonnet'
): Promise<string> {
  const modelId = model === 'sonnet'
    ? 'us.anthropic.claude-sonnet-4-5-20250929-v1:0'
    : 'us.anthropic.claude-3-5-haiku-20241022-v1:0';

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: model === 'sonnet' ? 64000 : 16000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  };

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  if (responseBody.content && responseBody.content[0]?.text) {
    return responseBody.content[0].text;
  }

  throw new Error('Invalid response from Bedrock');
}

/**
 * Validate Phase 1 output structure and content
 */
function validatePhase1Output(output: Phase1Output): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!output.domain) errors.push('Missing domain');
  if (!output.lifecycle) errors.push('Missing lifecycle');
  if (!output.concepts || !Array.isArray(output.concepts)) {
    errors.push('Missing or invalid concepts array');
    return { valid: false, errors };
  }

  // Check concept count
  if (output.concepts.length < 20 || output.concepts.length > 50) {
    errors.push(`Concept count ${output.concepts.length} outside range 20-50`);
  }

  // Check each concept
  for (const concept of output.concepts) {
    if (!concept.name) errors.push(`Concept missing name`);
    if (!['foundation', 'keystone', 'utility'].includes(concept.tier)) {
      errors.push(`Concept "${concept.name}" has invalid tier: ${concept.tier}`);
    }
    if (!Array.isArray(concept.dependsOn)) {
      errors.push(`Concept "${concept.name}" has invalid dependsOn`);
    }
  }

  // Check for circular dependencies
  if (hasCycle(output.concepts)) {
    errors.push('Circular dependencies detected');
  }

  // Check for invalid dependency references
  const invalidDeps = validateDependencies(output.concepts);
  if (invalidDeps.length > 0) {
    errors.push(`Invalid dependencies: ${invalidDeps.map(d => `${d.concept}→${d.invalidDep}`).join(', ')}`);
  }

  // Check tier hierarchy (warnings only, don't fail validation)
  const tierIssues = validateTierHierarchy(output.concepts);
  if (tierIssues.length > 0) {
    console.warn(`Tier hierarchy warnings: ${tierIssues.length} issues found`);
    // Don't add to errors - these are guidelines, not hard requirements
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate Phase 2 output structure and content
 */
function validatePhase2Output(output: Phase2Output): ValidationResult {
  const errors: string[] = [];

  if (!output.concepts || !Array.isArray(output.concepts)) {
    errors.push('Missing or invalid concepts array');
    return { valid: false, errors };
  }

  // Check each concept has required fields
  for (const concept of output.concepts) {
    if (!concept.name) errors.push('Concept missing name');

    // CRITICAL: Validate that concept name is NOT a mnemonic anchor
    // Mnemonic anchors are visual metaphors (Castle, Volcano, Wrench), NOT concept names
    if (concept.name && concept.mnemonic?.anchor) {
      const name = concept.name.toLowerCase().replace(/[^a-z\s]/g, '');
      const anchor = concept.mnemonic.anchor.toLowerCase().replace(/[^a-z\s]/g, '');

      // Check if name matches anchor (or is very similar)
      if (name === anchor || name.includes(anchor) || anchor.includes(name)) {
        errors.push(`Concept name "${concept.name}" appears to be a mnemonic anchor. Use the actual concept name from Phase 1.`);
      }

      // Check for compound patterns like "X + Y" or "X (Y)"
      if (concept.name.includes('+') || concept.name.includes('(')) {
        errors.push(`Concept name "${concept.name}" contains compound pattern. Use the actual concept name from Phase 1.`);
      }

      // Check if name is too short and generic (likely a mnemonic)
      const commonMnemonics = ['castle', 'volcano', 'seesaw', 'wrench', 'battery', 'puzzle', 'star', 'key', 'bridge'];
      if (concept.name.length < 15 && commonMnemonics.some(m => name.includes(m))) {
        errors.push(`Concept name "${concept.name}" appears to be a mnemonic anchor. Use the actual concept name from Phase 1.`);
      }
    }

    if (!concept.shape) errors.push(`Concept "${concept.name}" missing shape`);
    if (!concept.lifecycle) errors.push(`Concept "${concept.name}" missing lifecycle`);
    if (!concept.mnemonic) errors.push(`Concept "${concept.name}" missing mnemonic`);
    if (!concept.whyYouNeed) errors.push(`Concept "${concept.name}" missing whyYouNeed`);
    if (!concept.realWorldExample) errors.push(`Concept "${concept.name}" missing realWorldExample`);

    // Check SHAPE completeness
    if (concept.shape) {
      if (!concept.shape.simpleCore) errors.push(`Concept "${concept.name}" missing shape.simpleCore`);
      if (!concept.shape.highStakesExample) errors.push(`Concept "${concept.name}" missing shape.highStakesExample`);
      if (!concept.shape.analogicalModel) errors.push(`Concept "${concept.name}" missing shape.analogicalModel`);
      if (!concept.shape.patternRecognition) errors.push(`Concept "${concept.name}" missing shape.patternRecognition`);
      if (!concept.shape.eliminationLogic) errors.push(`Concept "${concept.name}" missing shape.eliminationLogic`);

      // Check for circular definitions
      if (concept.shape.simpleCore && hasCircularDefinition(concept.name, concept.shape.simpleCore)) {
        errors.push(`Concept "${concept.name}" has circular definition in simpleCore`);
      }
    }

    // Check lifecycle
    if (concept.lifecycle?.phase1?.hookSentence && hasCircularDefinition(concept.name, concept.lifecycle.phase1.hookSentence)) {
      errors.push(`Concept "${concept.name}" has circular definition in hookSentence`);
    }

    // Check mnemonic
    if (concept.mnemonic) {
      if (!concept.mnemonic.anchor) errors.push(`Concept "${concept.name}" missing mnemonic.anchor`);
      if (!concept.mnemonic.story) errors.push(`Concept "${concept.name}" missing mnemonic.story`);
      if (concept.mnemonic.story && concept.mnemonic.story.length < 50) {
        errors.push(`Concept "${concept.name}" mnemonic.story too short (${concept.mnemonic.story.length} chars)`);
      }
      // Validate anchor is not a compound word
      if (concept.mnemonic.anchor && isCompoundWord(concept.mnemonic.anchor, concept.name)) {
        errors.push(`Concept "${concept.name}" has compound word anchor: "${concept.mnemonic.anchor}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
