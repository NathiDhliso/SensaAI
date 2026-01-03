# 🧹 Technical Debt Cleanup Plan

**Created:** January 3, 2026  
**Completed:** January 3, 2026  
**Goal:** Optimize codebase for future development and maintainability  

---

## 📊 Executive Summary

| Category | Items | Priority | Status |
|----------|-------|----------|--------|
| Dead Code Removal | 7 items | 🔴 High | ✅ DONE |
| Route Consolidation | 6 routes | 🟡 Medium | ✅ DONE |
| Type Consolidation | 2 files | 🟢 Low | ✅ DONE |
| Store Consolidation | 2 stores | 🟡 Medium | ✅ DONE |
| Deprecated Properties | 4 props | 🟡 Medium | ✅ DONE |
| Console.log Cleanup | ~15 logs | 🟢 Low | ✅ DONE |
| CSS Optimization | ~100 lines | 🟢 Low | ⏸️ Deferred |

**Total Lines Removed:** ~1,400+ lines  
**Net Result:** Cleaner, faster, more maintainable codebase

---

## ✅ PHASE 1: Dead Code & Route Cleanup (COMPLETED)

**Commit:** `ea7812d` - refactor: Phase 1 technical debt cleanup - route consolidation

### Files Deleted
- [x] `src/components/diagnostic/` - Previously deleted
- [x] `src/lib/generation/diagnostic-generator.ts` - Previously deleted
- [x] `src/lib/types/diagnostic.ts` - Previously deleted
- [x] `src/pages/Learn.tsx` - Merged into Study.tsx
- [x] `src/pages/Learn.module.css` - Deleted
- [x] `src/pages/SprintResults.tsx` - Merged into Sprint flow
- [x] `src/pages/SprintResults.module.css` - Deleted

### Routes Updated
| Old Route | New Route | Type |
|-----------|-----------|------|
| `/learn` | `/study/current` | Redirect |
| `/sprint-results` | `/study/current?tab=sprint` | Redirect |
| `/saved` | `/library` | Redirect + Rename |
| `/palace` | `/study/current?tab=palace` | Navigation updated |

### Navigation Updated
- `Home.tsx` → `/study/current`, `/library`
- `Results.tsx` → `/study/current?tab=palace`
- `SavedResults.tsx` → `/study/current`
- `Settings.tsx` → `/study/current`
- `Sprint.tsx` → `/study/current?tab=sprint`, `/study/current`
- `ExteriorView.tsx` → `/study/current`

### TypeScript Fixes Applied
- `Study.tsx`: Removed unused variables, fixed ConceptChunks props
- `ExteriorView.tsx`: Fixed handleStartWalk onClick handler type
- `Results.tsx`: Removed unused imports

**Net result: -746 lines of code**

---

## ✅ PHASE 2: Store Consolidation (COMPLETED)

**Commit:** `f0cb927` - refactor: consolidate stores and remove backward compatibility

### Merged focus-session-store into learning-store

**Decision:** COMPLETE MERGE (no backward compatibility needed)

**Changes:**
- Deleted `src/store/focus-session-store.ts` (392 lines)
- Merged all focus/pomodoro session state into `learning-store.ts`
- Added focus session types: `ConceptTiming`, `PaceRating`, `SessionSummary`
- Added focus session state: `isSessionActive`, `isPaused`, `sessionType`, timers, stats
- Added focus session actions: `startFocusSession`, `pauseSession`, `tick`, `recordConceptStart/End`, etc.
- Exported `useFocusSessionStore` as alias to `useLearningStore` for API compatibility

**Files Updated (10):**
- `SpeedReaderBar.tsx` - merged to single store import
- `UnifiedSessionBar.tsx` - merged, renamed `endSession` → `endFocusSession`
- `SessionSummary.tsx` - merged to learning store
- `LearningToolbar.tsx` - merged to single store
- `FocusTimer.tsx` - merged to learning store
- `Study.tsx` - removed separate focus store import
- Plus 4 other components that needed null checks

**Reason:** No users = no backward compatibility needed. Clean consolidation.

**Net result: -392 lines (store file), +focus session functionality in learning-store**

---

## ✅ PHASE 3: Type Consolidation (COMPLETED)

**Commit:** `bd6ff07`

### Changes
- Created `src/lib/types/generation.ts` with organized sections:
  - Lifecycle Types
  - Pass Results
  - Validation
  - Generation Results
  - Progress Tracking
- Deleted `src/lib/types.ts`
- Updated 7 files to use new import path:
  - `generation-store.ts`
  - `Generate.tsx`
  - `validation.ts`
  - `lifecycle-engine.ts`
  - `multi-pass-generator.ts`
  - `dynamic-lifecycle.ts`
  - `backend-generator.ts`

