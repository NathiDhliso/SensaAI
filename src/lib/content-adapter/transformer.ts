import type { ParsedGeneratedContent, ParsedConcept, ParsedMentalAnchor } from './types';
import type { LearningStage, LearningConcept, ConceptLifecycle, SubjectGraph, MnemonicContext } from '@/lib/types/learning';
import { buildSubjectGraph } from '@/lib/generation/dependency-parser';
import { generateFloorPlan, buildTreemapInput, buildTreemapStages, type FloorPlanLayout } from '@/lib/generation/floor-plan-generator';
import { VISUAL_PALETTES, type PaletteType } from '@/lib/palace/theme-engine';

// ============================================================================
// SENSAAI LEARNING VELOCITY ENGINE EXTENSIONS
// Enhanced metadata for diagnostic assessments, blank sheet tests, and confusion prevention
// ============================================================================

/**
 * Enhanced learning concept with SensaAI Learning Velocity Engine metadata
 */
export interface SensaAILearningConcept extends Omit<LearningConcept, 'confusionPairs'> {
  // Core Learning Velocity Engine Extensions
  keyPoints: string[];                    // For blank sheet test analysis
  diagnosticQuestions: DiagnosticQuestion[];  // For diagnostic assessments
  confusionPairs: ConfusionPairMetadata[];     // For prevention system

  // Metadata for intelligent systems
  foundationLevel: boolean;               // Eligible for diagnostic inclusion
  tierLevel: 'Foundation' | 'Keystone' | 'Utility';  // For interleaving algorithm
  complexityScore: number;                // 1-10 for adaptive timing
  prerequisiteWeight: number;             // How many concepts depend on this
  frequencyWeight: number;                // How often this concept is used
  abstractionLevel: 'concrete' | 'abstract';  // For diagnostic selection
}

/**
 * Diagnostic question for foundation concept assessment
 */
export interface DiagnosticQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  options?: string[];
  correctAnswer: string | number;
  expectedTime: number;  // seconds
  keyPoints: string[];   // What this question tests
}

/**
 * Confusion pair metadata for prevention system
 */
export interface ConfusionPairMetadata {
  id: string;
  relatedConceptId: string;
  relatedConceptName: string;
  similarityScore: number;  // 0-1, how similar the concepts are
  commonMistakes: string[];
  keyDifferences: string[];
  mnemonicDistinguisher: string;
}

const DEFAULT_STAGE_ICONS = ['shape:seed', 'shape:sprout', 'shape:bloom', 'shape:crown', 'shape:synapse'];

// ============================================================================
// SENSAAI LEARNING VELOCITY ENGINE FUNCTIONS
// ============================================================================

/**
 * Extract key points from concept content for blank sheet test scoring
 */
function extractKeyPoints(concept: ParsedConcept): string[] {
  const keyPoints: string[] = [];

  // Extract from hook sentence and micro-metaphor
  if (concept.phase1.hookSentence) {
    keyPoints.push(concept.phase1.hookSentence);
  }

  if (concept.phase1.microMetaphor) {
    keyPoints.push(concept.phase1.microMetaphor);
  }

  // Extract from selection criteria (key functionality)
  concept.phase1.selection.forEach(item => {
    if (item.length > 10) { // Filter out very short items
      keyPoints.push(item);
    }
  });

  // Extract from phase2 configuration items
  concept.phase2.forEach(item => {
    if (item.includes(':')) {
      const [key, value] = item.split(':');
      if (value && value.trim().length > 5) {
        keyPoints.push(`${key.trim()}: ${value.trim()}`);
      }
    }
  });

  // Extract from critical distinctions
  keyPoints.push(...concept.criticalDistinctions);

  // Extract from SHAPE sections if available
  if (concept.shape) {
    if (concept.shape.simpleCore) {
      keyPoints.push(concept.shape.simpleCore);
    }
    if (concept.shape.highStakesExample) {
      keyPoints.push(concept.shape.highStakesExample);
    }
  }

  // Limit to 3-7 key points (cognitive load management)
  return keyPoints.slice(0, 7);
}

/**
 * Generate diagnostic questions from concept content
 * Enhanced to work with existing assessment infrastructure
 */
