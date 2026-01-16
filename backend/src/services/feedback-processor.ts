/**
 * Feedback Processor Service
 * 
 * Handles user-submitted content flags with auto-triage rules:
 * - outdated: Queue for blueprint re-sync
 * - incorrect: Flag for immediate review
 * - not-on-exam: Verify against latest blueprint
 * - broken-link: Auto-search for updated URL
 */

import type { ContentFlag, FlagType, ExamBlueprint } from '../types/grounding';

// ============================================================================
// TYPES
// ============================================================================

type TriagePriority = 'critical' | 'high' | 'medium' | 'low';

interface TriageResult {
  flagId: string;
  priority: TriagePriority;
  action: TriageAction;
  assignedTo: string;
  notes: string[];
  estimatedResolution: string;
}

type TriageAction = 
  | 'immediate_review'
  | 'queue_blueprint_sync'
  | 'verify_blueprint_coverage'
  | 'auto_search_url'
  | 'manual_review'
  | 'auto_close';

interface FlagStats {
  total: number;
  byType: Record<FlagType, number>;
  byPriority: Record<TriagePriority, number>;
  pendingResolution: number;
  autoResolved: number;
}

interface StoredFlag extends ContentFlag {
  id: string;
  triageResult?: TriageResult;
  status: 'pending' | 'triaged' | 'in-progress' | 'resolved' | 'rejected';
  resolvedAt?: string;
  resolution?: string;
}

// ============================================================================
// TRIAGE RULES
// ============================================================================

const TRIAGE_RULES: Record<FlagType, {
  basePriority: TriagePriority;
  action: TriageAction;
  assignTo: string;
  estimatedHours: number;
}> = {
  incorrect: {
    basePriority: 'critical',
    action: 'immediate_review',
    assignTo: 'content-team',
    estimatedHours: 4,
  },
  outdated: {
    basePriority: 'high',
    action: 'queue_blueprint_sync',
    assignTo: 'automation',
    estimatedHours: 24,
  },
  'not-on-exam': {
    basePriority: 'medium',
    action: 'verify_blueprint_coverage',
    assignTo: 'automation',
    estimatedHours: 8,
  },
  'broken-link': {
    basePriority: 'low',
    action: 'auto_search_url',
    assignTo: 'automation',
    estimatedHours: 1,
  },
};

// Priority boost factors
const PRIORITY_BOOST_RULES = {
  multipleReports: 3, // If 3+ users report same issue, boost priority
  recentBlueprint: true, // Boost if blueprint was recently updated
  highTrafficConcept: 100, // If concept has been viewed 100+ times
};

// ============================================================================
// IN-MEMORY STORAGE (replace with database in production)
// ============================================================================

const flagStore = new Map<string, StoredFlag>();
const conceptFlagCount = new Map<string, number>(); // Track reports per concept

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Generate unique flag ID
 */
function generateFlagId(): string {
  return `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Process and store a new content flag
 */
export async function processFlag(flag: ContentFlag): Promise<TriageResult> {
  const flagId = generateFlagId();
  
  // Track how many times this concept has been flagged
  const conceptReports = (conceptFlagCount.get(flag.conceptId) || 0) + 1;
  conceptFlagCount.set(flag.conceptId, conceptReports);

  // Get base triage rules
  const rules = TRIAGE_RULES[flag.type];
  
  // Calculate final priority with boosts
  let priority = rules.basePriority;
  const notes: string[] = [];

  // Boost priority for multiple reports
  if (conceptReports >= PRIORITY_BOOST_RULES.multipleReports) {
    priority = boostPriority(priority);
    notes.push(`Multiple reports (${conceptReports}) - priority boosted`);
  }

  // Create triage result
  const triageResult: TriageResult = {
    flagId,
    priority,
    action: rules.action,
    assignedTo: rules.assignTo,
    notes,
    estimatedResolution: calculateEstimatedResolution(rules.estimatedHours),
  };

  // Store the flag
  const storedFlag: StoredFlag = {
    ...flag,
    id: flagId,
    triageResult,
    status: 'triaged',
  };
  flagStore.set(flagId, storedFlag);

  // Execute auto-actions if applicable
  await executeAutoAction(storedFlag);

  return triageResult;
}

/**
 * Boost priority one level
 */
function boostPriority(current: TriagePriority): TriagePriority {
  const levels: TriagePriority[] = ['low', 'medium', 'high', 'critical'];
  const currentIndex = levels.indexOf(current);
  return levels[Math.min(currentIndex + 1, levels.length - 1)];
}

/**
 * Calculate estimated resolution time
 */
function calculateEstimatedResolution(hours: number): string {
  const now = new Date();
  now.setHours(now.getHours() + hours);
  return now.toISOString();
}

/**
 * Execute automatic actions based on flag type
 */
async function executeAutoAction(flag: StoredFlag): Promise<void> {
  if (!flag.triageResult) return;

  switch (flag.triageResult.action) {
    case 'auto_search_url':
      await handleBrokenLink(flag);
      break;
    case 'verify_blueprint_coverage':
      await verifyBlueprintCoverage(flag);
      break;
    case 'queue_blueprint_sync':
      await queueBlueprintSync(flag);
      break;
    // immediate_review and manual_review require human intervention
    default:
      break;
  }
}

/**
 * Handle broken link - attempt to find updated URL
 */
async function handleBrokenLink(flag: StoredFlag): Promise<void> {
  if (!flag.officialSourceUrl) return;

  // Try to find working alternative
  const searchStrategies = [
    // Try archive.org
    `https://web.archive.org/web/*/${flag.officialSourceUrl}`,
    // Try common URL patterns
    flag.officialSourceUrl.replace('/en-us/', '/en/'),
    flag.officialSourceUrl.replace('/docs/', '/documentation/'),
  ];

  // In production, would actually validate these
  flag.triageResult!.notes.push(
    `Auto-searching for updated URL`,
    `Checking ${searchStrategies.length} alternative patterns`
  );

  // For now, mark as needing manual review if auto-fix fails
  updateFlagStatus(flag.id, 'in-progress', 'Auto-search initiated');
}

