/**
 * Migration utilities for unified progressive flow.
 * Converts old session format to new phaseProgress + adaptations format.
 */

import type { StudySession, PhaseProgress, PhaseAdaptations } from '@/shared/types/learning';

/**
 * Migrates a single session from old format to unified flow format.
 * Maps old flags (scouted, previewed, overviewViewed, mapBuilt, mastered)
 * to new phaseProgress and infers adaptations from old session data.
 */
export function migrateSessionToUnifiedFlow(
  session: StudySession
): StudySession {
  // If already migrated (has phaseProgress), return as-is
  if (session.phaseProgress) {
    return session;
  }

  // Map old flags to new phaseProgress
  const phaseProgress: PhaseProgress = {
    // ORIENT completed if any of these old flags are true
    orientCompleted: Boolean(
      session.scouted || 
      session.previewed || 
      session.overviewViewed
    ),
    
    // STRUCTURE completed if map was built
    structureCompleted: Boolean(session.mapBuilt),
    
    // ENCODE started if any concepts completed
    encodeStarted: session.conceptsCompleted.length > 0,
    
    // VERIFY completed if mastered
    verifyCompleted: Boolean(session.mastered)
  };

  // Infer adaptations from old flags
  const adaptations: PhaseAdaptations = {};
  
  // Infer ORIENT mode from old flags
  if (session.overviewViewed) {
    // Overview map was for tired users
    adaptations.orientMode = 'prior-knowledge';
  } else if (session.scouted && session.previewed) {
    // Full scout + preview was for high energy users
    adaptations.orientMode = 'generative';
  } else if (session.previewed) {
    // Preview only was for medium energy users
    adaptations.orientMode = 'prediction-skeleton';
  }
  
  // Infer STRUCTURE mode
  if (session.mapBuilt) {
    // Assume full mode if they built it (we can't distinguish between variants)
    adaptations.structureMode = 'full';
  }
  
  // Infer ENCODE mode
  if (session.conceptsCompleted.length > 0) {
    // Default to standard if we can't determine
    // In future, could check session.mood to infer better
    adaptations.encodeMode = 'standard';
  }
  
  // Infer VERIFY mode
  if (session.mastered) {
    // Assume full mode if they completed mastery
    adaptations.verifyMode = 'free-recall';
  }

  return {
    ...session,
    phaseProgress,
    adaptations
  };
}

/**
 * Validates that migration preserved all important data.
 * Returns true if migration was successful, false if there are issues.
 */
export function validateMigration(
  oldSession: StudySession,
  newSession: StudySession
): boolean {
  // Check that progress is preserved
  if (oldSession.conceptsCompleted.length > 0) {
    if (!newSession.phaseProgress.encodeStarted) {
      console.error('[Migration] encodeStarted should be true when concepts completed');
      return false;
    }
  }
  
  // Check that completed concepts are preserved
  if (oldSession.conceptsCompleted.length !== newSession.conceptsCompleted.length) {
    console.error('[Migration] completedConcepts count mismatch');
    return false;
  }
  
  // Check that adaptations are set
  if (!newSession.adaptations) {
    console.error('[Migration] adaptations not set');
    return false;
  }
  
  // Check that phaseProgress is set
  if (!newSession.phaseProgress) {
    console.error('[Migration] phaseProgress not set');
    return false;
  }

  return true;
}

/**
 * Migrates all sessions in an array.
 * Useful for batch migration of stored sessions.
 */
export function migrateAllSessions(sessions: StudySession[]): StudySession[] {
  return sessions.map(session => {
    const migrated = migrateSessionToUnifiedFlow(session);
    const isValid = validateMigration(session, migrated);
    
    if (!isValid) {
      console.warn('[Migration] Validation failed for session:', session.id);
    }
    
    return migrated;
  });
}
