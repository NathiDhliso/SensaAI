# Generation Pipeline

**Last Updated:** February 20, 2026
**Status:** MANDATORY — Understand this before modifying generation or parsing code.

---

## Overview

Content generation is a multi-phase backend process that produces hierarchical learning concepts from any subject. The frontend orchestrates the flow, displays progress, and transforms raw output into the `LearningConcept` type.

```
User Input → Backend Lambda → Phase 1 (Domain Analysis) → Phase 2 (Tree Generation per domain, cached system prompt) → Phase 2.5 (Scope-Creep Check → Gap-Fill if >2 gaps → Scope-Creep Check) → Frontend Parser → Zustand Store → UI
```

---

## Phase 1: Domain Analysis

**Backend:** `bedrock_service.py` → `system_prompt.py`
**Frontend trigger:** `useGenerationEngine.ts` → `backend-client.ts` → `conceptsApi.generate()`

### Input
```typescript
{
  subject: string;          // e.g., "AWS Solutions Architect"
  context: string;          // User's learning context/objectives
  trunks?: string[];        // Optional: 2-6 user-defined exam domains
}
```

### Process
1. If `trunks` provided (≥2): Use them as domain names. If `context` is also provided, `_enrich_domains_from_context()` parses `[Domain Name - Weight%] Task` lines to populate subtopics and real weights per domain.
2. If no trunks: Classify the subject into one of 4 types (procedural/conceptual/cyclic/perceptual), then extract domains from classification.

### Output
```typescript
{
  subjectType: SubjectType;           // 'procedural' | 'conceptual' | 'cyclic' | 'perceptual'
  classification: object;
  macroStructure: MacroStructure;
  connectiveTissue: object;
  domains: Array<{ name, weight }>;
}
```

---

## Phase 2: Tree Generation (Per Domain)

**Backend:** `bedrock_service.py` → `system_prompt.py` TREE_GENERATION_PROMPT
**Runs once per domain (trunk)**

### Prompt Caching (Cost Optimization)
The system prompt is sent as a structured content block with `cache_control: {"type": "ephemeral"}` via `_build_cached_system()`:
- **First domain call**: cache write at 1.25× base input token price
- **Subsequent domain calls**: cache read at 0.1× base input token price (90% discount)
- Cache TTL: 5 minutes
- Cache metrics logged per call via `_log_cache_metrics()`

### What the LLM Generates Per Concept

Every concept includes these fields (see [Desirable Results](./DESIRABLE_RESULTS.md) for quality examples):

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Human-readable, learnable in 5-10 min |
| `treeLevel` | trunk/branch/leaf | Declares tier |
| `parentName` | string | Direct parent concept name |
| `trunkDomain` | string | Top-level domain |
| `cognitiveLevel` | Bloom's level | Leaf: prefer apply/analyze/evaluate/create |
| `order` | number | Sequence within domain |
| `commonPitfalls` | string[] | Critical misconceptions — rendered in UI |
| `phase1` | object | hookSentence, microMetaphor, prerequisite, selection[], execution |
| `phase2` | string[] | **Plain strings** — NOT `{title, content}` objects |
| `phase3` | object | tool, metrics[], thresholds |
| `mnemonic` | object | anchor (concrete object), story |
| `keyPoints` | string[] | Summary bullets |
| `whyYouNeed` | string | Motivation for learning |
| `technicalDetails` | string | Deep technical explanation |
| `workedExample` | object | problem, solution, steps[] |
| `shape` | object | simpleCore, highStakesExample, analogicalModel, patternRecognition, eliminationLogic |
| `perspectives` | array | Creator's Blueprint — 2-4 items, each with label/blueprint/steps |
| `connections` | array | target + type (requires/enables/is-part-of/is-type-of/causes/constrains) |
| `scoring` | object | keywords[], aliases[] — backend use only, not rendered in UI |

**REMOVED fields** (deleted — do NOT re-add to prompt or parser):
- `criticalDistinctions` — was never parsed or rendered
- `designBoundaries` — was never parsed or rendered

### Quality Gate: Concept Validation (`_validate_concept`)
Concepts are **rejected and discarded** if they fail any check:
- Missing `name`, `simpleCore`, `cognitiveLevel`, or `connections`
- Mnemonic anchor is just the concept name, or story is template/short (<50 chars)
- `hookSentence`, `microMetaphor`, `whyYouNeed`, `simpleCore` match any of 32+ template regex patterns (e.g. "Without proper X...", "Think of X as...", "X is crucial/critical/essential...")
- `whyYouNeed` < 60 chars
- `patternRecognition` has empty question or answer, or either < 30 chars
- `workedExample.problem` or `.solution` < 20 chars (branch/leaf only)

