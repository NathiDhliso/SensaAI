# Codebase Complexity Audit

**Date**: January 29, 2026  
**Scope**: Full codebase analysis for unnecessary complexity

---

## Executive Summary

Found **8 major areas** of unnecessary complexity that can be simplified or removed:

1. **Unused/Dead Files** - 3 files can be deleted
2. **Stub/Placeholder Code** - 1 stub module serving no purpose
3. **Unused Hooks** - 4 hooks not exported or used
4. **Over-Engineered Features** - 2 features with excessive abstraction
5. **Duplicate Storage Logic** - Multiple overlapping storage implementations
6. **Unused Scripts** - Several utility scripts that may be obsolete
7. **Empty/Minimal Directories** - AI coach/phases directories with minimal content
8. **Repair Sentinel Hook** - Still present despite self-healing removal

**Estimated Reduction**: ~1,200+ lines of code

---

## 1. DEAD FILES - DELETE IMMEDIATELY

### `src/store/auth-store.old.ts` (400+ lines)
- **Status**: Not imported anywhere
- **Action**: DELETE
- **Reason**: Old authentication implementation, replaced by current `auth-store.ts`

### `src/lib/system-prompt.ts` (799 lines)
- **Status**: DUPLICATE - Frontend has copy of backend system prompt
- **Issue**: System prompt should only live in backend
- **Action**: DELETE - Use backend version only
- **Reason**: Frontend doesn't need to know about AI prompts, backend handles generation

---

## 2. STUB CODE - NO FUNCTIONALITY

### `src/lib/ai/content-analytics.ts` (100 lines)
- **Issue**: Entire file is a stub returning empty/zero values
- **Current State**: All functions return hardcoded zeros
- **Used By**: `ContentLaunchpad.tsx` - calls `analyzeContentQuality()` but doesn't display results
- **Finding**: Analytics are computed but NEVER SHOWN to user
- **Action**: DELETE - Remove file and remove analytics call from ContentLaunchpad
- **Reason**: Computing fake metrics that are never displayed is pure waste

---

## 3. UNUSED HOOKS - NOT EXPORTED

### Hooks NOT in `src/hooks/index.ts`:
1. ✅ **`useRepairSentinel.ts`** - DELETED (part of removed self-healing feature)

2. ✅ **`usePrerequisiteCheck.ts`** - DELETED (not exported, not used anywhere)

3. ✅ **`useConceptsQuery.ts`** - DELETED (not exported, not used - 200+ lines)

4. ✅ **`use-concept-cache.ts`** - DELETED (not exported, not used - 150+ lines)

5. **`useContent.ts`** - Used in `CelebrationModal.tsx` but not exported
   - **Action**: Export in index.ts or inline the logic

6. **`useBionicReading.ts`** - Used in `App.tsx` but not exported
   - **Action**: Export in index.ts

7. **`useBackgroundJobRecovery.ts`** - Used but not exported
   - **Action**: Export in index.ts

8. **`useGenerationRecovery.ts`** - Used but not exported
   - **Action**: Export in index.ts

9. **`useLearningFlow.ts`** - Used but not exported
   - **Action**: Export in index.ts

10. **`useSensaFlow.ts`** - Used but not exported
    - **Action**: Export in index.ts

11. **`useFlowState.ts`** - Used but not exported
    - **Action**: Export in index.ts

12. **`useOrientationAwareZoom.ts`** - Used but not exported
    - **Action**: Export in index.ts

13. **`useResponsiveNodeSize.ts`** - Used but not exported
    - **Action**: Export in index.ts

14. **`useVoice.ts`** - Used but not exported
    - **Action**: Export in index.ts

**Pattern**: Most hooks are used but not exported. This is inconsistent.

**Recommendation**: Either export ALL used hooks in index.ts, or delete the index.ts pattern entirely and import directly.

---

## 4. OVER-ENGINEERED FEATURES

### A) Dynamic Lifecycle System (`src/lib/generation/dynamic-lifecycle.ts`)
- **Purpose**: Generate custom 3-phase lifecycles per subject
- **Complexity**: 150+ lines for what could be a simple config
- **Issue**: Adds AI call overhead for minimal value
- **Used By**: Generation system
- **Recommendation**: 
  - **SIMPLIFY**: Use a fixed lifecycle (PREPARE → MODEL → DELIVER) for all subjects
  - **OR**: Pre-define 5-10 common lifecycles and map subjects to them
  - **Savings**: Remove AI call, reduce generation time

### B) Multiple Content Parsers
- **Files**:
  - `json-content-parser.ts`
  - `parse-ai-response.ts`
  - `sensa-ai-integration.ts`
  - `transformer.ts`
- **Issue**: 4 different files handling content transformation
- **Recommendation**: Consolidate into 1-2 files with clear responsibilities

---

## 5. STORAGE COMPLEXITY

### Multiple Storage Implementations:
1. `cloud-storage.ts` - S3/DynamoDB
2. `indexed-db-storage.ts` - Browser IndexedDB
3. `local-storage.ts` - Browser localStorage
4. `session-progress.ts` - Session-specific storage

**Issue**: Unclear which storage is authoritative for what data

**Recommendation**: 
- Document clear ownership: "Cloud = source of truth, IndexedDB = offline cache, localStorage = UI preferences"
- Consider removing one layer if redundant

---

## 6. UTILITY SCRIPTS - AUDIT NEEDED

