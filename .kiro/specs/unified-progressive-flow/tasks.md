# Unified Progressive Learning Flow - Implementation Tasks

## Overview
This document breaks down the implementation into concrete, actionable tasks organized by implementation phase.

---

## Phase 1: Foundation (Week 1)

### Task 1.1: Update Type Definitions
**File:** `src/shared/types/learning.ts`
**Estimated Time:** 2 hours

- [ ] Add `PhaseProgress` interface
- [ ] Add `PhaseAdaptations` interface  
- [ ] Add new adaptation mode types (`OrientMode`, `StructureMode`, `EncodeMode`, `VerifyMode`)
- [ ] Update `LearningPhase` type to new values
- [ ] Update `StudySession` interface with new fields
- [ ] Mark deprecated fields with JSDoc comments
- [ ] Run TypeScript compiler to check for errors

**Acceptance Criteria:**
- All new types compile without errors
- Deprecated fields marked clearly
- No breaking changes to existing code

### Task 1.2: Implement Migration Function
**File:** `src/features/unified-flow/utils/migration.ts` (new)
**Estimated Time:** 4 hours

- [ ] Create `migrateSessionToUnifiedFlow()` function
- [ ] Implement old flag → new flag mapping logic
- [ ] Implement adaptation inference logic
- [ ] Create `validateMigration()` function
- [ ] Add comprehensive error handling
- [ ] Add logging for migration process

**Acceptance Criteria:**
- Function handles all old session formats
- No data loss during migration
- Validation catches any issues
- Clear logs for debugging

### Task 1.3: Write Migration Tests
**File:** `src/features/unified-flow/utils/migration.test.ts` (new)
**Estimated Time:** 3 hours

- [ ] Test migration with scouted + previewed session
- [ ] Test migration with overviewViewed session
- [ ] Test migration with mapBuilt session
- [ ] Test migration with completed concepts
- [ ] Test migration with mastered session
- [ ] Test migration with empty session
- [ ] Test validation function
- [ ] Test edge cases

**Acceptance Criteria:**
- All test cases pass
- 100% code coverage for migration logic
- Edge cases handled correctly

### Task 1.4: Add Migration Hook
**File:** `src/App.tsx`
**Estimated Time:** 1 hour

- [ ] Create `useMigration` hook
- [ ] Run migration on app mount
- [ ] Add loading state during migration
- [ ] Log migration results
- [ ] Handle migration errors gracefully

**Acceptance Criteria:**
- Migration runs automatically on app load
- User sees loading indicator if needed
- Errors don't crash the app
- Migration only runs once per session

---

## Phase 2: Phase Adapter System (Week 2)

### Task 2.1: Create Phase Adapter Hook
**File:** `src/shared/hooks/usePhaseAdapter.ts` (new)
**Estimated Time:** 6 hours


- [ ] Define `PhaseAdapter` interface
- [ ] Define `PhaseComponentProps` interface
- [ ] Implement `usePhaseAdapter()` main function
- [ ] Implement `getOrientAdapter()` function
- [ ] Implement `getStructureAdapter()` function
- [ ] Implement `getEncodeAdapter()` function
- [ ] Implement `getVerifyAdapter()` function
- [ ] Add completion handlers for each adapter
- [ ] Add TypeScript types for all functions

**Acceptance Criteria:**
- All adapters return correct components
- Completion handlers update correct flags
- Type safety enforced throughout
- No runtime errors

### Task 2.2: Refactor useLearningFlow
**File:** `src/shared/hooks/useLearningFlow.ts`
**Estimated Time:** 4 hours

- [ ] Update phase determination logic to use `phaseProgress`
- [ ] Remove old phase logic (SCOUT, PREVIEW, etc.)
- [ ] Update phase transition conditions
- [ ] Remove goal-based phase skipping
- [ ] Add mood-based adapter selection
- [ ] Update `completedPhases` calculation
- [ ] Test all phase transitions

**Acceptance Criteria:**
- Phase determination uses new flags
- No phases skipped based on mood alone
- All transitions work correctly
- Backward compatible during migration

### Task 2.3: Update Store Actions
**File:** `src/store/slices/createStudySlice.ts`
**Estimated Time:** 3 hours

