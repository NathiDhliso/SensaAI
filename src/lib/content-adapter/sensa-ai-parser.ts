/**
 * SensaAI Learning Velocity Engine - Enhanced Content Parser
 * 
 * Extracts structured learning metadata from generated content to enable:
 * - Diagnostic assessments with foundation concept selection
 * - Blank sheet test key points for scoring
 * - Confusion pair identification for prevention system
 * - Tier classification for interleaving algorithm
 * 
 * Requirements: 3.4, 3.5, 1.2, 5.1
 */

import type { ParsedGeneratedContent, ParsedConcept } from './types';
import type { LearningConcept } from '@/lib/types/learning';

/**
 * Enhanced learning concept with SensaAI Learning Velocity Engine metadata
 */
export interface SensaAILearningConcept extends LearningConcept {
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

/**
 * Result of enhanced content parsing
 */
export interface SensaAIParseResult {
  success: boolean;
  data?: {
    concepts: SensaAILearningConcept[];
    totalConcepts: number;
    foundationConcepts: number;
    diagnosticReady: boolean;
    metadataCompleteness: number;  // 0-100%
  };
  error?: string;
}

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
    questions.push({
      id: `${concept.id}-distinction-${index}`,
      question: `True or False: ${distinction}`,
      type: 'true-false',
      correctAnswer: 1, // Assume true since it's a critical distinction
      expectedTime: 20,
      keyPoints: [distinction]
    });
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
  
  // Limit to 2-3 questions per concept (cognitive load)
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
function identifyConfusionPairs(concepts: ParsedConcept[]): ConfusionPairMetadata[] {
  const confusionPairs: ConfusionPairMetadata[] = [];
  
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
        
        confusionPairs.push({
          id: `confusion-${conceptA.id}-${conceptB.id}`,
          relatedConceptId: conceptB.id,
          relatedConceptName: conceptB.name,
          similarityScore: similarity,
          commonMistakes: [`Confusing ${conceptA.name} with ${conceptB.name}`],
          keyDifferences,
          mnemonicDistinguisher: distinguisher
        });
      }
    }
  }
  
  return confusionPairs;
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
function calculateTier(concept: ParsedConcept, allConcepts: ParsedConcept[]): 'Foundation' | 'Keystone' | 'Utility' {
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

/**
 * Transform ParsedConcept to SensaAILearningConcept with enhanced metadata
 */
function transformToSensaAIConcept(
  concept: ParsedConcept, 
  allConcepts: ParsedConcept[],
  confusionPairs: ConfusionPairMetadata[]
): SensaAILearningConcept {
  const keyPoints = extractKeyPoints(concept);
  const diagnosticQuestions = generateDiagnosticQuestions(concept);
  const foundationLevel = isFoundationLevel(concept, allConcepts);
  const tierLevel = calculateTier(concept, allConcepts);
  const complexityScore = calculateComplexityScore(concept);
  
  // Calculate weights for diagnostic selection
  const prerequisiteWeight = allConcepts.filter(other => 
    other.phase1.prerequisite?.toLowerCase().includes(concept.name.toLowerCase())
  ).length;
  
  const frequencyWeight = concept.phase1.selection.length + concept.phase2.length;
  
  const abstractionLevel = concept.phase1.microMetaphor.length > 0 || 
                          (concept.shape?.highStakesExample?.length || 0) > 0 
                          ? 'concrete' : 'abstract';
  
  // Find confusion pairs for this concept
  const conceptConfusionPairs = confusionPairs.filter(pair => 
    pair.id.includes(concept.id)
  );
  
  // Transform to base LearningConcept structure
  const baseConcept: LearningConcept = {
    id: concept.id,
    stageId: concept.stageId,
    order: concept.order,
    name: concept.name,
    icon: '🎯', // Default icon
    metaphor: concept.phase1.microMetaphor || concept.name,
    hookSentence: concept.phase1.hookSentence,
    whyYouNeed: concept.phase1.execution,
    realWorldExample: concept.shape?.highStakesExample || concept.phase1.execution,
    howToUse: concept.phase1.selection,
    technicalDetails: concept.phase2.join('\n'),
    prerequisites: concept.phase1.prerequisite ? [concept.phase1.prerequisite] : [],
    visualElement: concept.phase1.microMetaphor,
    actionButtonText: 'Learn More',
    logicalConnection: concept.logicalConnection,
    mnemonic: concept.mnemonic,
  };
  
  // Add SensaAI Learning Velocity Engine extensions
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
}

/**
 * Enhanced content parser for SensaAI Learning Velocity Engine
 */
export function parseSensaAIContent(parsedContent: ParsedGeneratedContent): SensaAIParseResult {
  try {
    if (!parsedContent.concepts || parsedContent.concepts.length === 0) {
      return {
        success: false,
        error: 'No concepts found in parsed content'
      };
    }
    
    // Identify confusion pairs across all concepts
    const confusionPairs = identifyConfusionPairs(parsedContent.concepts);
    
    // Transform concepts with enhanced metadata
    const sensaAIConcepts = parsedContent.concepts.map(concept => 
      transformToSensaAIConcept(concept, parsedContent.concepts, confusionPairs)
    );
    
    // Calculate metrics
    const foundationConcepts = sensaAIConcepts.filter(c => c.foundationLevel).length;
    const diagnosticReady = foundationConcepts >= 5; // Need at least 5 for diagnostic
    
    // Calculate metadata completeness
    let completenessScore = 0;
    let totalChecks = 0;
    
    sensaAIConcepts.forEach(concept => {
      totalChecks += 6; // 6 checks per concept
      
      if (concept.keyPoints.length >= 3) completenessScore++;
      if (concept.diagnosticQuestions.length >= 1) completenessScore++;
      if (concept.foundationLevel !== undefined) completenessScore++;
      if (concept.tierLevel) completenessScore++;
      if (concept.complexityScore > 0) completenessScore++;
      if (concept.confusionPairs.length >= 0) completenessScore++; // Always true, but validates structure
    });
    
    const metadataCompleteness = Math.round((completenessScore / totalChecks) * 100);
    
    return {
      success: true,
      data: {
        concepts: sensaAIConcepts,
        totalConcepts: sensaAIConcepts.length,
        foundationConcepts,
        diagnosticReady,
        metadataCompleteness
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse SensaAI content'
    };
  }
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
  const keystonePercent = (tierCounts.Keystone / total) * 100;
  const utilityPercent = (tierCounts.Utility / total) * 100;
  
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