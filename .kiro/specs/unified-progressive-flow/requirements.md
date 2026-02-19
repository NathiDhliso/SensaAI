# Unified Progressive Learning Flow - Requirements

## 1. Overview

### 1.1 Purpose
Transform the fragmented, mood-dependent learning flow into a unified progressive architecture where all users follow the same cognitive phases, with each phase's METHOD adapting to current cognitive capacity while maintaining its core COGNITIVE GOAL.

### 1.2 Problem Statement
The current learning flow architecture has critical flaws:
- Low energy users skip ALL learning phases and "start over" when energized
- Progress is not preserved across mood changes
- Phase logic doesn't follow neuroscience principles (encoding requires schema, retrieval beats re-reading)
- Features are goal-dependent rather than mood-adaptive
- Users experience a "starting over" feeling when switching moods
- **Critical neuroscience violation:** Architecture treats "tired" as "do less" rather than "do differently"

### 1.3 Core Principle
**Same cognitive goals for everyone, methods adapt to working memory capacity.**

All users progress through the same cognitive phases (PRIME → ORIENT → STRUCTURE → ENCODE → VERIFY → COMPLETE). Each phase has a fixed cognitive goal that doesn't change with mood. What changes is the METHOD of achieving that goal based on current working memory capacity and inhibitory control.

### 1.4 Neuroscience Foundation

