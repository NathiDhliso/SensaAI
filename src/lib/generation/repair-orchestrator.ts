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
                reason: `Missing ${gap.field}: ${gap.message}`,
                priority: 'low'
            };
        }

        // STRATEGY 2: SURGICAL AI
        // Use for "Fluff", Circular Logic, or core content (Mnemonics, Analogies)
        if (isFluff || this.requiresIntelligence(gap.field)) {
            // Build detailed reason with gap information
            let reason = `Field: ${gap.field}\n`;
            reason += `Issue: ${gap.message}\n`;
            reason += `Severity: ${gap.severity}\n`;

            if (isFluff) {
                reason += `Problem: Detected placeholder/circular content\n`;
                reason += `Current: "${String(fieldContent).substring(0, 100)}..."\n`;
            } else {
                reason += `Problem: Missing core intelligent content\n`;
            }

            // Add field-specific requirements
            reason += this.getFieldRequirements(gap.field);

            return {
                strategy: 'SURGICAL_AI',
                conceptId: gap.conceptId,
                field: gap.field,
                reason,
                priority: gap.severity === 'critical' ? 'high' : 'medium'
            };
        }

        return null;
    }

    /**
     * Get field-specific requirements for AI repair
     */
    private getFieldRequirements(field: string): string {
        const requirements: Record<string, string> = {
            'phase1.hookSentence': `
Requirements for hookSentence:
- Must be 1-2 sentences that grab attention
- Should explain what the concept is in simple terms
- Must NOT be circular (don't just repeat the concept name)
- Should make the reader curious to learn more
- Example: "Imagine controlling who sees which rows in a database table - that's Row-Level Security"`,

            'phase1.microMetaphor': `
Requirements for microMetaphor:
- Must be a concrete, relatable analogy
- Should compare the technical concept to something familiar
- Must NOT be circular or generic
- Should illuminate how the concept works
- Example: "Like a bouncer checking IDs at a club - RLS checks user credentials before showing data"`,

            'phase1.prerequisite': `
Requirements for prerequisite:
- List specific concepts/skills needed before learning this
- If truly none, say "Basic understanding of [domain]"
- Must be specific, not generic
- Example: "Understanding of database tables and user authentication"`,

            'phase2.items': `
Requirements for phase2 items:
- Must have at least 3 concrete learning points
- Each item should be specific and actionable
- Should build on each other logically
- Must NOT be vague or circular
- Example: "How RLS policies filter rows", "Creating RLS predicates", "Testing RLS with different users"`,

            'phase3.tool': `
Requirements for tool:
- Specific tool, command, or resource for practice
- Must be actionable (user can actually use it)
- Include where to find it if not obvious
- Example: "SQL Server Management Studio - CREATE SECURITY POLICY command"`,

            'phase3.thresholds': `
Requirements for thresholds:
- Specific criteria for mastery
- Should be measurable or observable
- Must relate to the concept being learned
- Example: "Can create RLS policies that correctly filter data for different user roles"`,

            'mnemonic.story': `
Requirements for mnemonic story:
- Must be memorable and vivid
- Should encode key information about the concept
- Must NOT be circular or just repeat the concept name
- Should use concrete imagery
- Example: "Remember RLS as 'Row Lock Security' - imagine each row has a tiny lock that only opens for authorized users"`,

            'mnemonic.anchor': `
Requirements for mnemonic anchor:
- Short memorable phrase or acronym
- Should trigger recall of the full concept
- Must be unique and distinctive
- Example: "RLS = Rows Lock Selectively"`,

            'shape.simpleCore': `
Requirements for simpleCore:
- Explain the concept in the simplest possible terms
- Use plain language, avoid jargon
- Must NOT be circular
- Should be understandable by a beginner
- Example: "RLS lets you control which rows different users can see in a table, based on rules you define"`,

            'shape.analogicalModel': `
Requirements for analogicalModel:
- Detailed analogy that maps to the technical concept
- Should explain how the concept works through the analogy
- Must be concrete and relatable
- Example: "Think of a database table as an apartment building. RLS is like giving each tenant a key that only opens their own apartment door - they can't see into other apartments even though they're in the same building"`,

            'shape.highStakesExample': `
Requirements for highStakesExample:
- Real-world scenario where this concept matters
- Should show consequences of getting it wrong
- Must be specific and concrete
- Should motivate learning the concept
- Example: "A healthcare app without RLS could let patients see each other's medical records - a HIPAA violation with massive fines"`,

            'whyYouNeed': `
Requirements for whyYouNeed:
- Explain the practical value of learning this
- Should answer "Why should I care?"
- Must be specific to this concept
- Should motivate the learner
- Example: "RLS is critical for multi-tenant applications where data isolation is a security requirement - it's tested on the exam and used in production systems"`,

            'officialSource': `
Requirements for officialSource:
- Must be a URL to official documentation
- Should be from Microsoft, AWS, Google, or other official source
- Must be a valid, working URL
- Example: "https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security"`,

            'blueprintMapping': `
Requirements for blueprintMapping:
- Map to specific exam objectives
- Should reference the official exam blueprint
- Must be specific, not generic
- Example: "Maps to PL-300 objective: Implement row-level security (Exam weight: 10-15%)"`,

            'technicalDetails': `
Requirements for technicalDetails:
- Specific technical information about the concept
- Should include syntax, commands, or configuration
- Must be accurate and actionable
- Example: "CREATE SECURITY POLICY [PolicyName] ADD FILTER PREDICATE [SchemaName].[FunctionName]([Column]) ON [SchemaName].[TableName]"`,

            'realWorldExample': `
Requirements for realWorldExample:
- Concrete example from real-world usage
- Should show the concept in action
- Must be specific and relatable
- Example: "Salesforce uses RLS to ensure sales reps only see their own customer data, even though all data is in the same table"`
        };

        return requirements[field] || `
Requirements:
- Must be specific and concrete
- Must NOT be circular or generic
- Should provide real value to the learner
- Must pass validation after repair`;
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
