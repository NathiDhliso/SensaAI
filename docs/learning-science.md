# Learning Science

**Last Updated:** February 17, 2026
**Status:** MANDATORY — All learning features must align with this model.

---

## The Learning Health Equation

```
I = min(h, Q_k × Q_r × Q_c × Q_f × Q_p)
```

This equation measures **ONLY the learner** — not the AI, not the platform.

| Symbol | Meaning | Signal Source | Range |
|--------|---------|---------------|-------|
| `I` | Information absorbed into long-term memory | Calculated | 0–1 |
| `h` | Cognitive bandwidth ceiling | Mood selection at session start | 0.4–1.0 |
| `Q_k` | Prior knowledge alignment | Diagnostic confidence, prediction accuracy | 0–1 |
| `Q_r` | Recall quality (unprompted retrieval) | Blank sheet score, quiz accuracy | 0–1 |
| `Q_c` | Connection quality (concept linking) | Map connections / map nodes, label accuracy | 0–1 |
| `Q_f` | Spacing/frequency quality | Response time improvement, review schedule adherence | 0–1 |
| `Q_p` | Process quality (learning loop fidelity) | Phase completion, cycle completions, dwell times | 0–1 |

**Mood → h mapping** (`MOOD_H_MAP` in `learning.ts`):

| Mood | h | Session curation |
|------|---|-----------------|
| Energized | 1.0 | 45 min, challenging concepts first |
| Neutral | 0.8 | 30 min, balanced mix |
| Tired | 0.6 | 15 min, spaced review only |
| Stressed | 0.4 | 15 min, free exploration, easy wins |

**Subject-type-aware labels:** Each Q variable gets contextual labels depending on the subject classification (procedural/conceptual/cyclic/perceptual). See `blueprint-formula.ts` for per-type label mappings.

Tracked by `EquationTracker` component which provides:
- Real-time 5-variable visualization with weakest variable highlighting
- h ceiling indicator showing mood-dependent bandwidth
- Actionable recommendation banner identifying the bottleneck variable and specific corrective action
- Proactive intervention when Q_p < 0.2 during Study ("grinding futile" warning)
- Health threshold progress bar (75% target)

`BlueprintFormulaDashboard` provides the detailed breakdown with subject-type badge and per-variable bars.

**Persistence:** Equation values (h, Q_k, Q_r, Q_c, Q_f, Q_p, I) are persisted on `StudySession.equation` via `updateSessionEquation()` and survive page refresh. On mount, `syncFromStore()` in `useSensaFlow` restores them from the Zustand-persisted study session.

**Key files:**
- Types: `src/shared/types/learning.ts` — `LearningHealthEquation`, `LearnerMood`, `MOOD_H_MAP`
- Constants: `src/shared/constants/sensa-flow-constants.ts` — `calculateHealthIndex()`, `findWeakestVariable()`, `EQUATION_COLORS`
- Formula engine: `src/shared/services/blueprint-formula.ts` — `calculateLearnerMetrics()`, `getLearnerRecommendation()`
- State hook: `src/shared/hooks/useSensaFlow.ts` — full state machine with 5 Q variables + h
- Components: `src/components/ui/EquationTracker.tsx`, `src/components/dashboard/BlueprintFormulaDashboard.tsx`, `src/components/dashboard/MasteryDashboard.tsx`
- Store: `src/store/slices/createStudySlice.ts` — `updateSessionEquation()`

---

## The 5-Step Session Flow

### Step 0: PRIME (See)
**Component:** `GuidedPrimer` → `SessionStartModal` (in `Study.tsx`) → `VelocityLockInGate`
**Purpose:** Set mood + intent before learning begins.
**Outputs:** `SessionPrimer { reason, action, reward }`, mood selection.

**Mood-Based Session Curation** (single source of truth: `MOOD_GOAL_MAP` in `SessionStartModal.tsx`):

| Mood | Goal | Duration | Rationale |
|------|------|----------|-----------|
| Energized | velocity | 45 min | Push hard, challenging concepts first |
| Neutral | learn-new | 30 min | Full learning lifecycle, balanced mix |
| Tired | review | 15 min | Spaced review, familiar concepts |
| Stressed | explore | 15 min | Free exploration, easy wins |

Duration and goal are NOT manually selectable — mood is the only input.

### Step 1: SCOUT (Explore)
**Component:** `SessionScoutPreview`
**Sub-steps:**
1. **Structure** — View tier hierarchy (trunk/branch/leaf distribution)
2. **Nomenclature Sprint** — 60-second term↔metaphor matching (90% accuracy gate)
3. **Gap Priming** — Preview questions to activate prior knowledge

