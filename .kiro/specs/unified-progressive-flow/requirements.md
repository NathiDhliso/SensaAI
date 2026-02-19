# Unified Progressive Learning Flow - Requirements

## 1. Overview

### 1.1 Purpose
Transform the fragmented, mood-dependent learning flow into a unified progressive architecture where all users follow the same cognitive phases, with depth adapting to their current energy level rather than skipping entire phases.

### 1.2 Problem Statement
The current learning flow architecture has critical flaws:
- Low energy users skip ALL learning phases and "start over" when energized
- Progress is not preserved across mood changes
- Phase logic doesn't follow neuroscience principles (passive → active → mastery)
- Features are goal-dependent rather than mood-adaptive
- Users experience a "starting over" feeling when switching moods

### 1.3 Core Principle
**Same phases for everyone, depth adapts to mood.**

All users progress through the same cognitive phases (PRIME → ORIENT → STRUCTURE → ENCODE → VERIFY → COMPLETE), but the implementation of each phase adapts to their current energy level.

---

## 2. User Stories

### 2.1 Tired User Journey
**As a** tired learner  
**I want to** make meaningful progress through passive learning activities  
**So that** my effort accumulates and I don't feel like I'm starting over when I'm energized later

**Acceptance Criteria:**
- User can complete ORIENT phase through passive overview map (read-only)
- STRUCTURE phase is auto-completed (uses generated map)
- ENCODE phase shows spaced review if prior progress exists
- VERIFY phase is skipped (marked as "reviewed")
- Progress flags (`orientCompleted`, `structureCompleted`) are set
- When user returns energized, they skip already-completed phases

### 2.2 Energized User Journey
**As an** energized learner  
**I want to** engage in full interactive learning activities  
**So that** I can maximize my learning during high-energy periods

**Acceptance Criteria:**
- User completes ORIENT phase through full scout + preview with predictions
- User builds concept map in STRUCTURE phase
- User learns concepts through micro-learning loop in ENCODE phase
- User completes mastery challenge in VERIFY phase
- All progress is preserved if user becomes tired later
- User can continue from where they left off in any mood

### 2.3 Mood Transition Journey
**As a** learner who switches between energy levels  
**I want** my progress to be preserved across mood changes  
**So that** I don't lose my learning momentum

**Acceptance Criteria:**
- Phase completion flags persist across sessions
- Mood-specific adaptations are tracked separately
- User never repeats a completed phase
- Progress accumulates regardless of mood transitions
- System shows appropriate phase variant based on current mood
- User sees clear indication of what they've already completed

### 2.4 Medium Energy User Journey
**As a** learner with moderate energy  
**I want** a balanced learning experience between passive and intensive  
**So that** I can learn effectively without overwhelming myself

**Acceptance Criteria:**
- User completes ORIENT through interactive preview with guessing
- User builds map with guided hints in STRUCTURE phase
- User learns through standard micro-learning loop in ENCODE phase
- User completes light quiz (3-5 questions) in VERIFY phase
- Experience feels distinct from both tired and energized modes

---

## 3. Functional Requirements

### 3.1 Phase Architecture

#### 3.1.1 Universal Phase Progression
**REQ-3.1.1:** The system MUST implement exactly 6 phases in this order:
1. PRIME (Intent Setting)
2. ORIENT (Passive Exposure)
3. STRUCTURE (Schema Building)
4. ENCODE (Active Learning)
5. VERIFY (Mastery Check)
6. COMPLETE (Session End)

**REQ-3.1.2:** All users MUST progress through the same phases regardless of mood or goal.

**REQ-3.1.3:** The system MUST NOT skip phases based on mood; instead, it MUST adapt phase depth.

#### 3.1.2 Phase Completion Tracking
**REQ-3.1.4:** The system MUST track phase completion using a `phaseProgress` object with these flags:
- `orientCompleted: boolean`
- `structureCompleted: boolean`
- `encodeStarted: boolean`
- `verifyCompleted: boolean`