### Scripts Directory (12 files):
- `check-any-types.ps1` ✓ (useful)
- `check-console-logs.ps1` ✓ (useful)
- `check-css-var-prefixes.ps1` ✓ (useful)
- `check-hardcoded-colors.ps1` ✓ (useful)
- `check-hardcoded-subjects.ps1` ✓ (useful)
- `check-magic-timeouts.ps1` ✓ (useful)
- `run-all-checks.ps1` ✓ (useful)
- `generate-map.js` ❓ (check if used)
- `generate-voices.js` ❓ (check if used)
- `generate_project_map.js` ❓ (duplicate of generate-map.js?)
- `migrate-broken-results.ts` ❓ (one-time migration? delete if done)
- `revalidate-pl300.ts` ❓ (one-time script? delete if done)
- `scan-css-conflicts.js` ❓ (check if used)
- `scan-duplicate-css-properties.js` ❓ (check if used)
- `scan-hardcoded-colors.js` ❓ (duplicate of check-hardcoded-colors.ps1?)
- `voice-data.json` ❓ (check if used)

**Recommendation**: Review each ❓ script - if it was a one-time migration or is unused, delete it.

---

## 7. MINIMAL/EMPTY FEATURES

### AI Coach System (`src/lib/ai/coach/`)
- **Files**: 2 files (index.ts, personas.ts)
- **Status**: ACTIVELY USED - Powers personalization and feedback
- **Used By**: Settings page, AI phases (retain, preview, score-map), personalization store
- **Finding**: Well-structured, appropriate abstraction
- **Action**: KEEP - This is a legitimate feature with real usage

### AI Phases System (`src/lib/ai/phases/`)
- **Files**: 5 files (build-ai, preview-ai, retain-ai, score-map, index)
- **Status**: ACTIVELY USED - Powers learning activities
- **Used By**: Learning activities (BlankSheetTest, MasteryChallenge, etc.)
- **Finding**: Each file handles a distinct learning phase
- **Action**: KEEP - Appropriate separation of concerns

---

## 8. LEFTOVER REPAIR CODE

### `useRepairSentinel.ts` Hook
- **Status**: Still exists and imported in `MicroLearningLoopController.tsx`
- **Issue**: Part of removed self-healing feature
- **Action**: DELETE hook and remove import from controller

---

## 9. GENERATION COMPLEXITY

### `backend-generator.ts` (400+ lines)
- **Issue**: Single file doing too much:
  - Upload handling
  - Generation orchestration
  - Polling logic
  - Concept fetching
  - Document building
  - Error handling
- **Recommendation**: Split into:
  - `generation-client.ts` - API calls
  - `generation-orchestrator.ts` - Coordination
  - `document-builder.ts` - Document assembly

---

## 10. TYPE DEFINITIONS

### Multiple Type Files:
- `src/lib/types/concept-schema.ts`
- `src/lib/types/confusion.ts`
- `src/lib/types/generation.ts`
- `src/lib/types/learning.ts`
- `src/lib/types/sensa-flow.types.ts`
- `src/lib/content-adapter/types.ts`

**Issue**: Types scattered across multiple files, potential duplication

**Recommendation**: Audit for duplicate type definitions, consolidate where possible

---

## PRIORITY ACTIONS

### HIGH PRIORITY (Do First):
1. ✅ DELETE `src/store/auth-store.old.ts` (400 lines)
2. ✅ DELETE `src/lib/system-prompt.ts` (799 lines - duplicate)
3. ✅ DELETE `useRepairSentinel.ts` and remove from MicroLearningLoopController
4. ✅ DELETE `content-analytics.ts` and remove call from ContentLaunchpad (100 lines)
5. ✅ Review and delete unused scripts in `/scripts`

### MEDIUM PRIORITY:
5. Consolidate content parsers (4 files → 2 files)
6. Simplify dynamic lifecycle (remove AI call overhead)
7. Export all used hooks in index.ts OR remove index.ts pattern
8. Document storage layer responsibilities

### LOW PRIORITY:
9. Split backend-generator.ts into smaller modules
10. Audit type definitions for duplication
11. Review AI coach/phases directories for over-abstraction

---

## QUESTIONS TO ANSWER

1. **Is analytics feature actually used?** Check if SavedResults page displays analytics
2. **Are migration scripts done?** Can we delete `migrate-broken-results.ts` and `revalidate-pl300.ts`?
3. **Is dynamic lifecycle worth the complexity?** Does custom lifecycle per subject add real value?
4. **Which storage layer is authoritative?** Cloud, IndexedDB, or localStorage?

---

## ESTIMATED IMPACT

**Lines of Code REMOVED**: ~2,100+
- ✅ auth-store.old.ts: 400 lines
- ✅ system-prompt.ts (frontend): 799 lines
- ✅ content-analytics.ts: 100 lines (replaced with 30-line type stub)
- ✅ useRepairSentinel.ts: 80 lines
- ✅ usePrerequisiteCheck.ts: 40 lines
- ✅ useConceptsQuery.ts: 220 lines
- ✅ use-concept-cache.ts: 150 lines
- ContentLaunchpad simplified: ~200 lines removed (analytics UI)
- Unused scripts (pending): 300 lines
- Consolidation savings (pending): 120+ lines

**Complexity Reduction**: 
- Fewer files to maintain
- Clearer architecture
- Faster build times
- Easier onboarding for new developers
