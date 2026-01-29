# Cleanup Required: Old Folder Structure

## Status: ⚠️ MIGRATION INCOMPLETE

The folder reorganization documented in `docs/archive/FOLDER_REORGANIZATION_COMPLETE.md` claims to be complete, but **the old `src/lib/` folder still exists and is actively being used**.

## Current Situation

### Files Still in Old Location (`src/lib/`)
- 50+ files still exist in `src/lib/`
- 4 active imports still pointing to old locations
- Migration was documented but NOT executed

### Active Imports from Old Locations

1. **`src/features/ai-coach/index.ts`**
   ```typescript
   export type { Mood, MoodOption, BreathingPattern, BreathingExercise } from '@/lib/ai/coach';
   export { MOOD_OPTIONS, getMoodAdjustedIntro, getRecommendedBreathing, BREATHING_EXERCISES, getSessionIntensity, aiCoach } from '@/lib/ai/coach';
   ```

2. **`src/features/content-storage/index.ts`**
   ```typescript
   export { storageManager } from '@/lib/storage';
   ```

3. **`src/features/content-storage/cloud/s3-dynamodb.ts`**
   ```typescript
   import { SyncEngine } from '@/lib/storage/sync-engine';
   import type { UserProgress, QuizScores } from '@/lib/storage/sync-engine';
   ```

4. **`src/components/learning/activities/BlankSheetTest.tsx`**
   ```typescript
   import { calculateRecallScore } from '@/lib/learning/scoring/blank-sheet-scorer';
   ```

## Recommended Action Plan

### Option 1: Complete the Migration (Safest)

1. **Move Missing Files**
   - `src/lib/ai/coach/index.ts` → `src/features/ai-coach/coach.ts` (merge with existing)
   - `src/lib/storage/sync-engine.ts` → Keep in `src/lib/storage/` (create shared/storage if needed)
   - `src/lib/learning/scoring/blank-sheet-scorer.ts` → `src/features/learning-session/scoring/`
   - `src/lib/storage/index.ts` (storageManager) → `src/features/content-storage/manager.ts`

2. **Update Imports**
   - Update 4 files to point to new locations
   - Test that everything still works

3. **Delete Old Folder**
   - Once all imports updated and tested
   - `Remove-Item -Path "src/lib" -Recurse -Force`

### Option 2: Keep Old Structure (Pragmatic)

If the old structure is working and the migration is too risky:

1. **Update Documentation**
   - Mark `FOLDER_REORGANIZATION_COMPLETE.md` as "PARTIAL" not "COMPLETE"
   - Document that `src/lib/` is still in use
   - Remove "deprecated" warnings

2. **Accept Hybrid Structure**
   - New code goes in `src/features/` and `src/shared/`
   - Old code stays in `src/lib/` until naturally refactored
   - No forced migration

### Option 3: Gradual Migration (Balanced)

1. **Move One Feature at a Time**
   - Week 1: Move AI Coach completely
   - Week 2: Move Storage completely
   - Week 3: Move Learning Scoring
   - Week 4: Delete `src/lib/`

2. **Test After Each Move**
   - Run full test suite
   - Manual testing of affected features
   - Rollback if issues found

## Risk Assessment

### High Risk ⚠️
- Deleting `src/lib/` without updating imports → **App will crash**
- Moving files without updating all imports → **Build will fail**
- Missing hidden dependencies → **Runtime errors**

### Medium Risk ⚙️
- Incomplete migration → **Confusing codebase**
- Duplicate files in old and new locations → **Which is source of truth?**

### Low Risk ✅
- Keeping old structure → **Works but not ideal**
- Gradual migration → **Safe but slow**

## My Recommendation

**Option 3: Gradual Migration**

Reason: The codebase is actively being developed. A big-bang migration is risky. Better to:
1. Move one feature completely
2. Test thoroughly
3. Move next feature
4. Repeat until done

This way, if something breaks, you know exactly what caused it.

## Immediate Action

**DO NOT delete `src/lib/` yet!** 

The app is currently using it. Deleting it will break the build.

Instead:
1. Pick one feature to migrate (I recommend AI Coach - smallest)
2. Move all AI Coach files from `src/lib/ai/coach/` to `src/features/ai-coach/`
3. Update the 1 import in `src/features/ai-coach/index.ts`
4. Test that AI Coach still works
5. Then move to next feature

## Files to Move (Priority Order)

### Priority 1: AI Coach (1 import to fix)
- `src/lib/ai/coach/index.ts` → Merge into `src/features/ai-coach/index.ts`
- `src/lib/ai/coach/personas.ts` → Already exists in new location (delete old)

### Priority 2: Storage (2 imports to fix)
- `src/lib/storage/sync-engine.ts` → `src/lib/storage/` (keep here or move to shared)
- `src/lib/storage/index.ts` → `src/features/content-storage/manager.ts`

### Priority 3: Learning Scoring (1 import to fix)
- `src/lib/learning/scoring/blank-sheet-scorer.ts` → `src/features/learning-session/scoring/`

### Priority 4: Everything Else
- Delete remaining `src/lib/` files that aren't imported

## Conclusion

The folder reorganization was documented as complete but was NOT actually executed. The old `src/lib/` folder is still actively being used by the application.

**Next Steps:**
1. Decide on migration strategy (Option 1, 2, or 3)
2. If migrating, start with AI Coach (smallest, easiest)
3. Test thoroughly after each move
4. Update this document as progress is made

---

**Created:** January 29, 2026  
**Status:** Awaiting decision on migration strategy