#### 1.4.1 Encoding Requires Prior Schema
You cannot encode new information without somewhere to "hang" it. This is why STRUCTURE must precede ENCODE. ORIENT isn't just passive overview — it's schema activation. For tired users, this means activating existing schemas (what do they already know that's adjacent?). For pumped users, it means building a new schema skeleton.

#### 1.4.2 Cognitive Load is Asymmetric
Tired users don't just have "less energy" — they have reduced working memory capacity and weaker inhibitory control (harder to filter irrelevant information). Adaptation shouldn't be "fewer things" but "less interference." A tired user shown a complex interactive preview isn't getting a lighter experience — they're getting a more cognitively costly one because they can't filter the noise.

#### 1.4.3 Retrieval Beats Re-Reading
Returning users in ENCODE should do retrieval practice, not re-reading. Spaced review for tired users is neuroscientifically stronger than standard encoding for medium energy users. The architecture must not frame retrieval as a "lesser version" when it's actually the most valuable phase.

#### 1.4.4 Sleep and Consolidation
The tired state might be post-sleep consolidation time — the best moment for retrieval practice and connecting concepts, not for new encoding. The architecture must distinguish between "tired because it's 9am" (prime retrieval time) and "tired because it's 11pm" (wind down and prime for overnight consolidation).

#### 1.4.5 Testing Effect
Even failed retrieval attempts strengthen memory. A tired user skipping VERIFY entirely misses this benefit. Better model: tired users get low-stakes recognition tasks (multiple choice) rather than recall tasks ("explain this from scratch").

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
2. ORIENT (Schema Priming)
3. STRUCTURE (Schema Building)
4. ENCODE (Memory Formation)
5. VERIFY (Consolidation)
6. COMPLETE (Session End + Consolidation Handoff)

**REQ-3.1.2:** All users MUST progress through the same phases regardless of mood or goal.

**REQ-3.1.3:** The system MUST NOT skip phases based on mood; instead, it MUST adapt phase METHOD while maintaining cognitive GOAL.

**REQ-3.1.4:** Each phase MUST have a clearly defined cognitive goal that remains constant across all mood variants.

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
  orientMode: 'prior-knowledge' | 'prediction-skeleton' | 'generative';
  structureMode: 'annotate' | 'guided' | 'full';
  encodeMode: 'retrieval' | 'minimal-encoding' | 'standard' | 'interleaved';
  verifyMode: 'recognition' | 'cued-recall' | 'free-recall';
}
```

**REQ-3.1.8:** Adaptation tracking MUST allow users to experience different variants of the same phase in different sessions.

**REQ-3.1.9:** Adaptation names MUST reflect the cognitive method, not just difficulty level (e.g., 'retrieval' not 'easy').

### 3.2 ORIENT Phase (Schema Priming)

**COGNITIVE GOAL:** Activate or build mental schemas to prepare the brain to receive new information.

#### 3.2.1 Low Energy Variant (Tired)
**Neuroscience Rationale:** Low working memory capacity requires activating existing schemas rather than building new ones. Reduce competing demands on working memory.

**REQ-3.2.1:** When mood is 'tired', ORIENT phase MUST display PriorKnowledgeActivation component.

**REQ-3.2.2:** PriorKnowledgeActivation MUST ask retrieval cues: "What do you already know about X?"

**REQ-3.2.3:** PriorKnowledgeActivation MUST focus on connecting new content to existing knowledge.

**REQ-3.2.4:** PriorKnowledgeActivation MUST minimize visual noise and competing information.

**REQ-3.2.5:** Completing PriorKnowledgeActivation MUST set `orientCompleted = true` and `adaptations.orientMode = 'prior-knowledge'`.

#### 3.2.2 Medium Energy Variant (Okay/Struggling)
**Neuroscience Rationale:** Moderate working memory capacity allows building a prediction skeleton without full generative load.

**REQ-3.2.6:** When mood is 'okay' or 'struggling', ORIENT phase MUST display PredictionSkeleton component.

**REQ-3.2.7:** PredictionSkeleton MUST show content structure and ask "What do you expect each part means?"

**REQ-3.2.8:** PredictionSkeleton MUST provide scaffolding for predictions without requiring full generation.

**REQ-3.2.9:** Completing PredictionSkeleton MUST set `orientCompleted = true` and `adaptations.orientMode = 'prediction-skeleton'`.

#### 3.2.3 High Energy Variant (Pumped/Good)
**Neuroscience Rationale:** High working memory capacity enables full generative orienting, which creates stronger encoding.

**REQ-3.2.10:** When mood is 'pumped' or 'good', ORIENT phase MUST display GenerativeOrienting component.

**REQ-3.2.11:** GenerativeOrienting MUST include scout (survey content) + predict + question-generation.

**REQ-3.2.12:** GenerativeOrienting MUST encourage deep predictions and self-generated questions.

**REQ-3.2.13:** Completing GenerativeOrienting MUST set `orientCompleted = true` and `adaptations.orientMode = 'generative'`.

### 3.3 STRUCTURE Phase (Schema Building)

**COGNITIVE GOAL:** Build or strengthen mental schemas that organize concepts and their relationships.

**CRITICAL NEUROSCIENCE PRINCIPLE:** Schema building is MORE important when encoding capacity is low, not less. A tired user needs a clear map more than a pumped user who can hold more in working memory.

#### 3.3.1 Low Energy Variant (Tired)
**Neuroscience Rationale:** Low working memory capacity requires externalized schema. Provide pre-built map to read and annotate rather than generate. Same cognitive goal (schema building), lower generation demand.

**REQ-3.3.1:** When mood is 'tired', STRUCTURE phase MUST display AnnotatableMap component.

**REQ-3.3.2:** AnnotatableMap MUST show a pre-generated concept map with clear visual hierarchy.

**REQ-3.3.3:** AnnotatableMap MUST allow users to add notes, highlights, or simple annotations.

**REQ-3.3.4:** AnnotatableMap MUST require active engagement (reading + annotation), NOT passive viewing.

**REQ-3.3.5:** Completing AnnotatableMap MUST set `structureCompleted = true` and `adaptations.structureMode = 'annotate'`.

**REQ-3.3.6:** System MUST NOT skip STRUCTURE phase for tired users.

#### 3.3.2 Medium Energy Variant (Okay/Struggling)
**Neuroscience Rationale:** Moderate working memory capacity allows guided construction with scaffolding.

**REQ-3.3.7:** When mood is 'okay' or 'struggling', STRUCTURE phase MUST display GuidedMapBuilder component.

**REQ-3.3.8:** GuidedMapBuilder MUST provide hints for concept relationships.

**REQ-3.3.9:** GuidedMapBuilder MUST allow partial user input with suggestions.

**REQ-3.3.10:** Completing GuidedMapBuilder MUST set `structureCompleted = true` and `adaptations.structureMode = 'guided'`.

#### 3.3.3 High Energy Variant (Pumped/Good)
**Neuroscience Rationale:** High working memory capacity enables full generative schema construction, which creates strongest encoding.

**REQ-3.3.11:** When mood is 'pumped' or 'good', STRUCTURE phase MUST display ConceptMapBuilder component.

**REQ-3.3.12:** ConceptMapBuilder MUST require full user-driven map construction.

**REQ-3.3.13:** ConceptMapBuilder MUST NOT provide hints unless requested.

**REQ-3.3.14:** Completing ConceptMapBuilder MUST set `structureCompleted = true` and `adaptations.structureMode = 'full'`.

### 3.4 ENCODE Phase (Memory Formation)

**COGNITIVE GOAL:** Form long-term memory traces through encoding (first exposure) or retrieval practice (subsequent exposure).

**CRITICAL NEUROSCIENCE PRINCIPLE:** Retrieval practice is MORE effective than re-encoding. Tired users doing retrieval are getting a neuroscientifically superior experience, not a lesser one.

#### 3.4.1 Low Energy Variant (Tired)
**Neuroscience Rationale:** Low working memory capacity is ideal for retrieval practice (if prior exposure exists) or minimal-interference encoding (if new). Retrieval strengthens memory more than re-reading.

**REQ-3.4.1:** When mood is 'tired' AND user has prior progress, ENCODE phase MUST show RetrievalPractice component.

**REQ-3.4.2:** RetrievalPractice MUST use spaced repetition algorithm to select concepts.

**REQ-3.4.3:** RetrievalPractice MUST focus on retrieval cues, not re-presentation of content.

**REQ-3.4.4:** RetrievalPractice MUST minimize visual interference and competing information.

**REQ-3.4.5:** When mood is 'tired' AND user has NO prior progress, ENCODE phase MUST show MinimalInterferenceEncoding component.

**REQ-3.4.6:** MinimalInterferenceEncoding MUST present one concept at a time with minimal distractions.

**REQ-3.4.7:** MinimalInterferenceEncoding MUST use simple recognition checks, not complex generation tasks.

**REQ-3.4.8:** Starting either component MUST set `encodeStarted = true` and `adaptations.encodeMode = 'retrieval'` or `'minimal-encoding'`.

#### 3.4.2 Medium Energy Variant (Okay/Struggling)
**Neuroscience Rationale:** Moderate working memory capacity allows standard encoding with elaboration.

**REQ-3.4.9:** When mood is 'okay' or 'struggling', ENCODE phase MUST display StandardAcquisition component.

**REQ-3.4.10:** StandardAcquisition MUST use micro-learning loop with elaboration prompts.

**REQ-3.4.11:** StandardAcquisition MUST include simple self-explanation tasks.

**REQ-3.4.12:** Starting StandardAcquisition MUST set `encodeStarted = true` and `adaptations.encodeMode = 'standard'`.

#### 3.4.3 High Energy Variant (Pumped/Good)
**Neuroscience Rationale:** High working memory capacity enables interleaved practice and deeper elaboration, which creates stronger, more flexible memory traces.

**REQ-3.4.13:** When mood is 'pumped' or 'good', ENCODE phase MUST display InterleavedAcquisition component.

**REQ-3.4.14:** InterleavedAcquisition MUST mix concepts from different categories (interleaving).

**REQ-3.4.15:** InterleavedAcquisition MUST include deep elaboration and connection-making tasks.

**REQ-3.4.16:** InterleavedAcquisition MUST allow optional diagnostic assessments.

**REQ-3.4.17:** Starting InterleavedAcquisition MUST set `encodeStarted = true` and `adaptations.encodeMode = 'interleaved'`.

#### 3.4.4 Concept Completion
**REQ-3.4.18:** Completing a concept in ENCODE phase MUST add it to `completedConcepts` array.

**REQ-3.4.19:** Concept completion MUST persist across mood changes.

**REQ-3.4.20:** When all concepts are completed, system MUST transition to VERIFY phase.

### 3.5 VERIFY Phase (Consolidation)

**COGNITIVE GOAL:** Strengthen memory through retrieval practice and identify gaps for future sessions.

**CRITICAL NEUROSCIENCE PRINCIPLE:** Testing effect research shows that even failed retrieval attempts strengthen memory. Skipping VERIFY entirely wastes this benefit. Low-stakes recognition tasks provide the benefit without high cognitive load.

#### 3.5.1 Low Energy Variant (Tired)
**Neuroscience Rationale:** Low working memory capacity requires recognition tasks rather than recall. Recognition still provides testing effect benefits without high generation demand.

**REQ-3.5.1:** When mood is 'tired', VERIFY phase MUST display RecognitionTasks component.

**REQ-3.5.2:** RecognitionTasks MUST use low-stakes recognition format (multiple choice, "did you see this?").

**REQ-3.5.3:** RecognitionTasks MUST NOT require free recall or generation.

**REQ-3.5.4:** RecognitionTasks MUST provide immediate feedback to strengthen correct associations.

**REQ-3.5.5:** Completing RecognitionTasks MUST set `verifyCompleted = true` and `adaptations.verifyMode = 'recognition'`.

**REQ-3.5.6:** System MUST NOT skip VERIFY phase for tired users.

#### 3.5.2 Medium Energy Variant (Okay/Struggling)
**Neuroscience Rationale:** Moderate working memory capacity allows cued recall, which is more demanding than recognition but less than free recall.

**REQ-3.5.7:** When mood is 'okay' or 'struggling', VERIFY phase MUST display CuedRecall component.

**REQ-3.5.8:** CuedRecall MUST provide retrieval cues to scaffold recall.

**REQ-3.5.9:** CuedRecall MUST contain 3-5 questions with hints available.

**REQ-3.5.10:** Completing CuedRecall MUST set `verifyCompleted = true` and `adaptations.verifyMode = 'cued-recall'`.

#### 3.5.3 High Energy Variant (Pumped/Good)
**Neuroscience Rationale:** High working memory capacity enables free recall and transfer tasks, which create the strongest memory consolidation.

**REQ-3.5.11:** When mood is 'pumped' or 'good', VERIFY phase MUST display FreeRecallTransfer component.

**REQ-3.5.12:** FreeRecallTransfer MUST require free recall without cues.

**REQ-3.5.13:** FreeRecallTransfer MUST include transfer tasks (apply to new contexts).

**REQ-3.5.14:** FreeRecallTransfer MUST test synthesis and application, not just recognition.

**REQ-3.5.15:** Completing FreeRecallTransfer MUST set `verifyCompleted = true` and `adaptations.verifyMode = 'free-recall'`.

### 3.6 Phase Progression Logic

#### 3.6.1 Phase Skipping
**REQ-3.6.1:** If a phase is already completed (`phaseProgress` flag is true), system MUST skip to next phase.

**REQ-3.6.2:** Phase skipping MUST happen automatically without user interaction.

**REQ-3.6.3:** System MUST show visual indication of already-completed phases.

**REQ-3.6.4:** System MUST NOT skip phases based on mood alone — only based on completion status.

#### 3.6.2 Phase Transitions
**REQ-3.6.5:** Phase transitions MUST be sequential (no jumping ahead).

**REQ-3.6.6:** User MUST NOT be able to manually skip phases.

**REQ-3.6.7:** System MUST transition to next phase immediately after current phase completion.

#### 3.6.3 Session Resumption
**REQ-3.6.8:** When resuming a session, system MUST start at the first incomplete phase.

**REQ-3.6.9:** System MUST use current mood to determine phase variant (method), not which phases to show.

**REQ-3.6.10:** System MUST NOT re-show completed phases unless explicitly requested.

### 3.7 COMPLETE Phase (Consolidation Handoff)

**COGNITIVE GOAL:** Prime the brain for overnight consolidation and set expectations for next session.

**NEUROSCIENCE PRINCIPLE:** What happens after a session matters. Telling the learner what to expect their brain to do overnight (consolidate, connect, surface questions) primes better recall in the next session.

#### 3.7.1 Consolidation Priming
**REQ-3.7.1:** COMPLETE phase MUST include explicit consolidation priming message.

**REQ-3.7.2:** Consolidation message MUST explain what the brain will do overnight: "Your brain will consolidate these concepts while you sleep, making new connections and strengthening memories."

**REQ-3.7.3:** Consolidation message MUST set expectations: "You might wake up with new questions or insights — that's your brain working."

**REQ-3.7.4:** Message MUST be shown regardless of mood or session length.

#### 3.7.2 Session Summary
**REQ-3.7.5:** COMPLETE phase MUST show session summary with concepts covered.

**REQ-3.7.6:** Summary MUST highlight which cognitive methods were used (e.g., "You practiced retrieval today").

**REQ-3.7.7:** Summary MUST provide next session preview based on current progress.

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

##### 5.1.3 Time-of-Day Context (Future Enhancement)
**REQ-5.1.4:** Consider adding optional `timeContext` field to distinguish:
```typescript
timeContext?: 'morning-post-sleep' | 'midday' | 'evening-pre-sleep';
```

**Rationale:** Morning tired (post-sleep) is prime retrieval time. Evening tired (pre-sleep) is prime for consolidation priming. This distinction could further optimize phase adaptations.

#### 5.1.4 Deprecated Fields
**REQ-5.1.5:** Mark as deprecated (keep for migration):
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

### 6.3 User Communication
**REQ-6.3.1:** System MUST show onboarding message explaining new approach: "We've improved how learning adapts to your energy. Now, tired sessions use scientifically-proven retrieval practice instead of skipping content."

**REQ-6.3.2:** Message MUST emphasize that tired ≠ lesser: "Retrieval practice when tired is actually MORE effective than re-reading when energized."

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

**ORIENT Phase:**
- PriorKnowledgeActivation (low energy - retrieval cues)
- PredictionSkeleton (medium energy - scaffolded predictions)
- GenerativeOrienting (high energy - full scout + predict + questions)

**STRUCTURE Phase:**
- AnnotatableMap (low energy - read + annotate pre-built map)
- GuidedMapBuilder (medium energy - guided construction)
- ConceptMapBuilder (high energy - full construction)

**ENCODE Phase:**
- RetrievalPractice (low energy with prior progress - spaced repetition)
- MinimalInterferenceEncoding (low energy, new learner - simple presentation)
- StandardAcquisition (medium energy - elaboration prompts)
- InterleavedAcquisition (high energy - mixed concepts)

**VERIFY Phase:**
- RecognitionTasks (low energy - multiple choice, "did you see this?")
- CuedRecall (medium energy - hints available)
- FreeRecallTransfer (high energy - no cues, apply to new contexts)

**COMPLETE Phase:**
- ConsolidationHandoff (all moods - overnight priming message)

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

## Appendix A: Cognitive Phase Matrix

**Key Principle:** Each phase has a fixed COGNITIVE GOAL. What changes is the METHOD based on working memory capacity.

| Phase | Cognitive Goal | Tired (Low WM) | Okay/Struggling (Medium WM) | Pumped/Good (High WM) |
|-------|---------------|----------------|----------------------------|----------------------|
| **PRIME** | Intention + Context | Retrieval cue: "Last time you learned X" | Goal setting | Goal + prediction |
| **ORIENT** | Schema Priming | Prior knowledge activation ("What do you know about X?") | Prediction skeleton ("What do you expect?") | Generative orienting (scout + predict + question) |
| **STRUCTURE** | Schema Building | Read pre-built map + annotate | Guided construction (with hints) | Full construction (generative) |
| **ENCODE** | Memory Formation | Retrieval practice (if prior) / Minimal-interference encoding (if new) | Standard acquisition (with elaboration) | Interleaved acquisition (mixed concepts) |
| **VERIFY** | Consolidation | Recognition tasks (multiple choice) | Cued recall (with hints) | Free recall + transfer (apply to new contexts) |
| **COMPLETE** | Consolidation Handoff | Session summary + overnight consolidation priming | Session summary + overnight consolidation priming | Session summary + overnight consolidation priming |

**Critical Neuroscience Notes:**
- STRUCTURE is NOT skipped for tired users — they need schemas MORE, not less
- ENCODE retrieval practice for tired users is neuroscientifically SUPERIOR to standard encoding
- VERIFY is NOT skipped for tired users — recognition tasks still provide testing effect benefits
- Adaptation is about METHOD (how to achieve the goal), not DEPTH (easier version of the goal)

---

## Appendix B: Example User Journeys

### B.1 Tired → Pumped Transition (New Learner)
```
Day 1 (Tired, 9am - post-sleep, prime retrieval time):
  PRIME (retrieval cue: "What did you learn yesterday?") 
  → ORIENT (prior knowledge activation: "What do you know about cloud storage?") 
  → STRUCTURE (annotate pre-built map) 
  → ENCODE (minimal-interference encoding: 2 concepts, simple recognition checks) 
  → VERIFY (recognition tasks: "Which of these did you see?") 
  → COMPLETE (consolidation priming: "Your brain will strengthen these tonight")
  
  Progress: { orientCompleted: true, structureCompleted: true, encodeStarted: true, verifyCompleted: true, completedConcepts: [2] }
  Adaptations: { orientMode: 'prior-knowledge', structureMode: 'annotate', encodeMode: 'minimal-encoding', verifyMode: 'recognition' }