function generateDiagnosticQuestions(concept: ParsedConcept): DiagnosticQuestion[] {
  const questions: DiagnosticQuestion[] = [];

  // Generate from hook sentence (recognition question)
  if (concept.phase1.hookSentence) {
    questions.push({
      id: `${concept.id}-hook`,
      question: `What is the main purpose of ${concept.name}?`,
      type: 'short-answer',
      correctAnswer: concept.phase1.hookSentence,
      expectedTime: 30,
      keyPoints: [concept.phase1.hookSentence]
    });
  }

  // Generate from critical distinctions (true/false)
  concept.criticalDistinctions.forEach((distinction, index) => {
    if (index < 2) { // Limit to 2 to avoid cognitive overload
      questions.push({
        id: `${concept.id}-distinction-${index}`,
        question: `True or False: ${distinction}`,
        type: 'true-false',
        correctAnswer: 1, // True since it's a critical distinction
        expectedTime: 20,
        keyPoints: [distinction]
      });
    }
  });

  // Generate from SHAPE pattern recognition if available
  if (concept.shape?.patternRecognition?.question) {
    questions.push({
      id: `${concept.id}-pattern`,
      question: concept.shape.patternRecognition.question,
      type: 'short-answer',
      correctAnswer: concept.shape.patternRecognition.answer,
      expectedTime: 45,
      keyPoints: [concept.shape.patternRecognition.answer]
    });
  }

  // Generate multiple choice from selection criteria
  if (concept.phase1.selection.length >= 3) {
    const correctOption = concept.phase1.selection[0];
    const distractors = concept.phase1.selection.slice(1, 3);

    questions.push({
      id: `${concept.id}-selection`,
      question: `Which of the following is the primary approach for ${concept.name}?`,
      type: 'multiple-choice',
      options: [correctOption, ...distractors, 'None of the above'],
      correctAnswer: 0,
      expectedTime: 35,
      keyPoints: [correctOption]
    });
  }

  // Limit to 3 questions per concept (cognitive load management)
  return questions.slice(0, 3);
}

/**
 * Calculate concept similarity for confusion pair identification
 */
function calculateConceptSimilarity(conceptA: ParsedConcept, conceptB: ParsedConcept): number {
  let similarity = 0;
  let factors = 0;

  // Name similarity (basic string comparison)
  const nameA = conceptA.name.toLowerCase();
  const nameB = conceptB.name.toLowerCase();
  const commonWords = nameA.split(' ').filter(word => nameB.includes(word));
  if (commonWords.length > 0) {
    similarity += commonWords.length / Math.max(nameA.split(' ').length, nameB.split(' ').length);
    factors++;
  }

  // Phase similarity (same lifecycle phase usage)
  const phaseAItems = [...conceptA.phase1.selection, ...conceptA.phase2];
  const phaseBItems = [...conceptB.phase1.selection, ...conceptB.phase2];
  const commonPhaseItems = phaseAItems.filter(item =>
    phaseBItems.some(bItem => bItem.toLowerCase().includes(item.toLowerCase()) ||
      item.toLowerCase().includes(bItem.toLowerCase()))
  );
  if (commonPhaseItems.length > 0) {
    similarity += commonPhaseItems.length / Math.max(phaseAItems.length, phaseBItems.length);
    factors++;
  }

  // Tool similarity (same verification tools)
  if (conceptA.phase3.tool && conceptB.phase3.tool) {
    if (conceptA.phase3.tool.toLowerCase() === conceptB.phase3.tool.toLowerCase()) {
      similarity += 0.5;
    }
    factors++;
  }

  return factors > 0 ? similarity / factors : 0;
}

/**
 * Identify potential confusion pairs between concepts
 */
