# 🧹 Technical Debt Cleanup Plan

**Created:** January 3, 2026  
**Goal:** Optimize codebase for future development and maintainability  
**Estimated Total Effort:** 8-12 hours

---

## 📊 Executive Summary

| Category | Items | Priority | Estimated Hours |
|----------|-------|----------|-----------------|
| Dead Code Removal | 7 items | 🔴 High | 1-2 hrs |
| Deprecated Route Cleanup | 6 routes | 🟡 Medium | 2-3 hrs |
| Store Consolidation | 2 stores | 🟡 Medium | 2-3 hrs |
| Type Consolidation | 2 files | 🟢 Low | 1 hr |
| CSS Optimization | ~100 lines | 🟢 Low | 1-2 hrs |

---

## 🔴 PHASE 1: Dead Code Removal (High Priority)

### ✅ Already Completed
- [x] `src/components/diagnostic/` - Deleted
- [x] `src/lib/generation/diagnostic-generator.ts` - Deleted
- [x] `src/lib/types/diagnostic.ts` - Deleted
- [x] `generation-store.ts` diagnostic references - Cleaned

### 1.1 Remove Deprecated Routes from App.tsx

**File:** `src/App.tsx`

The following routes are marked `@deprecated` and now have unified alternatives:

| Deprecated Route | Replacement | Action |
|-----------------|-------------|--------|
| `/results/:id` | `/study/:subjectId` | Keep temporarily (used by Generate redirect) |
| `/learn` | `/study/:subjectId` (Learn tab) | **DELETE after migration** |
| `/palace` | `/study/:subjectId` (Palace tab) | **DELETE after migration** |
| `/sprint` | `/study/:subjectId` (Sprint tab) | **DELETE after migration** |
| `/sprint-results` | Sprint completion flow | **DELETE after migration** |
| `/saved` | Rename to `/library` | **RENAME route** |

**Migration Steps:**
1. Update all `navigate('/learn')` calls → `navigate('/study/current')`
2. Update all `navigate('/palace')` calls → embedded in Study page
3. Update all `navigate('/sprint')` calls → embedded in Study page
4. Delete lazy imports: `Learn`, `Palace`, `Sprint`, `SprintResults`
5. Delete route definitions

**Files to update:**
- `src/pages/Home.tsx` - Line 338: `navigate('/learn')` → `/study/current`
- `src/pages/Learn.tsx` - Line 167: `navigate('/sprint')` → handled internally
- `src/pages/Results.tsx` - Already updated to `/study/:subjectId`

### 1.2 Delete Standalone Page Files (After Route Migration)

```
Files to DELETE after route migration:
src/pages/Learn.tsx          # Merged into Study.tsx
src/pages/Learn.module.css   # Merged into Study.module.css
src/pages/SprintResults.tsx  # Merged into Sprint completion
src/pages/SprintResults.module.css
```

**Keep for now:**
- `Sprint.tsx` - Still used standalone AND in Study
- `Palace.tsx` - Still used standalone AND in Study

### 1.3 Remove Unused Exports from Index Files

**File:** `src/components/learning/index.ts`

Check and remove any exports that are no longer used:
```bash
# For each export, verify it's imported elsewhere
grep -r "from '@/components/learning'" src/
```

---

## 🟡 PHASE 2: Store Consolidation (Medium Priority)

### 2.1 Merge focus-session-store into learning-store

**Current State:**
- `learning-store.ts` - Has `CurrentSession` and `StudySession` interfaces
- `focus-session-store.ts` - Duplicates session tracking functionality

**Overlap Analysis:**

| focus-session-store | learning-store | Action |
|---------------------|----------------|--------|
| `isSessionActive` | `studySession.isActive` | **Merge** |
| `currentConceptId` | `currentSession.progress.currentConceptId` | **Use learning-store** |
| `sessionStartTime` | `studySession.startedAt` | **Merge** |
| `conceptsCompleted` | `studySession.conceptsCompleted` | **Merge** |
| `sessionGoal` | `studySession.goal` | **Merge** |
| `timerDuration` | `studySession.targetDuration` | **Merge** |

**Migration Plan:**
1. Add any unique `focus-session-store` state to `learning-store.ts`
2. Update all imports:
   - `src/pages/Study.tsx`
   - `src/pages/Learn.tsx`
   - `src/components/ui/SpeedReaderBar.tsx`
   - `src/components/learning/SessionSummary.tsx`
   - `src/components/learning/UnifiedSessionBar.tsx`
   - `src/components/learning/LearningToolbar/` (3 files)
3. Delete `src/store/focus-session-store.ts`

### 2.2 Audit personalization-store Usage

**File:** `src/store/personalization-store.ts`

Check if all state is actively used:
```bash
grep -r "usePersonalizationStore" src/
```

---

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