Day 2 (Pumped):
  PRIME (goal + prediction) 
  → ORIENT (skip, already done) 
  → STRUCTURE (skip, already done) 
  → ENCODE (interleaved acquisition: continue from concept 3, mix categories) 
  → VERIFY (free recall + transfer) 
  → COMPLETE (consolidation priming)
  
  Progress: { orientCompleted: true, structureCompleted: true, encodeStarted: true, verifyCompleted: true, completedConcepts: [7] }
  Adaptations: { orientMode: 'prior-knowledge', structureMode: 'annotate', encodeMode: 'interleaved', verifyMode: 'free-recall' }
```

**Neuroscience Note:** Day 1 tired user got BETTER encoding foundation through minimal interference. Day 2 builds on solid base.

### B.2 Pumped → Tired Transition (Returning Learner)
```
Day 1 (Pumped):
  PRIME (goal + prediction) 
  → ORIENT (generative orienting: scout + predict + questions) 
  → STRUCTURE (full map construction) 
  → ENCODE (interleaved acquisition: 5 concepts) 
  → COMPLETE (time limit reached, VERIFY not yet done)
  
  Progress: { orientCompleted: true, structureCompleted: true, encodeStarted: true, completedConcepts: [5] }
  Adaptations: { orientMode: 'generative', structureMode: 'full', encodeMode: 'interleaved' }