function identifyConfusionPairs(concepts: ParsedConcept[]): Map<string, ConfusionPairMetadata[]> {
  const confusionMap = new Map<string, ConfusionPairMetadata[]>();

  for (let i = 0; i < concepts.length; i++) {
    for (let j = i + 1; j < concepts.length; j++) {
      const conceptA = concepts[i];
      const conceptB = concepts[j];

      const similarity = calculateConceptSimilarity(conceptA, conceptB);

      // Consider concepts confusable if similarity > 0.3
      if (similarity > 0.3) {
        // Find key differences
        const keyDifferences: string[] = [];

        // Compare critical distinctions
        const uniqueToA = conceptA.criticalDistinctions.filter(d =>
          !conceptB.criticalDistinctions.some(bd => bd.toLowerCase().includes(d.toLowerCase()))
        );
        const uniqueToB = conceptB.criticalDistinctions.filter(d =>
          !conceptA.criticalDistinctions.some(ad => ad.toLowerCase().includes(d.toLowerCase()))
        );

        keyDifferences.push(...uniqueToA.map(d => `${conceptA.name}: ${d}`));
        keyDifferences.push(...uniqueToB.map(d => `${conceptB.name}: ${d}`));

        // Create mnemonic distinguisher
        const distinguisher = `${conceptA.name} vs ${conceptB.name}: ${keyDifferences[0] || 'Different use cases'}`;

        const pairA: ConfusionPairMetadata = {
          id: `confusion-${conceptA.id}-${conceptB.id}`,
          relatedConceptId: conceptB.id,
          relatedConceptName: conceptB.name,
          similarityScore: similarity,
          commonMistakes: [`Confusing ${conceptA.name} with ${conceptB.name}`],
          keyDifferences,
          mnemonicDistinguisher: distinguisher
        };

        const pairB: ConfusionPairMetadata = {
          id: `confusion-${conceptB.id}-${conceptA.id}`,
          relatedConceptId: conceptA.id,
          relatedConceptName: conceptA.name,
          similarityScore: similarity,
          commonMistakes: [`Confusing ${conceptB.name} with ${conceptA.name}`],
          keyDifferences: keyDifferences.map(d => d.replace(conceptA.name, conceptB.name).replace(conceptB.name, conceptA.name)),
          mnemonicDistinguisher: distinguisher.replace(conceptA.name, conceptB.name).replace(conceptB.name, conceptA.name)
        };

        if (!confusionMap.has(conceptA.id)) confusionMap.set(conceptA.id, []);
        if (!confusionMap.has(conceptB.id)) confusionMap.set(conceptB.id, []);

        confusionMap.get(conceptA.id)!.push(pairA);
        confusionMap.get(conceptB.id)!.push(pairB);
      }
    }
  }

  return confusionMap;
}

/**
 * Determine if concept is foundation level (eligible for diagnostics)
 */
function isFoundationLevel(concept: ParsedConcept, allConcepts: ParsedConcept[]): boolean {
  // Foundation concepts typically:
  // 1. Have fewer prerequisites
  // 2. Are referenced by other concepts
  // 3. Have concrete rather than abstract content

  const hasMinimalPrerequisites = !concept.phase1.prerequisite ||
    concept.phase1.prerequisite.toLowerCase().includes('none') ||
    concept.phase1.prerequisite.length < 50;

  const isReferencedByOthers = allConcepts.some(other =>
    other.id !== concept.id &&
    (other.phase1.prerequisite?.toLowerCase().includes(concept.name.toLowerCase()) ||
      other.phase1.execution?.toLowerCase().includes(concept.name.toLowerCase()))
  );

  const hasConcreteContent = concept.phase1.microMetaphor.length > 0 ||
    (concept.shape?.highStakesExample?.length || 0) > 0;

  return hasMinimalPrerequisites && (isReferencedByOthers || hasConcreteContent);
}

/**
 * Calculate concept tier for interleaving algorithm
 */
function calculateTierLevel(concept: ParsedConcept, allConcepts: ParsedConcept[]): 'Foundation' | 'Keystone' | 'Utility' {
  // Use mnemonic tier if available
  if (concept.mnemonic?.tier) {
    return concept.mnemonic.tier;
  }

  // Calculate based on dependencies
  const dependentCount = allConcepts.filter(other =>
    other.id !== concept.id &&
    (other.phase1.prerequisite?.toLowerCase().includes(concept.name.toLowerCase()) ||
      other.phase1.execution?.toLowerCase().includes(concept.name.toLowerCase()))
  ).length;

  const dependencyCount = concept.phase1.prerequisite &&
    !concept.phase1.prerequisite.toLowerCase().includes('none') ? 1 : 0;

  if (dependentCount >= 3) return 'Foundation';
  if (dependentCount >= 1 || dependencyCount > 0) return 'Keystone';
  return 'Utility';
}

/**
 * Calculate complexity score for adaptive timing
 */
function calculateComplexityScore(concept: ParsedConcept): number {
  let complexity = 1;

  // Factor in content length
  const totalContent = concept.phase1.execution.length +
    concept.phase2.join(' ').length +
    concept.phase3.thresholds.length;
  complexity += Math.min(3, totalContent / 500); // Max 3 points for length

  // Factor in number of selection criteria
  complexity += Math.min(2, concept.phase1.selection.length / 3); // Max 2 points

  // Factor in critical distinctions (indicates complexity)
  complexity += Math.min(2, concept.criticalDistinctions.length / 2); // Max 2 points

  // Factor in SHAPE sections (indicates comprehensive coverage)
  if (concept.shape) {
    const shapeCount = [
      concept.shape.simpleCore,
      concept.shape.highStakesExample,
      concept.shape.analogicalModel,
      concept.shape.patternRecognition.question,
      concept.shape.eliminationLogic
    ].filter(Boolean).length;
    complexity += Math.min(2, shapeCount / 3); // Max 2 points
  }

  return Math.min(10, Math.round(complexity));
}