- [ ] Add `updateSession()` action
- [ ] Add `completePhase()` helper action
- [ ] Update `startSession()` to initialize new fields
- [ ] Add `setAdaptation()` action
- [ ] Update session persistence logic
- [ ] Add validation for session updates

**Acceptance Criteria:**
- All new actions work correctly
- Session updates persist properly
- No race conditions
- Type-safe action signatures

### Task 2.4: Write Adapter Tests
**File:** `src/shared/hooks/usePhaseAdapter.test.ts` (new)
**Estimated Time:** 4 hours

- [ ] Test ORIENT adapters for all moods
- [ ] Test STRUCTURE adapters for all moods
- [ ] Test ENCODE adapters for all moods
- [ ] Test VERIFY adapters for all moods
- [ ] Test completion handlers
- [ ] Test adapter selection logic
- [ ] Test edge cases

**Acceptance Criteria:**
- All adapter tests pass
- Coverage ≥90%
- All mood combinations tested
- Completion handlers verified

---

## Phase 3: ORIENT Components (Week 3)

### Task 3.1: Build PriorKnowledgeActivation Component
**File:** `src/features/unified-flow/components/orient/PriorKnowledgeActivation.tsx` (new)
**Estimated Time:** 6 hours

- [ ] Create component structure
- [ ] Add retrieval cue prompts
- [ ] Add textarea for responses
- [ ] Implement response state management
- [ ] Add completion button
- [ ] Add styling (minimal, clean)
- [ ] Add accessibility attributes
- [ ] Test component

**Acceptance Criteria:**
- Component renders correctly
- User can enter responses
- Completion triggers correct handler
- Accessible to screen readers
- Responsive design

### Task 3.2: Build PredictionSkeleton Component
**File:** `src/features/unified-flow/components/orient/PredictionSkeleton.tsx` (new)
**Estimated Time:** 6 hours

- [ ] Create component structure
- [ ] Display concept structure
- [ ] Add prediction dropdowns
- [ ] Implement prediction state management
- [ ] Add completion button
- [ ] Add styling
- [ ] Add accessibility attributes
- [ ] Test component

**Acceptance Criteria:**
- Component renders correctly
- User can make predictions
- Completion triggers correct handler
- Accessible and responsive

### Task 3.3: Build GenerativeOrienting Component
**File:** `src/features/unified-flow/components/orient/GenerativeOrienting.tsx` (new)
**Estimated Time:** 8 hours

- [ ] Create component structure
- [ ] Add tab navigation (Scout, Predict, Question)
- [ ] Implement Scout tab with note-taking
- [ ] Implement Predict tab with predictions
- [ ] Implement Question tab with question generator
- [ ] Add state management for all tabs
- [ ] Add completion button
- [ ] Add styling
- [ ] Add accessibility attributes
- [ ] Test component

**Acceptance Criteria:**
- All tabs work correctly
- User can navigate between tabs
- All inputs save correctly
- Completion triggers correct handler
- Accessible and responsive

### Task 3.4: Add ORIENT Styling
**File:** `src/features/unified-flow/components/orient/Orient.module.css` (new)
**Estimated Time:** 2 hours

- [ ] Create shared styles for ORIENT components
- [ ] Add responsive breakpoints
- [ ] Add focus states
- [ ] Add hover states
- [ ] Test on different screen sizes

**Acceptance Criteria:**
- Consistent styling across variants
- Responsive on mobile and desktop
- Accessible focus indicators
- Smooth transitions

---

## Phase 4: STRUCTURE Components (Week 4)

### Task 4.1: Build AnnotatableMap Component
**File:** `src/features/unified-flow/components/structure/AnnotatableMap.tsx` (new)
**Estimated Time:** 8 hours

- [ ] Create component structure
- [ ] Integrate concept map visualization
- [ ] Add highlight functionality
- [ ] Add annotation panel
- [ ] Implement annotation state management
- [ ] Add completion button (requires highlights)
- [ ] Add styling
- [ ] Add accessibility attributes
- [ ] Test component

**Acceptance Criteria:**
- Pre-built map displays correctly
- User can highlight nodes
- User can add annotations
- Completion requires engagement
- Accessible and responsive

### Task 4.2: Build GuidedMapBuilder Component
**File:** `src/features/unified-flow/components/structure/GuidedMapBuilder.tsx` (new)
**Estimated Time:** 8 hours

