# MVP Implementation Checklist

**Target:** Production-ready MVP  
**Total Estimated Time:** 30 hours (17 critical + 13 high-priority)  
**Current Status:** ❌ NOT READY FOR LAUNCH

---

## 🔴 CRITICAL BLOCKERS (Must Fix) - 9 hours

### 1. Fix COMPLETE Phase Empty State (2 hours)
**File:** `src/pages/VelocityLearning.tsx:450-470`

- [ ] Add check for `completedConcepts.length > 0`
- [ ] Create `EmptyStateOnboarding` component for new users
- [ ] Create `SessionCompletionDashboard` component for finished users
- [ ] Update case 'COMPLETE' logic to distinguish states
- [ ] Test: New user sees onboarding, not "All Caught Up"
- [ ] Test: Completed user sees summary dashboard

**Acceptance Criteria:**
- New users see clear "Get Started" message
- Completed users see session summary with stats
- No more confusing "All Caught Up" for wrong scenarios

---

### 2. Add Storage Hydration Error Boundary (3 hours)
**File:** `src/pages/Study.tsx:70-95`

- [ ] Add retry mechanism (3 attempts with exponential backoff)
- [ ] Check for active jobs if storage load fails
- [ ] Check recent results as fallback
- [ ] Create `SessionNotFoundScreen` component
- [ ] Create `RegeneratePromptScreen` component
- [ ] Add proper error state rendering for each error type
- [ ] Test: Invalid URL shows helpful error
- [ ] Test: Corrupted storage recovers or shows clear message
- [ ] Test: Active job resumes correctly

**Acceptance Criteria:**
- No white screens or crashes on invalid URLs
- Clear error messages for each failure mode
- Automatic recovery when possible
- User always has a path forward

---

### 3. Implement Concept Loop Max Attempts (4 hours)
**File:** `src/store/learning-store.ts`

- [ ] Add `ConceptProgress` interface with attempt tracking
- [ ] Add `conceptProgress: Map<string, ConceptProgress>` to session state
- [ ] Add `maxAttemptsPerConcept: 3` constant
- [ ] Update `getNextConcept()` to filter by max attempts
- [ ] Add exit condition when all concepts exhausted/max attempts
- [ ] Update `completeConcept()` to track attempts
- [ ] Add intervention modal for max attempts reached
- [ ] Test: Loop exits after all concepts attempted 3x
- [ ] Test: User can't get stuck in infinite loop
- [ ] Test: Intervention shows after 2 failures

**Acceptance Criteria:**
- Loop always exits eventually (no infinite loops)
- Users get help after struggling (2+ failures)
- Clear feedback when max attempts reached
- Option to skip or get prerequisite help

---

## 🟡 HIGH PRIORITY (Should Fix) - 19 hours

### 4. Add Tab Navigation Guards (3 hours)
**File:** `src/pages/Study.tsx:120-130`

- [ ] Add prerequisite validation to `handleTabChange`
- [ ] Check `session?.metadata?.scouted` before allowing 'learn' tab
- [ ] Check `studySession` exists before allowing 'learn' tab
- [ ] Add toast notifications for blocked navigation
- [ ] Add URL guard in useEffect for direct navigation
- [ ] Redirect to 'overview' if prerequisites not met
- [ ] Test: Can't manually switch to 'learn' without completing overview
- [ ] Test: Direct URL `/study/:id?tab=learn` redirects if not ready
- [ ] Test: Toast shows helpful message

**Acceptance Criteria:**
- Users can't bypass learning flow
- Clear feedback when navigation blocked
- URL always reflects valid state

---

### 5. Add Generation Cancellation UI (8 hours)
**Files:** `src/pages/Generate.tsx`, `src/lib/generation/backend-generator.ts`

