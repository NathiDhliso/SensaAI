/**
 * Backend Input Validation Schemas
 *
 * Zod schemas for validating incoming request bodies on critical endpoints.
 * Centralised here so routes stay clean and schemas can be reused.
 */
import { z } from 'zod';

// ============================================================================
// CONCEPTS / GENERATION
// ============================================================================

/** POST /api/v1/concepts/generate */
export const GenerateSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(500),
  context: z.string().max(10_000).optional(),
  trunks: z.array(z.string().max(200)).max(50).optional(),
  action: z.enum(['generate', 'classify_only', 'suggest_structure']).optional(),
  jobId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
});

/** POST /api/v1/concepts/repair */
export const RepairSchema = z.object({
  subject: z.string().min(1).max(500),
  conceptName: z.string().min(1).max(300),
  issue: z.string().min(1).max(2000),
});

/** PUT /api/v1/concepts/:sessionId/concept/:conceptId */
export const ConceptUpdateSchema = z.object({
  tier: z.enum(['trunk', 'branch', 'leaf']),
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional(),
  keyPoints: z.array(z.string().max(1000)).max(20).optional(),
  phase1: z.record(z.string(), z.unknown()).optional(),
  phase2: z.array(z.string().max(2000)).optional(),
  phase3: z.record(z.string(), z.unknown()).optional(),
  mnemonic: z.record(z.string(), z.unknown()).optional(),
  shape: z.record(z.string(), z.unknown()).optional(),
  whyYouNeed: z.string().max(2000).optional(),
  cognitiveLevel: z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']).optional(),
  commonPitfalls: z.array(z.string().max(1000)).max(20).optional(),
  technicalDetails: z.string().max(5000).optional(),
  workedExample: z.object({
    problem: z.string().max(2000),
    solution: z.string().max(2000),
    steps: z.array(z.string().max(1000)),
  }).optional(),
  perspectives: z.array(z.object({
    label: z.string().max(200),
    blueprint: z.string().max(2000),
    steps: z.array(z.string().max(1000)),
  })).max(10).optional(),
});

/** PUT /api/v1/concepts/userdata */
export const UserdataUpsertSchema = z.object({
  dataKey: z.string().min(1).max(200),
  data: z.unknown(),
});

/** POST /api/v1/concepts/userdata/batch */
export const UserdataBatchSchema = z.object({
  items: z
    .array(
      z.object({
        dataKey: z.string().min(1).max(200),
        data: z.unknown(),
      })
    )
    .min(1)
    .max(100),
});

// ============================================================================
// CONTENT
// ============================================================================

/** POST /api/v1/content */
export const SaveContentSchema = z.object({
  subject: z.string().min(1).max(500),
  content: z.unknown(),
  domain: z.string().max(200).optional(),
  validation: z.unknown().optional(),
});

// ============================================================================
// GYM AI
// ============================================================================

/** POST /api/v1/gym-ai */
export const GymAiSchema = z.object({
  action: z.string().min(1).max(50),
  data: z.record(z.string(), z.unknown()),
});

// ============================================================================
// AUTH (session exchange)
// ============================================================================

/** POST /api/v1/auth/session/exchange */
export const SessionExchangeSchema = z.object({
  code: z.string().min(1).max(2000),
  redirect_uri: z.string().url().max(500),
  code_verifier: z.string().min(43).max(128).optional(),
});

// ============================================================================
// HELPER: Express middleware factory
// ============================================================================

import type { Request, Response, NextFunction } from 'express';

/**
 * Returns Express middleware that validates `req.body` against the given schema.
 * On failure it returns 400 with structured error details.
 */
export function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }
    // Replace body with parsed (and typed) value
    req.body = result.data;
    next();
  };
}
