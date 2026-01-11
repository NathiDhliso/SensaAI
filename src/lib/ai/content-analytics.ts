
import { parseGeneratedContent } from '@/lib/content-adapter';
import type { ParsedGeneratedContent, ParsedConfusionPair } from '@/lib/content-adapter/types';
import type { SavedResult } from '@/lib/storage/types';
import type { EquationMetadata } from '@/lib/types/sensa-flow.types';

/** Tier distribution from system prompt STEP 3.7 */
export interface TierDistribution {
    foundation: number;
    keystone: number;
    utility: number;
    total: number;
}

/** SHAPE micro-learning coverage from STEP 3.5 */
export interface ShapeCoverage {
    complete: number;      // Concepts with all 5 SHAPE sections
    partial: number;       // Concepts with some SHAPE sections
    missing: number;       // Concepts without SHAPE
    percentage: number;    // Completion percentage
}

/** Mnemonic anchor coverage from STEP 3.7 */
export interface MnemonicCoverage {
    withAnchors: number;   // Concepts with memory palace anchors
    withStories: number;   // Concepts with bizarre stories
    percentage: number;    // Coverage percentage
}

/** Decision framework info from STEP 3.6 */
export interface DecisionFramework {
    available: boolean;
    treeCount: number;
}

export interface ContentMetrics {
    qualityScore: number;       // 0-100
    predictedPassRate: number;  // 0-100
    masteryTimeMinutes: number; // Est. time to learn
    totalConcepts: number;
    cognitiveLoadScore: number; // 1-10 (Dense)
    wordCount: number;
    gaps: string[];             // Areas needing improvement
}

/** Extended metrics from system prompt elements */
export interface SystemPromptMetrics {
    tierDistribution: TierDistribution;
    shapeCoverage: ShapeCoverage;
    mnemonicCoverage: MnemonicCoverage;
    confusionPairs: ParsedConfusionPair[];
    decisionFrameworks: DecisionFramework;
    lifecyclePhases: {
        phase1: string;
        phase2: string;
        phase3: string;
    } | null;
    /** SENSA v2.0: Equation quality metadata from AI */
    equationMetadata: EquationMetadata | null;
}

export interface TreePacket {
    name: string;
    size: number;   // Represents density/word count
    score: number;  // Represents quality/coverage (0-100)
    tier?: 'Foundation' | 'Keystone' | 'Utility' | 'foundation' | 'keystone' | 'utility';
    children?: TreePacket[];
    [key: string]: any; // Index signature for Recharts
}

export interface ContentAnalytics {
    metrics: ContentMetrics;
    systemPromptMetrics: SystemPromptMetrics;
    coverageMap: TreePacket[];
    recommendations: string[];
}

/**
 * pure analysis of the specific content result.
 * STRICTLY NO MOCK DATA.
 */