/**
 * Verify if content is actually in the exam blueprint
 */
async function verifyBlueprintCoverage(flag: StoredFlag): Promise<void> {
  // In production, would load the actual blueprint and search
  flag.triageResult!.notes.push(
    `Scheduled blueprint coverage verification`,
    `Blueprint version: ${flag.blueprintVersion || 'unknown'}`
  );

  updateFlagStatus(flag.id, 'in-progress', 'Blueprint verification scheduled');
}

/**
 * Queue concept for blueprint re-sync
 */
async function queueBlueprintSync(flag: StoredFlag): Promise<void> {
  // In production, would add to a sync queue
  flag.triageResult!.notes.push(
    `Queued for blueprint re-sync`,
    `Concept will be regenerated with latest blueprint data`
  );

  updateFlagStatus(flag.id, 'in-progress', 'Queued for regeneration');
}

/**
 * Update flag status
 */
export function updateFlagStatus(
  flagId: string, 
  status: StoredFlag['status'],
  resolution?: string
): StoredFlag | null {
  const flag = flagStore.get(flagId);
  if (!flag) return null;

  flag.status = status;
  if (status === 'resolved' || status === 'rejected') {
    flag.resolvedAt = new Date().toISOString();
    flag.resolution = resolution;
  }
  
  flagStore.set(flagId, flag);
  return flag;
}

/**
 * Get flag by ID
 */
export function getFlag(flagId: string): StoredFlag | null {
  return flagStore.get(flagId) || null;
}

/**
 * Get all flags for a concept
 */
export function getFlagsForConcept(conceptId: string): StoredFlag[] {
  return Array.from(flagStore.values())
    .filter(f => f.conceptId === conceptId);
}

/**
 * Get flags by status
 */
export function getFlagsByStatus(status: StoredFlag['status']): StoredFlag[] {
  return Array.from(flagStore.values())
    .filter(f => f.status === status);
}

/**
 * Get flags requiring immediate attention
 */
export function getCriticalFlags(): StoredFlag[] {
  return Array.from(flagStore.values())
    .filter(f => 
      f.triageResult?.priority === 'critical' && 
      f.status !== 'resolved' && 
      f.status !== 'rejected'
    );
}

/**
 * Get flag statistics
 */
export function getFlagStats(): FlagStats {
  const flags = Array.from(flagStore.values());
  
  const stats: FlagStats = {
    total: flags.length,
    byType: {
      outdated: 0,
      incorrect: 0,
      'not-on-exam': 0,
      'broken-link': 0,
    },
    byPriority: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
    pendingResolution: 0,
    autoResolved: 0,
  };

  for (const flag of flags) {
    stats.byType[flag.type]++;
    
    if (flag.triageResult) {
      stats.byPriority[flag.triageResult.priority]++;
    }

    if (flag.status !== 'resolved' && flag.status !== 'rejected') {
      stats.pendingResolution++;
    }

    if (flag.resolution?.startsWith('Auto-')) {
      stats.autoResolved++;
    }
  }

  return stats;
}

/**
 * Bulk process multiple flags (for batch operations)
 */
export async function processFlagBatch(
  flags: ContentFlag[]
): Promise<Map<string, TriageResult>> {
  const results = new Map<string, TriageResult>();

  for (const flag of flags) {
    const result = await processFlag(flag);
    results.set(flag.conceptId, result);
  }

  return results;
}

/**
 * Get concepts with most flags (potential problem areas)
 */
export function getMostFlaggedConcepts(limit: number = 10): Array<{
  conceptId: string;
  conceptTitle: string;
  flagCount: number;
  types: FlagType[];
}> {
  const conceptData = new Map<string, {
    conceptId: string;
    conceptTitle: string;
    flagCount: number;
    types: Set<FlagType>;
  }>();

  for (const flag of flagStore.values()) {
    const existing = conceptData.get(flag.conceptId);
    if (existing) {
      existing.flagCount++;
      existing.types.add(flag.type);
    } else {
      conceptData.set(flag.conceptId, {
        conceptId: flag.conceptId,
        conceptTitle: flag.conceptTitle,
        flagCount: 1,
        types: new Set([flag.type]),
      });
    }
  }

  return Array.from(conceptData.values())
    .sort((a, b) => b.flagCount - a.flagCount)
    .slice(0, limit)
    .map(item => ({
      ...item,
      types: Array.from(item.types),
    }));
}

/**
 * Clear resolved flags older than specified days
 */
export function purgeOldFlags(olderThanDays: number = 30): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  
  let purged = 0;
  
  for (const [id, flag] of flagStore.entries()) {
    if (
      (flag.status === 'resolved' || flag.status === 'rejected') &&
      flag.resolvedAt &&
      new Date(flag.resolvedAt) < cutoff
    ) {
      flagStore.delete(id);
      purged++;
    }
  }

  return purged;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  TriageResult,
  TriageAction,
  TriagePriority,
  FlagStats,
  StoredFlag,
};