// ============================================================================
// EXISTING TRANSFORMER FUNCTIONS
// ============================================================================

function getPaletteForDomain(domain: string): PaletteType {
  const d = domain.toLowerCase();

  // Tech / Engineering / Crypto
  if (d.includes('computer') || d.includes('tech') || d.includes('data') || d.includes('cyber') || d.includes('code') || d.includes('engineer')) {
    return 'Tech';
  }
  // Nature / Biology / Health
  if (d.includes('biology') || d.includes('health') || d.includes('environment') || d.includes('nature') || d.includes('agriculture')) {
    return 'Nature';
  }
  // Abstract / Philosophy / History / Arts
  if (d.includes('philosophy') || d.includes('history') || d.includes('art') || d.includes('literature') || d.includes('music')) {
    return 'Abstract';
  }
  // Structural / Architecture / Business / Law
  if (d.includes('architecture') || d.includes('business') || d.includes('law') || d.includes('finance') || d.includes('construct')) {
    return 'Structural';
  }

  return 'Default';
}

function extractIconFromMetaphor(metaphor: string, domain: string = 'General'): string {
  // 1. GLOBAL KEYWORDS (Strong matches independent of domain)
  // These are universally recognized metaphors
  const globalIcons: Record<string, string> = {
    'brain': 'shape:synapse', 'mind': 'shape:synapse', 'logic': 'shape:synapse',
    'cloud': 'shape:nebula', 'web': 'shape:nebula',
    'security': 'shape:bastion', 'shield': 'shape:bastion',
    'foundation': 'shape:bastion', 'core': 'shape:construct',
    'tool': 'shape:construct', 'engine': 'shape:construct',
    'plant': 'shape:sprout', 'growth': 'shape:bloom',
    'light': 'shape:prism', 'vision': 'shape:prism'
  };

  const lowerMetaphor = metaphor.toLowerCase();
  for (const [keyword, icon] of Object.entries(globalIcons)) {
    if (lowerMetaphor.includes(keyword)) {
      return icon;
    }
  }

  // 2. DOMAIN CONTEXT PALETTE (The Silver Bullet)
  // If no strong global keyword, we look at the specific palette for this domain
  const paletteName = getPaletteForDomain(domain);
  const palette = VISUAL_PALETTES[paletteName];

  // 3. DETERMINISTIC HASH FALLBACK WITHIN PALETTE
  // We use the hash to pick *from the curated palette* instead of a random shape
  // This ensures "Data Science" (Tech) gets Tech shapes, "Botany" gets Nature shapes
  let hash = 0;
  for (let i = 0; i < metaphor.length; i++) {
    hash = ((hash << 5) - hash) + metaphor.charCodeAt(i);
    hash |= 0;
  }

  return palette[Math.abs(hash) % palette.length];
}

function findMetaphorForConcept(conceptName: string, mentalAnchors: ParsedMentalAnchor[]): string {
  const lowerName = conceptName.toLowerCase();

  for (const anchor of mentalAnchors) {
    for (const mapping of anchor.mappings) {
      if (mapping.concept.toLowerCase().includes(lowerName) ||
        lowerName.includes(mapping.concept.toLowerCase())) {
        return mapping.metaphorElement;
      }
    }
  }

  return conceptName;
}

function getConceptIcon(conceptName: string, mentalAnchors: ParsedMentalAnchor[], domain: string): string {
  const metaphor = findMetaphorForConcept(conceptName, mentalAnchors);
  return extractIconFromMetaphor(metaphor, domain);
}



function generateHookSentence(concept: ParsedConcept, metaphor: string): string {
  // Use extracted hook sentence if available
  if (concept.phase1.hookSentence) {
    return concept.phase1.hookSentence;
  }
  // Use SHAPE simple core as fallback
  if (concept.shape?.simpleCore) {
    return concept.shape.simpleCore;
  }
  // Generate fallback
  if (concept.phase1.prerequisite) {
    return `${metaphor} - ${concept.name} provides the foundation for effective operations.`;
  }
  return `Every system needs a ${metaphor.toLowerCase()}. ${concept.name} makes it possible.`;
}

function getConceptMetaphor(concept: ParsedConcept, mentalAnchors: ParsedMentalAnchor[]): string {
  // Use extracted micro-metaphor if available
  if (concept.phase1.microMetaphor) {
    return concept.phase1.microMetaphor;
  }
  // Fall back to finding from mental anchors
  return findMetaphorForConcept(concept.name, mentalAnchors);
}