The Synoptic View help overlay mirrors the 6 canonical TRACES relationship labels (`requires`, `enables`, `is-part-of`, `is-type-of`, `causes`, `constrains`) with plain-language meanings for quick interpretation.

**Outputs:** `Map<conceptId, guessedKeystoneId>` predictions for later validation.

### Step 2: BUILD (Note)
**Component:** `ConceptMapBuilder`
**Purpose:** Construct connections between concepts visually.
**Outputs:** `ConceptMapData { nodes[], connections[] }`

**Draft Persistence:** In-progress concept maps are autosaved to localStorage via `useActivityAutosave` (throttled, 24h TTL). Completed maps are stored on `StudySession.conceptMap` (Zustand persist). When re-entering BUILD, `VelocityLearning` passes `initialData={studySession?.conceptMap}` to restore the previous map.

The canvas includes an always-visible **Relationship Legend** with child-friendly definitions and examples for the 6 canonical labels: `requires`, `enables`, `is-part-of`, `is-type-of`, `causes`, `constrains`.

**Graph Topology Rules** (enforced by both prompt and post-processing):
- **Trunk**: 0 outgoing connections (receives `is-part-of` from branches)
- **Branch**: Max 2 connections (1 `is-part-of` → trunk + 0-1 `requires` → sibling branch)
- **Leaf**: Max 3 connections (1 `is-part-of` → branch + 1-2 same-branch connections)
- **Directional flow**: `requires` must point to lower-order concepts only
- **Same-branch locality**: Leaf connections beyond `is-part-of` must target leaves within the same branch — cross-branch leaf connections are forbidden
- **Frontend caps**: `suggestConnections()` uses tier-based caps (trunk=0, branch=2, leaf=3) and enforces same-branch locality for leaf-to-leaf suggestions

### Step 3: STUDY (The Micro-Loop)
**Component:** `MicroLearningLoopController`
**Purpose:** Per-concept 3-phase learning cycle. This is the core learning engine.

```
For each concept:
  Test (Predict & Expose Gaps) → Encode (Build Understanding) → Verify (Confirm Retention)
```

See detailed breakdown below.

### Step 4: APPLY (Master)
**Component:** `MasteryChallenge`
**Purpose:** Cross-concept mastery proof across multiple concepts.

---

## The 3-Step Micro-Loop (Step 3 Detail)

### Step 3a: Test (Predict & Expose Gaps)
**File:** `src/features/learning-session/phases/preview-ai.ts`
**Purpose:** Test BEFORE teaching — activates retrieval and reveals gaps.

**Question source priority:**
1. `concept.shape.patternRecognition.question` (AI-generated diagnostic)
2. `concept.commonPitfalls` → misconception-based question
3. `concept.workedExample.problem` (problem statement)
4. `concept.lifecycle.phase1.steps[0]` (process question)

No synthetic fallback questions are generated. Concepts without explicit question/hint material are skipped by the Test phase.

**Hint source priority:**
1. `concept.shape.simpleCore`
2. `concept.hookSentence`
3. `concept.keyPoints[0]`

**Difficulty scoring factors:**
- `keyPoints.length` (content complexity)
- `tier` (leaf = harder, branch = medium)
- `cognitiveLevel` (evaluate/create = harder)

### Step 3b: Encode (Build Understanding)
**Component:** `LearnPhase` in `MicroLearningLoopController.tsx`
**Purpose:** Structured knowledge presentation with AI-generated organization.

**Section layout:**
1. **Concept header** — name + Bloom's badge + hookSentence + breadcrumb (`trunkDomain › parentName`)
2. **Metaphor** — "Think of it as: {metaphor}"
3. **Section 1** — title from `lifecycle.phase1.title` (fallback: "The Architecture")
4. **Section 2** — title from `lifecycle.phase2.title` (fallback: "The Execution")
5. **Section 3** — title from `lifecycle.phase3.title` (fallback: "The System Physics")
6. **Critical Clarifications** — from `commonPitfalls[]`
7. **Technical Details** — from `technicalDetails`
8. **High-Stakes Scenario** — from `shape.highStakesExample`
9. **Think Deeper** — elaboration prompt (metacognition)

**Content categorization:** `categorizeKeyPoints()` splits `keyPoints + howToUse` into architecture/execution/systemPhysics buckets using keyword matching.

### Step 3c: Verify (Confirm Retention)
**Component:** `VerifyPhase` in `MicroLearningLoopController.tsx`
**Purpose:** Quick verification question using AI-generated `patternRecognition` data.

