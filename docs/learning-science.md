# Learning Science

**Last Updated:** February 12, 2026
**Status:** MANDATORY — All learning features must align with this model.

---

## The Universal Learning Equation

```
I = min(h, G × Q_f × Q_M × Q_P)
```

| Symbol | Meaning | Range |
|--------|---------|-------|
| `I` | Information absorbed | 0–1 |
| `h` | Bandwidth ceiling (mood-dependent) | 0.4–1.0 |
| `G` | Generation quality (AI content richness) | 0–1 |
| `Q_f` | Frequency quality (spaced repetition) | 0–1 |
| `Q_M` | Mastery quality (depth of understanding) | 0–1 |
| `Q_P` | Process quality (learning loop fidelity) | 0–1 |

Tracked by `EquationTracker` component in the VelocityLearning page.

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

**Outputs:** `Map<conceptId, guessedKeystoneId>` predictions for later validation.

### Step 2: BUILD (Note)
**Component:** `ConceptMapBuilder`
**Purpose:** Construct connections between concepts visually.
**Outputs:** `ConceptMapData { nodes[], connections[] }`

### Step 3: STUDY (The Micro-Loop)
**Component:** `MicroLearningLoopController`
**Purpose:** Per-concept 3-phase learning cycle. This is the core learning engine.

```
For each concept:
  Preview AI (Test) → Build AI (Learn) → Retain AI (Verify)
```

See detailed breakdown below.

### Step 4: APPLY (Master)
**Component:** `MasteryChallenge`
**Purpose:** Cross-concept mastery proof across multiple concepts.

---

## The 3-Phase Micro-Loop (Step 3 Detail)

### Phase 1: Preview AI (Test First)
**File:** `src/features/learning-session/phases/preview-ai.ts`
**Purpose:** Test BEFORE teaching — activates retrieval and reveals gaps.

**Question source priority:**
1. `concept.shape.patternRecognition.question` (AI-generated diagnostic)
2. `concept.commonPitfalls` → misconception-based question
3. `concept.workedExample.problem` (problem statement)
4. `concept.lifecycle.phase1.steps[0]` (process question)
5. Generic template fallback (last resort)

**Hint source priority:**
1. `concept.shape.simpleCore`
2. `concept.hookSentence`
3. `concept.keyPoints[0]`

**Difficulty scoring factors:**
- `keyPoints.length` (content complexity)
- `tier` (leaf = harder, branch = medium)
- `cognitiveLevel` (evaluate/create = harder)

### Phase 2: Build AI (Learn)
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

### Phase 3: Retain AI (Verify)
**Component:** `BlankSheetTest`
**Purpose:** Free recall — write everything you remember without prompts.

---

## Gym Activities

Activities available in the Gym (`GymActivityLauncher`) and some in the main loop:

| Activity | Where Used | Cognitive Target |
|----------|-----------|-----------------|
| **ConceptMapBuilder** | Main loop (Step 2) + Gym | Structural understanding, connection-making |
| **BlankSheetTest** | Main loop (Retain AI) | Free recall, memory consolidation |
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
1. `to.logicalConnection` (if >10 chars) — AI-generated narrative bridge
2. `from.connections` matching `to.name` — verb-based message:
   - `requires`: "X requires Y — let's build on that foundation."
   - `enables`: "X enables Y — time to unlock this next layer."
   - `is-part-of`: "Y is part of X — let's zoom in."
   - `causes`: "X causes Y — let's follow the chain."
   - `constrains`: "X constrains Y — understanding the boundaries."
3. Reverse connection check (`to.connections` matching `from`)
4. Tier-based fallback: same tier = "Building on X, let's explore Y" / different tier = "Shifting from {tierA} to {tierB}"

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

### Voice System
- 43+ pre-recorded mp3 files in `public/Audio/voice/`
- Supports `buddy` and `coach` persona prefixes
- Anti-repetition LRU tracking (5-line history, 5-minute cooldown)
- Controlled by `coachVoiceEnabled` in personalization store

### Mood System
Mood affects cognitive bandwidth ceiling (`h` in the equation):
```typescript
type Mood = 'pumped' | 'good' | 'okay' | 'struggling' | 'tired';
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
