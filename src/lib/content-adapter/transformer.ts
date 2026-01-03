import type { ParsedGeneratedContent, ParsedConcept, ParsedMentalAnchor } from './types';
import type { LearningStage, LearningConcept, ConceptLifecycle, SubjectGraph, MnemonicContext } from '@/lib/types/learning';
import { buildSubjectGraph } from '@/lib/generation/dependency-parser';
import { generateFloorPlan, buildTreemapInput, buildTreemapStages, type FloorPlanLayout } from '@/lib/generation/floor-plan-generator';

const DEFAULT_ICONS = ['shape:nebula', 'shape:synapse', 'shape:construct', 'shape:bastion', 'shape:prism'];
const DEFAULT_STAGE_ICONS = ['shape:seed', 'shape:sprout', 'shape:bloom', 'shape:crown', 'shape:synapse'];

function extractIconFromMetaphor(metaphor: string): string {
  const iconMap: Record<string, string> = {
    // Structural / Foundational -> Prism/Bastion
    'building': 'shape:prism', 'foundation': 'shape:bastion', 'structure': 'shape:construct',
    'house': 'shape:bastion', 'room': 'shape:construct', 'door': 'shape:prism',

    // Connected / Network -> Nebula/Synapse
    'network': 'shape:nebula', 'connection': 'shape:synapse', 'link': 'shape:synapse',
    'web': 'shape:nebula', 'cloud': 'shape:nebula', 'road': 'shape:nebula',

    // Logic / Intelligence -> Synapse
    'brain': 'shape:synapse', 'mind': 'shape:synapse', 'thought': 'shape:synapse',
    'nerve': 'shape:synapse', 'computer': 'shape:construct',

    // Security / Strength -> Bastion
    'lock': 'shape:bastion', 'shield': 'shape:bastion', 'wall': 'shape:bastion',
    'security': 'shape:bastion', 'safe': 'shape:bastion',

    // Tool / Action -> Construct
    'tool': 'shape:construct', 'hammer': 'shape:construct', 'wrench': 'shape:construct',
    'machine': 'shape:construct', 'engine': 'shape:construct',
  };

  const lowerMetaphor = metaphor.toLowerCase();
  for (const [keyword, icon] of Object.entries(iconMap)) {
    if (lowerMetaphor.includes(keyword)) {
      return icon;
    }
  }

  // Default fallback if no metaphor match
  return DEFAULT_ICONS[0];
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

function getConceptIcon(conceptName: string, mentalAnchors: ParsedMentalAnchor[]): string {
  const metaphor = findMetaphorForConcept(conceptName, mentalAnchors);
  return extractIconFromMetaphor(metaphor);
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
    const icon = getConceptIcon(parsedConcept.name, parsed.mentalAnchors);

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