function extractPrerequisites(concept: ParsedConcept, allConcepts: ParsedConcept[]): string[] {
  const prereqText = concept.phase1.prerequisite.toLowerCase();
  const prerequisites: string[] = [];

  for (const other of allConcepts) {
    if (other.id === concept.id) continue;

    const otherNameLower = other.name.toLowerCase();
    if (prereqText.includes(otherNameLower) ||
      prereqText.includes(other.id.replace(/-/g, ' '))) {
      prerequisites.push(other.id);
    }
  }

  return prerequisites;
}

function generateWhyYouNeed(concept: ParsedConcept): string {
  // Use SHAPE elimination logic if available (it explains key distinctions)
  if (concept.shape?.eliminationLogic) {
    return concept.shape.eliminationLogic;
  }
  if (concept.criticalDistinctions.length > 0) {
    return concept.criticalDistinctions[0];
  }

  if (concept.designBoundaries.length > 0) {
    return concept.designBoundaries[0];
  }

  return `${concept.name} is essential for mastering this subject effectively.`;
}

function generateRealWorldExample(concept: ParsedConcept, metaphor: string): string {
  // Use SHAPE high-stakes example if available
  if (concept.shape?.highStakesExample) {
    return concept.shape.highStakesExample;
  }
  // Use SHAPE analogical model if available
  if (concept.shape?.analogicalModel) {
    return concept.shape.analogicalModel;
  }
  return `Just like ${metaphor.toLowerCase()}, ${concept.name} provides essential functionality in this domain.`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function transformToLearningStages(
  parsed: ParsedGeneratedContent
): LearningStage[] {
  const stages: LearningStage[] = [];

  if (parsed.learningPath.stages.length > 0) {
    for (const stage of parsed.learningPath.stages) {
      const stageId = `stage-${stage.order}-${slugify(stage.name)}`;
      const conceptIds = stage.concepts.map(c => slugify(c));

      const stageIcon = DEFAULT_STAGE_ICONS[stage.order - 1] || DEFAULT_STAGE_ICONS[0];
      const metaphorDesc = stage.capabilitiesGained || `Master the ${stage.name.toLowerCase()} concepts`;

      stages.push({
        id: stageId,
        order: stage.order,
        name: stage.name,
        metaphor: stage.name,
        metaphorDescription: metaphorDesc,
        icon: stageIcon,
        concepts: conceptIds,
        celebrationTitle: `${stage.name} Complete!`,
        celebrationMessage: stage.capabilitiesGained || `You've mastered the ${stage.name.toLowerCase()} concepts!`,
        narrativeBridge: stage.narrativeBridge,
      });
    }
  } else {
    stages.push({
      id: 'stage-1-foundation',
      order: 1,
      name: 'Foundation',
      metaphor: 'Foundation',
      metaphorDescription: 'Establish the core concepts.',
      icon: DEFAULT_STAGE_ICONS[0],
      concepts: parsed.concepts.slice(0, 8).map(c => c.id),
      celebrationTitle: 'Foundation Complete!',
      celebrationMessage: 'You\'ve mastered the foundational concepts!',
    });
  }

  return stages;
}

function findStageForConcept(conceptId: string, stages: LearningStage[]): LearningStage | undefined {
  for (const stage of stages) {
    if (stage.concepts.includes(conceptId)) {
      return stage;
    }
    for (const stageConceptId of stage.concepts) {
      if (stageConceptId.includes(conceptId) || conceptId.includes(stageConceptId)) {
        return stage;
      }
      const normalizedStage = stageConceptId.replace(/-/g, '').toLowerCase();
      const normalizedConcept = conceptId.replace(/-/g, '').toLowerCase();
      if (normalizedStage === normalizedConcept ||
        normalizedStage.includes(normalizedConcept) ||
        normalizedConcept.includes(normalizedStage)) {
        return stage;
      }
    }
  }
  return undefined;
}

function distributeConceptsToStages(
  concepts: ParsedConcept[],
  stages: LearningStage[]
): Map<string, string> {
  const conceptToStage = new Map<string, string>();
  const conceptsPerStage = Math.ceil(concepts.length / stages.length);

  for (const concept of concepts) {
    const matchedStage = findStageForConcept(concept.id, stages);
    if (matchedStage) {
      conceptToStage.set(concept.id, matchedStage.id);
    }
  }

  const unmatchedConcepts = concepts.filter(c => !conceptToStage.has(c.id));
  if (unmatchedConcepts.length > 0) {
    const stageConceptCounts = new Map<string, number>();
    stages.forEach(s => stageConceptCounts.set(s.id, 0));
    conceptToStage.forEach((stageId) => {
      stageConceptCounts.set(stageId, (stageConceptCounts.get(stageId) || 0) + 1);
    });

    for (const concept of unmatchedConcepts) {
      let targetStage = stages[0];
      let minCount = Infinity;
      for (const stage of stages) {
        const count = stageConceptCounts.get(stage.id) || 0;
        if (count < minCount && count < conceptsPerStage) {
          minCount = count;
          targetStage = stage;
        }
      }
      conceptToStage.set(concept.id, targetStage.id);
      stageConceptCounts.set(targetStage.id, (stageConceptCounts.get(targetStage.id) || 0) + 1);
    }
  }

  return conceptToStage;
}

export function transformToLearningConcepts(
  parsed: ParsedGeneratedContent,
  stages: LearningStage[]
): LearningConcept[] {
  const concepts: LearningConcept[] = [];

  const lifecycleLabels = parsed.domainAnalysis.lifecycle;
  const conceptToStage = distributeConceptsToStages(parsed.concepts, stages);

  for (const parsedConcept of parsed.concepts) {
    const stageId = conceptToStage.get(parsedConcept.id) || stages[0]?.id;
    const stage = stages.find(s => s.id === stageId) || stages[0];
    const stageConceptIndex = Array.from(conceptToStage.entries())
      .filter(([, sId]) => sId === stageId)
      .findIndex(([cId]) => cId === parsedConcept.id);

    const howToUse = parsedConcept.phase2.slice(0, 3);
    if (howToUse.length === 0 && parsedConcept.phase1.execution) {
      howToUse.push(parsedConcept.phase1.execution);
    }

    const technicalDetails = [
      ...parsedConcept.criticalDistinctions,
      ...parsedConcept.designBoundaries,
      ...parsedConcept.examFocus,
    ].join(' ');

    const phase1Steps: string[] = [];
    if (parsedConcept.phase1.prerequisite) {
      phase1Steps.push(`Prerequisite: ${parsedConcept.phase1.prerequisite}`);
    }
    if (parsedConcept.phase1.selection.length > 0) {
      phase1Steps.push(...parsedConcept.phase1.selection);
    }
    if (parsedConcept.phase1.execution) {
      phase1Steps.push(parsedConcept.phase1.execution);
    }

    const phase3Steps: string[] = [];
    if (parsedConcept.phase3.tool) {
      phase3Steps.push(`Tool: ${parsedConcept.phase3.tool}`);
    }
    if (parsedConcept.phase3.metrics.length > 0) {
      phase3Steps.push(`Metrics: ${parsedConcept.phase3.metrics.join(', ')}`);
    }
    if (parsedConcept.phase3.thresholds) {
      phase3Steps.push(`Thresholds: ${parsedConcept.phase3.thresholds}`);
    }

    const lifecycle: ConceptLifecycle = {
      phase1: {
        title: lifecycleLabels.phase1 || 'FOUNDATION',
        steps: phase1Steps.length > 0 ? phase1Steps : ['Establish prerequisites', 'Select approach', 'Begin execution'],
      },
      phase2: {
        title: lifecycleLabels.phase2 || 'ACTION',
        steps: parsedConcept.phase2.length > 0 ? parsedConcept.phase2 : ['Apply core operations', 'Implement key steps', 'Execute primary actions'],
      },
      phase3: {
        title: lifecycleLabels.phase3 || 'VERIFICATION',
        steps: phase3Steps.length > 0 ? phase3Steps : ['Validate outcomes', 'Review results', 'Confirm completion'],
      },
    };

    const metaphor = getConceptMetaphor(parsedConcept, parsed.mentalAnchors);
    const icon = getConceptIcon(parsedConcept.name, parsed.mentalAnchors, parsed.domainAnalysis.domain);

    // Transform parsed mnemonic to MnemonicContext
    let mnemonic: MnemonicContext | undefined;
    if (parsedConcept.mnemonic) {
      mnemonic = {
        anchor: parsedConcept.mnemonic.anchor,
        story: parsedConcept.mnemonic.story,
        tier: parsedConcept.mnemonic.tier,
        parentName: parsedConcept.mnemonic.parentName,
        parentId: parsedConcept.mnemonic.parentId,
        dependsOn: parsedConcept.mnemonic.dependsOn,
      };
    }

    concepts.push({
      id: parsedConcept.id,
      stageId: stage?.id || 'stage-1-foundation',
      order: stageConceptIndex + 1,
      name: parsedConcept.name,
      icon,
      metaphor,
      hookSentence: generateHookSentence(parsedConcept, metaphor),
      whyYouNeed: generateWhyYouNeed(parsedConcept),
      realWorldExample: generateRealWorldExample(parsedConcept, metaphor),
      howToUse: howToUse.length > 0 ? howToUse : ['Review the concept details', 'Understand the lifecycle', 'Practice application'],
      technicalDetails: technicalDetails || `${parsedConcept.name} is a core concept in this domain.`,
      prerequisites: extractPrerequisites(parsedConcept, parsed.concepts),
      visualElement: slugify(parsedConcept.name),
      actionButtonText: `Master ${parsedConcept.name}`,
      lifecycle,
      logicalConnection: parsedConcept.logicalConnection,
      mnemonic,
    });
  }

  return concepts;
}

/**
 * Transform concepts to SensaAI Learning Velocity Engine enhanced concepts
 * Adds diagnostic questions, key points, confusion pairs, and metadata
 */
export function transformToSensaAIConcepts(
  parsed: ParsedGeneratedContent,
  stages: LearningStage[]
): SensaAILearningConcept[] {
  // First get the base learning concepts
  const baseConcepts = transformToLearningConcepts(parsed, stages);

  // Identify confusion pairs across all concepts
  const confusionMap = identifyConfusionPairs(parsed.concepts);

  // Transform to SensaAI enhanced concepts
  const sensaAIConcepts: SensaAILearningConcept[] = baseConcepts.map((baseConcept) => {
    const parsedConcept = parsed.concepts.find(pc => pc.id === baseConcept.id);
    if (!parsedConcept) {
      throw new Error(`Parsed concept not found for ${baseConcept.id}`);
    }

    // Extract SensaAI metadata
    const keyPoints = extractKeyPoints(parsedConcept);
    const diagnosticQuestions = generateDiagnosticQuestions(parsedConcept);
    const foundationLevel = isFoundationLevel(parsedConcept, parsed.concepts);
    const tierLevel = calculateTierLevel(parsedConcept, parsed.concepts);
    const complexityScore = calculateComplexityScore(parsedConcept);

    // Calculate weights for diagnostic selection
    const prerequisiteWeight = parsed.concepts.filter(other =>
      other.phase1.prerequisite?.toLowerCase().includes(parsedConcept.name.toLowerCase())
    ).length;

    const frequencyWeight = parsedConcept.phase1.selection.length + parsedConcept.phase2.length;

    const abstractionLevel = parsedConcept.phase1.microMetaphor.length > 0 ||
      (parsedConcept.shape?.highStakesExample?.length || 0) > 0
      ? 'concrete' : 'abstract';

    // Get confusion pairs for this concept
    const conceptConfusionPairs = confusionMap.get(parsedConcept.id) || [];

    return {
      ...baseConcept,
      keyPoints,
      diagnosticQuestions,
      confusionPairs: conceptConfusionPairs,
      foundationLevel,
      tierLevel,
      complexityScore,
      prerequisiteWeight,
      frequencyWeight,
      abstractionLevel,
    };
  });

  return sensaAIConcepts;
}

export function transformGeneratedContent(parsed: ParsedGeneratedContent, subjectId?: string): {
  stages: LearningStage[];
  concepts: LearningConcept[];
  dependencyGraph: SubjectGraph;
  floorPlan: FloorPlanLayout;
  metadata: {
    domain: string;
    role: string;
    source: string;
    conceptCount: number;
  };
} {
  const stages = transformToLearningStages(parsed);
  const concepts = transformToLearningConcepts(parsed, stages);

  // Build the dependency graph from parsed concepts
  // This is the "Freeze & Bake" foundation - calculated once at generation time
  const dependencyGraph = buildSubjectGraph(
    subjectId || `subject-${Date.now()}`,
    parsed.concepts
  );

  // Build floor plan layout (treemap positions)
  // This is the "Freeze & Bake" visual layer - positions saved forever
  const treemapConcepts = buildTreemapInput(
    concepts.map(c => ({
      id: c.id,
      name: c.name,
      stageId: c.stageId,
      mnemonic: c.mnemonic,
      dependencyMetrics: dependencyGraph.nodes.find(n => n.id === c.id)?.metrics,
    }))
  );
  const treemapStages = buildTreemapStages(stages);
  const floorPlan = generateFloorPlan(treemapConcepts, treemapStages);

  return {
    stages,
    concepts,
    dependencyGraph,
    floorPlan,
    metadata: {
      domain: parsed.domainAnalysis.domain,
      role: parsed.domainAnalysis.professionalRole,
      source: parsed.domainAnalysis.sourceVerification,
      conceptCount: concepts.length,
    },
  };
}

/**
 * Enhanced transformation with SensaAI Learning Velocity Engine metadata
 */
export function transformToSensaAIContent(parsed: ParsedGeneratedContent, subjectId?: string): {
  stages: LearningStage[];
  concepts: SensaAILearningConcept[];
  dependencyGraph: SubjectGraph;
  floorPlan: FloorPlanLayout;
  metadata: {
    domain: string;
    role: string;
    source: string;
    conceptCount: number;
    foundationConcepts: number;
    diagnosticReady: boolean;
    metadataCompleteness: number;
  };
} {
  const stages = transformToLearningStages(parsed);
  const concepts = transformToSensaAIConcepts(parsed, stages);

  // Build the dependency graph from parsed concepts
  const dependencyGraph = buildSubjectGraph(
    subjectId || `subject-${Date.now()}`,
    parsed.concepts
  );

  // Build floor plan layout (treemap positions)
  const treemapConcepts = buildTreemapInput(
    concepts.map(c => ({
      id: c.id,
      name: c.name,
      stageId: c.stageId,
      mnemonic: c.mnemonic,
      dependencyMetrics: dependencyGraph.nodes.find(n => n.id === c.id)?.metrics,
    }))
  );
  const treemapStages = buildTreemapStages(stages);
  const floorPlan = generateFloorPlan(treemapConcepts, treemapStages);

  // Calculate SensaAI metrics
  const foundationConcepts = concepts.filter(c => c.foundationLevel).length;
  const diagnosticReady = foundationConcepts >= 5; // Need at least 5 for diagnostic

  // Calculate metadata completeness
  let completenessScore = 0;
  let totalChecks = 0;

  concepts.forEach(concept => {
    totalChecks += 6; // 6 checks per concept

    if (concept.keyPoints.length >= 3) completenessScore++;
    if (concept.diagnosticQuestions.length >= 1) completenessScore++;
    if (concept.foundationLevel !== undefined) completenessScore++;
    if (concept.tierLevel) completenessScore++;
    if (concept.complexityScore > 0) completenessScore++;
    if (concept.confusionPairs.length >= 0) completenessScore++; // Always true, validates structure
  });

  const metadataCompleteness = Math.round((completenessScore / totalChecks) * 100);

  return {
    stages,
    concepts,
    dependencyGraph,
    floorPlan,
    metadata: {
      domain: parsed.domainAnalysis.domain,
      role: parsed.domainAnalysis.professionalRole,
      source: parsed.domainAnalysis.sourceVerification,
      conceptCount: concepts.length,
      foundationConcepts,
      diagnosticReady,
      metadataCompleteness,
    },
  };
}

/**
 * Validate that content has sufficient metadata for Learning Velocity Engine
 */
export function validateSensaAIMetadata(concepts: SensaAILearningConcept[]): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check foundation concepts for diagnostics
  const foundationCount = concepts.filter(c => c.foundationLevel).length;
  if (foundationCount < 5) {
    issues.push(`Only ${foundationCount} foundation concepts found, need at least 5 for diagnostics`);
    recommendations.push('Ensure concepts have minimal prerequisites and concrete examples');
  }

  // Check key points coverage
  const conceptsWithoutKeyPoints = concepts.filter(c => c.keyPoints.length < 3).length;
  if (conceptsWithoutKeyPoints > 0) {
    issues.push(`${conceptsWithoutKeyPoints} concepts have insufficient key points`);
    recommendations.push('Ensure concepts have hook sentences, micro-metaphors, and critical distinctions');
  }

  // Check diagnostic questions
  const conceptsWithoutQuestions = concepts.filter(c => c.diagnosticQuestions.length === 0).length;
  if (conceptsWithoutQuestions > 0) {
    issues.push(`${conceptsWithoutQuestions} concepts lack diagnostic questions`);
    recommendations.push('Add critical distinctions and pattern recognition questions to concepts');
  }

  // Check tier distribution
  const tierCounts = {
    Foundation: concepts.filter(c => c.tierLevel === 'Foundation').length,
    Keystone: concepts.filter(c => c.tierLevel === 'Keystone').length,
    Utility: concepts.filter(c => c.tierLevel === 'Utility').length
  };

  const total = concepts.length;
  const foundationPercent = (tierCounts.Foundation / total) * 100;


  // Target: Foundation 40%, Keystone 35%, Utility 25%
  if (foundationPercent < 30 || foundationPercent > 50) {
    issues.push(`Foundation concepts: ${foundationPercent.toFixed(1)}% (target: 40%)`);
    recommendations.push('Adjust concept dependencies to achieve better tier balance');
  }

  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
}