**REQ-3.1.5:** Phase completion flags MUST persist across sessions and mood changes.

**REQ-3.1.6:** The system MUST NOT reset phase completion when mood changes.

#### 3.1.3 Mood-Based Adaptation Tracking
**REQ-3.1.7:** The system MUST track which mood-variant was used for each phase in an `adaptations` object:
```typescript
adaptations: {
  orientMode: 'passive' | 'interactive' | 'full';
  structureMode: 'skip' | 'guided' | 'full';
  encodeMode: 'review' | 'standard' | 'diagnostic';
  verifyMode: 'skip' | 'light' | 'full';
}
```

**REQ-3.1.8:** Adaptation tracking MUST allow users to experience different variants of the same phase in different sessions.

### 3.2 ORIENT Phase (Passive Exposure)

#### 3.2.1 Low Energy Variant (Tired)
**REQ-3.2.1:** When mood is 'tired', ORIENT phase MUST display PassiveOverviewMap component.

**REQ-3.2.2:** PassiveOverviewMap MUST be read-only with no interactive elements.

**REQ-3.2.3:** PassiveOverviewMap MUST show all concepts in a visual hierarchy.

**REQ-3.2.4:** Completing PassiveOverviewMap MUST set `orientCompleted = true` and `adaptations.orientMode = 'passive'`.

#### 3.2.2 Medium Energy Variant (Okay/Struggling)
**REQ-3.2.5:** When mood is 'okay' or 'struggling', ORIENT phase MUST display InteractivePreview component.

**REQ-3.2.6:** InteractivePreview MUST allow users to make predictions about concepts.

**REQ-3.2.7:** InteractivePreview MUST provide hints and guidance.

**REQ-3.2.8:** Completing InteractivePreview MUST set `orientCompleted = true` and `adaptations.orientMode = 'interactive'`.

#### 3.2.3 High Energy Variant (Pumped/Good)
**REQ-3.2.9:** When mood is 'pumped' or 'good', ORIENT phase MUST display FullScoutPreview component.

**REQ-3.2.10:** FullScoutPreview MUST include both scout and preview sub-phases.

**REQ-3.2.11:** FullScoutPreview MUST allow detailed predictions and note-taking.

**REQ-3.2.12:** Completing FullScoutPreview MUST set `orientCompleted = true` and `adaptations.orientMode = 'full'`.

### 3.3 STRUCTURE Phase (Schema Building)

#### 3.3.1 Low Energy Variant (Tired)
**REQ-3.3.1:** When mood is 'tired', STRUCTURE phase MUST be auto-completed.

**REQ-3.3.2:** Auto-completion MUST use a pre-generated concept map.

**REQ-3.3.3:** Auto-completion MUST set `structureCompleted = true` and `adaptations.structureMode = 'skip'`.

**REQ-3.3.4:** Auto-completion MUST happen immediately without user interaction.

#### 3.3.2 Medium Energy Variant (Okay/Struggling)
**REQ-3.3.5:** When mood is 'okay' or 'struggling', STRUCTURE phase MUST display GuidedMapBuilder component.

**REQ-3.3.6:** GuidedMapBuilder MUST provide hints for concept relationships.

**REQ-3.3.7:** GuidedMapBuilder MUST allow partial user input with suggestions.

**REQ-3.3.8:** Completing GuidedMapBuilder MUST set `structureCompleted = true` and `adaptations.structureMode = 'guided'`.

#### 3.3.3 High Energy Variant (Pumped/Good)
**REQ-3.3.9:** When mood is 'pumped' or 'good', STRUCTURE phase MUST display ConceptMapBuilder component.

**REQ-3.3.10:** ConceptMapBuilder MUST require full user-driven map construction.

**REQ-3.3.11:** ConceptMapBuilder MUST NOT provide hints unless requested.

**REQ-3.3.12:** Completing ConceptMapBuilder MUST set `structureCompleted = true` and `adaptations.structureMode = 'full'`.