- [ ] Create component structure
- [ ] Add hint toggle button
- [ ] Integrate map builder interface
- [ ] Implement hint system
- [ ] Add connection validation
- [ ] Add completion button (requires minimum connections)
- [ ] Add styling
- [ ] Add accessibility attributes
- [ ] Test component

**Acceptance Criteria:**
- User can build map with guidance
- Hints toggle correctly
- Validation works
- Completion requires sufficient connections
- Accessible and responsive

### Task 4.3: Verify ConceptMapBuilder Component
**File:** `src/components/learning/map/ConceptMapBuilder.tsx` (existing)
**Estimated Time:** 2 hours

- [ ] Review existing component
- [ ] Ensure compatibility with new flow
- [ ] Update props if needed
- [ ] Test integration
- [ ] Update documentation

**Acceptance Criteria:**
- Existing component works with new flow
- No breaking changes
- Props match new interface

### Task 4.4: Add STRUCTURE Styling
**File:** `src/features/unified-flow/components/structure/Structure.module.css` (new)
**Estimated Time:** 2 hours

- [ ] Create shared styles for STRUCTURE components
- [ ] Add map visualization styles
- [ ] Add responsive breakpoints
- [ ] Test on different screen sizes

**Acceptance Criteria:**
- Consistent styling across variants
- Map is readable and interactive
- Responsive design

---

## Phase 5: ENCODE Components (Week 5)

### Task 5.1: Build RetrievalPractice Component
**File:** `src/features/unified-flow/components/encode/RetrievalPractice.tsx` (new)
**Estimated Time:** 8 hours

- [ ] Create component structure
- [ ] Implement spaced repetition algorithm
- [ ] Add retrieval prompt interface
- [ ] Add response textarea
- [ ] Implement navigation between concepts
- [ ] Add progress indicator
- [ ] Add completion logic
- [ ] Add styling
- [ ] Add accessibility attributes
- [ ] Test component

**Acceptance Criteria:**
- Spaced repetition works correctly
- User can retrieve without seeing content
- Navigation works smoothly
- Progress tracked accurately
- Accessible and responsive

### Task 5.2: Build MinimalInterferenceEncoding Component
**File:** `src/features/unified-flow/components/encode/MinimalInterferenceEncoding.tsx` (new)
**Estimated Time:** 6 hours

- [ ] Create component structure
- [ ] Display one concept at a time
- [ ] Show minimal content (hook, why, metaphor)
- [ ] Add simple recognition check
- [ ] Implement navigation
- [ ] Add progress indicator
- [ ] Add styling (minimal, clean)
- [ ] Add accessibility attributes
- [ ] Test component

**Acceptance Criteria:**
- One concept shown at a time
- Minimal visual noise
- Simple interaction
- Progress tracked
- Accessible and responsive

### Task 5.3: Build StandardAcquisition Component
**File:** `src/features/unified-flow/components/encode/StandardAcquisition.tsx` (new)
**Estimated Time:** 4 hours

- [ ] Create wrapper for MicroLearningLoop
- [ ] Set difficulty to "standard"
- [ ] Add elaboration prompts
- [ ] Integrate with existing loop
- [ ] Test integration

**Acceptance Criteria:**
- Reuses existing MicroLearningLoop
- Standard difficulty applied
- Elaboration prompts work
- Integration seamless

### Task 5.4: Build InterleavedAcquisition Component
**File:** `src/features/unified-flow/components/encode/InterleavedAcquisition.tsx` (new)
**Estimated Time:** 6 hours

- [ ] Create component structure
- [ ] Implement interleaving algorithm
- [ ] Shuffle concepts across lifecycle phases
- [ ] Integrate with MicroLearningLoop
- [ ] Add interleave indicator
- [ ] Test interleaving logic

**Acceptance Criteria:**
- Concepts interleaved correctly
- User sees mixed categories
- Indicator shows interleaving
- Integration works

### Task 5.5: Add ENCODE Styling
**File:** `src/features/unified-flow/components/encode/Encode.module.css` (new)
**Estimated Time:** 2 hours

- [ ] Create shared styles for ENCODE components
- [ ] Add progress indicator styles
- [ ] Add responsive breakpoints
- [ ] Test on different screen sizes

**Acceptance Criteria:**
- Consistent styling across variants
- Clear progress indication
- Responsive design

---

## Phase 6: VERIFY Components (Week 6)