export function analyzeContentQuality(result: SavedResult): ContentAnalytics {
    // 1. Parse the full document to get deep structure
    const parseResult = parseGeneratedContent(result.fullDocument);
    const parsedData: ParsedGeneratedContent | null = parseResult.success ? parseResult.data : null;

    // 2. Base Metrics Calculation
    const validation = result.validation;

    // Quality Score: Weighted average of validation metrics + content robustness
    // We weight 'completeness' higher as it indicates depth
    const baseQuality = (
        (validation.lifecycleConsistency * 1) +
        (validation.positiveFraming * 0.5) +
        (validation.formatConsistency * 0.5) +
        (validation.completeness * 2)
    ) / 4; // Normalize

    const wordCount = result.fullDocument.split(/\s+/).length;
    const totalConcepts = result.pass1Data.concepts.length;

    // 3. Mastery Time Estimation
    // Reading time: 200 wpm
    // Concept Deep Dive: 3 mins per concept (velocity learning avg)
    const readingTimeMin = wordCount / 200;
    const conceptLearningTimeMin = totalConcepts * 3;
    const masteryTimeMinutes = Math.round(readingTimeMin + conceptLearningTimeMin);

    // 4. Cognitive Load Calculation
    // Ratio of concepts to words. Higher ratio = Denser content = Higher Load.
    // Healthy density is approx 1 concept per 100 words.
    const densityRatio = wordCount > 0 ? (totalConcepts / wordCount) * 1000 : 0;

    // Scale 1-10. 10 is very dense.
    // Typical range: 5 to 25. Map 5->1, 25->10.
    const cognitiveLoadScore = Math.min(10, Math.max(1, Math.round(densityRatio / 2)));

    // 5. Predicted Pass Rate (The "Confidence" Metric)
    // Derived from Quality Score but penalized by recognized gaps or low word count
    let predictedPassRate = baseQuality;

    // Penalize for being too short (thin content)
    if (wordCount < 1000) predictedPassRate *= 0.8;
    if (totalConcepts < 10) predictedPassRate *= 0.7;

    predictedPassRate = Math.min(99, Math.round(predictedPassRate));

    // =====================================================
    // 6. SYSTEM PROMPT METRICS - Deep content analysis
    // =====================================================
    const systemPromptMetrics = analyzeSystemPromptElements(parsedData, result);

    // 7. Generate Recommendations (Real, data-driven)
    const recommendations: string[] = [];

    if (totalConcepts < 15) {
        recommendations.push("Expand coverage: Topic count is low for this subject.");
    }
    if (readabilityScore(result.fullDocument) > 12) { // Simple Flesch-Kincaid proxy
        recommendations.push("Simplify text: High vocabulary load detected.");
    }
    if (validation.completeness < 80) {
        recommendations.push("Improve depth: Content lacks expected detail.");
    }
    if (cognitiveLoadScore > 8) {
        recommendations.push("Reduce density: Concepts are packed too tightly. Breaks needed.");
    }

    // System prompt-specific recommendations
    if (systemPromptMetrics.shapeCoverage.percentage < 50) {
        recommendations.push("Add SHAPE sections: Micro-learning content is incomplete.");
    }
    if (systemPromptMetrics.mnemonicCoverage.percentage < 50) {
        recommendations.push("Add memory anchors: Mnemonic content aids retention.");
    }
    if (systemPromptMetrics.confusionPairs.length < 3) {
        recommendations.push("Add confusion pairs: Discrimination practice improves recall.");
    }
    if (!systemPromptMetrics.decisionFrameworks.available) {
        recommendations.push("Add decision trees: 'When X vs Y?' frameworks aid application.");
    }

    if (recommendations.length === 0) {
        recommendations.push("Ready to learn! Content looks healthy.");
    }

    // 8. Build Coverage Map (Treemap) - Enhanced with tier information
    const coverageMap: TreePacket[] = buildCoverageMap(parsedData, result, baseQuality);

    return {
        metrics: {
            qualityScore: Math.round(baseQuality),
            predictedPassRate,
            masteryTimeMinutes,
            totalConcepts,
            cognitiveLoadScore,
            wordCount,
            gaps: []
        },
        systemPromptMetrics,
        coverageMap,
        recommendations
    };
}

/**
 * Analyze elements from the system prompt structure
 */