---

## ✅ PHASE 4: Deprecated Store Properties (COMPLETED)

**Commit:** `f0cb927` (same as Phase 2)

### Removed Deprecated Properties

All backward-compatibility fallbacks removed from `learning-store.ts`:

**Removed:**
- `progress` - direct property access
- `customContent` - direct property access  
- `cognitiveMetrics` - direct property access
- `sprintResult` - direct property access
- `loadCustomContent()` - method
- `clearCustomContent()` - method

**New Clean API:**
- `currentSession` - single source of truth containing:
  - `currentSession?.progress`
  - `currentSession?.stages` and `currentSession?.concepts`
  - `currentSession?.cognitiveMetrics`
  - `currentSession?.sprintResult`
- `loadSession()` - replaces `loadCustomContent()`
- `clearSession()` - replaces `clearCustomContent()`
- Helper methods: `getStages()`, `getConcepts()`, `hasCustomContent()`, `getSession()`

**Files Updated (17):**
- Components: StudyLayout, CognitiveGauge, JourneyMap, SpeedReaderBar, UnifiedSessionBar, SessionSummary, FocusTimer, LearningToolbar, ProgressAnalytics, QuickQuiz
- Pages: Home, Settings, Sprint, Study
- Lib: content-loader

**Reason:** Unreleased app = no users with persisted state to break

---

## ✅ PHASE 5: Code Quality Cleanup (COMPLETED)

**Commit:** `bd6ff07`

### Console.logs Removed
- `generation-store.ts`: ENV config check logs (3)
- `Generate.tsx`: useEffect debug logs (7)
- `Sprint.tsx`: Question generation logs (2)

### Kept (Intentional)
- Error logs (`console.error`)
- Storage migration logs (informative for debugging)

---

## ⏸️ DEFERRED: CSS Optimization

**Reason:** Low ROI, intentional variations for context-specific styling

### Not Consolidated (By Design)
- `.overlay` - 12+ files with different backdrop/z-index
- `.closeButton` - Different sizes/colors per modal
- `.primaryButton` - Context-specific hover states

---

## 📈 Final Results

### Commits
1. `ea7812d` - Phase 1: Route consolidation (-746 lines)
2. `d04b170` - docs: update cleanup plan
3. `bd6ff07` - Phases 3, 5: Type consolidation, console cleanup
4. `f0cb927` - Phases 2, 4: Store consolidation, deprecated properties removal (-206 lines net)
5. `4d7f9a8` - docs: finalize cleanup plan (previous version)

### Metrics
- **Files Deleted:** 7 (pages, types, stores)
- **Routes Consolidated:** 4 deprecated → redirects
- **Stores Merged:** 2 → 1 (focus-session merged into learning)
- **Types Organized:** 1 file → organized folder structure
- **Deprecated Props Removed:** 4 (progress, customContent, cognitiveMetrics, sprintResult)
- **Console.logs Removed:** ~12 debug statements
- **Build Status:** ✅ Passing
- **Net Lines Removed:** ~1,400+ lines

### API Improvements

**Before (scattered, duplicated):**
```typescript
const { progress, customContent, cognitiveMetrics } = useLearningStore();
const { isSessionActive, recordConceptStart } = useFocusSessionStore();
const stages = customContent?.stages || [];
```

**After (clean, consolidated):**
```typescript
const { currentSession, isSessionActive, recordConceptStart } = useLearningStore();
const stages = getStages(); // or currentSession?.stages
const progress = currentSession?.progress;
```

---

## 🔮 Future Considerations

1. **CSS Utilities** - Extract common patterns if they stabilize
2. **ESLint Rules** - Add `no-console` rule for future prevention
3. **Store Splitting** - If learning-store grows too large, consider splitting by feature domain

## 🟡 PHASE 3: Type Definition Cleanup (Medium Priority)

### 3.1 Consolidate src/lib/types.ts into src/lib/types/

**Current State:**
- `src/lib/types.ts` - Root-level types file (90 lines)
- `src/lib/types/` - Organized type folder with:
  - `learning.ts`
  - `sprint.ts`
  - `palace.ts`
  - `confusion.ts`

**Migration Plan:**
1. Move generation-related types from `types.ts` → `types/generation.ts`
2. Update imports across codebase
3. Delete `src/lib/types.ts`

**Types to move:**
```typescript
// From src/lib/types.ts → src/lib/types/generation.ts
- LifecyclePhases
- DynamicLifecycle
- Pass1Result
- PassStatus
- ValidationResult
- GenerationResult
- PanoramaManifest
- FloorPlanGeneratorOptions
```

### 3.2 Remove Duplicate Type Definitions