### 3.4 ENCODE Phase (Active Learning)

#### 3.4.1 Low Energy Variant (Tired)
**REQ-3.4.1:** When mood is 'tired' AND user has prior progress, ENCODE phase MUST show SpacedReview component.

**REQ-3.4.2:** When mood is 'tired' AND user has NO prior progress, ENCODE phase MUST be skipped.

**REQ-3.4.3:** SpacedReview MUST focus on previously learned concepts only.

**REQ-3.4.4:** SpacedReview MUST use minimal cognitive load interactions.

**REQ-3.4.5:** Starting SpacedReview MUST set `encodeStarted = true` and `adaptations.encodeMode = 'review'`.

#### 3.4.2 Medium Energy Variant (Okay/Struggling)
**REQ-3.4.6:** When mood is 'okay' or 'struggling', ENCODE phase MUST display MicroLearningLoop component.

**REQ-3.4.7:** MicroLearningLoop MUST use standard difficulty level.

**REQ-3.4.8:** MicroLearningLoop MUST NOT include diagnostic assessments.

**REQ-3.4.9:** Starting MicroLearningLoop MUST set `encodeStarted = true` and `adaptations.encodeMode = 'standard'`.

#### 3.4.3 High Energy Variant (Pumped/Good)
**REQ-3.4.10:** When mood is 'pumped' or 'good', ENCODE phase MUST display MicroLearningLoop with diagnostic option.

**REQ-3.4.11:** High energy ENCODE MUST allow optional diagnostic assessments.

**REQ-3.4.12:** Starting high energy ENCODE MUST set `encodeStarted = true` and `adaptations.encodeMode = 'diagnostic'`.

#### 3.4.4 Concept Completion
**REQ-3.4.13:** Completing a concept in ENCODE phase MUST add it to `completedConcepts` array.

**REQ-3.4.14:** Concept completion MUST persist across mood changes.

**REQ-3.4.15:** When all concepts are completed, system MUST transition to VERIFY phase.

### 3.5 VERIFY Phase (Mastery Check)

#### 3.5.1 Low Energy Variant (Tired)
**REQ-3.5.1:** When mood is 'tired', VERIFY phase MUST be auto-completed.

**REQ-3.5.2:** Auto-completion MUST mark concepts as "reviewed" rather than "mastered".

**REQ-3.5.3:** Auto-completion MUST set `verifyCompleted = true` and `adaptations.verifyMode = 'skip'`.

#### 3.5.2 Medium Energy Variant (Okay/Struggling)
**REQ-3.5.4:** When mood is 'okay' or 'struggling', VERIFY phase MUST display LightQuiz component.

**REQ-3.5.5:** LightQuiz MUST contain 3-5 questions.

**REQ-3.5.6:** LightQuiz MUST use multiple choice or simple recall format.

**REQ-3.5.7:** Completing LightQuiz MUST set `verifyCompleted = true` and `adaptations.verifyMode = 'light'`.

#### 3.5.3 High Energy Variant (Pumped/Good)
**REQ-3.5.8:** When mood is 'pumped' or 'good', VERIFY phase MUST display MasteryChallenge component.

**REQ-3.5.9:** MasteryChallenge MUST include comprehensive assessment.

**REQ-3.5.10:** MasteryChallenge MUST test application and synthesis.

**REQ-3.5.11:** Completing MasteryChallenge MUST set `verifyCompleted = true` and `adaptations.verifyMode = 'full'`.

### 3.6 Phase Progression Logic

#### 3.6.1 Phase Skipping
**REQ-3.6.1:** If a phase is already completed (`phaseProgress` flag is true), system MUST skip to next phase.

**REQ-3.6.2:** Phase skipping MUST happen automatically without user interaction.

**REQ-3.6.3:** System MUST show visual indication of skipped phases.

#### 3.6.2 Phase Transitions
**REQ-3.6.4:** Phase transitions MUST be sequential (no jumping ahead).

