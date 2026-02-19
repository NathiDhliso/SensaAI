/**
 * Unified Progressive Flow - Public API
 * 
 * Exports all utilities, hooks, and types for the unified flow system.
 */

// Migration utilities
export { 
  migrateSessionToUnifiedFlow, 
  validateMigration, 
  migrateAllSessions 
} from './utils/migration';

// Hooks
export { useMigration } from './hooks/useMigration';

// Re-export phase adapter types and hook
export type { 
  UnifiedPhase, 
  PhaseAdapter, 
  PhaseComponentProps 
} from '@/shared/hooks/usePhaseAdapter';

export { usePhaseAdapter } from '@/shared/hooks/usePhaseAdapter';