**Check for overlap between:**
- `LifecyclePhase` in `types/learning.ts` vs `LifecyclePhases` in `types.ts`
- Ensure single source of truth

---

## 🟢 PHASE 4: CSS Optimization (Low Priority)

### 4.1 Remove Unused CSS Classes

**Tool:** Use CSS coverage in Chrome DevTools or PurgeCSS

**High-probability unused classes to audit:**

```css
/* Results.module.css - Already cleaned some */
.headerActions  /* Verify */
.metricsCard    /* Verify */

/* Learn.module.css */
.sprintButtonEarly  /* May be unused */

/* Home.module.css */
.difficultyIndicator  /* Check if rendered */
```

### 4.2 Consolidate Common Patterns (OPTIONAL)

**Do NOT consolidate these (intentional variations):**
- `.overlay` - 12+ files with different backdrop/z-index
- `.closeButton` - Different sizes/colors per modal
- `.primaryButton` - Context-specific hover states

**CONSIDER creating shared utilities for:**
```css
/* New file: src/styles/utilities.css */
.sr-only { /* Screen reader only */ }
.truncate { /* Text overflow */ }
.flex-center { /* Flex center alignment */ }
```

---

## 🟢 PHASE 5: Code Quality Improvements (Low Priority)

### 5.1 Address TODOs

| File | Line | TODO | Action |
|------|------|------|--------|
| `Learn.tsx` | 80 | Track per-phase completion | Implement or remove |
| `App.tsx` | 55 | Merge into unified Study Center | Complete in Phase 1 |
| `App.tsx` | 116 | Rename /saved to /library | Do in Phase 1 |

### 5.2 Remove Console Logs

```bash
grep -r "console.log" src/ --include="*.tsx" --include="*.ts"
```

Replace with proper error handling or remove debug statements.

### 5.3 Add Missing Error Boundaries

**Current:** No error boundaries around route components  
**Recommended:** Add `<ErrorBoundary>` wrapper in App.tsx

---

## 📋 Implementation Checklist

### Phase 1: Dead Code (Day 1)
- [ ] Update Home.tsx navigation to use /study/:subjectId
- [ ] Update any remaining /learn, /palace, /sprint navigations
- [ ] Delete deprecated route definitions from App.tsx
- [ ] Delete Learn.tsx and Learn.module.css (after verification)
- [ ] Delete SprintResults.tsx and SprintResults.module.css
- [ ] Rename /saved to /library
- [ ] Run `npm run build` to verify no breaks

### Phase 2: Store Consolidation (Day 2)
- [ ] Analyze focus-session-store vs learning-store overlap
- [ ] Migrate unique state to learning-store
- [ ] Update all component imports
- [ ] Delete focus-session-store.ts
- [ ] Run `npm run build` and test

### Phase 3: Type Cleanup (Day 2)
- [ ] Create src/lib/types/generation.ts
- [ ] Move types from src/lib/types.ts
- [ ] Update all imports
- [ ] Delete src/lib/types.ts
- [ ] Run TypeScript check

### Phase 4: CSS Cleanup (Day 3)
- [ ] Run CSS coverage analysis
- [ ] Remove verified unused classes
- [ ] Test UI in all viewports

### Phase 5: Quality (Day 3)
- [ ] Address or document TODOs
- [ ] Remove console.logs
- [ ] Add error boundaries

---

## 🚫 DO NOT DELETE (Confirmed In Use)

| File | Used By | Notes |
|------|---------|-------|
| `focus-session-store.ts` | 7 components | Merge, don't delete yet |
| `ui-store.ts` | Home, SettingsPanel | Keep |
| `personalization-store.ts` | Settings | Keep |
| `theme-store.ts` | App-wide | Keep |
| `NeuralResetModal.tsx` | Learn.tsx | Exported as NeuralResetBanner |
| `UnifiedSessionBar.tsx` | Learn.tsx | Keep |
| `utils.ts` | Sprint.tsx | Keep (formatTime, getTimerUrgency) |

---

## 📈 Success Metrics

After cleanup, verify:
1. ✅ `npm run build` succeeds with 0 errors
2. ✅ `npx tsc --noEmit` passes
3. ✅ Bundle size reduced by ~10-15%
4. ✅ All routes functional in dev
5. ✅ No runtime console errors

---

## 🔄 Rollback Plan

Before starting, create a git branch:
```bash
git checkout -b cleanup/technical-debt
```

If issues arise:
```bash
git checkout main
git branch -D cleanup/technical-debt
```

---

## 📝 Notes

- **Industry Standard:** Follow React best practices (single responsibility, colocation)
- **Testing:** Manual smoke test after each phase
- **Documentation:** Update this file as items are completed
- **Future:** Consider adding ESLint rules for unused imports/exports