**REQ-3.6.5:** User MUST NOT be able to manually skip phases.

**REQ-3.6.6:** System MUST transition to next phase immediately after current phase completion.

#### 3.6.3 Session Resumption
**REQ-3.6.7:** When resuming a session, system MUST start at the first incomplete phase.

**REQ-3.6.8:** System MUST use current mood to determine phase variant.

**REQ-3.6.9:** System MUST NOT re-show completed phases unless explicitly requested.

---

## 4. Non-Functional Requirements

### 4.1 Performance
**REQ-4.1.1:** Phase determination logic MUST execute in <50ms.

**REQ-4.1.2:** Phase transitions MUST feel instantaneous (<100ms).

**REQ-4.1.3:** Progress persistence MUST not cause UI lag.

### 4.2 Data Integrity
**REQ-4.2.1:** Phase completion flags MUST be atomic (all-or-nothing updates).

**REQ-4.2.2:** System MUST handle concurrent session updates gracefully.

**REQ-4.2.3:** Progress data MUST be validated before persistence.

### 4.3 Backward Compatibility
**REQ-4.3.1:** System MUST migrate existing sessions to new format.

**REQ-4.3.2:** Migration MUST preserve all existing progress.

**REQ-4.3.3:** Old phase flags (`scouted`, `previewed`, `overviewViewed`, `mapBuilt`, `mastered`) MUST be converted to new format.

### 4.4 User Experience
**REQ-4.4.1:** Phase transitions MUST include smooth animations.

**REQ-4.4.2:** System MUST show clear progress indicators.

**REQ-4.4.3:** Users MUST understand which phase they're in and why.

**REQ-4.4.4:** System MUST provide feedback when phases are auto-completed.

---

## 5. Data Model Changes

### 5.1 StudySession Type Updates

#### 5.1.1 New Fields
**REQ-5.1.1:** Add `phaseProgress` object to `StudySession` type:
```typescript
phaseProgress: {
  orientCompleted: boolean;
  structureCompleted: boolean;
  encodeStarted: boolean;
  verifyCompleted: boolean;
}
```

**REQ-5.1.2:** Add `adaptations` object to `StudySession` type:
```typescript
adaptations: {
  orientMode: 'passive' | 'interactive' | 'full';
  structureMode: 'skip' | 'guided' | 'full';
  encodeMode: 'review' | 'standard' | 'diagnostic';
  verifyMode: 'skip' | 'light' | 'full';
}
```

#### 5.1.2 Deprecated Fields
**REQ-5.1.3:** Mark as deprecated (keep for migration):
- `scouted?: boolean`
- `previewed?: boolean`
- `overviewViewed?: boolean`
- `mapBuilt?: boolean`
- `mapReconstructed?: boolean`
- `mastered?: boolean`

### 5.2 LearningPhase Type Updates

#### 5.2.1 New Phase Types
**REQ-5.2.1:** Replace existing phase types with:
```typescript
export type LearningPhase =
  | 'IDLE'
  | 'PRIME'
  | 'ORIENT'
  | 'STRUCTURE'
  | 'ENCODE'
  | 'VERIFY'
  | 'COMPLETE';
```

#### 5.2.2 Removed Phase Types
**REQ-5.2.2:** Remove these phase types:
- `LOCK_IN`
- `SCOUT`
- `PREVIEW`
- `OVERVIEW_MAP`
- `BUILD`
- `DIAGNOSE`
- `LEARN`
- `REMEDIATE`
- `MASTER`

---

## 6. Migration Strategy

### 6.1 Data Migration
**REQ-6.1.1:** System MUST provide migration function to convert old sessions to new format.

**REQ-6.1.2:** Migration MUST map old flags to new `phaseProgress`:
- `scouted || previewed || overviewViewed` → `orientCompleted`
- `mapBuilt` → `structureCompleted`
- `completedConcepts.length > 0` → `encodeStarted`
- `mastered` → `verifyCompleted`