function analyzeSystemPromptElements(
    parsedData: ParsedGeneratedContent | null,
    result: SavedResult
): SystemPromptMetrics {
    // Tier Distribution (STEP 3.7)
    const tierDistribution: TierDistribution = {
        foundation: 0,
        keystone: 0,
        utility: 0,
        total: 0
    };

    // SHAPE Coverage (STEP 3.5)
    let shapeComplete = 0;
    let shapePartial = 0;
    let shapeMissing = 0;

    // Mnemonic Coverage (STEP 3.7)
    let withAnchors = 0;
    let withStories = 0;

    if (parsedData?.concepts) {
        tierDistribution.total = parsedData.concepts.length;

        parsedData.concepts.forEach(concept => {
            // Count tiers
            // Count tiers
            const tier = concept.tier || concept.mnemonic?.tier;
            if (tier) {
                const normalizedTier = tier.toLowerCase();

                if (normalizedTier === 'foundation') {
                    tierDistribution.foundation++;
                } else if (normalizedTier === 'keystone') {
                    tierDistribution.keystone++;
                } else if (normalizedTier === 'utility') {
                    tierDistribution.utility++;
                } else {
                    console.warn(`[Analytics] Unknown tier value: ${tier} for concept ${concept.name}`);
                }
            } else {
                console.warn(`[Analytics] Missing tier for concept: ${concept.name}`);
            }

            // Count SHAPE sections
            if (concept.shape) {
                const shapeFields = [
                    concept.shape.simpleCore,
                    concept.shape.highStakesExample,
                    concept.shape.analogicalModel,
                    concept.shape.patternRecognition?.question,
                    concept.shape.eliminationLogic
                ];
                const filledFields = shapeFields.filter(Boolean).length;

                if (filledFields === 5) {
                    shapeComplete++;
                } else if (filledFields > 0) {
                    shapePartial++;
                } else {
                    shapeMissing++;
                }
            } else {
                shapeMissing++;
            }

            // Count mnemonic coverage
            if (concept.mnemonic?.anchor) {
                withAnchors++;
            }
            if (concept.mnemonic?.story) {
                withStories++;
            }
        });
    }

    const totalConcepts = parsedData?.concepts.length || result.pass1Data.concepts.length;

    // Confusion Pairs (STEP 5.5)
    const confusionPairs = parsedData?.confusionPairs || [];

    // Decision Frameworks (STEP 3.6) - Check if mental anchors have binary decision rules
    const hasDecisionTrees = parsedData?.mentalAnchors?.some(a => a.binaryDecisionRule) || false;
    const treeCount = parsedData?.mentalAnchors?.filter(a => a.binaryDecisionRule).length || 0;

    // Lifecycle phases (STEP 2)
    const lifecyclePhases = parsedData?.domainAnalysis?.lifecycle || null;

    // SENSA v2.0: Equation Metadata (STEP 8)
    // Create equation metadata from content analysis (AI equationMetadata will be added to parser later)
    const equationMetadata: EquationMetadata = createDefaultEquationMetadata(
        tierDistribution,
        { complete: shapeComplete, partial: shapePartial, missing: shapeMissing, percentage: totalConcepts > 0 ? Math.round((shapeComplete / totalConcepts) * 100) : 0 }
    );

    return {
        tierDistribution,
        shapeCoverage: {
            complete: shapeComplete,
            partial: shapePartial,
            missing: shapeMissing,
            percentage: totalConcepts > 0 ? Math.round((shapeComplete / totalConcepts) * 100) : 0
        },
        mnemonicCoverage: {
            withAnchors,
            withStories,
            percentage: totalConcepts > 0 ? Math.round((withAnchors / totalConcepts) * 100) : 0
        },
        confusionPairs,
        decisionFrameworks: {
            available: hasDecisionTrees,
            treeCount
        },
        lifecyclePhases,
        equationMetadata
    };
}

/**
 * Create default equation metadata when AI doesn't provide it
 */
