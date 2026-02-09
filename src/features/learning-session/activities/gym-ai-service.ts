import type { LearningConcept } from '@/shared/types/learning';

const GYM_AI_URL = import.meta.env.VITE_GYM_AI_URL || import.meta.env.VITE_API_URL || '';

const responseCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  if (responseCache.size > 100) {
    const oldest = responseCache.keys().next().value;
    if (oldest) responseCache.delete(oldest);
  }
  responseCache.set(key, { data, timestamp: Date.now() });
}

function compressConcept(c: LearningConcept): Record<string, unknown> {
  return {
    name: c.name,
    tier: c.tier || undefined,
    keyPoints: c.keyPoints?.slice(0, 3),
    commonPitfalls: c.commonPitfalls?.slice(0, 2),
    howToUse: c.howToUse?.slice(0, 3),
  };
}

async function callGymAI<T>(action: string, data: Record<string, unknown>): Promise<T | null> {
  try {
    const response = await fetch(`${GYM_AI_URL}/gym-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action, ...data }),
    });
    if (!response.ok) return null;
    const result = await response.json();
    if (result.error) return null;
    return result as T;
  } catch {
    return null;
  }
}

export interface AIMisconception {
  statement: string;
  correctionHints: string[];
}

export async function generateAIMisconception(
  concept: LearningConcept,
  _allConcepts?: LearningConcept[]
): Promise<AIMisconception | null> {
  const cacheKey = `misconception:${concept.id}`;
  const cached = getCached<AIMisconception>(cacheKey);
  if (cached) return cached;

  const result = await callGymAI<AIMisconception>('misconception', {
    concept: compressConcept(concept),
  });
  if (result) setCache(cacheKey, result);
  return result;
}

export interface AIPushback {
  challenge: string;
}

export async function generateAIPushback(
  concept: LearningConcept,
  userResponse: string
): Promise<AIPushback | null> {
  return callGymAI<AIPushback>('pushback', {
    concept: compressConcept(concept),
    diagnosis: userResponse.slice(0, 300),
  });
}

export interface AIScoreResult {
  score: number;
  feedback: string;
  strengths: string[];
  gaps: string[];
  depthAnalysis?: string;
  responseMetrics?: {
    wordCount: number;
    conceptCoverage: string;
    hasStructure: boolean;
    lengthCategory: 'too_short' | 'adequate' | 'comprehensive';
  };
}

export async function scoreWithAI(
  concept: LearningConcept,
  userResponse: string,
  activityType: 'peer-review' | 'mastery' | 'defense'
): Promise<AIScoreResult | null> {
  return callGymAI<AIScoreResult>('score', {
    concept: compressConcept(concept),
    response: userResponse.slice(0, 400),
    stage: activityType,
  });
}

export interface AIMasteryScenario {
  scenario: string;
  requirements: string[];
  conceptFocus: string[];
}

export async function generateMasteryScenario(
  concepts: LearningConcept[]
): Promise<AIMasteryScenario | null> {
  const names = concepts.slice(0, 5).map(c => c.name);
  const cacheKey = `mastery:${names.sort().join(',')}`;
  const cached = getCached<AIMasteryScenario>(cacheKey);
  if (cached) return cached;

  const result = await callGymAI<AIMasteryScenario>('mastery_scenario', {
    concepts: concepts.slice(0, 5).map(compressConcept),
  });
  if (result) setCache(cacheKey, result);
  return result;
}

export async function scoreMasteryWithAI(
  concepts: LearningConcept[],
  userResponse: string
): Promise<AIScoreResult | null> {
  return callGymAI<AIScoreResult>('mastery_score', {
    concepts: concepts.slice(0, 5).map(compressConcept),
    response: userResponse.slice(0, 600),
  });
}

export interface AIBrokenConfig {
  steps: string[];
  alteredIndex: number;
  originalStep: string;
  alteredStep: string;
  explanation: string;
}

export async function generateAIBrokenConfig(
  concept: LearningConcept
): Promise<AIBrokenConfig | null> {
  const cacheKey = `premortem:${concept.id}`;
  const cached = getCached<AIBrokenConfig>(cacheKey);
  if (cached) return cached;

  const result = await callGymAI<AIBrokenConfig>('broken_config', {
    concept: compressConcept(concept),
  });
  if (result) setCache(cacheKey, result);
  return result;
}