**REQ-6.1.3:** Migration MUST infer `adaptations` from old session data:
- If `overviewViewed` → `orientMode = 'passive'`
- If `scouted && previewed` → `orientMode = 'full'`
- If `mapBuilt` → `structureMode = 'full'`

### 6.2 Rollout Strategy
**REQ-6.2.1:** Migration MUST run automatically on first session load.

**REQ-6.2.2:** System MUST support both old and new formats during transition period.

**REQ-6.2.3:** Old format support MUST be removed after 30 days.

---

## 7. Success Criteria

### 7.1 Progress Preservation
**METRIC-7.1.1:** 100% of users retain progress across mood changes.

**METRIC-7.1.2:** 0% of users experience "starting over" feeling (measured by survey).

### 7.2 Phase Completion
**METRIC-7.2.1:** 100% of users complete ORIENT phase regardless of mood.

**METRIC-7.2.2:** Phase completion rates are similar across all moods (±10%).

### 7.3 Neuroscience Alignment
**METRIC-7.3.1:** 100% of users experience passive exposure before active learning.

**METRIC-7.3.2:** Phase sequence follows passive → active → mastery for all users.

### 7.4 User Satisfaction
**METRIC-7.4.1:** User satisfaction score ≥4.5/5 for flow coherence.

**METRIC-7.4.2:** Completion rate increases by ≥20% for tired users.

**METRIC-7.4.3:** Session resumption rate increases by ≥30%.

---

## 8. Out of Scope

### 8.1 Not Included in This Spec
- Content generation changes
- UI/UX redesign (beyond phase-specific components)
- Gamification features
- Social features
- Analytics dashboard
- Mobile app changes

### 8.2 Future Considerations
- Adaptive phase duration based on performance
- Personalized phase recommendations
- Cross-device session synchronization
- Advanced progress analytics

---

## 9. Dependencies

### 9.1 Technical Dependencies
- React 18+ (for useMemo, useCallback)
- Zustand store (for state management)
- TypeScript 5+ (for type safety)

### 9.2 Feature Dependencies
- Existing learning store (`useLearningStore`)
- Existing concept types (`LearningConcept`)
- Existing session types (`StudySession`)

### 9.3 Component Dependencies
- PassiveOverviewMap (low energy ORIENT)
- InteractivePreview (medium energy ORIENT)
- FullScoutPreview (high energy ORIENT)
- GuidedMapBuilder (medium energy STRUCTURE)
- ConceptMapBuilder (high energy STRUCTURE)
- SpacedReview (low energy ENCODE)
- MicroLearningLoop (standard ENCODE)
- LightQuiz (medium energy VERIFY)
- MasteryChallenge (high energy VERIFY)

---

## 10. Risks and Mitigations

### 10.1 Risk: Data Loss During Migration
**Mitigation:** 
- Implement comprehensive migration tests
- Keep old fields during transition period
- Provide rollback mechanism

### 10.2 Risk: User Confusion During Transition
**Mitigation:**
- Show clear onboarding for new flow
- Provide visual indicators of changes
- Offer help documentation

### 10.3 Risk: Performance Degradation
**Mitigation:**
- Optimize phase determination logic
- Use memoization for expensive calculations
- Monitor performance metrics

### 10.4 Risk: Incomplete Component Coverage
**Mitigation:**
- Implement fallback components
- Graceful degradation for missing variants
- Clear error messages

---

## 11. Testing Requirements

### 11.1 Unit Tests
**REQ-11.1.1:** Test phase determination logic for all mood combinations.

**REQ-11.1.2:** Test phase completion flag updates.

**REQ-11.1.3:** Test adaptation tracking.

**REQ-11.1.4:** Test migration function with various old session formats.

### 11.2 Integration Tests
**REQ-11.2.1:** Test complete flow for tired user (passive variants).

**REQ-11.2.2:** Test complete flow for energized user (full variants).

**REQ-11.2.3:** Test mood transition scenarios (tired → pumped, pumped → tired).