### JSON Repair Pipeline
LLM responses go through a 7-stage repair pipeline before parsing:
1. BOM removal
2. Markdown code fence stripping
3. Control character removal
4. Trailing comma fixes
5. Missing comma insertion between objects
6. Unclosed bracket/brace closure
7. Truncation recovery

Parsing then attempts 4 stages: regex array extraction → direct parse → wrapper object unwrap → incremental object-by-object recovery.

---

## Phase 2.5: Scope-Creep Detection + Gap-Fill

**Backend:** `bedrock_service.py` → `system_prompt.py` GAP_FILL_PROMPT
**Runs automatically after Phase 2 when domains have structured objectives**

### Double-Post Pipeline
1. **Scope-creep check (pass 1):** `_detect_scope_creep()` — concepts with <40% keyword match to their best-matching objective are removed. Trunks exempt.
2. **Coverage analysis:** `_analyze_coverage_gaps()` — checks if ≥60% of objective keywords appear in any individual concept's content.
3. **Gap-fill generation:** `_generate_gap_fill()` — parallel Bedrock calls per domain with gaps.
4. New concepts validated, deduped by name, merged.
5. **Scope-creep check (pass 2):** Runs again on combined set.
6. Full post-processing runs on final set.

### When It Activates
- Only when domains have `subtopics` (structured objectives from exam catalogs or context enrichment)
- Skipped when total uncovered objectives ≤2 (saves 1-3 Bedrock calls on clean generations)

---

## Frontend Parsing

### Parser Chain
```
Raw JSON → json-parser.ts (field extraction) → transformer.ts (normalization) → LearningConcept[]
```

**Files:**
- `src/features/content-generation/parsers/json-parser.ts` — Extracts all fields from raw LLM JSON into `ParsedConcept`
- `src/features/content-generation/parsers/transformer.ts` — Normalizes `ParsedConcept` into `LearningConcept`
- `src/features/content-generation/parsers/types.ts` — `ParsedConcept`, `ParsedGeneratedContent` interfaces

### Key Parser Behaviors

**`phase2` parsing:** The LLM now generates `phase2` as plain strings. The parser handles both plain strings and legacy `{title, content}` objects (extracts `.content` from the latter). Result is always `string[]`.

**`perspectives` parsing:** Extracted from `c.perspectives` array. Each item validated for `label` (string) and `steps` (array). Empty/invalid items filtered out. Passed through as `ParsedConcept.perspectives`.

**`technicalDetails`:** Read directly from `parsedConcept.technicalDetails`. No longer synthesized from `criticalDistinctions`/`designBoundaries` (those fields are deleted).

### Transformer Responsibilities
1. Assign `tier` from `treeLevel` field
2. Copy `parentName`, `trunkDomain` from raw data
3. Calculate `outdegree` from dependency graph
4. Build `connections[]` from explicit `strictConnections` and `mnemonic.dependsOn` only
5. Map `cognitiveLevel` to Bloom's taxonomy
6. Structure `lifecycle` into `phase1/phase2/phase3` — uses only AI-generated steps, empty arrays when absent
7. Build `shape` content (simpleCore, highStakesExample, patternRecognition, etc.)
8. Pass `perspectives` directly from `parsedConcept.perspectives`
9. Generate `dependencies[]` ID array from relationship data
10. Set `lifecyclePhase` (PREPARE/MODEL/DELIVER) from stage mapping

### Strict No-Fallback Policy
- No skeleton concept injection — only explicitly generated concepts are used
- No synthetic lifecycle steps — empty arrays when AI data is absent
- No prerequisite-text inference for connections — only `strictConnections` and `mnemonic.dependsOn`
- No synthetic concept names — empty string returned for unnamed concepts (filtered by dedup)

---

## Creator's Blueprint Data Flow

```
LLM generates perspectives[] per concept
  ↓
json-parser.ts: extracts label/blueprint/steps from c.perspectives
  ↓
ParsedConcept.perspectives: Array<{label, blueprint, steps}>
  ↓
transformer.ts: passes perspectives: parsedConcept.perspectives
  ↓
LearningConcept.perspectives: CreatorPerspective[]
  ↓
buildMatrixPayload.ts buildPerspectives():
  - Returns concept.perspectives directly if present
  - Falls back to synthesizing from lifecycle.phase1/2/3.steps
  ↓
DrillDownAction.perspectives: CreatorPerspective[]
  ↓
CognitiveMatrixGridParts.tsx: pill switcher + steps display
```

