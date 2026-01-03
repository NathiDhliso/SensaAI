/**
 * Zod schemas for validating JSON-structured concept output from Claude.
 * This replaces the fragile regex-based parsing with type-safe validation.
 */
import { z } from 'zod';

// Mnemonic context for Memory Palace integration
export const MnemonicSchema = z.object({
    tier: z.enum(['Foundation', 'Keystone', 'Utility']),
    anchor: z.string().min(1),
    story: z.string(),
    imageUrl: z.string().optional(),
    parentConcept: z.string().nullable().optional(),
    depends_on: z.array(z.string()).optional(),
});

// SHAPE micro-learning framework sections
export const ShapeSchema = z.object({
    simpleCore: z.string().min(10),
    highStakesExample: z.string(),
    analogicalModel: z.string(),
    patternRecognition: z.object({
        question: z.string(),
        answer: z.string(),
    }),
    eliminationLogic: z.string(),
});

// Phase 1: Foundation/Setup phase
export const Phase1Schema = z.object({
    hookSentence: z.string().optional(),
    microMetaphor: z.string().optional(),
    prerequisite: z.string(),
    selection: z.array(z.string()),
    execution: z.string(),
});

// Phase 3: Verification/Monitoring phase
export const Phase3Schema = z.object({
    tool: z.string(),
    metrics: z.array(z.string()),
    thresholds: z.string(),
});

// Complete lifecycle structure
export const LifecycleSchema = z.object({
    phase1: Phase1Schema,
    phase2: z.array(z.string()), // Configuration items
    phase3: Phase3Schema,
});

// Annotations for special callouts
export const AnnotationsSchema = z.object({
    criticalDistinctions: z.array(z.string()).optional().default([]),
    designBoundaries: z.array(z.string()).optional().default([]),
    examFocus: z.array(z.string()).optional().default([]),
    logicalConnection: z.string().optional(),
});

// Main concept schema - matches the structure expected by parser.ts ParsedConcept
export const ConceptSchema = z.object({
    order: z.number().int().positive(),
    name: z.string().min(1),
    shape: ShapeSchema.optional(),
    lifecycle: LifecycleSchema.optional(),
    mnemonic: MnemonicSchema.optional(),
    annotations: AnnotationsSchema.optional(),
});

// Batch response from Claude for a group of concepts
export const BatchResponseSchema = z.object({
    concepts: z.array(ConceptSchema),
});

// Relaxed schema for partial/streaming responses
export const PartialConceptSchema = ConceptSchema.partial().required({
    name: true,
    order: true,
});

export const PartialBatchResponseSchema = z.object({
    concepts: z.array(PartialConceptSchema),
});

// Type exports
export type GeneratedMnemonic = z.infer<typeof MnemonicSchema>;
export type GeneratedShape = z.infer<typeof ShapeSchema>;
export type GeneratedLifecycle = z.infer<typeof LifecycleSchema>;
export type GeneratedConcept = z.infer<typeof ConceptSchema>;
export type BatchResponse = z.infer<typeof BatchResponseSchema>;
export type PartialConcept = z.infer<typeof PartialConceptSchema>;

/**
 * Validates a batch response and returns typed data or null on failure.
 */
export function validateBatchResponse(data: unknown): BatchResponse | null {
    const result = BatchResponseSchema.safeParse(data);
    if (result.success) {
        return result.data;
    }
    console.error('[concept-schema] Validation failed:', result.error.format());
    return null;
}

/**
 * Attempts to extract valid concepts from a partial/streaming response.
 * More lenient - accepts partially complete concepts.
 */
export function extractPartialConcepts(data: unknown): PartialConcept[] {
    if (!data || typeof data !== 'object') return [];

    const obj = data as Record<string, unknown>;
    if (!Array.isArray(obj.concepts)) return [];

    const validConcepts: PartialConcept[] = [];

    for (const concept of obj.concepts) {
        const result = PartialConceptSchema.safeParse(concept);
        if (result.success) {
            validConcepts.push(result.data);
        }
    }

    return validConcepts;
}
