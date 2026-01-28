/**
 * Repair Orchestrator
 * 
 * The central brain of the Surgical Merge Protocol.
 * Decides whether to fix an issue instantly (Self-Heal), surgically (AI), or restart.
 */

import type { ContentGap } from '@/lib/validation/content-quality.ts';
import type { RepairPlan, RepairAction } from '@/lib/types/generation';
import { verifyRepair, validateConceptContent, type VerifiableConcept } from '@/lib/validation/content-quality';
import { SelfHealingEngine } from './lifecycle-engine';
import { surgicallyRepairConcept } from './backend-generator';
import type { ParsedConcept } from '@/lib/content-adapter/types';

export class RepairStrategyRouter {

    /**
     * Route a list of content gaps to specific repair actions
     */
    public generateRepairPlan(gaps: ContentGap[], concepts: ParsedConcept[]): RepairPlan {
        const actions: RepairAction[] = [];

        for (const gap of gaps) {
            const action = this.determineStrategy(gap, concepts);
            if (action) {
                actions.push(action);
            }
        }

        return {
            actions: this.optimizeRepairOrder(actions),
            estimatedTimeMs: this.estimateRepairTime(actions),
            status: 'pending',
            currentActionIndex: 0
        };
    }

    /**
     * Determine the best strategy for a specific gap
     */
    private determineStrategy(gap: ContentGap, concepts: ParsedConcept[]): RepairAction | null {
        const concept = concepts.find(c => c.id === gap.conceptId);
        if (!concept) return null;

        // 1. Analyze the specific field
        const fieldContent = this.getNestedValue(concept as unknown as Record<string, unknown>, gap.field);

        // 2. Check if content exists but is "Fluff" (Hallucination/Placeholder)
        // using isRealContent logic implicitly (since gap exists, it failed validation)
        // We re-check specific patterns to decide strategy.

        const isFluff = fieldContent && typeof fieldContent === 'string' && (fieldContent as string).length > 5;
        const isEmpty = !fieldContent || (fieldContent as string).length === 0;

        // STRATEGY 1: SELF-HEAL (Templates)
        // Use for missing generic fields or structural gaps that don't need deep intelligence
        if (this.canSelfHeal(gap.field) && isEmpty) {
            return {
                strategy: 'SELF_HEAL',
                conceptId: gap.conceptId,
                field: gap.field,
                reason: 'Missing standard field - applying template',
                priority: 'low'
            };
        }

        // STRATEGY 2: SURGICAL AI
        // Use for "Fluff", Circular Logic, or core content (Mnemonics, Analogies)
        if (isFluff || this.requiresIntelligence(gap.field)) {
            return {
                strategy: 'SURGICAL_AI',
                conceptId: gap.conceptId,
                field: gap.field,
                reason: isFluff ? 'Detected placeholder/circular content' : 'Missing core intelligent content',
                priority: 'high'
            };
        }

        return null;
    }

    /**
     * Fields that can be fixed with templates
     */
    private canSelfHeal(field: string): boolean {
        const templateFields = [
            'phase3.tool', // Can default to "Check Official Documentation"
            'phase1.prerequisite', // Can default to "None"
            'phase3.thresholds', // Can default to "Verify in standard"
            'technicalDetails', // Sometimes we can just emit a generic "See documentation" if desperate
            'blueprintMapping', // Can default to "Verify against exam objectives"
        ];
        return templateFields.includes(field);
    }

    /**
     * Fields that ABSOLUTELY require AI generation
     */
    private requiresIntelligence(field: string): boolean {
        const aiFields = [
            'mnemonic.story',
            'mnemonic.anchor',
            'shape.simpleCore',
            'shape.analogicalModel',
            'shape.highStakesExample', // Hallucinated examples are bad
            'hookSentence',
            'whyYouNeed',
            'officialSource', // AI can generate correct documentation URL based on concept
        ];
        // Check for exact match or suffix match (e.g. 'shape.simpleCore')
        return aiFields.some(f => field.endsWith(f));
    }

    /**
     * Get value from nested object path
     */
    private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
        return path.split('.').reduce<unknown>((prev, curr) => prev ? (prev as Record<string, unknown>)[curr] : undefined, obj);
    }

    /**
     * Optimize order to prevent race conditions
     * (e.g., fix dependencies before mnemonics if we were doing that)
     */
    private optimizeRepairOrder(actions: RepairAction[]): RepairAction[] {
        // Priority: HIGH -> MEDIUM -> LOW
        const priorityMap = { high: 0, medium: 1, low: 2 };
        return actions.sort((a, b) => priorityMap[a.priority] - priorityMap[b.priority]);
    }

    private estimateRepairTime(actions: RepairAction[]): number {
        let time = 0;
        for (const action of actions) {
            if (action.strategy === 'SURGICAL_AI') time += 3000; // ~3s per AI call
            if (action.strategy === 'SELF_HEAL') time += 50; // Instant
        }
        return time;
    }

    /**
     * Execute a repair plan
     */
    public async executeRepairPlan(
        plan: RepairPlan,
        concepts: ParsedConcept[],
        subject: string,
        onProgress?: (processed: number, total: number, action: string) => void
    ): Promise<ParsedConcept[]> {
        const engine = new SelfHealingEngine();
        // Clone to avoid mutating state directly
        const repairedConcepts: ParsedConcept[] = JSON.parse(JSON.stringify(concepts));

        let processed = 0;
        const total = plan.actions.length;
        for (const action of plan.actions) {
            onProgress?.(processed, total, `Fixing ${action.field} in ${action.conceptId}`);

            const conceptIndex = repairedConcepts.findIndex((c: ParsedConcept) => c.id === action.conceptId);
            if (conceptIndex === -1) {
                processed++;
                continue;
            }

            const concept = repairedConcepts[conceptIndex];

            try {
                if (action.strategy === 'SELF_HEAL') {
                    // Instant template fix
                    repairedConcepts[conceptIndex] = engine.repairField(concept, action.field);
                }
                else if (action.strategy === 'SURGICAL_AI') {
                    // Smart AI fix
                    const repaired = (await surgicallyRepairConcept(subject, concept.name, action.reason)) as ParsedConcept;

                    if (repaired) {
                        // Validate before merging
                        // Validate before merging using the correct 2-argument signature
                        const isValid = verifyRepair(concept as unknown as VerifiableConcept, repaired as unknown as VerifiableConcept);

                        if (isValid) {
                            // Merge the repaired content
                            // We prefer the repaired version but keep ID and stable fields
                            repairedConcepts[conceptIndex] = {
                                ...repaired,
                                id: concept.id, // Preserve ID
                                order: concept.order, // Preserve order
                                stageId: concept.stageId, // Preserve stage
                            } as ParsedConcept;
                        } else {
                            // Re-run validation to log specific errors
                            const gaps = validateConceptContent(repaired as unknown as VerifiableConcept);
                            const criticalGaps = gaps.filter(g => g.severity === 'critical');

                            console.warn(`[Refused Repair] ${concept.name}: Validation failed after repair.`, {
                                criticalGaps: criticalGaps.map(g => g.message),
                                allGaps: gaps
                            });
                        }
                    }
                }
            } catch (error) {
                console.error(`Failed to repair ${action.conceptId}:`, error);
            }

            processed++;
        }

        return repairedConcepts;
    }
}