### Task 6.1: Build Question Generators
**File:** `src/features/unified-flow/utils/question-generators.ts` (new)
**Estimated Time:** 6 hours

- [ ] Implement `generateRecognitionQuestions()`
- [ ] Implement `generateCuedRecallQuestions()`
- [ ] Implement `generateTransferChallenges()`
- [ ] Add question templates
- [ ] Add distractor generation for multiple choice
- [ ] Test all generators

**Acceptance Criteria:**
- Questions generated from concepts
- Recognition questions have good distractors
- Cued recall has appropriate hints
- Transfer challenges test application
- All generators tested

### Task 6.2: Build RecognitionTasks Component
**File:** `src/features/unified-flow/components/verify/RecognitionTasks.tsx` (new)
**Estimated Time:** 6 hours

- [ ] Create component structure
- [ ] Display multiple choice questions
- [ ] Implement option selection
- [ ] Add immediate feedback
- [ ] Implement navigation
- [ ] Add progress indicator
- [ ] Add styling
- [ ] Add accessibility attributes
- [ ] Test component

**Acceptance Criteria:**
- Questions display correctly
- User can select options
- Feedback is immediate
- Navigation works
- Accessible and responsive

### Task 6.3: Build CuedRecall Component
**File:** `src/features/unified-flow/components/verify/CuedRecall.tsx` (new)
**Estimated Time:** 6 hours

- [ ] Create component structure
- [ ] Display recall cues
- [ ] Add response textarea
- [ ] Add hint toggle button
- [ ] Implement hint display
- [ ] Implement navigation
- [ ] Add progress indicator
- [ ] Add styling
- [ ] Add accessibility attributes
- [ ] Test component

**Acceptance Criteria:**
- Cues display correctly
- User can enter responses
- Hints toggle correctly
- Navigation works
- Accessible and responsive

### Task 6.4: Build FreeRecallTransfer Component
**File:** `src/features/unified-flow/components/verify/FreeRecallTransfer.tsx` (new)
**Estimated Time:** 8 hours

- [ ] Create component structure
- [ ] Display transfer scenarios
- [ ] Add response textarea (larger)
- [ ] Display requirements checklist
- [ ] Implement navigation
- [ ] Add progress indicator
- [ ] Add minimum length validation
- [ ] Add styling
- [ ] Add accessibility attributes
- [ ] Test component

**Acceptance Criteria:**
- Scenarios display correctly
- User can write detailed responses
- Requirements shown clearly
- Validation works
- Accessible and responsive

### Task 6.5: Add VERIFY Styling
**File:** `src/features/unified-flow/components/verify/Verify.module.css` (new)
**Estimated Time:** 2 hours

- [ ] Create shared styles for VERIFY components
- [ ] Add question card styles
- [ ] Add feedback styles
- [ ] Add responsive breakpoints
- [ ] Test on different screen sizes

**Acceptance Criteria:**
- Consistent styling across variants
- Clear question presentation
- Responsive design

---

## Phase 7: COMPLETE & Integration (Week 7)

### Task 7.1: Build SessionComplete Component
**File:** `src/features/unified-flow/components/complete/SessionComplete.tsx` (new)
**Estimated Time:** 6 hours

- [ ] Create component structure
- [ ] Add celebration section
- [ ] Add session summary
- [ ] Add consolidation priming message
- [ ] Add sleep tip
- [ ] Add next session preview
- [ ] Implement `getMethodDescription()` helper
- [ ] Implement `getNextSessionPreview()` helper
- [ ] Add styling
- [ ] Add accessibility attributes
- [ ] Test component

**Acceptance Criteria:**
- Summary shows correct data
- Consolidation message displays
- Next session preview accurate
- Accessible and responsive

### Task 7.2: Build PhaseIndicator Component
**File:** `src/features/unified-flow/components/shared/PhaseIndicator.tsx` (new)
**Estimated Time:** 4 hours

- [ ] Create component structure
- [ ] Display all phases
- [ ] Show completed state
- [ ] Show current state
- [ ] Show upcoming state
- [ ] Add phase labels
- [ ] Add styling with states
- [ ] Add accessibility attributes
- [ ] Test component

**Acceptance Criteria:**
- All phases displayed
- States visually distinct
- Labels clear
- Accessible and responsive

