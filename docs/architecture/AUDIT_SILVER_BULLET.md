# Silver Bullet Audit — SensaPBL

## Vision Alignment Check

**Goal:** Search a subject → extract every testable concept + its verbs → cycle through practice grounds (mapping, testing, confusion drills) → guarantee mental model alignment with subject requirements.

---

## PRESERVE (True Value — Do Not Break)

| Component | Why It's Good |
|---|---|
| `BlankSheetTest` | Fuzzy scoring, typing metrics, remediation loop, coach feedback. Best activity. |
| `ConfusionDrill` | Real A/B scenarios, timer, keyboard shortcuts, confidence calibration. |
| `ConceptMapBuilder` | Undo/redo, drag-drop, AI suggestions, gap detection. Core practice ground. |
| `Generation Pipeline` | Lambda → classify → parallel generate → poll → hydrate. Working end-to-end. |
| `Tier System` | Root/Trunk/Leaf computed deterministically from connection graph. Strong structural foundation. |
| `Interleaving Algorithm` | Blocked/mixed/progressive modes with tier balance. Solid selection logic. |
| `ZPD Concept Selection` | Prerequisite gates, tier balance, phase interleaving. Good cognitive science. |
| `Struggle Detector` | Idle time, error rate, backspace velocity. Thoughtful multi-signal detection. |
| `Session Progress Persistence` | Throttled saves, flush on unmount. Prevents data loss. |
| `Coach Message System` | Mood-adjusted, cooldown-based, phase-aware coaching. |
| `Blueprint Classification` | 4-type system (procedural/conceptual/cyclic/perceptual) with confidence scores. |
| `Personalization Store` | Persona, metaphor settings, practice mode, mood. Well-structured persistence. |
| `EquationTracker` + `FlowProgressBar` | Clean HUD showing equation state and flow progress. |
| `NomenclatureSprint` | Timed matching game with retry logic and accuracy gate. Needs content fix, not rebuild. |

---

## FIX (Half-Assed — Needs Real Implementation)

### F1. `PeerReviewActivity` — Fake Social Learning
- **Problem:** Hardcoded mock peers, template misconception string, `response.length > 20` validation
- **Fix:** Generate misconceptions from concept's `commonPitfalls` and nearby concept confusion. Validate correction mentions the distinguishing key point.
- **Files:** `src/components/learning/activities/PeerReviewActivity.tsx`
- **Risk:** None — this is self-contained, no other component depends on its internals.

### F2. `CreativeTransferActivity` — Generic Scenarios
- **Problem:** 5 hardcoded scenarios unrelated to subject type. `length > 50` gate. No validation.
- **Fix:** Generate type-aware transfer scenarios from classification. Check response mentions concept key points.
- **Files:** `src/components/learning/activities/CreativeTransferActivity.tsx`
- **Risk:** None — self-contained.

### F3. `FadedExamplePhase` — Duplicated Logic + Fake Validation
- **Problem:** Content synthesis duplicated from WorkedExamplePhase. Input validation is `value.length > 3`.
- **Fix:** Extract shared `synthesizeExample()` utility. Use `calculateRecallScore` from blank-sheet-scorer for fuzzy step matching.
- **Files:** `src/components/learning/MicroLearningLoopController.tsx` (lines ~133-175 and ~277-293)
- **Risk:** LOW — internal to MicroLearningLoopController, no external API changes.

### F4. `MasteryChallenge` — Self-Assessment Honor System
- **Problem:** No automated scoring. User self-rates "excellent/good/needs-work" and that feeds Q_f.
- **Fix:** Score response using `calculateRecallScore` against aggregated concept keywords. Keep self-assessment as calibration signal only.
- **Files:** `src/components/learning/activities/MasteryChallenge.tsx`
- **Risk:** LOW — the `onComplete(passed)` signature stays the same.

### F5. `MicroLearningLoopController` — Type-Blind Activity Selection
- **Problem:** Same sequence for all 4 subject types. `Math.random()` picks social vs creative.
- **Fix:** Add `subjectType` prop. Select post-confusion activity based on type. Procedural → execution drill, Conceptual → case transfer, Cyclic → cycle reflection, Perceptual → discrimination drill.
- **Files:** `src/components/learning/MicroLearningLoopController.tsx`, `src/pages/VelocityLearning.tsx`
- **Risk:** MEDIUM — need to pass subjectType through. VelocityLearning already has it via `currentSession.subjectType`.

### F6. `BlueprintFormulaDashboard` — Wired but Never Fed
- **Problem:** `sensaFlow.updateTypeAwareMetrics()` is never called. Dashboard always shows null metrics.
- **Fix:** Call `updateTypeAwareMetrics` in `handleLoopComplete` with real session data from cognitive metrics.
- **Files:** `src/pages/VelocityLearning.tsx`
- **Risk:** LOW — additive change to existing handler.

### F7. `NomenclatureSprint` — Matches Names to Metaphors, Not Verbs to Objects
- **Problem:** Term↔metaphor matching is trivia recall, not verb-object association.
- **Fix:** Also include `howToUse[0]` as match targets. Show "What do you DO with X?" framing.
- **Files:** `src/components/learning/activities/NomenclatureSprint.tsx`
- **Risk:** LOW — only changes match pair generation logic.

### F8. `VerifyPhase` — Weak Distractors
- **Problem:** Fallback distractors are obviously wrong templates.
- **Fix:** Pull distractors from same-tier concepts' `hookSentence` or `keyPoints[0]`.
- **Files:** `src/components/learning/MicroLearningLoopController.tsx` (VerifyPhase)
- **Risk:** LOW — internal to verify phase.

---

## CLEAN (Dead Code / Clutter)

### C1. `App.tsx` — Commented Bionic Reading
- Lines 36-46: Dead commented code. Remove.

### C2. `Home.tsx` — Hardcoded Subject Catalog
- `SUBJECT_CATEGORIES` creates false impression of limited catalog. Relabel as "Popular Subjects" quick-start section.

---

## INTEGRATION OPPORTUNITIES

### I1. `blank-sheet-scorer.ts` → Used in More Places
Currently only used in `BlankSheetTest`. Should also power:
- FadedExample step validation (F3)
- MasteryChallenge response scoring (F4)
- CreativeTransfer response validation (F2)

### I2. `confusion-generator.ts` → Powers PeerReview
The `identifyConfusingAspects()` function already generates confusion reasons. Use these to generate realistic misconceptions for PeerReviewActivity (F1).

### I3. `blueprint-formula.ts` → Fed by Loop Controller
`updateTypeAwareMetrics()` needs inputs from `MicroLearningLoopController` completion data. Map `handleLoopComplete` data → `QMetricInputs` (F6).

---

## Implementation Order (Dependency-Aware)

1. **F3** — Extract `synthesizeExample()` (no deps, reduces duplication)
2. **F6** — Wire `updateTypeAwareMetrics` (enables dashboard)
3. **F5** — Type-aware activity selection in MicroLearningLoop
4. **F1** — Rebuild PeerReview with confusion data
5. **F2** — Rebuild CreativeTransfer with type-aware scenarios
6. **F4** — MasteryChallenge real scoring
7. **F7** — NomenclatureSprint verb-object matching
8. **F8** — VerifyPhase better distractors
9. **F3b** — FadedExample fuzzy validation
10. **C1** — Clean App.tsx
11. **C2** — Relabel Home catalog
12. TypeScript check
13. Update ARCHITECTURE_BLUEPRINT.md
