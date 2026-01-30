# Implementation Plan: Content Generation Prompt Rebuild

## Overview

This plan implements a multi-phase prompt architecture to replace the current monolithic 4000-line prompt. The implementation focuses on preventing hallucination (compound words, circular definitions) while generating minimal, accurate content aligned with the 4 main features' needs.

## Tasks

- [x] 1. Create Phase 1 prompt (Domain Analysis)
  - Create new file: `backend/src/shared/lib/prompts/phase1-domain-analysis.ts`
  - Write focused prompt that generates only concept names, tiers, and dependencies
  - Include explicit anti-hallucination rules
  - Export `PHASE1_PROMPT` constant
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 1.1 Write property test for Phase 1 concept count
  - **Property 4: Phase 1 Concept Count**
  - **Validates: Requirements 2.1**

- [ ] 1.2 Write property test for single tier classification
  - **Property 5: Single Tier Classification**
  - **Validates: Requirements 2.2**

- [ ] 1.3 Write property test for valid dependency references
  - **Property 6: Valid Dependency References**
  - **Validates: Requirements 2.3**

- [ ] 1.4 Write property test for Phase 1 content minimalism
  - **Property 7: Phase 1 Content Minimalism**
  - **Validates: Requirements 2.4**

- [x] 2. Create Phase 2 prompt (Content Generation)
  - Create new file: `backend/src/shared/lib/prompts/phase2-content-generation.ts`
  - Write focused prompt for SHAPE framework, lifecycle phases, mnemonics
  - Include explicit examples of good vs bad anchors
  - Include circular definition prevention rules
  - Export `PHASE2_PROMPT` constant
  - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [ ] 2.1 Write property test for SHAPE framework completeness
  - **Property 9: SHAPE Framework Completeness**
  - **Validates: Requirements 3.2**

- [ ] 2.2 Write property test for lifecycle phase completeness
  - **Property 10: Lifecycle Phase Completeness**
  - **Validates: Requirements 3.3**

- [ ] 2.3 Write property test for no compound word anchors
  - **Property 11: No Compound Word Anchors**
  - **Validates: Requirements 3.4, 4.2**

- [ ] 2.4 Write property test for no circular definitions
  - **Property 12: No Circular Definitions**
  - **Validates: Requirements 3.5, 5.1, 5.3**

- [x] 3. Create Phase 3 prompt (Validation)
  - Create new file: `backend/src/shared/lib/prompts/phase3-validation.ts`
  - Write focused prompt for validation checks
  - Include confusion pair detection logic
  - Export `PHASE3_PROMPT` constant
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 3.1 Write property test for required field validation
  - **Property 18: Required Field Validation**
  - **Validates: Requirements 6.1**

- [ ] 3.2 Write property test for circular definition detection
  - **Property 19: Circular Definition Detection**
  - **Validates: Requirements 6.2**

- [ ] 3.3 Write property test for compound word detection
  - **Property 20: Compound Word Detection**
  - **Validates: Requirements 6.3**

- [x] 4. Implement validation utilities
  - Create new file: `backend/src/shared/lib/validation/content-validators.ts`
  - Implement `hasCircularDefinition(conceptName, text)` function
  - Implement `isCompoundWord(anchor)` function
  - Implement `hasCycle(concepts)` function for dependency graphs
  - Implement `validateDependencies(concepts)` function
  - Export all validation functions
  - _Requirements: 5.1, 5.3, 5.4, 8.1_

- [x] 4.1 Write unit tests for circular definition detection
  - Test: detects concept name in definition
  - Test: detects "X is X" pattern
  - Test: allows valid definition
  - _Requirements: 5.1_

- [x] 4.2 Write unit tests for compound word detection
  - Test: detects "X X+" pattern
  - Test: detects "X (X + Y)" pattern
  - Test: allows valid anchor
  - _Requirements: 3.4_

- [x] 4.3 Write unit tests for dependency cycle detection
  - Test: detects simple cycle (A→B→C→A)
  - Test: allows acyclic graph
  - Test: detects self-loop
  - _Requirements: 8.1_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement multi-phase orchestrator
  - Create new file: `backend/src/shared/lib/generation/multi-phase-orchestrator.ts`
  - Implement `executePhase1(input)` function
  - Implement `executePhase2(phase1Output)` function
  - Implement `executePhase3(phase2Output)` function
  - Implement phase data flow (Phase 1 → Phase 2 → Phase 3)
  - Implement validation before progression
  - Export orchestrator functions
  - _Requirements: 1.2, 1.3, 1.4_