**REQ-11.2.4:** Test session resumption with different moods.

### 11.3 User Acceptance Tests
**REQ-11.3.1:** Verify users can complete all phases in all moods.

**REQ-11.3.2:** Verify progress persists across sessions.

**REQ-11.3.3:** Verify no "starting over" feeling.

**REQ-11.3.4:** Verify phase transitions are smooth and clear.

---

## 12. Documentation Requirements

### 12.1 Developer Documentation
**REQ-12.1.1:** Document new phase architecture.

**REQ-12.1.2:** Document phase adapter system.

**REQ-12.1.3:** Document migration process.

**REQ-12.1.4:** Provide code examples for each phase variant.

### 12.2 User Documentation
**REQ-12.2.1:** Explain new learning flow to users.

**REQ-12.2.2:** Describe how mood affects learning experience.

**REQ-12.2.3:** Show progress tracking features.

**REQ-12.2.4:** Provide FAQ for common questions.

---

## Appendix A: Mood-Phase Matrix

| Phase | Tired (Low Energy) | Okay/Struggling (Medium) | Pumped/Good (High Energy) |
|-------|-------------------|-------------------------|--------------------------|
| **PRIME** | Intent setting (all moods) | Intent setting (all moods) | Intent setting (all moods) |
| **ORIENT** | PassiveOverviewMap (read-only) | InteractivePreview (with guessing) | FullScoutPreview (with predictions) |
| **STRUCTURE** | Auto-complete (generated map) | GuidedMapBuilder (with hints) | ConceptMapBuilder (full control) |
| **ENCODE** | SpacedReview (if prior progress) | MicroLearningLoop (standard) | MicroLearningLoop + Diagnostic |
| **VERIFY** | Auto-complete (mark as reviewed) | LightQuiz (3-5 questions) | MasteryChallenge (comprehensive) |
| **COMPLETE** | Session summary | Session summary + next steps | Session summary + advanced options |

---

## Appendix B: Example User Journeys

### B.1 Tired → Pumped Transition
```
Day 1 (Tired):
  PRIME → ORIENT (passive overview) → STRUCTURE (auto) → ENCODE (skip, no prior progress) → VERIFY (auto) → COMPLETE
  Progress: { orientCompleted: true, structureCompleted: true, verifyCompleted: true }
  Adaptations: { orientMode: 'passive', structureMode: 'skip', verifyMode: 'skip' }

Day 2 (Pumped):
  PRIME → ORIENT (skip, already done) → STRUCTURE (skip, already done) → ENCODE (full learning) → VERIFY (mastery challenge) → COMPLETE
  Progress: { orientCompleted: true, structureCompleted: true, encodeStarted: true, verifyCompleted: true, completedConcepts: [5 concepts] }
  Adaptations: { orientMode: 'passive', structureMode: 'skip', encodeMode: 'diagnostic', verifyMode: 'full' }
```

### B.2 Pumped → Tired Transition
```
Day 1 (Pumped):
  PRIME → ORIENT (full scout) → STRUCTURE (map building) → ENCODE (5 concepts) → COMPLETE (time limit reached)
  Progress: { orientCompleted: true, structureCompleted: true, encodeStarted: true, completedConcepts: [5 concepts] }

Day 2 (Tired):
  PRIME → ORIENT (skip) → STRUCTURE (skip) → ENCODE (spaced review of 5 concepts) → VERIFY (auto) → COMPLETE
  Progress: { orientCompleted: true, structureCompleted: true, encodeStarted: true, verifyCompleted: true, completedConcepts: [5 concepts reviewed] }
```

### B.3 Steady Throughout
```
Day 1 (Okay):
  PRIME → ORIENT (interactive preview) → STRUCTURE (guided map) → ENCODE (3 concepts) → COMPLETE

Day 2 (Okay):
  PRIME → ORIENT (skip) → STRUCTURE (skip) → ENCODE (continue from concept 4) → VERIFY (light quiz) → COMPLETE
```