Day 2 (Tired, 9am - post-sleep consolidation):
  PRIME (retrieval cue: "What did you learn yesterday?") 
  → ORIENT (skip, already done) 
  → STRUCTURE (skip, already done) 
  → ENCODE (retrieval practice: spaced repetition of 5 concepts - THIS IS SUPERIOR TO RE-ENCODING) 
  → VERIFY (recognition tasks: "Which statement is correct?") 
  → COMPLETE (consolidation priming)
  
  Progress: { orientCompleted: true, structureCompleted: true, encodeStarted: true, verifyCompleted: true, completedConcepts: [5 strengthened] }
  Adaptations: { orientMode: 'generative', structureMode: 'full', encodeMode: 'retrieval', verifyMode: 'recognition' }
```

**Neuroscience Note:** Day 2 retrieval practice is MORE effective than re-reading. Tired user got the BEST possible learning activity for consolidation.

### B.3 Steady Throughout
```
Day 1 (Okay):
  PRIME (goal setting) 
  → ORIENT (prediction skeleton: "Here's the structure, what do you expect?") 
  → STRUCTURE (guided map building with hints) 
  → ENCODE (standard acquisition with elaboration: 3 concepts) 
  → COMPLETE
  
  Progress: { orientCompleted: true, structureCompleted: true, encodeStarted: true, completedConcepts: [3] }
  Adaptations: { orientMode: 'prediction-skeleton', structureMode: 'guided', encodeMode: 'standard' }

Day 2 (Okay):
  PRIME (goal setting) 
  → ORIENT (skip, already done) 
  → STRUCTURE (skip, already done) 
  → ENCODE (standard acquisition: continue from concept 4) 
  → VERIFY (cued recall with hints: "What happens when...?") 
  → COMPLETE (consolidation priming)
  
  Progress: { orientCompleted: true, structureCompleted: true, encodeStarted: true, verifyCompleted: true, completedConcepts: [7] }
  Adaptations: { orientMode: 'prediction-skeleton', structureMode: 'guided', encodeMode: 'standard', verifyMode: 'cued-recall' }
```