- [ ] 6.1 Write property test for phase data flow
  - **Property 1: Phase Data Flow**
  - **Validates: Requirements 1.2, 1.3**

- [ ] 6.2 Write property test for validation before progression
  - **Property 2: Validation Before Progression**
  - **Validates: Requirements 1.4**

- [x] 7. Implement error recovery system
  - Create new file: `backend/src/shared/lib/generation/error-recovery.ts`
  - Implement partial failure recovery (save completed concepts)
  - Implement retry logic for missing concepts
  - Implement validation failure recovery (regenerate specific fields)
  - Implement cycle breaking algorithm
  - Export recovery functions
  - _Requirements: 1.5, 12.1, 12.2, 12.3, 12.4, 8.5_

- [ ] 7.1 Write property test for isolated phase regeneration
  - **Property 3: Isolated Phase Regeneration**
  - **Validates: Requirements 1.5**

- [ ] 7.2 Write property test for partial completion saves
  - **Property 43: Partial Completion Saves**
  - **Validates: Requirements 12.1**

- [ ] 7.3 Write property test for retry targets missing concepts
  - **Property 44: Retry Targets Missing Concepts**
  - **Validates: Requirements 12.2**

- [ ] 8. Implement confusion pair detection
  - Create new file: `backend/src/shared/lib/generation/confusion-detector.ts`
  - Implement `detectConfusionPairs(concepts)` function
  - Calculate similarity scores between concept names
  - Generate distinction keys for each pair
  - Export confusion detection functions
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 8.1 Write property test for confusion pair count
  - **Property 31: Confusion Pair Count**
  - **Validates: Requirements 9.1**

- [ ] 8.2 Write property test for confusion pair distinction key
  - **Property 32: Confusion Pair Distinction Key**
  - **Validates: Requirements 9.2**

- [ ] 9. Implement practice question generation
  - Create new file: `backend/src/shared/lib/generation/question-generator.ts`
  - Implement `generatePracticeQuestions(concept)` function
  - Ensure 2-4 questions per concept
  - Ensure exactly 4 answer choices
  - Ensure exactly one correct answer
  - Generate explanations for all answers
  - Export question generation functions
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 9.1 Write property test for practice question count
  - **Property 36: Practice Question Count**
  - **Validates: Requirements 10.1**

- [ ] 9.2 Write property test for four answer choices
  - **Property 37: Four Answer Choices**
  - **Validates: Requirements 10.2**

- [ ] 9.3 Write property test for one correct answer
  - **Property 38: One Correct Answer**
  - **Validates: Requirements 10.3**

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Update backend API endpoint
  - Modify file: `backend/src/features/generation/routes/generate.ts`
  - Replace single-prompt call with multi-phase orchestrator
  - Add error recovery handling
  - Add cost estimation before execution
  - Update response format to include phase progress
  - _Requirements: 11.5_

- [ ] 11.1 Write property test for cost estimate provided
  - **Property 42: Cost Estimate Provided**
  - **Validates: Requirements 11.5**

- [ ] 12. Implement caching system
  - Create new file: `backend/src/shared/lib/caching/subject-cache.ts`
  - Implement cache for common subjects (AWS, Azure, Kubernetes)
  - Set 30-day TTL
  - Implement cache hit/miss tracking
  - Export caching functions
  - _Requirements: 11.2_

- [ ] 13. Update frontend generation UI
  - Modify file: `src/pages/Generate.tsx`
  - Add phase progress indicator (1/3, 2/3, 3/3)
  - Add cost estimate display before generation
  - Add partial failure recovery UI
  - Update polling to track phase progress
  - _Requirements: 12.5_

- [x] 14. Integration testing
  - Create new file: `backend/src/shared/lib/generation/__tests__/integration.test.ts`
  - Test complete generation flow (Phase 1 → 2 → 3 → Storage)
  - Test partial failure recovery
  - Test validation failure recovery
  - Test API rate limit handling
  - Test caching behavior
  - _Requirements: All_

- [ ] 15. Final checkpoint - Manual testing
  - Generate content for 5 different subjects
  - Verify no circular definitions
  - Verify no compound word anchors
  - Verify all mnemonic anchors are visual metaphors
  - Verify dependency graphs are acyclic
  - Verify confusion pairs make sense
  - Verify practice questions have 4 choices and explanations
  - Test partial failure recovery
  - Test validation failure recovery
  - Verify cost estimates are accurate (±10%)
  - Test caching (generate same subject twice)

## Notes

- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end flow
- Manual testing ensures production readiness
- All tests are required for comprehensive coverage
