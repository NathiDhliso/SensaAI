/**
 * Migration hook for unified progressive flow.
 * Runs migration on app mount to convert old sessions to new format.
 */

import { useEffect, useRef } from 'react';
import { useLearningStore } from '@/store/learning-store';
import { migrateSessionToUnifiedFlow, validateMigration } from '../utils/migration';

/**
 * Hook that runs session migration once on mount.
 * Checks if current studySession needs migration and migrates it.
 */
export function useMigration() {
  const hasRun = useRef(false);
  const studySession = useLearningStore(state => state.studySession);
  const updateSession = useLearningStore(state => state.updateSession);

  useEffect(() => {
    // Only run once
    if (hasRun.current) return;
    hasRun.current = true;

    // If no session, nothing to migrate
    if (!studySession) {
      console.log('[Migration] No session to migrate');
      return;
    }

    // If already migrated (has phaseProgress), skip
    if (studySession.phaseProgress) {
      console.log('[Migration] Session already migrated');
      return;
    }

    console.log('[Migration] Migrating session:', studySession.id);

    try {
      const migratedSession = migrateSessionToUnifiedFlow(studySession);
      const isValid = validateMigration(studySession, migratedSession);

      if (!isValid) {
        console.error('[Migration] Validation failed, keeping original session');
        return;
      }

      // Update the session with migrated data
      updateSession({
        phaseProgress: migratedSession.phaseProgress,
        adaptations: migratedSession.adaptations
      });

      console.log('[Migration] Session migrated successfully', {
        sessionId: studySession.id,
        phaseProgress: migratedSession.phaseProgress,
        adaptations: migratedSession.adaptations
      });
    } catch (error) {
      console.error('[Migration] Migration failed:', error);
    }
  }, [studySession, updateSession]);
}