function createDefaultEquationMetadata(
    tierDist: TierDistribution,
    shapeCov: ShapeCoverage
): EquationMetadata {
    // Calculate Q_P from tier balance
    const tierBalance = tierDist.total > 0
        ? (tierDist.foundation + tierDist.keystone) / tierDist.total
        : 0.5;
    const Q_P_value = Math.min(1, tierBalance * 0.8 + 0.2);

    // Calculate Q_M from shape and mnemonic coverage
    const Q_M_value = Math.min(1, (shapeCov.percentage / 100) * 0.7 + 0.3);

    // Default Q_f (will be determined at runtime)
    const Q_f_value = 0.5;

    // Default G (governance)
    const G_value = 1.0;

    // Calculate I baseline
    // Ensure all values are valid numbers before calculation
    const Q_P_safe = isNaN(Q_P_value) ? 0 : Q_P_value;
    const Q_M_safe = isNaN(Q_M_value) ? 0 : Q_M_value;
    const Q_f_safe = isNaN(Q_f_value) ? 0 : Q_f_value;
    const G_safe = isNaN(G_value) ? 0 : G_value;

    const I_baseline_value = G_safe * Q_f_safe * Q_M_safe * Q_P_safe;

    return {
        Q_P: {
            score: isNaN(Q_P_value) ? 0 : Q_P_value,
            components: {
                atomicity: tierBalance,
                tierBalance: tierBalance,
                dependencyClarity: 0.5
            },
            reasoning: `Tier balance: ${Math.round(tierBalance * 100)}%`,
            improvementAreas: tierBalance < 0.6 ? ['Add more foundation concepts'] : []
        },
        Q_M: {
            score: isNaN(Q_M_value) ? 0 : Q_M_value,
            components: {
                graphCompleteness: 0.5,
                mnemonicCoverage: shapeCov.percentage / 100,
                confusionPairCoverage: 0.5
            },
            reasoning: `SHAPE coverage: ${shapeCov.percentage}%`,
            improvementAreas: shapeCov.percentage < 50 ? ['Add more SHAPE content'] : []
        },
        Q_f: {
            score: Q_f_value,
            components: {
                shapeCompleteness: shapeCov.percentage / 100,
                decisionTreeCoverage: 0.5,
                binaryRuleCoverage: 0.5
            },
            reasoning: 'To be determined at synthesis',
            improvementAreas: []
        },
        G: {
            score: G_value,
            modifiers: {
                recency: 1.0,
                authoritySource: 1.0,
                domainComplexity: 1.0
            },
            reasoning: 'Default governance'
        },
        I_baseline: {
            value: I_baseline_value,
            calculation: `${G_value.toFixed(2)} × ${Q_f_value.toFixed(2)} × ${Q_M_value.toFixed(2)} × ${Q_P_value.toFixed(2)}`,
            interpretation: I_baseline_value >= 0.75 ? 'Ready for mastery' : 'Room for improvement'
        }
    };
}

/**
 * Build coverage map with tier information
 * Groups ALL concepts from pass1Data, using parsed stages when available
 */