---

## Storage Flow

### Save
```
LearningConcept[] → content-storage feature → DynamoDB (via API Gateway + Lambda)
                   → Also saved to localStorage as backup
```

### Load
```
DynamoDB → API → ParsedGeneratedContent → transformer.ts → LearningConcept[] → Zustand stores
```

---

## Data Flow: Generation → Study

```
1. Home.tsx: User enters subject + context + optional trunks
2. Generate.tsx: Orchestrates generation via useGenerationEngine
3. useGenerationEngine.ts: Calls backend, receives raw data
4. backend-client.ts: Transforms Pass 1 + Pass 2 results
5. transformer.ts: Normalizes into LearningConcept[]
6. generation-store.ts: Stores concepts + metadata
7. content-storage: Persists to DynamoDB + localStorage
8. ContentLaunchpad.tsx: Loads saved results, runs audit
9. VelocityLearning.tsx: Orchestrates the 5-step session
10. MicroLearningLoopController.tsx: Runs 3-phase micro-loop per concept
11. concept-selection.ts / interleaving.ts: Select next concept using connections, tier, outdegree
```

---

## Key Stores

| Store | File | Purpose |
|-------|------|---------|
| `generation-store` | `src/store/generation-store.ts` | Generation progress, subjectType, macroWorkflow |
| `learning-store` | `src/store/learning-store.ts` | User progress, completed concepts, scores |
| `personalization-store` | `src/store/personalization-store.ts` | Persona, mood, practice mode |
| `theme-store` | `src/store/theme-store.ts` | Visual theme (playful/scholarly), dark mode |

---

## Post-Processing Pipeline (`_post_process_concepts`)

Runs in this exact order after all concepts are collected:
1. **ID Assignment** — `generate_id()` for any concept missing an `id`
2. **Stage Default** — `stageId` defaults to `PREPARE`
3. **Mnemonic Default** — Empty `{}` if missing
4. **Scoring Validation** — Auto-generates keywords from concept name if `scoring.keywords` missing
5. **Tree Structure Validation** — `_validate_tree_structure()`: normalizes `treeLevel`, validates parent references, logs distribution
6. **Bloom's Distribution** — `_enforce_blooms_distribution()`: ensures ≥30% higher-order levels, upgrades candidates using 50+ keyword heuristics
7. **TRACES Connection Diversity + Graph Topology** — `_enforce_connection_diversity()`: canonicalizes targets, drops invalid links, enforces trunk=0/branch≤2/leaf≤3 topology, removes cross-branch leaf connections, fixes backward `requires`, caps `enables` at 20%
8. **Content Uniqueness** — `_enforce_unique_content()`: deduplicates mnemonic anchors, flags duplicate `highStakesExample` company references

---

## Content Audit

**File:** `src/features/content-audit/audit-engine.ts`
**Used by:** ContentLaunchpad, Home.tsx

- **Objective alignment:** How well concepts cover stated objectives
- **Content health:** Checks for placeholder/filler content
- **Tier distribution:** Validates trunk/branch/leaf ratios
- **Bloom's distribution:** Checks cognitive level spread
- **Per-concept verdict:** `objective-aligned`, `supplementary`, `not-in-objectives`, `unverified`

---

## Backend Architecture

### Express Server (`backend/src/`)
```
backend/src/
├── core/server.ts              # Express app, middleware, route mounting
├── features/
│   ├── auth/routes/            # /api/v1/auth — Cognito token exchange
│   ├── concepts/routes/        # /api/v1/concepts — Proxy to Lambda
│   ├── content/routes/         # /api/v1/content — Content CRUD
│   └── proxy/routes/           # /api/v1/proxy — Public resource proxy
├── shared/
│   ├── middleware/             # auth.ts (JWT verify), error-handler.ts, rate-limit.ts
│   └── types/                 # macro-workflow.ts, grounding.ts
```

### Async Self-Invocation Pattern

API Gateway has a 30-second timeout. Generation takes 2-5 minutes. The handler solves this with async self-invocation:

```
API Gateway → Lambda (sync)
  1. Create job record in DynamoDB (status: in_progress)
  2. Self-invoke same Lambda with InvocationType="Event" (async)
  3. Return immediately with { jobId, status: "in_progress" }

Lambda (async, self-invoked)
  1. Skip job creation (_skip_job_creation=true)
  2. Run full generation pipeline
  3. Store concepts in DynamoDB
  4. Mark job completed/failed
```

The frontend polls via `_pollUntilComplete()` in `backend-client.ts` until status is `completed` or `failed`.

