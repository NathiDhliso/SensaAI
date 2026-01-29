# Learning Flow Phase Sequence Fix

## Problem
The MASTER phase was never being triggered because `markSessionMapReconstructed()` was never called, causing the flow to skip from LEARN → COMPLETE.

## Solution
Fixed the phase transition logic to ensure all 6 phases are properly triggered in sequence.

## Changes Made

### 1. VelocityLearning.tsx
- **Added import**: `markSessionMapReconstructed` from learning store
- **Updated `handleLoopComplete`**: Now checks if all concepts are completed and triggers transition to MASTER phase
  ```typescript
  // Check if all concepts are now completed
  if (currentSession && studySession) {
      const completedCount = currentSession.progress.completedConcepts.length + 1;
      const totalCount = currentSession.concepts.length;
      
      // If all concepts completed, mark map as reconstructed to trigger MASTER phase
      if (completedCount >= totalCount && !studySession.mapReconstructed) {
          console.log('[VelocityLearning] All concepts completed, transitioning to MASTER phase');
          markSessionMapReconstructed(true);
          sensaFlow.completeStudy(1.0);
      }
  }
  ```
- **Added phase completion tracking**: Added `setCompletedPhases` calls for DIAGNOSE, LEARN, and MASTER phases

### 2. useLearningFlow.ts
- **Fixed phase sequence logic**: Cleaned up the MASTER phase check to ensure it's properly positioned in the flow
  ```typescript
  // --- Level 6: Master (Final Challenge) ---
  // After all concepts learned, if map was reconstructed, do mastery challenge
  if (studySession.mapReconstructed && !studySession.mastered) {
      return 'MASTER';
  }
  ```

## Complete Phase Flow

### For `learn-new` and `velocity` goals (Full Flow):
1. **PRIME** (Lock In) - Session configuration with VelocityLockInGate
   - Triggered when: No study session or no primer
   - Completion: User confirms lock-in and sets session parameters
   
2. **BUILD** (Map Concepts) - ConceptMapBuilder
   - Triggered when: `!studySession.mapBuilt`
   - Completion: User builds concept map → `markSessionMapBuilt()`
   
3. **DIAGNOSE** (Assessment) - DiagnosticLaunchSystem
   - Triggered when: Fresh session + foundation concepts ≥ 5
   - Completion: User completes diagnostic → `completeDiagnostic()`
   
4. **LEARN** (Learning) - MicroLearningLoopController
   - Triggered when: `activeConcept` exists
   - Completion: All concepts completed → `markSessionMapReconstructed(true)` ✅ NEW
   
5. **MASTER** (Mastery) - MasteryChallenge
   - Triggered when: `studySession.mapReconstructed && !studySession.mastered` ✅ FIXED
   - Completion: User completes mastery challenge → `markSessionMastered()`
   
6. **COMPLETE** - Session summary and completion screen
   - Triggered when: All phases completed or no more work to do

### For `review` goal (Simplified Flow):
1. PRIME → 2. BUILD → 6. COMPLETE (skips DIAGNOSE, LEARN, MASTER)

### For `explore` goal (Minimal Flow):
1. PRIME → 6. COMPLETE (shows SensaSynopticView for calm browsing)

## Phase Navigator
The PhaseNavigator component already displays all 6 phases correctly:
- Lock In (Rocket icon)
- Map Concepts (Map icon)
- Assessment (Target icon)
- Learning (Brain icon)
- Mastery (Trophy icon)
- Complete (CheckCircle icon)

## Testing Checklist
- [ ] Start a new learning session
- [ ] Complete Lock In phase
- [ ] Build concept map
- [ ] Complete diagnostic (if triggered)
- [ ] Complete all learning concepts
- [ ] Verify MASTER phase is triggered (should see MasteryChallenge)
- [ ] Complete mastery challenge
- [ ] Verify COMPLETE phase shows session summary

## Related Files
- `src/pages/VelocityLearning.tsx` - Main orchestrator
- `src/shared/hooks/useLearningFlow.ts` - Phase state machine
- `src/components/learning/ui/PhaseNavigator.tsx` - Visual phase indicator
- `src/store/slices/createStudySlice.ts` - Session state management
