# Generation Pipeline

**Last Updated:** February 14, 2026
**Status:** MANDATORY — Understand this before modifying generation or parsing code.

---

## Overview

Content generation is a multi-phase backend process that produces hierarchical learning concepts from any subject. The frontend orchestrates the flow, displays progress, and transforms raw output into the `LearningConcept` type.

```
User Input → Backend Lambda → Phase 1 (Domain Analysis) → Phase 2 (Tree Generation per domain) → Phase 2.5 (Scope-Creep Check → Gap-Fill → Scope-Creep Check) → Frontend Parser → Zustand Store → UI
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
1. If `trunks` provided (≥2): Use them as domain names. If `context` is also provided, `_enrich_domains_from_context()` parses `[Domain Name - Weight%] Task` lines to populate subtopics and real weights per domain. Classification still runs in parallel for metadata.
2. If no trunks: Classify the subject into one of 4 types (procedural/conceptual/cyclic/perceptual), then extract domains from classification.

### Output
```typescript
{
  subjectType: SubjectType;           // 'procedural' | 'conceptual' | 'cyclic' | 'perceptual'
  classification: object;             // Full classification metadata
  macroStructure: MacroStructure;     // Domain weights and ordering
  connectiveTissue: object;           // Cross-domain relationships
  domains: Array<{ name, weight }>;   // The trunk domains to generate
}
```

---

## Phase 2: Tree Generation (Per Domain)

**Backend:** `bedrock_service.py` → `system_prompt.py` TREE_GENERATION_PROMPT
**Runs once per domain (trunk)**

### Process
For each domain, the LLM generates a tree of concepts:
- 1 trunk concept (the domain itself)
- Multiple branch concepts (sub-topics)
- Multiple leaf concepts (granular testable items)

Each concept includes: `treeLevel`, `parentName`, `cognitiveLevel`, `connections[]`, `phase1`, `phase2`, `phase3`, `shape`, `workedExample`, `commonPitfalls`, `mnemonic`, `keyPoints`, `scoring`, `criticalDistinctions`, `designBoundaries`, etc.

### Output
Raw JSON array of concepts per domain, merged into a single flat array.

### Quality Gate: Concept Validation (`_validate_concept`)
Every concept is validated before inclusion. Concepts are **rejected and discarded** (not flagged) if they fail any check:
- Missing `name`, `simpleCore`, `cognitiveLevel`, or `connections`
- Mnemonic anchor is just the concept name, or story is template/short (<50 chars)
- `hookSentence`, `microMetaphor`, `whyYouNeed`, `simpleCore` match any of 32+ template regex patterns (e.g. "Without proper X...", "Think of X as...", "X is crucial/critical/essential...")
- `whyYouNeed` < 60 chars
- `patternRecognition` has empty question or answer, or either < 30 chars
- `workedExample.problem` or `.solution` < 20 chars (branch/leaf only)
- Template content detected in `phase1.execution`, `phase1.selection`, `phase2` items, `phase3.tool`, `phase3.metrics`, `criticalDistinctions`, or `designBoundaries`

### Prompt Quality Enforcement (`_split_prompt`)
Every generation prompt has automatic rejection patterns appended:
- hookSentence: Never "Without proper X...", "Improperly configured X..."
- microMetaphor: Never "Think of X as..."
- whyYouNeed: Never "X is crucial/critical/essential..."

### JSON Repair Pipeline (`_repair_json` + `_parse_concepts_from_response`)
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
After the initial per-domain generation and deduplication:
1. **Scope-creep check (pass 1):** `_detect_scope_creep()` tests each branch/leaf concept against ALL objectives. Concepts with <40% keyword match to their best-matching objective are removed. Trunks are exempt.
2. **Coverage analysis:** `_analyze_coverage_gaps()` extracts keywords from each objective and checks if ≥60% of keywords appear in any **individual** concept's content (per-concept matching, not bag-of-words across all concepts).
3. **Gap-fill generation:** `_generate_gap_fill()` makes parallel Bedrock calls per domain with gaps, using `GAP_FILL_PROMPT` with existing concept/branch names to avoid duplication.
4. New concepts are validated, deduped by name against existing concepts, then merged.
5. **Scope-creep check (pass 2):** `_detect_scope_creep()` runs again on the combined set to catch any gap-fill concepts that drifted out of scope.
6. Full post-processing (`_post_process_concepts`) runs on the final set.

### When It Activates
- Only when domains have `subtopics` (structured objectives from exam catalogs or context enrichment)
- Only when the initial generation produced at least 1 concept
- Skipped for free-form subjects with no structured objectives

### Output
Merged flat array of original + gap-fill concepts, scope-checked and fully post-processed.

---

## Frontend Parsing

### Parser Chain
```
Raw JSON → concept-schema.ts (Zod validation) → transformer.ts (normalization) → LearningConcept[]
```

**Files:**
- **Schema:** `src/shared/types/concept-schema.ts` — Zod schema with `trunk/branch/leaf` validation
- **Transformer:** `src/features/content-generation/parsers/transformer.ts` — Normalizes raw data into `LearningConcept` interface
- **Types:** `src/features/content-generation/parsers/types.ts` — `ParsedConcept`, `ParsedGeneratedContent`

### Transformer Responsibilities
1. Assign `tier` from `treeLevel` field
2. Copy `parentName`, `trunkDomain` from raw data
3. Calculate `outdegree` from dependency graph
4. Build `connections[]` from explicit `strictConnections` and `mnemonic.dependsOn` only
5. Map `cognitiveLevel` to Bloom's taxonomy
6. Structure `lifecycle` into `phase1/phase2/phase3` — uses only AI-generated steps, empty arrays when absent
7. Build `shape` content (simpleCore, highStakesExample, patternRecognition, etc.)
8. Generate `dependencies[]` ID array from relationship data
9. Set `lifecyclePhase` (PREPARE/MODEL/DELIVER) from stage mapping

### Strict No-Fallback Policy (Transformer)
- No skeleton concept injection — only explicitly generated concepts are used
- No synthetic lifecycle steps — empty arrays when AI data is absent
- No prerequisite-text inference for connections — only `strictConnections` and `mnemonic.dependsOn`
- No synthetic concept names — empty string returned for unnamed concepts (filtered by dedup)
- No `fallbackConcepts` parameter — removed from all transformer functions

### Validation
**File:** `src/features/content-generation/validators/`
- `content-quality.ts` — `isRealContent()` checks for placeholder/filler content
- `tier-progression.ts` — Validates tier distribution and dependency integrity

### Dependency Graph Strict Mode
**File:** `src/features/content-generation/generators/dependency-parser.ts`
- Dependency edges are now built from explicit relationship data only (`strictConnections`, `mnemonic.dependsOn`, `parentName`, `parentId`)
- No inferred prerequisite-text edges are synthesized
- No sequential chain fallback edges are auto-generated

---

## Storage Flow

### Save
```
LearningConcept[] → content-storage feature → DynamoDB (via API Gateway + Lambda)
                   → Also saved to localStorage as backup