### Frontend Progress Mapping (Construct Integrity Bar)

Progress is driven by elapsed time mapped to known Lambda pipeline stages, with real concept data from `getJobProgress` overlaid when available:

| Elapsed (s) | Progress % | Stage Label |
|-------------|-----------|-------------|
| 0–3         | 3–12%     | Dispatching / establishing channel (pre-poll) |
| 0–20        | 22%       | Classifying subject domain |
| 20–40       | 28%       | Extracting exam structure |
| 40–70       | 34%       | Generating trunk domains in parallel |
| 70–110      | 40%       | Synthesising branch concepts |
| 110–160     | 46%       | Building leaf-level knowledge |
| 160–200     | 50%       | Running gap-fill analysis |
| 200–240     | 53%       | Enforcing TRACES connection rules |
| 240–280     | 56%       | Applying Bloom's distribution |
| 280–320     | 58%       | Deduplicating content |
| 320+        | 59%       | Persisting concept graph |
| complete    | 60%       | AI generation complete |
| fetch       | 62–89%    | Loading trunk/branch/leaf from DynamoDB |
| build       | 90–100%   | Assembling final document |

When `getJobProgress` returns `conceptCount > 0`, the message switches to show the actual concept name being generated (e.g. `Generating: NSG Rule Evaluation`), giving real-time feedback from the Lambda pipeline.

### Lambda Actions

| Action | Handler | Description |
|--------|---------|-------------|
| `generate` (default) | `_handle_generate_async()` → `_handle_generate()` | Full concept generation pipeline |
| `suggest_structure` | `_handle_suggest_structure()` | Classifies subject, returns suggested domains |
| `repair` | `_handle_repair()` | Surgically fixes a single concept |
| `_async_generate` | `_handle_generate()` | Internal — self-invoked async generation |

### Lambda Functions (`backend/lambda/`)
```
backend/lambda/
├── generate_concepts/
│   ├── handler.py              # Entry point: routes generate/repair/suggest actions
│   └── services/
│       ├── bedrock_service.py  # classify_subject() + parallel generate + gap-fill + repair
│       └── dynamo_service.py   # Job tracking, concept storage, batch writes
├── query_concepts/
│   └── handler.py              # Paginated queries, subject management, job polling
├── gym_ai/
│   └── handler.py              # Gym activity AI (Haiku)
├── shared/
│   ├── system_prompt.py        # TREE_GENERATION_PROMPT + GAP_FILL_PROMPT + SURGICAL_FIX_PROMPT + classification prompt
│   └── utils.py                # CORS, API response helpers, DynamoDB key builders, generator allowlist
└── requirements.txt
```

### DynamoDB Schema

**Concepts Table** (`sensapbl-concepts-dev` / `sensapbl-concepts-prod`)
- **PK:** `USER#{userId}#SESSION#{sessionId}`
- **SK:** `TIER#{tier}#CONCEPT#{conceptId}` or `SUBJECT#{sessionId}`
- **TTL:** 168 hours (7 days)

**Jobs Table** (`sensapbl-jobs-dev` / `sensapbl-jobs-prod`)
- Tracks generation job status, progress, classification data
- TTL: 24 hours

---

## Deployment

### Lambda Deployment
```powershell
powershell -ExecutionPolicy Bypass -File "infra\scripts\package_lambda.ps1"
```
Then deploy via Terraform.

### Infrastructure Changes (Terraform)
```powershell
cd infra/terraform/environments/dev   # or prod
terraform init
terraform plan -out=tfplan
terraform apply "tfplan"
```

### Frontend Deployment
Auto-deploys via AWS Amplify on push to `main` branch.
- **Build command:** `npm ci && npm run build` (runs `tsc -b && vite build`)
- **Build artifacts:** `dist/`

`tsc -b` runs in strict mode during Amplify builds — all TypeScript errors must be resolved before pushing.

---

## Forbidden Patterns

```typescript
// NEVER skip the parser — always go through transformer.ts
const concepts = rawData.concepts; // WRONG — raw data isn't normalized

// NEVER hardcode content the AI generates
const title = "The Architecture"; // WRONG if lifecycle.phase1.title is available

// NEVER compute tiers from graph — tiers are LLM-declared
const tier = computeTierFromDependencies(concept); // FORBIDDEN

// NEVER use 'root' as a tier
if (concept.tier === 'root') // FORBIDDEN — tier is trunk/branch/leaf only

// NEVER generate phase2 as {title, content} objects in the prompt
// phase2 must be plain strings: ["Step 1 content", "Step 2 content"]
```