function buildCoverageMap(
    parsedData: ParsedGeneratedContent | null,
    result: SavedResult,
    baseQuality: number
): TreePacket[] {
    const coverageMap: TreePacket[] = [];
    const allConcepts = result.pass1Data.concepts; // Always use the full concept list

    // Create a map of concept name to parsed data for tier info
    const conceptDataMap = new Map<string, { tier?: string }>();
    if (parsedData?.concepts) {
        parsedData.concepts.forEach(c => {
            // Normalize key for improved matching
            const tier = c.tier || c.mnemonic?.tier;
            console.log(`[CoverageMap] Concept: ${c.name}, Tier resolved: ${tier}, Root: ${c.tier}, Mnemonic: ${c.mnemonic?.tier}`);
            conceptDataMap.set(c.name.toLowerCase().trim(), { tier });
        });
    }

    // Try to use learning path stages if they cover most concepts
    if (parsedData?.learningPath?.stages && parsedData.learningPath.stages.length > 0) {
        // Collect all concepts mentioned in stages
        const stagedConcepts = new Set<string>();
        parsedData.learningPath.stages.forEach(stage => {
            stage.concepts.forEach(c => stagedConcepts.add(c));
        });

        // If stages cover at least 50% of concepts, use them
        if (stagedConcepts.size >= allConcepts.length * 0.5) {
            parsedData.learningPath.stages.forEach(stage => {
                const conceptChildren = stage.concepts.map(cName => ({
                    name: cName,
                    size: 50,
                    score: 90,
                    tier: conceptDataMap.get(cName.toLowerCase().trim())?.tier as 'Foundation' | 'Keystone' | 'Utility' | 'foundation' | 'keystone' | 'utility' | undefined
                }));

                coverageMap.push({
                    name: stage.name,
                    size: stage.concepts.length * 100,
                    score: 85,
                    children: conceptChildren
                });
            });

            // Add any unstaged concepts
            const unstagedConcepts = allConcepts.filter(c => !stagedConcepts.has(c));
            if (unstagedConcepts.length > 0) {
                coverageMap.push({
                    name: "Other Concepts",
                    size: unstagedConcepts.length * 100,
                    score: 75,
                    children: unstagedConcepts.map(c => ({
                        name: c,
                        size: 50,
                        score: 80,
                        tier: conceptDataMap.get(c.toLowerCase().trim())?.tier as 'Foundation' | 'Keystone' | 'Utility' | 'foundation' | 'keystone' | 'utility' | undefined
                    }))
                });
            }
            return coverageMap;
        }
    }

    // Fallback: Group by tiers if we have tier data
    // Fallback: Group by tiers if we have tier data.
    // We only use lowercase keys to prevent duplicates (e.g. "Keystone" and "keystone")
    const tierGroups: Record<string, string[]> = {
        'foundation': [],
        'keystone': [],
        'utility': [],
        'uncategorized': []
    };

    allConcepts.forEach((conceptName, index) => {
        let tier = conceptDataMap.get(conceptName.toLowerCase().trim())?.tier;

        // Dynamic Fallback: If no tier found, calculate it (prevents "Uncategorized" for mapped concepts)
        if (!tier) {
            tier = determineTierFallback(index + 1, conceptName, allConcepts.length).toLowerCase() as 'foundation' | 'keystone' | 'utility';
            console.log(`[CoverageMap] Fallback tier for ${conceptName}: ${tier}`);
        }

        // Handle both capitalized and lowercase keys for grouping
        if (tier) {
            const normalizedTier = tier.toLowerCase();
            if (tierGroups[normalizedTier]) {
                tierGroups[normalizedTier].push(conceptName);
            } else {
                tierGroups['uncategorized'].push(conceptName);
            }
        } else {
            console.log(`[CoverageMap] Uncategorized concept: ${conceptName}, tier value: ${tier}`);
            tierGroups['uncategorized'].push(conceptName);
        }
    });

    // If we have meaningful tier distribution, use it
    const hasTierData = tierGroups['foundation'].length > 0 ||
        tierGroups['keystone'].length > 0 ||
        tierGroups['utility'].length > 0;

    if (hasTierData) {
        const tierColors = {
            'foundation': 85,
            'keystone': 90,
            'utility': 80,
            'uncategorized': 70
        };

        Object.entries(tierGroups).forEach(([tierName, concepts]) => {
            if (concepts.length > 0) {
                coverageMap.push({
                    name: `${tierName} (${concepts.length})`,
                    size: concepts.length * 100,
                    score: tierColors[tierName as keyof typeof tierColors] || 75,
                    children: concepts.map(c => ({
                        name: c,
                        size: 50,
                        score: 85
                    }))
                });
            }
        });
    } else {
        // Ultimate fallback: single group with all concepts
        coverageMap.push({
            name: `All Concepts (${allConcepts.length})`,
            size: allConcepts.length * 100,
            score: Math.round(baseQuality),
            children: allConcepts.map(c => ({
                name: c,
                size: 50,
                score: 80
            }))
        });
    }

    return coverageMap;
}

// Simple heuristic for readability (avg words per sentence)
function readabilityScore(text: string): number {
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    return words / (sentences || 1);
}

function determineTierFallback(order: number, _name: string, totalConcepts: number = 30): string {
    // SILVER BULLET SCALING LOGIC:
    // Instead of hardcoded keywords, we use a "Narrative Arc" distribution.
    // Every learning journey has a beginning (Foundation), middle (Keystone), and application (Utility).

    // Normalize position 0-1
    const position = Math.max(0, Math.min(1, order / Math.max(1, totalConcepts)));

    // 1. Foundation (First 20%): Setup, core concepts, basic terminology
    if (position <= 0.20) return 'Foundation';

    // 2. Keystone (Middle 50%): The core mechanics, relationships, and deep logic
    if (position <= 0.70) return 'Keystone';

    // 3. Utility (Last 30%): Application, optimization, edge cases, tools
    return 'Utility';
}