```

**Files:**
- `src/features/content-storage/` — Save/load/delete operations
- `src/shared/api/concepts.ts` — API endpoint definitions

### Load
```
DynamoDB → API → ParsedGeneratedContent → transformer.ts → LearningConcept[] → Zustand stores
```

Stored as `SavedResult` which includes:
- Raw generated content
- Parsed concepts
- Subject metadata
- Generation timestamp
- User objectives (if provided)

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
| `personalization-store` | `src/store/personalization-store.ts` | Persona, mood, metaphor toggle, practice mode |
| `theme-store` | `src/store/theme-store.ts` | Visual theme (playful/scholarly), dark mode |

---

## Post-Processing Pipeline (`_post_process_concepts`)

After all concepts are collected (including gap-fill and scope-creep filtering), the pipeline runs in this exact order:
1. **ID Assignment** — `generate_id()` for any concept missing an `id`
2. **Stage Default** — `stageId` defaults to `PREPARE`
3. **Mnemonic Default** — Empty `{}` if missing
4. **Scoring Validation** — If `scoring.keywords` is missing/invalid, auto-generates from concept name words
5. **Tree Structure Validation** — `_validate_tree_structure()`: normalizes `treeLevel`, validates parent references, sets `tier = treeLevel`, logs distribution
6. **Bloom's Distribution** — `_enforce_blooms_distribution()`: ensures ≥30% higher-order levels (apply/analyze/evaluate/create), upgrades candidates using 50+ keyword heuristics
7. **TRACES Connection Diversity** — `_enforce_connection_diversity()`: canonicalizes connection targets to real concept names, drops invalid/self/non-resolvable links, forces structural semantics (`child -> parent` as `is-part-of`), normalizes legacy/invalid types, ensures minimum connection coverage for leaves, and then caps `enables` at 30% using keyword-based upgrades
8. **Content Uniqueness** — `_enforce_unique_content()`: deduplicates mnemonic anchors (renames duplicates), flags duplicate `highStakesExample` company references

---

## Content Audit

**File:** `src/features/content-audit/audit-engine.ts`
**Used by:** ContentLaunchpad, Home.tsx

Audits generated content against user-provided objectives:
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

The frontend polls `conceptsApi.getJobStatus(jobId)` until status is `completed` or `failed`.

### Lambda Actions

The `handler.py` routes on the `action` field:

| Action | Handler | Description |
|--------|---------|-------------|
| `generate` (default) | `_handle_generate_async()` → `_handle_generate()` | Full concept generation pipeline |
| `suggest_structure` | `_handle_suggest_structure()` | Classifies subject, returns suggested domains with weights and tasks |
| `repair` | `_handle_repair()` | Surgically fixes a single concept using `SURGICAL_FIX_PROMPT` |
| `_async_generate` | `_handle_generate()` | Internal — self-invoked async generation (not callable externally) |

### Access Control

Generation is restricted to an allowlist of approved email addresses:
- **Backend:** `shared/utils.py` → `ALLOWED_GENERATOR_EMAILS` set, `is_generation_allowed(event)` extracts email from Cognito claims (`email` with `username`/`cognito:username` fallback for access tokens)
- **Frontend:** `src/shared/constants/generator-allowlist.ts` → `isGenerationAllowed()` checks `useAuthStore` email
- Non-allowlisted users receive 403 on generate attempts
- Repair and suggest_structure actions are NOT gated by the allowlist

When a request is blocked with 403, diagnostics are emitted at both layers:
- **Frontend console:** `useGenerationEngine.ts` logs API target host, auth/token claim presence, and request metadata as `[Generation] Failure diagnostics`
- **Lambda logs:** `generate_concepts/handler.py` logs `[Handler] ACCESS_DIAGNOSTICS` with host/origin, claim keys, masked email source, and allowlist verdict

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

**Concepts Table** (`sensaai-concepts-dev` / `sensaai-concepts-prod`)
- **PK:** `USER#{userId}#SESSION#{sessionId}`
- **SK:** `TIER#{tier}#CONCEPT#{conceptId}` or `SUBJECT#{sessionId}`
- **GSI1:** For tier-based queries
- **TTL:** 168 hours (7 days)