#### Frontend (4 hours)
- [ ] Add `abortController` state to Generate.tsx
- [ ] Create AbortController on generation start
- [ ] Add "Cancel Generation" button to UI
- [ ] Implement `handleCancel()` function
- [ ] Call `generationApi.cancel(jobId)` on cancel
- [ ] Call `abortController.abort()` on cancel
- [ ] Clear active job on cancel
- [ ] Show toast confirmation on cancel
- [ ] Test: Cancel button appears during generation
- [ ] Test: Cancel stops polling and clears state

#### Backend Integration (4 hours)
- [ ] Update `generateWithBackend()` to accept abortSignal
- [ ] Check `abortSignal?.aborted` in polling loop
- [ ] Call backend cancel endpoint on abort
- [ ] Handle cancellation errors gracefully
- [ ] Update UI to show "Cancelled" state
- [ ] Test: Backend receives cancel request
- [ ] Test: Polling stops immediately
- [ ] Test: User can start new generation after cancel

**Acceptance Criteria:**
- Cancel button visible during generation
- Generation stops within 2 seconds of cancel
- Backend resources cleaned up
- User can immediately start new generation

---

### 6. Persist Loop Progress Continuously (5 hours)
**Files:** `src/store/learning-store.ts`, `src/lib/storage/local-storage.ts`

- [ ] Add `saveSessionProgress()` to storage manager
- [ ] Add `loadSessionProgress()` to storage manager
- [ ] Call save after every `completeConcept()`
- [ ] Save current phase, active concept, timestamp
- [ ] Add resume logic on VelocityLearning mount
- [ ] Check if saved progress < 24 hours old
- [ ] Restore session state from saved progress
- [ ] Show toast "Resumed from where you left off"
- [ ] Test: Browser refresh preserves progress
- [ ] Test: Close tab and reopen resumes correctly
- [ ] Test: Old progress (>24h) is ignored

**Acceptance Criteria:**
- No progress lost on refresh/close
- Resume works within 24 hours
- Clear feedback when resuming
- Old sessions don't interfere

---

### 7. Handle Score Edge Cases (2 hours)
**Files:** `src/components/learning/MicroLearningLoopController.tsx`, `src/store/learning-store.ts`

- [ ] Create `normalizeScore()` utility function
- [ ] Handle null/undefined/NaN scores (default to 0)
- [ ] Clamp scores to [0, 1] range
- [ ] Add explicit boundary handling (>= 0.8, >= 0.4, < 0.4)
- [ ] Update `determineStatus()` with normalized scores
- [ ] Add logging for invalid scores
- [ ] Test: Score = 0.4 goes to 'needs-review'
- [ ] Test: Score = 0.8 goes to 'mastered' (if verified)
- [ ] Test: Score = null defaults to 0
- [ ] Test: Score = NaN defaults to 0

**Acceptance Criteria:**
- All edge cases handled explicitly
- No crashes on invalid scores
- Predictable behavior at boundaries
- Logging for debugging

---

### 8. Better Empty Generation Messaging (1 hour)
**File:** `src/lib/generation/backend-generator.ts:200-220`

- [ ] Add check for `allConcepts.length === 0`
- [ ] Throw helpful error with 3 possible causes
- [ ] Suggest specific actions for each cause
- [ ] Add retry guidance
- [ ] Test: Empty generation shows helpful message
- [ ] Test: Error includes actionable steps

**Acceptance Criteria:**
- Clear explanation of why generation failed
- Specific suggestions for fixing
- User knows what to do next

---

## ⚠️ ARCHITECTURAL DEFINITIONS (Before Implementation) - 8 hours

### 9. Define State Schema (4 hours)
**File:** `docs/STATE_SCHEMA.md`

- [ ] Document `SavedResult` interface
- [ ] Document `StudySession` interface
- [ ] Document `ConceptProgress` interface
- [ ] Define all metadata flags
- [ ] Define versioning strategy
- [ ] Add TypeScript interfaces to codebase
- [ ] Update existing code to match schema

---

### 10. Fix MASTER Phase Prerequisites (1 hour)
**Files:** `src/store/learning-store.ts`, `src/hooks/useLearningFlow.ts`