- Only concepts with explicit `shape.patternRecognition.question` and `shape.patternRecognition.answer` produce a verify question
- Concepts without pattern recognition data auto-complete the verify phase
- No synthetic questions are generated from key points or concept names
- `BlankSheetScorer` returns zero-score with `confidence: 0` when scoring keywords are missing (no word-count heuristics)

---

## Gym Activities

Activities available in the Gym (`GymActivityLauncher`) and some in the main loop:

| Activity | Where Used | Cognitive Target |
|----------|-----------|-----------------|
| **ConceptMapBuilder** | Main loop (Step 2) + Gym | Structural understanding, connection-making |
| **BlankSheetTest** | Main loop (Verify) | Free recall, memory consolidation (response text autosaved) |
| **ConfusionDrill** | Main loop (confusion state) | Discrimination between similar concepts |
| **PeerReviewActivity (Interrogator)** | Main loop (social-learning) + Gym | Misconception diagnosis, defense under pressure |
| **CreativeTransferActivity** | Main loop (creative-transfer) | Apply knowledge to novel scenarios |
| **NomenclatureSprint** | Scout preview (Step 1) | Vocabulary priming, rapid recognition |
| **MasteryChallenge** | Main loop (Step 4) + Gym | Cross-concept mastery proof |
| **PreMortemActivity** | Gym | Failure prediction, process understanding |

---

## Concept Selection Algorithm

**File:** `src/features/learning-session/algorithms/concept-selection.ts`

### Scoring Formula
```
total = (prerequisite × 0.4) + (interleaving × weight) + (tierBalance × 0.3)
```

### Prerequisite Score (40% weight)
- Checks BOTH `prerequisites[]` (name-based) AND `connections[type=requires]` (semantic)
- Unmet prerequisites: strict mode = 0, lenient mode = 0.3
- **Outdegree bonus:** +0–15% for concepts others depend on (learned first)
- **Enabler bonus:** +5% per `enables` connection (unlocks more concepts)

### Interleaving Score
- Phase interleaving: different `lifecyclePhase` = 1.0, same = 0.3
- Tier interleaving: different tier = +0.3 bonus

### Tier Balance Score (30% weight)
Target distribution: Trunk ~15%, Branch ~35%, Leaf ~50%
Concepts matching the ideal next tier score 1.0.

### Difficulty Calculation
```
Base difficulty = 3
+ order > 15: +2 | order > 8: +1
+ tier leaf: +2 | tier trunk: +1
+ prerequisites > 2: +1
+ cognitiveLevel evaluate/create: +2 | analyze/apply: +1
+ outdegree >= 5: +1
```

---

## Interleaving Algorithm

**File:** `src/features/learning-session/algorithms/interleaving.ts`

### Context Bridge (Concept Transitions)
When transitioning from concept A to concept B, the system generates a narrative transition:

**Priority order:**
1. `from.connections` matching `to.name` — verb-based message (TRACES types):
   - `requires`: "X requires Y — let's build on that foundation."
   - `enables`: "X enables Y — time to unlock this next layer."
   - `is-part-of`: "Y is part of X — let's zoom in."
   - `is-type-of`: "Y is a type of X — a specific variant."
   - `causes`: "X causes Y — let's follow the chain."
   - `constrains`: "X constrains Y — understanding the boundaries."
2. Reverse connection check (`to.connections` matching `from`)
3. Tier-based fallback: same tier = "Building on X, let's explore Y" / different tier = "Shifting from {tierA} to {tierB}"

---

## Spacing Engine

**File:** `src/features/learning-session/algorithms/spacing-engine.ts`
Implements spaced repetition scheduling for review sessions. Tracks:
- Next review date per concept
- Interval growth based on performance
- Due reviews surfaced in ContentLaunchpad

---

## AI Coach System

**File:** `src/features/ai-coach/`

### Personas
Users select a persona that affects coach messaging tone:
- Stored in `personalization-store.ts`
- Persona responses adapt to phase + situation (intro, encouragement, struggle, success, transition)

### Mood System
Mood affects cognitive bandwidth ceiling (`h` in the equation):
```typescript
type Mood = 'energized' | 'neutral' | 'tired' | 'stressed';
```
`moodToBandwidth()` maps mood to `CognitiveBandwidth`: `'high' | 'medium' | 'low'`

---

## Mastery Scoring

**File:** `src/shared/utils/score-utils.ts`

| Grade | Score Range |
|-------|-----------|
| S | 90–100% |
| A | 75–89% |
| B | 60–74% |
| C | 40–59% |
| D | 0–39% |

See: `docs/MASTERY_SCORING_GUIDE.md` for full details.