**Jobs Table** (`sensaai-jobs-dev` / `sensaai-jobs-prod`)
- Tracks generation job status, progress, classification data
- TTL: 24 hours

### Local Storage

| Store | Purpose | TTL |
|-------|---------|-----|
| IndexedDB | Full generated documents (offline access) | None |
| localStorage | Session progress recovery | 24 hours |
| Zustand (memory) | Active session state | Page lifetime |

---

## Deployment

### Lambda Deployment
```powershell
powershell -ExecutionPolicy Bypass -File "infra\scripts\package_lambda.ps1"
```
Then deploy via Terraform (packages layer.zip and lambda_code.zip automatically).

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
- **Environment variables:** Set in Amplify console (`VITE_API_URL`, `VITE_COGNITO_*`, `VITE_AWS_*`)

`tsc -b` runs in strict mode during Amplify builds — all TypeScript errors must be resolved before pushing.

### Error Resilience
- 3-retry exponential backoff at both Lambda (Bedrock calls) and frontend (API calls via `resilience.ts`)
- Offline queue re-sends failed requests on reconnect
- Study page hydration retries 3× with backoff
- `LearningErrorBoundary` catches render crashes with recover/abandon paths

---

## Forbidden Patterns

```typescript
// NEVER skip the parser — always go through transformer.ts
const concepts = rawData.concepts; // WRONG — raw data isn't normalized

// NEVER hardcode content the AI generates
const title = "The Architecture"; // WRONG if lifecycle.phase1.title is available

// NEVER compute tiers from graph — tiers are LLM-declared
const tier = computeTierFromDependencies(concept); // FORBIDDEN
// Correct: concept.tier (already set by LLM via treeLevel)

// NEVER use 'root' as a tier
if (concept.tier === 'root') // FORBIDDEN — tier is trunk/branch/leaf only
```