- [ ] Add `mapReconstructed` flag to metadata
- [ ] Update `markSessionMapBuilt()` to set both flags
- [ ] Update MASTER phase condition to check correct flag
- [ ] Test: MASTER phase triggers after BUILD complete
- [ ] Test: MASTER phase doesn't trigger prematurely

---

### 11. Add Route Protection (3 hours)
**Files:** `src/App.tsx`, `src/components/routing/ValidateSession.tsx`

- [ ] Create `ValidateSession` wrapper component
- [ ] Check if session exists before rendering Study
- [ ] Handle malformed URLs gracefully
- [ ] Add loading state during validation
- [ ] Redirect to home if session not found
- [ ] Test: Invalid URL redirects to home
- [ ] Test: Valid URL renders Study page
- [ ] Test: Loading state shows during validation

---

## 📋 NICE TO HAVE (Defer to v1.1) - 40+ hours

### 12. Multi-Device Sync (20+ hours)
- Backend sync service
- Conflict resolution
- Real-time updates

### 13. Session Timeout Logic (3 hours)
- Idle timeout detection
- Auto-save before timeout
- Resume prompt

### 14. Analytics Integration (8 hours)
- Event tracking
- User flow analysis
- Performance monitoring

### 15. Offline Mode (40+ hours)
- Service worker
- Offline storage
- Sync on reconnect

---

## 🧪 Testing Checklist

### Critical Path Testing
- [ ] New user can complete full learning flow
- [ ] Existing user can resume session
- [ ] Browser refresh doesn't lose progress
- [ ] Invalid URLs show helpful errors
- [ ] Generation can be cancelled
- [ ] Loop exits after max attempts
- [ ] Tab navigation enforces prerequisites

### Edge Case Testing
- [ ] Empty generation handled
- [ ] Score boundaries work correctly
- [ ] Null/undefined scores handled
- [ ] Multiple browser tabs (single session)
- [ ] Very slow network
- [ ] Backend timeout
- [ ] Storage quota exceeded

### User Experience Testing
- [ ] Error messages are helpful
- [ ] Loading states are clear
- [ ] Success feedback is satisfying
- [ ] Navigation is intuitive
- [ ] No dead ends or confusion

---

## 📊 Progress Tracking

**Critical Blockers:** 3/3 complete (100%) ✅  
**High Priority:** 4/5 complete (80%) 🟢  
**Architectural:** 0/3 complete (0%)

**Overall MVP Readiness:** 64% (7/11 critical items complete)

---

## 🎯 Sprint Planning

### Sprint 1 (Week 1) - Critical Blockers
- Day 1-2: COMPLETE phase fix + Storage hydration (5h)
- Day 3-4: Concept loop max attempts (4h)
- Day 5: Testing and bug fixes

### Sprint 2 (Week 2) - High Priority
- Day 1-2: Tab guards + Score edge cases (5h)
- Day 3-4: Progress persistence (5h)
- Day 5: Generation cancellation (8h)

### Sprint 3 (Week 3) - Polish & Launch
- Day 1-2: Architectural definitions (8h)
- Day 3-4: Testing and bug fixes
- Day 5: Soft launch to limited users

---

## ✅ Definition of Done

For each item:
- [ ] Code implemented and reviewed
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] No new console errors/warnings
- [ ] Performance acceptable (<100ms interactions)
- [ ] Accessibility checked (keyboard nav, screen reader)

---

## 🚀 Launch Criteria

Before MVP launch, ALL of these must be true:
- [ ] All 3 critical blockers fixed
- [ ] At least 4/5 high-priority items fixed
- [ ] State schema documented
- [ ] Critical path testing 100% pass
- [ ] No P0/P1 bugs in backlog
- [ ] Performance benchmarks met
- [ ] Error monitoring configured
- [ ] Rollback plan documented

---

**Last Updated:** January 28, 2026  
**Next Review:** After Sprint 1 completion