### Task 7.3: Update VelocityLearning Orchestrator
**File:** `src/pages/VelocityLearning.tsx`
**Estimated Time:** 6 hours

- [ ] Import new hooks and components
- [ ] Add `usePhaseAdapter` integration
- [ ] Implement `handlePhaseComplete` callback
- [ ] Implement `renderPhaseContent` function
- [ ] Add PhaseIndicator to layout
- [ ] Remove old phase rendering logic
- [ ] Add error boundaries
- [ ] Test all phase transitions

**Acceptance Criteria:**
- All phases render correctly
- Transitions work smoothly
- Progress updates correctly
- Error handling works
- No console errors

### Task 7.4: Integration Testing
**File:** `src/features/unified-flow/integration.test.tsx` (new)
**Estimated Time:** 8 hours

- [ ] Test complete tired user flow
- [ ] Test complete medium energy flow
- [ ] Test complete high energy flow
- [ ] Test tired → pumped transition
- [ ] Test pumped → tired transition
- [ ] Test session resumption
- [ ] Test progress persistence
- [ ] Test all edge cases

**Acceptance Criteria:**
- All user journeys work end-to-end
- Transitions preserve progress
- No data loss
- All edge cases handled

---

## Phase 8: Polish & Cleanup (Week 8)

### Task 8.1: Add Animations
**File:** Various component files
**Estimated Time:** 4 hours

- [ ] Add phase transition animations
- [ ] Add component enter/exit animations
- [ ] Add progress indicator animations
- [ ] Add button hover/click animations
- [ ] Test performance impact

**Acceptance Criteria:**
- Smooth transitions
- No jank or lag
- Animations enhance UX
- Performance acceptable

### Task 8.2: Remove Deprecated Code
**File:** Various files
**Estimated Time:** 4 hours

- [ ] Remove old phase types from `learning.ts`
- [ ] Remove old completion flags from `StudySession`
- [ ] Remove old phase logic from `useLearningFlow`
- [ ] Remove migration code (after 30 days)
- [ ] Update all imports
- [ ] Run full test suite

**Acceptance Criteria:**
- No deprecated code remains
- All tests pass
- No TypeScript errors
- No runtime errors

### Task 8.3: User Testing
**Estimated Time:** 8 hours (spread over week)

- [ ] Recruit 10 beta testers
- [ ] Provide testing instructions
- [ ] Collect feedback via survey
- [ ] Conduct user interviews
- [ ] Analyze feedback
- [ ] Prioritize improvements

**Acceptance Criteria:**
- At least 10 users tested
- Feedback collected and analyzed
- User satisfaction ≥4.5/5
- Critical issues identified

### Task 8.4: Documentation
**File:** Various documentation files
**Estimated Time:** 4 hours

- [ ] Update README with new flow
- [ ] Add developer documentation
- [ ] Add user guide
- [ ] Update API documentation
- [ ] Add troubleshooting guide

**Acceptance Criteria:**
- All documentation updated
- Clear and comprehensive
- Examples provided
- Easy to understand

### Task 8.5: Performance Optimization
**File:** Various component files
**Estimated Time:** 4 hours

- [ ] Add memoization where needed
- [ ] Implement lazy loading
- [ ] Optimize re-renders
- [ ] Profile performance
- [ ] Fix any bottlenecks

**Acceptance Criteria:**
- Phase determination <50ms
- Component load <100ms
- No unnecessary re-renders
- Memory usage acceptable

---

## Summary

**Total Estimated Time:** 8 weeks (40 hours/week = 320 hours)

**Task Breakdown:**
- Phase 1: 10 hours
- Phase 2: 17 hours
- Phase 3: 22 hours
- Phase 4: 20 hours
- Phase 5: 26 hours
- Phase 6: 28 hours
- Phase 7: 24 hours
- Phase 8: 24 hours

**Critical Path:**
1. Foundation (types, migration) → Phase Adapter → Components → Integration

**Dependencies:**
- All components depend on Phase Adapter system
- Integration depends on all components
- Polish depends on integration

**Risk Areas:**
- Migration complexity (Phase 1)
- Adapter system correctness (Phase 2)
- Component integration (Phase 7)
- User acceptance (Phase 8)

**Mitigation:**
- Comprehensive testing at each phase
- Feature flag for gradual rollout
- User feedback loops
- Performance monitoring
